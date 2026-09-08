import { describe, expect, it } from "vitest";
import { MAX_SUMMARY_PAYLOAD_BYTES, payloadSizeBytes } from "./payload-limits.js";

describe("payload-limits constants", () => {
  it("should expose the summary gate as 256KB in bytes", () => {
    // Assert
    expect(MAX_SUMMARY_PAYLOAD_BYTES).toBe(256 * 1024);
  });
});

describe("payloadSizeBytes", () => {
  it("should return the UTF-8 byte length of the serialised payload", () => {
    // Arrange
    const jsonData = { value: "small" };
    const expected = Buffer.byteLength(JSON.stringify(jsonData), "utf8");

    // Act
    const result = payloadSizeBytes(jsonData);

    // Assert
    expect(result).toBe(expected);
  });

  it("should count multi-byte characters by their UTF-8 byte length", () => {
    // Arrange — "£" is 2 bytes in UTF-8
    const jsonData = { value: "£" };

    // Act
    const result = payloadSizeBytes(jsonData);

    // Assert
    expect(result).toBe(Buffer.byteLength(JSON.stringify(jsonData), "utf8"));
  });

  it("should return a small size for an empty object", () => {
    // Act
    const result = payloadSizeBytes({});

    // Assert
    expect(result).toBe(2); // "{}"
  });
});
