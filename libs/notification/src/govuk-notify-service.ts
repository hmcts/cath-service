import {
  GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_DUPLICATE_ACCOUNT,
  GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_NEW_ACCOUNT,
  GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_REJECTION,
  sendNotifyEmail
} from "@hmcts/govuk-notify";

const GOVUK_NOTIFY_API_KEY = process.env.GOVUK_NOTIFY_API_KEY;
const MEDIA_PASSWORD_RESET_LINK = process.env.MEDIA_PASSWORD_RESET_LINK;
const MEDIA_SIGN_IN_LINK = process.env.MEDIA_SIGN_IN_LINK;

interface MediaApplicationRejectionEmailData {
  fullName: string;
  email: string;
  rejectReasons: string;
  linkToService: string;
}

interface MediaAccountEmailData {
  email: string;
  fullName: string;
}

export async function sendMediaRejectionEmail(data: MediaApplicationRejectionEmailData): Promise<void> {
  if (!GOVUK_NOTIFY_API_KEY) {
    throw new Error("GOV Notify API key not configured");
  }

  await sendNotifyEmail({
    apiKey: GOVUK_NOTIFY_API_KEY,
    templateId: GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_REJECTION,
    emailAddress: data.email,
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

  if (!MEDIA_PASSWORD_RESET_LINK) {
    throw new Error("MEDIA_PASSWORD_RESET_LINK environment variable is not configured");
  }

  await sendNotifyEmail({
    apiKey: GOVUK_NOTIFY_API_KEY,
    templateId: GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_NEW_ACCOUNT,
    emailAddress: data.email,
    personalisation: {
      full_name: data.fullName,
      "forgot password process link": MEDIA_PASSWORD_RESET_LINK
    },
    reference: `media-new-account-${Date.now()}`
  });
}

export async function sendMediaDuplicateAccountEmail(data: MediaAccountEmailData): Promise<void> {
  if (!GOVUK_NOTIFY_API_KEY) {
    throw new Error("GOV Notify API key not configured");
  }

  if (!MEDIA_SIGN_IN_LINK) {
    throw new Error("MEDIA_SIGN_IN_LINK environment variable is not configured");
  }

  await sendNotifyEmail({
    apiKey: GOVUK_NOTIFY_API_KEY,
    templateId: GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_DUPLICATE_ACCOUNT,
    emailAddress: data.email,
    personalisation: {
      "Full name": data.fullName,
      "sign in page link": MEDIA_SIGN_IN_LINK
    },
    reference: `media-duplicate-account-${Date.now()}`
  });
}
