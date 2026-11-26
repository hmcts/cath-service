/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("filter-panel", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("initFilterPanel", () => {
    describe("jurisdiction sub-jurisdiction toggle", () => {
      it("should reveal the sub-jurisdiction section when the jurisdiction is checked", async () => {
        // Arrange
        document.body.innerHTML = `
          <input type="checkbox" name="jurisdiction" value="1" />
          <div class="sub-jurisdiction-section" data-parent-jurisdiction="1" hidden></div>
        `;
        const { initFilterPanel } = await import("./filter-panel.js");
        initFilterPanel();
        const checkbox = document.querySelector('input[name="jurisdiction"]') as HTMLInputElement;
        const subSection = document.querySelector('.sub-jurisdiction-section[data-parent-jurisdiction="1"]') as HTMLElement;

        // Act
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event("change"));

        // Assert
        expect(subSection.hidden).toBe(false);
      });

      it("should hide the sub-jurisdiction section when the jurisdiction is unchecked", async () => {
        // Arrange
        document.body.innerHTML = `
          <input type="checkbox" name="jurisdiction" value="1" checked />
          <div class="sub-jurisdiction-section" data-parent-jurisdiction="1">
            <input type="checkbox" name="subJurisdiction" value="10" checked />
          </div>
        `;
        const { initFilterPanel } = await import("./filter-panel.js");
        initFilterPanel();
        const checkbox = document.querySelector('input[name="jurisdiction"]') as HTMLInputElement;
        const subSection = document.querySelector('.sub-jurisdiction-section[data-parent-jurisdiction="1"]') as HTMLElement;
        const subCheckbox = subSection.querySelector('input[name="subJurisdiction"]') as HTMLInputElement;

        // Act
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event("change"));

        // Assert
        expect(subSection.hidden).toBe(true);
        expect(subCheckbox.checked).toBe(false);
      });

      it("should uncheck all sub-jurisdiction checkboxes when the jurisdiction is unchecked", async () => {
        // Arrange
        document.body.innerHTML = `
          <input type="checkbox" name="jurisdiction" value="1" checked />
          <div class="sub-jurisdiction-section" data-parent-jurisdiction="1">
            <input type="checkbox" name="subJurisdiction" value="10" checked />
            <input type="checkbox" name="subJurisdiction" value="11" checked />
          </div>
        `;
        const { initFilterPanel } = await import("./filter-panel.js");
        initFilterPanel();
        const checkbox = document.querySelector('input[name="jurisdiction"]') as HTMLInputElement;
        const subCheckboxes = document.querySelectorAll('input[name="subJurisdiction"]') as NodeListOf<HTMLInputElement>;

        // Act
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event("change"));

        // Assert
        subCheckboxes.forEach((subCheckbox) => {
          expect(subCheckbox.checked).toBe(false);
        });
      });

      it("should handle multiple jurisdiction checkboxes independently", async () => {
        // Arrange
        document.body.innerHTML = `
          <input type="checkbox" name="jurisdiction" value="1" />
          <div class="sub-jurisdiction-section" data-parent-jurisdiction="1" hidden></div>
          <input type="checkbox" name="jurisdiction" value="2" />
          <div class="sub-jurisdiction-section" data-parent-jurisdiction="2" hidden></div>
        `;
        const { initFilterPanel } = await import("./filter-panel.js");
        initFilterPanel();
        const checkbox1 = document.querySelector('input[name="jurisdiction"][value="1"]') as HTMLInputElement;
        const subSection1 = document.querySelector('.sub-jurisdiction-section[data-parent-jurisdiction="1"]') as HTMLElement;
        const subSection2 = document.querySelector('.sub-jurisdiction-section[data-parent-jurisdiction="2"]') as HTMLElement;

        // Act
        checkbox1.checked = true;
        checkbox1.dispatchEvent(new Event("change"));

        // Assert
        expect(subSection1.hidden).toBe(false);
        expect(subSection2.hidden).toBe(true);
      });
    });

    describe("collapsible filter sections", () => {
      it("should collapse a section and swap the icon to + when an expanded toggle is clicked", async () => {
        // Arrange
        document.body.innerHTML = `
          <button class="filter-section-toggle" aria-expanded="true" aria-controls="jurisdiction-section">
            <span class="filter-section-icon">−</span>
          </button>
          <div id="jurisdiction-section" class="filter-section-content"></div>
        `;
        const { initFilterPanel } = await import("./filter-panel.js");
        initFilterPanel();
        const toggle = document.querySelector(".filter-section-toggle") as HTMLElement;
        const content = document.getElementById("jurisdiction-section") as HTMLElement;
        const icon = toggle.querySelector(".filter-section-icon") as HTMLElement;

        // Act
        toggle.dispatchEvent(new Event("click"));

        // Assert
        expect(toggle.getAttribute("aria-expanded")).toBe("false");
        expect(content.hasAttribute("hidden")).toBe(true);
        expect(icon.textContent).toBe("+");
      });

      it("should expand a section and swap the icon to − when a collapsed toggle is clicked", async () => {
        // Arrange
        document.body.innerHTML = `
          <button class="filter-section-toggle" aria-expanded="false" aria-controls="jurisdiction-section">
            <span class="filter-section-icon">+</span>
          </button>
          <div id="jurisdiction-section" class="filter-section-content" hidden></div>
        `;
        const { initFilterPanel } = await import("./filter-panel.js");
        initFilterPanel();
        const toggle = document.querySelector(".filter-section-toggle") as HTMLElement;
        const content = document.getElementById("jurisdiction-section") as HTMLElement;
        const icon = toggle.querySelector(".filter-section-icon") as HTMLElement;

        // Act
        toggle.dispatchEvent(new Event("click"));

        // Assert
        expect(toggle.getAttribute("aria-expanded")).toBe("true");
        expect(content.hasAttribute("hidden")).toBe(false);
        expect(icon.textContent).toBe("−");
      });

      it("should use the custom expanded/collapsed icons when the toggle overrides them", async () => {
        // Arrange
        document.body.innerHTML = `
          <button class="filter-section-toggle" aria-expanded="true" aria-controls="postcode-section" data-expanded-icon="▼" data-collapsed-icon="▶">
            <span class="filter-section-icon">▼</span>
          </button>
          <div id="postcode-section" class="filter-section-content"></div>
        `;
        const { initFilterPanel } = await import("./filter-panel.js");
        initFilterPanel();
        const toggle = document.querySelector(".filter-section-toggle") as HTMLElement;
        const icon = toggle.querySelector(".filter-section-icon") as HTMLElement;

        // Act
        toggle.dispatchEvent(new Event("click"));
        // Assert
        expect(icon.textContent).toBe("▶");

        // Act
        toggle.dispatchEvent(new Event("click"));
        // Assert
        expect(icon.textContent).toBe("▼");
      });
    });

    describe("initialization", () => {
      it("should not throw when no filter elements are present", async () => {
        // Arrange
        document.body.innerHTML = "<div></div>";
        const { initFilterPanel } = await import("./filter-panel.js");

        // Act & Assert
        expect(() => initFilterPanel()).not.toThrow();
      });

      it("should handle an empty DOM gracefully", async () => {
        // Arrange
        document.body.innerHTML = "";
        const { initFilterPanel } = await import("./filter-panel.js");

        // Act & Assert
        expect(() => initFilterPanel()).not.toThrow();
      });
    });
  });
});
