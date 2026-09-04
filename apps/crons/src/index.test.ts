import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetPropertiesVolumeSecrets = vi.fn().mockResolvedValue({});
const mockExampleScript = vi.fn();
const mockTrackEvent = vi.fn();
const mockTrackException = vi.fn();
const mockTrackMetric = vi.fn();
const mockFlush = vi.fn().mockResolvedValue(undefined);
// Must be constructible — index.ts calls `new MonitoringService(...)`, and an arrow
// function is not a constructor.
const mockMonitoringService = vi.fn(function MonitoringService() {
  return {
    trackEvent: mockTrackEvent,
    trackException: mockTrackException,
    trackMetric: mockTrackMetric,
    flush: mockFlush
  };
});

let appInsightsConfig: Record<string, unknown> = {
  serviceName: "cath-crons",
  connectionString: "InstrumentationKey=test",
  enabled: true
};

vi.mock("@hmcts-cft/cloud-native-platform", () => ({
  getPropertiesVolumeSecrets: mockGetPropertiesVolumeSecrets,
  MonitoringService: mockMonitoringService
}));

vi.mock("config", () => ({
  default: {
    get: (key: string) => {
      if (key === "applicationInsights") return appInsightsConfig;
      throw new Error(`Unexpected config key: ${key}`);
    }
  }
}));

vi.mock("./example.js", () => ({
  default: mockExampleScript
}));

describe("index - cron job runner", () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
    appInsightsConfig = {
      serviceName: "cath-crons",
      connectionString: "InstrumentationKey=test",
      enabled: true
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should configure properties volume with correct chart path", async () => {
    process.env.SCRIPT_NAME = "example";

    const { main } = await import("./index.js");
    await main();

    expect(mockGetPropertiesVolumeSecrets).toHaveBeenCalledWith(
      expect.objectContaining({
        chartPath: expect.stringContaining("helm/values.yaml"),
        omit: ["DATABASE_URL"]
      })
    );
  });

  it("should throw error when SCRIPT_NAME is not set", async () => {
    delete process.env.SCRIPT_NAME;

    const { main } = await import("./index.js");

    await expect(main()).rejects.toThrow("SCRIPT_NAME environment variable is required");
  });

  it("should execute script when SCRIPT_NAME is provided", async () => {
    process.env.SCRIPT_NAME = "example";

    const { main } = await import("./index.js");
    await main();

    expect(mockExampleScript).toHaveBeenCalled();
  });

  it("should throw error when script execution fails", async () => {
    process.env.SCRIPT_NAME = "example";
    const mockError = new Error("Script execution failed");
    mockExampleScript.mockRejectedValueOnce(mockError);

    const { main } = await import("./index.js");

    await expect(main()).rejects.toThrow("Script execution failed");
  });

  it("should throw error when getPropertiesVolumeSecrets fails", async () => {
    process.env.SCRIPT_NAME = "example";
    const mockError = new Error("Config failed");
    mockGetPropertiesVolumeSecrets.mockRejectedValueOnce(mockError);

    const { main } = await import("./index.js");

    await expect(main()).rejects.toThrow("Config failed");
  });

  describe("monitoring", () => {
    it("should initialise monitoring with the crons service name", async () => {
      process.env.SCRIPT_NAME = "example";

      const { main } = await import("./index.js");
      await main();

      expect(mockMonitoringService).toHaveBeenCalledWith("InstrumentationKey=test", "cath-crons");
    });

    it("should track success and duration on a successful run", async () => {
      process.env.SCRIPT_NAME = "example";

      const { main } = await import("./index.js");
      await main();

      expect(mockTrackEvent).toHaveBeenCalledWith("CronJobSucceeded", { scriptName: "example" });
      expect(mockTrackMetric).toHaveBeenCalledWith(
        "CronJobDuration",
        expect.any(Number),
        expect.objectContaining({ scriptName: "example", outcome: "success" })
      );
    });

    // The reason this runner owns monitoring at all: a cron pod exits as soon as the
    // script returns, so unflushed telemetry is lost.
    it("should flush telemetry after a successful run", async () => {
      process.env.SCRIPT_NAME = "example";

      const { main } = await import("./index.js");
      await main();

      expect(mockFlush).toHaveBeenCalled();
    });

    it("should track the exception and still flush when the script fails", async () => {
      process.env.SCRIPT_NAME = "example";
      const mockError = new Error("Script execution failed");
      mockExampleScript.mockRejectedValueOnce(mockError);

      const { main } = await import("./index.js");
      await expect(main()).rejects.toThrow("Script execution failed");

      expect(mockTrackException).toHaveBeenCalledWith(mockError, expect.objectContaining({ scriptName: "example", outcome: "failure" }));
      expect(mockFlush).toHaveBeenCalled();
    });

    it("should flush when the script name is missing", async () => {
      delete process.env.SCRIPT_NAME;

      const { main } = await import("./index.js");
      await expect(main()).rejects.toThrow("SCRIPT_NAME environment variable is required");

      expect(mockFlush).toHaveBeenCalled();
    });

    it("should not initialise monitoring when disabled", async () => {
      process.env.SCRIPT_NAME = "example";
      appInsightsConfig = { serviceName: "cath-crons", enabled: false };

      const { main } = await import("./index.js");
      await main();

      expect(mockMonitoringService).not.toHaveBeenCalled();
      expect(mockFlush).not.toHaveBeenCalled();
    });

    it("should not initialise monitoring when no connection string is configured", async () => {
      process.env.SCRIPT_NAME = "example";
      appInsightsConfig = { serviceName: "cath-crons", enabled: true };

      const { main } = await import("./index.js");
      await main();

      expect(mockMonitoringService).not.toHaveBeenCalled();
    });
  });
});
