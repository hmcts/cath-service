export interface NotifyErrorInfo {
  status: number;
  message: string;
}

interface NotifyErrorShape {
  response?: { status?: number; data?: { errors?: { error: string; message: string }[] } };
  message?: string;
}

export function extractNotifyError(error: unknown): NotifyErrorInfo {
  const notifyError = error as NotifyErrorShape;
  const status = notifyError.response?.status ?? 0;
  const message =
    notifyError.response?.data?.errors?.map((e) => e.message).join(", ") || notifyError.message || (typeof error === "string" ? error : "Unknown error");

  return { status, message };
}
