import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "./locations.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    location: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("locations routes", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      query: {},
      body: {}
    };
    mockResponse = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    };
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("GET", () => {
    it("should return all locations", async () => {
      // Arrange
      const mockLocations = [{ locationId: 1, name: "Test Court" }];
      vi.mocked(prisma.location.findMany).mockResolvedValue(mockLocations as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.location.findMany).toHaveBeenCalledWith({ include: undefined });
      expect(mockResponse.json).toHaveBeenCalledWith(mockLocations);
    });

    it("should return first location when first=true", async () => {
      // Arrange
      mockRequest.query = { first: "true" };
      const mockLocation = { locationId: 1, name: "Test Court" };
      vi.mocked(prisma.location.findFirst).mockResolvedValue(mockLocation as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.location.findFirst).toHaveBeenCalledWith({ include: undefined });
      expect(mockResponse.json).toHaveBeenCalledWith(mockLocation);
    });

    it("should return 404 when no location found with first=true", async () => {
      // Arrange
      mockRequest.query = { first: "true" };
      vi.mocked(prisma.location.findFirst).mockResolvedValue(null);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "No location found" });
    });

    it("should include relationships when includeRelationships=true", async () => {
      // Arrange
      mockRequest.query = { includeRelationships: "true" };
      vi.mocked(prisma.location.findMany).mockResolvedValue([]);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.location.findMany).toHaveBeenCalledWith({
        include: {
          locationRegions: true,
          locationSubJurisdictions: true
        }
      });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      vi.mocked(prisma.location.findMany).mockRejectedValue(new Error("DB error"));

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to fetch locations" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("POST", () => {
    it("should create location with required fields", async () => {
      // Arrange
      mockRequest.body = {
        name: "Test Court",
        welshName: "Llys Prawf"
      };
      const mockLocation = { locationId: 90001, name: "Test Court", welshName: "Llys Prawf" };
      vi.mocked(prisma.location.upsert).mockResolvedValue(mockLocation as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        locationId: 90001,
        name: "Test Court",
        welshName: "Llys Prawf"
      });
    });

    it("should create location with custom locationId", async () => {
      // Arrange
      mockRequest.body = {
        locationId: 12345,
        name: "Test Court",
        welshName: "Llys Prawf"
      };
      const mockLocation = { locationId: 12345, name: "Test Court", welshName: "Llys Prawf" };
      vi.mocked(prisma.location.upsert).mockResolvedValue(mockLocation as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.location.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { locationId: 12345 }
        })
      );
    });

    it("should create location with custom regionIds and subJurisdictionIds", async () => {
      // Arrange
      mockRequest.body = {
        name: "Test Court",
        welshName: "Llys Prawf",
        regionIds: [1, 2],
        subJurisdictionIds: [3, 4]
      };
      const mockLocation = { locationId: 90001, name: "Test Court", welshName: "Llys Prawf" };
      vi.mocked(prisma.location.upsert).mockResolvedValue(mockLocation as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.location.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            locationRegions: {
              create: [{ regionId: 1 }, { regionId: 2 }]
            },
            locationSubJurisdictions: {
              create: [{ subJurisdictionId: 3 }, { subJurisdictionId: 4 }]
            }
          })
        })
      );
    });

    it("should return 400 when name is missing", async () => {
      // Arrange
      mockRequest.body = { welshName: "Llys Prawf" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "name and welshName are required" });
    });

    it("should return 400 when welshName is missing", async () => {
      // Arrange
      mockRequest.body = { name: "Test Court" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "name and welshName are required" });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.body = { name: "Test Court", welshName: "Llys Prawf" };
      vi.mocked(prisma.location.upsert).mockRejectedValue(new Error("DB error"));

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to create test location" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("should delete locations by locationIds", async () => {
      // Arrange
      mockRequest.body = { locationIds: [1, 2, 3] };
      vi.mocked(prisma.location.deleteMany).mockResolvedValue({ count: 3 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.location.deleteMany).toHaveBeenCalledWith({
        where: { locationId: { in: [1, 2, 3] } }
      });
      expect(mockResponse.json).toHaveBeenCalledWith({ deleted: 3 });
    });

    it("should return 400 when locationIds is missing", async () => {
      // Arrange
      mockRequest.body = {};

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "locationIds array is required" });
    });

    it("should return 400 when locationIds is not an array", async () => {
      // Arrange
      mockRequest.body = { locationIds: "not-array" };

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "locationIds array is required" });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.body = { locationIds: [1] };
      vi.mocked(prisma.location.deleteMany).mockRejectedValue(new Error("DB error"));

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to delete locations" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
