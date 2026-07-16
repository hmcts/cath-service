import { sjpPublicListCy as cy, sjpPublicListEn as en } from "@hmcts/sjp-public-list";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { createListDownloadFilesHandler } from "../sjp-download-shared.js";

const requireVerified: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role === "VERIFIED") return next();
  req.session.returnTo = req.originalUrl;
  res.redirect("/sign-in");
};

const getHandler = createListDownloadFilesHandler(en, cy, "downloadFiles");

export const GET: RequestHandler[] = [requireVerified, getHandler];
