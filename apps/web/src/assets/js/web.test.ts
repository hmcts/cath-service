/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/cookie-manager", () => ({
  default: {
    init: vi.fn(),
    on: vi.fn()
  }
}));

vi.mock("./back-to-top.js", () => ({
  initBackToTop: vi.fn()
}));

vi.mock("./filter-panel.js", () => ({
  initFilterPanel: vi.fn()
}));

vi.mock("./search-autocomplete.js", () => ({
  initSearchAutocomplete: vi.fn(() => Promise.resolve())
}));

vi.mock("./table-search.js", () => ({
  initTableSearch: vi.fn()
}));

vi.mock("./list-type-sensitivity.js", () => ({
  initListTypeSensitivity: vi.fn()
}));

vi.mock("./sjp-filter-search.js", () => ({
  initSjpFilterSearch: vi.fn()
}));

vi.mock("./session-timeout.js", () => ({}));

vi.mock("./sortable-table.js", () => ({
  initSortableTable: vi.fn()
}));

vi.mock("govuk-frontend", () => ({
  initAll: vi.fn()
}));

describe("web.ts", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    beforeEach(async () => {
      vi.resetModules();
      await import("./web.js");
    });

    it("should initialize GOV.UK Frontend", async () => {
      const { initAll } = await import("govuk-frontend");
      expect(initAll).toHaveBeenCalled();
    });

    it("should initialize cookie manager with correct config", async () => {
      const { default: cookieManager } = await import("@hmcts/cookie-manager");
      expect(cookieManager.init).toHaveBeenCalledWith(
        expect.objectContaining({
          userPreferences: { cookieName: "cookie_policy" },
          cookieManifest: expect.arrayContaining([
            expect.objectContaining({ categoryName: "essential", optional: false }),
            expect.objectContaining({ categoryName: "analytics", optional: true }),
            expect.objectContaining({ categoryName: "preferences", optional: true })
          ])
        })
      );
    });

    it("should register a CookieBannerAction listener", async () => {
      const { default: cookieManager } = await import("@hmcts/cookie-manager");
      expect(cookieManager.on).toHaveBeenCalledWith("CookieBannerAction", expect.any(Function));
    });
  });

  describe("CookieBannerAction handler", () => {
    let cookieBannerHandler: (eventData: string | { action: string }) => void;

    beforeEach(async () => {
      vi.resetModules();
      await import("./web.js");
      const { default: cookieManager } = await import("@hmcts/cookie-manager");
      cookieBannerHandler = (cookieManager.on as ReturnType<typeof vi.fn>).mock.calls.find(([event]: [string]) => event === "CookieBannerAction")?.[1];
    });

    it("removes the banner when action is 'hide' passed as a string", () => {
      const banner = document.createElement("div");
      banner.className = "govuk-cookie-banner";
      document.body.appendChild(banner);

      cookieBannerHandler("hide");

      expect(document.querySelector(".govuk-cookie-banner")).toBeNull();
    });

    it("removes the banner when action is 'hide' passed as an object", () => {
      const banner = document.createElement("div");
      banner.className = "govuk-cookie-banner";
      document.body.appendChild(banner);

      cookieBannerHandler({ action: "hide" });

      expect(document.querySelector(".govuk-cookie-banner")).toBeNull();
    });

    it("does not throw when the banner element is absent", () => {
      expect(() => cookieBannerHandler("hide")).not.toThrow();
    });

    it("does not remove the banner for non-hide actions", () => {
      const banner = document.createElement("div");
      banner.className = "govuk-cookie-banner";
      document.body.appendChild(banner);

      cookieBannerHandler({ action: "accept" });

      expect(document.querySelector(".govuk-cookie-banner")).not.toBeNull();
    });
  });

  describe("pageshow handler (bfcache restore)", () => {
    let pageshowHandler: (event: { persisted: boolean }) => void;

    beforeEach(async () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");
      vi.resetModules();
      await import("./web.js");
      pageshowHandler = addEventListenerSpy.mock.calls.find(([event]) => event === "pageshow")?.[1] as (event: { persisted: boolean }) => void;
    });

    it("hides the banner when restored from bfcache with cookie_policy set", () => {
      vi.spyOn(document, "cookie", "get").mockReturnValue("cookie_policy=%7B%22analytics%22%3Atrue%7D");

      const banner = document.createElement("div");
      banner.className = "govuk-cookie-banner";
      document.body.appendChild(banner);

      pageshowHandler({ persisted: true });

      expect(banner.hidden).toBe(true);
    });

    it("does not hide the banner on a normal page load (not bfcache)", () => {
      vi.spyOn(document, "cookie", "get").mockReturnValue("cookie_policy=%7B%22analytics%22%3Atrue%7D");

      const banner = document.createElement("div");
      banner.className = "govuk-cookie-banner";
      document.body.appendChild(banner);

      pageshowHandler({ persisted: false });

      expect(banner.hidden).toBe(false);
    });

    it("does not hide the banner when cookie_policy is not set", () => {
      vi.spyOn(document, "cookie", "get").mockReturnValue("");

      const banner = document.createElement("div");
      banner.className = "govuk-cookie-banner";
      document.body.appendChild(banner);

      pageshowHandler({ persisted: true });

      expect(banner.hidden).toBe(false);
    });

    it("does not throw when no banner element exists during bfcache restore", () => {
      vi.spyOn(document, "cookie", "get").mockReturnValue("cookie_policy=%7B%22analytics%22%3Atrue%7D");

      expect(() => pageshowHandler({ persisted: true })).not.toThrow();
    });
  });
});
