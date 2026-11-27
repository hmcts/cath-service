import { randomBytes } from "node:crypto";
import { getB2cBaseUrl, getB2cConfig, isB2cConfigured } from "@hmcts/auth";
import type { Request, Response } from "express";

const VERIFIED_RETURN_TO = "/account-home?verified=true";

export const GET = (req: Request, res: Response) => {
  if (!isB2cConfigured()) {
    console.warn("B2C media verification attempted but B2C is not configured");
    return res.status(503).send("B2C authentication is not available. Please check configuration.");
  }

  const b2cConfig = getB2cConfig();
  const locale = (req.query.lng as string) || res.locals.locale || "en";
  const uiLocale = locale === "cy" ? "cy-GB" : locale;

  req.session.b2cProvider = "media_verification";
  req.session.returnTo = VERIFIED_RETURN_TO;
  req.session.b2cLocale = locale;

  const authUrl = new URL(`${getB2cBaseUrl()}/oauth2/v2.0/authorize`);
  authUrl.searchParams.set("p", b2cConfig.policyMediaVerification);
  authUrl.searchParams.set("client_id", b2cConfig.clientId);
  authUrl.searchParams.set("redirect_uri", b2cConfig.redirectUri);
  authUrl.searchParams.set("response_type", b2cConfig.responseType);
  authUrl.searchParams.set("response_mode", b2cConfig.responseMode);
  authUrl.searchParams.set("scope", b2cConfig.scope.join(" "));
  authUrl.searchParams.set("ui_locales", uiLocale);
  authUrl.searchParams.set("state", generateState(req));
  authUrl.searchParams.set("nonce", generateNonce());

  res.redirect(authUrl.toString());
};

function generateState(req: Request): string {
  const sessionId = req.session.id || "unknown";
  const random = randomBytes(16).toString("hex");
  return Buffer.from(`${sessionId}:${Date.now()}:${random}`).toString("base64");
}

function generateNonce(): string {
  return randomBytes(32).toString("base64url");
}
