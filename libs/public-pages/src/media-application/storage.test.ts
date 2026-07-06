import { CONTAINER, uploadBlob } from "@hmcts/azure-blob";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveIdProofFile } from "./storage.js";

vi.mock("@hmcts/azure-blob", () => ({
  uploadBlob: vi.fn().mockResolvedValue(undefined),
  CONTAINER: { FILES: "files", ARTEFACT: "artefact", PUBLICATIONS: "publications" }
}));

describe("saveIdProofFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should upload PDF and return blob key", async () => {
    // Arrange
    const buffer = Buffer.from("pdf-content");

    // Act
    const result = await saveIdProofFile("app-123", "passport.pdf", buffer);

    // Assert
    expect(result).toBe("app-123.pdf");
    expect(uploadBlob).toHaveBeenCalledWith("app-123.pdf", buffer, "application/pdf", CONTAINER.FILES);
  });

  it("should upload JPG and return blob key", async () => {
    // Arrange
    const buffer = Buffer.from("jpg-content");

    // Act
    const result = await saveIdProofFile("app-456", "photo.jpg", buffer);

    // Assert
    expect(result).toBe("app-456.jpg");
    expect(uploadBlob).toHaveBeenCalledWith("app-456.jpg", buffer, "image/jpeg", CONTAINER.FILES);
  });

  it("should upload JPEG and return blob key", async () => {
    // Arrange
    const buffer = Buffer.from("jpeg-content");

    // Act
    const result = await saveIdProofFile("app-789", "photo.JPEG", buffer);

    // Assert
    expect(result).toBe("app-789.jpeg");
    expect(uploadBlob).toHaveBeenCalledWith("app-789.jpeg", buffer, "image/jpeg", CONTAINER.FILES);
  });

  it("should upload PNG and return blob key", async () => {
    // Arrange
    const buffer = Buffer.from("png-content");

    // Act
    const result = await saveIdProofFile("app-abc", "id.png", buffer);

    // Assert
    expect(result).toBe("app-abc.png");
    expect(uploadBlob).toHaveBeenCalledWith("app-abc.png", buffer, "image/png", CONTAINER.FILES);
  });

  it("should use octet-stream for unknown extension", async () => {
    // Arrange
    const buffer = Buffer.from("data");

    // Act
    const result = await saveIdProofFile("app-xyz", "doc.tiff", buffer);

    // Assert
    expect(result).toBe("app-xyz.tiff");
    expect(uploadBlob).toHaveBeenCalledWith("app-xyz.tiff", buffer, "application/octet-stream", CONTAINER.FILES);
  });

  it("should use octet-stream and omit extension when originalName has no extension", async () => {
    // Arrange
    const buffer = Buffer.from("data");

    // Act
    const result = await saveIdProofFile("app-noext", "", buffer);

    // Assert
    expect(result).toBe("app-noext");
    expect(uploadBlob).toHaveBeenCalledWith("app-noext", buffer, "application/octet-stream", CONTAINER.FILES);
  });
});
