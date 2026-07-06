import path from "node:path";
import { getApplicationById } from "@hmcts/admin-pages";
import { requireRole, USER_ROLES } from "@hmcts/auth";
import { CONTAINER, downloadBlob } from "@hmcts/azure-blob";
import { getParam } from "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";

const CONTENT_TYPE_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png"
};

const getHandler = async (req: Request, res: Response) => {
  const id = getParam(req.params, "id");

  if (!id) {
    return res.status(400).render("errors/400");
  }

  try {
    const application = await getApplicationById(id);

    if (!application) {
      return res.status(404).send("Application not found");
    }

    if (!application.proofOfIdPath) {
      return res.status(404).send("File not found");
    }

    const fileBuffer = await downloadBlob(application.proofOfIdPath, CONTAINER.FILES);

    if (fileBuffer === null) {
      return res.status(404).send("File not found");
    }

    const extension = path.extname(application.proofOfIdPath).toLowerCase();
    const contentType = CONTENT_TYPE_MAP[extension] ?? "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${application.id}${extension}"`);
    res.setHeader("Content-Length", fileBuffer.length);
    res.send(fileBuffer);
  } catch (_error) {
    res.status(500).send("Error loading file");
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.INTERNAL_ADMIN_CTSC]), getHandler];
