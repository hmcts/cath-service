const SEARCH_INPUT_ID = "search";
const POSTCODE_CHECKBOX_ID = "postcodes-checkbox";
const PROSECUTOR_CHECKBOX_ID = "prosecutor-checkbox";

export function initSjpFilterSearch(): void {
  const searchInput = document.getElementById(SEARCH_INPUT_ID) as HTMLInputElement | null;
  const postcodeContainer = document.getElementById(POSTCODE_CHECKBOX_ID);
  const prosecutorContainer = document.getElementById(PROSECUTOR_CHECKBOX_ID);

  if (!searchInput || (!postcodeContainer && !prosecutorContainer)) return;

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    filterCheckboxItems(postcodeContainer, query);
    filterCheckboxItems(prosecutorContainer, query);
  });
}

function filterCheckboxItems(container: HTMLElement | null, query: string): void {
  if (!container) return;

  const items = container.querySelectorAll<HTMLElement>(".govuk-checkboxes__item");
  for (const item of items) {
    const label = item.querySelector("label");
    const text = label?.textContent?.trim().toLowerCase() ?? "";
    item.style.display = !query || text.includes(query) ? "" : "none";
  }
}
