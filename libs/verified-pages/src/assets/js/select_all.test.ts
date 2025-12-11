// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("select-all", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  const createTestDOM = (tableId = "test-table") => {
    document.body.innerHTML = `
      <div>
        <input type="checkbox" class="select-all-checkbox" data-table="${tableId}" />
        <table id="${tableId}">
          <tbody>
            <tr>
              <td><input type="checkbox" class="row-checkbox" /></td>
            </tr>
            <tr>
              <td><input type="checkbox" class="row-checkbox" /></td>
            </tr>
            <tr>
              <td><input type="checkbox" class="row-checkbox" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  };

  const loadSelectAllScript = async () => {
    await import("./select_all.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
  };

  describe("when select-all checkbox is clicked", () => {
    it("should check all row checkboxes when select-all is checked", async () => {
      createTestDOM();
      await loadSelectAllScript();

      const selectAllCheckbox = document.querySelector<HTMLInputElement>(".select-all-checkbox");
      const rowCheckboxes = document.querySelectorAll<HTMLInputElement>(".row-checkbox");

      selectAllCheckbox!.checked = true;
      selectAllCheckbox!.dispatchEvent(new Event("change"));

      rowCheckboxes.forEach((checkbox) => {
        expect(checkbox.checked).toBe(true);
      });
    });

    it("should uncheck all row checkboxes when select-all is unchecked", async () => {
      createTestDOM();
      await loadSelectAllScript();

      const selectAllCheckbox = document.querySelector<HTMLInputElement>(".select-all-checkbox");
      const rowCheckboxes = document.querySelectorAll<HTMLInputElement>(".row-checkbox");

      selectAllCheckbox!.checked = true;
      selectAllCheckbox!.dispatchEvent(new Event("change"));

      selectAllCheckbox!.checked = false;
      selectAllCheckbox!.dispatchEvent(new Event("change"));

      rowCheckboxes.forEach((checkbox) => {
        expect(checkbox.checked).toBe(false);
      });
    });
  });

  describe("when row checkboxes are clicked", () => {
    it("should check select-all when all row checkboxes are checked", async () => {
      createTestDOM();
      await loadSelectAllScript();

      const selectAllCheckbox = document.querySelector<HTMLInputElement>(".select-all-checkbox");
      const rowCheckboxes = document.querySelectorAll<HTMLInputElement>(".row-checkbox");

      rowCheckboxes.forEach((checkbox) => {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event("change"));
      });

      expect(selectAllCheckbox!.checked).toBe(true);
      expect(selectAllCheckbox!.indeterminate).toBe(false);
    });

    it("should uncheck select-all when all row checkboxes are unchecked", async () => {
      createTestDOM();
      await loadSelectAllScript();

      const selectAllCheckbox = document.querySelector<HTMLInputElement>(".select-all-checkbox");
      const rowCheckboxes = document.querySelectorAll<HTMLInputElement>(".row-checkbox");

      selectAllCheckbox!.checked = true;
      selectAllCheckbox!.dispatchEvent(new Event("change"));

      rowCheckboxes.forEach((checkbox) => {
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event("change"));
      });

      expect(selectAllCheckbox!.checked).toBe(false);
      expect(selectAllCheckbox!.indeterminate).toBe(false);
    });

    it("should set select-all to indeterminate when some row checkboxes are checked", async () => {
      createTestDOM();
      await loadSelectAllScript();

      const selectAllCheckbox = document.querySelector<HTMLInputElement>(".select-all-checkbox");
      const rowCheckboxes = Array.from(document.querySelectorAll<HTMLInputElement>(".row-checkbox"));

      rowCheckboxes[0].checked = true;
      rowCheckboxes[0].dispatchEvent(new Event("change"));

      expect(selectAllCheckbox!.checked).toBe(false);
      expect(selectAllCheckbox!.indeterminate).toBe(true);
    });

    it("should remove indeterminate state when all checkboxes are checked", async () => {
      createTestDOM();
      await loadSelectAllScript();

      const selectAllCheckbox = document.querySelector<HTMLInputElement>(".select-all-checkbox");
      const rowCheckboxes = Array.from(document.querySelectorAll<HTMLInputElement>(".row-checkbox"));

      rowCheckboxes[0].checked = true;
      rowCheckboxes[0].dispatchEvent(new Event("change"));
      expect(selectAllCheckbox!.indeterminate).toBe(true);

      rowCheckboxes[1].checked = true;
      rowCheckboxes[1].dispatchEvent(new Event("change"));
      expect(selectAllCheckbox!.indeterminate).toBe(true);

      rowCheckboxes[2].checked = true;
      rowCheckboxes[2].dispatchEvent(new Event("change"));

      expect(selectAllCheckbox!.checked).toBe(true);
      expect(selectAllCheckbox!.indeterminate).toBe(false);
    });
  });

  describe("multiple tables", () => {
    it("should handle multiple select-all checkboxes independently", async () => {
      document.body.innerHTML = `
        <div>
          <input type="checkbox" class="select-all-checkbox" data-table="table1" />
          <table id="table1">
            <tbody>
              <tr><td><input type="checkbox" class="row-checkbox" /></td></tr>
              <tr><td><input type="checkbox" class="row-checkbox" /></td></tr>
            </tbody>
          </table>
        </div>
        <div>
          <input type="checkbox" class="select-all-checkbox" data-table="table2" />
          <table id="table2">
            <tbody>
              <tr><td><input type="checkbox" class="row-checkbox" /></td></tr>
              <tr><td><input type="checkbox" class="row-checkbox" /></td></tr>
            </tbody>
          </table>
        </div>
      `;

      await loadSelectAllScript();

      const selectAllCheckboxes = Array.from(document.querySelectorAll<HTMLInputElement>(".select-all-checkbox"));
      const table1Checkboxes = Array.from(document.querySelectorAll<HTMLInputElement>("#table1 .row-checkbox"));
      const table2Checkboxes = Array.from(document.querySelectorAll<HTMLInputElement>("#table2 .row-checkbox"));

      selectAllCheckboxes[0].checked = true;
      selectAllCheckboxes[0].dispatchEvent(new Event("change"));

      table1Checkboxes.forEach((checkbox) => {
        expect(checkbox.checked).toBe(true);
      });

      table2Checkboxes.forEach((checkbox) => {
        expect(checkbox.checked).toBe(false);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle select-all checkbox without data-table attribute", async () => {
      document.body.innerHTML = `
        <div>
          <input type="checkbox" class="select-all-checkbox" />
        </div>
      `;

      await loadSelectAllScript();

      expect(() => {
        const selectAllCheckbox = document.querySelector<HTMLInputElement>(".select-all-checkbox");
        selectAllCheckbox!.dispatchEvent(new Event("change"));
      }).not.toThrow();
    });

    it("should handle table with no row checkboxes", async () => {
      document.body.innerHTML = `
        <div>
          <input type="checkbox" class="select-all-checkbox" data-table="empty-table" />
          <table id="empty-table">
            <tbody></tbody>
          </table>
        </div>
      `;

      await loadSelectAllScript();

      const selectAllCheckbox = document.querySelector<HTMLInputElement>(".select-all-checkbox");
      selectAllCheckbox!.checked = true;

      expect(() => {
        selectAllCheckbox!.dispatchEvent(new Event("change"));
      }).not.toThrow();
    });

    it("should handle no select-all checkboxes", async () => {
      document.body.innerHTML = `<div></div>`;

      expect(async () => {
        await loadSelectAllScript();
      }).not.toThrow();
    });
  });
});
