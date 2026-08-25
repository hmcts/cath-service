/**
 * Source-JSON size gates checked BEFORE output generation.
 *
 * These are thresholds on the *source* publication payload, not limits on the
 * generated output file and not upload rejections. When a payload meets or
 * exceeds a gate, that single output is skipped while the publication proceeds.
 *
 * The summary gate lives with its consumer in the notifications lib; each limit
 * is colocated with the service that generates the output it guards (mirrors
 * legacy: PDF/Excel in pip-data-management, summary in pip-publication-services).
 */

export const MAX_PDF_PAYLOAD_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_EXCEL_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export function payloadSizeBytes(jsonData: unknown): number {
  return Buffer.byteLength(JSON.stringify(jsonData), "utf8");
}
