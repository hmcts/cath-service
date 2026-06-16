/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initTableSearch } from "./table-search.js";

describe("table-search", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("initTableSearch", () => {
    it("should return early if search input is not found", () => {
      document.body.innerHTML = `
        <table id="hearings-table">
          <tbody>
            <tr><td>Case 123</td></tr>
          </tbody>
        </table>
      `;

      expect(() => initTableSearch()).not.toThrow();
    });

    it("should return early if no table rows and no containers exist", () => {
      document.body.innerHTML = `
        <input id="case-search-input" type="text" />
      `;

      expect(() => initTableSearch()).not.toThrow();
    });

    it("should filter table rows by ID-based table selector", () => {
      document.body.innerHTML = `
        <input id="case-search-input" type="text" />
        <div id="hearings-table-container">
          <table id="hearings-table">
            <tbody>
              <tr><td>Case 123</td></tr>
              <tr><td>Case 456</td></tr>
              <tr><td>Other matter</td></tr>
            </tbody>
          </table>
        </div>
      `;

      initTableSearch();

      const searchInput = document.getElementById("case-search-input") as HTMLInputElement;
      searchInput.value = "Case";
      searchInput.dispatchEvent(new Event("input"));

      const rows = document.querySelectorAll("#hearings-table tbody tr") as NodeListOf<HTMLElement>;
      expect(rows[0].style.display).toBe("");
      expect(rows[1].style.display).toBe("");
      expect(rows[2].style.display).toBe("none");
    });

    it("should filter table rows by class-based table selector", () => {
      document.body.innerHTML = `
        <input id="case-search-input" type="text" />
        <table class="hearings-table">
          <tbody>
            <tr><td>Case 123</td></tr>
            <tr><td>Case 456</td></tr>
            <tr><td>Other matter</td></tr>
          </tbody>
        </table>
      `;

      initTableSearch();

      const searchInput = document.getElementById("case-search-input") as HTMLInputElement;
      searchInput.value = "123";
      searchInput.dispatchEvent(new Event("input"));

      const rows = document.querySelectorAll(".hearings-table tbody tr") as NodeListOf<HTMLElement>;
      expect(rows[0].style.display).toBe("");
      expect(rows[1].style.display).toBe("none");
      expect(rows[2].style.display).toBe("none");
    });

    it("should show all rows when search query is empty", () => {
      document.body.innerHTML = `
        <input id="case-search-input" type="text" />
        <div id="hearings-table-container">
          <table id="hearings-table">
            <tbody>
              <tr><td>Case 123</td></tr>
              <tr><td>Case 456</td></tr>
            </tbody>
          </table>
        </div>
      `;

      initTableSearch();

      const searchInput = document.getElementById("case-search-input") as HTMLInputElement;

      searchInput.value = "123";
      searchInput.dispatchEvent(new Event("input"));

      searchInput.value = "";
      searchInput.dispatchEvent(new Event("input"));

      const rows = document.querySelectorAll("#hearings-table tbody tr") as NodeListOf<HTMLElement>;
      expect(rows[0].style.display).toBe("");
      expect(rows[1].style.display).toBe("");
    });

    it("should perform case-insensitive search", () => {
      document.body.innerHTML = `
        <input id="case-search-input" type="text" />
        <div id="hearings-table-container">
          <table id="hearings-table">
            <tbody>
              <tr><td>CASE 123</td></tr>
              <tr><td>case 456</td></tr>
              <tr><td>Case 789</td></tr>
            </tbody>
          </table>
        </div>
      `;

      initTableSearch();

      const searchInput = document.getElementById("case-search-input") as HTMLInputElement;
      searchInput.value = "cAsE";
      searchInput.dispatchEvent(new Event("input"));

      const rows = document.querySelectorAll("#hearings-table tbody tr") as NodeListOf<HTMLElement>;
      expect(rows[0].style.display).toBe("");
      expect(rows[1].style.display).toBe("");
      expect(rows[2].style.display).toBe("");
    });

    it("should trim whitespace from search query", () => {
      document.body.innerHTML = `
        <input id="case-search-input" type="text" />
        <div id="hearings-table-container">
          <table id="hearings-table">
            <tbody>
              <tr><td>Case 123</td></tr>
              <tr><td>Other</td></tr>
            </tbody>
          </table>
        </div>
      `;

      initTableSearch();

      const searchInput = document.getElementById("case-search-input") as HTMLInputElement;
      searchInput.value = "  Case  ";
      searchInput.dispatchEvent(new Event("input"));

      const rows = document.querySelectorAll("#hearings-table tbody tr") as NodeListOf<HTMLElement>;
      expect(rows[0].style.display).toBe("");
      expect(rows[1].style.display).toBe("none");
    });

    it("should highlight matching text in containers", () => {
      document.body.innerHTML = `
        <input id="case-search-input" type="text" />
        <div id="hearings-table-container">
          <table id="hearings-table">
            <tbody>
              <tr><td>Case 123</td></tr>
            </tbody>
          </table>
        </div>
      `;

      initTableSearch();

      const searchInput = document.getElementById("case-search-input") as HTMLInputElement;
      searchInput.value = "Case";
      searchInput.dispatchEvent(new Event("input"));

      const highlights = document.querySelectorAll("mark.search-highlight");
      expect(highlights.length).toBe(1);
      expect(highlights[0].textContent).toBe("Case");
    });

    it("should highlight multiple occurrences of search term", () => {
      document.body.innerHTML = `
        <input id="case-search-input" type="text" />
        <div id="hearings-table-container">
          <table id="hearings-table">
            <tbody>
              <tr><td>Case 123 - Case review</td></tr>
            </tbody>
          </table>
        </div>
      `;

      initTableSearch();

      const searchInput = document.getElementById("case-search-input") as HTMLInputElement;
      searchInput.value = "Case";
      searchInput.dispatchEvent(new Event("input"));

      const highlights = document.querySelectorAll("mark.search-highlight");
      expect(highlights.length).toBe(2);
    });

    it("should remove highlights when search query is cleared", () => {
      document.body.innerHTML = `
        <input id="case-search-input" type="text" />
        <div id="hearings-table-container">
          <table id="hearings-table">
            <tbody>
              <tr><td>Case 123</td></tr>
            </tbody>
          </table>
        </div>
      `;

      initTableSearch();

      const searchInput = document.getElementById("case-search-input") as HTMLInputElement;
      searchInput.value = "Case";
      searchInput.dispatchEvent(new Event("input"));

      expect(document.querySelectorAll("mark.search-highlight").length).toBe(1);

      searchInput.value = "";
      searchInput.dispatchEvent(new Event("input"));

      expect(document.querySelectorAll("mark.search-highlight").length).toBe(0);
    });

    it("should escape regex special characters in search term", () => {
      document.body.innerHTML = `
        <input id="case-search-input" type="text" />
        <div id="hearings-table-container">
          <table id="hearings-table">
            <tbody>
              <tr><td>Case (123)</td></tr>
              <tr><td>Case 456</td></tr>
            </tbody>
          </table>
        </div>
      `;

      initTableSearch();

      const searchInput = document.getElementById("case-search-input") as HTMLInputElement;
      searchInput.value = "(123)";
      searchInput.dispatchEvent(new Event("input"));

      const rows = document.querySelectorAll("#hearings-table tbody tr") as NodeListOf<HTMLElement>;
      expect(rows[0].style.display).toBe("");
      expect(rows[1].style.display).toBe("none");
    });

    it("should use class-based containers when ID-based containers are not found", () => {
      document.body.innerHTML = `
        <input id="case-search-input" type="text" />
        <table class="hearings-table">
          <tbody>
            <tr><td>Case 123</td></tr>
          </tbody>
        </table>
      `;

      initTableSearch();

      const searchInput = document.getElementById("case-search-input") as HTMLInputElement;
      searchInput.value = "Case";
      searchInput.dispatchEvent(new Event("input"));

      const highlights = document.querySelectorAll("mark.search-highlight");
      expect(highlights.length).toBe(1);
    });

    it("should use court-lists-container as fallback container", () => {
      document.body.innerHTML = `
        <input id="case-search-input" type="text" />
        <div id="court-lists-container">
          <table id="hearings-table">
            <tbody>
              <tr><td>Case 123</td></tr>
            </tbody>
          </table>
        </div>
      `;

      initTableSearch();

      const searchInput = document.getElementById("case-search-input") as HTMLInputElement;
      searchInput.value = "Case";
      searchInput.dispatchEvent(new Event("input"));

      const highlights = document.querySelectorAll("mark.search-highlight");
      expect(highlights.length).toBe(1);
    });

    it("should not highlight text inside script tags", () => {
      document.body.innerHTML = `
        <input id="case-search-input" type="text" />
        <div id="hearings-table-container">
          <script>const case123 = "test";</script>
          <table id="hearings-table">
            <tbody>
              <tr><td>Case 123</td></tr>
            </tbody>
          </table>
        </div>
      `;

      initTableSearch();

      const searchInput = document.getElementById("case-search-input") as HTMLInputElement;
      searchInput.value = "case123";
      searchInput.dispatchEvent(new Event("input"));

      const highlights = document.querySelectorAll("mark.search-highlight");
      expect(highlights.length).toBe(0);
    });

    it("should not highlight text inside style tags", () => {
      document.body.innerHTML = `
        <input id="case-search-input" type="text" />
        <div id="hearings-table-container">
          <style>.case123 { color: red; }</style>
          <table id="hearings-table">
            <tbody>
              <tr><td>Case 123</td></tr>
            </tbody>
          </table>
        </div>
      `;

      initTableSearch();

      const searchInput = document.getElementById("case-search-input") as HTMLInputElement;
      searchInput.value = "case123";
      searchInput.dispatchEvent(new Event("input"));

      const highlights = document.querySelectorAll("mark.search-highlight");
      expect(highlights.length).toBe(0);
    });

    it("should replace old highlights when search term changes", () => {
      document.body.innerHTML = `
        <input id="case-search-input" type="text" />
        <div id="hearings-table-container">
          <table id="hearings-table">
            <tbody>
              <tr><td>Case 123 matter</td></tr>
            </tbody>
          </table>
        </div>
      `;

      initTableSearch();

      const searchInput = document.getElementById("case-search-input") as HTMLInputElement;

      searchInput.value = "Case";
      searchInput.dispatchEvent(new Event("input"));
      expect(document.querySelectorAll("mark.search-highlight").length).toBe(1);
      expect(document.querySelector("mark.search-highlight")?.textContent).toBe("Case");

      searchInput.value = "matter";
      searchInput.dispatchEvent(new Event("input"));
      expect(document.querySelectorAll("mark.search-highlight").length).toBe(1);
      expect(document.querySelector("mark.search-highlight")?.textContent).toBe("matter");
    });
  });
});
