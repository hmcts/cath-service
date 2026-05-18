import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Request, Response } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Navigate to monorepo root (from libs/test-support/src/routes/test-support/)
const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..");
const STORAGE_BASE = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");

export const GET = async (req: Request, res: Response) => {
  try {
    const { artefactId } = req.query as { artefactId: string };

    if (!artefactId) {
      return res.status(400).json({ error: "artefactId query parameter is required" });
    }

    // Find any file matching the artefactId
    try {
      const files = await fs.readdir(STORAGE_BASE);
      for (const file of files) {
        if (file.startsWith(artefactId)) {
          const filePath = path.join(STORAGE_BASE, file);
          const stats = await fs.stat(filePath);
          return res.json({
            exists: true,
            artefactId,
            filename: file,
            sizeBytes: stats.size,
            createdAt: stats.birthtime.toISOString()
          });
        }
      }
    } catch {
      // Storage directory might not exist
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
    const filename = `${artefactId}${fileExtension}`;
    const filePath = path.join(STORAGE_BASE, filename);

    // Ensure storage directory exists
    await fs.mkdir(STORAGE_BASE, { recursive: true });

    // Write the file from base64-encoded content
    const buffer = Buffer.from(content, "base64");
    await fs.writeFile(filePath, buffer);

    console.log(`[test-support] Created flat file: ${filePath} (${buffer.length} bytes)`);

    return res.status(201).json({
      artefactId,
      filename,
      size: buffer.length
    });
  } catch (error) {
    console.error("Error creating flat file:", error);
    return res.status(500).json({ error: "Failed to create flat file" });
  }
};

export const DELETE = async (req: Request, res: Response) => {
  try {
    const { artefactId } = req.body as { artefactId: string };

    if (!artefactId) {
      return res.status(400).json({ error: "artefactId is required" });
    }

    // Find and delete any file matching the artefactId
    let deleted = false;
    try {
      const files = await fs.readdir(STORAGE_BASE);
      for (const file of files) {
        if (file.startsWith(artefactId)) {
          await fs.unlink(path.join(STORAGE_BASE, file));
          deleted = true;
          console.log(`[test-support] Deleted flat file: ${file}`);
        }
      }
    } catch {
      // Storage directory might not exist - that's fine
    }

    return res.json({ deleted });
  } catch (error) {
    console.error("Error deleting flat file:", error);
    return res.status(500).json({ error: "Failed to delete flat file" });
  }
};
