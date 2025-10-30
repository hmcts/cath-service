/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/location", () => ({
  getAllLocations: vi.fn((language: string) => {
    if (language === "cy") {
      return [
        { locationId: 1, name: "Cardiff Crown Court", welshName: "Llys y Goron Caerdydd" },
        { locationId: 2, name: "Swansea Crown Court", welshName: "Llys y Goron Abertawe" }
      ];
    }
    return [
      { locationId: 1, name: "Cardiff Crown Court", welshName: "Llys y Goron Caerdydd" },
      { locationId: 2, name: "Swansea Crown Court", welshName: "Llys y Goron Abertawe" }
    ];
  }),
  searchLocations: vi.fn((query: string, language: string) => {
    const locations = [
      { locationId: 1, name: "Cardiff Crown Court", welshName: "Llys y Goron Caerdydd" },
      { locationId: 2, name: "Swansea Crown Court", welshName: "Llys y Goron Abertawe" }
    ];
    const searchField = language === "cy" ? "welshName" : "name";
    return locations.filter((loc) => loc[searchField].toLowerCase().includes(query.toLowerCase()));
  })
}));

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
    document.body.innerHTML = "";
  });

  describe("initSearchAutocomplete", () => {
    it("should initialize autocomplete with visually hidden label", async () => {
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      initSearchAutocomplete();

      const wrapper = container.querySelector("#location-autocomplete-wrapper");
      const label = wrapper?.querySelector("label");
      expect(label).toBeTruthy();
      expect(label?.textContent).toBe("Search");
      expect(label?.className).toContain("govuk-visually-hidden");
    });

    it("should create wrapper div for autocomplete", async () => {
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      initSearchAutocomplete();

      const wrapper = container.querySelector("#location-autocomplete-wrapper");
      expect(wrapper).toBeTruthy();
    });

    it("should hide original input and remove name attribute", async () => {
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      initSearchAutocomplete();

      expect(locationInput.style.display).toBe("none");
      expect(locationInput.hasAttribute("name")).toBe(false);
    });

    it("should create hidden input for locationId", async () => {
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      initSearchAutocomplete();

      const hiddenInput = container.querySelector('input[type="hidden"][name="locationId"]') as HTMLInputElement;
      expect(hiddenInput).toBeTruthy();
      expect(hiddenInput?.id).toBe("locationId");
    });

    it("should set hidden input value from preselected location", async () => {
      locationInput.setAttribute("data-location-id", "123");

      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      initSearchAutocomplete();

      const hiddenInput = container.querySelector('input[type="hidden"][name="locationId"]') as HTMLInputElement;
      expect(hiddenInput?.value).toBe("123");
    });

    it("should call accessible-autocomplete with correct config", async () => {
      locationInput.setAttribute("data-locale", "en");

      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      initSearchAutocomplete();

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

      initSearchAutocomplete();

      expect(mockAccessibleAutocomplete).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultValue: "Cardiff Crown Court"
        })
      );
    });

    it("should not initialize if location input not found", async () => {
      document.body.innerHTML = "";

      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      initSearchAutocomplete();

      expect(mockAccessibleAutocomplete).not.toHaveBeenCalled();
    });

    it("should create location map with English names", async () => {
      locationInput.setAttribute("data-locale", "en");

      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      initSearchAutocomplete();

      const config = mockAccessibleAutocomplete.mock.calls[0][0];
      expect(config.source).toBeDefined();
    });

    it("should create location map with Welsh names when locale is cy", async () => {
      locationInput.setAttribute("data-locale", "cy");

      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      initSearchAutocomplete();

      const config = mockAccessibleAutocomplete.mock.calls[0][0];
      expect(config.source).toBeDefined();
    });

    it("should add govuk-label class to label", async () => {
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      initSearchAutocomplete();

      const wrapper = container.querySelector("#location-autocomplete-wrapper");
      const label = wrapper?.querySelector("label");
      expect(label?.className).toBe("govuk-label govuk-visually-hidden");
    });

    it("should set label htmlFor to location", async () => {
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      initSearchAutocomplete();

      const wrapper = container.querySelector("#location-autocomplete-wrapper");
      const label = wrapper?.querySelector("label");
      expect(label?.htmlFor).toBe("location");
    });

    it("should apply error class to autocomplete input when original input has error", async () => {
      locationInput.classList.add("govuk-input--error");

      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      initSearchAutocomplete();

      const wrapper = container.querySelector("#location-autocomplete-wrapper");
      const autocompleteInput = wrapper?.querySelector("#location");
      expect(autocompleteInput?.classList.contains("govuk-input--error")).toBe(true);
    });

    it("should not apply error class to autocomplete input when original input has no error", async () => {
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      initSearchAutocomplete();

      const wrapper = container.querySelector("#location-autocomplete-wrapper");
      const autocompleteInput = wrapper?.querySelector("#location");
      expect(autocompleteInput?.classList.contains("govuk-input--error")).toBe(false);
    });
  });
});
