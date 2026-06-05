import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createJurisdictionData,
  deleteJurisdictionData,
  deleteLocationJurisdictionData,
  listJurisdictionData,
  updateJurisdictionData,
  updateLocationJurisdictionData
} from "./jurisdiction-management-service.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    jurisdiction: { findFirst: vi.fn() },
    subJurisdiction: { findFirst: vi.fn() },
    region: { findFirst: vi.fn() }
  }
}));

vi.mock("./jurisdiction-management-queries.js", () => ({
  listAllJurisdictionData: vi.fn(),
  findJurisdictionDataById: vi.fn(),
  createJurisdictionRecord: vi.fn(),
  updateJurisdictionRecord: vi.fn(),
  softDeleteJurisdictionRecord: vi.fn(),
  hasDependencies: vi.fn(),
  writeAuditLog: vi.fn(),
  updateLocationJurisdictions: vi.fn(),
  deleteLocationJurisdictions: vi.fn()
}));

import { prisma } from "@hmcts/postgres-prisma";
import {
  createJurisdictionRecord,
  deleteLocationJurisdictions,
  findJurisdictionDataById,
  hasDependencies,
  listAllJurisdictionData,
  softDeleteJurisdictionRecord,
  updateLocationJurisdictions,
  writeAuditLog
} from "./jurisdiction-management-queries.js";

describe("jurisdiction-management-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listJurisdictionData", () => {
    it("should return data from queries", async () => {
      // Arrange
      const mockData = [{ id: 1, name: "Civil", welshName: "Sifil", type: "Jurisdiction" as const }];
      vi.mocked(listAllJurisdictionData).mockResolvedValue(mockData);

      // Act
      const result = await listJurisdictionData();

      // Assert
      expect(result).toEqual(mockData);
      expect(listAllJurisdictionData).toHaveBeenCalledWith(undefined);
    });

    it("should pass filter to queries", async () => {
      // Arrange
      vi.mocked(listAllJurisdictionData).mockResolvedValue([]);

      // Act
      await listJurisdictionData({ jurisdiction: "Civil" });

      // Assert
      expect(listAllJurisdictionData).toHaveBeenCalledWith({ jurisdiction: "Civil" });
    });
  });

  describe("createJurisdictionData", () => {
    it("should create record when validation passes", async () => {
      // Arrange
      vi.mocked(prisma.jurisdiction.findFirst).mockResolvedValue(null);
      vi.mocked(createJurisdictionRecord).mockResolvedValue();

      // Act
      const errors = await createJurisdictionData({ name: "Family", welshName: "Teulu", type: "Jurisdiction" });

      // Assert
      expect(errors).toHaveLength(0);
      expect(createJurisdictionRecord).toHaveBeenCalledWith({ name: "Family", welshName: "Teulu", type: "Jurisdiction" });
    });

    it("should return error when name is empty", async () => {
      // Act
      const errors = await createJurisdictionData({ name: "", welshName: "Teulu", type: "Jurisdiction" });

      // Assert
      expect(errors).toContainEqual({ text: "Enter the name in English", href: "#name" });
      expect(createJurisdictionRecord).not.toHaveBeenCalled();
    });

    it("should return error when welsh name is empty", async () => {
      // Act
      const errors = await createJurisdictionData({ name: "Family", welshName: "", type: "Jurisdiction" });

      // Assert
      expect(errors).toContainEqual({ text: "Enter the name in Welsh", href: "#welshName" });
      expect(createJurisdictionRecord).not.toHaveBeenCalled();
    });

    it("should return error when name contains HTML", async () => {
      // Act
      const errors = await createJurisdictionData({ name: "<script>alert</script>", welshName: "Teulu", type: "Jurisdiction" });

      // Assert
      expect(errors).toContainEqual({ text: "Name contains HTML tags which are not allowed", href: "#name" });
    });

    it("should return error when duplicate name exists", async () => {
      // Arrange
      vi.mocked(prisma.jurisdiction.findFirst)
        .mockResolvedValueOnce({ jurisdictionId: 99, name: "Family", welshName: "X", deletedAt: null })
        .mockResolvedValueOnce(null);

      // Act
      const errors = await createJurisdictionData({ name: "Family", welshName: "Teulu", type: "Jurisdiction" });

      // Assert
      expect(errors).toContainEqual({ text: "A record with this name already exists", href: "#name" });
      expect(createJurisdictionRecord).not.toHaveBeenCalled();
    });
  });

  describe("updateJurisdictionData", () => {
    it("should update record when validation passes", async () => {
      // Arrange
      vi.mocked(prisma.jurisdiction.findFirst).mockResolvedValue(null);
      const { updateJurisdictionRecord } = await import("./jurisdiction-management-queries.js");
      vi.mocked(updateJurisdictionRecord).mockResolvedValue();

      // Act
      const errors = await updateJurisdictionData(1, "Jurisdiction", { name: "Updated", welshName: "Diweddarwyd" });

      // Assert
      expect(errors).toHaveLength(0);
      expect(updateJurisdictionRecord).toHaveBeenCalledWith(1, "Jurisdiction", { name: "Updated", welshName: "Diweddarwyd" });
    });

    it("should exclude self when checking uniqueness", async () => {
      // Arrange
      vi.mocked(prisma.jurisdiction.findFirst).mockResolvedValue(null);

      // Act
      await updateJurisdictionData(5, "Jurisdiction", { name: "Civil", welshName: "Sifil" });

      // Assert
      expect(prisma.jurisdiction.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            NOT: { jurisdictionId: 5 }
          })
        })
      );
    });
  });

  describe("deleteJurisdictionData", () => {
    it("should soft-delete and write audit log when no dependencies", async () => {
      // Arrange
      vi.mocked(findJurisdictionDataById).mockResolvedValue({ jurisdictionId: 1, name: "Civil", welshName: "Sifil", deletedAt: null });
      vi.mocked(hasDependencies).mockResolvedValue(false);
      vi.mocked(softDeleteJurisdictionRecord).mockResolvedValue();
      vi.mocked(writeAuditLog).mockResolvedValue();

      // Act
      const errors = await deleteJurisdictionData(1, "Jurisdiction", "admin@example.com");

      // Assert
      expect(errors).toHaveLength(0);
      expect(softDeleteJurisdictionRecord).toHaveBeenCalledWith(1, "Jurisdiction");
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "DELETE_JURISDICTION",
          entityId: "1",
          entityName: "Civil",
          performedBy: "admin@example.com"
        })
      );
    });

    it("should return error when record has dependencies", async () => {
      // Arrange
      vi.mocked(findJurisdictionDataById).mockResolvedValue({ jurisdictionId: 1, name: "Civil", welshName: "Sifil", deletedAt: null });
      vi.mocked(hasDependencies).mockResolvedValue(true);

      // Act
      const errors = await deleteJurisdictionData(1, "Jurisdiction", "admin@example.com");

      // Assert
      expect(errors).toContainEqual({
        text: "This record cannot be deleted because it is linked to one or more locations",
        href: "#"
      });
      expect(softDeleteJurisdictionRecord).not.toHaveBeenCalled();
    });

    it("should return error when record not found", async () => {
      // Arrange
      vi.mocked(findJurisdictionDataById).mockResolvedValue(null);

      // Act
      const errors = await deleteJurisdictionData(999, "Jurisdiction", "admin@example.com");

      // Assert
      expect(errors).toContainEqual({ text: "Record not found", href: "#" });
    });
  });

  describe("updateLocationJurisdictionData", () => {
    it("should update location jurisdictions and write audit log", async () => {
      // Arrange
      vi.mocked(updateLocationJurisdictions).mockResolvedValue();
      vi.mocked(writeAuditLog).mockResolvedValue();

      // Act
      await updateLocationJurisdictionData(100, { subJurisdictionIds: [10, 11], regionIds: [5] }, "admin@example.com");

      // Assert
      expect(updateLocationJurisdictions).toHaveBeenCalledWith(100, [10, 11], [5]);
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "UPDATE_LOCATION_JURISDICTION",
          entityId: "100",
          performedBy: "admin@example.com"
        })
      );
    });
  });

  describe("deleteLocationJurisdictionData", () => {
    it("should delete location jurisdictions and write audit log", async () => {
      // Arrange
      vi.mocked(deleteLocationJurisdictions).mockResolvedValue();
      vi.mocked(writeAuditLog).mockResolvedValue();

      // Act
      await deleteLocationJurisdictionData(100, "admin@example.com");

      // Assert
      expect(deleteLocationJurisdictions).toHaveBeenCalledWith(100);
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "DELETE_LOCATION_JURISDICTION",
          entityId: "100",
          performedBy: "admin@example.com"
        })
      );
    });
  });
});
