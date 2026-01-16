import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mockListTypes } from "@hmcts/list-types-common";
import { getArtefactListTypeId } from "./queries.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..");
const TEMP_STORAGE_BASE = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");

function isValidArtefactId(artefactId: string): boolean {
  // Only allow alphanumeric characters, hyphens, and underscores (typical UUID format)
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(artefactId);
}

function getSafeFilePath(artefactId: string, filename: string): string | null {
  // Validate artefactId format
  if (!isValidArtefactId(artefactId)) {
    return null;
  }

  // Create the path
  const filePath = path.join(TEMP_STORAGE_BASE, filename);

  // Resolve both paths to absolute and normalize them
  const resolvedPath = path.resolve(filePath);
  const resolvedBase = path.resolve(TEMP_STORAGE_BASE);

  // Ensure the resolved path is within the base directory
  if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
    return null;
  }

  return resolvedPath;
}

export async function getJsonContent(artefactId: string): Promise<object | null> {
  try {
    const filePath = getSafeFilePath(artefactId, `${artefactId}.json`);
    if (!filePath) {
      return null;
    }

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

  return `/${listType.urlPath}?artefactId=${encodeURIComponent(artefactId)}`;
}

export async function getFlatFileUrl(artefactId: string): Promise<string | null> {
  try {
    // Validate artefactId before using it
    if (!isValidArtefactId(artefactId)) {
      return null;
    }

    const files = await fs.readdir(TEMP_STORAGE_BASE);
    const fileMatch = files.find((file) => file.startsWith(`${artefactId}.`));

    if (!fileMatch) {
      return null;
    }

    // Validate the matched filename doesn't contain path traversal
    if (fileMatch.includes("..") || fileMatch.includes("/") || fileMatch.includes("\\")) {
      return null;
    }

    return `/files/${encodeURIComponent(fileMatch)}`;
  } catch {
    return null;
  }
}
