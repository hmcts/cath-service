import { downloadBlob } from "@hmcts/azure-blob";
import { getContentType } from "@hmcts/publication";
import type { NextFunction, Request, RequestHandler, Response } from "express";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_TYPES = new Set(["pdf", "xlsx"]);

const requireVerified: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role === "VERIFIED") return next();
  req.session.returnTo = req.originalUrl;
  res.redirect("/sign-in");
};

const getHandler = async (req: Request, res: Response) => {
  const artefactId = req.query.artefactId as string;
  const type = req.query.type as string;

  if (!artefactId || !UUID_REGEX.test(artefactId) || !type || !ALLOWED_TYPES.has(type)) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const extension = `.${type}`;
  const fileName = `${artefactId}${extension}`;
  const fileBuffer = await downloadBlob(fileName);

  if (!fileBuffer) {
    return res.status(404).json({ error: "File not found" });
  }

  res.setHeader("Content-Type", getContentType(extension));
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");

  return res.send(fileBuffer);
};

export const GET: RequestHandler[] = [requireVerified, getHandler];
