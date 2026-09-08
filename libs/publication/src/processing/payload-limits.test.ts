import { describe, expect, it } from "vitest";
import { MAX_EXCEL_PAYLOAD_BYTES, MAX_PDF_PAYLOAD_BYTES, payloadSizeBytes } from "./payload-limits.js";

describe("payload-limits constants", () => {
  it("should expose the PDF gate as 2MB in bytes", () => {
    // Assert
    expect(MAX_PDF_PAYLOAD_BYTES).toBe(2 * 1024 * 1024);
  });

  it("should expose the Excel gate as 10MB in bytes", () => {
    // Assert
    expect(MAX_EXCEL_PAYLOAD_BYTES).toBe(10 * 1024 * 1024);
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
    // Arrange — "£" is 2 bytes in UTF-8, so it exceeds its character count
    const jsonData = { value: "£" };

    // Act
    const result = payloadSizeBytes(jsonData);

    // Assert
    expect(result).toBe(Buffer.byteLength(JSON.stringify(jsonData), "utf8"));
    expect(result).toBeGreaterThan(JSON.stringify(jsonData).length - 1);
  });

  it("should return a small size for an empty object", () => {
    // Act
    const result = payloadSizeBytes({});

    // Assert
    expect(result).toBe(2); // "{}"
  });

  it("should return a small size for an empty array", () => {
    // Act
    const result = payloadSizeBytes([]);

    // Assert
    expect(result).toBe(2); // "[]"
  });
});
