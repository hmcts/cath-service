import type { NextFunction, Request, RequestHandler, Response } from "express";
import { handleBlobDownload } from "../sjp-download-shared.js";

const requireVerified: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role === "VERIFIED") return next();
  req.session.returnTo = req.originalUrl;
  res.redirect("/sign-in");
};

const getHandler: RequestHandler = async (req, res) => {
  return handleBlobDownload(req, res);
};

export const GET: RequestHandler[] = [requireVerified, getHandler];
