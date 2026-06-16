import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "@hmcts/postgres-prisma";
import type { NextFunction, Request, RequestHandler, Response } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..");
const STORAGE_DIR = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_TYPES = new Set(["pdf", "xlsx"]);
const CONTENT_TYPE_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};

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

  const fileName = `${artefactId}.${type}`;
  const filePath = path.join(STORAGE_DIR, fileName);

  // Prevent path traversal
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(STORAGE_DIR))) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const fileBuffer = await fs.readFile(filePath);
    const contentType = CONTENT_TYPE_MAP[`.${type}`] || "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");

    return res.send(fileBuffer);
  } catch {
    return res.status(404).json({ error: "File not found" });
  }
};

export const GET: RequestHandler[] = [requireVerifiedWithProvenance, getHandler];
