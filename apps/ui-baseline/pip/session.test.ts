import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParityUser } from "../fixtures/manifest.js";

const mocks = vi.hoisted(() => ({ files: new Map<string, string>(), loadEnvironment: vi.fn() }));
vi.mock("../environments.js", () => ({ loadEnvironment: mocks.loadEnvironment }));
// The saved sessions are read from the real output/seed, so that one file is faked
vi.mock("node:fs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:fs")>()),
  existsSync: (file: string) => mocks.files.has(file)
}));
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, readFile: vi.fn(async (file: string, encoding: BufferEncoding) => mocks.files.get(file) ?? actual.readFile(file, encoding)) };
});

const { loadPipSessions, signedInTargets } = await import("./session.js");

const SIGN_IN_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "../output/seed/pip-sign-in-test.json");
const MEDIA: ParityUser = {
  id: "verified-media",
  provenance: "PI_AAD",
  role: "VERIFIED",
  provenanceUserId: "m-oid",
  email: "m@example.com",
  forenames: "M",
  surname: "M"
};
const ADMIN: ParityUser = { ...MEDIA, id: "system-admin", provenance: "SSO", role: "SYSTEM_ADMIN", provenanceUserId: "a-oid" };
const CONSENT = { name: "consent", value: "1" };
const TARGET = { id: "civil", url: "https://pip/civil", locales: ["en", "cy"], cookies: [CONSENT] };

describe("pip sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.files.clear();
    mocks.loadEnvironment.mockResolvedValue({ name: "test", pip: { baseUrl: "https://pip-test" } });
  });

  it("should sign in to the local pip through /parity-login, one target for both languages", async () => {
    // Act
    const sessions = await loadPipSessions("local");
    const { targets } = signedInTargets(sessions, TARGET, MEDIA);

    // Assert
    expect(sessions.baseUrl).toBe("https://localhost:8180");
    expect(targets).toEqual([{ ...TARGET, setup: ["https://localhost:8180/parity-login?oid=m-oid&flow=AAD&redirect=/"] }]);
  });

  it("should sign in to a deployed pip with each language's saved session, and report a user it has none for", async () => {
    // Arrange
    mocks.files.set(
      SIGN_IN_FILE,
      JSON.stringify({
        users: {
          "verified-media": {
            account: "VERIFIED/PI_AAD",
            email: "real@example.com",
            role: "VERIFIED",
            cookies: { en: [{ name: "s", value: "en" }], cy: [{ name: "s", value: "cy" }] }
          }
        },
        unavailable: { "system-admin": "no SYSTEM_ADMIN/SSO test account configured" }
      })
    );

    // Act
    const sessions = await loadPipSessions("test");
    const media = signedInTargets(sessions, TARGET, MEDIA);
    const admin = signedInTargets(sessions, TARGET, ADMIN);

    // Assert
    expect(sessions.baseUrl).toBe("https://pip-test");
    expect(media.targets).toEqual([
      { ...TARGET, locales: ["en"], cookies: [CONSENT, { name: "s", value: "en" }] },
      { ...TARGET, locales: ["cy"], cookies: [CONSENT, { name: "s", value: "cy" }] }
    ]);
    expect(admin).toEqual({ targets: [], unavailable: "no SYSTEM_ADMIN/SSO test account configured" });
  });

  it("should need pip/sign-in.ts to have signed in to a deployed pip first", async () => {
    // Act
    const sessions = loadPipSessions("test");

    // Assert
    await expect(sessions).rejects.toThrow("no pip-sign-in-test.json: sign in to pip first (tsx apps/ui-baseline/pip/sign-in.ts --env test)");
  });
});
