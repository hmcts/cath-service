import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./jurisdiction.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    jurisdiction: {
      findFirst: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

function uniqueConstraintError(field: string) {
  return Object.assign(new Error("Unique constraint failed"), {
    code: "P2002",
    meta: { driverAdapterError: { cause: { constraint: { fields: [field] } } } }
  });
}

describe("jurisdiction route", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockRequest = { body: { name: "E2E_123_Jurisdiction", welshName: "E2E_123_Awdurdodaeth" } };
    mockResponse = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    };
  });

  describe("POST", () => {
    it("should create the jurisdiction with the next id", async () => {
      // Arrange
      vi.mocked(prisma.jurisdiction.findFirst).mockResolvedValue({ jurisdictionId: 7 } as any);
      const created = { jurisdictionId: 8, name: "E2E_123_Jurisdiction", welshName: "E2E_123_Awdurdodaeth" };
      vi.mocked(prisma.jurisdiction.create).mockResolvedValue(created as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.jurisdiction.findFirst).toHaveBeenCalledWith({ orderBy: { jurisdictionId: "desc" }, select: { jurisdictionId: true } });
      expect(prisma.jurisdiction.create).toHaveBeenCalledWith({ data: created });
      expect(prisma.jurisdiction.upsert).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(created);
    });

    it("should start at id 1 when there are no jurisdictions", async () => {
      // Arrange
      vi.mocked(prisma.jurisdiction.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.jurisdiction.create).mockResolvedValue({ jurisdictionId: 1 } as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.jurisdiction.create).toHaveBeenCalledWith({ data: expect.objectContaining({ jurisdictionId: 1 }) });
    });

    it("should retry with a fresh id when another worker took the next id", async () => {
      // Arrange
      vi.mocked(prisma.jurisdiction.findFirst)
        .mockResolvedValueOnce({ jurisdictionId: 7 } as any)
        .mockResolvedValueOnce({ jurisdictionId: 8 } as any);
      vi.mocked(prisma.jurisdiction.create)
        .mockRejectedValueOnce(uniqueConstraintError("jurisdiction_id"))
        .mockResolvedValueOnce({ jurisdictionId: 9 } as any);

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.jurisdiction.create).toHaveBeenCalledTimes(2);
      expect(prisma.jurisdiction.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ jurisdictionId: 9 }) });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it("should not retry when the name is already taken", async () => {
      // Arrange
      vi.mocked(prisma.jurisdiction.findFirst).mockResolvedValue({ jurisdictionId: 7 } as any);
      vi.mocked(prisma.jurisdiction.create).mockRejectedValue(uniqueConstraintError("name"));

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.jurisdiction.create).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it("should give up after repeated id clashes", async () => {
      // Arrange
      vi.mocked(prisma.jurisdiction.findFirst).mockResolvedValue({ jurisdictionId: 7 } as any);
      vi.mocked(prisma.jurisdiction.create).mockRejectedValue(uniqueConstraintError("jurisdiction_id"));

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.jurisdiction.create).toHaveBeenCalledTimes(5);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it("should return 400 when welshName is missing", async () => {
      // Arrange
      mockRequest.body = { name: "E2E_123_Jurisdiction" };

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "name and welshName are required" });
      expect(prisma.jurisdiction.create).not.toHaveBeenCalled();
    });

    it("should return 400 when the body is missing", async () => {
      // Arrange
      mockRequest.body = undefined;

      // Act
      await POST(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });
});
