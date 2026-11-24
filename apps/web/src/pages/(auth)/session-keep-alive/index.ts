import type { Request, Response } from "express";

// The session is renewed by sessionTimeoutMiddleware before this handler runs, so it only reports
// the outcome. res.end() rather than send()/json() keeps auditLogMiddleware from logging each renewal.
export const POST = async (req: Request, res: Response) => {
  res.set("Cache-Control", "no-store");
  res.status(req.isAuthenticated() ? 204 : 401).end();
};
