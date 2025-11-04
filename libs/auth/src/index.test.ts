import { describe, expect, it } from "vitest";
import * as authModule from "./index.js";

describe("auth module exports", () => {
  it("should export requireAuth function", () => {
    expect(authModule.requireAuth).toBeDefined();
    expect(typeof authModule.requireAuth).toBe("function");
  });

  it("should export requireRole function", () => {
    expect(authModule.requireRole).toBeDefined();
    expect(typeof authModule.requireRole).toBe("function");
  });

  it("should export authNavigationMiddleware function", () => {
    expect(authModule.authNavigationMiddleware).toBeDefined();
    expect(typeof authModule.authNavigationMiddleware).toBe("function");
  });

  it("should export configurePassport function", () => {
    expect(authModule.configurePassport).toBeDefined();
    expect(typeof authModule.configurePassport).toBe("function");
  });

  it("should export USER_ROLES constant", () => {
    expect(authModule.USER_ROLES).toBeDefined();
    expect(typeof authModule.USER_ROLES).toBe("object");
    expect(authModule.USER_ROLES.SYSTEM_ADMIN).toBeDefined();
    expect(authModule.USER_ROLES.INTERNAL_ADMIN_CTSC).toBeDefined();
    expect(authModule.USER_ROLES.INTERNAL_ADMIN_LOCAL).toBeDefined();
  });

  it("should have all expected exports", () => {
    const exports = Object.keys(authModule);
    expect(exports).toContain("requireAuth");
    expect(exports).toContain("requireRole");
    expect(exports).toContain("authNavigationMiddleware");
    expect(exports).toContain("configurePassport");
    expect(exports).toContain("USER_ROLES");
  });
});
