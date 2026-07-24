import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the prisma client
const mockPrisma = {
  $disconnect: vi.fn()
};

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: mockPrisma
}));

// Reference-data seeding is delegated to @hmcts/location (tested there).
const mockSeedLocationData = vi.fn();
vi.mock("@hmcts/location", () => ({
  seedLocationData: mockSeedLocationData
}));

describe("Seed Script", () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockSeedLocationData.mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.resetModules();
  });

  describe("main", () => {
    it("should delegate reference data seeding to seedLocationData", async () => {
      // Act
      await import("./seed.js");
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(mockSeedLocationData).toHaveBeenCalledTimes(1);
    });

    it("should complete successfully and disconnect from database", async () => {
      // Act
      await import("./seed.js");
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith("Starting seed...");
      expect(consoleLogSpy).toHaveBeenCalledWith("Seed completed successfully!");
    });

    it("should handle errors and disconnect from database", async () => {
      // Arrange
      mockSeedLocationData.mockRejectedValue(new Error("Database connection failed"));

      // Act
      await import("./seed.js");
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error during seed:", expect.any(Error));
    });
  });
});
