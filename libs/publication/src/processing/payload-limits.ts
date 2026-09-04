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
 *
 * The gates are configurable via the MAX_PDF_PAYLOAD_KB / MAX_EXCEL_PAYLOAD_KB
 * environment variables (in kilobytes, set in apps/web/helm/values.yaml), falling
 * back to the defaults below when unset.
 */

export const MAX_PDF_PAYLOAD_BYTES = Number.parseInt(process.env.MAX_PDF_PAYLOAD_KB || "2048", 10) * 1024; // default 2 MB
export const MAX_EXCEL_PAYLOAD_BYTES = Number.parseInt(process.env.MAX_EXCEL_PAYLOAD_KB || "10240", 10) * 1024; // default 10 MB

export function payloadSizeBytes(jsonData: unknown): number {
  return Buffer.byteLength(JSON.stringify(jsonData), "utf8");
}
