import type { CsrfSyncedToken } from "csrf-sync";
import { csrfSync } from "csrf-sync";
import type { NextFunction, Request, Response } from "express";

declare module "express-session" {
  interface SessionData {
    csrfToken?: CsrfSyncedToken;
  }
}

const CSRF_SECRET_LENGTH = 32;

const { csrfSynchronisedProtection, generateToken } = csrfSync({
  getTokenFromRequest: (req) => req.body?._csrf || req.query?._csrf,
  getTokenFromState: (req) => req.session?.csrfToken,
  storeTokenInState: (req, token) => {
    if (req.session) {
      req.session.csrfToken = token;
    }
  },
  size: CSRF_SECRET_LENGTH,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"]
});

export function configureCsrf() {
  return [
    (req: Request, _res: Response, next: NextFunction) => {
      if (!req.session) {
        throw new Error("CSRF middleware requires session middleware to be configured first");
      }
      next();
    },
    (req: Request, res: Response, next: NextFunction) => {
      // Generate token for all requests (it will be stored in session)
      res.locals.csrfToken = generateToken(req);
      next();
    },
    csrfSynchronisedProtection
  ];
}
