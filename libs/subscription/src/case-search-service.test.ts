import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchByCaseName, searchByCaseReference } from "./case-search-service.js";

vi.mock("@hmcts/publication", () => ({
  findByCaseName: vi.fn(),
  findByCaseNumber: vi.fn()
}));

const { findByCaseName, findByCaseNumber } = await import("@hmcts/publication");

describe("case-search-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchByCaseName", () => {
    it("should return search results when cases are found", async () => {
      const mockResults = [
        {
          id: "1",
          artefactId: "art-1",
          caseNumber: "CASE123",
          caseName: "Test Case Name",
          createdAt: new Date("2024-01-01")
        },
        {
          id: "2",
          artefactId: "art-2",
          caseNumber: "CASE456",
          caseName: "Another Test Case",
          createdAt: new Date("2024-01-02")
        }
      ];

      vi.mocked(findByCaseName).mockResolvedValue(mockResults);

      const result = await searchByCaseName("Test");

      expect(findByCaseName).toHaveBeenCalledWith("Test");
      expect(result).toEqual([
        {
          id: "1",
          artefactId: "art-1",
          caseNumber: "CASE123",
          caseName: "Test Case Name"
        },
        {
          id: "2",
          artefactId: "art-2",
          caseNumber: "CASE456",
          caseName: "Another Test Case"
        }
      ]);
    });

    it("should trim whitespace from case name", async () => {
      vi.mocked(findByCaseName).mockResolvedValue([]);

      await searchByCaseName("  Test Case  ");

      expect(findByCaseName).toHaveBeenCalledWith("Test Case");
    });

    it("should throw error when case name is empty", async () => {
      await expect(searchByCaseName("")).rejects.toThrow("Case name is required");
    });

    it("should throw error when case name is whitespace only", async () => {
      await expect(searchByCaseName("   ")).rejects.toThrow("Case name is required");
    });

    it("should return empty array when no results found", async () => {
      vi.mocked(findByCaseName).mockResolvedValue([]);

      const result = await searchByCaseName("Nonexistent");

      expect(result).toEqual([]);
    });
  });

  describe("searchByCaseReference", () => {
    it("should return search results when case reference is found", async () => {
      const mockResults = [
        {
          id: "1",
          artefactId: "art-1",
          caseNumber: "CASE123",
          caseName: "Test Case",
          createdAt: new Date("2024-01-01")
        }
      ];

      vi.mocked(findByCaseNumber).mockResolvedValue(mockResults);

      const result = await searchByCaseReference("CASE123");

      expect(findByCaseNumber).toHaveBeenCalledWith("CASE123");
      expect(result).toEqual([
        {
          id: "1",
          artefactId: "art-1",
          caseNumber: "CASE123",
          caseName: "Test Case"
        }
      ]);
    });

    it("should trim whitespace from case reference", async () => {
      vi.mocked(findByCaseNumber).mockResolvedValue([]);

      await searchByCaseReference("  CASE123  ");

      expect(findByCaseNumber).toHaveBeenCalledWith("CASE123");
    });

    it("should throw error when case reference is empty", async () => {
      await expect(searchByCaseReference("")).rejects.toThrow("Case reference is required");
    });

    it("should throw error when case reference is whitespace only", async () => {
      await expect(searchByCaseReference("   ")).rejects.toThrow("Case reference is required");
    });

    it("should return empty array when no results found", async () => {
      vi.mocked(findByCaseNumber).mockResolvedValue([]);

      const result = await searchByCaseReference("NONEXISTENT");

      expect(result).toEqual([]);
    });

    it("should handle null case name in results", async () => {
      const mockResults = [
        {
          id: "1",
          artefactId: "art-1",
          caseNumber: "CASE123",
          caseName: null,
          createdAt: new Date("2024-01-01")
        }
      ];

      vi.mocked(findByCaseNumber).mockResolvedValue(mockResults);

      const result = await searchByCaseReference("CASE123");

      expect(result).toEqual([
        {
          id: "1",
          artefactId: "art-1",
          caseNumber: "CASE123",
          caseName: null
        }
      ]);
    });
  });
});
