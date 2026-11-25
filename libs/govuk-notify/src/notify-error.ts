const INVALID_EMAIL_ADDRESS_STATUS = 400;
const VALIDATION_ERROR = "ValidationError";
const EMAIL_ADDRESS_FIELD_PREFIX = "email_address ";

export interface NotifyErrorInfo {
  status: number;
  message: string;
}

interface NotifyErrorShape {
  response?: { status?: number; data?: { errors?: { error: string; message: string }[] } };
  message?: string;
}

// Notify answers a malformed recipient with 400 ValidationError "email_address Not a valid email address".
// Other 400s (missing personalisation, team-only key) are configuration faults that affect every send.
export function isInvalidEmailAddressError(error: unknown): boolean {
  const response = (error as NotifyErrorShape | undefined)?.response;
  if (response?.status !== INVALID_EMAIL_ADDRESS_STATUS) {
    return false;
  }

  const errors = response.data?.errors ?? [];
  return (
    errors.length > 0 && errors.every((e) => e?.error === VALIDATION_ERROR && typeof e.message === "string" && e.message.startsWith(EMAIL_ADDRESS_FIELD_PREFIX))
  );
}

export function extractNotifyError(error: unknown): NotifyErrorInfo {
  const notifyError = error as NotifyErrorShape;
  const status = notifyError.response?.status ?? 0;
  const message =
    notifyError.response?.data?.errors?.map((e) => e.message).join(", ") || notifyError.message || (typeof error === "string" ? error : "Unknown error");

  return { status, message };
}
