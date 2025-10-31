import { getAllLocations, searchLocations } from "@hmcts/location";
// @ts-expect-error - accessible-autocomplete doesn't have proper TypeScript definitions
import accessibleAutocomplete from "accessible-autocomplete/dist/accessible-autocomplete.min.js";

function initAutocompleteForInput(locationInput: HTMLInputElement) {
  const inputId = locationInput.id;
  const language = (locationInput.getAttribute("data-locale") || "en") as "en" | "cy";
  const locations = getAllLocations(language);

  const preselectedLocationId = locationInput.getAttribute("data-location-id");
  const preselectedValue = locationInput.value;
  const searchLabel = locationInput.getAttribute("data-search-label") || "Search for a court or tribunal";

  const container = locationInput.parentElement;
  if (!container) return;

  // Check if autocomplete has already been initialized for this input
  if (document.getElementById(`${inputId}-autocomplete-wrapper`)) {
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.id = `${inputId}-autocomplete-wrapper`;

  // Check if original input has error class
  const hasError = locationInput.classList.contains("govuk-input--error");

  const existingLabel = container.querySelector("label");
  if (!existingLabel) {
    const label = document.createElement("label");
    label.className = "govuk-label";
    label.htmlFor = inputId;
    label.textContent = searchLabel;
    container.insertBefore(label, locationInput);
  }

  container.insertBefore(wrapper, locationInput);

  locationInput.style.display = "none";
  const originalName = locationInput.getAttribute("name");
  locationInput.removeAttribute("name");

  const hiddenInput = document.createElement("input");
  hiddenInput.type = "hidden";
  hiddenInput.name = originalName || "locationId";
  hiddenInput.id = `${inputId}Id`;
  hiddenInput.value = preselectedLocationId || "";
  container.appendChild(hiddenInput);

  const locationMap = new Map(locations.map((loc) => [language === "cy" ? loc.welshName : loc.name, loc.locationId.toString()]));

  accessibleAutocomplete({
    element: wrapper,
    id: inputId,
    name: `${inputId}-display`,
    defaultValue: preselectedValue,
    source: (query: string, populateResults: (results: string[]) => void) => {
      const searchResults = searchLocations(query, language);
      const locationNames = searchResults.map((loc) => (language === "cy" ? loc.welshName : loc.name)).sort((a, b) => a.localeCompare(b));
      populateResults(locationNames);
    },
    minLength: 1,
    confirmOnBlur: true,
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

  // Additional fallback: listen to input changes and update hidden field
  setTimeout(() => {
    const autocompleteInput = document.querySelector(`#${inputId}`) as HTMLInputElement;
    if (autocompleteInput) {
      // Apply error class if original input had error
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
  }, 100);
}

export function initSearchAutocomplete() {
  const locationInput = document.getElementById("location") as HTMLInputElement;
  if (locationInput && locationInput.getAttribute("data-autocomplete") === "true") {
    initAutocompleteForInput(locationInput);
  }
}

export function initAllAutocompletes() {
  const autocompleteInputs = document.querySelectorAll('input[data-autocomplete="true"]') as NodeListOf<HTMLInputElement>;
  for (const input of autocompleteInputs) {
    initAutocompleteForInput(input);
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    initAllAutocompletes();
  });
}
