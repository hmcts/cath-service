/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const filterToggleButtonSpy = vi.fn();

vi.mock("@ministryofjustice/frontend", () => ({
  FilterToggleButton: class {
    constructor(...args: unknown[]) {
      filterToggleButtonSpy(...args);
    }
  }
}));

describe("filter-toggle", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    filterToggleButtonSpy.mockClear();
    // js-enabled gates the MOJ overlay CSS; matchMedia is used by the real component.
    window.matchMedia =
      window.matchMedia || ((() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })) as unknown as typeof window.matchMedia);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("should not construct the toggle button when no filter is present", async () => {
    // Arrange
    document.body.innerHTML = "<div></div>";
    const { initFilterToggle } = await import("./filter-toggle.js");

    // Act
    initFilterToggle();

    // Assert
    expect(filterToggleButtonSpy).not.toHaveBeenCalled();
  });

  it("should construct the toggle button with text read from data attributes", async () => {
    // Arrange
    document.body.innerHTML = `
      <div class="moj-filter" data-module="moj-filter"
           data-show-text="Dangos hidlwyr" data-hide-text="Cuddio hidlwyr"
           data-close-text="Cau" data-start-hidden="true"></div>
    `;
    const { initFilterToggle } = await import("./filter-toggle.js");

    // Act
    initFilterToggle();

    // Assert
    expect(filterToggleButtonSpy).toHaveBeenCalledTimes(1);
    const [root, config] = filterToggleButtonSpy.mock.calls[0] as [HTMLElement, Record<string, never>];
    expect(root.classList.contains("moj-filter")).toBe(true);
    expect(config).toMatchObject({
      startHidden: true,
      toggleButton: { showText: "Dangos hidlwyr", hideText: "Cuddio hidlwyr" },
      closeButton: { text: "Cau" }
    });
  });

  it("should honour a custom big-mode media query when supplied", async () => {
    // Arrange
    document.body.innerHTML = `
      <div class="moj-filter" data-module="moj-filter"
           data-show-text="Show" data-hide-text="Hide"
           data-start-hidden="false" data-big-mode-media-query="(min-width: 99999px)"></div>
    `;
    const { initFilterToggle } = await import("./filter-toggle.js");

    // Act
    initFilterToggle();

    // Assert
    const [, config] = filterToggleButtonSpy.mock.calls[0] as [HTMLElement, { bigModeMediaQuery: string; startHidden: boolean }];
    expect(config.bigModeMediaQuery).toBe("(min-width: 99999px)");
    expect(config.startHidden).toBe(false);
  });

  it("should move the clear-filters link after the filter tags so DOM order matches visual order", async () => {
    // Arrange
    document.body.innerHTML = `
      <div class="moj-filter" data-module="moj-filter">
        <div class="moj-filter__selected">
          <div class="moj-filter__selected-heading">
            <div class="moj-filter__heading-title"><h2>Selected filters</h2></div>
            <div class="moj-filter__heading-action"><p><a href="/clear">Clear filters</a></p></div>
          </div>
          <ul class="moj-filter-tags"><li><a class="moj-filter__tag" href="/remove">Tag</a></li></ul>
        </div>
      </div>
    `;
    const { initFilterToggle } = await import("./filter-toggle.js");

    // Act
    initFilterToggle();

    // Assert
    const selected = document.querySelector(".moj-filter__selected") as HTMLElement;
    const children = Array.from(selected.children);
    const tagsIndex = children.findIndex((el) => el.classList.contains("moj-filter-tags"));
    const clearIndex = children.findIndex((el) => el.classList.contains("moj-filter__heading-action"));
    expect(clearIndex).toBeGreaterThan(tagsIndex);
    // The heading no longer contains the clear link once it has been moved out.
    expect(document.querySelector(".moj-filter__selected-heading .moj-filter__heading-action")).toBeNull();
  });

  it("should not throw when there is no selected-filters block to reorder", async () => {
    // Arrange
    document.body.innerHTML = `<div class="moj-filter" data-module="moj-filter"></div>`;
    const { initFilterToggle } = await import("./filter-toggle.js");

    // Act + Assert
    expect(() => initFilterToggle()).not.toThrow();
    expect(filterToggleButtonSpy).toHaveBeenCalledTimes(1);
  });

  it("should reopen the reveal panel on load when filters are active and MOJ has force-hidden it", async () => {
    // Arrange — reveal-layout page (SJP) with data-start-hidden="false" (filters applied).
    // Simulate MOJ's small-mode constructor having force-hidden the panel: moj-js-hidden
    // on the filter and a collapsed toggle button in the action bar.
    document.body.innerHTML = `
      <div class="moj-action-bar"><div class="moj-action-bar__filter">
        <button type="button" aria-expanded="false">Show filters</button>
      </div></div>
      <div class="moj-filter-layout app-filter-layout--reveal">
        <div class="moj-filter moj-js-hidden" data-module="moj-filter"
             data-hide-text="Hide filters" data-start-hidden="false"></div>
      </div>
    `;
    const { initFilterToggle } = await import("./filter-toggle.js");

    // Act
    initFilterToggle();

    // Assert — panel revealed and toggle reflects the expanded state.
    const filter = document.querySelector(".moj-filter") as HTMLElement;
    const toggle = document.querySelector(".moj-action-bar__filter button") as HTMLButtonElement;
    expect(filter.classList.contains("moj-js-hidden")).toBe(false);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.textContent).toBe("Hide filters");
  });

  it("should not reopen the panel when data-start-hidden is true", async () => {
    // Arrange — reveal-layout page with no filters applied (panel should stay closed).
    document.body.innerHTML = `
      <div class="moj-action-bar"><div class="moj-action-bar__filter">
        <button type="button" aria-expanded="false">Show filters</button>
      </div></div>
      <div class="moj-filter-layout app-filter-layout--reveal">
        <div class="moj-filter moj-js-hidden" data-module="moj-filter"
             data-hide-text="Hide filters" data-start-hidden="true"></div>
      </div>
    `;
    const { initFilterToggle } = await import("./filter-toggle.js");

    // Act
    initFilterToggle();

    // Assert — panel stays hidden.
    const filter = document.querySelector(".moj-filter") as HTMLElement;
    const toggle = document.querySelector(".moj-action-bar__filter button") as HTMLButtonElement;
    expect(filter.classList.contains("moj-js-hidden")).toBe(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("should not reopen the panel on non-reveal (sidebar) layouts", async () => {
    // Arrange — sidebar page with data-start-hidden="false"; big mode handles visibility,
    // so this helper must not touch it.
    document.body.innerHTML = `
      <div class="moj-action-bar"><div class="moj-action-bar__filter">
        <button type="button" aria-expanded="false">Show filters</button>
      </div></div>
      <div class="moj-filter-layout app-filter-layout--sidebar">
        <div class="moj-filter moj-js-hidden" data-module="moj-filter"
             data-hide-text="Hide filters" data-start-hidden="false"></div>
      </div>
    `;
    const { initFilterToggle } = await import("./filter-toggle.js");

    // Act
    initFilterToggle();

    // Assert — untouched by the reveal helper.
    const toggle = document.querySelector(".moj-action-bar__filter button") as HTMLButtonElement;
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("should render the hide button after the apply button as a plain (non-cross) secondary button", async () => {
    // Arrange
    document.body.innerHTML = `
      <div class="moj-filter" data-module="moj-filter" data-hide-text="Hide filters">
        <div class="moj-filter__options">
          <button class="govuk-button" type="submit">Apply filters</button>
          <div class="govuk-form-group"></div>
        </div>
      </div>
    `;
    const { initFilterToggle } = await import("./filter-toggle.js");

    // Act
    initFilterToggle();

    // Assert — a container is inserted right after the apply button for MOJ to fill.
    const options = document.querySelector(".moj-filter__options") as HTMLElement;
    const children = Array.from(options.children);
    const applyIndex = children.findIndex((el) => el.classList.contains("govuk-button"));
    const hideIndex = children.findIndex((el) => el.classList.contains("app-filter__hide"));
    expect(hideIndex).toBe(applyIndex + 1);
    // MOJ is told to render into that container, styled as a plain secondary button.
    const [, config] = filterToggleButtonSpy.mock.calls[0] as [HTMLElement, { closeButton: { classes: string }; closeButtonContainer: { selector: string } }];
    expect(config.closeButtonContainer.selector).toBe(".app-filter__hide");
    expect(config.closeButton.classes).not.toContain("moj-filter__close");
  });
});
