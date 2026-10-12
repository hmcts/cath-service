// Opt-out rather than opt-in so environments that never set the flag keep sending.
export function isOutboundEnabled(): boolean {
  return process.env.OUTBOUND_ENABLED !== "false";
}
