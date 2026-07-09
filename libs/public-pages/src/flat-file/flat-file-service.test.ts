import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFileForDownload, getFlatFileForDisplay } from "./flat-file-service.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    listType: {
      findUnique: vi.fn().mockResolvedValue({ id: 1, allowedProvenance: "MANUAL_UPLOAD", isNonStrategic: true })
    }
  }
}));

vi.mock("@hmcts/publication", () => ({
  getArtefactById: vi.fn(),
  getFileBuffer: vi.fn(),
  getFileExtension: vi.fn(),
  getContentType: vi.fn(),
  getFileName: vi.fn(),
  canAccessPublicationData: vi.fn().mockReturnValue(true)
}));

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn().mockResolvedValue({
    id: 123,
    name: "Test Court",
    welshName: "Llys Prawf"
  })
}));

vi.mock("@hmcts/system-admin-pages", () => ({
  findListTypeById: vi.fn().mockResolvedValue({
    id: 1,
    friendlyName: "Daily Cause List",
    welshFriendlyName: "Rhestr Achos Dyddiol"
  })
}));

import { prisma } from "@hmcts/postgres-prisma";
import { canAccessPublicationData, getArtefactById, getContentType, getFileBuffer, getFileExtension, getFileName } from "@hmcts/publication";

describe("flat-file-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(canAccessPublicationData).mockReturnValue(true);
    vi.mocked(prisma.listType.findUnique).mockResolvedValue({ id: 1, allowedProvenance: "MANUAL_UPLOAD", isNonStrategic: true } as any);
  });

  describe("getFlatFileForDisplay", () => {
    const mockArtefact = {
      artefactId: "c1baacc3-8280-43ae-8551-24080c0654f9",
      locationId: "123",
      listTypeId: 1,
      contentDate: new Date("2024-01-15"),
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: new Date("2020-01-01"),
      displayTo: new Date("2099-12-31"),
      isFlatFile: true,
      provenance: "MANUAL_UPLOAD",
      noMatch: false
    };

    it("should return success for valid flat file", async () => {
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(getFileBuffer).mockResolvedValue(Buffer.from("test"));
      vi.mocked(getFileExtension).mockResolvedValue(".pdf");

      const result = await getFlatFileForDisplay(mockArtefact.artefactId, mockArtefact.locationId);

      expect(result).toEqual({
        success: true,
        artefactId: mockArtefact.artefactId,
        courtName: "Test Court",
        listTypeName: "Daily Cause List",
        contentDate: mockArtefact.contentDate,
        language: mockArtefact.language,
        fileExtension: ".pdf"
      });
    });

    it("should return NOT_FOUND when artefact does not exist", async () => {
      vi.mocked(getArtefactById).mockResolvedValue(null);

      const result = await getFlatFileForDisplay("non-existent", "123");

      expect(result).toEqual({ error: "NOT_FOUND" });
    });

    it("should return LOCATION_MISMATCH when locationId does not match", async () => {
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);

      const result = await getFlatFileForDisplay(mockArtefact.artefactId, "wrong-location");

      expect(result).toEqual({ error: "LOCATION_MISMATCH" });
    });

    it("should return NOT_FLAT_FILE when artefact is not a flat file", async () => {
      vi.mocked(getArtefactById).mockResolvedValue({
        ...mockArtefact,
        isFlatFile: false
      });

      const result = await getFlatFileForDisplay(mockArtefact.artefactId, mockArtefact.locationId);

      expect(result).toEqual({ error: "NOT_FLAT_FILE" });
    });

    it("should return EXPIRED when before displayFrom date", async () => {
      vi.mocked(getArtefactById).mockResolvedValue({
        ...mockArtefact,
        displayFrom: new Date("2999-01-01"),
        displayTo: new Date("2999-12-31")
      });

      const result = await getFlatFileForDisplay(mockArtefact.artefactId, mockArtefact.locationId);

      expect(result).toEqual({ error: "EXPIRED" });
    });

    it("should return EXPIRED when after displayTo date", async () => {
      vi.mocked(getArtefactById).mockResolvedValue({
        ...mockArtefact,
        displayFrom: new Date("2020-01-01"),
        displayTo: new Date("2020-12-31")
      });

      const result = await getFlatFileForDisplay(mockArtefact.artefactId, mockArtefact.locationId);

      expect(result).toEqual({ error: "EXPIRED" });
    });

    it("should return FILE_NOT_FOUND when file does not exist in storage", async () => {
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(getFileBuffer).mockResolvedValue(null);

      const result = await getFlatFileForDisplay(mockArtefact.artefactId, mockArtefact.locationId);

      expect(result).toEqual({ error: "FILE_NOT_FOUND" });
    });

    it("should return ACCESS_DENIED when user is undefined and artefact is CLASSIFIED", async () => {
      // Arrange
      vi.mocked(getArtefactById).mockResolvedValue({ ...mockArtefact, sensitivity: "CLASSIFIED" });
      vi.mocked(canAccessPublicationData).mockReturnValue(false);

      // Act
      const result = await getFlatFileForDisplay(mockArtefact.artefactId, mockArtefact.locationId, "en", undefined);

      // Assert
      expect(result).toEqual({ error: "ACCESS_DENIED" });
      expect(canAccessPublicationData).toHaveBeenCalledWith(undefined, expect.objectContaining({ sensitivity: "CLASSIFIED" }), expect.any(Object));
    });

    it("should return ACCESS_DENIED when user is undefined and artefact is PRIVATE", async () => {
      // Arrange
      vi.mocked(getArtefactById).mockResolvedValue({ ...mockArtefact, sensitivity: "PRIVATE" });
      vi.mocked(canAccessPublicationData).mockReturnValue(false);

      // Act
      const result = await getFlatFileForDisplay(mockArtefact.artefactId, mockArtefact.locationId, "en", undefined);

      // Assert
      expect(result).toEqual({ error: "ACCESS_DENIED" });
    });

    it("should return file data when user is undefined and artefact is PUBLIC", async () => {
      // Arrange
      vi.mocked(getArtefactById).mockResolvedValue({ ...mockArtefact, sensitivity: "PUBLIC" });
      vi.mocked(canAccessPublicationData).mockReturnValue(true);
      vi.mocked(getFileBuffer).mockResolvedValue(Buffer.from("test"));
      vi.mocked(getFileExtension).mockResolvedValue(".pdf");

      // Act
      const result = await getFlatFileForDisplay(mockArtefact.artefactId, mockArtefact.locationId, "en", undefined);

      // Assert
      expect(result).toMatchObject({ success: true });
    });

    it("should return file data when verified user with matching provenance requests a CLASSIFIED artefact", async () => {
      // Arrange
      const verifiedUser = { role: "VERIFIED", provenance: "MANUAL_UPLOAD" } as any;
      vi.mocked(getArtefactById).mockResolvedValue({ ...mockArtefact, sensitivity: "CLASSIFIED" });
      vi.mocked(canAccessPublicationData).mockReturnValue(true);
      vi.mocked(getFileBuffer).mockResolvedValue(Buffer.from("classified content"));
      vi.mocked(getFileExtension).mockResolvedValue(".pdf");

      // Act
      const result = await getFlatFileForDisplay(mockArtefact.artefactId, mockArtefact.locationId, "en", verifiedUser);

      // Assert
      expect(result).toMatchObject({ success: true });
      expect(canAccessPublicationData).toHaveBeenCalledWith(verifiedUser, expect.objectContaining({ sensitivity: "CLASSIFIED" }), expect.any(Object));
    });
  });

  describe("getFileForDownload", () => {
    const mockArtefact = {
      artefactId: "c1baacc3-8280-43ae-8551-24080c0654f9",
      locationId: "123",
      listTypeId: 1,
      contentDate: new Date("2024-01-15"),
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: new Date("2020-01-01"),
      displayTo: new Date("2099-12-31"),
      isFlatFile: true,
      provenance: "MANUAL_UPLOAD",
      noMatch: false
    };

    it("should return file buffer and metadata for valid file", async () => {
      const mockBuffer = Buffer.from("test pdf content");
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(getFileBuffer).mockResolvedValue(mockBuffer);
      vi.mocked(getFileExtension).mockResolvedValue(".pdf");
      vi.mocked(getContentType).mockReturnValue("application/pdf");
      vi.mocked(getFileName).mockReturnValue(`${mockArtefact.artefactId}.pdf`);

      const result = await getFileForDownload(mockArtefact.artefactId);

      expect(result).toEqual({
        success: true,
        fileBuffer: mockBuffer,
        contentType: "application/pdf",
        fileName: `${mockArtefact.artefactId}.pdf`
      });
    });

    it("should return NOT_FOUND when artefact does not exist", async () => {
      vi.mocked(getArtefactById).mockResolvedValue(null);

      const result = await getFileForDownload("non-existent");

      expect(result).toEqual({ error: "NOT_FOUND" });
    });

    it("should return NOT_FLAT_FILE when artefact is not a flat file", async () => {
      vi.mocked(getArtefactById).mockResolvedValue({
        ...mockArtefact,
        isFlatFile: false
      });

      const result = await getFileForDownload(mockArtefact.artefactId);

      expect(result).toEqual({ error: "NOT_FLAT_FILE" });
    });

    it("should return EXPIRED when file display period has expired", async () => {
      vi.mocked(getArtefactById).mockResolvedValue({
        ...mockArtefact,
        displayFrom: new Date("2020-01-01"),
        displayTo: new Date("2020-12-31")
      });

      const result = await getFileForDownload(mockArtefact.artefactId);

      expect(result).toEqual({ error: "EXPIRED" });
    });

    it("should return FILE_NOT_FOUND when file does not exist in storage", async () => {
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(getFileBuffer).mockResolvedValue(null);

      const result = await getFileForDownload(mockArtefact.artefactId);

      expect(result).toEqual({ error: "FILE_NOT_FOUND" });
    });

    it("should return ACCESS_DENIED when user is undefined and artefact is CLASSIFIED", async () => {
      // Arrange
      vi.mocked(getArtefactById).mockResolvedValue({ ...mockArtefact, sensitivity: "CLASSIFIED" });
      vi.mocked(canAccessPublicationData).mockReturnValue(false);

      // Act
      const result = await getFileForDownload(mockArtefact.artefactId, undefined);

      // Assert
      expect(result).toEqual({ error: "ACCESS_DENIED" });
      expect(canAccessPublicationData).toHaveBeenCalledWith(undefined, expect.objectContaining({ sensitivity: "CLASSIFIED" }), expect.any(Object));
    });

    it("should return ACCESS_DENIED when user is undefined and artefact is PRIVATE", async () => {
      // Arrange
      vi.mocked(getArtefactById).mockResolvedValue({ ...mockArtefact, sensitivity: "PRIVATE" });
      vi.mocked(canAccessPublicationData).mockReturnValue(false);

      // Act
      const result = await getFileForDownload(mockArtefact.artefactId, undefined);

      // Assert
      expect(result).toEqual({ error: "ACCESS_DENIED" });
    });

    it("should return file data when verified user with matching provenance requests a CLASSIFIED artefact", async () => {
      // Arrange
      const verifiedUser = { role: "VERIFIED", provenance: "MANUAL_UPLOAD" } as any;
      const mockBuffer = Buffer.from("classified content");
      vi.mocked(getArtefactById).mockResolvedValue({ ...mockArtefact, sensitivity: "CLASSIFIED" });
      vi.mocked(canAccessPublicationData).mockReturnValue(true);
      vi.mocked(getFileBuffer).mockResolvedValue(mockBuffer);
      vi.mocked(getFileExtension).mockResolvedValue(".pdf");
      vi.mocked(getContentType).mockReturnValue("application/pdf");
      vi.mocked(getFileName).mockReturnValue(`${mockArtefact.artefactId}.pdf`);

      // Act
      const result = await getFileForDownload(mockArtefact.artefactId, verifiedUser);

      // Assert
      expect(result).toMatchObject({ success: true });
      expect(canAccessPublicationData).toHaveBeenCalledWith(verifiedUser, expect.objectContaining({ sensitivity: "CLASSIFIED" }), expect.any(Object));
    });
  });
});
