import { beforeEach, describe, expect, it, vi } from "vitest";

// The runs file lives under the real output/seed, so files are kept in memory
const files = vi.hoisted(() => new Map<string, string>());
vi.mock("node:fs", () => ({ existsSync: (file: string) => files.has(file) }));
vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  readFile: vi.fn(async (file: string) => files.get(file)),
  writeFile: vi.fn(async (file: string, content: string) => {
    files.set(file, content);
  })
}));

const { finishRun, openRuns, RUN_TOKEN, runEmail, runLocationId, runName, startRun } = await import("./run.js");

describe("pip runs", () => {
  beforeEach(() => {
    files.clear();
  });

  it("should start a run with a token and location ids of its own, and keep it until it is finished", async () => {
    // Act
    const first = await startRun("test");
    const second = await startRun("test");

    // Assert
    expect(first.token).toMatch(RUN_TOKEN);
    expect(first.locationIdBase % 100_000).toBe(0);
    expect(first.locationIdBase).toBeGreaterThanOrEqual(10_000_000);
    expect((await openRuns("test")).map((run) => run.token)).toEqual([first.token, second.token]);
    expect(await openRuns("other")).toEqual([]);

    await finishRun("test", first.token);
    expect((await openRuns("test")).map((run) => run.token)).toEqual([second.token]);
  });

  it("should not trust a token in the runs file that is not one it would make", async () => {
    // Arrange
    const run = await startRun("test");
    const [file] = files.keys();
    files.set(file, JSON.stringify([run, { ...run, token: "../../etc" }]));

    // Act
    const runs = await openRuns("test");

    // Assert
    expect(runs).toEqual([run]);
  });

  it("should put the token before names and emails, and the base under location ids, only for a run", () => {
    // Arrange
    const run = { token: "uib3f9a2c", startedAt: "", locationIdBase: 12_300_000 };

    // Act and assert
    expect(runName(run, "Oxford Combined Court Centre")).toBe("uib3f9a2c Oxford Combined Court Centre");
    expect(runEmail(run, "parity@example.com")).toBe("uib3f9a2c.parity@example.com");
    expect(runLocationId(run, 9)).toBe(12_300_009);
    expect(runName(null, "Court")).toBe("Court");
    expect(runEmail(null, "a@example.com")).toBe("a@example.com");
    expect(runLocationId(null, 9)).toBe(9);
    expect(() => runLocationId(run, 100_000)).toThrow("location 100000 is too large");
  });
});
