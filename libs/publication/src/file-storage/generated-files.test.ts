import { CONTAINER, downloadBlob, getBlobProperties } from "@hmcts/azure-blob";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatFileSize, GENERATED_FILE_TYPES, getGeneratedFile, getGeneratedFileAvailability, isGeneratedFileType } from "./generated-files.js";

vi.mock("@hmcts/azure-blob", () => ({
  downloadBlob: vi.fn(),
  getBlobProperties: vi.fn(),
  CONTAINER: { ARTEFACT: "artefact", FILES: "files", PUBLICATIONS: "publications" }
}));

const ARTEFACT_ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

function mockBlobSizes(sizes: { pdf?: number | null | Error; xlsx?: number | null | Error }) {
  vi.mocked(getBlobProperties).mockImplementation(async (blobName: string) => {
    const value = blobName.endsWith(".pdf") ? sizes.pdf : sizes.xlsx;
    if (value instanceof Error) throw value;
    return value === null || value === undefined ? null : { size: value };
  });
}

describe("generated-files", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("isGeneratedFileType", () => {
    it.each(["pdf", "xlsx"])("should accept %s", (value) => {
      // Act
      const result = isGeneratedFileType(value);

      // Assert
      expect(result).toBe(true);
    });

    it.each([undefined, null, "", "PDF", "json", "../x", "toString", "constructor", 1, ["pdf"]])("should reject %s", (value) => {
      // Act
      const result = isGeneratedFileType(value);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("getGeneratedFileAvailability", () => {
    it("should return both sizes when both files exist", async () => {
      // Arrange
      mockBlobSizes({ pdf: 2048, xlsx: 4096 });

      // Act
      const result = await getGeneratedFileAvailability(ARTEFACT_ID);

      // Assert
      expect(result).toEqual({ pdf: 2048, xlsx: 4096 });
      expect(getBlobProperties).toHaveBeenCalledWith(`${ARTEFACT_ID}.pdf`, CONTAINER.PUBLICATIONS);
      expect(getBlobProperties).toHaveBeenCalledWith(`${ARTEFACT_ID}.xlsx`, CONTAINER.PUBLICATIONS);
      expect(getBlobProperties).toHaveBeenCalledTimes(2);
    });

    it("should return only the PDF size when only the PDF exists", async () => {
      // Arrange
      mockBlobSizes({ pdf: 2048, xlsx: null });

      // Act
      const result = await getGeneratedFileAvailability(ARTEFACT_ID);

      // Assert
      expect(result).toEqual({ pdf: 2048, xlsx: null });
    });

    it("should return only the Excel size when only the Excel file exists", async () => {
      // Arrange
      mockBlobSizes({ pdf: null, xlsx: 4096 });

      // Act
      const result = await getGeneratedFileAvailability(ARTEFACT_ID);

      // Assert
      expect(result).toEqual({ pdf: null, xlsx: 4096 });
    });

    it("should return null for both when neither file exists", async () => {
      // Arrange
      mockBlobSizes({ pdf: null, xlsx: null });

      // Act
      const result = await getGeneratedFileAvailability(ARTEFACT_ID);

      // Assert
      expect(result).toEqual({ pdf: null, xlsx: null });
    });

    it("should treat a storage error as not available and still report the other file", async () => {
      // Arrange
      mockBlobSizes({ pdf: new Error("Storage unavailable"), xlsx: 4096 });

      // Act
      const result = await getGeneratedFileAvailability(ARTEFACT_ID);

      // Assert
      expect(result).toEqual({ pdf: null, xlsx: 4096 });
      expect(console.error).toHaveBeenCalledWith(`Failed to check generated pdf file for artefact ${ARTEFACT_ID}:`, "Storage unavailable");
    });

    it("should log a generic message when a non-Error value is thrown", async () => {
      // Arrange
      vi.mocked(getBlobProperties).mockRejectedValue("boom");

      // Act
      const result = await getGeneratedFileAvailability(ARTEFACT_ID);

      // Assert
      expect(result).toEqual({ pdf: null, xlsx: null });
      expect(console.error).toHaveBeenCalledWith(`Failed to check generated xlsx file for artefact ${ARTEFACT_ID}:`, "unknown error");
    });
  });

  describe("formatFileSize", () => {
    it.each([
      [0, "0.00KB"],
      [512, "0.50KB"],
      [123_340, "120.45KB"],
      [1024 * 1024 - 1, "1024.00KB"],
      [1024 * 1024, "1.00MB"],
      [5.5 * 1024 * 1024, "5.50MB"]
    ])("should format %d bytes as %s", (bytes, expected) => {
      // Act
      const result = formatFileSize(bytes);

      // Assert
      expect(result).toBe(expected);
    });
  });

  describe("getGeneratedFile", () => {
    it("should return the PDF buffer with the PDF content type", async () => {
      // Arrange
      const buffer = Buffer.from("%PDF-1.7");
      vi.mocked(downloadBlob).mockResolvedValue(buffer);

      // Act
      const result = await getGeneratedFile(ARTEFACT_ID, "pdf");

      // Assert
      expect(result).toEqual({ buffer, contentType: GENERATED_FILE_TYPES.pdf.contentType });
      expect(downloadBlob).toHaveBeenCalledWith(`${ARTEFACT_ID}.pdf`, CONTAINER.PUBLICATIONS);
    });

    it("should return the Excel buffer with the spreadsheet content type", async () => {
      // Arrange
      const buffer = Buffer.from("PK");
      vi.mocked(downloadBlob).mockResolvedValue(buffer);

      // Act
      const result = await getGeneratedFile(ARTEFACT_ID, "xlsx");

      // Assert
      expect(result).toEqual({ buffer, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      expect(downloadBlob).toHaveBeenCalledWith(`${ARTEFACT_ID}.xlsx`, CONTAINER.PUBLICATIONS);
    });

    it("should return null when the blob does not exist", async () => {
      // Arrange
      vi.mocked(downloadBlob).mockResolvedValue(null);

      // Act
      const result = await getGeneratedFile(ARTEFACT_ID, "pdf");

      // Assert
      expect(result).toBeNull();
    });

    it("should rethrow storage errors", async () => {
      // Arrange
      vi.mocked(downloadBlob).mockRejectedValue(new Error("Storage unavailable"));

      // Act & Assert
      await expect(getGeneratedFile(ARTEFACT_ID, "xlsx")).rejects.toThrow("Storage unavailable");
    });
  });
});
