/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initSortableTable } from "./sortable-table.js";

const TABLE_HTML = `
  <table class="govuk-table" data-module="moj-sortable-table">
    <thead>
      <tr>
        <th scope="col" aria-sort="none"><a href="?sort=name&order=asc">Name</a></th>
        <th scope="col" aria-sort="descending"><a href="?sort=date&order=asc">Date</a></th>
        <th scope="col" aria-sort="none">Count</th>
        <th scope="col">Select</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Bravo</td>
        <td data-sort-value="1772323200000">1 March 2026</td>
        <td>10</td>
        <td><input type="checkbox" id="row-bravo"></td>
      </tr>
      <tr>
        <td>Alpha</td>
        <td data-sort-value="1768176000000">12 January 2026</td>
        <td>9</td>
        <td><input type="checkbox" id="row-alpha"></td>
      </tr>
      <tr>
        <td>Charlie</td>
        <td data-sort-value="1770681600000">10 February 2026</td>
        <td>100</td>
        <td><input type="checkbox" id="row-charlie"></td>
      </tr>
    </tbody>
  </table>
`;

describe("sortable-table", () => {
  beforeEach(() => {
    document.body.innerHTML = TABLE_HTML;
    initSortableTable();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("initSortableTable", () => {
    it("should replace the header link with a button using the header text", () => {
      // Arrange
      const header = getHeader(0);

      // Act
      const button = header.querySelector("button");

      // Assert
      expect(header.querySelector("a")).toBeNull();
      expect(button).not.toBeNull();
      expect(button?.getAttribute("type")).toBe("button");
      expect(button?.textContent?.trim()).toBe("Name");
    });

    it("should not add a button to columns without aria-sort", () => {
      // Arrange
      const header = getHeader(3);

      // Act
      const button = header.querySelector("button");

      // Assert
      expect(button).toBeNull();
      expect(header.textContent?.trim()).toBe("Select");
    });

    it("should do nothing when there is no sortable table on the page", () => {
      // Arrange
      document.body.innerHTML = "<table><thead><tr><th aria-sort='none'>Name</th></tr></thead></table>";

      // Act
      initSortableTable();

      // Assert
      expect(document.querySelector("button")).toBeNull();
    });
  });

  describe("sorting", () => {
    it("should sort ascending and update aria-sort on the first click", () => {
      // Arrange
      const button = getButton(0);

      // Act
      button.click();

      // Assert
      expect(getHeader(0).getAttribute("aria-sort")).toBe("ascending");
      expect(getColumnText(0)).toEqual(["Alpha", "Bravo", "Charlie"]);
    });

    it("should sort descending on the second click", () => {
      // Arrange
      const button = getButton(0);
      button.click();

      // Act
      button.click();

      // Assert
      expect(getHeader(0).getAttribute("aria-sort")).toBe("descending");
      expect(getColumnText(0)).toEqual(["Charlie", "Bravo", "Alpha"]);
    });

    it("should reset aria-sort on the other sortable columns", () => {
      // Arrange
      const button = getButton(0);

      // Act
      button.click();

      // Assert
      expect(getHeader(1).getAttribute("aria-sort")).toBe("none");
      expect(getHeader(2).getAttribute("aria-sort")).toBe("none");
      expect(getHeader(3).hasAttribute("aria-sort")).toBe(false);
    });

    it("should flip an initially descending column to ascending on the first click", () => {
      // Arrange
      const button = getButton(1);

      // Act
      button.click();

      // Assert
      expect(getHeader(1).getAttribute("aria-sort")).toBe("ascending");
    });

    it("should order by data-sort-value rather than the displayed text", () => {
      // Arrange
      const button = getButton(1);

      // Act
      button.click();

      // Assert
      expect(getColumnText(1)).toEqual(["12 January 2026", "10 February 2026", "1 March 2026"]);
    });

    it("should compare numeric values as numbers", () => {
      // Arrange
      const button = getButton(2);

      // Act
      button.click();

      // Assert
      expect(getColumnText(2)).toEqual(["9", "10", "100"]);
    });

    it("should order a column mixing numbers and text consistently", () => {
      // Arrange
      const table = document.createElement("table");
      table.setAttribute("data-module", "moj-sortable-table");
      table.innerHTML = `
        <thead><tr><th aria-sort="none">Mixed</th></tr></thead>
        <tbody>
          <tr><td>Court 10</td></tr>
          <tr><td>5</td></tr>
          <tr><td>Court 2</td></tr>
          <tr><td>40</td></tr>
        </tbody>`;
      document.body.appendChild(table);
      initSortableTable();
      const button = table.querySelector<HTMLButtonElement>("th button") as HTMLButtonElement;

      // Act
      button.click();

      // Assert
      const values = Array.from(table.querySelectorAll("tbody td")).map((cell) => cell.textContent?.trim());
      expect(values).toEqual(["5", "40", "Court 2", "Court 10"]);
    });

    it("should keep focus on the sort button that was used", () => {
      // Arrange
      const button = getButton(0);
      button.focus();

      // Act
      button.click();

      // Assert
      expect(document.activeElement).toBe(button);
      expect(getHeader(0).querySelector("button")).toBe(button);
    });

    it("should keep checkbox state when rows are reordered", () => {
      // Arrange
      const checkbox = document.getElementById("row-alpha") as HTMLInputElement;
      checkbox.checked = true;

      // Act
      getButton(0).click();

      // Assert
      expect((document.getElementById("row-alpha") as HTMLInputElement).checked).toBe(true);
    });

    it("should show a single arrow icon in each sortable button after sorting", () => {
      // Arrange
      const button = getButton(0);

      // Act
      button.click();

      // Assert
      for (const index of [0, 1, 2]) {
        expect(getButton(index).querySelectorAll("svg")).toHaveLength(1);
      }
    });
  });
});

function getHeader(index: number): HTMLTableCellElement {
  return document.querySelectorAll<HTMLTableCellElement>("thead th")[index];
}

function getButton(index: number): HTMLButtonElement {
  return getHeader(index).querySelector("button") as HTMLButtonElement;
}

function getColumnText(index: number): string[] {
  return Array.from(document.querySelectorAll<HTMLTableRowElement>("tbody tr")).map((row) => row.cells[index].textContent?.trim() ?? "");
}
