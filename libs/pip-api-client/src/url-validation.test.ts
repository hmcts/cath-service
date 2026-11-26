import { describe, expect, it } from "vitest";
import { validatePipUrl } from "./url-validation.js";

const DATA_MANAGEMENT_HOST = "pip-data-management.staging.platform.hmcts.net";
const ALLOWED_HOSTS = [DATA_MANAGEMENT_HOST, "pip-account-management.staging.platform.hmcts.net"];
const isAllowedHost = (host: string) => ALLOWED_HOSTS.includes(host);

describe("validatePipUrl", () => {
  it("should accept an https URL on an allowed host", () => {
    // Act
    const result = validatePipUrl(`https://${DATA_MANAGEMENT_HOST}/locations/111`, isAllowedHost);

    // Assert
    expect(result.kind).toBe("valid");
    expect(result.kind === "valid" && result.url.toString()).toBe(`https://${DATA_MANAGEMENT_HOST}/locations/111`);
  });

  it("should accept any allowed host, so other PIP APIs can be checked", () => {
    // Act
    const result = validatePipUrl("https://pip-account-management.staging.platform.hmcts.net/account/1", isAllowedHost);

    // Assert
    expect(result.kind).toBe("valid");
  });

  it.each([
    ["an upper-case host", `https://${DATA_MANAGEMENT_HOST.toUpperCase()}/locations/1`],
    ["a trailing dot on the host", `https://${DATA_MANAGEMENT_HOST}./locations/1`],
    ["an explicit port 443", `https://${DATA_MANAGEMENT_HOST}:443/locations/1`],
    ["surrounding whitespace", `  https://${DATA_MANAGEMENT_HOST}/locations/1  `]
  ])("should accept %s", (_description, input) => {
    // Act
    const result = validatePipUrl(input, isAllowedHost);

    // Assert
    expect(result.kind).toBe("valid");
  });

  it.each([
    ["undefined", undefined],
    ["an empty string", ""],
    ["whitespace only", "   "],
    ["a non-string value", ["https://example.com"]]
  ])("should return required for %s", (_description, input) => {
    // Act
    const result = validatePipUrl(input, isAllowedHost);

    // Assert
    expect(result).toEqual({ kind: "invalid", error: "required" });
  });

  it("should return too-long when the URL is over 2,048 characters", () => {
    // Arrange
    const input = `https://${DATA_MANAGEMENT_HOST}/${"a".repeat(2048)}`;

    // Act
    const result = validatePipUrl(input, isAllowedHost);

    // Assert
    expect(result).toEqual({ kind: "invalid", error: "too-long" });
  });

  it.each([
    ["plain http", `http://${DATA_MANAGEMENT_HOST}/locations/1`],
    ["a username and password", `https://user:pass@${DATA_MANAGEMENT_HOST}/locations/1`],
    ["a username only", `https://user@${DATA_MANAGEMENT_HOST}/locations/1`],
    ["a javascript URL", "javascript:alert(1)"],
    ["a file URL", "file:///etc/passwd"],
    ["text that is not a URL", "not a url"],
    ["a path without a host", "/locations/1"]
  ])("should return invalid-format for %s", (_description, input) => {
    // Act
    const result = validatePipUrl(input, isAllowedHost);

    // Assert
    expect(result).toEqual({ kind: "invalid", error: "invalid-format" });
  });

  it.each([
    ["a host that is not on the list", "https://example.com/locations/1"],
    ["a look-alike host with the allowed host as a prefix", `https://${DATA_MANAGEMENT_HOST}.evil.com/locations/1`],
    ["a sub-domain of an allowed host", `https://api.${DATA_MANAGEMENT_HOST}/locations/1`],
    ["an allowed host hidden in a fragment", `https://evil.com#@${DATA_MANAGEMENT_HOST}/locations/1`],
    ["an allowed host on a different port", `https://${DATA_MANAGEMENT_HOST}:8443/locations/1`],
    ["the Azure instance metadata address", "https://169.254.169.254/metadata/instance"],
    ["localhost", "https://localhost/locations/1"]
  ])("should return host-not-allowed for %s", (_description, input) => {
    // Act
    const result = validatePipUrl(input, isAllowedHost);

    // Assert
    expect(result).toEqual({ kind: "invalid", error: "host-not-allowed" });
  });

  it("should reject every URL when no hosts are allowed", () => {
    // Act
    const result = validatePipUrl(`https://${DATA_MANAGEMENT_HOST}/locations/1`, () => false);

    // Assert
    expect(result).toEqual({ kind: "invalid", error: "host-not-allowed" });
  });
});
