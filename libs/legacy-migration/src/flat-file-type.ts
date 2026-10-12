import path from "node:path";

// The extensions the new flat-file reader serves (libs/publication/src/file-storage/content-type.ts).
const SERVED_EXTENSIONS = new Set([".pdf", ".docx", ".doc", ".html", ".htm", ".csv", ".xlsx"]);
const SNIFF_BYTES = 4096;

// Legacy stores neither the filename nor the content type of a flat file, so the type is
// read from the file's own signature.
export function detectFlatFileExtension(file: Buffer): string | null {
  const head = file.subarray(0, SNIFF_BYTES);

  if (head.subarray(0, 4).toString("latin1") === "%PDF") return ".pdf";
  if (head.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]))) return ".doc";

  if (head.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
    const entries = head.toString("latin1");
    if (entries.includes("word/")) return ".docx";
    if (entries.includes("xl/")) return ".xlsx";
    return null;
  }

  if (head.includes(0)) return null;

  const text = head.toString("utf8").replace(/^﻿/, "").trimStart().toLowerCase();
  if (text.startsWith("<!doctype html") || text.startsWith("<html")) return ".html";
  if (text.split("\n", 1)[0].includes(",")) return ".csv";

  return null;
}

// The new reader takes the extension from source_artefact_id. A legacy id that already has a
// served extension is kept; otherwise the detected one is appended, keeping the publisher's id.
export function withFlatFileExtension(sourceArtefactId: string | null, artefactId: string, extension: string): string {
  if (sourceArtefactId && SERVED_EXTENSIONS.has(path.extname(sourceArtefactId).toLowerCase())) {
    return sourceArtefactId;
  }
  return `${sourceArtefactId ?? artefactId}${extension}`;
}
