import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// TODO: Excel file needs to be saving in blob storage once blob storage integration is implemented.
// Navigate from libs/excel-generation/src/file-storage/ up to monorepo root
const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..");
const TEMP_STORAGE_BASE = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");

export async function saveExcelFile(artefactId: string, fileBuffer: Buffer): Promise<void> {
  const fileName = `${artefactId}.xlsx`;
  await fs.mkdir(TEMP_STORAGE_BASE, { recursive: true });
  const filePath = path.join(TEMP_STORAGE_BASE, fileName);
  await fs.writeFile(filePath, fileBuffer);
}
