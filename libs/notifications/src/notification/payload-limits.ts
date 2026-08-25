/**
 * Source-JSON size gate for the email "summary of cases", checked BEFORE
 * building the enhanced summary. When the source payload meets or exceeds this
 * gate, the email falls back to the no-summary template while still sending.
 *
 * Colocated with its consumer (mirrors legacy: the summary limit lives in
 * pip-publication-services, the service that sends the emails). The PDF/Excel
 * generation gates live with their consumer in the publication lib.
 */

export const MAX_SUMMARY_PAYLOAD_BYTES = 256 * 1024; // 256 KB

export function payloadSizeBytes(jsonData: unknown): number {
  return Buffer.byteLength(JSON.stringify(jsonData), "utf8");
}
