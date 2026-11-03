import { buildSignOutRedirectUrl } from "@hmcts/auth";
import type { Request, Response } from "express";

/**
 * Destroys the session, then signs the user out of their identity provider (CFT IDAM, B2C or
 * Microsoft SSO; Crime IDAM is local only) before landing on /session-logged-out.
 */
export const GET = async (req: Request, res: Response) => {
  const redirectUrl = buildSignOutRedirectUrl({
    provenance: req.user?.provenance,
    locale: res.locals.locale,
    origin: `${req.protocol}://${req.get("host")}`
  });

  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.redirect(redirectUrl);
    });
  });
};
