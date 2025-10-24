/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("back-to-top", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    // Mock window.scrollTo
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  describe("initBackToTop", () => {
    it("should scroll to top when back-to-top link is clicked", async () => {
      document.body.innerHTML = `
        <a href="#" class="back-to-top-link">Back to top</a>
      `;

      const { initBackToTop } = await import("./back-to-top.js");
      initBackToTop();

      const backToTopLink = document.querySelector(".back-to-top-link") as HTMLAnchorElement;
      backToTopLink.click();

      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 0,
        behavior: "smooth"
      });
    });

    it("should prevent default link behavior when back-to-top link is clicked", async () => {
      document.body.innerHTML = `
        <a href="#" class="back-to-top-link">Back to top</a>
      `;

      const { initBackToTop } = await import("./back-to-top.js");
      initBackToTop();

      const backToTopLink = document.querySelector(".back-to-top-link") as HTMLAnchorElement;
      const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true
      });

      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      backToTopLink.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("should not throw error if no back-to-top link exists", async () => {
      document.body.innerHTML = "<div></div>";

      const { initBackToTop } = await import("./back-to-top.js");

      expect(() => initBackToTop()).not.toThrow();
    });

    it("should not throw error on empty DOM", async () => {
      document.body.innerHTML = "";

      const { initBackToTop } = await import("./back-to-top.js");

      expect(() => initBackToTop()).not.toThrow();
    });

    it("should handle back-to-top link with nested span element", async () => {
      document.body.innerHTML = `
        <a href="#" class="back-to-top-link">
          <span aria-hidden="true">▴ </span>Back to top
        </a>
      `;

      const { initBackToTop } = await import("./back-to-top.js");
      initBackToTop();

      const backToTopLink = document.querySelector(".back-to-top-link") as HTMLAnchorElement;
      backToTopLink.click();

      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 0,
        behavior: "smooth"
      });
    });

    it("should only attach handler to first back-to-top link if multiple exist", async () => {
      document.body.innerHTML = `
        <a href="#" class="back-to-top-link">Back to top 1</a>
        <a href="#" class="back-to-top-link">Back to top 2</a>
      `;

      const { initBackToTop } = await import("./back-to-top.js");
      initBackToTop();

      const backToTopLinks = document.querySelectorAll(".back-to-top-link") as NodeListOf<HTMLAnchorElement>;

      // Click first link
      backToTopLinks[0].click();
      expect(window.scrollTo).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();

      // Click second link - should not call scrollTo because handler only attached to first
      backToTopLinks[1].click();
      expect(window.scrollTo).not.toHaveBeenCalled();
    });

    it("should handle back-to-top link without text content", async () => {
      document.body.innerHTML = `
        <a href="#" class="back-to-top-link"></a>
      `;

      const { initBackToTop } = await import("./back-to-top.js");
      initBackToTop();

      const backToTopLink = document.querySelector(".back-to-top-link") as HTMLAnchorElement;
      backToTopLink.click();

      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 0,
        behavior: "smooth"
      });
    });

    it("should call scrollTo with smooth behavior", async () => {
      document.body.innerHTML = `
        <a href="#" class="back-to-top-link">Back to top</a>
      `;

      const { initBackToTop } = await import("./back-to-top.js");
      initBackToTop();

      const backToTopLink = document.querySelector(".back-to-top-link") as HTMLAnchorElement;
      backToTopLink.click();

      expect(window.scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({
          behavior: "smooth"
        })
      );
    });

    it("should scroll to top position 0", async () => {
      document.body.innerHTML = `
        <a href="#" class="back-to-top-link">Back to top</a>
      `;

      const { initBackToTop } = await import("./back-to-top.js");
      initBackToTop();

      const backToTopLink = document.querySelector(".back-to-top-link") as HTMLAnchorElement;
      backToTopLink.click();

      expect(window.scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({
          top: 0
        })
      );
    });
  });
});
