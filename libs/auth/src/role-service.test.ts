import { beforeEach, describe, expect, it, vi } from "vitest";
import { determineUserRole, hasRole, USER_ROLES } from "./role-service.js";
import * as ssoConfigModule from "./sso-config.js";

vi.mock("./sso-config.js");

describe("Role Service", () => {
  const mockSsoConfig = {
    identityMetadata: "https://login.microsoftonline.com/test/v2.0/.well-known/openid-configuration",
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    redirectUri: "http://localhost:8080/sso/return",
    allowHttpForRedirectUrl: true,
    responseType: "code" as const,
    responseMode: "query" as const,
    scope: ["openid", "profile", "email"],
    systemAdminGroupId: "00000000-0000-0000-0000-000000000001",
    internalAdminCtscGroupId: "00000000-0000-0000-0000-000000000002",
    internalAdminLocalGroupId: "00000000-0000-0000-0000-000000000003"
  };

  beforeEach(() => {
    vi.mocked(ssoConfigModule.getSsoConfig).mockReturnValue(mockSsoConfig);
  });

  describe("determineUserRole", () => {
    it("should return SYSTEM_ADMIN when user is in system admin group", () => {
      const groupIds = [mockSsoConfig.systemAdminGroupId, "other-group-id"];
      const role = determineUserRole(groupIds);

      expect(role).toBe(USER_ROLES.SYSTEM_ADMIN);
    });

    it("should return INTERNAL_ADMIN_CTSC when user is in CTSC admin group", () => {
      const groupIds = [mockSsoConfig.internalAdminCtscGroupId, "other-group-id"];
      const role = determineUserRole(groupIds);

      expect(role).toBe(USER_ROLES.INTERNAL_ADMIN_CTSC);
    });

    it("should return INTERNAL_ADMIN_LOCAL when user is in local admin group", () => {
      const groupIds = [mockSsoConfig.internalAdminLocalGroupId, "other-group-id"];
      const role = determineUserRole(groupIds);

      expect(role).toBe(USER_ROLES.INTERNAL_ADMIN_LOCAL);
    });

    it("should prioritize SYSTEM_ADMIN over other roles when user is in multiple groups", () => {
      const groupIds = [mockSsoConfig.internalAdminCtscGroupId, mockSsoConfig.systemAdminGroupId, mockSsoConfig.internalAdminLocalGroupId];
      const role = determineUserRole(groupIds);

      expect(role).toBe(USER_ROLES.SYSTEM_ADMIN);
    });

    it("should return undefined when user has no matching groups", () => {
      const groupIds = ["other-group-id", "another-group-id"];
      const role = determineUserRole(groupIds);

      expect(role).toBeUndefined();
    });

    it("should return undefined when groupIds is empty", () => {
      const role = determineUserRole([]);

      expect(role).toBeUndefined();
    });

    it("should return undefined when groupIds is undefined", () => {
      const role = determineUserRole(undefined);

      expect(role).toBeUndefined();
    });
  });

  describe("hasRole", () => {
    it("should return true when user has one of the allowed roles", () => {
      const userRole = USER_ROLES.SYSTEM_ADMIN;
      const allowedRoles = [USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC];

      expect(hasRole(userRole, allowedRoles)).toBe(true);
    });

    it("should return false when user does not have any of the allowed roles", () => {
      const userRole = USER_ROLES.INTERNAL_ADMIN_LOCAL;
      const allowedRoles = [USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC];

      expect(hasRole(userRole, allowedRoles)).toBe(false);
    });

    it("should return false when user role is undefined", () => {
      const allowedRoles = [USER_ROLES.SYSTEM_ADMIN];

      expect(hasRole(undefined, allowedRoles)).toBe(false);
    });

    it("should return false when allowed roles is empty", () => {
      const userRole = USER_ROLES.SYSTEM_ADMIN;

      expect(hasRole(userRole, [])).toBe(false);
    });
  });
});
