import { getPropertiesVolumeSecrets } from "@hmcts-cft/cloud-native-platform";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
import { createAuth } from "./auth.js";
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
vi.mock("./auth.js", () => ({ createAuth: vi.fn(async () => ({ router: {}, requireUser: vi.fn() })) }));
vi.mock("./baseline.js", () => ({ createBaselineCache: vi.fn(() => ({ ensure, status: vi.fn() })) }));
vi.mock("./runs.js", () => ({ createRunner: vi.fn(() => ({ restore })) }));

// server.ts does its work when it loads, so each test loads it afresh with its own environment
async function startServer(env: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  vi.resetModules();
  await import("./server.js");
}

const ADMIN_GROUPS = { SSO_SYSTEM_ADMIN_GROUP_ID: "system", SSO_INTERNAL_ADMIN_CTSC_GROUP_ID: "ctsc", SSO_INTERNAL_ADMIN_LOCAL_GROUP_ID: "local" };

describe("server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should let CaTH's admin groups in by default, and listen on the configured port", async () => {
    // Act
    await startServer({ ...ADMIN_GROUPS, PORT: "9123", BASE_URL: "https://ui-baseline.example", UI_BASELINE_ALLOWED_GROUP_IDS: undefined });

    // Assert
    expect(createAuth).toHaveBeenCalledWith(
      expect.objectContaining({ disabled: false, baseUrl: "https://ui-baseline.example", allowedGroupIds: ["system", "ctsc", "local"], secureCookies: true })
    );
    expect(listen).toHaveBeenCalledWith(9123, expect.any(Function));
    expect(ensure).toHaveBeenCalled();
  });

  it("should let in only the groups named, when they are", async () => {
    // Act
    await startServer({ ...ADMIN_GROUPS, UI_BASELINE_ALLOWED_GROUP_IDS: "testers,,leads" });

    // Assert
    expect(createAuth).toHaveBeenCalledWith(expect.objectContaining({ allowedGroupIds: ["testers", "leads"], secureCookies: false }));
  });

  it("should check the test environment, and store runs where the baseline is", async () => {
    // Act
    await startServer({ UI_BASELINE_ENV: undefined, GIT_COMMIT: "abc1234" });

    // Assert
    expect(createRunner).toHaveBeenCalledWith(expect.objectContaining({ environment: "test", commit: "abc1234", store: { name: "store" } }));
    expect(createBaselineCache).toHaveBeenCalledWith(expect.objectContaining({ store: { name: "store" } }));
    expect(createApp).toHaveBeenCalledWith(expect.objectContaining({ environment: "test" }));
  });

  it("should read the vault's secrets only in the pod", async () => {
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

  it("should refuse to run without sign-in in production", async () => {
    // Act & Assert
    await expect(startServer({ NODE_ENV: "production", UI_BASELINE_AUTH_DISABLED: "true" })).rejects.toThrow(
      "UI_BASELINE_AUTH_DISABLED is for a developer's machine only"
    );
    expect(listen).not.toHaveBeenCalled();
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
