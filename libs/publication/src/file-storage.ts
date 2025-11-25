import * as fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

// Security constants
const ARTEFACT_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const ALLOWED_EXTENSIONS = new Set([".pdf", ".csv", ".json", ".xlsx", ".xls", ".txt"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Find repository root by going up from cwd until we find a directory that contains both
// package.json and a 'libs' directory (monorepo structure)
export function findRepoRoot(startDir: string = process.cwd()): string {
  let currentDir = startDir;

  while (true) {
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
    if (parentDir === currentDir) break; // Reached root (works on both UNIX and Windows)
    currentDir = parentDir;
  }

  // Fallback to process.cwd() if repo root not found
  return process.cwd();
}

const REPO_ROOT = findRepoRoot();
const TEMP_STORAGE_BASE = path.resolve(path.join(REPO_ROOT, "storage", "temp", "uploads"));

// Export for testing
export function getStoragePath(): string {
  return TEMP_STORAGE_BASE;
}

// Validate artefactId to prevent directory traversal
function validateArtefactId(artefactId: string): void {
  if (!artefactId || typeof artefactId !== "string") {
    throw new Error("Invalid artefactId: must be a non-empty string");
  }

  if (!ARTEFACT_ID_REGEX.test(artefactId)) {
    throw new Error("Invalid artefactId: only alphanumeric characters, hyphens, and underscores are allowed");
  }

  if (artefactId.length > 255) {
    throw new Error("Invalid artefactId: maximum length is 255 characters");
  }
}

// Validate file path to prevent directory traversal
function validateFilePath(filePath: string): void {
  const resolvedPath = path.resolve(filePath);
  const normalizedBase = path.resolve(TEMP_STORAGE_BASE);

  if (!resolvedPath.startsWith(normalizedBase + path.sep) && resolvedPath !== normalizedBase) {
    throw new Error("Invalid file path: path traversal detected");
  }
}

// Validate file extension
function validateFileExtension(fileName: string): void {
  const extension = path.extname(fileName).toLowerCase();

  if (!extension) {
    throw new Error("Invalid file: no file extension provided");
  }

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error(`Invalid file extension: ${extension}. Allowed extensions: ${Array.from(ALLOWED_EXTENSIONS).join(", ")}`);
  }
}

// Validate file size
function validateFileSize(fileBuffer: Buffer): void {
  if (fileBuffer.byteLength > MAX_FILE_SIZE) {
    throw new Error(`File too large: maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }
}

export async function saveUploadedFile(artefactId: string, originalFileName: string, fileBuffer: Buffer): Promise<void> {
  // Validate artefactId to prevent directory traversal
  validateArtefactId(artefactId);

  // Validate file extension
  validateFileExtension(originalFileName);

  // Validate file size
  validateFileSize(fileBuffer);

  // Extract file extension from original filename
  const fileExtension = path.extname(originalFileName).toLowerCase();
  const newFileName = `${artefactId}${fileExtension}`;

  // Construct and validate file path
  const filePath = path.resolve(path.join(TEMP_STORAGE_BASE, newFileName));
  validateFilePath(filePath);

  // Ensure storage directory exists
  await fs.mkdir(TEMP_STORAGE_BASE, { recursive: true });

  // Save file with artefactId as filename
  await fs.writeFile(filePath, fileBuffer);
}

export async function getUploadedFile(artefactId: string): Promise<{ fileData: Buffer; fileName: string } | null> {
  try {
    // Validate artefactId to prevent directory traversal
    validateArtefactId(artefactId);

    const files = await fs.readdir(TEMP_STORAGE_BASE);

    // Create strict regex that matches only:
    // 1. Exact artefactId, or
    // 2. artefactId followed by a single extension (e.g., .pdf, .csv)
    // This prevents matching "test-123-other.pdf" when looking for "test-123"
    const escapedArtefactId = artefactId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const strictPattern = new RegExp(`^${escapedArtefactId}(\\.[^./\\\\]+)?$`);

    const matchingFiles = files.filter((file) => strictPattern.test(file));

    // Handle zero matches
    if (matchingFiles.length === 0) {
      return null;
    }

    // Handle multiple matches - this shouldn't happen with our strict pattern, but be defensive
    if (matchingFiles.length > 1) {
      console.error("Multiple files found for artefact", {
        message: "Ambiguous file match detected",
        fileCount: matchingFiles.length
      });
      throw new Error(`Ambiguous file match: multiple files found for artefactId ${artefactId}`);
    }

    const matchingFile = matchingFiles[0];

    // Construct and validate file path to prevent directory traversal
    const filePath = path.resolve(path.join(TEMP_STORAGE_BASE, matchingFile));
    validateFilePath(filePath);

    const fileData = await fs.readFile(filePath);

    return {
      fileData,
      fileName: matchingFile
    };
  } catch (error) {
    console.error("Failed to read uploaded file", {
      message: error instanceof Error ? error.message : "Unknown error",
      operation: "getUploadedFile"
    });
    return null;
  }
}
