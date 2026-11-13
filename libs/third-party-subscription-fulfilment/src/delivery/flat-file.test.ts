import { downloadBlob } from "@hmcts/azure-blob";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadFlatFile } from "./flat-file.js";

vi.mock("@hmcts/azure-blob", () => ({
  CONTAINER: { ARTEFACT: "artefact" },
  downloadBlob: vi.fn()
}));

const ARTEFACT_ID = "artefact-1";

describe("loadFlatFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use the bare blob when present", async () => {
    // Arrange
    const buffer = Buffer.from("pdf-content");
    vi.mocked(downloadBlob).mockResolvedValueOnce(buffer);

    // Act
    const result = await loadFlatFile(ARTEFACT_ID, "upload.pdf");

    // Assert
    expect(result).toEqual({ buffer, fileName: "artefact-1.pdf" });
    expect(downloadBlob).toHaveBeenCalledTimes(1);
    expect(downloadBlob).toHaveBeenCalledWith(ARTEFACT_ID, "artefact");
  });

  it("should fall back to the blob named with the extension", async () => {
    // Arrange
    const buffer = Buffer.from("pdf-content");
    vi.mocked(downloadBlob).mockResolvedValueOnce(null).mockResolvedValueOnce(buffer);

    // Act
    const result = await loadFlatFile(ARTEFACT_ID, "upload.pdf");

    // Assert
    expect(result).toEqual({ buffer, fileName: "artefact-1.pdf" });
    expect(downloadBlob).toHaveBeenNthCalledWith(2, "artefact-1.pdf", "artefact");
  });

  it("should return null when neither blob exists", async () => {
    // Arrange
    vi.mocked(downloadBlob).mockResolvedValue(null);

    // Act
    const result = await loadFlatFile(ARTEFACT_ID, "upload.pdf");

    // Assert
    expect(result).toBeNull();
    expect(downloadBlob).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["null", null],
    ["extensionless", "upload"]
  ])("should name the file without an extension when sourceArtefactId is %s", async (_label, sourceArtefactId) => {
    // Arrange
    const buffer = Buffer.from("content");
    vi.mocked(downloadBlob).mockResolvedValueOnce(buffer);

    // Act
    const result = await loadFlatFile(ARTEFACT_ID, sourceArtefactId);

    // Assert
    expect(result).toEqual({ buffer, fileName: ARTEFACT_ID });
  });

  it("should not try a second blob when there is no extension", async () => {
    // Arrange
    vi.mocked(downloadBlob).mockResolvedValue(null);

    // Act
    const result = await loadFlatFile(ARTEFACT_ID, null);

    // Assert
    expect(result).toBeNull();
    expect(downloadBlob).toHaveBeenCalledTimes(1);
  });
});
