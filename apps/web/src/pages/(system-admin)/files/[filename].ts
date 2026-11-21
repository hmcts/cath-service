import { requireRole, USER_ROLES } from "@hmcts/auth";
import { getFileBuffer } from "@hmcts/publication";
import { getParam } from "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";

function isValidFilename(filename: string): boolean {
  const validPattern = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/;
  return validPattern.test(filename);
}

// Only types that cannot run script in the admin origin are previewed inline. PDFs may carry
// JavaScript, but it runs inside the browser's sandboxed PDF viewer, not the page. Everything
// else (HTML, XML that may carry an XHTML namespace, unknown types) is downloaded as an opaque
// octet-stream, so it stays inert even if a proxy strips Content-Disposition.
const INLINE_CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".json": "application/json"
};

const getHandler = async (req: Request, res: Response) => {
  const filename = getParam(req.params, "filename");

  if (!filename || !isValidFilename(filename)) {
    return res.status(400).send("Invalid filename");
  }

  try {
    const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
    const artefactId = filename.slice(0, filename.lastIndexOf("."));
    const fileContent = await getFileBuffer(artefactId);

    if (!fileContent) {
      return res.status(404).send("File not found");
    }

    const inlineContentType = INLINE_CONTENT_TYPES[ext];
    const contentType = inlineContentType ?? "application/octet-stream";
    const disposition = inlineContentType ? "inline" : "attachment";

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
