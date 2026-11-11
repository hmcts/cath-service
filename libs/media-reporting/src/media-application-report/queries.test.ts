import { prisma } from "@hmcts/postgres-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteApplicationsByIds, getApplicationsForReport } from "./queries.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    mediaApplication: {
      findMany: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));

describe("media application report queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getApplicationsForReport", () => {
    it("should query all applications including pending ordered by applied date", async () => {
      // Arrange
      const applications = [
        {
          id: "id-1",
          name: "Jane Smith",
          email: "jane@example.com",
          employer: "BBC",
          status: "APPROVED",
          appliedDate: new Date("2026-01-01T10:00:00Z")
        },
        {
          id: "id-2",
          name: "John Doe",
          email: "john@example.com",
          employer: "ITV",
          status: "PENDING",
          appliedDate: new Date("2026-01-02T10:00:00Z")
        }
      ];
      vi.mocked(prisma.mediaApplication.findMany).mockResolvedValue(applications as never);

      // Act
      const result = await getApplicationsForReport();

      // Assert
      expect(result).toEqual(applications);
      expect(prisma.mediaApplication.findMany).toHaveBeenCalledWith({
        select: { id: true, name: true, email: true, employer: true, status: true, appliedDate: true },
        orderBy: { appliedDate: "asc" }
      });
    });

    it("should return an empty array when there are no applications", async () => {
      // Arrange
      vi.mocked(prisma.mediaApplication.findMany).mockResolvedValue([]);

      // Act
      const result = await getApplicationsForReport();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("deleteApplicationsByIds", () => {
    it("should delete applications by id and return the deleted count", async () => {
      // Arrange
      vi.mocked(prisma.mediaApplication.deleteMany).mockResolvedValue({ count: 2 });

      // Act
      const result = await deleteApplicationsByIds(["id-1", "id-2"]);

      // Assert
      expect(result).toBe(2);
      expect(prisma.mediaApplication.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["id-1", "id-2"] } } });
    });

    it("should return zero when no rows were deleted", async () => {
      // Arrange
      vi.mocked(prisma.mediaApplication.deleteMany).mockResolvedValue({ count: 0 });

      // Act
      const result = await deleteApplicationsByIds(["id-1"]);

      // Assert
      expect(result).toBe(0);
    });
  });
});
