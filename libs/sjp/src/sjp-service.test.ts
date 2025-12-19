import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SjpJson } from "./json-parser.js";
import { determineListType, extractCaseCount, extractPressCases } from "./json-parser.js";
import type { SjpCasePress, SjpListMetadata } from "./sjp-service.js";
import { getLatestSjpLists, getSjpListById, getSjpPressCases, getSjpPublicCases, getUniquePostcodes, getUniqueProsecutors } from "./sjp-service.js";

vi.mock("node:fs/promises");
vi.mock("./json-parser.js");
vi.mock("@hmcts/postgres", () => ({
  prisma: {
    artefact: {
      findMany: vi.fn(),
      findUnique: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres";

const mockSjpJson: SjpJson = {
  document: {
    publicationDate: "2025-11-28T09:00:00Z"
  },
  courtLists: []
};

const mockPressCases: SjpCasePress[] = [
  {
    caseId: "case-1",
    name: "John Doe",
    postcode: "SW1A",
    prosecutor: "CPS",
    dateOfBirth: new Date("1990-01-01"),
    age: 35,
    reference: "REF123",
    address: "123 Test Street, London",
    offences: [
      {
        offenceTitle: "Speeding",
        offenceWording: "Exceeded speed limit",
        reportingRestriction: false
      }
    ]
  },
  {
    caseId: "case-2",
    name: "Jane Smith",
    postcode: "M1",
    prosecutor: "DVLA",
    dateOfBirth: new Date("1985-05-15"),
    age: 40,
    reference: "REF456",
    address: "456 Test Road, Manchester",
    offences: [
      {
        offenceTitle: "No TV License",
        offenceWording: null,
        reportingRestriction: false
      }
    ]
  }
];

describe("getLatestSjpLists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return latest SJP lists from artefacts", async () => {
    const mockArtefacts = [
      {
        artefactId: "list-1",
        listTypeId: 10,
        lastReceivedDate: new Date("2025-11-28"),
        contentDate: new Date("2025-11-28"),
        locationId: "1"
      },
      {
        artefactId: "list-2",
        listTypeId: 9,
        lastReceivedDate: new Date("2025-11-27"),
        contentDate: new Date("2025-11-27"),
        locationId: "2"
      }
    ];

    vi.mocked(prisma.artefact.findMany).mockResolvedValue(mockArtefacts as never);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockSjpJson));
    vi.mocked(determineListType).mockReturnValue("public");
    vi.mocked(extractCaseCount).mockReturnValue(100);

    const result = await getLatestSjpLists();

    expect(result).toHaveLength(2);
    expect(result[0].artefactId).toBe("list-1");
    expect(result[0].listType).toBe("public");
    expect(result[0].caseCount).toBe(100);
    expect(result[1].artefactId).toBe("list-2");

    expect(prisma.artefact.findMany).toHaveBeenCalledWith({
      where: {
        listTypeId: { in: [9, 10] }
      },
      orderBy: { lastReceivedDate: "desc" },
      take: 10
    });
  });

  it("should filter out artefacts with read errors", async () => {
    const mockArtefacts = [
      {
        artefactId: "list-1",
        listTypeId: 10,
        lastReceivedDate: new Date("2025-11-28"),
        contentDate: new Date("2025-11-28"),
        locationId: "1"
      },
      {
        artefactId: "list-2",
        listTypeId: 9,
        lastReceivedDate: new Date("2025-11-27"),
        contentDate: new Date("2025-11-27"),
        locationId: "2"
      }
    ];

    vi.mocked(prisma.artefact.findMany).mockResolvedValue(mockArtefacts as never);
    vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(mockSjpJson)).mockRejectedValueOnce(new Error("File not found"));
    vi.mocked(determineListType).mockReturnValue("public");
    vi.mocked(extractCaseCount).mockReturnValue(100);

    const result = await getLatestSjpLists();

    expect(result).toHaveLength(1);
    expect(result[0].artefactId).toBe("list-1");
  });
});

describe("getSjpListById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return SJP list metadata by artefact ID", async () => {
    const mockArtefact = {
      artefactId: "list-1",
      listTypeId: 10,
      contentDate: new Date("2025-11-28"),
      locationId: "1"
    };

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact as never);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockSjpJson));
    vi.mocked(determineListType).mockReturnValue("public");
    vi.mocked(extractCaseCount).mockReturnValue(100);

    const result = await getSjpListById("list-1");

    expect(result).not.toBeNull();
    expect(result?.artefactId).toBe("list-1");
    expect(result?.listType).toBe("public");
    expect(result?.caseCount).toBe(100);
    expect(result?.locationId).toBe(1);

    expect(prisma.artefact.findUnique).toHaveBeenCalledWith({
      where: { artefactId: "list-1" }
    });
  });

  it("should return null if artefact not found", async () => {
    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);

    const result = await getSjpListById("nonexistent");

    expect(result).toBeNull();
  });

  it("should return null if JSON read fails", async () => {
    const mockArtefact = {
      artefactId: "list-1",
      listTypeId: 10,
      contentDate: new Date("2025-11-28"),
      locationId: "1"
    };

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact as never);
    vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

    const result = await getSjpListById("list-1");

    expect(result).toBeNull();
  });
});

describe("getSjpPublicCases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return public cases with pagination", async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockSjpJson));
    vi.mocked(extractPressCases).mockReturnValue(mockPressCases);

    const result = await getSjpPublicCases("list-1", {}, 1);

    expect(result.cases).toHaveLength(2);
    expect(result.totalCases).toBe(2);
    expect(result.cases[0]).toEqual({
      caseId: "case-2",
      name: "Jane Smith",
      postcode: "M1",
      offence: "No TV License",
      prosecutor: "DVLA"
    });
    expect(result.cases[1]).toEqual({
      caseId: "case-1",
      name: "John Doe",
      postcode: "SW1A",
      offence: "Speeding",
      prosecutor: "CPS"
    });
  });

  it("should apply search filter by name", async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockSjpJson));
    vi.mocked(extractPressCases).mockReturnValue(mockPressCases);

    const result = await getSjpPublicCases("list-1", { searchQuery: "john" }, 1);

    expect(result.cases).toHaveLength(1);
    expect(result.cases[0].name).toBe("John Doe");
  });

  it("should apply search filter by reference", async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockSjpJson));
    vi.mocked(extractPressCases).mockReturnValue(mockPressCases);

    const result = await getSjpPublicCases("list-1", { searchQuery: "ref123" }, 1);

    expect(result.cases).toHaveLength(1);
    expect(result.cases[0].name).toBe("John Doe");
  });

  it("should apply postcode filter", async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockSjpJson));
    vi.mocked(extractPressCases).mockReturnValue(mockPressCases);

    const result = await getSjpPublicCases("list-1", { postcode: "SW" }, 1);

    expect(result.cases).toHaveLength(1);
    expect(result.cases[0].postcode).toBe("SW1A");
  });

  it("should filter London postcodes", async () => {
    const londonCases: SjpCasePress[] = [
      { ...mockPressCases[0], postcode: "E1" },
      { ...mockPressCases[1], postcode: "M1" }
    ];

    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockSjpJson));
    vi.mocked(extractPressCases).mockReturnValue(londonCases);

    const result = await getSjpPublicCases("list-1", { postcode: "LONDON_POSTCODES" }, 1);

    expect(result.cases).toHaveLength(1);
    expect(result.cases[0].postcode).toBe("E1");
  });

  it("should apply prosecutor filter", async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockSjpJson));
    vi.mocked(extractPressCases).mockReturnValue(mockPressCases);

    const result = await getSjpPublicCases("list-1", { prosecutor: "CPS" }, 1);

    expect(result.cases).toHaveLength(1);
    expect(result.cases[0].prosecutor).toBe("CPS");
  });

  it("should handle pagination correctly", async () => {
    const manyCases: SjpCasePress[] = Array.from({ length: 250 }, (_, i) => ({
      ...mockPressCases[0],
      caseId: `case-${i}`,
      name: `Person ${i}`
    }));

    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockSjpJson));
    vi.mocked(extractPressCases).mockReturnValue(manyCases);

    const page1 = await getSjpPublicCases("list-1", {}, 1);
    expect(page1.cases).toHaveLength(200);
    expect(page1.totalCases).toBe(250);

    const page2 = await getSjpPublicCases("list-1", {}, 2);
    expect(page2.cases).toHaveLength(50);
    expect(page2.totalCases).toBe(250);
  });

  it("should sort by name ascending by default", async () => {
    const unsortedCases: SjpCasePress[] = [
      { ...mockPressCases[0], name: "Zoe Brown" },
      { ...mockPressCases[1], name: "Alice Smith" }
    ];

    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockSjpJson));
    vi.mocked(extractPressCases).mockReturnValue(unsortedCases);

    const result = await getSjpPublicCases("list-1", {}, 1);

    expect(result.cases[0].name).toBe("Alice Smith");
    expect(result.cases[1].name).toBe("Zoe Brown");
  });

  it("should sort by name descending", async () => {
    const unsortedCases: SjpCasePress[] = [
      { ...mockPressCases[0], name: "Alice Smith" },
      { ...mockPressCases[1], name: "Zoe Brown" }
    ];

    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockSjpJson));
    vi.mocked(extractPressCases).mockReturnValue(unsortedCases);

    const result = await getSjpPublicCases("list-1", {}, 1, "name", "desc");

    expect(result.cases[0].name).toBe("Zoe Brown");
    expect(result.cases[1].name).toBe("Alice Smith");
  });
});

describe("getSjpPressCases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return press cases with all fields", async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockSjpJson));
    vi.mocked(extractPressCases).mockReturnValue(mockPressCases);

    const result = await getSjpPressCases("list-1", {}, 1);

    expect(result.cases).toHaveLength(2);
    expect(result.totalCases).toBe(2);
    expect(result.cases[0]).toEqual(mockPressCases[0]);
    expect(result.cases[0].dateOfBirth).toBeDefined();
    expect(result.cases[0].address).toBeDefined();
  });

  it("should apply filters to press cases", async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockSjpJson));
    vi.mocked(extractPressCases).mockReturnValue(mockPressCases);

    const result = await getSjpPressCases("list-1", { searchQuery: "john" }, 1);

    expect(result.cases).toHaveLength(1);
    expect(result.cases[0].name).toBe("John Doe");
  });

  it("should sort press cases by name", async () => {
    const unsortedCases: SjpCasePress[] = [
      { ...mockPressCases[0], name: "Zoe Brown" },
      { ...mockPressCases[1], name: "Alice Smith" }
    ];

    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockSjpJson));
    vi.mocked(extractPressCases).mockReturnValue(unsortedCases);

    const result = await getSjpPressCases("list-1", {}, 1);

    expect(result.cases[0].name).toBe("Alice Smith");
    expect(result.cases[1].name).toBe("Zoe Brown");
  });
});

describe("getUniqueProsecutors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return unique prosecutors sorted", async () => {
    const casesWithProsecutors: SjpCasePress[] = [
      { ...mockPressCases[0], prosecutor: "CPS" },
      { ...mockPressCases[1], prosecutor: "DVLA" },
      { ...mockPressCases[0], prosecutor: "CPS" }
    ];

    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockSjpJson));
    vi.mocked(extractPressCases).mockReturnValue(casesWithProsecutors);

    const result = await getUniqueProsecutors("list-1");

    expect(result).toEqual(["CPS", "DVLA"]);
  });

  it("should filter out null prosecutors", async () => {
    const casesWithNulls: SjpCasePress[] = [
      { ...mockPressCases[0], prosecutor: "CPS" },
      { ...mockPressCases[1], prosecutor: null }
    ];

    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockSjpJson));
    vi.mocked(extractPressCases).mockReturnValue(casesWithNulls);

    const result = await getUniqueProsecutors("list-1");

    expect(result).toEqual(["CPS"]);
  });
});

describe("getUniquePostcodes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return unique postcodes sorted", async () => {
    const casesWithPostcodes: SjpCasePress[] = [
      { ...mockPressCases[0], postcode: "M1" },
      { ...mockPressCases[1], postcode: "BS8" },
      { ...mockPressCases[0], postcode: "M1" }
    ];

    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockSjpJson));
    vi.mocked(extractPressCases).mockReturnValue(casesWithPostcodes);

    const result = await getUniquePostcodes("list-1");

    expect(result.postcodes).toEqual(["BS8", "M1"]);
    expect(result.hasLondonPostcodes).toBe(false);
  });

  it("should filter out null postcodes", async () => {
    const casesWithNulls: SjpCasePress[] = [
      { ...mockPressCases[0], postcode: "M1" },
      { ...mockPressCases[1], postcode: null }
    ];

    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockSjpJson));
    vi.mocked(extractPressCases).mockReturnValue(casesWithNulls);

    const result = await getUniquePostcodes("list-1");

    expect(result.postcodes).toEqual(["M1"]);
  });

  it("should identify London postcodes", async () => {
    const casesWithLondon: SjpCasePress[] = [
      { ...mockPressCases[0], postcode: "E1" },
      { ...mockPressCases[1], postcode: "SW1A" },
      { ...mockPressCases[0], postcode: "M1" }
    ];

    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockSjpJson));
    vi.mocked(extractPressCases).mockReturnValue(casesWithLondon);

    const result = await getUniquePostcodes("list-1");

    expect(result.hasLondonPostcodes).toBe(true);
    expect(result.londonPostcodes).toEqual(["E1", "SW1A"]);
    expect(result.postcodes).toEqual(["E1", "M1", "SW1A"]);
  });
});
