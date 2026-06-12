import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireRole, USER_ROLES } from "@hmcts/auth";
import { getParam } from "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..", "..");
const TEMP_STORAGE_BASE = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");

function isValidFilename(filename: string): boolean {
  const validPattern = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/;
  return validPattern.test(filename);
}

function getSafeFilePath(filename: string): string | null {
  if (!isValidFilename(filename)) {
    return null;
  }

  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return null;
  }

  const filePath = path.join(TEMP_STORAGE_BASE, filename);
  const resolvedPath = path.resolve(filePath);
  const resolvedBase = path.resolve(TEMP_STORAGE_BASE);

  if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
    return null;
  }

  return resolvedPath;
}

const getHandler = async (req: Request, res: Response) => {
  const filename = getParam(req.params, "filename");

  if (!filename) {
    return res.status(400).send("Filename is required");
  }

  try {
    const filePath = getSafeFilePath(filename);

    if (!filePath) {
      return res.status(400).send("Invalid filename");
    }

    await fs.access(filePath);

    const ext = path.extname(filename).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".csv": "text/csv",
      ".txt": "text/plain",
      ".json": "application/json",
      ".xml": "application/xml",
      ".html": "text/html"
    };

    const contentType = contentTypes[ext] || "application/octet-stream";

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", contentType);

    const disposition = ext === ".html" ? "attachment" : "inline";
    res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);

    const fileContent = await fs.readFile(filePath);
    res.send(fileContent);
  } catch (_error) {
    console.error("Error serving file");
    res.status(404).send("File not found");
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
