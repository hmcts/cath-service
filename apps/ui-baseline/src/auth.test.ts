import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import express from "express";
import * as oidc from "openid-client";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type AuthConfig, createAuth } from "./auth.js";

vi.mock("openid-client", () => ({
  discovery: vi.fn(async () => ({ issuer: "https://login.example" })),
  randomPKCECodeVerifier: vi.fn(() => "verifier"),
  randomState: vi.fn(() => "state"),
  calculatePKCECodeChallenge: vi.fn(async () => "challenge"),
  buildAuthorizationUrl: vi.fn(() => new URL("https://login.example/authorize?state=state")),
  authorizationCodeGrant: vi.fn()
}));

const ADMIN_GROUP = "admin-group";
const CONFIG: AuthConfig = {
  disabled: false,
  baseUrl: "https://ui-baseline.example",
  issuerUrl: "https://login.example/v2.0",
  clientId: "client",
  clientSecret: "secret",
  allowedGroupIds: [ADMIN_GROUP],
  secureCookies: false,
  cookieKey: Buffer.alloc(32, 1)
};

// The auth routes and one page behind sign-in that shows who is signed in. Views are rendered as
// their name and the failure flag, so tests can tell which page was shown.
async function appWith(config: AuthConfig = CONFIG) {
  const views = await mkdtemp(path.join(tmpdir(), "auth-views-"));
  await writeFile(path.join(views, "no-access.html"), "");
  const app = express();
  app.engine("html", (file, options, callback) =>
    callback(null, `${path.basename(file, ".html")}${(options as { failed?: boolean }).failed ? " failed" : ""}`)
  );
  app.set("view engine", "html");
  app.set("views", views);
  const auth = await createAuth(config);
  app.use(auth.router);
  app.get("/runs", auth.requireUser, (_req, res) => res.json(res.locals.user));
  return app;
}

// Graph's memberOf, a page at a time
function graphReturns(...pages: string[][]) {
  const fetch = vi.fn(async (url: string, _init?: RequestInit) => {
    const index = url.includes("page=") ? Number(new URL(url).searchParams.get("page")) : 0;
    const next = index + 1 < pages.length ? { "@odata.nextLink": `https://graph.microsoft.com/v1.0/me/memberOf?page=${index + 1}` } : {};
    return new Response(JSON.stringify({ value: pages[index].map((id) => ({ id })), ...next }));
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function grantGives(claims: Record<string, string>) {
  vi.mocked(oidc.authorizationCodeGrant).mockResolvedValue({ access_token: "token", claims: () => claims } as never);
}

// Starts sign-in, then comes back from Entra ID, keeping the cookies between the two
async function signIn(app: express.Express, returnTo = "/runs") {
  const agent = request.agent(app);
  await agent.get(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  const back = await agent.get("/sso/return?code=code&state=state");
  return { agent, back };
}

describe("createAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should send the user to Entra ID with PKCE and this app's return address", async () => {
    // Arrange
    const app = await appWith();

    // Act
    const response = await request(app).get("/sign-in?returnTo=/runs");

    // Assert
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("https://login.example/authorize?state=state");
    expect(oidc.buildAuthorizationUrl).toHaveBeenCalledWith(expect.anything(), {
      redirect_uri: "https://ui-baseline.example/sso/return",
      scope: "openid profile email",
      code_challenge: "challenge",
      code_challenge_method: "S256",
      state: "state"
    });
  });

  it("should sign in a member of an allowed group and return them to where they were going", async () => {
    // Arrange
    const app = await appWith();
    grantGives({ name: "Tester", preferred_username: "tester@example.com" });
    const fetch = graphReturns(["other-group"], [ADMIN_GROUP]);

    // Act
    const { agent, back } = await signIn(app);
    const page = await agent.get("/runs");

    // Assert
    expect(back.status).toBe(302);
    expect(back.headers.location).toBe("/runs");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][1]).toEqual({ headers: { Authorization: "Bearer token" } });
    expect(page.body).toEqual({ name: "Tester", email: "tester@example.com" });
    expect(oidc.authorizationCodeGrant).toHaveBeenCalledWith(expect.anything(), new URL("https://ui-baseline.example/sso/return?code=code&state=state"), {
      pkceCodeVerifier: "verifier",
      expectedState: "state"
    });
  });

  it.each(["//evil.example/runs", "/\\evil.example", "https://evil.example"])(
    "should return to the home page rather than %s after signing in",
    async (returnTo) => {
      // Arrange
      const app = await appWith();
      grantGives({ name: "Tester", preferred_username: "tester@example.com" });
      graphReturns([ADMIN_GROUP]);

      // Act
      const { back } = await signIn(app, returnTo);

      // Assert
      expect(back.headers.location).toBe("/");
    }
  );

  it("should refuse a user in none of the allowed groups", async () => {
    // Arrange
    const app = await appWith();
    grantGives({ name: "Someone", preferred_username: "someone@example.com" });
    graphReturns(["other-group"]);

    // Act
    const { agent, back } = await signIn(app);
    const page = await agent.get("/runs");

    // Assert
    expect(back.status).toBe(403);
    expect(back.text).toBe("no-access");
    expect(page.status).toBe(302);
  });

  it("should show that sign-in failed when the code cannot be exchanged", async () => {
    // Arrange
    const app = await appWith();
    vi.mocked(oidc.authorizationCodeGrant).mockRejectedValue(new Error("invalid_grant"));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act
    const { back } = await signIn(app);

    // Assert
    expect(back.status).toBe(401);
    expect(back.text).toBe("no-access failed");
    expect(errors).toHaveBeenCalledWith("[ui-baseline] sign-in failed:", "invalid_grant");
    errors.mockRestore();
  });

  it("should show that sign-in failed when Graph cannot list the user's groups", async () => {
    // Arrange
    const app = await appWith();
    grantGives({ name: "Tester", preferred_username: "tester@example.com" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 503 }))
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Act
    const { back } = await signIn(app);

    // Assert
    expect(back.status).toBe(401);
  });

  it("should start sign-in again when Entra ID returns without one in progress", async () => {
    // Arrange
    const app = await appWith();

    // Act
    const response = await request(app).get("/sso/return?code=code&state=state");

    // Assert
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/sign-in");
    expect(oidc.authorizationCodeGrant).not.toHaveBeenCalled();
  });

  it("should send a signed-out user to sign in, remembering the page they asked for", async () => {
    // Arrange
    const app = await appWith();

    // Act
    const response = await request(app).get("/runs?page=2");

    // Assert
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(`/sign-in?returnTo=${encodeURIComponent("/runs?page=2")}`);
  });

  it("should sign the user out", async () => {
    // Arrange
    const app = await appWith();
    grantGives({ name: "Tester", preferred_username: "tester@example.com" });
    graphReturns([ADMIN_GROUP]);
    const { agent } = await signIn(app);

    // Act
    const signedOut = await agent.get("/sign-out");
    const page = await agent.get("/runs");

    // Assert
    expect(signedOut.headers.location).toBe("/signed-out");
    expect(page.status).toBe(302);
  });

  it("should let everyone in as a local developer when sign-in is turned off", async () => {
    // Arrange
    const app = await appWith({ ...CONFIG, disabled: true });

    // Act
    const page = await request(app).get("/runs");

    // Assert
    expect(page.body).toEqual({ name: "Local developer", email: "local@example.com" });
    expect(oidc.discovery).not.toHaveBeenCalled();
  });
});
