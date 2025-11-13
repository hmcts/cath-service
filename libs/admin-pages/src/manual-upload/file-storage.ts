import * as fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

// Find repository root by going up from cwd until we find a directory that contains both
// package.json and a 'libs' directory (monorepo structure)
function findRepoRoot(): string {
  let currentDir = process.cwd();

  console.log("[file-storage:findRepoRoot] Starting from:", currentDir);

  while (currentDir !== "/") {
    try {
      const hasPackageJson = fsSync.existsSync(path.join(currentDir, "package.json"));
      const hasLibsDir = fsSync.existsSync(path.join(currentDir, "libs"));

      console.log(`[file-storage:findRepoRoot] Checking ${currentDir}: package.json=${hasPackageJson}, libs=${hasLibsDir}`);

      if (hasPackageJson && hasLibsDir) {
        console.log("[file-storage:findRepoRoot] Found repo root:", currentDir);
        return currentDir;
      }
    } catch (err) {
      console.log(`[file-storage:findRepoRoot] Error checking ${currentDir}:`, err);
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      console.log("[file-storage:findRepoRoot] Reached filesystem root");
      break; // Reached root
    }
    currentDir = parentDir;
  }

  // Fallback to process.cwd() if repo root not found
  console.log("[file-storage:findRepoRoot] Using fallback:", process.cwd());
  return process.cwd();
}

const REPO_ROOT = findRepoRoot();
const TEMP_STORAGE_BASE = path.join(REPO_ROOT, "storage", "temp", "uploads");
console.log("[file-storage] REPO_ROOT:", REPO_ROOT);
console.log("[file-storage] TEMP_STORAGE_BASE:", TEMP_STORAGE_BASE);

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
    console.log("[file-storage] Looking for files in:", TEMP_STORAGE_BASE);
    console.log("[file-storage] Searching for artefactId:", artefactId);
    const files = await fs.readdir(TEMP_STORAGE_BASE);
    console.log("[file-storage] Found files:", files.length, "files");
    const matchingFile = files.find((file) => file.startsWith(artefactId));

    if (!matchingFile) {
      console.log("[file-storage] No matching file found for:", artefactId);
      return null;
    }

    console.log("[file-storage] Found matching file:", matchingFile);
    const filePath = path.join(TEMP_STORAGE_BASE, matchingFile);
    const fileData = await fs.readFile(filePath);

    return {
      fileData,
      fileName: matchingFile
    };
  } catch (error) {
    console.log("[file-storage] Error reading files:", error);
    return null;
  }
}
