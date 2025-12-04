import fs from "node:fs/promises";
import path from "node:path";
import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { getApplicationById } from "../../../media-application/queries.js";

const getHandler = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const application = await getApplicationById(id);

    if (!application) {
      return res.status(404).send("Application not found");
    }

    if (!application.proofOfIdPath) {
      return res.status(404).send("File not found");
    }

    const filePath = application.proofOfIdPath;
    const fileExists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);

    if (!fileExists) {
      return res.status(404).send("File not found");
    }

    const fileExtension = path.extname(filePath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png"
    };

    const contentType = contentTypeMap[fileExtension] || "application/octet-stream";
    const fileName = path.basename(filePath);

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);

    const fileBuffer = await fs.readFile(filePath);
    res.send(fileBuffer);
  } catch (error) {
    console.error("Error serving proof of ID file:", error);
    res.status(500).send("Error loading file");
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.INTERNAL_ADMIN_CTSC]), getHandler];
