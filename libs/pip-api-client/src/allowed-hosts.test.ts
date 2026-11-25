import { afterEach, describe, expect, it } from "vitest";
import { getAllowedPipHosts } from "./allowed-hosts.js";

describe("getAllowedPipHosts", () => {
  const originalValue = process.env.PIP_API_ALLOWED_HOSTS;

  afterEach(() => {
    process.env.PIP_API_ALLOWED_HOSTS = originalValue;
  });

  it("should return an empty list when PIP_API_ALLOWED_HOSTS is not set", () => {
    // Arrange
    delete process.env.PIP_API_ALLOWED_HOSTS;

    // Act
    const result = getAllowedPipHosts();

    // Assert
    expect(result).toEqual([]);
  });

  it("should split a comma-separated list and trim each host", () => {
    // Arrange
    process.env.PIP_API_ALLOWED_HOSTS = " pip-data-management.staging.platform.hmcts.net , pip-account-management.staging.platform.hmcts.net";

    // Act
    const result = getAllowedPipHosts();

    // Assert
    expect(result).toEqual(["pip-data-management.staging.platform.hmcts.net", "pip-account-management.staging.platform.hmcts.net"]);
  });

  it("should lower-case hosts, strip a trailing dot, and drop empty and duplicate entries", () => {
    // Arrange
    process.env.PIP_API_ALLOWED_HOSTS = "PIP-Data-Management.Staging.Platform.HMCTS.net.,,pip-data-management.staging.platform.hmcts.net, ";

    // Act
    const result = getAllowedPipHosts();

    // Assert
    expect(result).toEqual(["pip-data-management.staging.platform.hmcts.net"]);
  });
});
