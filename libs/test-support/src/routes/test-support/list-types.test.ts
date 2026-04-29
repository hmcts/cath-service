import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./list-types.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    listType: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    subJurisdiction: {
      findMany: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("list-types routes", () => {
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
    it("should return all list types when no query params", async () => {
      // Arrange
      const mockListTypes = [{ id: 1, name: "CIVIL_DAILY_LIST" }];
      vi.mocked(prisma.listType.findMany).mockResolvedValue(mockListTypes as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.listType.findMany).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockListTypes);
    });

    it("should return list type by id", async () => {
      // Arrange
      mockRequest.query = { id: "1" };
      const mockListType = { id: 1, name: "CIVIL_DAILY_LIST" };
      vi.mocked(prisma.listType.findUnique).mockResolvedValue(mockListType as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.listType.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockResponse.json).toHaveBeenCalledWith(mockListType);
    });

    it("should return 404 when list type not found by id", async () => {
      // Arrange
      mockRequest.query = { id: "999" };
      vi.mocked(prisma.listType.findUnique).mockResolvedValue(null);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "List type not found" });
    });

    it("should return list type by name", async () => {
      // Arrange
      mockRequest.query = { name: "CIVIL" };
      const mockListType = { id: 1, name: "CIVIL_DAILY_LIST" };
      vi.mocked((prisma as any).listType.findFirst).mockResolvedValue(mockListType);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect((prisma as any).listType.findFirst).toHaveBeenCalledWith({
        where: { name: { contains: "CIVIL" } }
      });
      expect(mockResponse.json).toHaveBeenCalledWith(mockListType);
    });

    it("should return first list type when first=true", async () => {
      // Arrange
      mockRequest.query = { first: "true" };
      const mockListType = { id: 1, name: "CIVIL_DAILY_LIST" };
      vi.mocked((prisma as any).listType.findFirst).mockResolvedValue(mockListType);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect((prisma as any).listType.findFirst).toHaveBeenCalledWith({ where: {} });
      expect(mockResponse.json).toHaveBeenCalledWith(mockListType);
    });

    it("should return 404 when no list type found with first=true", async () => {
      // Arrange
      mockRequest.query = { first: "true" };
      vi.mocked((prisma as any).listType.findFirst).mockResolvedValue(null);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "List type not found" });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      vi.mocked(prisma.listType.findMany).mockRejectedValue(new Error("DB error"));

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to fetch list types" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("POST", () => {
    it("should create new list types", async () => {
      // Arrange
      mockRequest.body = {
        listTypes: [{ name: "CIVIL_DAILY_LIST", friendlyName: "Civil Daily List" }]
      };
      vi.mocked((prisma as any).listType.findUnique).mockResolvedValue(null);
      vi.mocked((prisma as any).listType.create).mockResolvedValue({
        id: 1,
        name: "CIVIL_DAILY_LIST",
        friendlyName: "Civil Daily List"
      });

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        seeded: 1,
        listTypes: expect.any(Array)
      });
    });

    it("should update existing list types", async () => {
      // Arrange
      mockRequest.body = {
        listTypes: [{ name: "CIVIL_DAILY_LIST", friendlyName: "Updated Name" }]
      };
      vi.mocked((prisma as any).listType.findUnique).mockResolvedValue({
        id: 1,
        name: "CIVIL_DAILY_LIST"
      });
      vi.mocked((prisma as any).listType.update).mockResolvedValue({
        id: 1,
        name: "CIVIL_DAILY_LIST",
        friendlyName: "Updated Name"
      });

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect((prisma as any).listType.update).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it("should link all sub-jurisdictions when linkAllSubJurisdictions is true", async () => {
      // Arrange
      mockRequest.body = {
        listTypes: [{ name: "CIVIL_DAILY_LIST" }],
        linkAllSubJurisdictions: true
      };
      vi.mocked((prisma as any).subJurisdiction.findMany).mockResolvedValue([{ subJurisdictionId: 1 }, { subJurisdictionId: 2 }]);
      vi.mocked((prisma as any).listType.findUnique).mockResolvedValue(null);
      vi.mocked((prisma as any).listType.create).mockResolvedValue({
        id: 1,
        name: "CIVIL_DAILY_LIST"
      });

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect((prisma as any).listType.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          subJurisdictions: {
            create: [{ subJurisdictionId: 1 }, { subJurisdictionId: 2 }]
          }
        })
      });
    });

    it("should return 400 when no sub-jurisdictions found for linking", async () => {
      // Arrange
      mockRequest.body = {
        listTypes: [{ name: "CIVIL_DAILY_LIST" }],
        linkAllSubJurisdictions: true
      };
      vi.mocked((prisma as any).subJurisdiction.findMany).mockResolvedValue([]);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "No sub-jurisdictions found. Please seed sub-jurisdictions first."
      });
    });

    it("should return 400 when listTypes is not an array", async () => {
      // Arrange
      mockRequest.body = { listTypes: "not-array" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "listTypes array is required" });
    });

    it("should return 400 when listTypes array is empty", async () => {
      // Arrange
      mockRequest.body = { listTypes: [] };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "listTypes array is required" });
    });

    it("should return 400 when list type missing name", async () => {
      // Arrange
      mockRequest.body = { listTypes: [{ friendlyName: "Test" }] };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Each listType must have a name" });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.body = { listTypes: [{ name: "CIVIL_DAILY_LIST" }] };
      vi.mocked((prisma as any).listType.findUnique).mockRejectedValue(new Error("DB error"));

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to seed list types" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
