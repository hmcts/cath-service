import { USER_ROLES } from "@hmcts/account";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as ssoConfigModule from "../config/sso-config.js";
import { determineSsoUserRole, hasRole, isRejectedCFTRole } from "./index.js";

vi.mock("../config/sso-config.js");

describe("Role Service", () => {
  const mockSsoConfig = {
    issuerUrl: "https://login.microsoftonline.com/test/v2.0",
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    redirectUri: "https://localhost:8080/sso/return",
    scope: ["openid", "profile", "email"],
    systemAdminGroupId: "00000000-0000-0000-0000-000000000001",
    internalAdminCtscGroupId: "00000000-0000-0000-0000-000000000002",
    internalAdminLocalGroupId: "00000000-0000-0000-0000-000000000003"
  };

  beforeEach(() => {
    vi.mocked(ssoConfigModule.getSsoConfig).mockReturnValue(mockSsoConfig);
  });

  describe("determineSsoUserRole", () => {
    it("should return SYSTEM_ADMIN when user is in system admin group", () => {
      const groupIds = [mockSsoConfig.systemAdminGroupId, "other-group-id"];
      const role = determineSsoUserRole(groupIds);

      expect(role).toBe(USER_ROLES.SYSTEM_ADMIN);
    });

    it("should return INTERNAL_ADMIN_CTSC when user is in CTSC admin group", () => {
      const groupIds = [mockSsoConfig.internalAdminCtscGroupId, "other-group-id"];
      const role = determineSsoUserRole(groupIds);

      expect(role).toBe(USER_ROLES.INTERNAL_ADMIN_CTSC);
    });

    it("should return INTERNAL_ADMIN_LOCAL when user is in local admin group", () => {
      const groupIds = [mockSsoConfig.internalAdminLocalGroupId, "other-group-id"];
      const role = determineSsoUserRole(groupIds);

      expect(role).toBe(USER_ROLES.INTERNAL_ADMIN_LOCAL);
    });

    it("should prioritize SYSTEM_ADMIN over other roles when user is in multiple groups", () => {
      const groupIds = [mockSsoConfig.internalAdminCtscGroupId, mockSsoConfig.systemAdminGroupId, mockSsoConfig.internalAdminLocalGroupId];
      const role = determineSsoUserRole(groupIds);

      expect(role).toBe(USER_ROLES.SYSTEM_ADMIN);
    });

    it("should return undefined when user has no matching groups", () => {
      const groupIds = ["other-group-id", "another-group-id"];
      const role = determineSsoUserRole(groupIds);

      expect(role).toBeUndefined();
    });

    it("should return undefined when groupIds is empty", () => {
      const role = determineSsoUserRole([]);

      expect(role).toBeUndefined();
    });

    it("should return undefined when groupIds is undefined", () => {
      const role = determineSsoUserRole(undefined);

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

  describe("isRejectedCFTRole", () => {
    it("should reject citizen role", () => {
      expect(isRejectedCFTRole(["citizen"])).toBe(true);
    });

    it("should reject citizen with suffix roles", () => {
      expect(isRejectedCFTRole(["citizen-pro"])).toBe(true);
      expect(isRejectedCFTRole(["citizen-basic"])).toBe(true);
      expect(isRejectedCFTRole(["citizen-advanced"])).toBe(true);
    });

    it("should reject letter-holder role", () => {
      expect(isRejectedCFTRole(["letter-holder"])).toBe(true);
    });

    it("should reject when citizen is among multiple roles", () => {
      expect(isRejectedCFTRole(["caseworker", "citizen", "admin"])).toBe(true);
    });

    it("should reject when letter-holder is among multiple roles", () => {
      expect(isRejectedCFTRole(["viewer", "letter-holder"])).toBe(true);
    });

    it("should accept caseworker role", () => {
      expect(isRejectedCFTRole(["caseworker"])).toBe(false);
    });

    it("should accept admin role", () => {
      expect(isRejectedCFTRole(["admin"])).toBe(false);
    });

    it("should accept multiple valid roles", () => {
      expect(isRejectedCFTRole(["caseworker", "admin", "viewer"])).toBe(false);
    });

    it("should accept empty roles array", () => {
      expect(isRejectedCFTRole([])).toBe(false);
    });

    it("should handle roles that contain citizen but dont match pattern", () => {
      expect(isRejectedCFTRole(["non-citizen"])).toBe(false);
      expect(isRejectedCFTRole(["citizenry"])).toBe(false);
    });

    it("should handle roles that contain letter-holder but dont match pattern", () => {
      expect(isRejectedCFTRole(["letter-holder-admin"])).toBe(false);
      expect(isRejectedCFTRole(["former-letter-holder"])).toBe(false);
    });

    it("should be case-sensitive", () => {
      expect(isRejectedCFTRole(["Citizen"])).toBe(false);
      expect(isRejectedCFTRole(["CITIZEN"])).toBe(false);
      expect(isRejectedCFTRole(["Letter-Holder"])).toBe(false);
    });
  });
});
