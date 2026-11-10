import { randomBytes, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

// The app has no sign-in, so a run can be started by anyone who can reach it. What it must not allow
// is another site starting one through a VPN user's browser: a run uses the pod's credentials and
// publishes through CaTH's API. Each form carries a token that matches a cookie only this app sets,
// which another site can neither read nor set, and a request the browser says came from another site
// is refused outright.
const COOKIE = "ui-baseline-form";
export const TOKEN_FIELD = "formToken";
const TOKEN = /^[0-9a-f]{64}$/;
// Sent by browsers with every request: the request came from this app's own pages, or was typed in
const SAME_SITE_FETCH = new Set(["same-origin", "none"]);

// Gives the page a token for its forms (res.locals.formToken), setting the cookie it must match
export function formToken() {
  return (req: Request, res: Response, next: NextFunction) => {
    const existing = cookie(req, COOKIE);
    const token = existing && TOKEN.test(existing) ? existing : randomBytes(32).toString("hex");
    if (token !== existing) {
      const secure = req.secure || req.get("x-forwarded-proto") === "https";
      res.append("Set-Cookie", `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`);
    }
    res.locals.formToken = token;
    next();
  };
}

// Refuses a form posted from another site, or without the token this app's own forms carry
export function sameSiteForm() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (fromAnotherSite(req) || !tokenMatches(req)) return res.status(403).render("forbidden");
    next();
  };
}

function fromAnotherSite(req: Request): boolean {
  const fetchSite = req.get("sec-fetch-site");
  if (fetchSite && !SAME_SITE_FETCH.has(fetchSite)) return true;
  const origin = req.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== req.get("host");
  } catch {
    // "null", from a sandboxed frame or a redirect, is never this app
    return true;
  }
}

function tokenMatches(req: Request): boolean {
  const expected = cookie(req, COOKIE);
  const given = (req.body as Record<string, unknown> | undefined)?.[TOKEN_FIELD];
  if (!expected || !TOKEN.test(expected) || typeof given !== "string" || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

function cookie(req: Request, name: string): string | undefined {
  const pair = (req.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return pair?.slice(name.length + 1);
}
