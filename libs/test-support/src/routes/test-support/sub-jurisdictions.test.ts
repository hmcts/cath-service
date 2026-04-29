import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./sub-jurisdictions.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    subJurisdiction: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("sub-jurisdictions routes", () => {
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
    it("should return all sub-jurisdictions when no query params", async () => {
      // Arrange
      const mockSubJurisdictions = [{ subJurisdictionId: 1, name: "Civil" }];
      vi.mocked(prisma.subJurisdiction.findMany).mockResolvedValue(mockSubJurisdictions as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.subJurisdiction.findMany).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockSubJurisdictions);
    });

    it("should return first sub-jurisdiction when first=true", async () => {
      // Arrange
      mockRequest.query = { first: "true" };
      const mockSubJurisdiction = { subJurisdictionId: 1, name: "Civil" };
      vi.mocked(prisma.subJurisdiction.findFirst).mockResolvedValue(mockSubJurisdiction as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.subJurisdiction.findFirst).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockSubJurisdiction);
    });

    it("should return 404 when no sub-jurisdiction found with first=true", async () => {
      // Arrange
      mockRequest.query = { first: "true" };
      vi.mocked(prisma.subJurisdiction.findFirst).mockResolvedValue(null);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "No sub-jurisdiction found" });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      vi.mocked(prisma.subJurisdiction.findMany).mockRejectedValue(new Error("DB error"));

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to fetch sub-jurisdictions" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("POST", () => {
    it("should seed sub-jurisdictions", async () => {
      // Arrange
      mockRequest.body = {
        subJurisdictions: [
          { subJurisdictionId: 1, name: "Civil", jurisdictionId: 1 },
          { subJurisdictionId: 2, name: "Criminal", jurisdictionId: 1, welshName: "Troseddol" }
        ]
      };
      vi.mocked((prisma as any).subJurisdiction.upsert)
        .mockResolvedValueOnce({ subJurisdictionId: 1, name: "Civil" })
        .mockResolvedValueOnce({ subJurisdictionId: 2, name: "Criminal" });

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        seeded: 2,
        subJurisdictions: expect.any(Array)
      });
    });

    it("should return 400 when subJurisdictions is not an array", async () => {
      // Arrange
      mockRequest.body = { subJurisdictions: "not-array" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "subJurisdictions array is required" });
    });

    it("should return 400 when subJurisdictions array is empty", async () => {
      // Arrange
      mockRequest.body = { subJurisdictions: [] };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should return 400 when sub-jurisdiction missing subJurisdictionId", async () => {
      // Arrange
      mockRequest.body = { subJurisdictions: [{ name: "Civil", jurisdictionId: 1 }] };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Each subJurisdiction must have subJurisdictionId, name, and jurisdictionId"
      });
    });

    it("should return 400 when sub-jurisdiction missing name", async () => {
      // Arrange
      mockRequest.body = { subJurisdictions: [{ subJurisdictionId: 1, jurisdictionId: 1 }] };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should return 400 when sub-jurisdiction missing jurisdictionId", async () => {
      // Arrange
      mockRequest.body = { subJurisdictions: [{ subJurisdictionId: 1, name: "Civil" }] };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.body = { subJurisdictions: [{ subJurisdictionId: 1, name: "Civil", jurisdictionId: 1 }] };
      vi.mocked((prisma as any).subJurisdiction.upsert).mockRejectedValue(new Error("DB error"));

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to seed sub-jurisdictions" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
