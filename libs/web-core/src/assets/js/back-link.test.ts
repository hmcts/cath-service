/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("back-link", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    // Mock history.back
    vi.spyOn(window.history, "back").mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  describe("initBackLink", () => {
    it("should call history.back when back link with href='#' is clicked", async () => {
      document.body.innerHTML = `
        <a href="#" class="govuk-back-link">Back</a>
      `;

      const { initBackLink } = await import("./back-link.js");
      initBackLink();

      const backLink = document.querySelector(".govuk-back-link") as HTMLAnchorElement;
      backLink.click();

      expect(window.history.back).toHaveBeenCalled();
    });

    it("should prevent default link behavior when back link is clicked", async () => {
      document.body.innerHTML = `
        <a href="#" class="govuk-back-link">Back</a>
      `;

      const { initBackLink } = await import("./back-link.js");
      initBackLink();

      const backLink = document.querySelector(".govuk-back-link") as HTMLAnchorElement;
      const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true
      });

      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      backLink.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("should stop event propagation when back link is clicked", async () => {
      document.body.innerHTML = `
        <div id="parent">
          <a href="#" class="govuk-back-link">Back</a>
        </div>
      `;

      const { initBackLink } = await import("./back-link.js");
      initBackLink();

      const parent = document.getElementById("parent") as HTMLElement;
      const backLink = document.querySelector(".govuk-back-link") as HTMLAnchorElement;

      const parentClickHandler = vi.fn();
      parent.addEventListener("click", parentClickHandler);

      const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true
      });

      const stopPropagationSpy = vi.spyOn(event, "stopPropagation");
      const stopImmediatePropagationSpy = vi.spyOn(event, "stopImmediatePropagation");

      backLink.dispatchEvent(event);

      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(stopImmediatePropagationSpy).toHaveBeenCalled();
    });

    it("should not attach handler if back link has regular href", async () => {
      document.body.innerHTML = `
        <a href="/some-page" class="govuk-back-link">Back</a>
      `;

      const { initBackLink } = await import("./back-link.js");
      initBackLink();

      const backLink = document.querySelector(".govuk-back-link") as HTMLAnchorElement;
      backLink.click();

      expect(window.history.back).not.toHaveBeenCalled();
    });

    it("should not throw error if no back link exists", async () => {
      document.body.innerHTML = "<div></div>";

      const { initBackLink } = await import("./back-link.js");

      expect(() => initBackLink()).not.toThrow();
    });

    it("should not throw error on empty DOM", async () => {
      document.body.innerHTML = "";

      const { initBackLink } = await import("./back-link.js");

      expect(() => initBackLink()).not.toThrow();
    });

    it("should only attach handler to first back link if multiple exist", async () => {
      document.body.innerHTML = `
        <a href="#" class="govuk-back-link">Back 1</a>
        <a href="#" class="govuk-back-link">Back 2</a>
      `;

      const { initBackLink } = await import("./back-link.js");
      initBackLink();

      const backLinks = document.querySelectorAll(".govuk-back-link") as NodeListOf<HTMLAnchorElement>;

      // Click first link
      backLinks[0].click();
      expect(window.history.back).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();

      // Click second link - should not call history.back because handler only attached to first
      backLinks[1].click();
      expect(window.history.back).not.toHaveBeenCalled();
    });

    it("should handle back link with href='#' but no text content", async () => {
      document.body.innerHTML = `
        <a href="#" class="govuk-back-link"></a>
      `;

      const { initBackLink } = await import("./back-link.js");
      initBackLink();

      const backLink = document.querySelector(".govuk-back-link") as HTMLAnchorElement;
      backLink.click();

      expect(window.history.back).toHaveBeenCalled();
    });

    it("should not attach handler if href is empty string", async () => {
      document.body.innerHTML = `
        <a href="" class="govuk-back-link">Back</a>
      `;

      const { initBackLink } = await import("./back-link.js");
      initBackLink();

      const backLink = document.querySelector(".govuk-back-link") as HTMLAnchorElement;
      backLink.click();

      expect(window.history.back).not.toHaveBeenCalled();
    });

    it("should not attach handler if element is not an anchor tag", async () => {
      document.body.innerHTML = `
        <button class="govuk-back-link">Back</button>
      `;

      const { initBackLink } = await import("./back-link.js");
      initBackLink();

      const backLink = document.querySelector(".govuk-back-link") as HTMLButtonElement;
      backLink.click();

      expect(window.history.back).not.toHaveBeenCalled();
    });
  });
});
