import { NotifyClient } from "notifications-node-client";
import { getApiKey, getTemplateId, type TemplateParameters } from "./template-config.js";

const NOTIFICATION_RETRY_ATTEMPTS = Number.parseInt(process.env.NOTIFICATION_RETRY_ATTEMPTS || "1", 10);
const NOTIFICATION_RETRY_DELAY_MS = Number.parseInt(process.env.NOTIFICATION_RETRY_DELAY_MS || "1000", 10);

interface NotificationData {
  id: string;
  reference: string | null;
  uri: string;
  template: {
    id: string;
    version: number;
    uri: string;
  };
  content: {
    subject: string | null;
    body: string;
    from_email: string;
  };
}

interface AxiosEmailResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: Record<string, any>;
  request: any;
  data: NotificationData;
}

export interface SendEmailParams {
  emailAddress: string;
  templateParameters: TemplateParameters;
}

export interface SendEmailResult {
  success: boolean;
  notificationId?: string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const result = await retryWithBackoff(() => sendEmailInternal(params), NOTIFICATION_RETRY_ATTEMPTS);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage
    };
  }
}

async function sendEmailInternal(params: SendEmailParams): Promise<SendEmailResult> {
  const notifyClient = new NotifyClient(getApiKey());
  const templateId = getTemplateId();

  try {
    console.log("[govnotify-client] Sending email:", {
      templateId,
      emailAddress: params.emailAddress,
      templateParameters: params.templateParameters
    });

    const response = (await (notifyClient as any).sendEmail(templateId, params.emailAddress, {
      personalisation: params.templateParameters
    })) as unknown as AxiosEmailResponse;

    console.log("[govnotify-client] Response keys:", Object.keys(response || {}));
    console.log("[govnotify-client] Response.data:", response?.data);

    // The notifications-node-client v8.x returns response.data (Axios response structure)
    const notificationId = response?.data?.id;

    if (!notificationId) {
      console.error("[govnotify-client] Could not find notification ID. Available keys:", Object.keys(response || {}));
      throw new Error(`Unable to extract notification ID from response`);
    }

    console.log("[govnotify-client] Successfully sent email with notification ID:", notificationId);

    return {
      success: true,
      notificationId
    };
  } catch (error: any) {
    console.error("[govnotify-client] Error details:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    const errorDetails = error.response?.data?.errors || error.message || String(error);
    const detailedError = typeof errorDetails === "object" ? JSON.stringify(errorDetails) : errorDetails;
    throw new Error(`GOV.UK Notify error: ${detailedError}`);
  }
}

async function retryWithBackoff<T>(fn: () => Promise<T>, retries: number, delay = NOTIFICATION_RETRY_DELAY_MS): Promise<T> {
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
