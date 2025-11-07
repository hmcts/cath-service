import { USER_ROLES } from "@hmcts/account";
import { describe, expect, it } from "vitest";
import { buildNavigationItems, buildVerifiedUserNavigation } from "./navigation-helper.js";

describe("buildNavigationItems", () => {
  describe("SYSTEM_ADMIN role", () => {
    it("should return both Dashboard and Admin Dashboard links", () => {
      const items = buildNavigationItems(USER_ROLES.SYSTEM_ADMIN, "/system-admin-dashboard");

      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({
        text: "Dashboard",
        href: "/system-admin-dashboard",
        current: true,
        attributes: {
          "data-test": "system-admin-dashboard-link"
        }
      });
      expect(items[1]).toEqual({
        text: "Admin Dashboard",
        href: "/admin-dashboard",
        current: false,
        attributes: {
          "data-test": "admin-dashboard-link"
        }
      });
    });

    it("should mark Admin Dashboard as current when on that page", () => {
      const items = buildNavigationItems(USER_ROLES.SYSTEM_ADMIN, "/admin-dashboard");

      expect(items).toHaveLength(2);
      expect(items[0].current).toBe(false);
      expect(items[1].current).toBe(true);
    });
  });

  describe("INTERNAL_ADMIN_CTSC role", () => {
    it("should return only Admin Dashboard link", () => {
      const items = buildNavigationItems(USER_ROLES.INTERNAL_ADMIN_CTSC, "/admin-dashboard");

      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({
        text: "Admin Dashboard",
        href: "/admin-dashboard",
        current: true,
        attributes: {
          "data-test": "admin-dashboard-link"
        }
      });
    });

    it("should mark Admin Dashboard as not current when on different page", () => {
      const items = buildNavigationItems(USER_ROLES.INTERNAL_ADMIN_CTSC, "/some-other-page");

      expect(items).toHaveLength(1);
      expect(items[0].current).toBe(false);
    });
  });

  describe("INTERNAL_ADMIN_LOCAL role", () => {
    it("should return only Admin Dashboard link", () => {
      const items = buildNavigationItems(USER_ROLES.INTERNAL_ADMIN_LOCAL, "/admin-dashboard");

      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({
        text: "Admin Dashboard",
        href: "/admin-dashboard",
        current: true,
        attributes: {
          "data-test": "admin-dashboard-link"
        }
      });
    });
  });

  describe("no role or unknown role", () => {
    it("should return empty array when role is undefined", () => {
      const items = buildNavigationItems(undefined, "/admin-dashboard");

      expect(items).toHaveLength(0);
    });

    it("should return empty array when role is unknown", () => {
      const items = buildNavigationItems("UNKNOWN_ROLE", "/admin-dashboard");

      expect(items).toHaveLength(0);
    });
  });

  describe("buildVerifiedUserNavigation", () => {
    it("should return Dashboard and Email subscriptions navigation items in English", () => {
      const items = buildVerifiedUserNavigation("/account-home", "en");

      expect(items).toHaveLength(2);
      expect(items[0].text).toBe("Dashboard");
      expect(items[0].href).toBe("/account-home");
      expect(items[0].current).toBe(true);
      expect(items[0].attributes?.["data-test"]).toBe("dashboard-link");

      expect(items[1].text).toBe("Email subscriptions");
      expect(items[1].href).toBe("/");
      expect(items[1].current).toBe(false);
      expect(items[1].attributes?.["data-test"]).toBe("email-subscriptions-link");
    });

    it("should return navigation items in Welsh when locale is cy", () => {
      const items = buildVerifiedUserNavigation("/account-home", "cy");

      expect(items).toHaveLength(2);
      expect(items[0].text).toBe("Dangosfwrdd");
      expect(items[1].text).toBe("Tanysgrifiadau e-bost");
    });

    it("should mark the correct item as current based on path", () => {
      const items = buildVerifiedUserNavigation("/", "en");

      expect(items[0].current).toBe(false);
      expect(items[1].current).toBe(true);
    });

    it("should default to English when locale is not provided", () => {
      const items = buildVerifiedUserNavigation("/account-home");

      expect(items[0].text).toBe("Dashboard");
      expect(items[1].text).toBe("Email subscriptions");
    });

    it("should have consistent attributes structure", () => {
      const items = buildVerifiedUserNavigation("/account-home", "en");

      expect(items[0].attributes).toHaveProperty("data-test");
      expect(items[1].attributes).toHaveProperty("data-test");
    });
  });
});
