import { describe, expect, it } from "vitest";
import { resolveContinuePath } from "./continue-path.js";

describe("resolveContinuePath", () => {
  describe("accepted paths", () => {
    it("should return a valid relative path", () => {
      expect(resolveContinuePath("/account-home", "VERIFIED")).toBe("/account-home");
    });

    it("should keep the query string", () => {
      expect(resolveContinuePath("/summary-of-publications?locationId=9&lng=cy", "VERIFIED")).toBe("/summary-of-publications?locationId=9&lng=cy");
    });

    it("should drop a fragment", () => {
      expect(resolveContinuePath("/subscription-management#top", "VERIFIED")).toBe("/subscription-management");
    });

    it("should accept a path exactly 2048 characters long", () => {
      const path = `/${"a".repeat(2047)}`;

      expect(resolveContinuePath(path, "VERIFIED")).toBe(path);
    });
  });

  describe("rejected paths", () => {
    it.each([
      ["a protocol-relative URL", "//evil.example"],
      ["an absolute https URL", "https://evil.example/path"],
      ["a javascript: URL", "javascript:alert(1)"],
      ["a backslash", "/\\evil.example"],
      ["a leading backslash", "\\\\evil.example"],
      ["a tab that the URL parser strips", "/\t/evil.example"],
      ["a dot segment that normalises to //", "/.//evil.example"],
      ["an encoded dot segment that normalises to //", "/%2e%2e//evil.example"],
      ["a relative path without a leading slash", "account-home"],
      ["the empty string", ""],
      ["/session-expiring", "/session-expiring?currentPath=/x"],
      ["/session-expired", "/session-expired?reSignInUrl=CFT"],
      ["/session-expired-logout", "/session-expired-logout?redirectType=CFT"],
      ["/logout", "/logout"],
      ["a path under /logout", "/logout/x"],
      ["a dot segment resolving to /logout", "/a/../logout"]
    ])("should fall back when given %s", (_description, raw) => {
      expect(resolveContinuePath(raw, "VERIFIED")).toBe("/account-home");
    });

    it("should fall back when the path is longer than 2048 characters", () => {
      expect(resolveContinuePath(`/${"a".repeat(2048)}`, "VERIFIED")).toBe("/account-home");
    });

    it.each([
      ["undefined", undefined],
      ["a number", 42],
      ["an array query value", ["/a", "/b"]],
      ["an object query value", { a: "/b" }]
    ])("should fall back when given %s", (_description, raw) => {
      expect(resolveContinuePath(raw, "VERIFIED")).toBe("/account-home");
    });

    it("should not treat /logout-help as /logout", () => {
      expect(resolveContinuePath("/logout-help", "VERIFIED")).toBe("/logout-help");
    });
  });

  describe("role fallbacks", () => {
    it("should fall back to /system-admin-dashboard for SYSTEM_ADMIN", () => {
      expect(resolveContinuePath("//evil.example", "SYSTEM_ADMIN")).toBe("/system-admin-dashboard");
    });

    it.each(["INTERNAL_ADMIN_CTSC", "INTERNAL_ADMIN_LOCAL"])("should fall back to /admin-dashboard for %s", (role) => {
      expect(resolveContinuePath("//evil.example", role)).toBe("/admin-dashboard");
    });

    it("should fall back to /account-home for a verified user", () => {
      expect(resolveContinuePath(undefined, "VERIFIED")).toBe("/account-home");
    });

    it("should fall back to /account-home when the role is undefined", () => {
      expect(resolveContinuePath(undefined, undefined)).toBe("/account-home");
    });
  });
});
