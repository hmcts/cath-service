import { describe, expect, it } from "vitest";
import { readMaskedPreview } from "./response-preview.js";

function jsonResponse(body: string, contentType = "application/json") {
  return new Response(body, { headers: { "Content-Type": contentType } });
}

describe("readMaskedPreview", () => {
  it("should mask string values and keep keys, numbers, booleans and null", async () => {
    // Arrange
    const response = jsonResponse('{"name":"Jane Doe","id":12,"active":true,"notes":null}');

    // Act
    const result = await readMaskedPreview(response);

    // Assert
    expect(result).toBe('{"name":"***","id":12,"active":true,"notes":null}');
  });

  it("should mask string values inside arrays", async () => {
    // Arrange
    const response = jsonResponse('["Jane Doe","John Smith"]');

    // Act
    const result = await readMaskedPreview(response);

    // Assert
    expect(result).toBe('["***","***"]');
  });

  it("should mask values containing escaped quotes", async () => {
    // Arrange
    const response = jsonResponse('{"name":"Jane \\"JD\\" Doe"}');

    // Act
    const result = await readMaskedPreview(response);

    // Assert
    expect(result).toBe('{"name":"***"}');
  });

  it("should collapse whitespace from pretty-printed JSON", async () => {
    // Arrange
    const response = jsonResponse('{\n  "name": "Jane Doe",\n  "id": 12\n}');

    // Act
    const result = await readMaskedPreview(response);

    // Assert
    expect(result).toBe('{ "name": "***", "id": 12 }');
  });

  it("should truncate the preview to 100 characters", async () => {
    // Arrange
    const items = Array.from({ length: 50 }, (_, index) => `{"id":${index}}`).join(",");
    const response = jsonResponse(`[${items}]`);

    // Act
    const result = await readMaskedPreview(response);

    // Assert
    expect(result).toHaveLength(101);
    expect(result?.endsWith("…")).toBe(true);
  });

  it("should mask a string value cut off at the read limit", async () => {
    // Arrange
    const response = jsonResponse(`{"name":"${"x".repeat(20_000)}"}`);

    // Act
    const result = await readMaskedPreview(response);

    // Assert
    expect(result).toBe('{"name":"***"');
  });

  it("should accept JSON content types with parameters and suffixes", async () => {
    // Arrange
    const response = jsonResponse('{"name":"Jane"}', "application/problem+json; charset=utf-8");

    // Act
    const result = await readMaskedPreview(response);

    // Assert
    expect(result).toBe('{"name":"***"}');
  });

  it("should return undefined for a non-JSON response", async () => {
    // Arrange
    const response = jsonResponse("<html>Jane Doe</html>", "text/html");

    // Act
    const result = await readMaskedPreview(response);

    // Assert
    expect(result).toBeUndefined();
  });

  it("should return undefined for an empty body", async () => {
    // Arrange
    const response = jsonResponse("");

    // Act
    const result = await readMaskedPreview(response);

    // Assert
    expect(result).toBeUndefined();
  });
});
