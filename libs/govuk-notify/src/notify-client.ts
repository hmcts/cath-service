import { type EmailLimit, validateEmailRateLimit } from "@hmcts/email-rate-limit";
import { NotifyClient } from "notifications-node-client";

const DEFAULT_EMAIL_LIMIT: EmailLimit = "STANDARD";

export interface SendNotifyEmailParams {
  apiKey: string;
  templateId: string;
  emailAddress: string;
  personalisation?: Record<string, unknown>;
  reference?: string;
  emailLimit?: EmailLimit;
}

export interface SendNotifyEmailResult {
  notificationId: string;
}

export interface NotifyFileUploadOptions {
  filename?: string;
  confirmEmailBeforeDownload?: boolean;
  retentionPeriod?: string;
}

interface NotifyEmailResponse {
  data?: { id?: string };
}

export async function sendNotifyEmail(params: SendNotifyEmailParams): Promise<SendNotifyEmailResult> {
  await validateEmailRateLimit(params.emailAddress, params.emailLimit ?? DEFAULT_EMAIL_LIMIT, "Email");
  return deliverNotifyEmail(params);
}

export async function sendNotifyEmailWithRetry(
  params: SendNotifyEmailParams,
  options: { retryAttempts: number; retryDelayMs: number }
): Promise<SendNotifyEmailResult> {
  await validateEmailRateLimit(params.emailAddress, params.emailLimit ?? DEFAULT_EMAIL_LIMIT, "Email");
  return retryWithBackoff(() => deliverNotifyEmail(params), options.retryAttempts, options.retryDelayMs);
}

async function deliverNotifyEmail(params: SendNotifyEmailParams): Promise<SendNotifyEmailResult> {
  const notifyClient = new NotifyClient(params.apiKey);

  const response = (await (notifyClient as any).sendEmail(params.templateId, params.emailAddress, {
    personalisation: params.personalisation ?? {},
    ...(params.reference ? { reference: params.reference } : {})
  })) as unknown as NotifyEmailResponse;

  const notificationId = response?.data?.id;
  if (!notificationId) {
    throw new Error("Unable to extract notification ID from GOV.UK Notify response");
  }

  return { notificationId };
}

// Wraps NotifyClient.prepareUpload, which is untyped in notifications-node-client.
// Used by callers that need to attach a downloadable file link via personalisation.
export function prepareNotifyFileUpload(apiKey: string, fileBuffer: Buffer, options?: NotifyFileUploadOptions): unknown {
  const notifyClient = new NotifyClient(apiKey);
  return (notifyClient as any).prepareUpload(fileBuffer, {
    confirmEmailBeforeDownload: false,
    retentionPeriod: "1 week",
    ...options
  });
}

async function retryWithBackoff<T>(fn: () => Promise<T>, retries: number, delay: number): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}
