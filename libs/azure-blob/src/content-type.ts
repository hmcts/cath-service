const CONTENT_TYPE_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png"
};

export function getContentType(extension: string): string {
  return CONTENT_TYPE_MAP[extension.toLowerCase()] ?? "application/octet-stream";
}
