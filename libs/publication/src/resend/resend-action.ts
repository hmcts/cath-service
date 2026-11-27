export const RESEND_ACTIONS = ["resubmit", "courtel", "third-party", "email"] as const;

export function parseResendAction(value: unknown): ResendAction | null {
  return typeof value === "string" && (RESEND_ACTIONS as readonly string[]).includes(value) ? (value as ResendAction) : null;
}

export type ResendAction = (typeof RESEND_ACTIONS)[number];
