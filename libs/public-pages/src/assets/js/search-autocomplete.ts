import { getAllLocations } from "@hmcts/location";
// @ts-expect-error - accessible-autocomplete doesn't have proper TypeScript definitions
import accessibleAutocomplete from "accessible-autocomplete/dist/accessible-autocomplete.min.js";

export function initSearchAutocomplete() {
  const locationInput = document.getElementById("location") as HTMLInputElement;
  if (!locationInput) return;

  const language = (document.documentElement.lang || "en") as "en" | "cy";
  const locations = getAllLocations(language);

  const preselectedLocationId = locationInput.getAttribute("data-location-id");
  const preselectedValue = locationInput.value;

  const container = locationInput.parentElement;
  if (!container) return;

  const wrapper = document.createElement("div");
  wrapper.id = "location-autocomplete-wrapper";
  container.insertBefore(wrapper, locationInput);
  locationInput.style.display = "none";

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
      const filteredLocations = locations
        .filter((loc) => {
          const name = language === "cy" ? loc.welshName : loc.name;
          return name.toLowerCase().includes(query.toLowerCase());
        })
        .map((loc) => (language === "cy" ? loc.welshName : loc.name));

      populateResults(filteredLocations);
    },
    minLength: 1,
    confirmOnBlur: false,
    onConfirm: (confirmed: string) => {
      if (confirmed) {
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
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    initSearchAutocomplete();
  });
}
