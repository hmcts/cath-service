import { requireRole, USER_ROLES } from "@hmcts/auth";
import { CONTAINER, downloadBlob } from "@hmcts/azure-blob";
import { getParam } from "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";

function isValidFilename(filename: string): boolean {
  const validPattern = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/;
  return validPattern.test(filename);
}

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".json": "application/json",
  ".xml": "application/xml",
  ".html": "text/html"
};

const getHandler = async (req: Request, res: Response) => {
  const filename = getParam(req.params, "filename");

  if (!filename || !isValidFilename(filename)) {
    return res.status(400).send("Invalid filename");
  }

  try {
    const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
    const container = ext === ".pdf" ? CONTAINER.PUBLICATIONS : CONTAINER.ARTEFACT;
    const fileContent = await downloadBlob(filename, container);

    if (!fileContent) {
      return res.status(404).send("File not found");
    }

    const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
    const disposition = ext === ".html" ? "attachment" : "inline";

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);
    res.send(fileContent);
  } catch (_error) {
    console.error("Error serving file");
    res.status(404).send("File not found");
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
