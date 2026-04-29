import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET } from "./[artefactId].js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    artefact: {
      findUnique: vi.fn(),
      delete: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("[artefactId] routes", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      params: { artefactId: "art123" }
    };
    mockResponse = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("GET", () => {
    it("should return artefact when found", async () => {
      // Arrange
      const mockArtefact = { artefactId: "art123", locationId: "loc1" };
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.artefact.findUnique).toHaveBeenCalledWith({ where: { artefactId: "art123" } });
      expect(mockResponse.json).toHaveBeenCalledWith(mockArtefact);
    });

    it("should return 404 when artefact not found", async () => {
      // Arrange
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Artefact not found" });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      vi.mocked(prisma.artefact.findUnique).mockRejectedValue(new Error("DB error"));

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to fetch artefact" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("should delete artefact and return 204", async () => {
      // Arrange
      vi.mocked(prisma.artefact.delete).mockResolvedValue({ artefactId: "art123" } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.artefact.delete).toHaveBeenCalledWith({ where: { artefactId: "art123" } });
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it("should return 500 on database error", async () => {
      // Arrange
      vi.mocked(prisma.artefact.delete).mockRejectedValue(new Error("DB error"));

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to delete artefact" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
