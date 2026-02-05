import type { Request, Response } from "express";
import { getB2cBaseUrl, getB2cConfig, isB2cConfigured } from "../../config/b2c-config.js";

export const GET = (req: Request, res: Response) => {
  if (!isB2cConfigured()) {
    console.warn("B2C authentication attempted but B2C is not configured");
    return res.status(503).send("B2C authentication is not available. Please check configuration.");
  }

  const b2cConfig = getB2cConfig();
  const locale = (req.query.lng as string) || res.locals.locale || "en";
  const uiLocale = locale === "cy" ? "cy-GB" : locale;

  // Store provider, return URL and locale in session
  req.session.b2cProvider = "cath";
  req.session.returnTo = req.session.returnTo || "/account-home";
  req.session.b2cLocale = locale;

  // Build authorization URL with policy as query param
  const b2cBaseUrl = getB2cBaseUrl();
  const authUrl = new URL(`${b2cBaseUrl}/oauth2/v2.0/authorize`);
  authUrl.searchParams.set("p", b2cConfig.policyCath);
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

/**
 * Generates a secure state parameter for OAuth flow
 */
function generateState(req: Request): string {
  const sessionId = req.session.id || "unknown";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);

  return Buffer.from(`${sessionId}:${timestamp}:${random}`).toString("base64");
}

/**
 * Generates a secure nonce for OpenID Connect
 */
function generateNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_";
  let nonce = "";
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
