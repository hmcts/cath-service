import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetPropertiesVolumeSecrets = vi.fn().mockResolvedValue({});
const mockExampleScript = vi.fn();

vi.mock("@hmcts-cft/cloud-native-platform", () => ({
  getPropertiesVolumeSecrets: mockGetPropertiesVolumeSecrets
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
});
