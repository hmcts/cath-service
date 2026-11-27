import { CONTAINER, downloadBlob, getBlobProperties } from "@hmcts/azure-blob";

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = 1024 * 1024;

export const GENERATED_FILE_TYPES = {
  pdf: { extension: ".pdf", contentType: "application/pdf" },
  xlsx: { extension: ".xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
} as const;

export function isGeneratedFileType(value: unknown): value is GeneratedFileType {
  return typeof value === "string" && Object.hasOwn(GENERATED_FILE_TYPES, value);
}

export async function getGeneratedFileAvailability(artefactId: string): Promise<GeneratedFileAvailability> {
  const [pdf, xlsx] = await Promise.all([getGeneratedFileSize(artefactId, "pdf"), getGeneratedFileSize(artefactId, "xlsx")]);
  return { pdf, xlsx };
}

export function formatFileSize(bytes: number): string {
  if (bytes < BYTES_PER_MB) {
    return `${(bytes / BYTES_PER_KB).toFixed(2)}KB`;
  }
  return `${(bytes / BYTES_PER_MB).toFixed(2)}MB`;
}

export async function getGeneratedFile(artefactId: string, type: GeneratedFileType): Promise<GeneratedFile | null> {
  const buffer = await downloadBlob(getGeneratedFileKey(artefactId, type), CONTAINER.PUBLICATIONS);
  if (!buffer) {
    return null;
  }
  return { buffer, contentType: GENERATED_FILE_TYPES[type].contentType };
}

async function getGeneratedFileSize(artefactId: string, type: GeneratedFileType): Promise<number | null> {
  try {
    const properties = await getBlobProperties(getGeneratedFileKey(artefactId, type), CONTAINER.PUBLICATIONS);
    return properties ? properties.size : null;
  } catch (error) {
    // A storage outage must not break the Blob Explorer page, so treat the file as unavailable.
    console.error(`Failed to check generated ${type} file for artefact ${artefactId}:`, error instanceof Error ? error.message : "unknown error");
    return null;
  }
}

function getGeneratedFileKey(artefactId: string, type: GeneratedFileType): string {
  return `${artefactId}${GENERATED_FILE_TYPES[type].extension}`;
}

export type GeneratedFileType = keyof typeof GENERATED_FILE_TYPES;

export interface GeneratedFileAvailability {
  pdf: number | null;
  xlsx: number | null;
}

export interface GeneratedFile {
  buffer: Buffer;
  contentType: string;
}
