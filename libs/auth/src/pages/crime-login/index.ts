import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { getCrimeIdamConfig, isCrimeIdamConfigured } from "../../config/crime-idam-config.js";

export const GET = (req: Request, res: Response) => {
  if (!isCrimeIdamConfigured()) {
    console.warn("Crime IDAM authentication attempted but Crime IDAM is not configured");
    return res.status(503).send("Crime IDAM authentication is not available. Please check configuration.");
  }

  const config = getCrimeIdamConfig();
  const locale = (req.query.lng as string) || res.locals.locale || "en";

  // Store language preference in session to preserve it after Crime IDAM redirect
  req.session.lng = locale;

  const state = randomUUID();
  req.session.crimeOauthState = state;

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state,
    ui_locales: locale
  });

  const authorizationUrl = `${config.authorizationEndpoint}?${params.toString()}`;

  res.redirect(authorizationUrl);
};
