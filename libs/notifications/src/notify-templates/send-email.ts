import { extractNotifyError, prepareNotifyFileUpload, sendNotifyEmailWithRetry } from "@hmcts/govuk-notify";
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
    const apiKey = getApiKey();
    const personalisation = buildAttachmentPersonalisation(apiKey, params);

    const { notificationId } = await sendNotifyEmailWithRetry(
      {
        apiKey,
        templateId: params.templateId,
        emailAddress: params.emailAddress,
        personalisation
      },
      { retryAttempts: NOTIFICATION_RETRY_ATTEMPTS, retryDelayMs: NOTIFICATION_RETRY_DELAY_MS }
    );

    console.log("[send-email] Successfully sent email with notification ID:", notificationId);
    return { success: true, notificationId };
  } catch (error) {
    const { message } = extractNotifyError(error);
    console.error("[send-email] Failed to send email:", message);
    return { success: false, error: `GOV.UK Notify error: ${message}` };
  }
}

// Subscription Notify templates require pdf_link_*/excel_link_* personalisation
// keys (see getSubscriptionTemplateId in template-config.ts) — this is specific
// to the subscription list-download templates, not a generic Notify concern.
function buildAttachmentPersonalisation(apiKey: string, params: SendEmailParams): Record<string, unknown> {
  const personalisation: Record<string, unknown> = { ...params.templateParameters };

  if (params.pdfBuffer) {
    const linkToFile = prepareNotifyFileUpload(apiKey, params.pdfBuffer);
    personalisation.link_to_file = linkToFile;
    personalisation.pdf_link_to_file = linkToFile;
    personalisation.pdf_link_text = "Download PDF version";
  }

  if (params.excelBuffer) {
    personalisation.excel_link_to_file = prepareNotifyFileUpload(apiKey, params.excelBuffer);
    personalisation.excel_link_text = "Download Excel version";
  }

  return personalisation;
}
