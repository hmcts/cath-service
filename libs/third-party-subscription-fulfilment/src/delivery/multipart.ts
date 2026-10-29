import { randomBytes } from "node:crypto";

export function buildMultipartBody(parts: MultipartPart[]): { body: Buffer; contentType: string } {
  const boundary = `----CathFormBoundary${randomBytes(16).toString("hex")}`;
  const chunks = parts.flatMap((part) => [Buffer.from(`--${boundary}\r\n${partHeaders(part)}\r\n\r\n`), toBuffer(part.content), Buffer.from("\r\n")]);

  return {
    body: Buffer.concat([...chunks, Buffer.from(`--${boundary}--\r\n`)]),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

function partHeaders(part: MultipartPart): string {
  const fileName = part.fileName ? `; filename="${part.fileName}"` : "";
  return `Content-Disposition: form-data; name="${part.name}"${fileName}\r\nContent-Type: ${part.contentType}`;
}

function toBuffer(content: Buffer | string): Buffer {
  return typeof content === "string" ? Buffer.from(content, "utf-8") : content;
}

export interface MultipartPart {
  name: string;
  contentType: string;
  content: Buffer | string;
  fileName?: string;
}
