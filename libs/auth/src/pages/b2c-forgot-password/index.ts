import type { Request, Response } from "express";
import { getB2cBaseUrl, getB2cConfig, isB2cConfigured } from "../../config/b2c-config.js";

/**
 * Redirects to Azure B2C password reset flow
 */
export const GET = (req: Request, res: Response) => {
  if (!isB2cConfigured()) {
    console.warn("B2C password reset attempted but B2C is not configured");
    return res.status(503).send("B2C authentication is not available. Please check configuration.");
  }

  const b2cConfig = getB2cConfig();
  const locale = (req.query.lng as string) || res.locals.locale || "en";
  const uiLocale = locale === "cy" ? "cy-GB" : locale;

  // Store locale in session for redirect after password reset
  req.session.b2cLocale = locale;

  // Build B2C password reset URL
  const b2cBaseUrl = getB2cBaseUrl();
  const resetUrl = new URL(`${b2cBaseUrl}/oauth2/v2.0/authorize`);
  resetUrl.searchParams.set("p", b2cConfig.policyPasswordReset);
  resetUrl.searchParams.set("client_id", b2cConfig.clientId);
  resetUrl.searchParams.set("redirect_uri", b2cConfig.redirectUri);
  resetUrl.searchParams.set("response_type", b2cConfig.responseType);
  resetUrl.searchParams.set("response_mode", b2cConfig.responseMode);
  resetUrl.searchParams.set("scope", b2cConfig.scope.join(" "));
  resetUrl.searchParams.set("ui_locales", uiLocale);
  resetUrl.searchParams.set("state", generateState(req));
  resetUrl.searchParams.set("nonce", generateNonce());

  res.redirect(resetUrl.toString());
};

function generateState(req: Request): string {
  const sessionId = req.session.id || "unknown";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);

  return Buffer.from(`${sessionId}:${timestamp}:${random}`).toString("base64");
}

function generateNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_";
  let nonce = "";
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
