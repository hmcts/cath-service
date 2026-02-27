import { prisma } from "@hmcts/postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createArtefactSearch,
  deleteArtefactSearchByArtefactId,
  findAllArtefactSearchByArtefactId,
  findArtefactSearchByArtefactId,
  findByCaseName,
  findByCaseNumber
} from "./artefact-search-queries.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    artefactSearch: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));

describe("artefact-search-queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createArtefactSearch", () => {
    it("should create artefact search with all fields", async () => {
      const mockArtefactSearch = {
        id: "search-1",
        artefactId: "art-123",
        caseNumber: "CASE456",
        caseName: "Test Case",
        createdAt: new Date()
      };

      vi.mocked(prisma.artefactSearch.create).mockResolvedValue(mockArtefactSearch);

      const result = await createArtefactSearch("art-123", "CASE456", "Test Case");

      expect(prisma.artefactSearch.create).toHaveBeenCalledWith({
        data: {
          artefactId: "art-123",
          caseNumber: "CASE456",
          caseName: "Test Case"
        }
      });
      expect(result).toEqual(mockArtefactSearch);
    });

    it("should create artefact search with null case number", async () => {
      const mockArtefactSearch = {
        id: "search-1",
        artefactId: "art-123",
        caseNumber: null,
        caseName: "Test Case",
        createdAt: new Date()
      };

      vi.mocked(prisma.artefactSearch.create).mockResolvedValue(mockArtefactSearch);

      const result = await createArtefactSearch("art-123", null, "Test Case");

      expect(prisma.artefactSearch.create).toHaveBeenCalledWith({
        data: {
          artefactId: "art-123",
          caseNumber: null,
          caseName: "Test Case"
        }
      });
      expect(result).toEqual(mockArtefactSearch);
    });

    it("should create artefact search with null case name", async () => {
      const mockArtefactSearch = {
        id: "search-1",
        artefactId: "art-123",
        caseNumber: "CASE456",
        caseName: null,
        createdAt: new Date()
      };

      vi.mocked(prisma.artefactSearch.create).mockResolvedValue(mockArtefactSearch);

      const result = await createArtefactSearch("art-123", "CASE456", null);

      expect(prisma.artefactSearch.create).toHaveBeenCalledWith({
        data: {
          artefactId: "art-123",
          caseNumber: "CASE456",
          caseName: null
        }
      });
      expect(result).toEqual(mockArtefactSearch);
    });

    it("should create artefact search with both case fields null", async () => {
      const mockArtefactSearch = {
        id: "search-1",
        artefactId: "art-123",
        caseNumber: null,
        caseName: null,
        createdAt: new Date()
      };

      vi.mocked(prisma.artefactSearch.create).mockResolvedValue(mockArtefactSearch);

      const result = await createArtefactSearch("art-123", null, null);

      expect(prisma.artefactSearch.create).toHaveBeenCalledWith({
        data: {
          artefactId: "art-123",
          caseNumber: null,
          caseName: null
        }
      });
      expect(result).toEqual(mockArtefactSearch);
    });
  });

  describe("findArtefactSearchByArtefactId", () => {
    it("should find first artefact search by artefact ID", async () => {
      const mockArtefactSearch = {
        id: "search-1",
        artefactId: "art-123",
        caseNumber: "CASE456",
        caseName: "Test Case",
        createdAt: new Date()
      };

      vi.mocked(prisma.artefactSearch.findFirst).mockResolvedValue(mockArtefactSearch);

      const result = await findArtefactSearchByArtefactId("art-123");

      expect(prisma.artefactSearch.findFirst).toHaveBeenCalledWith({
        where: { artefactId: "art-123" }
      });
      expect(result).toEqual(mockArtefactSearch);
    });

    it("should return null when artefact search not found", async () => {
      vi.mocked(prisma.artefactSearch.findFirst).mockResolvedValue(null);

      const result = await findArtefactSearchByArtefactId("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("findAllArtefactSearchByArtefactId", () => {
    it("should find all artefact searches by artefact ID", async () => {
      const mockArtefactSearches = [
        {
          id: "search-1",
          artefactId: "art-123",
          caseNumber: "CASE456",
          caseName: "Test Case 1",
          createdAt: new Date()
        },
        {
          id: "search-2",
          artefactId: "art-123",
          caseNumber: "CASE789",
          caseName: "Test Case 2",
          createdAt: new Date()
        }
      ];

      vi.mocked(prisma.artefactSearch.findMany).mockResolvedValue(mockArtefactSearches);

      const result = await findAllArtefactSearchByArtefactId("art-123");

      expect(prisma.artefactSearch.findMany).toHaveBeenCalledWith({
        where: { artefactId: "art-123" }
      });
      expect(result).toEqual(mockArtefactSearches);
    });

    it("should return empty array when no artefact searches found", async () => {
      vi.mocked(prisma.artefactSearch.findMany).mockResolvedValue([]);

      const result = await findAllArtefactSearchByArtefactId("non-existent");

      expect(result).toEqual([]);
    });

    it("should find single artefact search in array", async () => {
      const mockArtefactSearches = [
        {
          id: "search-1",
          artefactId: "art-123",
          caseNumber: "CASE456",
          caseName: "Test Case",
          createdAt: new Date()
        }
      ];

      vi.mocked(prisma.artefactSearch.findMany).mockResolvedValue(mockArtefactSearches);

      const result = await findAllArtefactSearchByArtefactId("art-123");

      expect(result).toHaveLength(1);
      expect(result[0].artefactId).toBe("art-123");
    });
  });

  describe("deleteArtefactSearchByArtefactId", () => {
    it("should delete all artefact searches by artefact ID", async () => {
      const mockDeleteResult = { count: 2 };

      vi.mocked(prisma.artefactSearch.deleteMany).mockResolvedValue(mockDeleteResult);

      const result = await deleteArtefactSearchByArtefactId("art-123");

      expect(prisma.artefactSearch.deleteMany).toHaveBeenCalledWith({
        where: { artefactId: "art-123" }
      });
      expect(result).toEqual(mockDeleteResult);
    });

    it("should return zero count when no artefact searches found to delete", async () => {
      const mockDeleteResult = { count: 0 };

      vi.mocked(prisma.artefactSearch.deleteMany).mockResolvedValue(mockDeleteResult);

      const result = await deleteArtefactSearchByArtefactId("non-existent");

      expect(result.count).toBe(0);
    });

    it("should delete single artefact search", async () => {
      const mockDeleteResult = { count: 1 };

      vi.mocked(prisma.artefactSearch.deleteMany).mockResolvedValue(mockDeleteResult);

      const result = await deleteArtefactSearchByArtefactId("art-123");

      expect(result.count).toBe(1);
    });
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
