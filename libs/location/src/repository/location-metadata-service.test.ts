import { beforeEach, describe, expect, it, vi } from "vitest";
import * as queries from "./location-metadata-queries.js";
import { createLocationMetadata, deleteLocationMetadata, getLocationMetadataByLocationId, updateLocationMetadata } from "./location-metadata-service.js";

vi.mock("./location-metadata-queries.js");

describe("location-metadata-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getLocationMetadataByLocationId", () => {
    it("should return location metadata when it exists", async () => {
      const mockMetadata = {
        locationMetadataId: "test-id",
        locationId: 1,
        cautionMessage: "Test caution",
        welshCautionMessage: null,
        noListMessage: null,
        welshNoListMessage: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(queries.findLocationMetadataByLocationId).mockResolvedValue(mockMetadata);

      const result = await getLocationMetadataByLocationId(1);

      expect(result).toEqual(mockMetadata);
      expect(queries.findLocationMetadataByLocationId).toHaveBeenCalledWith(1);
    });

    it("should return null when metadata does not exist", async () => {
      vi.mocked(queries.findLocationMetadataByLocationId).mockResolvedValue(null);

      const result = await getLocationMetadataByLocationId(1);

      expect(result).toBeNull();
    });
  });

  describe("createLocationMetadata", () => {
    it("should create location metadata with valid input", async () => {
      const input = {
        locationId: 1,
        cautionMessage: "Test caution",
        welshCautionMessage: "Rhybudd prawf",
        noListMessage: null,
        welshNoListMessage: null
      };

      const mockCreated = {
        locationMetadataId: "test-id",
        ...input,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(queries.findLocationMetadataByLocationId).mockResolvedValue(null);
      vi.mocked(queries.createLocationMetadataRecord).mockResolvedValue(mockCreated);

      const result = await createLocationMetadata(input);

      expect(result).toEqual(mockCreated);
      expect(queries.createLocationMetadataRecord).toHaveBeenCalledWith(input);
    });

    it("should throw error when all messages are empty", async () => {
      const input = {
        locationId: 1,
        cautionMessage: "",
        welshCautionMessage: "",
        noListMessage: "",
        welshNoListMessage: ""
      };

      await expect(createLocationMetadata(input)).rejects.toThrow("At least one message required");
    });

    it("should throw error when metadata already exists", async () => {
      const input = {
        locationId: 1,
        cautionMessage: "Test caution"
      };

      const existingMetadata = {
        locationMetadataId: "existing-id",
        locationId: 1,
        cautionMessage: "Existing caution",
        welshCautionMessage: null,
        noListMessage: null,
        welshNoListMessage: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(queries.findLocationMetadataByLocationId).mockResolvedValue(existingMetadata);

      await expect(createLocationMetadata(input)).rejects.toThrow("Location metadata already exists");
    });

    it("should accept metadata with only one message field populated", async () => {
      const input = {
        locationId: 1,
        noListMessage: "No hearings scheduled"
      };

      const mockCreated = {
        locationMetadataId: "test-id",
        locationId: 1,
        cautionMessage: null,
        welshCautionMessage: null,
        noListMessage: "No hearings scheduled",
        welshNoListMessage: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(queries.findLocationMetadataByLocationId).mockResolvedValue(null);
      vi.mocked(queries.createLocationMetadataRecord).mockResolvedValue(mockCreated);

      const result = await createLocationMetadata(input);

      expect(result).toEqual(mockCreated);
    });
  });

  describe("updateLocationMetadata", () => {
    it("should update location metadata with valid input", async () => {
      const input = {
        cautionMessage: "Updated caution",
        welshCautionMessage: "Rhybudd wedi'i ddiweddaru"
      };

      const existingMetadata = {
        locationMetadataId: "test-id",
        locationId: 1,
        cautionMessage: "Old caution",
        welshCautionMessage: null,
        noListMessage: null,
        welshNoListMessage: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockUpdated = {
        ...existingMetadata,
        ...input,
        updatedAt: new Date()
      };

      vi.mocked(queries.findLocationMetadataByLocationId).mockResolvedValue(existingMetadata);
      vi.mocked(queries.updateLocationMetadataRecord).mockResolvedValue(mockUpdated);

      const result = await updateLocationMetadata(1, input);

      expect(result).toEqual(mockUpdated);
      expect(queries.updateLocationMetadataRecord).toHaveBeenCalledWith(1, input);
    });

    it("should throw error when all messages are empty", async () => {
      const input = {
        cautionMessage: "",
        welshCautionMessage: "",
        noListMessage: "",
        welshNoListMessage: ""
      };

      await expect(updateLocationMetadata(1, input)).rejects.toThrow("At least one message required");
    });

    it("should throw error when metadata does not exist", async () => {
      const input = {
        cautionMessage: "Test caution"
      };

      vi.mocked(queries.findLocationMetadataByLocationId).mockResolvedValue(null);

      await expect(updateLocationMetadata(1, input)).rejects.toThrow("Location metadata not found");
    });
  });

  describe("deleteLocationMetadata", () => {
    it("should delete location metadata when it exists", async () => {
      const existingMetadata = {
        locationMetadataId: "test-id",
        locationId: 1,
        cautionMessage: "Test caution",
        welshCautionMessage: null,
        noListMessage: null,
        welshNoListMessage: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(queries.findLocationMetadataByLocationId).mockResolvedValue(existingMetadata);
      vi.mocked(queries.deleteLocationMetadataRecord).mockResolvedValue(existingMetadata);

      await deleteLocationMetadata(1);

      expect(queries.deleteLocationMetadataRecord).toHaveBeenCalledWith(1);
    });

    it("should throw error when metadata does not exist", async () => {
      vi.mocked(queries.findLocationMetadataByLocationId).mockResolvedValue(null);

      await expect(deleteLocationMetadata(1)).rejects.toThrow("Location metadata not found");
    });
  });
});
