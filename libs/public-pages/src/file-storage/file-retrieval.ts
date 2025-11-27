import fs from "node:fs/promises";
import path from "node:path";

const STORAGE_BASE = path.join(process.cwd(), "storage", "temp", "uploads");

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
