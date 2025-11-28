import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Navigate to monorepo root (from libs/public-pages/src/file-storage/)
const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..");
const STORAGE_BASE = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");

export async function getFileBuffer(artefactId: string): Promise<Buffer | null> {
  const fileName = `${artefactId}.pdf`;
  const filePath = path.join(STORAGE_BASE, fileName);

  try {
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(STORAGE_BASE);

    if (!resolvedPath.startsWith(resolvedBase)) {
      return null;
    }

    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

export function getContentType(): string {
  return "application/pdf";
}

export function getFileName(artefactId: string): string {
  return `${artefactId}.pdf`;
}
