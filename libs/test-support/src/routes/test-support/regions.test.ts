import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./regions.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    region: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn()
    },
    locationRegion: {
      deleteMany: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("regions routes", () => {
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
    it("should return all regions when no query params", async () => {
      // Arrange
      const mockRegions = [{ regionId: 1, name: "London" }];
      vi.mocked(prisma.region.findMany).mockResolvedValue(mockRegions as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.region.findMany).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockRegions);
    });

    it("should return first region when first=true", async () => {
      // Arrange
      mockRequest.query = { first: "true" };
      const mockRegion = { regionId: 1, name: "London" };
      vi.mocked(prisma.region.findFirst).mockResolvedValue(mockRegion as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.region.findFirst).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockRegion);
    });

    it("should return 404 when no region found with first=true", async () => {
      // Arrange
      mockRequest.query = { first: "true" };
      vi.mocked(prisma.region.findFirst).mockResolvedValue(null);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "No region found" });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      vi.mocked(prisma.region.findMany).mockRejectedValue(new Error("DB error"));

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to fetch regions" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("POST", () => {
    it("should seed regions", async () => {
      // Arrange
      mockRequest.body = {
        regions: [
          { regionId: 1, name: "London", welshName: "Llundain" },
          { regionId: 2, name: "Wales" }
        ]
      };
      vi.mocked(prisma.region.findMany).mockResolvedValue([]);
      vi.mocked(prisma.region.upsert)
        .mockResolvedValueOnce({ regionId: 1, name: "London", welshName: "Llundain" } as any)
        .mockResolvedValueOnce({ regionId: 2, name: "Wales", welshName: "Wales" } as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        seeded: 2,
        regions: expect.any(Array)
      });
    });

    it("should delete stale regions with conflicting names before upserting", async () => {
      // Arrange - stale regionId 10 has the same name as the incoming regionId 4
      mockRequest.body = {
        regions: [{ regionId: 4, name: "North West", welshName: "Gogledd Orllewin Lloegr" }]
      };
      const staleRegion = { regionId: 10 };
      vi.mocked(prisma.region.findMany).mockResolvedValue([staleRegion] as any);
      vi.mocked(prisma.locationRegion.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.region.deleteMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(prisma.region.upsert).mockResolvedValue({ regionId: 4, name: "North West", welshName: "Gogledd Orllewin Lloegr" } as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.locationRegion.deleteMany).toHaveBeenCalledWith({ where: { regionId: { in: [10] } } });
      expect(prisma.region.deleteMany).toHaveBeenCalledWith({ where: { regionId: { in: [10] } } });
      expect(prisma.region.upsert).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it("should not delete anything when no stale regions exist", async () => {
      // Arrange
      mockRequest.body = {
        regions: [{ regionId: 1, name: "London", welshName: "Llundain" }]
      };
      vi.mocked(prisma.region.findMany).mockResolvedValue([]);
      vi.mocked(prisma.region.upsert).mockResolvedValue({ regionId: 1, name: "London", welshName: "Llundain" } as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.locationRegion.deleteMany).not.toHaveBeenCalled();
      expect(prisma.region.deleteMany).not.toHaveBeenCalled();
    });

    it("should return 400 when regions is not an array", async () => {
      // Arrange
      mockRequest.body = { regions: "not-array" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "regions array is required" });
    });

    it("should return 400 when regions array is empty", async () => {
      // Arrange
      mockRequest.body = { regions: [] };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should return 400 when region missing regionId", async () => {
      // Arrange
      mockRequest.body = { regions: [{ name: "London" }] };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Each region must have regionId and name" });
    });

    it("should return 400 when region missing name", async () => {
      // Arrange
      mockRequest.body = { regions: [{ regionId: 1 }] };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.body = { regions: [{ regionId: 1, name: "London" }] };
      vi.mocked(prisma.region.findMany).mockRejectedValue(new Error("DB error"));

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to seed regions" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
