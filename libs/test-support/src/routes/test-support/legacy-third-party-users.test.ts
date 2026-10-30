import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "./legacy-third-party-users.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    legacyThirdPartyUser: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("legacy-third-party-users routes", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = { body: {}, query: {} };
    mockResponse = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    };
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("GET", () => {
    it("should return the users with that name", async () => {
      // Arrange
      mockRequest.query = { name: "parity-legacy-third-party" };
      const users = [{ id: "00000000-0000-0000-0000-000000000001", name: "parity-legacy-third-party", createdDate: new Date() }];
      vi.mocked(prisma.legacyThirdPartyUser.findMany).mockResolvedValue(users);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.legacyThirdPartyUser.findMany).toHaveBeenCalledWith({ where: { name: "parity-legacy-third-party" }, orderBy: { createdDate: "asc" } });
      expect(mockResponse.json).toHaveBeenCalledWith(users);
    });

    it("should return every user when no name is given", async () => {
      // Arrange
      vi.mocked(prisma.legacyThirdPartyUser.findMany).mockResolvedValue([]);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.legacyThirdPartyUser.findMany).toHaveBeenCalledWith({ where: {}, orderBy: { createdDate: "asc" } });
    });
  });

  describe("POST", () => {
    it("should create a user with the given name", async () => {
      // Arrange
      mockRequest.body = { name: "parity-legacy-third-party" };
      const created = { id: "00000000-0000-0000-0000-000000000001", name: "parity-legacy-third-party", createdDate: new Date() };
      vi.mocked(prisma.legacyThirdPartyUser.create).mockResolvedValue(created);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.legacyThirdPartyUser.create).toHaveBeenCalledWith({ data: { name: "parity-legacy-third-party" } });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(created);
    });

    it("should return 400 when name is missing", async () => {
      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(prisma.legacyThirdPartyUser.create).not.toHaveBeenCalled();
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.body = { name: "x" };
      vi.mocked(prisma.legacyThirdPartyUser.create).mockRejectedValue(new Error("DB error"));

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe("DELETE", () => {
    it("should delete the users with the given ids", async () => {
      // Arrange
      mockRequest.body = { ids: ["a", "b"] };
      vi.mocked(prisma.legacyThirdPartyUser.deleteMany).mockResolvedValue({ count: 2 });

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.legacyThirdPartyUser.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["a", "b"] } } });
      expect(mockResponse.json).toHaveBeenCalledWith({ deleted: 2 });
    });

    it("should return 400 when ids is empty", async () => {
      // Arrange
      mockRequest.body = { ids: [] };

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });
});
