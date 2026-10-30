import { randomBytes } from "node:crypto";
import type { RequestHandler, Router } from "express";
import express from "express";
import * as oidc from "openid-client";
import { signedCookies } from "./signed-cookies.js";

// Sign-in for the hosted check: Entra ID through CaTH's own SSO app registration in the
// environment, with access limited to members of the configured groups (looked up through Graph,
// as CaTH does). The signed-in user is kept in a signed cookie, so nothing is stored server-side;
// the signing key is made per process, so signing in again after a restart is expected.
const SESSION_COOKIE = "ui_baseline_session";
const STATE_COOKIE = "ui_baseline_sign_in";
const SESSION_HOURS = 8;
const RETURN_PATH = "/sso/return";
const GRAPH_MEMBER_OF = "https://graph.microsoft.com/v1.0/me/memberOf?$select=id";

export async function createAuth(config: AuthConfig): Promise<Auth> {
  const key = config.cookieKey ?? randomBytes(32);
  const cookies = signedCookies(key, config.secureCookies);

  if (config.disabled)
    return {
      router: express.Router(),
      requireUser: (_req, res, next) => {
        res.locals.user = { name: "Local developer", email: "local@example.com" } satisfies SignedInUser;
        next();
      }
    };

  const issuer = await oidc.discovery(new URL(config.issuerUrl as string), config.clientId as string, config.clientSecret as string);
  const redirectUri = `${config.baseUrl}${RETURN_PATH}`;
  const router = express.Router();

  router.get("/sign-in", async (req, res) => {
    const verifier = oidc.randomPKCECodeVerifier();
    const state = oidc.randomState();
    const returnTo = typeof req.query.returnTo === "string" && req.query.returnTo.startsWith("/") ? req.query.returnTo : "/";
    cookies.set(res, STATE_COOKIE, { verifier, state, returnTo }, 10 * 60);
    const url = oidc.buildAuthorizationUrl(issuer, {
      redirect_uri: redirectUri,
      scope: "openid profile email",
      code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
      code_challenge_method: "S256",
      state
    });
    res.redirect(url.href);
  });

  router.get(RETURN_PATH, async (req, res) => {
    const pending = cookies.get<{ verifier: string; state: string; returnTo: string }>(req, STATE_COOKIE);
    cookies.clear(res, STATE_COOKIE);
    if (!pending) return res.redirect("/sign-in");
    try {
      const tokens = await oidc.authorizationCodeGrant(issuer, new URL(req.originalUrl, config.baseUrl), {
        pkceCodeVerifier: pending.verifier,
        expectedState: pending.state
      });
      const claims = tokens.claims();
      const groups = await memberOf(tokens.access_token);
      if (!config.allowedGroupIds.some((group) => groups.includes(group))) return res.status(403).render("no-access");
      const user: SignedInUser = {
        name: String(claims?.name ?? claims?.preferred_username ?? "Unknown"),
        email: String(claims?.preferred_username ?? claims?.email ?? "")
      };
      cookies.set(res, SESSION_COOKIE, user, SESSION_HOURS * 60 * 60);
      return res.redirect(pending.returnTo);
    } catch (error) {
      console.error("[ui-baseline] sign-in failed:", (error as Error).message);
      return res.status(401).render("no-access", { failed: true });
    }
  });

  router.get("/sign-out", (_req, res) => {
    cookies.clear(res, SESSION_COOKIE);
    res.redirect("/signed-out");
  });

  return {
    router,
    requireUser(req, res, next) {
      const user = cookies.get<SignedInUser>(req, SESSION_COOKIE);
      if (!user) return res.redirect(`/sign-in?returnTo=${encodeURIComponent(req.originalUrl)}`);
      res.locals.user = user;
      next();
    }
  };
}

async function memberOf(accessToken: string): Promise<string[]> {
  const groups: string[] = [];
  let url: string | undefined = GRAPH_MEMBER_OF;
  while (url) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`Graph memberOf failed: ${response.status}`);
    const page = (await response.json()) as { value: { id: string }[]; "@odata.nextLink"?: string };
    groups.push(...page.value.map((group) => group.id));
    url = page["@odata.nextLink"];
  }
  return groups;
}

export interface SignedInUser {
  name: string;
  email: string;
}

export interface Auth {
  router: Router;
  requireUser: RequestHandler;
}

export interface AuthConfig {
  // Only for running the app on a developer's machine; refused when NODE_ENV is production
  disabled: boolean;
  baseUrl: string;
  issuerUrl?: string;
  clientId?: string;
  clientSecret?: string;
  allowedGroupIds: string[];
  secureCookies: boolean;
  cookieKey?: Buffer;
}
