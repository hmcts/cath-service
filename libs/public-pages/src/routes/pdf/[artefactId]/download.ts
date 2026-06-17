import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getArtefactById } from "@hmcts/publication";
import type { Request, Response } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..", "..");
const STORAGE_BASE = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET = async (req: Request, res: Response) => {
  const artefactId = req.params["artefactId"];
  const id = Array.isArray(artefactId) ? artefactId[0] : artefactId;

  if (!id || !UUID_REGEX.test(id)) {
    res.setHeader("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    return res.status(400).json({ error: "Invalid request" });
  }

  const artefact = await getArtefactById(id);

  if (!artefact) {
    res.setHeader("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    return res.status(404).json({ error: "Artefact not found" });
  }

  const now = new Date();
  if (now < artefact.displayFrom || now > artefact.displayTo) {
    res.setHeader("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    return res.status(410).json({ error: "File has expired" });
  }

  const pdfPath = path.join(STORAGE_BASE, `${id}.pdf`);
  const resolvedPath = path.resolve(pdfPath);
  const resolvedBase = path.resolve(STORAGE_BASE);

  if (!resolvedPath.startsWith(resolvedBase + path.sep)) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const pdfBuffer = await fs.readFile(resolvedPath);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${id}.pdf"`);
    res.setHeader("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    return res.send(pdfBuffer);
  } catch {
    res.setHeader("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    return res.status(404).json({ error: "PDF not found" });
  }
};
