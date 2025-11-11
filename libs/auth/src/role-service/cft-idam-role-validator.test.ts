import { describe, expect, it } from "vitest";
import { isRejectedRole } from "./cft-idam-role-validator.js";

describe("CFT IDAM Role Validator", () => {
  describe("isRejectedRole", () => {
    it("should reject citizen role", () => {
      expect(isRejectedRole(["citizen"])).toBe(true);
    });

    it("should reject citizen with suffix roles", () => {
      expect(isRejectedRole(["citizen-pro"])).toBe(true);
      expect(isRejectedRole(["citizen-basic"])).toBe(true);
      expect(isRejectedRole(["citizen-advanced"])).toBe(true);
    });

    it("should reject letter-holder role", () => {
      expect(isRejectedRole(["letter-holder"])).toBe(true);
    });

    it("should reject when citizen is among multiple roles", () => {
      expect(isRejectedRole(["caseworker", "citizen", "admin"])).toBe(true);
    });

    it("should reject when letter-holder is among multiple roles", () => {
      expect(isRejectedRole(["viewer", "letter-holder"])).toBe(true);
    });

    it("should accept caseworker role", () => {
      expect(isRejectedRole(["caseworker"])).toBe(false);
    });

    it("should accept admin role", () => {
      expect(isRejectedRole(["admin"])).toBe(false);
    });

    it("should accept multiple valid roles", () => {
      expect(isRejectedRole(["caseworker", "admin", "viewer"])).toBe(false);
    });

    it("should accept empty roles array", () => {
      expect(isRejectedRole([])).toBe(false);
    });

    it("should handle roles that contain citizen but dont match pattern", () => {
      expect(isRejectedRole(["non-citizen"])).toBe(false);
      expect(isRejectedRole(["citizenry"])).toBe(false);
    });

    it("should handle roles that contain letter-holder but dont match pattern", () => {
      expect(isRejectedRole(["letter-holder-admin"])).toBe(false);
      expect(isRejectedRole(["former-letter-holder"])).toBe(false);
    });

    it("should be case-sensitive", () => {
      expect(isRejectedRole(["Citizen"])).toBe(false);
      expect(isRejectedRole(["CITIZEN"])).toBe(false);
      expect(isRejectedRole(["Letter-Holder"])).toBe(false);
    });
  });
});
