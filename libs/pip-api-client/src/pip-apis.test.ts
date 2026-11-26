import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getPipApiHostPatterns, getPipApiScope, isAllowedPipHost } from "./pip-apis.js";

const DATA_MANAGEMENT = "pip-data-management.staging.platform.hmcts.net";
const ACCOUNT_MANAGEMENT = "pip-account-management.staging.platform.hmcts.net";
const DATA_MANAGEMENT_URI = "api://781e9e74-a856-4dfc-b92a-9403a096a743";
const ACCOUNT_MANAGEMENT_URI = "api://1c55618e-1b35-475b-a321-bf890936ecfb";

const SCOPE_ENV = {
  PIP_DATA_MANAGEMENT_SCOPE: DATA_MANAGEMENT_URI,
  PIP_ACCOUNT_MANAGEMENT_SCOPE: ACCOUNT_MANAGEMENT_URI
};

describe("pip-apis", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ...SCOPE_ENV };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getPipApiScope", () => {
    it("should pick the scope from the host prefix", () => {
      // Act & Assert
      expect(getPipApiScope(DATA_MANAGEMENT)).toBe(DATA_MANAGEMENT_URI);
      expect(getPipApiScope(ACCOUNT_MANAGEMENT)).toBe(ACCOUNT_MANAGEMENT_URI);
    });

    it.each(["test", "demo", "sandbox"])("should accept the %s environment", (environment) => {
      // Act
      const result = getPipApiScope(`pip-data-management.${environment}.platform.hmcts.net`);

      // Assert
      expect(result).toBe(DATA_MANAGEMENT_URI);
    });

    it("should match the host case-insensitively and ignore a trailing dot", () => {
      // Act
      const result = getPipApiScope("PIP-Data-Management.Staging.Platform.HMCTS.net.");

      // Assert
      expect(result).toBe(DATA_MANAGEMENT_URI);
    });

    it("should return undefined when the API's scope is not set", () => {
      // Arrange
      delete process.env.PIP_ACCOUNT_MANAGEMENT_SCOPE;

      // Act
      const result = getPipApiScope(ACCOUNT_MANAGEMENT);

      // Assert
      expect(result).toBeUndefined();
    });

    it("should treat a whitespace-only scope as not set", () => {
      // Arrange
      process.env.PIP_DATA_MANAGEMENT_SCOPE = "   ";

      // Act
      const result = getPipApiScope(DATA_MANAGEMENT);

      // Assert
      expect(result).toBeUndefined();
    });

    it.each([
      ["another PIP API", "pip-publication-services.staging.platform.hmcts.net"],
      ["a host without an environment", "pip-data-management.platform.hmcts.net"],
      ["an environment with more than one label", "pip-data-management.evil.staging.platform.hmcts.net"],
      ["a look-alike prefix", "pip-data-management-evil.staging.platform.hmcts.net"],
      ["another domain", "pip-data-management.staging.platform.hmcts.net.evil.com"],
      ["a sub-domain in front", "api.pip-data-management.staging.platform.hmcts.net"],
      ["an unrelated host", "example.com"]
    ])("should return undefined for %s", (_description, host) => {
      // Act
      const result = getPipApiScope(host);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe("isAllowedPipHost", () => {
    it("should allow a PIP API host whose scope is set", () => {
      // Act & Assert
      expect(isAllowedPipHost(DATA_MANAGEMENT)).toBe(true);
    });

    it("should not allow a PIP API host whose scope is not set", () => {
      // Arrange
      delete process.env.PIP_DATA_MANAGEMENT_SCOPE;

      // Act & Assert
      expect(isAllowedPipHost(DATA_MANAGEMENT)).toBe(false);
    });
  });

  describe("getPipApiHostPatterns", () => {
    it("should list the host pattern of every API whose scope is set", () => {
      // Act
      const result = getPipApiHostPatterns();

      // Assert
      expect(result).toEqual(["pip-data-management.<environment>.platform.hmcts.net", "pip-account-management.<environment>.platform.hmcts.net"]);
    });

    it("should leave out an API whose scope is not set", () => {
      // Arrange
      delete process.env.PIP_DATA_MANAGEMENT_SCOPE;

      // Act
      const result = getPipApiHostPatterns();

      // Assert
      expect(result).toEqual(["pip-account-management.<environment>.platform.hmcts.net"]);
    });

    it("should return an empty list when no scope is set", () => {
      // Arrange
      delete process.env.PIP_DATA_MANAGEMENT_SCOPE;
      delete process.env.PIP_ACCOUNT_MANAGEMENT_SCOPE;

      // Act
      const result = getPipApiHostPatterns();

      // Assert
      expect(result).toEqual([]);
    });
  });
});
