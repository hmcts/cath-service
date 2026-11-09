import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./list-search-config.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    listType: { findUnique: vi.fn() },
    listSearchConfig: { findUnique: vi.fn(), upsert: vi.fn(), create: vi.fn() }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("list-search-config routes", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = { query: {} };
    mockResponse = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    };
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("GET", () => {
    it("should return the search config field names for the named list type", async () => {
      // Arrange
      mockRequest.query = { listTypeName: "CIVIL_DAILY_CAUSE_LIST" };
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({ id: 42, name: "CIVIL_DAILY_CAUSE_LIST" } as any);
      vi.mocked(prisma.listSearchConfig.findUnique).mockResolvedValue({
        listTypeId: 42,
        caseNumberFieldName: "caseNumber",
        caseNameFieldName: "caseName"
      } as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.listType.findUnique).toHaveBeenCalledWith({ where: { name: "CIVIL_DAILY_CAUSE_LIST" }, select: { id: true, name: true } });
      expect(prisma.listSearchConfig.findUnique).toHaveBeenCalledWith({ where: { listTypeId: 42 } });
      expect(mockResponse.json).toHaveBeenCalledWith({
        listTypeName: "CIVIL_DAILY_CAUSE_LIST",
        caseNumberFieldName: "caseNumber",
        caseNameFieldName: "caseName"
      });
    });

    it("should return 404 without creating a config when the list type has none", async () => {
      // Arrange
      mockRequest.query = { listTypeName: "CIVIL_DAILY_CAUSE_LIST" };
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({ id: 42, name: "CIVIL_DAILY_CAUSE_LIST" } as any);
      vi.mocked(prisma.listSearchConfig.findUnique).mockResolvedValue(null);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "List type CIVIL_DAILY_CAUSE_LIST has no list search config" });
      expect(prisma.listSearchConfig.upsert).not.toHaveBeenCalled();
      expect(prisma.listSearchConfig.create).not.toHaveBeenCalled();
    });

    it("should return 404 when the list type does not exist", async () => {
      // Arrange
      mockRequest.query = { listTypeName: "UNKNOWN_LIST" };
      vi.mocked(prisma.listType.findUnique).mockResolvedValue(null);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "List type UNKNOWN_LIST not found" });
      expect(prisma.listSearchConfig.findUnique).not.toHaveBeenCalled();
    });

    it("should return 400 when listTypeName is missing", async () => {
      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "listTypeName is required" });
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.query = { listTypeName: "CIVIL_DAILY_CAUSE_LIST" };
      vi.mocked(prisma.listType.findUnique).mockRejectedValue(new Error("DB error"));

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to fetch list search config" });
    });
  });
});
