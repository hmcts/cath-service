import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadEnvironment: vi.fn(),
  pipApi: vi.fn(),
  openRuns: vi.fn(),
  finishRun: vi.fn(),
  request: vi.fn()
}));
vi.mock("../environments.js", () => ({ loadEnvironment: mocks.loadEnvironment }));
vi.mock("./pip-api.js", () => ({ pipApi: mocks.pipApi }));
vi.mock("./run.js", () => ({ openRuns: mocks.openRuns, finishRun: mocks.finishRun }));

const RUN = { token: "uib3f9a2c", startedAt: "2026-11-06T10:00:00Z", locationIdBase: 10_000_000 };

describe("pip cleanup script", () => {
  const argv = process.argv;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.exitCode = undefined;
    process.argv = ["node", "cleanup.ts", "--env", "test"];
    vi.spyOn(console, "log").mockImplementation(() => {});
    mocks.loadEnvironment.mockResolvedValue({ name: "test" });
    mocks.pipApi.mockResolvedValue({ request: mocks.request });
    mocks.request.mockImplementation(async () => new Response("deleted"));
  });

  afterEach(() => {
    process.argv = argv;
    process.exitCode = undefined;
    vi.restoreAllMocks();
  });

  it("should delete each run's data by its token, what references a location first and its accounts last, then finish the run", async () => {
    // Arrange
    mocks.openRuns.mockResolvedValue([RUN]);

    // Act
    await import("./cleanup.js");

    // Assert
    expect(mocks.request.mock.calls.map(([service, endpoint, init]) => `${init.method} ${service} ${endpoint}`)).toEqual([
      "DELETE account /testing-support/subscription/uib3f9a2c",
      "DELETE data /testing-support/publication/uib3f9a2c",
      "DELETE data /testing-support/location/uib3f9a2c",
      "DELETE account /testing-support/application/uib3f9a2c",
      "DELETE account /testing-support/third-party/uib3f9a2c",
      "DELETE account /testing-support/audit/uib3f9a2c",
      "DELETE account /testing-support/account/uib3f9a2c"
    ]);
    expect(mocks.finishRun).toHaveBeenCalledWith("test", "uib3f9a2c");
    expect(process.exitCode).toBeUndefined();
  });

  it("should keep a run whose cleanup fails, carry on with the others, and exit 1", async () => {
    // Arrange
    mocks.openRuns.mockResolvedValue([RUN, { ...RUN, token: "uib000001" }]);
    mocks.request.mockImplementation(async (_service: string, endpoint: string) =>
      endpoint === "/testing-support/location/uib3f9a2c" ? new Response("in use", { status: 409 }) : new Response("deleted")
    );

    // Act
    await import("./cleanup.js");

    // Assert
    expect(mocks.finishRun).toHaveBeenCalledTimes(1);
    expect(mocks.finishRun).toHaveBeenCalledWith("test", "uib000001");
    expect(console.log).toHaveBeenCalledWith("could not clean up run uib3f9a2c: deleting its locations failed: 409 in use");
    expect(process.exitCode).toBe(1);
  });

  it("should do nothing, and ask for no token, when no run is waiting", async () => {
    // Arrange
    mocks.openRuns.mockResolvedValue([]);

    // Act
    await import("./cleanup.js");

    // Assert
    expect(mocks.pipApi).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("nothing to clean up in pip test");
  });

  it("should refuse the local pip, which is recreated empty each time", async () => {
    // Arrange
    mocks.loadEnvironment.mockResolvedValue({ name: "local" });

    // Act and assert
    await expect(import("./cleanup.js")).rejects.toThrow("the local pip is recreated empty");
  });
});
