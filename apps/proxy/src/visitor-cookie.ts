import crypto from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";

const COOKIE_NAME = "cath_visitor_id";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function visitorCookie(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    let visitorId = req.cookies?.[COOKIE_NAME];

    if (!visitorId) {
      visitorId = crypto.randomUUID();
      res.cookie(COOKIE_NAME, visitorId, {
        maxAge: ONE_YEAR_MS,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
      });
    }

    res.locals.visitorId = visitorId;
    next();
  };
}
