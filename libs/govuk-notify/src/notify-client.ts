import { NotifyClient } from "notifications-node-client";

export interface SendNotifyEmailParams {
  apiKey: string;
  templateId: string;
  emailAddress: string;
  personalisation?: Record<string, unknown>;
  reference?: string;
}

export interface SendNotifyEmailResult {
  notificationId: string;
}

export interface NotifyFileUploadOptions {
  confirmEmailBeforeDownload?: boolean;
  retentionPeriod?: string;
}

interface NotifyEmailResponse {
  data?: { id?: string };
}

export async function sendNotifyEmail(params: SendNotifyEmailParams): Promise<SendNotifyEmailResult> {
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

export async function sendNotifyEmailWithRetry(
  params: SendNotifyEmailParams,
  options: { retryAttempts: number; retryDelayMs: number }
): Promise<SendNotifyEmailResult> {
  return retryWithBackoff(() => sendNotifyEmail(params), options.retryAttempts, options.retryDelayMs);
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
