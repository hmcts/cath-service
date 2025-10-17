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

  const container = locationInput.parentElement;
  if (!container) return;

  const wrapper = document.createElement("div");
  wrapper.id = "location-autocomplete-wrapper";

  const label = document.createElement("label");
  label.className = "govuk-label";
  label.htmlFor = "location";
  label.textContent = language === "cy" ? "Chwilio am lys neu dribiwnlys" : "Search for a court or tribunal";
  container.insertBefore(label, locationInput);
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
    const autocompleteInput = document.querySelector("#location") as HTMLInputElement;
    if (autocompleteInput) {
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

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    initSearchAutocomplete();
  });
}
