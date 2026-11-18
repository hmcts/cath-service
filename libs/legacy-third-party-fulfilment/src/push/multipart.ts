import crypto from "node:crypto";
import type { PushBody } from "./http-client.js";

// Legacy sends files as a Spring ByteArrayResource, which is written as octet-stream whatever the file type.
const FILE_PART_CONTENT_TYPE = "application/octet-stream";

export function buildFileMultipart(buffer: Buffer, fileName: string): PushBody {
  const boundary = `----FormBoundary${crypto.randomBytes(8).toString("hex")}`;
  const partHeaders = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${sanitiseFileName(fileName)}"`,
    `Content-Type: ${FILE_PART_CONTENT_TYPE}`,
    `Content-Length: ${buffer.byteLength}`,
    "",
    ""
  ].join("\r\n");

  return {
    buffer: Buffer.concat([Buffer.from(partHeaders), buffer, Buffer.from(`\r\n--${boundary}--\r\n`)]),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

// The file name can be a publisher-supplied sourceArtefactId, so these characters would otherwise break the part headers.
function sanitiseFileName(fileName: string): string {
  return fileName.replace(/["\r\n]/g, "");
}
