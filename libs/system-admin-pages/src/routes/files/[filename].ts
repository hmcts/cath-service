import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..");
const TEMP_STORAGE_BASE = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");

function isValidFilename(filename: string): boolean {
  // Only allow alphanumeric, hyphens, underscores, and dots for file extensions
  const validPattern = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/;
  return validPattern.test(filename);
}

function getSafeFilePath(filename: string): string | null {
  // Validate filename format
  if (!isValidFilename(filename)) {
    return null;
  }

  // Additional security: ensure no path traversal characters
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return null;
  }

  // Create the path
  const filePath = path.join(TEMP_STORAGE_BASE, filename);

  // Resolve both paths to absolute and normalize them
  const resolvedPath = path.resolve(filePath);
  const resolvedBase = path.resolve(TEMP_STORAGE_BASE);

  // Ensure the resolved path is within the base directory
  if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
    return null;
  }

  return resolvedPath;
}

const getHandler = async (req: Request, res: Response) => {
  const filename = req.params.filename;

  if (!filename) {
    return res.status(400).send("Filename is required");
  }

  try {
    const filePath = getSafeFilePath(filename);

    if (!filePath) {
      return res.status(400).send("Invalid filename");
    }

    // Check if file exists
    await fs.access(filePath);

    // Set appropriate content type based on file extension
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

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

    // Stream the file
    const fileContent = await fs.readFile(filePath);
    res.send(fileContent);
  } catch (error) {
    console.error("Error serving file:", error);
    res.status(404).send("File not found");
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
