import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Environment } from "../environments.js";
import type { ParityUser } from "../fixtures/manifest.js";
import { signInWithAccounts } from "./account-sign-in.js";

vi.mock("../core/index.js", async () => ({
  launchChromium: vi.fn(),
  acceptsUnverifiedCertificate: (await vi.importActual<typeof import("../core/capture/browser.js")>("../core/capture/browser.js")).acceptsUnverifiedCertificate
}));
const { launchChromium } = await import("../core/index.js");

const BASE_URL = "https://cath.example.net";
const API_URL = "https://cath-api.example.net";

function user(id: string, role: string): ParityUser {
  return { id, provenance: "CFT_IDAM", role, provenanceUserId: id, email: `${id}@example.com`, forenames: "F", surname: "S" };
}

function locator(visible = true) {
  const self: Record<string, ReturnType<typeof vi.fn>> = {};
  Object.assign(self, {
    first: vi.fn(() => self),
    or: vi.fn(() => self),
    fill: vi.fn(),
    click: vi.fn(),
    waitFor: vi.fn(),
    isVisible: vi.fn().mockResolvedValue(visible)
  });
  return self;
}

function fakeBrowser(options: { modernIdam?: boolean; cookies?: { name: string; value: string }[] } = {}) {
  const pages: Record<string, ReturnType<typeof vi.fn>>[] = [];
  const contexts: Record<string, ReturnType<typeof vi.fn>>[] = [];
  const browser = {
    close: vi.fn(),
    newContext: vi.fn(async () => {
      const context = {
        close: vi.fn(),
        cookies: vi.fn().mockResolvedValue(options.cookies ?? [{ name: "session", value: "abc", domain: "x" }]),
        newPage: vi.fn(async () => {
          const page = {
            goto: vi.fn(),
            waitForURL: vi.fn(async (matcher: unknown) => {
              if (typeof matcher === "function") expect(matcher(new URL(BASE_URL))).toBe(true);
            }),
            locator: vi.fn((selector: string) => {
              if (selector === "input#email") return locator(options.modernIdam ?? false);
              return locator();
            }),
            getByRole: vi.fn(() => locator())
          };
          pages.push(page);
          return page;
        })
      };
      contexts.push(context);
      return context;
    })
  };
  vi.mocked(launchChromium).mockResolvedValue(browser as never);
  return { browser, pages, contexts };
}

function environment(accounts: Environment["cath"]["accounts"], secrets: Record<string, string | null>): Environment {
  return {
    name: "test",
    cath: { baseUrl: BASE_URL, apiUrl: API_URL, signIn: "accounts", accounts, keyVault: "cath-test", storage: {}, filesWaitSeconds: 0 },
    pip: { storage: {} },
    secret: vi.fn(async (_config, name: string) => secrets[name] ?? null)
  };
}

describe("signInWithAccounts", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ userId: "cath-verified", email: "real@example.com", role: "VERIFIED", userProvenance: "CFT_IDAM" }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("should sign in once per locale through CFT IDAM and share the account among the role's users", async () => {
    // Arrange
    const { browser, pages, contexts } = fakeBrowser();
    const env = environment({ VERIFIED: { user: "idam-user", password: "idam-pwd" } }, { "idam-user": "real@example.com", "idam-pwd": "pw" });

    // Act
    const result = await signInWithAccounts(env, [user("media-a", "VERIFIED"), user("media-b", "VERIFIED")]);

    // Assert
    expect(pages[0].goto).toHaveBeenCalledWith(`${BASE_URL}/cft-login?lng=en`);
    expect(pages[1].goto).toHaveBeenCalledWith(`${BASE_URL}/cft-login?lng=cy`);
    expect(pages[0].goto).toHaveBeenCalledWith(`${BASE_URL}/?lng=en`);
    expect(contexts.every((context) => context.close.mock.calls.length === 1)).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/test-support/users?email=real%40example.com`);
    const expected = {
      userId: "cath-verified",
      role: "VERIFIED",
      cookies: { en: [{ name: "session", value: "abc" }], cy: [{ name: "session", value: "abc" }] }
    };
    expect(result.users).toEqual({ "media-a": expected, "media-b": expected });
    expect(result.cathUsers["media-b"]).toEqual({ userId: "cath-verified", email: "real@example.com", role: "VERIFIED", provenance: "CFT_IDAM" });
    expect(browser.close).toHaveBeenCalled();
  });

  it("should read an account's secrets from its own vault when it names one", async () => {
    // Arrange
    fakeBrowser();
    const env = environment({ VERIFIED: { user: "u", password: "p", keyVault: "cath-bootstrap" } }, { u: "media@example.com", p: "pw" });

    // Act
    await signInWithAccounts(env, [user("media", "VERIFIED")]);

    // Assert
    expect(env.secret).toHaveBeenCalledWith(expect.objectContaining({ keyVault: "cath-bootstrap" }), "u");
    expect(env.secret).toHaveBeenCalledWith(expect.objectContaining({ keyVault: "cath-bootstrap" }), "p");
  });

  it.each([
    [true, "input#email"],
    [false, 'input[type="text"]#username, input[type="email"]#username, input[name="username"]']
  ])("should fill the CFT IDAM form when the modern form is %s", async (modernIdam) => {
    // Arrange
    const { pages } = fakeBrowser({ modernIdam });
    const env = environment({ VERIFIED: { user: "u", password: "p" } }, { u: "media@example.com", p: "pw" });

    // Act
    await signInWithAccounts(env, [user("media", "VERIFIED")]);

    // Assert
    expect(pages[0].goto).toHaveBeenCalledWith(`${BASE_URL}/cft-login?lng=en`);
    expect(pages[0].getByRole).toHaveBeenCalledTimes(modernIdam ? 2 : 0);
  });

  it("should report users whose role has no account, as admins have none, or whose account is not in the vault", async () => {
    // Arrange
    const { browser } = fakeBrowser();
    const env = environment({ VERIFIED: { user: "idam-user", password: "idam-pwd" } }, {});

    // Act
    const result = await signInWithAccounts(env, [user("admin", "SYSTEM_ADMIN"), user("media", "VERIFIED")]);

    // Assert
    expect(result.unavailable).toEqual({
      admin: "no SYSTEM_ADMIN test account configured",
      media: "no VERIFIED test account in cath-test (idam-user)"
    });
    expect(result.users).toEqual({});
    expect(browser.newContext).not.toHaveBeenCalled();
    expect(browser.close).toHaveBeenCalled();
  });

  it("should fail for a fixture user with no CaTH role", async () => {
    // Arrange
    const { browser } = fakeBrowser();

    // Act
    const result = signInWithAccounts(environment({}, {}), [user("odd", "GENERAL_THIRD_PARTY")]);

    // Assert
    await expect(result).rejects.toThrow("missing CaTH role for odd (GENERAL_THIRD_PARTY)");
    expect(browser.close).toHaveBeenCalled();
  });

  it("should fail when signing in leaves no session cookie", async () => {
    // Arrange
    fakeBrowser({ cookies: [] });
    const env = environment({ VERIFIED: { user: "u", password: "p" } }, { u: "m@example.com", p: "pw" });

    // Act
    const result = signInWithAccounts(env, [user("media", "VERIFIED")]);

    // Assert
    await expect(result).rejects.toThrow("signing in through CFT IDAM left no CaTH session");
  });

  it("should fail when CaTH has no user for the account after signing in", async () => {
    // Arrange
    fakeBrowser();
    fetchMock.mockResolvedValue(new Response("", { status: 404 }));
    const env = environment({ VERIFIED: { user: "u", password: "p" } }, { u: "m@example.com", p: "pw" });

    // Act
    const result = signInWithAccounts(env, [user("media", "VERIFIED")]);

    // Assert
    await expect(result).rejects.toThrow("CaTH has no user for the test account after it signed in: 404");
  });
});
