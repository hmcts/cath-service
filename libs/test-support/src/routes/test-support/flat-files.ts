import { deleteBlob, downloadBlob, uploadBlob } from "@hmcts/azure-blob";
import type { Request, Response } from "express";

export const GET = async (req: Request, res: Response) => {
  try {
    const { artefactId, extension } = req.query as { artefactId: string; extension?: string };

    if (!artefactId) {
      return res.status(400).json({ error: "artefactId query parameter is required" });
    }

    const fileExtension = extension || ".pdf";
    const blobName = `${artefactId}${fileExtension}`;
    const buffer = await downloadBlob(blobName);

    if (buffer) {
      return res.json({ exists: true, artefactId, filename: blobName, sizeBytes: buffer.length });
    }

    return res.json({ exists: false, artefactId });
  } catch (error) {
    console.error("Error checking flat file:", error);
    return res.status(500).json({ error: "Failed to check flat file" });
  }
};

export const POST = async (req: Request, res: Response) => {
  try {
    const { artefactId, content, extension } = req.body as {
      artefactId: string;
      content: string;
      extension: string;
    };

    if (!artefactId || !content) {
      return res.status(400).json({ error: "artefactId and content are required" });
    }

    const fileExtension = extension || ".pdf";
    const blobName = `${artefactId}${fileExtension}`;
    const buffer = Buffer.from(content, "base64");

    await uploadBlob(blobName, buffer, "application/pdf");

    console.log(`[test-support] Uploaded flat file to blob storage: ${blobName} (${buffer.length} bytes)`);

    return res.status(201).json({ artefactId, filename: blobName, size: buffer.length });
  } catch (error) {
    console.error("Error creating flat file:", error);
    return res.status(500).json({ error: "Failed to create flat file" });
  }
};

export const DELETE = async (req: Request, res: Response) => {
  try {
    const { artefactId, extension } = req.body as { artefactId: string; extension?: string };

    if (!artefactId) {
      return res.status(400).json({ error: "artefactId is required" });
    }

    const fileExtension = extension || ".pdf";
    const blobName = `${artefactId}${fileExtension}`;

    await deleteBlob(blobName);
    console.log(`[test-support] Deleted flat file from blob storage: ${blobName}`);

    return res.json({ deleted: true });
  } catch (error) {
    console.error("Error deleting flat file:", error);
    return res.status(500).json({ error: "Failed to delete flat file" });
  }
};
