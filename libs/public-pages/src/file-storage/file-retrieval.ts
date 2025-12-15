import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getContentTypeFromExtension } from "./content-type.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Navigate to monorepo root (from libs/public-pages/src/file-storage/)
const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..");
const STORAGE_BASE = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");

async function findFileByArtefactId(artefactId: string): Promise<{ buffer: Buffer; extension: string } | null> {
  try {
    const resolvedBase = path.resolve(STORAGE_BASE);

    // List all files in storage directory
    const files = await fs.readdir(STORAGE_BASE);

    // Find file that starts with artefactId
    const matchingFile = files.find((file) => file.startsWith(artefactId));

    if (!matchingFile) {
      return null;
    }

    const filePath = path.join(STORAGE_BASE, matchingFile);
    const resolvedPath = path.resolve(filePath);

    // Secure containment check to prevent path traversal attacks
    const normalizedBase = resolvedBase.endsWith(path.sep) ? resolvedBase : resolvedBase + path.sep;
    const relativePath = path.relative(resolvedBase, resolvedPath);

    // Verify path is within base directory (prevent prefix attacks and directory traversal)
    if (!resolvedPath.startsWith(normalizedBase) || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      return null;
    }

    const buffer = await fs.readFile(filePath);
    const extension = path.extname(matchingFile);

    return { buffer, extension };
  } catch {
    return null;
  }
}

export async function getFileBuffer(artefactId: string): Promise<Buffer | null> {
  const result = await findFileByArtefactId(artefactId);
  return result ? result.buffer : null;
}

export async function getFileExtension(artefactId: string): Promise<string> {
  const result = await findFileByArtefactId(artefactId);
  return result ? result.extension : ".pdf";
}

export function getContentType(fileExtension: string | null | undefined): string {
  return getContentTypeFromExtension(fileExtension);
}

export function getFileName(artefactId: string, fileExtension: string | null | undefined): string {
  const extension = fileExtension || ".pdf";
  return `${artefactId}${extension}`;
}
