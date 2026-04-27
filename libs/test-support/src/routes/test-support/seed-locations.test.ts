import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./seed-locations.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    location: {
      upsert: vi.fn()
    },
    subJurisdiction: {
      findMany: vi.fn()
    },
    locationSubJurisdiction: {
      upsert: vi.fn()
    },
    region: {
      findMany: vi.fn()
    },
    locationRegion: {
      upsert: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("seed-locations routes", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      body: {}
    };
    mockResponse = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    };
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("POST", () => {
    it("should seed locations with required fields", async () => {
      // Arrange
      mockRequest.body = {
        locations: [
          { locationId: 1, locationName: "Test Court" },
          { locationId: 2, locationName: "Another Court", welshLocationName: "Llys Arall" }
        ]
      };
      vi.mocked((prisma as any).location.upsert).mockResolvedValue({});

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        seeded: 2,
        locations: [
          { locationId: 1, name: "Test Court" },
          { locationId: 2, name: "Another Court" }
        ]
      });
    });

    it("should link sub-jurisdictions by name", async () => {
      // Arrange
      mockRequest.body = {
        locations: [{ locationId: 1, locationName: "Test Court", subJurisdictionNames: ["Civil", "Criminal"] }]
      };
      vi.mocked((prisma as any).location.upsert).mockResolvedValue({});
      vi.mocked((prisma as any).subJurisdiction.findMany).mockResolvedValue([
        { subJurisdictionId: 1, name: "Civil" },
        { subJurisdictionId: 2, name: "Criminal" }
      ]);
      vi.mocked((prisma as any).locationSubJurisdiction.upsert).mockResolvedValue({});

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect((prisma as any).subJurisdiction.findMany).toHaveBeenCalledWith({
        where: { name: { in: ["Civil", "Criminal"] } },
        select: { subJurisdictionId: true, name: true }
      });
      expect((prisma as any).locationSubJurisdiction.upsert).toHaveBeenCalledTimes(2);
    });

    it("should link regions by name", async () => {
      // Arrange
      mockRequest.body = {
        locations: [{ locationId: 1, locationName: "Test Court", regionNames: ["London", "South East"] }]
      };
      vi.mocked((prisma as any).location.upsert).mockResolvedValue({});
      vi.mocked((prisma as any).region.findMany).mockResolvedValue([
        { regionId: 1, name: "London" },
        { regionId: 2, name: "South East" }
      ]);
      vi.mocked((prisma as any).locationRegion.upsert).mockResolvedValue({});

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect((prisma as any).region.findMany).toHaveBeenCalledWith({
        where: { name: { in: ["London", "South East"] } },
        select: { regionId: true, name: true }
      });
      expect((prisma as any).locationRegion.upsert).toHaveBeenCalledTimes(2);
    });

    it("should handle locations with email and contactNo", async () => {
      // Arrange
      mockRequest.body = {
        locations: [
          {
            locationId: 1,
            locationName: "Test Court",
            email: "test@court.gov.uk",
            contactNo: "01onal1234567"
          }
        ]
      };
      vi.mocked((prisma as any).location.upsert).mockResolvedValue({});

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect((prisma as any).location.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            email: "test@court.gov.uk",
            contactNo: "01onal1234567"
          })
        })
      );
    });

    it("should return 400 when locations is not an array", async () => {
      // Arrange
      mockRequest.body = { locations: "not-array" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "locations array is required" });
    });

    it("should return 400 when locations array is empty", async () => {
      // Arrange
      mockRequest.body = { locations: [] };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should return 400 when location missing locationId", async () => {
      // Arrange
      mockRequest.body = { locations: [{ locationName: "Test Court" }] };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Each location must have locationId and locationName"
      });
    });

    it("should return 400 when location missing locationName", async () => {
      // Arrange
      mockRequest.body = { locations: [{ locationId: 1 }] };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.body = { locations: [{ locationId: 1, locationName: "Test Court" }] };
      vi.mocked((prisma as any).location.upsert).mockRejectedValue(new Error("DB error"));

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to seed locations" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
