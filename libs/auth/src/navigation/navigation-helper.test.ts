import { describe, expect, it } from "vitest";
import { USER_ROLES } from "../authorisation/role-service.js";
import { buildNavigationItems } from "./navigation-helper.js";

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
});
