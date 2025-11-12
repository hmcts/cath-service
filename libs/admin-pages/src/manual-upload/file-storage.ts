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
