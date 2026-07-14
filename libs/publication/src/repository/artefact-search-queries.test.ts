import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    artefactSearch: {
      create: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";
import { createArtefactSearch, deleteArtefactSearchByArtefactId, findArtefactSearchByArtefactId } from "./artefact-search-queries.js";

describe("createArtefactSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a record with all fields provided", async () => {
    const mockResult = { artefactSearchId: "id-1", artefactId: "art-1", caseNumber: "CASE-001", caseName: "Smith v Jones" };
    vi.mocked(prisma.artefactSearch.create).mockResolvedValue(mockResult as any);

    const result = await createArtefactSearch("art-1", "CASE-001", "Smith v Jones");

    expect(prisma.artefactSearch.create).toHaveBeenCalledWith({
      data: { artefactId: "art-1", caseNumber: "CASE-001", caseName: "Smith v Jones" }
    });
    expect(result).toEqual(mockResult);
  });

  it("should create a record with null caseNumber", async () => {
    const mockResult = { artefactSearchId: "id-2", artefactId: "art-2", caseNumber: null, caseName: "Smith v Jones" };
    vi.mocked(prisma.artefactSearch.create).mockResolvedValue(mockResult as any);

    const result = await createArtefactSearch("art-2", null, "Smith v Jones");

    expect(prisma.artefactSearch.create).toHaveBeenCalledWith({
      data: { artefactId: "art-2", caseNumber: null, caseName: "Smith v Jones" }
    });
    expect(result).toEqual(mockResult);
  });

  it("should create a record with null caseName", async () => {
    const mockResult = { artefactSearchId: "id-3", artefactId: "art-3", caseNumber: "CASE-003", caseName: null };
    vi.mocked(prisma.artefactSearch.create).mockResolvedValue(mockResult as any);

    const result = await createArtefactSearch("art-3", "CASE-003", null);

    expect(prisma.artefactSearch.create).toHaveBeenCalledWith({
      data: { artefactId: "art-3", caseNumber: "CASE-003", caseName: null }
    });
    expect(result).toEqual(mockResult);
  });

  it("should create a record with both optional fields null", async () => {
    const mockResult = { artefactSearchId: "id-4", artefactId: "art-4", caseNumber: null, caseName: null };
    vi.mocked(prisma.artefactSearch.create).mockResolvedValue(mockResult as any);

    await createArtefactSearch("art-4", null, null);

    expect(prisma.artefactSearch.create).toHaveBeenCalledWith({
      data: { artefactId: "art-4", caseNumber: null, caseName: null }
    });
  });

  it("should propagate database errors", async () => {
    vi.mocked(prisma.artefactSearch.create).mockRejectedValue(new Error("DB error"));

    await expect(createArtefactSearch("art-5", "CASE-005", "Test")).rejects.toThrow("DB error");
  });
});

describe("findArtefactSearchByArtefactId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the matching record", async () => {
    const mockResult = { artefactSearchId: "id-1", artefactId: "art-1", caseNumber: "CASE-001", caseName: "Smith v Jones" };
    vi.mocked(prisma.artefactSearch.findFirst).mockResolvedValue(mockResult as any);

    const result = await findArtefactSearchByArtefactId("art-1");

    expect(prisma.artefactSearch.findFirst).toHaveBeenCalledWith({ where: { artefactId: "art-1" } });
    expect(result).toEqual(mockResult);
  });

  it("should return null when no record exists", async () => {
    vi.mocked(prisma.artefactSearch.findFirst).mockResolvedValue(null);

    const result = await findArtefactSearchByArtefactId("unknown");

    expect(prisma.artefactSearch.findFirst).toHaveBeenCalledWith({ where: { artefactId: "unknown" } });
    expect(result).toBeNull();
  });

  it("should return a record with null optional fields", async () => {
    const mockResult = { artefactSearchId: "id-2", artefactId: "art-2", caseNumber: null, caseName: null };
    vi.mocked(prisma.artefactSearch.findFirst).mockResolvedValue(mockResult as any);

    const result = await findArtefactSearchByArtefactId("art-2");

    expect(result).toEqual(mockResult);
  });

  it("should propagate database errors", async () => {
    vi.mocked(prisma.artefactSearch.findFirst).mockRejectedValue(new Error("DB error"));

    await expect(findArtefactSearchByArtefactId("art-1")).rejects.toThrow("DB error");
  });
});

describe("deleteArtefactSearchByArtefactId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete all records for the given artefact ID and return the count", async () => {
    vi.mocked(prisma.artefactSearch.deleteMany).mockResolvedValue({ count: 3 });

    const result = await deleteArtefactSearchByArtefactId("art-1");

    expect(prisma.artefactSearch.deleteMany).toHaveBeenCalledWith({ where: { artefactId: "art-1" } });
    expect(result).toEqual({ count: 3 });
  });

  it("should return zero count when no records exist for the artefact ID", async () => {
    vi.mocked(prisma.artefactSearch.deleteMany).mockResolvedValue({ count: 0 });

    const result = await deleteArtefactSearchByArtefactId("unknown");

    expect(prisma.artefactSearch.deleteMany).toHaveBeenCalledWith({ where: { artefactId: "unknown" } });
    expect(result).toEqual({ count: 0 });
  });

  it("should propagate database errors", async () => {
    vi.mocked(prisma.artefactSearch.deleteMany).mockRejectedValue(new Error("DB error"));

    await expect(deleteArtefactSearchByArtefactId("art-1")).rejects.toThrow("DB error");
  });
});
