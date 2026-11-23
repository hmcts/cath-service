import {
  GOVUK_NOTIFY_TEMPLATE_ID_INACTIVE_CFT_SIGN_IN,
  GOVUK_NOTIFY_TEMPLATE_ID_INACTIVE_CRIME_SIGN_IN,
  GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_ACCOUNT_DELETION,
  GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_ACCOUNT_VERIFICATION,
  sendNotifyEmail
} from "@hmcts/govuk-notify";
import type { IdamUser, MediaUser, MediaUserForDeletion } from "./queries.js";

const GENERIC_USER_NAME = "user";
const CRIME_IDAM_PROVENANCE = "CRIME_IDAM";
const EMAIL_DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });

export function getNotificationSettings(): NotificationSettings {
  const apiKey = process.env.GOVUK_NOTIFY_API_KEY;
  if (!apiKey) {
    throw new Error("GOVUK_NOTIFY_API_KEY is required");
  }

  return {
    apiKey,
    mediaVerificationPageLink: process.env.MEDIA_VERIFICATION_PAGE_LINK || `${serviceUrl()}/media-verification`,
    cftSignInLink: process.env.CFT_SIGN_IN_LINK || `${serviceUrl()}/cft-login`,
    crimeSignInLink: process.env.CRIME_SIGN_IN_LINK || `${serviceUrl()}/crime-login`,
    createMediaAccountLink: process.env.CREATE_MEDIA_ACCOUNT_LINK || `${serviceUrl()}/create-media-account`
  };
}

export async function sendMediaVerificationEmail(settings: NotificationSettings, user: MediaUser): Promise<void> {
  await sendNotifyEmail({
    apiKey: settings.apiKey,
    templateId: GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_ACCOUNT_VERIFICATION,
    emailAddress: user.email,
    personalisation: {
      full_name: user.firstName || GENERIC_USER_NAME,
      verification_page_link: settings.mediaVerificationPageLink
    },
    reference: `inactive-media-verification-${user.userId}`
  });
}

export async function sendIdamSignInNotificationEmail(settings: NotificationSettings, user: IdamUser): Promise<void> {
  await sendNotifyEmail({
    apiKey: settings.apiKey,
    templateId: user.userProvenance === CRIME_IDAM_PROVENANCE ? GOVUK_NOTIFY_TEMPLATE_ID_INACTIVE_CRIME_SIGN_IN : GOVUK_NOTIFY_TEMPLATE_ID_INACTIVE_CFT_SIGN_IN,
    emailAddress: user.email,
    personalisation: {
      full_name: fullName(user),
      last_signed_in_date: user.lastSignedInDate ? EMAIL_DATE_FORMAT.format(user.lastSignedInDate) : "",
      cft_sign_in_link: settings.cftSignInLink,
      crime_sign_in_link: settings.crimeSignInLink
    },
    reference: `inactive-idam-sign-in-${user.userId}`
  });
}

// PIP's template uses kebab-case personalisation keys, unlike the other inactive account templates
export async function sendMediaAccountDeletionEmail(settings: NotificationSettings, user: MediaUserForDeletion, reVerificationEmailDate: Date): Promise<void> {
  await sendNotifyEmail({
    apiKey: settings.apiKey,
    templateId: GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_ACCOUNT_DELETION,
    emailAddress: user.email,
    personalisation: {
      "full-name": user.firstName || GENERIC_USER_NAME,
      date: EMAIL_DATE_FORMAT.format(reVerificationEmailDate),
      "link-to-service": settings.createMediaAccountLink
    },
    reference: `inactive-media-deletion-${user.userId}`
  });
}

function serviceUrl(): string {
  const url = process.env.CATH_SERVICE_URL;
  if (!url) {
    throw new Error("CATH_SERVICE_URL is required to build the inactive account email links");
  }
  return url.replace(/\/+$/, "");
}

function fullName(user: IdamUser): string {
  const name = [user.firstName, user.surname].filter(Boolean).join(" ");
  return name || GENERIC_USER_NAME;
}

export interface NotificationSettings {
  apiKey: string;
  mediaVerificationPageLink: string;
  cftSignInLink: string;
  crimeSignInLink: string;
  createMediaAccountLink: string;
}
