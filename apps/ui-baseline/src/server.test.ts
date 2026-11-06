import { getPropertiesVolumeSecrets } from "@hmcts-cft/cloud-native-platform";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
import { createBaselineCache } from "./baseline.js";
import { createRunner } from "./runs.js";

const listen = vi.fn();
const ensure = vi.fn(async () => "/data/baseline");
const restore = vi.fn(async () => {});

vi.mock("@hmcts-cft/cloud-native-platform", () => ({ getPropertiesVolumeSecrets: vi.fn(async () => {}) }));
vi.mock("../environments.js", () => ({ loadEnvironment: vi.fn(async (name: string) => ({ name })) }));
vi.mock("../baseline-store.js", () => ({
  baselineContainer: vi.fn(() => ({ name: "store" })),
  latestBaseline: vi.fn(),
  pullBaseline: vi.fn()
}));
vi.mock("./app.js", () => ({ createApp: vi.fn(() => ({ listen })) }));
vi.mock("./baseline.js", () => ({ createBaselineCache: vi.fn(() => ({ ensure, status: vi.fn() })) }));
vi.mock("./runs.js", () => ({ createRunner: vi.fn(() => ({ restore })) }));

// server.ts does its work when it loads, so each test loads it afresh with its own environment
async function startServer(env: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  vi.resetModules();
  await import("./server.js");
}

describe("server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should listen on the configured port with no sign-in", async () => {
    // Act
    await startServer({ NODE_ENV: "production", PORT: "9123" });

    // Assert
    expect(listen).toHaveBeenCalledWith(9123, expect.any(Function));
    expect(createApp).toHaveBeenCalledWith(expect.not.objectContaining({ auth: expect.anything() }));
    expect(ensure).toHaveBeenCalled();
  });

  it("should check aat by default, and store runs where the baseline is", async () => {
    // Act
    await startServer({ UI_BASELINE_ENV: undefined, GIT_COMMIT: "abc1234" });

    // Assert
    expect(createRunner).toHaveBeenCalledWith(expect.objectContaining({ environment: "aat", commit: "abc1234", store: { name: "store" } }));
    expect(createBaselineCache).toHaveBeenCalledWith(expect.objectContaining({ store: { name: "store" } }));
    expect(createApp).toHaveBeenCalledWith(expect.objectContaining({ environment: "aat" }));
  });

  it("should read no vault secrets outside the pod", async () => {
    // Act
    await startServer({ NODE_ENV: "test" });

    // Assert
    expect(getPropertiesVolumeSecrets).not.toHaveBeenCalled();
  });

  it("should read the vault's secrets in production", async () => {
    // Act
    await startServer({ NODE_ENV: "production" });

    // Assert
    expect(getPropertiesVolumeSecrets).toHaveBeenCalledWith({ chartPath: expect.stringMatching(/helm\/values\.yaml$/) });
  });

  it("should keep running when earlier runs or the baseline cannot be loaded", async () => {
    // Arrange
    restore.mockRejectedValueOnce(new Error("storage is down"));
    ensure.mockRejectedValueOnce(new Error("no baseline stored"));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act
    await startServer({});
    await vi.waitFor(() => expect(errors).toHaveBeenCalledTimes(2));

    // Assert
    expect(errors).toHaveBeenCalledWith("[ui-baseline] could not load earlier runs: storage is down");
    expect(errors).toHaveBeenCalledWith("[ui-baseline] could not fetch the baseline: no baseline stored");
    expect(listen).toHaveBeenCalled();
  });
});
