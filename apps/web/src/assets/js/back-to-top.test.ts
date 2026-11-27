/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it } from "vitest";
import { focusTemporarily, initBackToTop } from "./back-to-top.js";

const PAGE = `
  <main id="main-content">
    <h1>Heading</h1>
    <a href="/first" id="first-link">First link</a>
    <p class="govuk-body app-back-to-top">
      <a href="#main-content" class="govuk-link app-back-to-top__link"><span aria-hidden="true">▴ </span>Back to top</a>
    </p>
  </main>
`;

function clickBackToTop(index = 0) {
  const link = document.querySelectorAll<HTMLAnchorElement>(".app-back-to-top__link")[index];
  const event = new MouseEvent("click", { bubbles: true, cancelable: true });
  link.dispatchEvent(event);
  return event;
}

describe("back-to-top", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("initBackToTop", () => {
    it("should move focus to the main content when the link is activated", () => {
      document.body.innerHTML = PAGE;
      initBackToTop();

      clickBackToTop();

      expect(document.activeElement?.id).toBe("main-content");
    });

    it("should not prevent the native fragment navigation", () => {
      document.body.innerHTML = PAGE;
      initBackToTop();

      const event = clickBackToTop();

      expect(event.defaultPrevented).toBe(false);
    });

    it("should give main a temporary tabindex and focused class that are removed on blur", () => {
      document.body.innerHTML = PAGE;
      initBackToTop();
      const main = document.getElementById("main-content") as HTMLElement;

      clickBackToTop();

      expect(main.getAttribute("tabindex")).toBe("-1");
      expect(main.classList.contains("app-back-to-top-focused")).toBe(true);

      (document.getElementById("first-link") as HTMLAnchorElement).focus();

      expect(main.hasAttribute("tabindex")).toBe(false);
      expect(main.classList.contains("app-back-to-top-focused")).toBe(false);
    });

    it("should attach a handler to every back to top link on the page", () => {
      document.body.innerHTML = `${PAGE}<a href="#main-content" class="app-back-to-top__link">Again</a>`;
      initBackToTop();

      clickBackToTop(1);

      expect(document.activeElement?.id).toBe("main-content");
    });

    it("should do nothing when the target does not exist", () => {
      document.body.innerHTML = '<a href="#missing" class="app-back-to-top__link">Back to top</a>';
      initBackToTop();

      expect(() => clickBackToTop()).not.toThrow();
      expect(document.activeElement).toBe(document.body);
    });

    it("should not throw when there are no back to top links", () => {
      document.body.innerHTML = "<div></div>";

      expect(() => initBackToTop()).not.toThrow();
    });
  });

  describe("focusTemporarily", () => {
    it("should keep an existing tabindex on the element", () => {
      document.body.innerHTML = '<div id="target" tabindex="0"></div><button id="other">Other</button>';
      const target = document.getElementById("target") as HTMLElement;

      focusTemporarily(target);
      (document.getElementById("other") as HTMLButtonElement).focus();

      expect(target.getAttribute("tabindex")).toBe("0");
      expect(target.classList.contains("app-back-to-top-focused")).toBe(false);
    });
  });
});
