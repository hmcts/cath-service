const INPUT_ID = "case-search-input";
const TABLE_ID = "hearings-table";
const TABLE_CLASS = "hearings-table";

export function initTableSearch() {
  const searchInput = document.getElementById(INPUT_ID);
  if (!searchInput) return;

  // Support both ID-based (#hearings-table) and class-based (.hearings-table) table selectors
  let tableRows = document.querySelectorAll(`#${TABLE_ID} tbody tr`);
  if (!tableRows.length) {
    tableRows = document.querySelectorAll(`.${TABLE_CLASS} tbody tr`);
  }

  if (!tableRows.length) return;

  searchInput.addEventListener("input", (e) => {
    const query = (e.target as HTMLInputElement).value.toLowerCase().trim();

    tableRows.forEach((row) => {
      const text = row.textContent?.toLowerCase() ?? "";
      const matches = !query || text.includes(query);
      (row as HTMLElement).style.display = matches ? "" : "none";
    });
  });
}
