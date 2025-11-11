import type { Request, Response } from "express";
import { getCftIdamConfig, isCftIdamConfigured } from "../../config/cft-idam-config.js";

export const GET = (req: Request, res: Response) => {
  if (!isCftIdamConfigured()) {
    console.warn("CFT IDAM authentication attempted but CFT IDAM is not configured");
    return res.status(503).send("CFT IDAM authentication is not available. Please check configuration.");
  }

  const config = getCftIdamConfig();
  const locale = (req.query.lng as string) || res.locals.locale || "en";

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    ui_locales: locale
  });

  const authorizationUrl = `${config.authorizationEndpoint}?${params.toString()}`;

  res.redirect(authorizationUrl);
};
