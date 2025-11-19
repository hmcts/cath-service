import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAllJurisdictions, getAllLocations, getAllRegions, getAllSubJurisdictions, getLocationById, getSubJurisdictionsByJurisdiction } from "./queries.js";

// Mock Prisma
vi.mock("@hmcts/postgres", () => ({
  prisma: {
    location: {
      findMany: vi.fn(),
      findUnique: vi.fn()
    },
    jurisdiction: {
      findMany: vi.fn()
    },
    region: {
      findMany: vi.fn()
    },
    subJurisdiction: {
      findMany: vi.fn()
    }
  }
}));

const mockLocations = [
  {
    locationId: 1,
    name: "Oxford Combined Court Centre",
    welshName: "Canolfan Llysoedd Cyfun Rhydychen",
    locationRegions: [{ region: { regionId: 3 } }],
    locationSubJurisdictions: [{ subJurisdiction: { subJurisdictionId: 1 } }, { subJurisdiction: { subJurisdictionId: 2 } }]
  },
  {
    locationId: 2,
    name: "Bristol Crown Court",
    welshName: "Llys y Goron Bryste",
    locationRegions: [{ region: { regionId: 3 } }],
    locationSubJurisdictions: [{ subJurisdiction: { subJurisdictionId: 2 } }]
  },
  {
    locationId: 3,
    name: "Cardiff Civil and Family Justice Centre",
    welshName: "Canolfan Gyfiawnder Sifil a Theulu Caerdydd",
    locationRegions: [{ region: { regionId: 5 } }],
    locationSubJurisdictions: [{ subJurisdiction: { subJurisdictionId: 1 } }]
  },
  {
    locationId: 4,
    name: "Leeds Combined Court Centre",
    welshName: "Canolfan Llysoedd Cyfun Leeds",
    locationRegions: [{ region: { regionId: 4 } }],
    locationSubJurisdictions: [{ subJurisdiction: { subJurisdictionId: 1 } }, { subJurisdiction: { subJurisdictionId: 2 } }]
  },
  {
    locationId: 5,
    name: "Liverpool Civil and Family Court",
    welshName: "Llys Sifil a Theulu Lerpwl",
    locationRegions: [{ region: { regionId: 4 } }],
    locationSubJurisdictions: [{ subJurisdiction: { subJurisdictionId: 1 } }]
  },
  {
    locationId: 6,
    name: "Manchester Civil Justice Centre",
    welshName: "Canolfan Cyfiawnder Sifil Manceinion",
    locationRegions: [{ region: { regionId: 4 } }],
    locationSubJurisdictions: [{ subJurisdiction: { subJurisdictionId: 1 } }, { subJurisdiction: { subJurisdictionId: 2 } }]
  },
  {
    locationId: 7,
    name: "Birmingham Civil and Family Justice Centre",
    welshName: "Canolfan Cyfiawnder Sifil a Theulu Birmingham",
    locationRegions: [{ region: { regionId: 2 } }],
    locationSubJurisdictions: [{ subJurisdiction: { subJurisdictionId: 1 } }, { subJurisdiction: { subJurisdictionId: 2 } }]
  },
  {
    locationId: 8,
    name: "Royal Courts of Justice",
    welshName: "Llysoedd Barn Brenhinol",
    locationRegions: [{ region: { regionId: 1 } }],
    locationSubJurisdictions: [{ subJurisdiction: { subJurisdictionId: 1 } }, { subJurisdiction: { subJurisdictionId: 2 } }]
  },
  {
    locationId: 9009,
    name: "Single Justice Procedure",
    welshName: "Gweithdrefn Ynad Unigol",
    locationRegions: [{ region: { regionId: 6 } }],
    locationSubJurisdictions: [{ subJurisdiction: { subJurisdictionId: 3 } }]
  },
  {
    locationId: 10,
    name: "Swansea Civil and Family Justice Centre",
    welshName: "Canolfan Cyfiawnder Sifil a Theulu Abertawe",
    locationRegions: [{ region: { regionId: 5 } }],
    locationSubJurisdictions: [{ subJurisdiction: { subJurisdictionId: 1 } }]
  },
  {
    locationId: 11,
    name: "Cardiff Crown Court",
    welshName: "Llys y Goron Caerdydd",
    locationRegions: [{ region: { regionId: 5 } }],
    locationSubJurisdictions: [{ subJurisdiction: { subJurisdictionId: 2 } }]
  },
  {
    locationId: 12,
    name: "Liverpool Crown Court",
    welshName: "Llys y Goron Lerpwl",
    locationRegions: [{ region: { regionId: 4 } }],
    locationSubJurisdictions: [{ subJurisdiction: { subJurisdictionId: 2 } }]
  },
  {
    locationId: 13,
    name: "Southampton Combined Court Centre",
    welshName: "Canolfan Llysoedd Cyfun Southampton",
    locationRegions: [{ region: { regionId: 3 } }],
    locationSubJurisdictions: [{ subJurisdiction: { subJurisdictionId: 1 } }, { subJurisdiction: { subJurisdictionId: 2 } }]
  }
];

const mockJurisdictions = [
  { jurisdictionId: 1, name: "Civil", welshName: "Sifil" },
  { jurisdictionId: 2, name: "Criminal", welshName: "Troseddol" },
  { jurisdictionId: 3, name: "Family", welshName: "Teulu" },
  { jurisdictionId: 4, name: "Tribunal", welshName: "Tribiwnlys" },
  { jurisdictionId: 5, name: "Magistrates", welshName: "Ynadon" },
  { jurisdictionId: 6, name: "Single Justice", welshName: "Ynad Unigol" }
];

const mockRegions = [
  { regionId: 1, name: "London", welshName: "Llundain" },
  { regionId: 2, name: "Midlands", welshName: "Canolbarth Lloegr" },
  { regionId: 3, name: "South East", welshName: "De-ddwyrain Lloegr" },
  { regionId: 4, name: "North West", welshName: "Gogledd-orllewin Lloegr" },
  { regionId: 5, name: "Wales", welshName: "Cymru" },
  { regionId: 6, name: "National", welshName: "Cenedlaethol" }
];

const mockSubJurisdictions = [
  { subJurisdictionId: 1, name: "Civil Court", welshName: "Llys Sifil", jurisdictionId: 1 },
  { subJurisdictionId: 2, name: "Crown Court", welshName: "Llys y Goron", jurisdictionId: 2 },
  { subJurisdictionId: 3, name: "Magistrates Court", welshName: "Llys Ynadon", jurisdictionId: 5 },
  { subJurisdictionId: 4, name: "Family Court", welshName: "Llys Teulu", jurisdictionId: 3 },
  { subJurisdictionId: 5, name: "Employment Tribunal", welshName: "Tribiwnlys Cyflogaeth", jurisdictionId: 4 },
  { subJurisdictionId: 6, name: "Immigration Tribunal", welshName: "Tribiwnlys Mewnfudo", jurisdictionId: 4 },
  { subJurisdictionId: 7, name: "Social Security Tribunal", welshName: "Tribiwnlys Nawdd Cymdeithasol", jurisdictionId: 4 },
  { subJurisdictionId: 8, name: "Tax Tribunal", welshName: "Tribiwnlys Treth", jurisdictionId: 4 },
  { subJurisdictionId: 9, name: "Mental Health Tribunal", welshName: "Tribiwnlys Iechyd Meddwl", jurisdictionId: 4 },
  { subJurisdictionId: 10, name: "Single Justice Procedure", welshName: "Gweithdrefn Ynad Unigol", jurisdictionId: 6 }
];

// Import mocked prisma
const { prisma } = await import("@hmcts/postgres");

beforeEach(() => {
  vi.clearAllMocks();
  // Setup default mock implementations
  vi.mocked(prisma.location.findMany).mockResolvedValue(mockLocations as any);
  vi.mocked(prisma.location.findUnique).mockImplementation((args: any) => {
    const id = args?.where?.locationId;
    const location = mockLocations.find((loc) => loc.locationId === id);
    return Promise.resolve(location as any);
  });
  vi.mocked(prisma.jurisdiction.findMany).mockResolvedValue(mockJurisdictions as any);
  vi.mocked(prisma.region.findMany).mockResolvedValue(mockRegions as any);
  vi.mocked(prisma.subJurisdiction.findMany).mockImplementation((args: any) => {
    const jurisdictionId = args?.where?.jurisdictionId;
    if (jurisdictionId !== undefined) {
      const filtered = mockSubJurisdictions.filter((sj) => sj.jurisdictionId === jurisdictionId);
      return Promise.resolve(filtered as any);
    }
    return Promise.resolve(mockSubJurisdictions as any);
  });
});

describe("getAllLocations", () => {
  it("should return all locations", async () => {
    const results = await getAllLocations("en");
    expect(results.length).toBe(13);
  });

  it("should return locations sorted alphabetically by name", async () => {
    const results = await getAllLocations("en");

    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].name.localeCompare(results[i + 1].name)).toBeLessThanOrEqual(0);
    }
  });

  it("should return locations sorted alphabetically by Welsh name when language is cy", async () => {
    const results = await getAllLocations("cy");

    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].welshName.localeCompare(results[i + 1].welshName)).toBeLessThanOrEqual(0);
    }
  });

  it("should not mutate original data", async () => {
    const results1 = await getAllLocations("en");
    const results2 = await getAllLocations("en");

    expect(results1).toEqual(results2);
  });
});

describe("getLocationById", () => {
  it("should return location for valid ID", async () => {
    const location = await getLocationById(1);
    expect(location).toBeDefined();
    expect(location?.locationId).toBe(1);
    expect(location?.name).toBe("Oxford Combined Court Centre");
  });

  it("should return undefined for non-existent ID", async () => {
    const location = await getLocationById(999);
    expect(location).toBeUndefined();
  });

  it("should return Single Justice Procedure location", async () => {
    const location = await getLocationById(9009);
    expect(location).toBeDefined();
    expect(location?.name).toBe("Single Justice Procedure");
  });

  it("should return location with all properties", async () => {
    const location = await getLocationById(1);
    expect(location).toBeDefined();
    expect(location).toHaveProperty("locationId");
    expect(location).toHaveProperty("name");
    expect(location).toHaveProperty("welshName");
    expect(location).toHaveProperty("regions");
    expect(location).toHaveProperty("subJurisdictions");
  });
});

describe("getAllJurisdictions", () => {
  it("should return all jurisdictions", async () => {
    const jurisdictions = await getAllJurisdictions();
    expect(jurisdictions.length).toBe(6);
  });

  it("should have correct structure", async () => {
    const jurisdictions = await getAllJurisdictions();
    for (const jurisdiction of jurisdictions) {
      expect(jurisdiction).toHaveProperty("jurisdictionId");
      expect(jurisdiction).toHaveProperty("name");
      expect(jurisdiction).toHaveProperty("welshName");
    }
  });

  it("should include Civil jurisdiction", async () => {
    const jurisdictions = await getAllJurisdictions();
    const civil = jurisdictions.find((j) => j.jurisdictionId === 1);
    expect(civil).toBeDefined();
    expect(civil?.name).toBe("Civil");
  });
});

describe("getAllRegions", () => {
  it("should return all regions", async () => {
    const regions = await getAllRegions();
    expect(regions.length).toBe(6);
  });

  it("should have correct structure", async () => {
    const regions = await getAllRegions();
    for (const region of regions) {
      expect(region).toHaveProperty("regionId");
      expect(region).toHaveProperty("name");
      expect(region).toHaveProperty("welshName");
    }
  });

  it("should include London region", async () => {
    const regions = await getAllRegions();
    const london = regions.find((r) => r.regionId === 1);
    expect(london).toBeDefined();
    expect(london?.name).toBe("London");
  });
});

describe("getAllSubJurisdictions", () => {
  it("should return all sub-jurisdictions", async () => {
    const subJurisdictions = await getAllSubJurisdictions();
    expect(subJurisdictions.length).toBe(10);
  });

  it("should have correct structure", async () => {
    const subJurisdictions = await getAllSubJurisdictions();
    for (const subJurisdiction of subJurisdictions) {
      expect(subJurisdiction).toHaveProperty("subJurisdictionId");
      expect(subJurisdiction).toHaveProperty("name");
      expect(subJurisdiction).toHaveProperty("welshName");
      expect(subJurisdiction).toHaveProperty("jurisdictionId");
    }
  });

  it("should include Civil Court sub-jurisdiction", async () => {
    const subJurisdictions = await getAllSubJurisdictions();
    const civil = subJurisdictions.find((s) => s.subJurisdictionId === 1);
    expect(civil).toBeDefined();
    expect(civil?.name).toBe("Civil Court");
    expect(civil?.jurisdictionId).toBe(1);
  });
});

describe("getSubJurisdictionsByJurisdiction", () => {
  it("should return sub-jurisdictions for Civil jurisdiction", async () => {
    const subJurisdictions = await getSubJurisdictionsByJurisdiction(1);
    expect(subJurisdictions.length).toBeGreaterThan(0);
    for (const sub of subJurisdictions) {
      expect(sub.jurisdictionId).toBe(1);
    }
  });

  it("should return sub-jurisdictions for Tribunal jurisdiction", async () => {
    const subJurisdictions = await getSubJurisdictionsByJurisdiction(4);
    expect(subJurisdictions.length).toBeGreaterThan(0);
    for (const sub of subJurisdictions) {
      expect(sub.jurisdictionId).toBe(4);
    }
  });

  it("should return empty array for non-existent jurisdiction", async () => {
    const subJurisdictions = await getSubJurisdictionsByJurisdiction(999);
    expect(subJurisdictions).toEqual([]);
  });

  it("should not mutate original data", async () => {
    const result1 = await getSubJurisdictionsByJurisdiction(1);
    const result2 = await getSubJurisdictionsByJurisdiction(1);
    expect(result1).toEqual(result2);
  });
});
