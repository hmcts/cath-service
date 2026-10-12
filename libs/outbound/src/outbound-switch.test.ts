import { afterEach, describe, expect, it, vi } from "vitest";
import { isOutboundEnabled } from "./outbound-switch.js";

describe("isOutboundEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return true when OUTBOUND_ENABLED is unset", () => {
    // Arrange
    vi.stubEnv("OUTBOUND_ENABLED", undefined);

    // Act
    const result = isOutboundEnabled();

    // Assert
    expect(result).toBe(true);
  });

  it("should return true when OUTBOUND_ENABLED is true", () => {
    // Arrange
    vi.stubEnv("OUTBOUND_ENABLED", "true");

    // Act
    const result = isOutboundEnabled();

    // Assert
    expect(result).toBe(true);
  });

  it.each(["", "FALSE", "0", "no"])("should return true when OUTBOUND_ENABLED is %j", (value) => {
    // Arrange
    vi.stubEnv("OUTBOUND_ENABLED", value);

    // Act
    const result = isOutboundEnabled();

    // Assert
    expect(result).toBe(true);
  });

  it("should return false when OUTBOUND_ENABLED is false", () => {
    // Arrange
    vi.stubEnv("OUTBOUND_ENABLED", "false");

    // Act
    const result = isOutboundEnabled();

    // Assert
    expect(result).toBe(false);
  });
});
