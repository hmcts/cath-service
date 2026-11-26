import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BASELINE_DIR, pullBaseline, pushBaseline } from "./baseline-store.js";
import { loadEnvironment } from "./environments.js";

vi.mock("./baseline-store.js", () => ({ DEFAULT_BASELINE_DIR: "/default/baseline", pullBaseline: vi.fn(), pushBaseline: vi.fn() }));
vi.mock("./environments.js", () => ({ loadEnvironment: vi.fn() }));

const ENVIRONMENT = { name: "local" };
const STORED = { id: "2026-10-01", blob: "baselines/2026-10-01.tar.gz", pip: "pip@abc", finishedAt: "2026-10-01T00:00:00Z", pushedAt: "2026-10-02T00:00:00Z" };

describe("baseline script", () => {
  const argv = process.argv;
  let log: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;
  let exit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.mocked(loadEnvironment).mockResolvedValue(ENVIRONMENT as never);
    vi.mocked(pushBaseline).mockResolvedValue(STORED);
    vi.mocked(pullBaseline).mockResolvedValue(STORED);
    log = vi.spyOn(console, "log").mockImplementation(() => {});
    error = vi.spyOn(console, "error").mockImplementation(() => {});
    exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
  });

  afterEach(() => {
    process.argv = argv;
    log.mockRestore();
    error.mockRestore();
    exit.mockRestore();
  });

  const run = async (...args: string[]) => {
    process.argv = ["node", "baseline.ts", ...args];
    await import("./baseline.js");
  };

  it("should push the default baseline directory to the local environment", async () => {
    // Act
    await run("push");

    // Assert
    expect(loadEnvironment).toHaveBeenCalledWith("local");
    expect(pushBaseline).toHaveBeenCalledWith(ENVIRONMENT, DEFAULT_BASELINE_DIR);
    expect(log).toHaveBeenCalledWith("stored the baseline recorded 2026-10-01T00:00:00Z from pip@abc as baselines/2026-10-01.tar.gz (local)");
  });

  it("should pull a stored baseline by id into the given directory and environment", async () => {
    // Act
    await run("pull", "--env", "test", "--dir", "some/dir", "--id", "2026-10-01");

    // Assert
    expect(loadEnvironment).toHaveBeenCalledWith("test");
    expect(pullBaseline).toHaveBeenCalledWith(ENVIRONMENT, path.resolve("some/dir"), "2026-10-01");
    expect(log).toHaveBeenCalledWith(`fetched baselines/2026-10-01.tar.gz into ${path.resolve("some/dir")}`);
  });

  it("should print its usage and exit 1 for an unknown command", async () => {
    // Act
    await run("delete");

    // Assert
    expect(error).toHaveBeenCalledWith(expect.stringContaining("usage: baseline.ts push|pull"));
    expect(exit).toHaveBeenCalledWith(1);
    expect(pushBaseline).not.toHaveBeenCalled();
    expect(pullBaseline).not.toHaveBeenCalled();
  });
});
