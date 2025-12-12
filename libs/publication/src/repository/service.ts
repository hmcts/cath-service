import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mockListTypes } from "@hmcts/list-types-common";
import { getArtefactListTypeId } from "./queries.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..");
const TEMP_STORAGE_BASE = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");

export async function getJsonContent(artefactId: string): Promise<object | null> {
  try {
    const filePath = path.join(TEMP_STORAGE_BASE, `${artefactId}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function getRenderedTemplateUrl(artefactId: string): Promise<string | null> {
  const listTypeId = await getArtefactListTypeId(artefactId);

  if (!listTypeId) {
    return null;
  }

  const listType = mockListTypes.find((lt) => lt.id === listTypeId);
  if (!listType?.urlPath) {
    return null;
  }

  return `/${listType.urlPath}?artefactId=${artefactId}`;
}

export async function getFlatFileUrl(artefactId: string): Promise<string | null> {
  try {
    const files = await fs.readdir(TEMP_STORAGE_BASE);
    const fileMatch = files.find((file) => file.startsWith(`${artefactId}.`));

    if (!fileMatch) {
      return null;
    }

    return `/files/${fileMatch}`;
  } catch {
    return null;
  }
}
