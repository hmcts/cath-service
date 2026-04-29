import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "./artefacts.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    artefact: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("artefacts routes", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      query: {},
      body: {},
      params: {}
    };
    mockResponse = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    };
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("GET", () => {
    it("should return artefacts without filters", async () => {
      // Arrange
      const mockArtefacts = [{ artefactId: "1", locationId: "loc1" }];
      vi.mocked(prisma.artefact.findMany).mockResolvedValue(mockArtefacts as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.artefact.findMany).toHaveBeenCalledWith({ where: {} });
      expect(mockResponse.json).toHaveBeenCalledWith(mockArtefacts);
    });

    it("should filter artefacts by locationId", async () => {
      // Arrange
      mockRequest.query = { locationId: "loc1" };
      const mockArtefacts = [{ artefactId: "1", locationId: "loc1" }];
      vi.mocked(prisma.artefact.findMany).mockResolvedValue(mockArtefacts as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.artefact.findMany).toHaveBeenCalledWith({ where: { locationId: "loc1" } });
    });

    it("should filter artefacts by provenance", async () => {
      // Arrange
      mockRequest.query = { provenance: "MANUAL_UPLOAD" };
      vi.mocked(prisma.artefact.findMany).mockResolvedValue([] as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.artefact.findMany).toHaveBeenCalledWith({ where: { provenance: "MANUAL_UPLOAD" } });
    });

    it("should filter artefacts by both locationId and provenance", async () => {
      // Arrange
      mockRequest.query = { locationId: "loc1", provenance: "MANUAL_UPLOAD" };
      vi.mocked(prisma.artefact.findMany).mockResolvedValue([] as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.artefact.findMany).toHaveBeenCalledWith({
        where: { locationId: "loc1", provenance: "MANUAL_UPLOAD" }
      });
    });

    it("should return 500 on error", async () => {
      // Arrange
      vi.mocked(prisma.artefact.findMany).mockRejectedValue(new Error("DB error"));

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to fetch artefacts" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("POST", () => {
    it("should create artefact with required fields", async () => {
      // Arrange
      mockRequest.body = {
        locationId: "loc1",
        listTypeId: 1,
        contentDate: "2024-01-01"
      };
      const mockArtefact = {
        artefactId: "art1",
        locationId: "loc1",
        listTypeId: 1
      };
      vi.mocked(prisma.artefact.create).mockResolvedValue(mockArtefact as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        artefactId: "art1",
        locationId: "loc1",
        listTypeId: 1
      });
    });

    it("should create artefact with optional fields", async () => {
      // Arrange
      mockRequest.body = {
        locationId: "loc1",
        listTypeId: 1,
        contentDate: "2024-01-01",
        sensitivity: "PRIVATE",
        language: "WELSH",
        displayFrom: "2024-01-01",
        displayTo: "2024-01-02",
        isFlatFile: true,
        provenance: "SYSTEM"
      };
      const mockArtefact = {
        artefactId: "art1",
        locationId: "loc1",
        listTypeId: 1
      };
      vi.mocked(prisma.artefact.create).mockResolvedValue(mockArtefact as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.artefact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          locationId: "loc1",
          listTypeId: 1,
          sensitivity: "PRIVATE",
          language: "WELSH",
          isFlatFile: true,
          provenance: "SYSTEM"
        })
      });
    });

    it("should return 400 when locationId is missing", async () => {
      // Arrange
      mockRequest.body = { listTypeId: 1, contentDate: "2024-01-01" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "locationId, listTypeId, and contentDate are required"
      });
    });

    it("should return 400 when listTypeId is missing", async () => {
      // Arrange
      mockRequest.body = { locationId: "loc1", contentDate: "2024-01-01" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should return 400 when contentDate is missing", async () => {
      // Arrange
      mockRequest.body = { locationId: "loc1", listTypeId: 1 };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.body = {
        locationId: "loc1",
        listTypeId: 1,
        contentDate: "2024-01-01"
      };
      vi.mocked(prisma.artefact.create).mockRejectedValue(new Error("DB error"));

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to create test artefact" });
    });
  });

  describe("DELETE", () => {
    it("should delete artefacts by locationId", async () => {
      // Arrange
      mockRequest.body = { locationId: "loc1" };
      vi.mocked(prisma.artefact.deleteMany).mockResolvedValue({ count: 5 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.artefact.deleteMany).toHaveBeenCalledWith({ where: { locationId: "loc1" } });
      expect(mockResponse.json).toHaveBeenCalledWith({ deleted: 5 });
    });

    it("should delete artefacts by provenance", async () => {
      // Arrange
      mockRequest.body = { provenance: "MANUAL_UPLOAD" };
      vi.mocked(prisma.artefact.deleteMany).mockResolvedValue({ count: 3 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.artefact.deleteMany).toHaveBeenCalledWith({ where: { provenance: "MANUAL_UPLOAD" } });
    });

    it("should delete artefacts by artefactIds array", async () => {
      // Arrange
      mockRequest.body = { artefactIds: ["art1", "art2"] };
      vi.mocked(prisma.artefact.deleteMany).mockResolvedValue({ count: 2 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.artefact.deleteMany).toHaveBeenCalledWith({
        where: { artefactId: { in: ["art1", "art2"] } }
      });
    });

    it("should delete with combined filters", async () => {
      // Arrange
      mockRequest.body = { locationId: "loc1", provenance: "MANUAL_UPLOAD", artefactIds: ["art1"] };
      vi.mocked(prisma.artefact.deleteMany).mockResolvedValue({ count: 1 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.artefact.deleteMany).toHaveBeenCalledWith({
        where: {
          locationId: "loc1",
          provenance: "MANUAL_UPLOAD",
          artefactId: { in: ["art1"] }
        }
      });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.body = { locationId: "loc1" };
      vi.mocked(prisma.artefact.deleteMany).mockRejectedValue(new Error("DB error"));

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to delete artefacts" });
    });
  });
});
