import { readFile } from "node:fs/promises";
import type { Page } from "playwright";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadUsers } from "../../fixtures/manifest.js";
import { seedResult } from "./fake-journey.test-helper.js";

vi.mock("node:fs/promises", () => ({ readFile: vi.fn() }));
vi.mock("../../fixtures/manifest.js", () => ({ loadUsers: vi.fn() }));

const CONFIG = { baseUrl: "http://localhost:8080", signIn: "/sign-in?{key}={provenanceUserId}&flow={flow}", cookies: [{ name: "c", value: "1" }] };
const USER = { id: "system-admin", provenance: "SSO", role: "SYSTEM_ADMIN", provenanceUserId: "sso-1", email: "a@b.c", forenames: "A", surname: "B" };

async function loadSuite() {
  vi.resetModules();
  return (await import("./index.js")).default;
}

describe("pip journey suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readFile).mockImplementation((async (file: string) =>
      JSON.stringify(String(file).endsWith("apps.json") ? { pip: CONFIG } : seedResult())) as unknown as typeof readFile);
    vi.mocked(loadUsers).mockResolvedValue([USER as never]);
  });

  it("should pass pip's config and seed to the runner when loaded", async () => {
    // Act
    const suite = await loadSuite();

    // Assert
    expect(suite).toMatchObject({ app: "pip", baseUrl: CONFIG.baseUrl, cookies: CONFIG.cookies, data: { seed: seedResult() } });
    expect(suite.journeys).toHaveLength(13);
    expect(new Set(suite.journeys.map((journey) => journey.id)).size).toBe(13);
  });

  it("should open pip's local sign-in for the user when signing in", async () => {
    // Arrange
    const suite = await loadSuite();
    const page = { goto: vi.fn() };

    // Act
    await suite.signIn?.(page as unknown as Page, "system-admin", "en");

    // Assert
    expect(page.goto).toHaveBeenCalledWith("http://localhost:8080/sign-in?oid=sso-1&flow=SSO");
  });

  it("should refuse to sign in when the user is not a parity user", async () => {
    // Arrange
    const suite = await loadSuite();

    // Act & Assert
    await expect(suite.signIn?.({ goto: vi.fn() } as unknown as Page, "nobody", "en")).rejects.toThrow("unknown parity user nobody");
  });
});
