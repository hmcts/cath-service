// @ts-expect-error - accessible-autocomplete doesn't have proper TypeScript definitions
import accessibleAutocomplete from "accessible-autocomplete/dist/accessible-autocomplete.min.js";

interface CourtLocation {
  locationId: number;
  name: string;
  welshName: string;
  regions: number[];
  subJurisdictions: number[];
}

async function fetchLocations(language: "en" | "cy"): Promise<CourtLocation[]> {
  try {
    const response = await fetch(`/locations?language=${language}`);
    if (!response.ok) {
      console.error(`Failed to fetch locations: ${response.status} ${response.statusText}`);
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching locations:", error);
    return [];
  }
}

async function fetchSearchResults(query: string, language: "en" | "cy"): Promise<CourtLocation[]> {
  try {
    const response = await fetch(`/locations?q=${encodeURIComponent(query)}&language=${language}`);
    if (!response.ok) {
      console.error(`Failed to search locations: ${response.status} ${response.statusText}`);
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error("Error searching locations:", error);
    return [];
  }
}

async function initAutocompleteForInput(locationInput: HTMLInputElement) {
  try {
    const inputId = locationInput.id;
    const language = (locationInput.getAttribute("data-locale") || "en") as "en" | "cy";
    const locations = await fetchLocations(language);

    if (locations.length === 0) {
      console.warn(`No locations fetched for input ${inputId}. Autocomplete not initialized.`);
      return;
    }

    const preselectedLocationId = locationInput.getAttribute("data-location-id");
    const preselectedValue = locationInput.value;
    const searchLabel = locationInput.getAttribute("data-search-label") || "Search for a court or tribunal";
    const noResultsMessage = locationInput.getAttribute("data-no-results-message") || "No results found";
    const hasError = locationInput.classList.contains("govuk-input--error");

    const container = locationInput.parentElement;
    if (!container) return;

    // Check if autocomplete has already been initialized for this input
    if (document.getElementById(`${inputId}-autocomplete-wrapper`)) {
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.id = `${inputId}-autocomplete-wrapper`;

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
      source: async (query: string, populateResults: (results: string[]) => void) => {
        const searchResults = await fetchSearchResults(query, language);
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

    const autocompleteInput = wrapper.querySelector(`#${inputId}`) as HTMLInputElement;
    if (autocompleteInput) {
      // Add label for accessibility
      if (!wrapper.querySelector("label")) {
        const label = document.createElement("label");
        label.className = "govuk-label govuk-visually-hidden";
        label.htmlFor = inputId;
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
  } catch (error) {
    console.error(`Error initializing autocomplete for input ${locationInput.id}:`, error);
    // Leave the original input intact so the form is still usable
  }
}

export async function initSearchAutocomplete() {
  // Initialize all autocomplete inputs concurrently
  const autocompleteInputs = document.querySelectorAll('input[data-autocomplete="true"]') as NodeListOf<HTMLInputElement>;
  const promises = Array.from(autocompleteInputs).map((input) => initAutocompleteForInput(input));
  const results = await Promise.allSettled(promises);

  // Log any failures
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`Failed to initialize autocomplete for input ${autocompleteInputs[index].id}:`, result.reason);
    }
  });
}

export async function initAllAutocompletes() {
  // Initialize all autocomplete inputs concurrently
  const autocompleteInputs = document.querySelectorAll('input[data-autocomplete="true"]') as NodeListOf<HTMLInputElement>;
  const promises = Array.from(autocompleteInputs).map((input) => initAutocompleteForInput(input));
  const results = await Promise.allSettled(promises);

  // Log any failures
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`Failed to initialize autocomplete for input ${autocompleteInputs[index].id}:`, result.reason);
    }
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    void initAllAutocompletes().catch((error) => {
      console.error("Error initializing autocompletes on DOMContentLoaded:", error);
    });
  });
}
