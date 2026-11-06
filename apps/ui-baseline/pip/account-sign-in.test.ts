import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Environment } from "../environments.js";
import type { ParityUser } from "../fixtures/manifest.js";
import { signInToPipWithAccounts } from "./account-sign-in.js";

vi.mock("../core/index.js", () => ({ launchChromium: vi.fn() }));
const { launchChromium } = await import("../core/index.js");

const BASE_URL = "https://pip.example.net";

function user(id: string, role: string, provenance: ParityUser["provenance"] = "CFT_IDAM"): ParityUser {
  return { id, provenance, role, provenanceUserId: id, email: `${id}@example.com`, forenames: "F", surname: "S" };
}

function locator() {
  const self: Record<string, ReturnType<typeof vi.fn>> = {};
  Object.assign(self, {
    first: vi.fn(() => self),
    or: vi.fn(() => self),
    fill: vi.fn(),
    click: vi.fn(),
    waitFor: vi.fn(),
    isVisible: vi.fn().mockResolvedValue(false)
  });
  return self;
}

// A page goes where it is sent, except that pip sends a session without the role from its home to
// redirectTo, and the cookies are what the context ends up holding
function fakeBrowser(options: { redirectTo?: string; cookies?: { name: string; value: string }[] } = {}) {
  const pages: Record<string, ReturnType<typeof vi.fn>>[] = [];
  const browser = {
    close: vi.fn(),
    newContext: vi.fn(async () => ({
      close: vi.fn(),
      cookies: vi.fn().mockResolvedValue(options.cookies ?? [{ name: "session", value: "abc", domain: "x" }]),
      newPage: vi.fn(async () => {
        let current = BASE_URL;
        const page = {
          goto: vi.fn(async (url: string) => {
            const target = new URL(url);
            current = options.redirectTo && target.pathname !== "/cft-login" ? `${BASE_URL}${options.redirectTo}` : url;
          }),
          url: vi.fn(() => current),
          waitForURL: vi.fn(),
          locator: vi.fn(() => locator()),
          getByRole: vi.fn(() => locator())
        };
        pages.push(page);
        return page;
      })
    }))
  };
  vi.mocked(launchChromium).mockResolvedValue(browser as never);
  return { browser, pages };
}

function environment(accounts: Environment["pip"]["accounts"], secrets: Record<string, string | null>) {
  const secret = vi.fn(async (_config: { keyVault?: string }, name: string) => secrets[name] ?? null);
  const env: Environment = {
    name: "test",
    cath: { baseUrl: "https://cath.example.net", apiUrl: "https://cath-api.example.net", signIn: "accounts", storage: {}, filesWaitSeconds: 0 },
    pip: { baseUrl: BASE_URL, keyVault: "pip-kv", storage: {}, accounts },
    secret
  };
  return { env, secret };
}

describe("signInToPipWithAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should sign in once per locale through CFT IDAM, check the role's home opens, and share the account among its users", async () => {
    // Arrange
    const { browser, pages } = fakeBrowser();
    const { env, secret } = environment(
      { "VERIFIED/CFT_IDAM": { user: "idam-user", password: "idam-pwd", keyVault: "cath-kv" } },
      { "idam-user": "real@example.com", "idam-pwd": "pw" }
    );

    // Act
    const result = await signInToPipWithAccounts(env, [user("media-a", "VERIFIED"), user("media-b", "VERIFIED")]);

    // Assert
    expect(secret).toHaveBeenCalledWith(expect.objectContaining({ keyVault: "cath-kv" }), "idam-user");
    expect(pages[0].goto).toHaveBeenCalledWith(`${BASE_URL}/cft-login?lng=en`);
    expect(pages[0].goto).toHaveBeenCalledWith(`${BASE_URL}/account-home?lng=en`);
    expect(pages[1].goto).toHaveBeenCalledWith(`${BASE_URL}/cft-login?lng=cy`);
    const expected = {
      account: "VERIFIED/CFT_IDAM",
      email: "real@example.com",
      role: "VERIFIED",
      cookies: { en: [{ name: "session", value: "abc" }], cy: [{ name: "session", value: "abc" }] }
    };
    expect(result).toEqual({ users: { "media-a": expected, "media-b": expected }, unavailable: {} });
    expect(browser.close).toHaveBeenCalled();
  });

  it("should keep users of the same role but another provenance apart, and report those with no account", async () => {
    // Arrange
    fakeBrowser();
    const { env } = environment({ "VERIFIED/CFT_IDAM": { user: "idam-user", password: "idam-pwd" } }, { "idam-user": "real@example.com", "idam-pwd": "pw" });

    // Act
    const result = await signInToPipWithAccounts(env, [
      user("cft-media", "VERIFIED"),
      user("b2c-media", "VERIFIED", "PI_AAD"),
      user("admin", "SYSTEM_ADMIN", "SSO")
    ]);

    // Assert
    expect(Object.keys(result.users)).toEqual(["cft-media"]);
    expect(result.unavailable).toEqual({
      "b2c-media": "no VERIFIED/PI_AAD test account configured",
      admin: "no SYSTEM_ADMIN/SSO test account configured"
    });
  });

  it("should report an account that is not in its vault", async () => {
    // Arrange
    fakeBrowser();
    const { env } = environment({ "VERIFIED/CFT_IDAM": { user: "gone", password: "gone-pwd" } }, {});

    // Act
    const result = await signInToPipWithAccounts(env, [user("media", "VERIFIED")]);

    // Assert
    expect(result.unavailable).toEqual({ media: "no VERIFIED/CFT_IDAM test account in pip-kv (gone)" });
  });

  it("should report an account that signs in without the role, and carry on with the others", async () => {
    // Arrange
    fakeBrowser({ redirectTo: "/cft-rejected-login" });
    const { env } = environment({ "VERIFIED/CFT_IDAM": { user: "u", password: "p" } }, { u: "real@example.com", p: "pw" });

    // Act
    const result = await signInToPipWithAccounts(env, [user("media", "VERIFIED")]);

    // Assert
    expect(result.users).toEqual({});
    expect(result.unavailable.media).toBe(
      "signing in as the VERIFIED/CFT_IDAM test account failed: signed in, but /account-home sent the session to /cft-rejected-login: the account may lack the VERIFIED role"
    );
  });

  it("should report a sign-in that leaves no session cookie", async () => {
    // Arrange
    fakeBrowser({ cookies: [] });
    const { env } = environment({ "VERIFIED/CFT_IDAM": { user: "u", password: "p" } }, { u: "real@example.com", p: "pw" });

    // Act
    const result = await signInToPipWithAccounts(env, [user("media", "VERIFIED")]);

    // Assert
    expect(result.unavailable.media).toBe("signing in as the VERIFIED/CFT_IDAM test account failed: signing in through CFT IDAM left no pip session");
  });

  it("should fail when the environment has no pip baseUrl", async () => {
    // Arrange
    const { env } = environment({}, {});
    env.pip.baseUrl = undefined;

    // Act
    const signIn = signInToPipWithAccounts(env, [user("admin", "SYSTEM_ADMIN")]);

    // Assert
    await expect(signIn).rejects.toThrow("environment test has no pip baseUrl");
  });
});
