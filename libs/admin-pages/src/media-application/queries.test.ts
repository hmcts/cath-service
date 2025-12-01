import { prisma } from "@hmcts/postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APPLICATION_STATUS } from "./model.js";
import { getApplicationById, getPendingApplications, getPendingCount, updateApplicationStatus } from "./queries.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    mediaApplication: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn()
    }
  }
}));

describe("media-application queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPendingApplications", () => {
    it("should return pending applications ordered by date", async () => {
      const mockApplications = [
        { id: "1", name: "John Doe", employer: "BBC", appliedDate: new Date("2024-01-02") },
        { id: "2", name: "Jane Smith", employer: "ITV", appliedDate: new Date("2024-01-01") }
      ];

      vi.mocked(prisma.mediaApplication.findMany).mockResolvedValue(mockApplications);

      const result = await getPendingApplications();

      expect(prisma.mediaApplication.findMany).toHaveBeenCalledWith({
        where: { status: APPLICATION_STATUS.PENDING },
        select: {
          id: true,
          name: true,
          employer: true,
          appliedDate: true
        },
        orderBy: {
          appliedDate: "desc"
        }
      });
      expect(result).toEqual(mockApplications);
    });
  });

  describe("getApplicationById", () => {
    it("should return application details by id", async () => {
      const mockApplication = {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        employer: "BBC",
        proofOfIdPath: "/path/to/file.pdf",
        status: APPLICATION_STATUS.PENDING,
        appliedDate: new Date("2024-01-01")
      };

      vi.mocked(prisma.mediaApplication.findUnique).mockResolvedValue(mockApplication);

      const result = await getApplicationById("1");

      expect(prisma.mediaApplication.findUnique).toHaveBeenCalledWith({
        where: { id: "1" },
        select: {
          id: true,
          name: true,
          email: true,
          employer: true,
          proofOfIdPath: true,
          status: true,
          appliedDate: true
        }
      });
      expect(result).toEqual(mockApplication);
    });

    it("should return null when application not found", async () => {
      vi.mocked(prisma.mediaApplication.findUnique).mockResolvedValue(null);

      const result = await getApplicationById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("updateApplicationStatus", () => {
    it("should update application status", async () => {
      const mockUpdated = {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        employer: "BBC",
        proofOfIdPath: "/path/to/file.pdf",
        status: APPLICATION_STATUS.APPROVED,
        appliedDate: new Date("2024-01-01")
      };

      vi.mocked(prisma.mediaApplication.update).mockResolvedValue(mockUpdated);

      const result = await updateApplicationStatus("1", APPLICATION_STATUS.APPROVED);

      expect(prisma.mediaApplication.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: {
          status: APPLICATION_STATUS.APPROVED
        },
        select: {
          id: true,
          name: true,
          email: true,
          employer: true,
          proofOfIdPath: true,
          status: true,
          appliedDate: true
        }
      });
      expect(result).toEqual(mockUpdated);
    });
  });

  describe("getPendingCount", () => {
    it("should return count of pending applications", async () => {
      vi.mocked(prisma.mediaApplication.count).mockResolvedValue(5);

      const result = await getPendingCount();

      expect(prisma.mediaApplication.count).toHaveBeenCalledWith({
        where: { status: APPLICATION_STATUS.PENDING }
      });
      expect(result).toBe(5);
    });

    it("should return 0 when no pending applications", async () => {
      vi.mocked(prisma.mediaApplication.count).mockResolvedValue(0);

      const result = await getPendingCount();

      expect(result).toBe(0);
    });
  });
});
