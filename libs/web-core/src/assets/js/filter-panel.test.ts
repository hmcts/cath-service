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
      it("should show sub-jurisdiction section when jurisdiction is checked", async () => {
        document.body.innerHTML = `
          <input type="checkbox" name="jurisdiction" value="1" />
          <div class="sub-jurisdiction-section" data-parent-jurisdiction="1" style="display: none;"></div>
        `;

        const { initFilterPanel } = await import("./filter-panel.js");
        initFilterPanel();

        const checkbox = document.querySelector('input[name="jurisdiction"]') as HTMLInputElement;
        const subSection = document.querySelector('.sub-jurisdiction-section[data-parent-jurisdiction="1"]') as HTMLElement;

        checkbox.checked = true;
        checkbox.dispatchEvent(new Event("change"));

        expect(subSection.style.display).toBe("block");
      });

      it("should hide sub-jurisdiction section when jurisdiction is unchecked", async () => {
        document.body.innerHTML = `
          <input type="checkbox" name="jurisdiction" value="1" checked />
          <div class="sub-jurisdiction-section" data-parent-jurisdiction="1" style="display: block;">
            <input type="checkbox" name="subJurisdiction" value="10" checked />
          </div>
        `;

        const { initFilterPanel } = await import("./filter-panel.js");
        initFilterPanel();

        const checkbox = document.querySelector('input[name="jurisdiction"]') as HTMLInputElement;
        const subSection = document.querySelector('.sub-jurisdiction-section[data-parent-jurisdiction="1"]') as HTMLElement;
        const subCheckbox = subSection.querySelector('input[name="subJurisdiction"]') as HTMLInputElement;

        checkbox.checked = false;
        checkbox.dispatchEvent(new Event("change"));

        expect(subSection.style.display).toBe("none");
        expect(subCheckbox.checked).toBe(false);
      });

      it("should uncheck sub-jurisdiction checkboxes when jurisdiction is unchecked", async () => {
        document.body.innerHTML = `
          <input type="checkbox" name="jurisdiction" value="1" checked />
          <div class="sub-jurisdiction-section" data-parent-jurisdiction="1" style="display: block;">
            <input type="checkbox" name="subJurisdiction" value="10" checked />
            <input type="checkbox" name="subJurisdiction" value="11" checked />
          </div>
        `;

        const { initFilterPanel } = await import("./filter-panel.js");
        initFilterPanel();

        const checkbox = document.querySelector('input[name="jurisdiction"]') as HTMLInputElement;
        const subCheckboxes = document.querySelectorAll('input[name="subJurisdiction"]') as NodeListOf<HTMLInputElement>;

        checkbox.checked = false;
        checkbox.dispatchEvent(new Event("change"));

        subCheckboxes.forEach((subCheckbox) => {
          expect(subCheckbox.checked).toBe(false);
        });
      });

      it("should handle multiple jurisdiction checkboxes independently", async () => {
        document.body.innerHTML = `
          <input type="checkbox" name="jurisdiction" value="1" />
          <div class="sub-jurisdiction-section" data-parent-jurisdiction="1" style="display: none;"></div>
          <input type="checkbox" name="jurisdiction" value="2" />
          <div class="sub-jurisdiction-section" data-parent-jurisdiction="2" style="display: none;"></div>
        `;

        const { initFilterPanel } = await import("./filter-panel.js");
        initFilterPanel();

        const checkbox1 = document.querySelector('input[name="jurisdiction"][value="1"]') as HTMLInputElement;
        const subSection1 = document.querySelector('.sub-jurisdiction-section[data-parent-jurisdiction="1"]') as HTMLElement;
        const subSection2 = document.querySelector('.sub-jurisdiction-section[data-parent-jurisdiction="2"]') as HTMLElement;

        checkbox1.checked = true;
        checkbox1.dispatchEvent(new Event("change"));

        expect(subSection1.style.display).toBe("block");
        expect(subSection2.style.display).toBe("none");
      });
    });

    describe("collapsible filter sections", () => {
      it("should collapse section when toggle button is clicked", async () => {
        document.body.innerHTML = `
          <button class="filter-section-toggle" aria-expanded="true" aria-controls="test-section">
            <span class="filter-section-icon">−</span>
          </button>
          <div id="test-section" class="filter-section-content"></div>
        `;

        const { initFilterPanel } = await import("./filter-panel.js");
        initFilterPanel();

        const button = document.querySelector(".filter-section-toggle") as HTMLButtonElement;
        const content = document.getElementById("test-section") as HTMLElement;
        const icon = button.querySelector(".filter-section-icon") as HTMLElement;

        button.click();

        expect(button.getAttribute("aria-expanded")).toBe("false");
        expect(content.hasAttribute("hidden")).toBe(true);
        expect(icon.textContent).toBe("+");
      });

      it("should expand section when collapsed toggle button is clicked", async () => {
        document.body.innerHTML = `
          <button class="filter-section-toggle" aria-expanded="false" aria-controls="test-section">
            <span class="filter-section-icon">+</span>
          </button>
          <div id="test-section" class="filter-section-content" hidden></div>
        `;

        const { initFilterPanel } = await import("./filter-panel.js");
        initFilterPanel();

        const button = document.querySelector(".filter-section-toggle") as HTMLButtonElement;
        const content = document.getElementById("test-section") as HTMLElement;
        const icon = button.querySelector(".filter-section-icon") as HTMLElement;

        button.click();

        expect(button.getAttribute("aria-expanded")).toBe("true");
        expect(content.hasAttribute("hidden")).toBe(false);
        expect(icon.textContent).toBe("−");
      });

      it("should handle multiple collapsible sections independently", async () => {
        document.body.innerHTML = `
          <button class="filter-section-toggle" aria-expanded="true" aria-controls="section-1">
            <span class="filter-section-icon">−</span>
          </button>
          <div id="section-1" class="filter-section-content"></div>
          <button class="filter-section-toggle" aria-expanded="true" aria-controls="section-2">
            <span class="filter-section-icon">−</span>
          </button>
          <div id="section-2" class="filter-section-content"></div>
        `;

        const { initFilterPanel } = await import("./filter-panel.js");
        initFilterPanel();

        const buttons = document.querySelectorAll(".filter-section-toggle") as NodeListOf<HTMLButtonElement>;
        const content1 = document.getElementById("section-1") as HTMLElement;
        const content2 = document.getElementById("section-2") as HTMLElement;

        buttons[0].click();

        expect(buttons[0].getAttribute("aria-expanded")).toBe("false");
        expect(content1.hasAttribute("hidden")).toBe(true);
        expect(buttons[1].getAttribute("aria-expanded")).toBe("true");
        expect(content2.hasAttribute("hidden")).toBe(false);
      });

      it("should do nothing if aria-controls target does not exist", async () => {
        document.body.innerHTML = `
          <button class="filter-section-toggle" aria-expanded="true" aria-controls="non-existent">
            <span class="filter-section-icon">−</span>
          </button>
        `;

        const { initFilterPanel } = await import("./filter-panel.js");
        initFilterPanel();

        const button = document.querySelector(".filter-section-toggle") as HTMLButtonElement;

        // Should not throw error
        expect(() => button.click()).not.toThrow();
      });

      it("should do nothing if button has no aria-controls", async () => {
        document.body.innerHTML = `
          <button class="filter-section-toggle" aria-expanded="true">
            <span class="filter-section-icon">−</span>
          </button>
        `;

        const { initFilterPanel } = await import("./filter-panel.js");
        initFilterPanel();

        const button = document.querySelector(".filter-section-toggle") as HTMLButtonElement;

        // Should not throw error
        expect(() => button.click()).not.toThrow();
      });
    });

    describe("initialization", () => {
      it("should not throw error when no filter elements present", async () => {
        document.body.innerHTML = "<div></div>";

        const { initFilterPanel } = await import("./filter-panel.js");

        expect(() => initFilterPanel()).not.toThrow();
      });

      it("should handle empty DOM gracefully", async () => {
        document.body.innerHTML = "";

        const { initFilterPanel } = await import("./filter-panel.js");

        expect(() => initFilterPanel()).not.toThrow();
      });
    });
  });
});
