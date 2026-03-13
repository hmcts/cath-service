import { NotifyClient } from "notifications-node-client";

interface NotifyError {
  response?: { status?: number; data?: { errors?: { error: string; message: string }[] } };
  message?: string;
}

export function extractNotifyError(error: unknown): { status: number; message: string } {
  const notifyError = error as NotifyError;
  const status = notifyError.response?.status ?? 0;
  const message = notifyError.response?.data?.errors?.map((e) => e.message).join(", ") || notifyError.message || "Unknown error";
  return { status, message };
}

const GOVUK_NOTIFY_API_KEY = process.env.GOVUK_NOTIFY_API_KEY;
const TEMPLATE_ID_MEDIA_REJECTION = process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_REJECTION;
const TEMPLATE_ID_MEDIA_NEW_ACCOUNT = process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_NEW_ACCOUNT;
const TEMPLATE_ID_MEDIA_EXISTING_USER = process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_EXISTING_USER;

interface MediaApplicationRejectionEmailData {
  fullName: string;
  email: string;
  rejectReasons: string;
  linkToService: string;
}

interface MediaAccountEmailData {
  email: string;
  fullName: string;
  signInPageLink: string;
}

export async function sendMediaRejectionEmail(data: MediaApplicationRejectionEmailData): Promise<void> {
  if (!GOVUK_NOTIFY_API_KEY) {
    throw new Error("GOV Notify API key not configured");
  }

  if (!TEMPLATE_ID_MEDIA_REJECTION) {
    throw new Error("GOV Notify rejection template ID not configured");
  }

  const notifyClient = new NotifyClient(GOVUK_NOTIFY_API_KEY);

  await notifyClient.sendEmail(TEMPLATE_ID_MEDIA_REJECTION, data.email, {
    personalisation: {
      "full-name": data.fullName,
      "reject-reasons": data.rejectReasons,
      "link-to-service": data.linkToService
    },
    reference: `media-rejection-${Date.now()}`
  });
}

export async function sendMediaNewAccountEmail(data: MediaAccountEmailData): Promise<void> {
  if (!GOVUK_NOTIFY_API_KEY) {
    throw new Error("GOV Notify API key not configured");
  }

  if (!TEMPLATE_ID_MEDIA_NEW_ACCOUNT) {
    throw new Error("GOV Notify new account template ID not configured");
  }

  const notifyClient = new NotifyClient(GOVUK_NOTIFY_API_KEY);

  await notifyClient.sendEmail(TEMPLATE_ID_MEDIA_NEW_ACCOUNT, data.email, {
    personalisation: {
      full_name: data.fullName,
      "forgot password process link": data.signInPageLink
    },
    reference: `media-new-account-${Date.now()}`
  });
}

export async function sendMediaExistingUserEmail(data: MediaAccountEmailData): Promise<void> {
  if (!GOVUK_NOTIFY_API_KEY) {
    throw new Error("GOV Notify API key not configured");
  }

  if (!TEMPLATE_ID_MEDIA_EXISTING_USER) {
    throw new Error("GOV Notify existing user template ID not configured");
  }

  const notifyClient = new NotifyClient(GOVUK_NOTIFY_API_KEY);

  await notifyClient.sendEmail(TEMPLATE_ID_MEDIA_EXISTING_USER, data.email, {
    personalisation: {
      "Full name": data.fullName,
      "sign in page link": data.signInPageLink
    },
    reference: `media-existing-user-${Date.now()}`
  });
}
