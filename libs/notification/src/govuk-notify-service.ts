import { NotifyClient } from "notifications-node-client";

const GOVUK_NOTIFY_API_KEY = process.env.GOVUK_NOTIFY_API_KEY;
const TEMPLATE_ID_MEDIA_APPROVAL = process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPROVAL;
const TEMPLATE_ID_MEDIA_REJECTION = process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_REJECTION;

interface MediaApplicationEmailData {
  name: string;
  email: string;
  employer: string;
}

interface MediaApplicationRejectionEmailData {
  fullName: string;
  email: string;
  rejectReasons: string;
  linkToService: string;
}

export async function sendMediaApprovalEmail(data: MediaApplicationEmailData): Promise<void> {
  if (!GOVUK_NOTIFY_API_KEY) {
    throw new Error("GOV Notify API key not configured");
  }

  if (!TEMPLATE_ID_MEDIA_APPROVAL) {
    throw new Error("GOV Notify approval template ID not configured");
  }

  const notifyClient = new NotifyClient(GOVUK_NOTIFY_API_KEY);

  await notifyClient.sendEmail(TEMPLATE_ID_MEDIA_APPROVAL, data.email, {
    personalisation: {
      "full name": data.name,
      Employer: data.employer
    },
    reference: `media-approval-${Date.now()}`
  });
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
