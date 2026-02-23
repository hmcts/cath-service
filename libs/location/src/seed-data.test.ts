import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the prisma client
const mockPrisma = {
  region: {
    count: vi.fn(),
    upsert: vi.fn()
  },
  jurisdiction: {
    count: vi.fn(),
    upsert: vi.fn()
  },
  subJurisdiction: {
    upsert: vi.fn()
  },
  location: {
    count: vi.fn(),
    upsert: vi.fn()
  },
  locationRegion: {
    deleteMany: vi.fn(),
    createMany: vi.fn()
  },
  locationSubJurisdiction: {
    deleteMany: vi.fn(),
    createMany: vi.fn()
  }
};

vi.mock("@hmcts/postgres", () => ({
  prisma: mockPrisma
}));

// Mock location data
const mockLocationData = {
  regions: [
    { regionId: 1, name: "Test Region 1", welshName: "Rhanbarth Prawf 1" },
    { regionId: 2, name: "Test Region 2", welshName: "Rhanbarth Prawf 2" }
  ],
  jurisdictions: [
    { jurisdictionId: 1, name: "Test Jurisdiction 1", welshName: "Awdurdodaeth Prawf 1" },
    { jurisdictionId: 2, name: "Test Jurisdiction 2", welshName: "Awdurdodaeth Prawf 2" }
  ],
  subJurisdictions: [
    {
      subJurisdictionId: 1,
      name: "Test Sub-Jurisdiction 1",
      welshName: "Is-awdurdodaeth Prawf 1",
      jurisdictionId: 1
    },
    {
      subJurisdictionId: 2,
      name: "Test Sub-Jurisdiction 2",
      welshName: "Is-awdurdodaeth Prawf 2",
      jurisdictionId: 2
    }
  ],
  locations: [
    {
      locationId: 1,
      name: "Test Location 1",
      welshName: "Lleoliad Prawf 1",
      regions: [1],
      subJurisdictions: [1]
    },
    {
      locationId: 2,
      name: "Test Location 2",
      welshName: "Lleoliad Prawf 2",
      regions: [2],
      subJurisdictions: [2]
    },
    {
      locationId: 3,
      name: "Test Location 3",
      welshName: "Lleoliad Prawf 3",
      regions: [],
      subJurisdictions: []
    }
  ]
};

vi.mock("./location-data.js", () => ({
  locationData: mockLocationData
}));

// Mock seedListTypes
const mockSeedListTypes = vi.fn().mockResolvedValue(undefined);
vi.mock("./seed-list-types.js", () => ({
  seedListTypes: mockSeedListTypes
}));

describe("seed-data", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.clearAllMocks();
    mockSeedListTypes.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleLogSpy.mockRestore();
  });

  describe("shouldSeed", () => {
    it("should return false when NODE_ENV is production", async () => {
      process.env.NODE_ENV = "production";
      const { seedLocationData } = await import("./seed-data.js");

      await seedLocationData();

      expect(consoleLogSpy).toHaveBeenCalledWith("Checking if location data seeding is needed...");
      expect(consoleLogSpy).toHaveBeenCalledWith("Skipping seed: NODE_ENV is production");
      expect(mockPrisma.region.count).not.toHaveBeenCalled();
    });

    it("should return false when CI is true", async () => {
      process.env.NODE_ENV = "development";
      process.env.CI = "true";
      const { seedLocationData } = await import("./seed-data.js");

      await seedLocationData();

      expect(consoleLogSpy).toHaveBeenCalledWith("Checking if location data seeding is needed...");
      expect(consoleLogSpy).toHaveBeenCalledWith("Skipping seed: Running in CI environment");
      expect(mockPrisma.region.count).not.toHaveBeenCalled();
    });

    it("should return false when tables already contain data (region not empty)", async () => {
      process.env.NODE_ENV = "development";
      process.env.CI = "false";
      mockPrisma.region.count.mockResolvedValue(1);
      mockPrisma.jurisdiction.count.mockResolvedValue(0);
      mockPrisma.location.count.mockResolvedValue(0);

      const { seedLocationData } = await import("./seed-data.js");
      await seedLocationData();

      expect(consoleLogSpy).toHaveBeenCalledWith("Checking if location data seeding is needed...");
      expect(consoleLogSpy).toHaveBeenCalledWith("Skipping seed: Tables already contain data");
      expect(mockPrisma.region.upsert).not.toHaveBeenCalled();
    });

    it("should return false when tables already contain data (jurisdiction not empty)", async () => {
      process.env.NODE_ENV = "development";
      process.env.CI = "false";
      mockPrisma.region.count.mockResolvedValue(0);
      mockPrisma.jurisdiction.count.mockResolvedValue(1);
      mockPrisma.location.count.mockResolvedValue(0);

      const { seedLocationData } = await import("./seed-data.js");
      await seedLocationData();

      expect(consoleLogSpy).toHaveBeenCalledWith("Skipping seed: Tables already contain data");
      expect(mockPrisma.region.upsert).not.toHaveBeenCalled();
    });

    it("should return false when tables already contain data (location not empty)", async () => {
      process.env.NODE_ENV = "development";
      process.env.CI = "false";
      mockPrisma.region.count.mockResolvedValue(0);
      mockPrisma.jurisdiction.count.mockResolvedValue(0);
      mockPrisma.location.count.mockResolvedValue(1);

      const { seedLocationData } = await import("./seed-data.js");
      await seedLocationData();

      expect(consoleLogSpy).toHaveBeenCalledWith("Skipping seed: Tables already contain data");
      expect(mockPrisma.region.upsert).not.toHaveBeenCalled();
    });

    it("should return true when all tables are empty", async () => {
      process.env.NODE_ENV = "development";
      process.env.CI = "false";
      mockPrisma.region.count.mockResolvedValue(0);
      mockPrisma.jurisdiction.count.mockResolvedValue(0);
      mockPrisma.location.count.mockResolvedValue(0);
      mockPrisma.region.upsert.mockResolvedValue({});
      mockPrisma.jurisdiction.upsert.mockResolvedValue({});
      mockPrisma.subJurisdiction.upsert.mockResolvedValue({});
      mockPrisma.location.upsert.mockResolvedValue({});
      mockPrisma.locationRegion.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.locationSubJurisdiction.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.locationRegion.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.locationSubJurisdiction.createMany.mockResolvedValue({ count: 1 });

      const { seedLocationData } = await import("./seed-data.js");
      await seedLocationData();

      expect(consoleLogSpy).toHaveBeenCalledWith("Seeding location reference data...");
      expect(mockPrisma.region.upsert).toHaveBeenCalled();
    });
  });

  describe("seedLocationData", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
      process.env.CI = "false";
      mockPrisma.region.count.mockResolvedValue(0);
      mockPrisma.jurisdiction.count.mockResolvedValue(0);
      mockPrisma.location.count.mockResolvedValue(0);
      mockPrisma.region.upsert.mockResolvedValue({});
      mockPrisma.jurisdiction.upsert.mockResolvedValue({});
      mockPrisma.subJurisdiction.upsert.mockResolvedValue({});
      mockPrisma.location.upsert.mockResolvedValue({});
      mockPrisma.locationRegion.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.locationSubJurisdiction.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.locationRegion.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.locationSubJurisdiction.createMany.mockResolvedValue({ count: 1 });
    });

    it("should seed regions correctly", async () => {
      const { seedLocationData } = await import("./seed-data.js");
      await seedLocationData();

      expect(consoleLogSpy).toHaveBeenCalledWith("Seeding regions...");
      expect(mockPrisma.region.upsert).toHaveBeenCalledTimes(mockLocationData.regions.length);
      expect(mockPrisma.region.upsert).toHaveBeenCalledWith({
        where: { regionId: 1 },
        create: {
          regionId: 1,
          name: "Test Region 1",
          welshName: "Rhanbarth Prawf 1"
        },
        update: {
          name: "Test Region 1",
          welshName: "Rhanbarth Prawf 1"
        }
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(`Seeded ${mockLocationData.regions.length} regions`);
    });

    it("should seed jurisdictions correctly", async () => {
      const { seedLocationData } = await import("./seed-data.js");
      await seedLocationData();

      expect(consoleLogSpy).toHaveBeenCalledWith("Seeding jurisdictions...");
      expect(mockPrisma.jurisdiction.upsert).toHaveBeenCalledTimes(mockLocationData.jurisdictions.length);
      expect(mockPrisma.jurisdiction.upsert).toHaveBeenCalledWith({
        where: { jurisdictionId: 1 },
        create: {
          jurisdictionId: 1,
          name: "Test Jurisdiction 1",
          welshName: "Awdurdodaeth Prawf 1"
        },
        update: {
          name: "Test Jurisdiction 1",
          welshName: "Awdurdodaeth Prawf 1"
        }
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(`Seeded ${mockLocationData.jurisdictions.length} jurisdictions`);
    });

    it("should seed sub-jurisdictions correctly", async () => {
      const { seedLocationData } = await import("./seed-data.js");
      await seedLocationData();

      expect(consoleLogSpy).toHaveBeenCalledWith("Seeding sub-jurisdictions...");
      expect(mockPrisma.subJurisdiction.upsert).toHaveBeenCalledTimes(mockLocationData.subJurisdictions.length);
      expect(mockPrisma.subJurisdiction.upsert).toHaveBeenCalledWith({
        where: { subJurisdictionId: 1 },
        create: {
          subJurisdictionId: 1,
          name: "Test Sub-Jurisdiction 1",
          welshName: "Is-awdurdodaeth Prawf 1",
          jurisdictionId: 1
        },
        update: {
          name: "Test Sub-Jurisdiction 1",
          welshName: "Is-awdurdodaeth Prawf 1",
          jurisdictionId: 1
        }
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(`Seeded ${mockLocationData.subJurisdictions.length} sub-jurisdictions`);
    });

    it("should seed locations correctly", async () => {
      const { seedLocationData } = await import("./seed-data.js");
      await seedLocationData();

      expect(consoleLogSpy).toHaveBeenCalledWith("Seeding locations...");
      expect(mockPrisma.location.upsert).toHaveBeenCalledTimes(mockLocationData.locations.length);
      expect(mockPrisma.location.upsert).toHaveBeenCalledWith({
        where: { locationId: 1 },
        create: {
          locationId: 1,
          name: "Test Location 1",
          welshName: "Lleoliad Prawf 1",
          email: null,
          contactNo: null
        },
        update: {
          name: "Test Location 1",
          welshName: "Lleoliad Prawf 1"
        }
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(`Seeded ${mockLocationData.locations.length} locations`);
    });

    it("should delete and create location region junction records", async () => {
      const { seedLocationData } = await import("./seed-data.js");
      await seedLocationData();

      // Should delete existing records for each location
      expect(mockPrisma.locationRegion.deleteMany).toHaveBeenCalledTimes(mockLocationData.locations.length);
      expect(mockPrisma.locationRegion.deleteMany).toHaveBeenCalledWith({
        where: { locationId: 1 }
      });

      // Should create new records only for locations with regions
      const locationsWithRegions = mockLocationData.locations.filter((l) => l.regions.length > 0);
      expect(mockPrisma.locationRegion.createMany).toHaveBeenCalledTimes(locationsWithRegions.length);
      expect(mockPrisma.locationRegion.createMany).toHaveBeenCalledWith({
        data: [{ locationId: 1, regionId: 1 }]
      });
    });

    it("should delete and create location sub-jurisdiction junction records", async () => {
      const { seedLocationData } = await import("./seed-data.js");
      await seedLocationData();

      // Should delete existing records for each location
      expect(mockPrisma.locationSubJurisdiction.deleteMany).toHaveBeenCalledTimes(mockLocationData.locations.length);
      expect(mockPrisma.locationSubJurisdiction.deleteMany).toHaveBeenCalledWith({
        where: { locationId: 1 }
      });

      // Should create new records only for locations with sub-jurisdictions
      const locationsWithSubJurisdictions = mockLocationData.locations.filter((l) => l.subJurisdictions.length > 0);
      expect(mockPrisma.locationSubJurisdiction.createMany).toHaveBeenCalledTimes(locationsWithSubJurisdictions.length);
      expect(mockPrisma.locationSubJurisdiction.createMany).toHaveBeenCalledWith({
        data: [{ locationId: 1, subJurisdictionId: 1 }]
      });
    });

    it("should not create junction records for locations with empty arrays", async () => {
      const { seedLocationData } = await import("./seed-data.js");
      await seedLocationData();

      // Verify deleteMany was called for location 3 (has empty arrays)
      expect(mockPrisma.locationRegion.deleteMany).toHaveBeenCalledWith({
        where: { locationId: 3 }
      });
      expect(mockPrisma.locationSubJurisdiction.deleteMany).toHaveBeenCalledWith({
        where: { locationId: 3 }
      });

      // But createMany should only be called 2 times (for locations 1 and 2 that have data)
      expect(mockPrisma.locationRegion.createMany).toHaveBeenCalledTimes(2);
      expect(mockPrisma.locationSubJurisdiction.createMany).toHaveBeenCalledTimes(2);
    });

    it("should log completion message", async () => {
      const { seedLocationData } = await import("./seed-data.js");
      await seedLocationData();

      expect(consoleLogSpy).toHaveBeenCalledWith("Location reference data seeding completed successfully");
    });

    it("should seed list types after sub-jurisdictions", async () => {
      const { seedLocationData } = await import("./seed-data.js");
      await seedLocationData();

      // Verify seedListTypes was called
      expect(mockSeedListTypes).toHaveBeenCalledTimes(1);
    });

    it("should complete full seeding workflow in correct order", async () => {
      const { seedLocationData } = await import("./seed-data.js");
      await seedLocationData();

      const calls = consoleLogSpy.mock.calls.map((call) => call[0]);

      expect(calls.indexOf("Checking if location data seeding is needed...")).toBeLessThan(calls.indexOf("Seeding location reference data..."));
      expect(calls.indexOf("Seeding location reference data...")).toBeLessThan(calls.indexOf("Seeding regions..."));
      expect(calls.indexOf("Seeding regions...")).toBeLessThan(calls.indexOf("Seeding jurisdictions..."));
      expect(calls.indexOf("Seeding jurisdictions...")).toBeLessThan(calls.indexOf("Seeding sub-jurisdictions..."));
      expect(calls.indexOf("Seeding sub-jurisdictions...")).toBeLessThan(calls.indexOf("Seeding locations..."));
      expect(calls.indexOf("Seeding locations...")).toBeLessThan(calls.indexOf("Location reference data seeding completed successfully"));

      // Verify seedListTypes was called
      expect(mockSeedListTypes).toHaveBeenCalledTimes(1);
    });
  });
});
