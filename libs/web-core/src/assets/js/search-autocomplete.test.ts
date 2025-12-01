/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockLocations = [
  { locationId: 1, name: "Cardiff Crown Court", welshName: "Llys y Goron Caerdydd", regions: [1], subJurisdictions: [1] },
  { locationId: 2, name: "Swansea Crown Court", welshName: "Llys y Goron Abertawe", regions: [2], subJurisdictions: [1, 2] }
];

// Mock fetch API
global.fetch = vi.fn((url: string) => {
  const urlObj = new URL(url, "http://localhost");
  const query = urlObj.searchParams.get("q");
  const language = urlObj.searchParams.get("language") || "en";

  if (query) {
    // Search locations
    const searchField = language === "cy" ? "welshName" : "name";
    const filtered = mockLocations.filter((loc) => loc[searchField].toLowerCase().includes(query.toLowerCase()));
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(filtered)
    } as Response);
  }

  // Get all locations
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(mockLocations)
  } as Response);
});

const mockAccessibleAutocomplete = vi.fn((config: { element: HTMLElement; id: string }) => {
  // Simulate what accessible-autocomplete does: create an input element
  const input = document.createElement("input");
  input.id = config.id;
  config.element.appendChild(input);
});
vi.mock("accessible-autocomplete/dist/accessible-autocomplete.min.js", () => ({
  default: mockAccessibleAutocomplete
}));

describe("search-autocomplete", () => {
  let locationInput: HTMLInputElement;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset fetch mock
    (global.fetch as any).mockClear();

    document.body.innerHTML = "";

    container = document.createElement("div");
    locationInput = document.createElement("input");
    locationInput.id = "location";
    locationInput.setAttribute("data-locale", "en");
    locationInput.setAttribute("data-autocomplete", "true");

    container.appendChild(locationInput);
    document.body.appendChild(container);
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  describe("initSearchAutocomplete", () => {
    it("should initialize autocomplete with visually hidden label", async () => {
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      await initSearchAutocomplete();

      const wrapper = container.querySelector("#location-autocomplete-wrapper");
      const label = wrapper?.querySelector("label");
      expect(label).toBeTruthy();
      expect(label?.textContent).toBe("Search");
      expect(label?.className).toContain("govuk-visually-hidden");
    });

    it("should create wrapper div for autocomplete", async () => {
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      await initSearchAutocomplete();

      const wrapper = container.querySelector("#location-autocomplete-wrapper");
      expect(wrapper).toBeTruthy();
    });

    it("should hide original input and remove name attribute", async () => {
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      await initSearchAutocomplete();

      expect(locationInput.style.display).toBe("none");
      expect(locationInput.hasAttribute("name")).toBe(false);
    });

    it("should create hidden input for locationId", async () => {
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      await initSearchAutocomplete();

      const hiddenInput = container.querySelector('input[type="hidden"][name="locationId"]') as HTMLInputElement;
      expect(hiddenInput).toBeTruthy();
      expect(hiddenInput?.id).toBe("locationId");
    });

    it("should set hidden input value from preselected location", async () => {
      locationInput.setAttribute("data-location-id", "123");

      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      await initSearchAutocomplete();

      const hiddenInput = container.querySelector('input[type="hidden"][name="locationId"]') as HTMLInputElement;
      expect(hiddenInput?.value).toBe("123");
    });

    it("should call accessible-autocomplete with correct config", async () => {
      locationInput.setAttribute("data-locale", "en");

      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      await initSearchAutocomplete();

      expect(mockAccessibleAutocomplete).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "location",
          name: "location-display",
          minLength: 1,
          confirmOnBlur: true
        })
      );
    });

    it("should pass preselected value as defaultValue", async () => {
      locationInput.value = "Cardiff Crown Court";

      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      await initSearchAutocomplete();

      expect(mockAccessibleAutocomplete).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultValue: "Cardiff Crown Court"
        })
      );
    });

    it("should not initialize if location input not found", async () => {
      document.body.innerHTML = "";

      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      await initSearchAutocomplete();

      expect(mockAccessibleAutocomplete).not.toHaveBeenCalled();
    });

    it("should create location map with English names", async () => {
      locationInput.setAttribute("data-locale", "en");

      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      await initSearchAutocomplete();

      const config = mockAccessibleAutocomplete.mock.calls[0][0];
      expect(config.source).toBeDefined();
    });

    it("should create location map with Welsh names when locale is cy", async () => {
      locationInput.setAttribute("data-locale", "cy");

      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      await initSearchAutocomplete();

      const config = mockAccessibleAutocomplete.mock.calls[0][0];
      expect(config.source).toBeDefined();
    });

    it("should add govuk-label class to label", async () => {
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      await initSearchAutocomplete();

      const wrapper = container.querySelector("#location-autocomplete-wrapper");
      const label = wrapper?.querySelector("label");
      expect(label?.className).toBe("govuk-label govuk-visually-hidden");
    });

    it("should set label htmlFor to location", async () => {
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      await initSearchAutocomplete();

      const wrapper = container.querySelector("#location-autocomplete-wrapper");
      const label = wrapper?.querySelector("label");
      expect(label?.htmlFor).toBe("location");
    });

    it("should apply error class to autocomplete input when original input has error", async () => {
      locationInput.classList.add("govuk-input--error");

      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      await initSearchAutocomplete();

      const wrapper = container.querySelector("#location-autocomplete-wrapper");
      const autocompleteInput = wrapper?.querySelector("#location");
      expect(autocompleteInput?.classList.contains("govuk-input--error")).toBe(true);
    });

    it("should not apply error class to autocomplete input when original input has no error", async () => {
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      await initSearchAutocomplete();

      const wrapper = container.querySelector("#location-autocomplete-wrapper");
      const autocompleteInput = wrapper?.querySelector("#location");
      expect(autocompleteInput?.classList.contains("govuk-input--error")).toBe(false);
    });
  });
});
