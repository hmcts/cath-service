const upArrow =
  '<svg width="22" height="22" focusable="false" aria-hidden="true" role="img" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.5625 15.5L11 6.63125L15.4375 15.5H6.5625Z" fill="currentColor"/></svg>';
const downArrow =
  '<svg width="22" height="22" focusable="false" aria-hidden="true" role="img" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.4375 7L11 15.8687L6.5625 7L15.4375 7Z" fill="currentColor"/></svg>';
const upDownArrow =
  '<svg width="22" height="22" focusable="false" aria-hidden="true" role="img" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.1875 9.5L10.9609 3.95703L13.7344 9.5H8.1875Z" fill="currentColor"/><path d="M13.7344 12.0781L10.9609 17.6211L8.1875 12.0781H13.7344Z" fill="currentColor"/></svg>';

export function initSortableTable(): void {
  const tables = document.querySelectorAll<HTMLTableElement>('[data-module="moj-sortable-table"]');
  for (const table of tables) {
    initTable(table);
  }
}

function initTable(table: HTMLTableElement): void {
  const headers = table.querySelectorAll<HTMLTableCellElement>("thead th[aria-sort]");

  for (const header of headers) {
    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.textContent = header.textContent?.trim() ?? "";
    button.insertAdjacentHTML("beforeend", arrowFor(header.getAttribute("aria-sort")));
    header.textContent = "";
    header.appendChild(button);

    button.addEventListener("click", () => handleSort(table, headers, header, button));
  }
}

function arrowFor(sort: string | null): string {
  if (sort === "ascending") return upArrow;
  if (sort === "descending") return downArrow;
  return upDownArrow;
}

function handleSort(
  table: HTMLTableElement,
  headers: NodeListOf<HTMLTableCellElement>,
  clickedHeader: HTMLTableCellElement,
  clickedButton: HTMLButtonElement
): void {
  const currentSort = clickedHeader.getAttribute("aria-sort");
  const newSort = currentSort === "ascending" ? "descending" : "ascending";

  for (const header of headers) {
    const sort = header === clickedHeader ? newSort : "none";
    header.setAttribute("aria-sort", sort);
    const btn = header.querySelector("button");
    if (btn) {
      btn.querySelector("svg")?.remove();
      btn.insertAdjacentHTML("beforeend", arrowFor(sort));
    }
  }

  sortRows(table, clickedHeader, newSort === "ascending");

  // Rows are re-appended to the tbody; keep keyboard and screen reader users on the control they used.
  clickedButton.focus();
}

function sortRows(table: HTMLTableElement, header: HTMLTableCellElement, ascending: boolean): void {
  const tbody = table.querySelector("tbody");
  if (!tbody) return;

  const columnIndex = Array.from(header.parentElement?.children ?? []).indexOf(header);
  const rows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>("tr"));

  rows.sort((a, b) => {
    const comparison = compareValues(getSortValue(a.cells[columnIndex]), getSortValue(b.cells[columnIndex]));
    return ascending ? comparison : -comparison;
  });

  for (const row of rows) {
    tbody.appendChild(row);
  }
}

function getSortValue(cell: HTMLTableCellElement | undefined): string {
  if (!cell) return "";
  return (cell.dataset.sortValue ?? cell.textContent ?? "").trim();
}

function compareValues(aValue: string, bValue: string): number {
  return aValue.localeCompare(bValue, undefined, { numeric: true });
}
