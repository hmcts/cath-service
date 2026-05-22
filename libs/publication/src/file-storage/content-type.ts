const CONTENT_TYPE_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".html": "text/html",
  ".htm": "text/html",
  ".csv": "text/csv",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};

export function getContentTypeFromExtension(extension: string | null | undefined): string {
  if (!extension) {
    return "application/pdf";
  }

  const normalizedExtension = extension.startsWith(".") ? extension : `.${extension}`;
  return CONTENT_TYPE_MAP[normalizedExtension.toLowerCase()] || "application/octet-stream";
}
