/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("initSearchHighlight", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="case-search-input" type="text" />
      <div id="hearings-table-container">
        <table>
          <tr><td>Case ABC123</td></tr>
          <tr><td>Case XYZ789</td></tr>
        </table>
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("should initialize search highlighting on input change", async () => {
    const { initSearchHighlight } = await import("./search-highlight.js");
    initSearchHighlight();

    const searchInput = document.getElementById("case-search-input") as HTMLInputElement;
    const container = document.getElementById("hearings-table-container");

    expect(searchInput).toBeTruthy();
    expect(container).toBeTruthy();

    searchInput.value = "ABC";
    searchInput.dispatchEvent(new Event("input"));

    const highlights = container?.querySelectorAll(".search-highlight");
    expect(highlights?.length).toBe(1);
    expect(highlights?.[0].textContent).toBe("ABC");
  });

  it("should highlight multiple matches", async () => {
    const { initSearchHighlight } = await import("./search-highlight.js");
    initSearchHighlight();

    const searchInput = document.getElementById("case-search-input") as HTMLInputElement;
    const container = document.getElementById("hearings-table-container");

    searchInput.value = "Case";
    searchInput.dispatchEvent(new Event("input"));

    const highlights = container?.querySelectorAll(".search-highlight");
    expect(highlights?.length).toBe(2);
  });

  it("should be case insensitive", async () => {
    const { initSearchHighlight } = await import("./search-highlight.js");
    initSearchHighlight();

    const searchInput = document.getElementById("case-search-input") as HTMLInputElement;
    const container = document.getElementById("hearings-table-container");

    searchInput.value = "abc";
    searchInput.dispatchEvent(new Event("input"));

    const highlights = container?.querySelectorAll(".search-highlight");
    expect(highlights?.length).toBe(1);
    expect(highlights?.[0].textContent).toBe("ABC");
  });

  it("should remove highlights when search is cleared", async () => {
    const { initSearchHighlight } = await import("./search-highlight.js");
    initSearchHighlight();

    const searchInput = document.getElementById("case-search-input") as HTMLInputElement;
    const container = document.getElementById("hearings-table-container");

    searchInput.value = "Case";
    searchInput.dispatchEvent(new Event("input"));

    let highlights = container?.querySelectorAll(".search-highlight");
    expect(highlights?.length).toBe(2);

    searchInput.value = "";
    searchInput.dispatchEvent(new Event("input"));

    highlights = container?.querySelectorAll(".search-highlight");
    expect(highlights?.length).toBe(0);
  });

  it("should handle special regex characters", async () => {
    document.body.innerHTML = `
      <input id="case-search-input" type="text" />
      <div id="hearings-table-container">
        <p>Cost: $100.50</p>
      </div>
    `;

    const { initSearchHighlight } = await import("./search-highlight.js");
    initSearchHighlight();

    const searchInput = document.getElementById("case-search-input") as HTMLInputElement;
    const container = document.getElementById("hearings-table-container");

    searchInput.value = "$100";
    searchInput.dispatchEvent(new Event("input"));

    const highlights = container?.querySelectorAll(".search-highlight");
    expect(highlights?.length).toBe(1);
    expect(highlights?.[0].textContent).toBe("$100");
  });

  it("should do nothing if search input is not found", async () => {
    document.body.innerHTML = "<div>No search input</div>";

    const { initSearchHighlight } = await import("./search-highlight.js");
    expect(() => initSearchHighlight()).not.toThrow();
  });

  it("should do nothing if no container is found", async () => {
    document.body.innerHTML = '<input id="case-search-input" type="text" />';

    const { initSearchHighlight } = await import("./search-highlight.js");
    expect(() => initSearchHighlight()).not.toThrow();
  });

  it("should work with court-lists-container", async () => {
    document.body.innerHTML = `
      <input id="case-search-input" type="text" />
      <div id="court-lists-container">
        <p>Court Room A</p>
      </div>
    `;

    const { initSearchHighlight } = await import("./search-highlight.js");
    initSearchHighlight();

    const searchInput = document.getElementById("case-search-input") as HTMLInputElement;
    const container = document.getElementById("court-lists-container");

    searchInput.value = "Room";
    searchInput.dispatchEvent(new Event("input"));

    const highlights = container?.querySelectorAll(".search-highlight");
    expect(highlights?.length).toBe(1);
    expect(highlights?.[0].textContent).toBe("Room");
  });
});
