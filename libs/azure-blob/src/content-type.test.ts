import { describe, expect, it } from "vitest";
import { getContentType } from "./content-type.js";

describe("getContentType", () => {
  it("should return application/pdf for .pdf", () => {
    expect(getContentType(".pdf")).toBe("application/pdf");
  });

  it("should return image/jpeg for .jpg", () => {
    expect(getContentType(".jpg")).toBe("image/jpeg");
  });

  it("should return image/jpeg for .jpeg", () => {
    expect(getContentType(".jpeg")).toBe("image/jpeg");
  });

  it("should return image/png for .png", () => {
    expect(getContentType(".png")).toBe("image/png");
  });

  it("should return application/octet-stream for unknown extension", () => {
    expect(getContentType(".tiff")).toBe("application/octet-stream");
  });

  it("should be case-insensitive", () => {
    expect(getContentType(".PDF")).toBe("application/pdf");
    expect(getContentType(".JPG")).toBe("image/jpeg");
  });
});
