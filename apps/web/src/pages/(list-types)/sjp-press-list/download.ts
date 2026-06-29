import { downloadBlob } from "@hmcts/azure-blob";
import { prisma } from "@hmcts/postgres-prisma";
import { getContentType } from "@hmcts/publication";
import type { NextFunction, Request, RequestHandler, Response } from "express";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_TYPES = new Set(["pdf", "xlsx"]);

const requireVerifiedWithProvenance: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== "VERIFIED" || !req.user.provenance) {
    req.session.returnTo = req.originalUrl;
    return res.redirect("/sign-in");
  }

  const artefactId = req.query.artefactId as string;
  if (!artefactId || !UUID_REGEX.test(artefactId)) {
    req.session.returnTo = req.originalUrl;
    return res.redirect("/sign-in");
  }

  const artefact = await prisma.artefact.findUnique({ where: { artefactId } });
  if (!artefact) {
    req.session.returnTo = req.originalUrl;
    return res.redirect("/sign-in");
  }

  const dbListType = await prisma.listType.findUnique({ where: { id: artefact.listTypeId } });
  if (!dbListType || !dbListType.allowedProvenance.split(",").includes(req.user.provenance)) {
    req.session.returnTo = req.originalUrl;
    return res.redirect("/sign-in");
  }

  next();
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

export const GET: RequestHandler[] = [requireVerifiedWithProvenance, getHandler];
