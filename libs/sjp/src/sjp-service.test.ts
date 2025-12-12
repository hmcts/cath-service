import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SjpCasePress, SjpCasePublic, SjpListMetadata } from "./sjp-service.js";
import { getLatestSjpLists, getSjpListById, getSjpPressCases, getSjpPublicCases, getUniquePostcodes, getUniqueProsecutors } from "./sjp-service.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    sjpList: {
      findMany: vi.fn(),
      findUnique: vi.fn()
    },
    sjpCase: {
      findMany: vi.fn(),
      count: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres";

describe("getLatestSjpLists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return latest SJP lists", async () => {
    const mockLists: SjpListMetadata[] = [
      {
        listId: "list-1",
        listType: "public",
        generatedAt: new Date("2025-11-28T09:00:00Z"),
        publishedAt: new Date("2025-11-28T09:05:00Z"),
        contentDate: new Date("2025-11-28"),
        caseCount: 100,
        locationId: 1
      },
      {
        listId: "list-2",
        listType: "press",
        generatedAt: new Date("2025-11-27T09:00:00Z"),
        publishedAt: new Date("2025-11-27T09:05:00Z"),
        contentDate: new Date("2025-11-27"),
        caseCount: 50,
        locationId: 1
      }
    ];

    vi.mocked(prisma.sjpList.findMany).mockResolvedValue(mockLists as never);

    const result = await getLatestSjpLists();

    expect(result).toEqual(mockLists);
    expect(prisma.sjpList.findMany).toHaveBeenCalledWith({
      orderBy: { publishedAt: "desc" },
      take: 10,
      select: {
        listId: true,
        listType: true,
        generatedAt: true,
        publishedAt: true,
        contentDate: true,
        caseCount: true,
        locationId: true
      }
    });
  });
});

describe("getSjpListById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return SJP list by ID", async () => {
    const mockList: SjpListMetadata = {
      listId: "list-1",
      listType: "public",
      generatedAt: new Date("2025-11-28T09:00:00Z"),
      publishedAt: new Date("2025-11-28T09:05:00Z"),
      contentDate: new Date("2025-11-28"),
      caseCount: 100,
      locationId: 1
    };

    vi.mocked(prisma.sjpList.findUnique).mockResolvedValue(mockList as never);

    const result = await getSjpListById("list-1");

    expect(result).toEqual(mockList);
    expect(prisma.sjpList.findUnique).toHaveBeenCalledWith({
      where: { listId: "list-1" },
      select: {
        listId: true,
        listType: true,
        generatedAt: true,
        publishedAt: true,
        contentDate: true,
        caseCount: true,
        locationId: true
      }
    });
  });

  it("should return null if list not found", async () => {
    vi.mocked(prisma.sjpList.findUnique).mockResolvedValue(null);

    const result = await getSjpListById("nonexistent");

    expect(result).toBeNull();
  });
});

describe("getSjpPublicCases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return public cases with pagination", async () => {
    const mockCases: SjpCasePublic[] = [
      {
        caseId: "case-1",
        name: "John Doe",
        postcode: "SW1A 1AA",
        offence: "Speeding",
        prosecutor: "CPS"
      }
    ];

    vi.mocked(prisma.sjpCase.findMany).mockResolvedValue(mockCases as never);
    vi.mocked(prisma.sjpCase.count).mockResolvedValue(1);

    const result = await getSjpPublicCases("list-1", {}, 1);

    expect(result.cases).toEqual(mockCases);
    expect(result.totalCases).toBe(1);
    expect(prisma.sjpCase.findMany).toHaveBeenCalledWith({
      where: { listId: "list-1" },
      select: {
        caseId: true,
        name: true,
        postcode: true,
        offence: true,
        prosecutor: true
      },
      orderBy: { name: "asc" },
      skip: 0,
      take: 50
    });
  });

  it("should apply search filter", async () => {
    vi.mocked(prisma.sjpCase.findMany).mockResolvedValue([]);
    vi.mocked(prisma.sjpCase.count).mockResolvedValue(0);

    await getSjpPublicCases("list-1", { searchQuery: "John" }, 1);

    expect(prisma.sjpCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          listId: "list-1",
          OR: [{ name: { contains: "John", mode: "insensitive" } }, { reference: { contains: "John", mode: "insensitive" } }]
        }
      })
    );
  });

  it("should apply postcode filter", async () => {
    vi.mocked(prisma.sjpCase.findMany).mockResolvedValue([]);
    vi.mocked(prisma.sjpCase.count).mockResolvedValue(0);

    await getSjpPublicCases("list-1", { postcode: "SW1A" }, 1);

    expect(prisma.sjpCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          listId: "list-1",
          postcode: { startsWith: "SW1A", mode: "insensitive" }
        }
      })
    );
  });

  it("should apply prosecutor filter", async () => {
    vi.mocked(prisma.sjpCase.findMany).mockResolvedValue([]);
    vi.mocked(prisma.sjpCase.count).mockResolvedValue(0);

    await getSjpPublicCases("list-1", { prosecutor: "CPS" }, 1);

    expect(prisma.sjpCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          listId: "list-1",
          prosecutor: "CPS"
        }
      })
    );
  });

  it("should handle pagination correctly", async () => {
    vi.mocked(prisma.sjpCase.findMany).mockResolvedValue([]);
    vi.mocked(prisma.sjpCase.count).mockResolvedValue(0);

    await getSjpPublicCases("list-1", {}, 3);

    expect(prisma.sjpCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 100,
        take: 50
      })
    );
  });
});

describe("getSjpPressCases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return press cases with all fields", async () => {
    const mockCases: SjpCasePress[] = [
      {
        caseId: "case-1",
        name: "John Doe",
        postcode: "SW1A 1AA",
        offence: "Speeding",
        prosecutor: "CPS",
        dateOfBirth: new Date("1990-01-01"),
        reference: "REF123",
        address: "123 Test Street",
        reportingRestriction: false
      }
    ];

    vi.mocked(prisma.sjpCase.findMany).mockResolvedValue(mockCases as never);
    vi.mocked(prisma.sjpCase.count).mockResolvedValue(1);

    const result = await getSjpPressCases("list-1", {}, 1);

    expect(result.cases).toEqual(mockCases);
    expect(result.totalCases).toBe(1);
  });
});

describe("getUniqueProsecutors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return unique prosecutors", async () => {
    const mockProsecutors = [{ prosecutor: "CPS" }, { prosecutor: "DVLA" }, { prosecutor: "TV Licensing" }];

    vi.mocked(prisma.sjpCase.findMany).mockResolvedValue(mockProsecutors as never);

    const result = await getUniqueProsecutors("list-1");

    expect(result).toEqual(["CPS", "DVLA", "TV Licensing"]);
    expect(prisma.sjpCase.findMany).toHaveBeenCalledWith({
      where: { listId: "list-1", prosecutor: { not: null } },
      select: { prosecutor: true },
      distinct: ["prosecutor"],
      orderBy: { prosecutor: "asc" }
    });
  });

  it("should filter out null prosecutors", async () => {
    const mockProsecutors = [{ prosecutor: "CPS" }, { prosecutor: null }];

    vi.mocked(prisma.sjpCase.findMany).mockResolvedValue(mockProsecutors as never);

    const result = await getUniqueProsecutors("list-1");

    expect(result).toEqual(["CPS"]);
  });
});

describe("getUniquePostcodes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return unique postcodes", async () => {
    const mockPostcodes = [{ postcode: "BS8" }, { postcode: "NE1" }, { postcode: "M1" }];

    vi.mocked(prisma.sjpCase.findMany).mockResolvedValue(mockPostcodes as never);

    const result = await getUniquePostcodes("list-1");

    expect(result).toEqual(["BS8", "NE1", "M1"]);
    expect(prisma.sjpCase.findMany).toHaveBeenCalledWith({
      where: { listId: "list-1", postcode: { not: null } },
      select: { postcode: true },
      distinct: ["postcode"],
      orderBy: { postcode: "asc" }
    });
  });

  it("should filter out null postcodes", async () => {
    const mockPostcodes = [{ postcode: "BS8" }, { postcode: null }];

    vi.mocked(prisma.sjpCase.findMany).mockResolvedValue(mockPostcodes as never);

    const result = await getUniquePostcodes("list-1");

    expect(result).toEqual(["BS8"]);
  });
});
