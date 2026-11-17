import { describe, expect, it, vi } from "vitest";
import { buildFileMultipart } from "./multipart.js";

vi.mock("node:crypto", () => ({
  default: { randomBytes: vi.fn(() => Buffer.from("deadbeefdeadbeef", "hex")) }
}));

const BOUNDARY = "----FormBoundarydeadbeefdeadbeef";

describe("buildFileMultipart", () => {
  it("should set a multipart content type with the boundary", () => {
    // Arrange
    const buffer = Buffer.from("%PDF-1.4");

    // Act
    const body = buildFileMultipart(buffer, "artefact-1.pdf");

    // Assert
    expect(body.contentType).toBe(`multipart/form-data; boundary=${BOUNDARY}`);
  });

  it("should write a single file part with an octet-stream type, part length and the file bytes", () => {
    // Arrange
    const buffer = Buffer.from("%PDF-1.4 fake pdf content");

    // Act
    const body = buildFileMultipart(buffer, "artefact-1.pdf");

    // Assert
    const expectedHead = [
      `--${BOUNDARY}`,
      'Content-Disposition: form-data; name="file"; filename="artefact-1.pdf"',
      "Content-Type: application/octet-stream",
      `Content-Length: ${buffer.byteLength}`,
      "",
      ""
    ].join("\r\n");
    expect(body.buffer).toEqual(Buffer.concat([Buffer.from(expectedHead), buffer, Buffer.from(`\r\n--${BOUNDARY}--\r\n`)]));
  });

  it.each([
    { fileName: "hearing-list.xlsx", expected: "hearing-list.xlsx" },
    { fileName: "ABC123", expected: "ABC123" },
    { fileName: 'bad"name\r\n.csv', expected: "badname.csv" }
  ])("should use $expected as the filename when given $fileName", ({ fileName, expected }) => {
    // Arrange
    const buffer = Buffer.from("content");

    // Act
    const body = buildFileMultipart(buffer, fileName);

    // Assert
    const partHeaders = body.buffer.toString("binary").split("\r\n\r\n")[0];
    expect(partHeaders).toContain(`; filename="${expected}"\r\n`);
    expect(partHeaders.split("\r\n")).toHaveLength(4);
  });

  it("should preserve binary content byte for byte", () => {
    // Arrange
    const buffer = Buffer.from([0x00, 0xff, 0x0d, 0x0a, 0x80]);

    // Act
    const body = buildFileMultipart(buffer, "binary.dat");

    // Assert
    expect(body.buffer.includes(buffer)).toBe(true);
  });
});
