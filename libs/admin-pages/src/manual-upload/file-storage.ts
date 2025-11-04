import fs from "node:fs/promises";
import path from "node:path";

const TEMP_STORAGE_BASE = path.join(process.cwd(), "storage", "temp", "uploads");

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

export async function getUploadedFile(artefactId: string, fileExtension: string): Promise<Buffer> {
  const fileName = `${artefactId}${fileExtension}`;
  const filePath = path.join(TEMP_STORAGE_BASE, fileName);
  return fs.readFile(filePath);
}

export async function deleteUploadedFile(artefactId: string, fileExtension: string): Promise<void> {
  const fileName = `${artefactId}${fileExtension}`;
  const filePath = path.join(TEMP_STORAGE_BASE, fileName);
  await fs.unlink(filePath);
}
