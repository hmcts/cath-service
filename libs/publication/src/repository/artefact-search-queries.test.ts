import { prisma } from "@hmcts/postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { findByCaseName, findByCaseNumber } from "./artefact-search-queries.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    artefactSearch: {
      findMany: vi.fn()
    }
  }
}));

describe("artefact-search-queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findByCaseName", () => {
    it("should search for case name with case-insensitive partial match", async () => {
      const mockResults = [
        {
          id: "1",
          artefactId: "art-1",
          caseNumber: "CASE123",
          caseName: "Test Case Name",
          createdAt: new Date("2024-01-01")
        }
      ];

      vi.mocked(prisma.artefactSearch.findMany).mockResolvedValue(mockResults);

      const result = await findByCaseName("Test");

      expect(prisma.artefactSearch.findMany).toHaveBeenCalledWith({
        where: {
          caseName: {
            contains: "Test",
            mode: "insensitive"
          }
        },
        take: 50,
        orderBy: {
          createdAt: "desc"
        }
      });
      expect(result).toEqual(mockResults);
    });

    it("should limit results to 50", async () => {
      vi.mocked(prisma.artefactSearch.findMany).mockResolvedValue([]);

      await findByCaseName("Common");

      expect(prisma.artefactSearch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50
        })
      );
    });

    it("should order results by createdAt descending", async () => {
      vi.mocked(prisma.artefactSearch.findMany).mockResolvedValue([]);

      await findByCaseName("Test");

      expect(prisma.artefactSearch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            createdAt: "desc"
          }
        })
      );
    });
  });

  describe("findByCaseNumber", () => {
    it("should search for exact case number match", async () => {
      const mockResults = [
        {
          id: "1",
          artefactId: "art-1",
          caseNumber: "CASE123",
          caseName: "Test Case",
          createdAt: new Date("2024-01-01")
        }
      ];

      vi.mocked(prisma.artefactSearch.findMany).mockResolvedValue(mockResults);

      const result = await findByCaseNumber("CASE123");

      expect(prisma.artefactSearch.findMany).toHaveBeenCalledWith({
        where: {
          caseNumber: {
            equals: "CASE123"
          }
        },
        take: 50,
        orderBy: {
          createdAt: "desc"
        }
      });
      expect(result).toEqual(mockResults);
    });

    it("should return empty array when no match found", async () => {
      vi.mocked(prisma.artefactSearch.findMany).mockResolvedValue([]);

      const result = await findByCaseNumber("NONEXISTENT");

      expect(result).toEqual([]);
    });

    it("should limit results to 50", async () => {
      vi.mocked(prisma.artefactSearch.findMany).mockResolvedValue([]);

      await findByCaseNumber("CASE123");

      expect(prisma.artefactSearch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50
        })
      );
    });

    it("should order results by createdAt descending", async () => {
      vi.mocked(prisma.artefactSearch.findMany).mockResolvedValue([]);

      await findByCaseNumber("CASE123");

      expect(prisma.artefactSearch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            createdAt: "desc"
          }
        })
      );
    });
  });
});
