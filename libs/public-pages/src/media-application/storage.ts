import fs from "node:fs/promises";
import path from "node:path";

const TEMP_STORAGE_BASE = path.join(process.cwd(), "storage", "temp", "files");

export async function saveIdProofFile(applicationId: string, originalFileName: string, fileBuffer: Buffer): Promise<void> {
  const fileExtension = path.extname(originalFileName).toLowerCase();
  const newFileName = `${applicationId}${fileExtension}`;

  await fs.mkdir(TEMP_STORAGE_BASE, { recursive: true });

  const filePath = path.join(TEMP_STORAGE_BASE, newFileName);
  await fs.writeFile(filePath, fileBuffer);
}
