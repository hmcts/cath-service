import { NotifyClient } from "notifications-node-client";

export interface SendNotifyEmailParams {
  apiKey: string;
  templateId: string;
  emailAddress: string;
  personalisation?: Record<string, unknown>;
  pdfBuffer?: Buffer;
  excelBuffer?: Buffer;
  reference?: string;
}

export interface SendNotifyEmailResult {
  notificationId: string;
}

interface NotifyEmailResponse {
  data?: { id?: string };
}

export async function sendNotifyEmail(params: SendNotifyEmailParams): Promise<SendNotifyEmailResult> {
  const notifyClient = new NotifyClient(params.apiKey);
  const personalisation: Record<string, unknown> = { ...params.personalisation };

  if (params.pdfBuffer) {
    const linkToFile = (notifyClient as any).prepareUpload(params.pdfBuffer, {
      confirmEmailBeforeDownload: false,
      retentionPeriod: "1 week"
    });
    personalisation.link_to_file = linkToFile;
    personalisation.pdf_link_to_file = linkToFile;
    personalisation.pdf_link_text = "Download PDF version";
  }

  if (params.excelBuffer) {
    const excelLink = (notifyClient as any).prepareUpload(params.excelBuffer, {
      confirmEmailBeforeDownload: false,
      retentionPeriod: "1 week"
    });
    personalisation.excel_link_to_file = excelLink;
    personalisation.excel_link_text = "Download Excel version";
  }

  const response = (await (notifyClient as any).sendEmail(params.templateId, params.emailAddress, {
    personalisation,
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
