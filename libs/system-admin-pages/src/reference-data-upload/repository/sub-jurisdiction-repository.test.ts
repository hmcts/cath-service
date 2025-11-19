import { prisma } from "@hmcts/postgres";
import { describe, expect, it, vi } from "vitest";
import {
  checkSubJurisdictionExistsInJurisdiction,
  createSubJurisdiction,
  getAllJurisdictions,
  getMaxSubJurisdictionId
} from "./sub-jurisdiction-repository.js";

const { mockCreate, mockQueryRaw } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockQueryRaw: vi.fn()
}));

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    subJurisdiction: {
      findFirst: vi.fn(),
      create: mockCreate
    },
    jurisdiction: {
      findMany: vi.fn()
    },
    $transaction: vi.fn(async (callback: any) => {
      const tx = {
        subJurisdiction: {
          create: mockCreate
        },
        $queryRaw: mockQueryRaw
      };
      return await callback(tx);
    })
  }
}));

describe("getMaxSubJurisdictionId", () => {
  it("should return the highest sub-jurisdiction ID", async () => {
    vi.mocked(prisma.subJurisdiction.findFirst).mockResolvedValue({
      subJurisdictionId: 10,
      name: "Test",
      welshName: "Test",
      jurisdictionId: 1
    } as any);

    const result = await getMaxSubJurisdictionId();

    expect(result).toBe(10);
    expect(prisma.subJurisdiction.findFirst).toHaveBeenCalledWith({
      orderBy: {
        subJurisdictionId: "desc"
      },
      select: {
        subJurisdictionId: true
      }
    });
  });

  it("should return 0 when no sub-jurisdictions exist", async () => {
    vi.mocked(prisma.subJurisdiction.findFirst).mockResolvedValue(null);

    const result = await getMaxSubJurisdictionId();

    expect(result).toBe(0);
  });
});

describe("getAllJurisdictions", () => {
  it("should return formatted jurisdiction list", async () => {
    vi.mocked(prisma.jurisdiction.findMany).mockResolvedValue([
      {
        jurisdictionId: 1,
        name: "Civil"
      },
      {
        jurisdictionId: 2,
        name: "Family"
      }
    ] as any);

    const result = await getAllJurisdictions();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      jurisdictionId: 1,
      displayName: "Civil"
    });
    expect(result[1]).toEqual({
      jurisdictionId: 2,
      displayName: "Family"
    });
  });

  it("should return empty array when no jurisdictions exist", async () => {
    vi.mocked(prisma.jurisdiction.findMany).mockResolvedValue([]);

    const result = await getAllJurisdictions();

    expect(result).toHaveLength(0);
  });
});

describe("checkSubJurisdictionExistsInJurisdiction", () => {
  it("should return true for both when names exist in jurisdiction", async () => {
    vi.mocked(prisma.subJurisdiction.findFirst)
      .mockResolvedValueOnce({
        subJurisdictionId: 1,
        name: "Civil Court",
        welshName: "Llys Sifil",
        jurisdictionId: 1
      } as any)
      .mockResolvedValueOnce({
        subJurisdictionId: 1,
        name: "Civil Court",
        welshName: "Llys Sifil",
        jurisdictionId: 1
      } as any);

    const result = await checkSubJurisdictionExistsInJurisdiction(1, "Civil Court", "Llys Sifil");

    expect(result.nameExists).toBe(true);
    expect(result.welshNameExists).toBe(true);
  });

  it("should return false for both when names do not exist in jurisdiction", async () => {
    vi.mocked(prisma.subJurisdiction.findFirst).mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const result = await checkSubJurisdictionExistsInJurisdiction(1, "New Court", "Llys Newydd");

    expect(result.nameExists).toBe(false);
    expect(result.welshNameExists).toBe(false);
  });

  it("should check within specific jurisdiction only", async () => {
    vi.mocked(prisma.subJurisdiction.findFirst).mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    await checkSubJurisdictionExistsInJurisdiction(2, "Civil Court", "Llys Sifil");

    expect(prisma.subJurisdiction.findFirst).toHaveBeenCalledWith({
      where: {
        jurisdictionId: 2,
        name: {
          equals: "Civil Court",
          mode: "insensitive"
        }
      }
    });
  });

  it("should check case-insensitively", async () => {
    vi.mocked(prisma.subJurisdiction.findFirst).mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    await checkSubJurisdictionExistsInJurisdiction(1, "CIVIL COURT", "llys sifil");

    expect(prisma.subJurisdiction.findFirst).toHaveBeenCalledWith({
      where: {
        jurisdictionId: 1,
        name: {
          equals: "CIVIL COURT",
          mode: "insensitive"
        }
      }
    });
  });
});

describe("createSubJurisdiction", () => {
  it("should create sub-jurisdiction with auto-incremented ID", async () => {
    mockQueryRaw.mockResolvedValue([{ max: 8 }]);

    mockCreate.mockResolvedValue({
      subJurisdictionId: 9,
      name: "New Court",
      welshName: "Llys Newydd",
      jurisdictionId: 1
    } as any);

    await createSubJurisdiction(1, "New Court", "Llys Newydd");

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        subJurisdictionId: 9,
        jurisdictionId: 1,
        name: "New Court",
        welshName: "Llys Newydd"
      }
    });
  });

  it("should trim whitespace from names", async () => {
    mockQueryRaw.mockResolvedValue([{ max: 8 }]);

    mockCreate.mockResolvedValue({
      subJurisdictionId: 9,
      name: "Test",
      welshName: "Test",
      jurisdictionId: 1
    } as any);

    await createSubJurisdiction(1, "  Test  ", "  Test  ");

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        subJurisdictionId: 9,
        jurisdictionId: 1,
        name: "Test",
        welshName: "Test"
      }
    });
  });

  it("should start from 1 when no sub-jurisdictions exist", async () => {
    mockQueryRaw.mockResolvedValue([{ max: null }]);

    mockCreate.mockResolvedValue({
      subJurisdictionId: 1,
      name: "First",
      welshName: "Cyntaf",
      jurisdictionId: 1
    } as any);

    await createSubJurisdiction(1, "First", "Cyntaf");

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        subJurisdictionId: 1,
        jurisdictionId: 1,
        name: "First",
        welshName: "Cyntaf"
      }
    });
  });
});
