import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createLocationMetadataRecord,
  deleteLocationMetadataRecord,
  findLocationMetadataByLocationId,
  updateLocationMetadataRecord
} from "./location-metadata-queries.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    locationMetadata: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres";

describe("location-metadata-queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findLocationMetadataByLocationId", () => {
    it("should call prisma.locationMetadata.findUnique with correct params", async () => {
      const mockMetadata = {
        locationMetadataId: "test-id",
        locationId: 123,
        cautionMessage: "Test caution",
        welshCautionMessage: null,
        noListMessage: null,
        welshNoListMessage: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(prisma.locationMetadata.findUnique).mockResolvedValue(mockMetadata);

      const result = await findLocationMetadataByLocationId(123);

      expect(prisma.locationMetadata.findUnique).toHaveBeenCalledWith({
        where: { locationId: 123 }
      });
      expect(result).toEqual(mockMetadata);
    });

    it("should return null when metadata not found", async () => {
      vi.mocked(prisma.locationMetadata.findUnique).mockResolvedValue(null);

      const result = await findLocationMetadataByLocationId(999);

      expect(result).toBeNull();
    });
  });

  describe("createLocationMetadataRecord", () => {
    it("should call prisma.locationMetadata.create with trimmed values", async () => {
      const input = {
        locationId: 123,
        cautionMessage: "  Test caution  ",
        welshCautionMessage: "  Rhybudd prawf  ",
        noListMessage: "  No list  ",
        welshNoListMessage: "  Dim rhestr  "
      };

      const mockCreated = {
        locationMetadataId: "test-id",
        locationId: 123,
        cautionMessage: "Test caution",
        welshCautionMessage: "Rhybudd prawf",
        noListMessage: "No list",
        welshNoListMessage: "Dim rhestr",
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(prisma.locationMetadata.create).mockResolvedValue(mockCreated);

      const result = await createLocationMetadataRecord(input);

      expect(prisma.locationMetadata.create).toHaveBeenCalledWith({
        data: {
          locationId: 123,
          cautionMessage: "Test caution",
          welshCautionMessage: "Rhybudd prawf",
          noListMessage: "No list",
          welshNoListMessage: "Dim rhestr"
        }
      });
      expect(result).toEqual(mockCreated);
    });

    it("should convert empty strings to null", async () => {
      const input = {
        locationId: 123,
        cautionMessage: "",
        welshCautionMessage: undefined,
        noListMessage: "Valid message",
        welshNoListMessage: "   "
      };

      vi.mocked(prisma.locationMetadata.create).mockResolvedValue({} as any);

      await createLocationMetadataRecord(input);

      expect(prisma.locationMetadata.create).toHaveBeenCalledWith({
        data: {
          locationId: 123,
          cautionMessage: null,
          welshCautionMessage: null,
          noListMessage: "Valid message",
          welshNoListMessage: null
        }
      });
    });
  });

  describe("updateLocationMetadataRecord", () => {
    it("should call prisma.locationMetadata.update with trimmed values", async () => {
      const input = {
        cautionMessage: "  Updated caution  ",
        welshCautionMessage: "  Rhybudd wedi'i ddiweddaru  "
      };

      const mockUpdated = {
        locationMetadataId: "test-id",
        locationId: 123,
        cautionMessage: "Updated caution",
        welshCautionMessage: "Rhybudd wedi'i ddiweddaru",
        noListMessage: null,
        welshNoListMessage: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(prisma.locationMetadata.update).mockResolvedValue(mockUpdated);

      const result = await updateLocationMetadataRecord(123, input);

      expect(prisma.locationMetadata.update).toHaveBeenCalledWith({
        where: { locationId: 123 },
        data: {
          cautionMessage: "Updated caution",
          welshCautionMessage: "Rhybudd wedi'i ddiweddaru",
          noListMessage: null,
          welshNoListMessage: null
        }
      });
      expect(result).toEqual(mockUpdated);
    });

    it("should convert empty strings to null on update", async () => {
      const input = {
        cautionMessage: "",
        welshCautionMessage: "   ",
        noListMessage: "Valid",
        welshNoListMessage: undefined
      };

      vi.mocked(prisma.locationMetadata.update).mockResolvedValue({} as any);

      await updateLocationMetadataRecord(123, input);

      expect(prisma.locationMetadata.update).toHaveBeenCalledWith({
        where: { locationId: 123 },
        data: {
          cautionMessage: null,
          welshCautionMessage: null,
          noListMessage: "Valid",
          welshNoListMessage: null
        }
      });
    });
  });

  describe("deleteLocationMetadataRecord", () => {
    it("should call prisma.locationMetadata.delete with correct params", async () => {
      const mockDeleted = {
        locationMetadataId: "test-id",
        locationId: 123,
        cautionMessage: "Test",
        welshCautionMessage: null,
        noListMessage: null,
        welshNoListMessage: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(prisma.locationMetadata.delete).mockResolvedValue(mockDeleted);

      const result = await deleteLocationMetadataRecord(123);

      expect(prisma.locationMetadata.delete).toHaveBeenCalledWith({
        where: { locationId: 123 }
      });
      expect(result).toEqual(mockDeleted);
    });
  });
});
