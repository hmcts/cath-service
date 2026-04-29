import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./jurisdictions.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    jurisdiction: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("jurisdictions routes", () => {
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
    it("should return all jurisdictions when no query params", async () => {
      // Arrange
      const mockJurisdictions = [{ jurisdictionId: 1, name: "Civil" }];
      vi.mocked((prisma as any).jurisdiction.findMany).mockResolvedValue(mockJurisdictions);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect((prisma as any).jurisdiction.findMany).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockJurisdictions);
    });

    it("should return jurisdiction by id", async () => {
      // Arrange
      mockRequest.query = { id: "1" };
      const mockJurisdiction = { jurisdictionId: 1, name: "Civil" };
      vi.mocked((prisma as any).jurisdiction.findUnique).mockResolvedValue(mockJurisdiction);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect((prisma as any).jurisdiction.findUnique).toHaveBeenCalledWith({
        where: { jurisdictionId: 1 }
      });
      expect(mockResponse.json).toHaveBeenCalledWith(mockJurisdiction);
    });

    it("should return 404 when jurisdiction not found by id", async () => {
      // Arrange
      mockRequest.query = { id: "999" };
      vi.mocked((prisma as any).jurisdiction.findUnique).mockResolvedValue(null);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Jurisdiction not found" });
    });

    it("should return first jurisdiction when first=true", async () => {
      // Arrange
      mockRequest.query = { first: "true" };
      const mockJurisdiction = { jurisdictionId: 1, name: "Civil" };
      vi.mocked((prisma as any).jurisdiction.findFirst).mockResolvedValue(mockJurisdiction);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect((prisma as any).jurisdiction.findFirst).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockJurisdiction);
    });

    it("should return 404 when no jurisdiction found with first=true", async () => {
      // Arrange
      mockRequest.query = { first: "true" };
      vi.mocked((prisma as any).jurisdiction.findFirst).mockResolvedValue(null);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "No jurisdiction found" });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      vi.mocked((prisma as any).jurisdiction.findMany).mockRejectedValue(new Error("DB error"));

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to fetch jurisdictions" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("POST", () => {
    it("should seed jurisdictions", async () => {
      // Arrange
      mockRequest.body = {
        jurisdictions: [
          { jurisdictionId: 1, name: "Civil", welshName: "Sifil" },
          { jurisdictionId: 2, name: "Criminal" }
        ]
      };
      vi.mocked((prisma as any).jurisdiction.upsert)
        .mockResolvedValueOnce({ jurisdictionId: 1, name: "Civil", welshName: "Sifil" })
        .mockResolvedValueOnce({ jurisdictionId: 2, name: "Criminal", welshName: "Criminal" });

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        seeded: 2,
        jurisdictions: expect.any(Array)
      });
    });

    it("should return 400 when jurisdictions is not an array", async () => {
      // Arrange
      mockRequest.body = { jurisdictions: "not-array" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "jurisdictions array is required" });
    });

    it("should return 400 when jurisdictions array is empty", async () => {
      // Arrange
      mockRequest.body = { jurisdictions: [] };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "jurisdictions array is required" });
    });

    it("should return 400 when jurisdiction missing jurisdictionId", async () => {
      // Arrange
      mockRequest.body = { jurisdictions: [{ name: "Civil" }] };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Each jurisdiction must have jurisdictionId and name"
      });
    });

    it("should return 400 when jurisdiction missing name", async () => {
      // Arrange
      mockRequest.body = { jurisdictions: [{ jurisdictionId: 1 }] };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Each jurisdiction must have jurisdictionId and name"
      });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.body = { jurisdictions: [{ jurisdictionId: 1, name: "Civil" }] };
      vi.mocked((prisma as any).jurisdiction.upsert).mockRejectedValue(new Error("DB error"));

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to seed jurisdictions" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
