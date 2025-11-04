import { getAllLocations, searchLocations } from "@hmcts/location";
// @ts-expect-error - accessible-autocomplete doesn't have proper TypeScript definitions
import accessibleAutocomplete from "accessible-autocomplete/dist/accessible-autocomplete.min.js";

export function initSearchAutocomplete() {
  const locationInput = document.getElementById("location") as HTMLInputElement;
  if (!locationInput) return;

  const language = (locationInput.getAttribute("data-locale") || "en") as "en" | "cy";
  const locations = getAllLocations(language);

  const preselectedLocationId = locationInput.getAttribute("data-location-id");
  const preselectedValue = locationInput.value;
  const noResultsMessage = locationInput.getAttribute("data-no-results-message") || "No results found";
  const hasError = locationInput.classList.contains("govuk-input--error");

  const container = locationInput.parentElement;
  if (!container) return;

  const wrapper = document.createElement("div");
  wrapper.id = "location-autocomplete-wrapper";

  container.insertBefore(wrapper, locationInput);

  locationInput.style.display = "none";
  locationInput.removeAttribute("name");

  const hiddenInput = document.createElement("input");
  hiddenInput.type = "hidden";
  hiddenInput.name = "locationId";
  hiddenInput.id = "locationId";
  hiddenInput.value = preselectedLocationId || "";
  container.appendChild(hiddenInput);

  const locationMap = new Map(locations.map((loc) => [language === "cy" ? loc.welshName : loc.name, loc.locationId.toString()]));

  accessibleAutocomplete({
    element: wrapper,
    id: "location",
    name: "location-display",
    defaultValue: preselectedValue,
    source: (query: string, populateResults: (results: string[]) => void) => {
      const searchResults = searchLocations(query, language);
      const locationNames = searchResults.map((loc) => (language === "cy" ? loc.welshName : loc.name));
      populateResults(locationNames);
    },
    minLength: 1,
    confirmOnBlur: true,
    autoselect: false,
    tNoResults: () => noResultsMessage,
    onConfirm: (confirmed: string | undefined) => {
      if (confirmed && typeof confirmed === "string") {
        const locationId = locationMap.get(confirmed);
        if (locationId) {
          hiddenInput.value = locationId;
        } else {
          hiddenInput.value = "";
        }
      } else {
        hiddenInput.value = "";
      }
    }
  });

  const autocompleteInput = wrapper.querySelector("#location") as HTMLInputElement;
  if (autocompleteInput) {
    // Add label for accessibility
    if (!wrapper.querySelector("label")) {
      const label = document.createElement("label");
      label.className = "govuk-label govuk-visually-hidden";
      label.htmlFor = "location";
      label.textContent = "Search";
      wrapper.insertBefore(label, wrapper.firstChild);
    }

    // Apply error styling if needed
    if (hasError) {
      autocompleteInput.classList.add("govuk-input--error");
    }

    const form = autocompleteInput.closest("form");

    autocompleteInput.addEventListener("change", () => {
      const value = autocompleteInput.value;
      const locationId = locationMap.get(value);
      if (locationId) {
        hiddenInput.value = locationId;
      } else {
        hiddenInput.value = "";
      }
    });

    autocompleteInput.addEventListener("blur", () => {
      const value = autocompleteInput.value;
      const locationId = locationMap.get(value);
      if (locationId) {
        hiddenInput.value = locationId;
      }
    });

    if (form) {
      form.addEventListener("submit", () => {
        const currentValue = autocompleteInput.value;
        const locationId = locationMap.get(currentValue);
        if (locationId) {
          hiddenInput.value = locationId;
        }
      });
    }
  }
}
