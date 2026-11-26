import { readFile } from "node:fs/promises";
import type { Page } from "playwright";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openBlobContainer } from "../../core/index.js";
import { filesStorage, loadEnvironment } from "../../environments.js";
import { seedResult } from "../../pip/journeys/fake-journey.test-helper.js";
import { prismaRecordStore, testSupportRecordStore } from "../records.js";

vi.mock("node:fs/promises", () => ({ readFile: vi.fn() }));
vi.mock("../../core/index.js", () => ({ openBlobContainer: vi.fn(() => "blob-container") }));
vi.mock("../../environments.js", () => ({ loadEnvironment: vi.fn(), filesStorage: vi.fn(() => "files-storage") }));
vi.mock("../records.js", () => ({ prismaRecordStore: vi.fn(async () => "prisma-store"), testSupportRecordStore: vi.fn(() => "test-support-store") }));

const COOKIE = { name: "session", value: "abc", domain: "localhost", path: "/" };
const SIGNED_IN = {
  signedInAt: "2026-01-01T00:00:00Z",
  environment: "local",
  users: { "system-admin": { userId: "cath-admin", cookies: { en: [COOKIE] } } },
  unavailable: { "super-admin-ctsc": "no test account for CTSC" },
  records: { "media-application-1": { applicantId: "app-1" } },
  listTypes: { CIVIL_DAILY_CAUSE_LIST: "1" }
};

function environment(signIn: string) {
  return { name: "local", cath: { baseUrl: "https://localhost:8080", apiUrl: "http://localhost:3001", signIn } };
}

function files(signedIn: unknown) {
  vi.mocked(readFile).mockImplementation((async (file: string) => {
    const name = String(file);
    if (name.endsWith("apps.json")) return JSON.stringify({ cath: { cookies: [{ name: "cookie_policy", value: "accepted" }] } });
    if (name.includes("cath-sign-in-")) return signedIn === undefined ? Promise.reject(new Error("ENOENT")) : JSON.stringify(signedIn);
    return JSON.stringify(seedResult());
  }) as unknown as typeof readFile);
}

async function loadSuite() {
  vi.resetModules();
  return (await import("./index.js")).default;
}

describe("CaTH journey suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadEnvironment).mockResolvedValue(environment("session") as never);
    files(SIGNED_IN);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should pass the sign-in and seed results to the journeys when loaded", async () => {
    // Act
    const suite = await loadSuite();

    // Assert
    expect(suite.baseUrl).toBe("https://localhost:8080");
    expect(suite.data).toEqual({
      listTypes: SIGNED_IN.listTypes,
      seed: seedResult(),
      users: { "system-admin": "cath-admin" },
      seededRecords: SIGNED_IN.records,
      records: "prisma-store",
      apiUrl: "http://localhost:3001"
    });
    expect(suite.journeys).toHaveLength(13);
  });

  it("should write records through test-support and target PARITY_TARGET when CaTH is deployed", async () => {
    // Arrange
    vi.stubEnv("PARITY_TARGET", "https://cath.example.com");
    vi.mocked(loadEnvironment).mockResolvedValue(environment("oidc") as never);

    // Act
    const suite = await loadSuite();

    // Assert
    expect(suite.baseUrl).toBe("https://cath.example.com");
    expect(prismaRecordStore).not.toHaveBeenCalled();
    expect(filesStorage).toHaveBeenCalledWith("cath", expect.any(Object), "files");
    expect(openBlobContainer).toHaveBeenCalledWith("files-storage");
    expect(testSupportRecordStore).toHaveBeenCalledWith("http://localhost:3001", "blob-container");
    expect(suite.data?.records).toBe("test-support-store");
  });

  it("should give empty data when there is no sign-in result yet", async () => {
    // Arrange
    files(undefined);

    // Act
    const suite = await loadSuite();

    // Assert
    expect(suite.data).toMatchObject({ listTypes: {}, users: {}, seededRecords: {} });
  });

  describe("signIn", () => {
    it("should add the user's session cookies for the locale to the browser when signed in", async () => {
      // Arrange
      const suite = await loadSuite();
      const addCookies = vi.fn();
      const page = { context: () => ({ addCookies }) } as unknown as Page;

      // Act
      await suite.signIn?.(page, "system-admin", "en");

      // Assert
      expect(addCookies).toHaveBeenCalledWith([{ ...COOKIE, url: "https://localhost:8080" }]);
    });

    it("should say why when the user cannot sign in to CaTH here", async () => {
      // Arrange
      const suite = await loadSuite();

      // Act & Assert
      await expect(suite.signIn?.({} as Page, "super-admin-ctsc", "en")).rejects.toThrow(
        "super-admin-ctsc cannot sign in to CaTH here: no test account for CTSC"
      );
    });

    it("should refuse when there is no session for the user in that locale", async () => {
      // Arrange
      const suite = await loadSuite();

      // Act & Assert
      await expect(suite.signIn?.({} as Page, "system-admin", "cy")).rejects.toThrow("no CaTH session for system-admin (cy)");
    });

    it("should ask for cath/sign-in.ts to be run when there is no sign-in result", async () => {
      // Arrange
      files(undefined);
      const suite = await loadSuite();

      // Act & Assert
      await expect(suite.signIn?.({} as Page, "system-admin", "en")).rejects.toThrow("run cath/sign-in.ts first");
    });
  });
});
