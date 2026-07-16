import { getParam } from "@hmcts/web-core";
import type { Request, Response } from "express";
import { getFileForDownload } from "../../../../flat-file/flat-file-service.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidArtefactId(artefactId: string): boolean {
  return UUID_REGEX.test(artefactId);
}

export const GET = async (req: Request, res: Response) => {
  const artefactId = getParam(req.params, "artefactId");

  if (!artefactId || !isValidArtefactId(artefactId)) {
    res.setHeader("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    return res.status(400).json({ error: "Invalid request" });
  }

  const result = await getFileForDownload(artefactId, req.user);

  if ("error" in result) {
    if (result.error === "ACCESS_DENIED") {
      res.setHeader("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
      return res.status(403).json({ error: "Access denied" });
    }

    let statusCode = 404;
    let errorMessage = "File not found";

    switch (result.error) {
      case "NOT_FOUND":
        statusCode = 404;
        errorMessage = "Artefact not found";
        break;
      case "EXPIRED":
        statusCode = 410;
        errorMessage = "File has expired";
        break;
      case "NOT_FLAT_FILE":
        statusCode = 400;
        errorMessage = "Not a flat file";
        break;
      case "FILE_NOT_FOUND":
        statusCode = 404;
        errorMessage = "File not found in storage";
        break;
    }

    res.setHeader("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    return res.status(statusCode).json({ error: errorMessage });
  }

  res.setHeader("Content-Type", result.contentType);
  res.setHeader("Content-Disposition", `inline; filename="${result.fileName}"`);
  res.setHeader("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");

  return res.send(result.fileBuffer);
};
