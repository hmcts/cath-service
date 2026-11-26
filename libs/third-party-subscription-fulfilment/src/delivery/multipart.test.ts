import { describe, expect, it } from "vitest";
import { buildMultipartBody } from "./multipart.js";

function boundaryOf(contentType: string): string {
  return contentType.replace("multipart/form-data; boundary=", "");
}

describe("buildMultipartBody", () => {
  it("should include the boundary in the content type", () => {
    // Act
    const { contentType } = buildMultipartBody([{ name: "metadata", contentType: "application/json", content: "{}" }]);

    // Assert
    expect(contentType).toMatch(/^multipart\/form-data; boundary=----CathFormBoundary[0-9a-f]{32}$/);
  });

  it("should write each part with its name and content type, and no filename when not set", () => {
    // Act
    const { body, contentType } = buildMultipartBody([
      { name: "metadata", contentType: "application/json", content: '{"publicationId":"a"}' },
      { name: "payload", contentType: "application/json", content: '{"court":"x"}' }
    ]);

    // Assert
    const boundary = boundaryOf(contentType);
    expect(body.toString("utf-8")).toBe(
      `--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n{"publicationId":"a"}\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="payload"\r\nContent-Type: application/json\r\n\r\n{"court":"x"}\r\n` +
        `--${boundary}--\r\n`
    );
  });

  it("should include the filename when set", () => {
    // Act
    const { body } = buildMultipartBody([{ name: "file", contentType: "application/pdf", content: Buffer.from("pdf"), fileName: "artefact-1.pdf" }]);

    // Assert
    expect(body.toString("utf-8")).toContain('Content-Disposition: form-data; name="file"; filename="artefact-1.pdf"\r\nContent-Type: application/pdf\r\n\r\n');
  });

  it("should preserve buffer content byte for byte", () => {
    // Arrange
    const binary = Buffer.from([0x00, 0xff, 0x10, 0x80, 0x0d, 0x0a, 0x7f]);

    // Act
    const { body, contentType } = buildMultipartBody([{ name: "file", contentType: "application/octet-stream", content: binary, fileName: "f" }]);

    // Assert
    const header = Buffer.from(
      `--${boundaryOf(contentType)}\r\nContent-Disposition: form-data; name="file"; filename="f"\r\nContent-Type: application/octet-stream\r\n\r\n`
    );
    expect(body.subarray(header.length, header.length + binary.length).equals(binary)).toBe(true);
  });

  it("should generate a different boundary per body", () => {
    // Act
    const first = buildMultipartBody([]);
    const second = buildMultipartBody([]);

    // Assert
    expect(first.contentType).not.toBe(second.contentType);
  });
});
