/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockLocations = [
  { locationId: 1, name: "Cardiff Crown Court", welshName: "Llys y Goron Caerdydd", regions: [1], subJurisdictions: [1] },
  { locationId: 2, name: "Swansea Crown Court", welshName: "Llys y Goron Abertawe", regions: [2], subJurisdictions: [1, 2] }
];

// Mock fetch API
global.fetch = vi.fn((url: string | URL | Request, _init?: RequestInit) => {
  let urlString: string;
  if (typeof url === "string") {
    urlString = url;
  } else if (url instanceof Request) {
    urlString = url.url;
  } else if (typeof url === "object" && "url" in url) {
    urlString = url.url;
  } else {
    urlString = url.toString();
  }
  const urlObj = new URL(urlString, "http://localhost");
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

const mockAccessibleAutocomplete = vi.fn((config: { element: HTMLElement; id: string; source?: any }) => {
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
    it("should not add a label inside the autocomplete wrapper", async () => {
      // Arrange
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      // Act
      await initSearchAutocomplete();

      // Assert
      const wrapper = container.querySelector("#location-autocomplete-wrapper");
      expect(wrapper?.querySelector("label")).toBeNull();
      expect(document.querySelectorAll(".govuk-visually-hidden")).toHaveLength(0);
    });

    it("should leave only one element with the input id", async () => {
      // Arrange
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      // Act
      await initSearchAutocomplete();

      // Assert
      expect(document.querySelectorAll("#location")).toHaveLength(1);
      expect(document.querySelector("#location")?.closest("#location-autocomplete-wrapper")).toBeTruthy();
    });

    it("should keep the existing visible label as the only label for the input", async () => {
      // Arrange
      const visibleLabel = document.createElement("label");
      visibleLabel.className = "govuk-label govuk-label--m";
      visibleLabel.htmlFor = "location";
      visibleLabel.textContent = "Search by court or tribunal name";
      container.insertBefore(visibleLabel, locationInput);
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      // Act
      await initSearchAutocomplete();

      // Assert
      const labels = document.querySelectorAll('label[for="location"]');
      expect(labels).toHaveLength(1);
      expect(labels[0]).toBe(visibleLabel);
    });

    it("should copy aria-describedby from the original input to the autocomplete input", async () => {
      // Arrange
      locationInput.setAttribute("aria-describedby", "location-hint location-error");
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      // Act
      await initSearchAutocomplete();

      // Assert
      const describedBy = document.querySelector("#location")?.getAttribute("aria-describedby")?.split(" ");
      expect(describedBy).toEqual(expect.arrayContaining(["location-hint", "location-error"]));
    });

    it("should restore the copied aria-describedby ids when the autocomplete replaces the attribute", async () => {
      // Arrange
      locationInput.setAttribute("aria-describedby", "location-hint");
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");
      await initSearchAutocomplete();
      const autocompleteInput = document.querySelector("#location") as HTMLInputElement;

      // Act
      autocompleteInput.setAttribute("aria-describedby", "location__assistiveHint");
      await vi.runAllTimersAsync();
      await Promise.resolve();

      // Assert
      expect(autocompleteInput.getAttribute("aria-describedby")).toBe("location__assistiveHint location-hint");
    });

    it("should leave the original input in place when locations cannot be fetched", async () => {
      // Arrange
      locationInput.setAttribute("name", "locationId");
      vi.mocked(global.fetch).mockResolvedValueOnce({ ok: false, status: 500, statusText: "Error" } as Response);
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      // Act
      await initSearchAutocomplete();

      // Assert
      expect(locationInput.isConnected).toBe(true);
      expect(locationInput.getAttribute("name")).toBe("locationId");
      expect(document.querySelectorAll("#location")).toHaveLength(1);
      expect(container.querySelector("#location-autocomplete-wrapper")).toBeNull();
    });

    it("should create wrapper div for autocomplete", async () => {
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      await initSearchAutocomplete();

      const wrapper = container.querySelector("#location-autocomplete-wrapper");
      expect(wrapper).toBeTruthy();
    });

    it("should remove the original input and move its name to the hidden input", async () => {
      // Arrange
      locationInput.setAttribute("name", "locationId");
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      // Act
      await initSearchAutocomplete();

      // Assert
      expect(locationInput.isConnected).toBe(false);
      expect(document.querySelectorAll('[name="locationId"]')).toHaveLength(1);
      expect((document.querySelector('[name="locationId"]') as HTMLInputElement).type).toBe("hidden");
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

    it("should create one visible fallback label when the container has no label", async () => {
      // Arrange
      locationInput.setAttribute("data-search-label", "Court name");
      const { initSearchAutocomplete } = await import("./search-autocomplete.js");

      // Act
      await initSearchAutocomplete();

      // Assert
      const labels = document.querySelectorAll('label[for="location"]');
      expect(labels).toHaveLength(1);
      expect(labels[0].className).toBe("govuk-label");
      expect(labels[0].textContent).toBe("Court name");
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
