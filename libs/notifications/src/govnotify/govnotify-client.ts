/// <reference path="../notifications-node-client.d.ts" />
import { NotifyClient } from "notifications-node-client";
import { getApiKey, getTemplateId, type TemplateParameters } from "./template-config.js";

const NOTIFICATION_RETRY_ATTEMPTS = Number.parseInt(process.env.NOTIFICATION_RETRY_ATTEMPTS || "1", 10);
const NOTIFICATION_RETRY_DELAY_MS = Number.parseInt(process.env.NOTIFICATION_RETRY_DELAY_MS || "1000", 10);

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
  return retryWithBackoff(() => sendEmailInternal(params), NOTIFICATION_RETRY_ATTEMPTS);
}

async function sendEmailInternal(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const notifyClient = new NotifyClient(getApiKey());
    const templateId = getTemplateId();

    const response = await notifyClient.sendEmail(templateId, params.emailAddress, {
      personalisation: params.templateParameters
    });

    return {
      success: true,
      notificationId: response.data.id
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage
    };
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
