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
    count: vi.fn(),
    upsert: vi.fn(),
    findMany: vi.fn()
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
  },
  locationReference: {
    deleteMany: vi.fn(),
    create: vi.fn()
  },
  listType: {
    upsert: vi.fn()
  },
  listTypeSubJurisdiction: {
    upsert: vi.fn()
  },
  artefact: {
    findUnique: vi.fn(),
    create: vi.fn()
  },
  $executeRaw: vi.fn(),
  $disconnect: vi.fn()
};

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: mockPrisma
}));

// Mock location data
const mockLocationData = {
  regions: [
    { regionId: 1, name: "Region 1", welshName: "Rhanbarth 1" },
    { regionId: 2, name: "Region 2", welshName: "Rhanbarth 2" }
  ],
  jurisdictions: [{ jurisdictionId: 1, name: "Jurisdiction 1", welshName: "Awdurdodaeth 1" }],
  subJurisdictions: [{ subJurisdictionId: 1, jurisdictionId: 1, name: "SubJurisdiction 1", welshName: "Is-awdurdodaeth 1" }],
  locations: [
    {
      locationId: 1,
      name: "Location 1",
      welshName: "Lleoliad 1",
      regions: [1],
      subJurisdictions: [1]
    }
  ]
};

const mockListTypeData = [
  {
    name: "LIST_TYPE_1",
    englishFriendlyName: "List Type 1",
    welshFriendlyName: "Math Rhestr 1",
    shortenedFriendlyName: "LT1",
    urlPath: "/list-type-1",
    defaultSensitivity: "PUBLIC",
    provenance: "MANUAL_UPLOAD",
    isNonStrategic: false,
    subJurisdictionIds: [1]
  }
];

vi.mock("@hmcts/location", () => ({
  locationData: mockLocationData,
  listTypeData: mockListTypeData
}));

describe("Seed Script", () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    originalEnv = { ...process.env };

    // Default: non-production, non-CI environment
    delete process.env.ENVIRONMENT;
    delete process.env.CI;

    // Setup default mock return values
    mockPrisma.region.count.mockResolvedValue(0);
    mockPrisma.jurisdiction.count.mockResolvedValue(0);
    mockPrisma.location.count.mockResolvedValue(0);
    mockPrisma.subJurisdiction.findMany.mockResolvedValue([{ subJurisdictionId: 1, name: "SubJurisdiction 1" }]);
    mockPrisma.listType.upsert.mockResolvedValue({ id: 1 });
    mockPrisma.artefact.findUnique.mockResolvedValue(null);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.env = originalEnv;
    vi.resetModules();
  });

  describe("seedReferenceData", () => {
    it("should skip seeding in production environment", async () => {
      // Arrange
      process.env.ENVIRONMENT = "prod";

      // Act
      await import("./seed.js");

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith("Skipping reference data seed: ENVIRONMENT is prod");
      expect(mockPrisma.region.upsert).not.toHaveBeenCalled();
    });

    it("should skip seeding in CI environment", async () => {
      // Arrange
      process.env.CI = "true";

      // Act
      await import("./seed.js");

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith("Skipping reference data seed: Running in CI environment");
      expect(mockPrisma.region.upsert).not.toHaveBeenCalled();
    });

    it("should seed all reference data when tables are empty", async () => {
      // Arrange
      mockPrisma.region.count.mockResolvedValue(0);
      mockPrisma.jurisdiction.count.mockResolvedValue(0);
      mockPrisma.location.count.mockResolvedValue(0);

      // Act
      await import("./seed.js");

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(mockPrisma.region.upsert).toHaveBeenCalledTimes(mockLocationData.regions.length);
      expect(mockPrisma.jurisdiction.upsert).toHaveBeenCalledTimes(mockLocationData.jurisdictions.length);
      expect(mockPrisma.subJurisdiction.upsert).toHaveBeenCalledTimes(mockLocationData.subJurisdictions.length);
      expect(mockPrisma.location.upsert).toHaveBeenCalledTimes(mockLocationData.locations.length);
    });

    it("should skip location seeding when tables contain data", async () => {
      // Arrange
      mockPrisma.region.count.mockResolvedValue(5);
      mockPrisma.jurisdiction.count.mockResolvedValue(3);
      mockPrisma.location.count.mockResolvedValue(10);

      // Act
      await import("./seed.js");

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith("Skipping location seed: tables already contain data");
      expect(mockPrisma.region.upsert).not.toHaveBeenCalled();
      expect(mockPrisma.jurisdiction.upsert).not.toHaveBeenCalled();
      expect(mockPrisma.location.upsert).not.toHaveBeenCalled();
    });

    it("should seed regions with correct data structure", async () => {
      // Arrange
      mockPrisma.region.count.mockResolvedValue(0);
      mockPrisma.jurisdiction.count.mockResolvedValue(0);
      mockPrisma.location.count.mockResolvedValue(0);

      // Act
      await import("./seed.js");

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      const firstRegion = mockLocationData.regions[0];
      expect(mockPrisma.region.upsert).toHaveBeenCalledWith({
        where: { regionId: firstRegion.regionId },
        create: {
          regionId: firstRegion.regionId,
          name: firstRegion.name,
          welshName: firstRegion.welshName
        },
        update: {
          name: firstRegion.name,
          welshName: firstRegion.welshName
        }
      });
    });

    it("should seed jurisdictions with correct data structure", async () => {
      // Arrange
      mockPrisma.region.count.mockResolvedValue(0);
      mockPrisma.jurisdiction.count.mockResolvedValue(0);
      mockPrisma.location.count.mockResolvedValue(0);

      // Act
      await import("./seed.js");

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      const firstJurisdiction = mockLocationData.jurisdictions[0];
      expect(mockPrisma.jurisdiction.upsert).toHaveBeenCalledWith({
        where: { jurisdictionId: firstJurisdiction.jurisdictionId },
        create: {
          jurisdictionId: firstJurisdiction.jurisdictionId,
          name: firstJurisdiction.name,
          welshName: firstJurisdiction.welshName
        },
        update: {
          name: firstJurisdiction.name,
          welshName: firstJurisdiction.welshName
        }
      });
    });

    it("should seed sub-jurisdictions with correct data structure", async () => {
      // Arrange
      mockPrisma.region.count.mockResolvedValue(0);
      mockPrisma.jurisdiction.count.mockResolvedValue(0);
      mockPrisma.location.count.mockResolvedValue(0);

      // Act
      await import("./seed.js");

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      const firstSubJurisdiction = mockLocationData.subJurisdictions[0];
      expect(mockPrisma.subJurisdiction.upsert).toHaveBeenCalledWith({
        where: { subJurisdictionId: firstSubJurisdiction.subJurisdictionId },
        create: {
          subJurisdictionId: firstSubJurisdiction.subJurisdictionId,
          name: firstSubJurisdiction.name,
          welshName: firstSubJurisdiction.welshName,
          jurisdictionId: firstSubJurisdiction.jurisdictionId
        },
        update: {
          name: firstSubJurisdiction.name,
          welshName: firstSubJurisdiction.welshName,
          jurisdictionId: firstSubJurisdiction.jurisdictionId
        }
      });
    });

    it("should always seed list types regardless of existing location data", async () => {
      // Arrange
      mockPrisma.region.count.mockResolvedValue(5);
      mockPrisma.jurisdiction.count.mockResolvedValue(3);
      mockPrisma.location.count.mockResolvedValue(10);

      // Act
      await import("./seed.js");

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(mockPrisma.subJurisdiction.findMany).toHaveBeenCalled();
      expect(mockPrisma.listType.upsert).toHaveBeenCalledTimes(mockListTypeData.length);
    });

    it("should throw error if no sub-jurisdictions exist when seeding list types", async () => {
      // Arrange
      mockPrisma.subJurisdiction.findMany.mockResolvedValue([]);

      // Act & Assert
      await expect(async () => {
        await import("./seed.js");
        await new Promise((resolve) => setTimeout(resolve, 100));
      }).rejects.toThrow("No sub-jurisdictions found — seed locations first");
    });

    it("should seed list types with correct data structure", async () => {
      // Arrange
      mockPrisma.region.count.mockResolvedValue(0);
      mockPrisma.jurisdiction.count.mockResolvedValue(0);
      mockPrisma.location.count.mockResolvedValue(0);

      // Act
      await import("./seed.js");

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      const firstListType = mockListTypeData[0];
      expect(mockPrisma.listType.upsert).toHaveBeenCalledWith({
        where: { name: firstListType.name },
        create: {
          name: firstListType.name,
          friendlyName: firstListType.englishFriendlyName,
          welshFriendlyName: firstListType.welshFriendlyName,
          shortenedFriendlyName: firstListType.shortenedFriendlyName,
          url: firstListType.urlPath,
          defaultSensitivity: firstListType.defaultSensitivity,
          allowedProvenance: firstListType.provenance,
          isNonStrategic: firstListType.isNonStrategic
        },
        update: {
          friendlyName: firstListType.englishFriendlyName,
          welshFriendlyName: firstListType.welshFriendlyName,
          shortenedFriendlyName: firstListType.shortenedFriendlyName,
          url: firstListType.urlPath,
          defaultSensitivity: firstListType.defaultSensitivity,
          allowedProvenance: firstListType.provenance,
          isNonStrategic: firstListType.isNonStrategic
        }
      });
    });

    it("should seed locations with regions and sub-jurisdictions", async () => {
      // Arrange
      mockPrisma.region.count.mockResolvedValue(0);
      mockPrisma.jurisdiction.count.mockResolvedValue(0);
      mockPrisma.location.count.mockResolvedValue(0);

      // Act
      await import("./seed.js");

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      const firstLocation = mockLocationData.locations[0];

      expect(mockPrisma.location.upsert).toHaveBeenCalledWith({
        where: { locationId: firstLocation.locationId },
        create: {
          locationId: firstLocation.locationId,
          name: firstLocation.name,
          welshName: firstLocation.welshName,
          email: null,
          contactNo: null
        },
        update: {
          name: firstLocation.name,
          welshName: firstLocation.welshName
        }
      });

      expect(mockPrisma.locationRegion.deleteMany).toHaveBeenCalledWith({
        where: { locationId: firstLocation.locationId }
      });

      expect(mockPrisma.locationRegion.createMany).toHaveBeenCalledWith({
        data: firstLocation.regions.map((regionId) => ({
          locationId: firstLocation.locationId,
          regionId
        }))
      });

      expect(mockPrisma.locationSubJurisdiction.deleteMany).toHaveBeenCalledWith({
        where: { locationId: firstLocation.locationId }
      });

      expect(mockPrisma.locationSubJurisdiction.createMany).toHaveBeenCalledWith({
        data: firstLocation.subJurisdictions.map((subJurisdictionId) => ({
          locationId: firstLocation.locationId,
          subJurisdictionId
        }))
      });
    });

    it("should seed location references with SNL provenance", async () => {
      // Arrange
      mockPrisma.region.count.mockResolvedValue(0);
      mockPrisma.jurisdiction.count.mockResolvedValue(0);
      mockPrisma.location.count.mockResolvedValue(0);

      // Act
      await import("./seed.js");

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      const firstLocation = mockLocationData.locations[0];

      expect(mockPrisma.locationReference.deleteMany).toHaveBeenCalledWith({
        where: { locationId: firstLocation.locationId }
      });

      expect(mockPrisma.locationReference.create).toHaveBeenCalledWith({
        data: {
          locationId: firstLocation.locationId,
          provenance: "SNL",
          provenanceLocationId: String(firstLocation.locationId + 100),
          provenanceLocationType: "VENUE"
        }
      });
    });
  });

  describe("seedTestData", () => {
    it("should seed test list types with fixed IDs", async () => {
      // Act
      await import("./seed.js");

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining("INSERT INTO list_types"),
          expect.stringContaining("TEST_LIST_TYPE_1"),
          expect.stringContaining("TEST_LIST_TYPE_2"),
          expect.stringContaining("TEST_LIST_TYPE_6")
        ])
      );

      expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining("setval('list_types_id_seq'")]));
    });

    it("should create test artefacts if they do not exist", async () => {
      // Arrange
      mockPrisma.artefact.findUnique.mockResolvedValue(null);

      // Act
      await import("./seed.js");

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(mockPrisma.artefact.create).toHaveBeenCalledTimes(3);
      expect(mockPrisma.artefact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          artefactId: "11111111-1111-1111-1111-111111111111",
          locationId: "9",
          listTypeId: 6
        })
      });
    });

    it("should skip creating test artefacts if they already exist", async () => {
      // Arrange
      mockPrisma.artefact.findUnique.mockResolvedValue({ artefactId: "11111111-1111-1111-1111-111111111111" });

      // Act
      await import("./seed.js");

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(mockPrisma.artefact.create).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("already exists"));
    });

    it("should create test artefacts with correct structure", async () => {
      // Arrange
      mockPrisma.artefact.findUnique.mockResolvedValue(null);

      // Act
      await import("./seed.js");

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(mockPrisma.artefact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          artefactId: expect.any(String),
          locationId: "9",
          contentDate: expect.any(Date),
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          provenance: "MANUAL_UPLOAD",
          type: "LIST"
        })
      });
    });
  });

  describe("main", () => {
    it("should complete successfully and disconnect from database", async () => {
      // Act
      await import("./seed.js");

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith("Starting seed...");
      expect(consoleLogSpy).toHaveBeenCalledWith("Seed completed successfully!");
    });

    it("should handle errors and disconnect from database", async () => {
      // Arrange
      mockPrisma.region.count.mockRejectedValue(new Error("Database connection failed"));

      // Act
      await import("./seed.js");

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error during seed:", expect.any(Error));
    });
  });
});
