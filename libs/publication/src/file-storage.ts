import * as fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

// Find repository root by going up from cwd until we find a directory that contains both
// package.json and a 'libs' directory (monorepo structure)
export function findRepoRoot(startDir: string = process.cwd()): string {
  let currentDir = startDir;

  while (currentDir !== "/") {
    try {
      const hasPackageJson = fsSync.existsSync(path.join(currentDir, "package.json"));
      const hasLibsDir = fsSync.existsSync(path.join(currentDir, "libs"));

      if (hasPackageJson && hasLibsDir) {
        return currentDir;
      }
    } catch {
      // Continue searching
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root
    currentDir = parentDir;
  }

  // Fallback to process.cwd() if repo root not found
  return process.cwd();
}

const REPO_ROOT = findRepoRoot();
const TEMP_STORAGE_BASE = path.join(REPO_ROOT, "storage", "temp", "uploads");

// Export for testing
export function getStoragePath(): string {
  return TEMP_STORAGE_BASE;
}

export async function saveUploadedFile(artefactId: string, originalFileName: string, fileBuffer: Buffer): Promise<void> {
  // Extract file extension from original filename
  const fileExtension = path.extname(originalFileName);
  const newFileName = `${artefactId}${fileExtension}`;

  // Ensure storage directory exists
  await fs.mkdir(TEMP_STORAGE_BASE, { recursive: true });

  // Save file with artefactId as filename
  const filePath = path.join(TEMP_STORAGE_BASE, newFileName);
  await fs.writeFile(filePath, fileBuffer);
}

export async function getUploadedFile(artefactId: string): Promise<{ fileData: Buffer; fileName: string } | null> {
  try {
    const files = await fs.readdir(TEMP_STORAGE_BASE);
    const matchingFile = files.find((file) => file.startsWith(artefactId));

    if (!matchingFile) {
      return null;
    }

    const filePath = path.join(TEMP_STORAGE_BASE, matchingFile);
    const fileData = await fs.readFile(filePath);

    return {
      fileData,
      fileName: matchingFile
    };
  } catch (_error) {
    return null;
  }
}
