import { prisma } from "@hmcts/postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as fileRetrieval from "../file-storage/file-retrieval.js";
import { getFileForDownload, getFlatFileForDisplay } from "./flat-file-service.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    artefact: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock("../file-storage/file-retrieval.js");

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn().mockResolvedValue({
    id: 123,
    name: "Test Court",
    welshName: "Llys Prawf"
  })
}));

vi.mock("@hmcts/publication", () => ({
  mockListTypes: [
    {
      id: 1,
      englishFriendlyName: "Daily Cause List",
      welshFriendlyName: "Rhestr Achos Dyddiol"
    }
  ]
}));

describe("flat-file-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      lastReceivedDate: new Date(),
      isFlatFile: true,
      provenance: "MANUAL_UPLOAD",
      supersededCount: 0
    };

    it("should return success for valid flat file", async () => {
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);
      vi.mocked(fileRetrieval.getFileBuffer).mockResolvedValue(Buffer.from("test"));

      const result = await getFlatFileForDisplay(mockArtefact.artefactId, mockArtefact.locationId);

      expect(result).toEqual({
        success: true,
        artefactId: mockArtefact.artefactId,
        courtName: "Test Court",
        listTypeName: "Daily Cause List",
        contentDate: mockArtefact.contentDate,
        language: mockArtefact.language
      });
    });

    it("should return NOT_FOUND when artefact does not exist", async () => {
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);

      const result = await getFlatFileForDisplay("non-existent", "123");

      expect(result).toEqual({ error: "NOT_FOUND" });
    });

    it("should return LOCATION_MISMATCH when locationId does not match", async () => {
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);

      const result = await getFlatFileForDisplay(mockArtefact.artefactId, "wrong-location");

      expect(result).toEqual({ error: "LOCATION_MISMATCH" });
    });

    it("should return NOT_FLAT_FILE when artefact is not a flat file", async () => {
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({
        ...mockArtefact,
        isFlatFile: false
      });

      const result = await getFlatFileForDisplay(mockArtefact.artefactId, mockArtefact.locationId);

      expect(result).toEqual({ error: "NOT_FLAT_FILE" });
    });

    it("should return EXPIRED when before displayFrom date", async () => {
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({
        ...mockArtefact,
        displayFrom: new Date("2999-01-01"),
        displayTo: new Date("2999-12-31")
      });

      const result = await getFlatFileForDisplay(mockArtefact.artefactId, mockArtefact.locationId);

      expect(result).toEqual({ error: "EXPIRED" });
    });

    it("should return EXPIRED when after displayTo date", async () => {
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({
        ...mockArtefact,
        displayFrom: new Date("2020-01-01"),
        displayTo: new Date("2020-12-31")
      });

      const result = await getFlatFileForDisplay(mockArtefact.artefactId, mockArtefact.locationId);

      expect(result).toEqual({ error: "EXPIRED" });
    });

    it("should return FILE_NOT_FOUND when file does not exist in storage", async () => {
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);
      vi.mocked(fileRetrieval.getFileBuffer).mockResolvedValue(null);

      const result = await getFlatFileForDisplay(mockArtefact.artefactId, mockArtefact.locationId);

      expect(result).toEqual({ error: "FILE_NOT_FOUND" });
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
      lastReceivedDate: new Date(),
      isFlatFile: true,
      provenance: "MANUAL_UPLOAD",
      supersededCount: 0
    };

    it("should return file buffer and metadata for valid file", async () => {
      const mockBuffer = Buffer.from("test pdf content");
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);
      vi.mocked(fileRetrieval.getFileBuffer).mockResolvedValue(mockBuffer);
      vi.mocked(fileRetrieval.getContentType).mockReturnValue("application/pdf");
      vi.mocked(fileRetrieval.getFileName).mockReturnValue(`${mockArtefact.artefactId}.pdf`);

      const result = await getFileForDownload(mockArtefact.artefactId);

      expect(result).toEqual({
        success: true,
        fileBuffer: mockBuffer,
        contentType: "application/pdf",
        fileName: `${mockArtefact.artefactId}.pdf`
      });
    });

    it("should return NOT_FOUND when artefact does not exist", async () => {
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);

      const result = await getFileForDownload("non-existent");

      expect(result).toEqual({ error: "NOT_FOUND" });
    });

    it("should return NOT_FLAT_FILE when artefact is not a flat file", async () => {
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({
        ...mockArtefact,
        isFlatFile: false
      });

      const result = await getFileForDownload(mockArtefact.artefactId);

      expect(result).toEqual({ error: "NOT_FLAT_FILE" });
    });

    it("should return EXPIRED when file display period has expired", async () => {
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({
        ...mockArtefact,
        displayFrom: new Date("2020-01-01"),
        displayTo: new Date("2020-12-31")
      });

      const result = await getFileForDownload(mockArtefact.artefactId);

      expect(result).toEqual({ error: "EXPIRED" });
    });

    it("should return FILE_NOT_FOUND when file does not exist in storage", async () => {
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);
      vi.mocked(fileRetrieval.getFileBuffer).mockResolvedValue(null);

      const result = await getFileForDownload(mockArtefact.artefactId);

      expect(result).toEqual({ error: "FILE_NOT_FOUND" });
    });
  });
});
