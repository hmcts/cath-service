import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ ticketText: vi.fn() }));
vi.mock("../scope.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../scope.js")>()),
  ticketText: mocks.ticketText
}));

describe("pip scope script", () => {
  const argv = process.argv;
  let dir: string;
  let out: string;

  const run = async (...args: string[]) => {
    process.argv = ["node", "scope.ts", ...args];
    await import("./scope.js");
    return JSON.parse(await readFile(out, "utf-8"));
  };

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    dir = await mkdtemp(path.join(tmpdir(), "pip-scope-"));
    out = path.join(dir, "scope.json");
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(async () => {
    process.argv = argv;
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it("should scope a ticket to the list types and pages its text names", async () => {
    // Arrange
    mocks.ticketText.mockResolvedValue("# Fix SJP_PUBLIC_LIST\n\nThe page at `/alphabetical-search` is wrong.");

    // Act
    const scope = await run("--out", out, "--ticket", "123");

    // Assert
    expect(mocks.ticketText).toHaveBeenCalledWith("123", "hmcts/cath-service");
    expect(scope).toEqual({
      name: "ticket-123",
      publications: ["sjp-public-list"],
      pages: ["page--alphabetical-search"],
      journeys: [],
      routes: ["/alphabetical-search"]
    });
    expect(console.log).toHaveBeenCalledWith(`recording 1 list types, 1 pages and 0 journeys (ticket-123) → ${out}`);
  });

  it("should name a scope without a ticket after what it records", async () => {
    // Act
    const scope = await run("--out", out, "--list-type", "SJP_PUBLIC_LIST", "--route", "/cookie-policy", "--journey", "subscriptions");

    // Assert
    expect(mocks.ticketText).not.toHaveBeenCalled();
    expect(scope.name).toBe("sjp-public-list+cookie-policy+subscriptions");
    expect(scope.journeys).toEqual(["subscriptions"]);
    expect(scope.pages).toEqual(["page--cookie-policy"]);
  });

  it("should reject a journey pip does not have, listing only real journeys", async () => {
    // Act
    const result = run("--out", out, "--journey", "no-such-journey");

    // Assert
    const error = await result.catch((caught: Error) => caught);
    expect((error as Error).message).toMatch(/^no pip journey no-such-journey \(one of: .*subscriptions/);
    expect((error as Error).message).not.toMatch(/index|steps|\.test/);
  });

  it("should refuse a scope with nothing to record", async () => {
    // Arrange
    mocks.ticketText.mockResolvedValue("Nothing relevant here.");

    // Act
    const result = run("--out", out, "--ticket", "9");

    // Assert
    await expect(result).rejects.toThrow("nothing to record: the ticket names no list types or pages pip has");
  });

  it("should require --out", async () => {
    // Act
    process.argv = ["node", "scope.ts"];
    const result = import("./scope.js");

    // Assert
    await expect(result).rejects.toThrow("--out is required");
  });
});
