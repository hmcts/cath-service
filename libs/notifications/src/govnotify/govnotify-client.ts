import { extractNotifyError, sendNotifyEmailWithRetry } from "@hmcts/govuk-notify";
import { getApiKey, type TemplateParameters } from "./template-config.js";

const NOTIFICATION_RETRY_ATTEMPTS = Number.parseInt(process.env.NOTIFICATION_RETRY_ATTEMPTS || "1", 10);
const NOTIFICATION_RETRY_DELAY_MS = Number.parseInt(process.env.NOTIFICATION_RETRY_DELAY_MS || "1000", 10);

export interface SendEmailParams {
  emailAddress: string;
  templateParameters: TemplateParameters;
  templateId?: string;
  pdfBuffer?: Buffer;
  excelBuffer?: Buffer;
}

export interface SendEmailResult {
  success: boolean;
  notificationId?: string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  if (!params.templateId) {
    return { success: false, error: "Template ID is required" };
  }

  try {
    const { notificationId } = await sendNotifyEmailWithRetry(
      {
        apiKey: getApiKey(),
        templateId: params.templateId,
        emailAddress: params.emailAddress,
        personalisation: params.templateParameters,
        pdfBuffer: params.pdfBuffer,
        excelBuffer: params.excelBuffer
      },
      { retryAttempts: NOTIFICATION_RETRY_ATTEMPTS, retryDelayMs: NOTIFICATION_RETRY_DELAY_MS }
    );

    console.log("[govnotify-client] Successfully sent email with notification ID:", notificationId);
    return { success: true, notificationId };
  } catch (error) {
    const { message } = extractNotifyError(error);
    console.error("[govnotify-client] Failed to send email:", message);
    return { success: false, error: `GOV.UK Notify error: ${message}` };
  }
}
