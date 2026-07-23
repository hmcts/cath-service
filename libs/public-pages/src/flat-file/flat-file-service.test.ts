import { beforeEach, describe, expect, it, vi } from "vitest";
import { getExcelForDownload, getFileForDownload, getFlatFileForDisplay } from "./flat-file-service.js";

vi.mock("@hmcts/azure-blob", () => ({
  CONTAINER: { PUBLICATIONS: "publications", ARTEFACT: "artefact" },
  downloadBlob: vi.fn()
}));

vi.mock("@hmcts/publication", () => ({
  getArtefactById: vi.fn(),
  getFileBuffer: vi.fn(),
  getFileExtension: vi.fn(),
  getSourceArtefactId: vi.fn(),
  getContentType: vi.fn(),
  getFileName: vi.fn(),
  canAccessPublicationData: vi.fn().mockReturnValue(true),
  resolveListType: vi.fn().mockResolvedValue({ id: 1, provenance: "CFT_IDAM", isNonStrategic: true })
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

import { downloadBlob } from "@hmcts/azure-blob";
import {
  canAccessPublicationData,
  getArtefactById,
  getContentType,
  getFileBuffer,
  getFileExtension,
  getFileName,
  getSourceArtefactId
} from "@hmcts/publication";

describe("flat-file-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(canAccessPublicationData).mockReturnValue(true);
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
      // Arrange
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(getFileBuffer).mockResolvedValue(Buffer.from("test"));
      vi.mocked(getSourceArtefactId).mockResolvedValue("civil-daily-cause-list.pdf");

      // Act
      const result = await getFlatFileForDisplay(mockArtefact.artefactId, mockArtefact.locationId);

      // Assert
      expect(result).toEqual({
        success: true,
        artefactId: mockArtefact.artefactId,
        courtName: "Test Court",
        listTypeName: "Daily Cause List",
        contentDate: mockArtefact.contentDate,
        language: mockArtefact.language,
        sourceArtefactId: "civil-daily-cause-list.pdf"
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
      // Arrange
      const mockBuffer = Buffer.from("test pdf content");
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact);
      vi.mocked(getFileBuffer).mockResolvedValue(mockBuffer);
      vi.mocked(getSourceArtefactId).mockResolvedValue("civil-daily-cause-list.pdf");
      vi.mocked(getContentType).mockReturnValue("application/pdf");
      vi.mocked(getFileName).mockReturnValue("civil-daily-cause-list.pdf");

      // Act
      const result = await getFileForDownload(mockArtefact.artefactId);

      // Assert
      expect(result).toEqual({
        success: true,
        fileBuffer: mockBuffer,
        contentType: "application/pdf",
        fileName: "civil-daily-cause-list.pdf"
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

  describe("getExcelForDownload", () => {
    const artefactId = "c1baacc3-8280-43ae-8551-24080c0654f9";
    const mockArtefact = {
      artefactId,
      locationId: "123",
      listTypeId: 1,
      contentDate: new Date("2024-01-15"),
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: new Date("2020-01-01"),
      displayTo: new Date("2099-12-31"),
      isFlatFile: false,
      provenance: "MANUAL_UPLOAD",
      noMatch: false
    };

    it("should return file buffer and xlsx metadata when excel file exists", async () => {
      const mockBuffer = Buffer.from("xlsx content");
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(downloadBlob).mockResolvedValue(mockBuffer);

      const result = await getExcelForDownload(artefactId);

      expect(downloadBlob).toHaveBeenCalledWith(`${artefactId}.xlsx`, "publications");
      expect(result).toEqual({
        success: true,
        fileBuffer: mockBuffer,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileName: `${artefactId}.xlsx`
      });
    });

    it("should return NOT_FOUND when artefact does not exist", async () => {
      vi.mocked(getArtefactById).mockResolvedValue(null);

      const result = await getExcelForDownload(artefactId);

      expect(result).toEqual({ error: "NOT_FOUND" });
    });

    it("should return EXPIRED when artefact is outside display window", async () => {
      vi.mocked(getArtefactById).mockResolvedValue({
        ...mockArtefact,
        displayFrom: new Date("2020-01-01"),
        displayTo: new Date("2020-12-31")
      } as any);

      const result = await getExcelForDownload(artefactId);

      expect(result).toEqual({ error: "EXPIRED" });
    });

    it("should return FILE_NOT_FOUND when blob download returns null", async () => {
      vi.mocked(getArtefactById).mockResolvedValue(mockArtefact as any);
      vi.mocked(downloadBlob).mockResolvedValue(null);

      const result = await getExcelForDownload(artefactId);

      expect(result).toEqual({ error: "FILE_NOT_FOUND" });
    });

    it("should return ACCESS_DENIED when user is undefined and artefact is CLASSIFIED", async () => {
      // Arrange
      vi.mocked(getArtefactById).mockResolvedValue({ ...mockArtefact, sensitivity: "CLASSIFIED" } as any);
      vi.mocked(canAccessPublicationData).mockReturnValue(false);

      // Act
      const result = await getExcelForDownload(artefactId, undefined);

      // Assert
      expect(result).toEqual({ error: "ACCESS_DENIED" });
      expect(canAccessPublicationData).toHaveBeenCalledWith(undefined, expect.objectContaining({ sensitivity: "CLASSIFIED" }), expect.any(Object));
    });

    it("should return ACCESS_DENIED when user is undefined and artefact is PRIVATE", async () => {
      // Arrange
      vi.mocked(getArtefactById).mockResolvedValue({ ...mockArtefact, sensitivity: "PRIVATE" } as any);
      vi.mocked(canAccessPublicationData).mockReturnValue(false);

      // Act
      const result = await getExcelForDownload(artefactId, undefined);

      // Assert
      expect(result).toEqual({ error: "ACCESS_DENIED" });
    });

    it("should return file data when verified user requests a CLASSIFIED artefact", async () => {
      // Arrange
      const verifiedUser = { role: "VERIFIED", provenance: "MANUAL_UPLOAD" } as any;
      const mockBuffer = Buffer.from("classified xlsx");
      vi.mocked(getArtefactById).mockResolvedValue({ ...mockArtefact, sensitivity: "CLASSIFIED" } as any);
      vi.mocked(canAccessPublicationData).mockReturnValue(true);
      vi.mocked(downloadBlob).mockResolvedValue(mockBuffer);

      // Act
      const result = await getExcelForDownload(artefactId, verifiedUser);

      // Assert
      expect(result).toMatchObject({ success: true });
      expect(canAccessPublicationData).toHaveBeenCalledWith(verifiedUser, expect.objectContaining({ sensitivity: "CLASSIFIED" }), expect.any(Object));
    });
  });
});
