import fs from "node:fs/promises";
import {
  extractCaseSummary as extractAdminCourtSummary,
  formatCaseSummaryForEmail as formatAdminCourtSummaryForEmail
} from "@hmcts/administrative-court-daily-cause-list";
import {
  extractCaseSummary as extractCareStandardsSummary,
  formatCaseSummaryForEmail as formatCareStandardsSummaryForEmail
} from "@hmcts/care-standards-tribunal-weekly-hearing-list";
import {
  extractCaseSummary as extractCivilFamilySummary,
  formatCaseSummaryForEmail as formatCivilFamilySummaryForEmail
} from "@hmcts/civil-and-family-daily-cause-list";
import {
  extractCaseSummary as extractCourtOfAppealSummary,
  formatCaseSummaryForEmail as formatCourtOfAppealSummaryForEmail
} from "@hmcts/court-of-appeal-civil-daily-cause-list";
import { type CaseSummary, getListTypeName, type ListTypeName } from "@hmcts/list-types-common";
import {
  extractCaseSummary as extractLondonAdminSummary,
  formatCaseSummaryForEmail as formatLondonAdminSummaryForEmail
} from "@hmcts/london-administrative-court-daily-cause-list";
import { extractCaseSummary as extractRcjSummary, formatCaseSummaryForEmail as formatRcjSummaryForEmail } from "@hmcts/rcj-standard-daily-cause-list";
import { findActiveSubscriptionsByLocation, type SubscriptionWithUser } from "@hmcts/subscriptions";
import { sendEmail } from "../govnotify/govnotify-client.js";
import {
  buildEnhancedTemplateParameters,
  buildTemplateParameters,
  getSubscriptionTemplateIdForListType,
  type TemplateParameters
} from "../govnotify/template-config.js";
import { createNotificationAuditLog, updateNotificationStatus } from "./notification-queries.js";
import { type PublicationEvent, validatePublicationEvent } from "./validation.js";

const MAX_PDF_SIZE_BYTES = 2 * 1024 * 1024;

type SummaryExtractor = (jsonData: unknown) => CaseSummary[];
type SummaryFormatter = (items: CaseSummary[]) => string;

interface EmailBuilderConfig {
  extract: SummaryExtractor;
  format: SummaryFormatter;
}

const rcjStandardConfig: EmailBuilderConfig = { extract: extractRcjSummary as SummaryExtractor, format: formatRcjSummaryForEmail };
const adminCourtConfig: EmailBuilderConfig = { extract: extractAdminCourtSummary as SummaryExtractor, format: formatAdminCourtSummaryForEmail };

const EMAIL_BUILDER_REGISTRY: Partial<Record<ListTypeName, EmailBuilderConfig>> = {
  CIVIL_AND_FAMILY_DAILY_CAUSE_LIST: {
    extract: extractCivilFamilySummary as SummaryExtractor,
    format: formatCivilFamilySummaryForEmail
  },
  CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST: {
    extract: extractCareStandardsSummary as SummaryExtractor,
    format: formatCareStandardsSummaryForEmail
  },
  CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST: rcjStandardConfig,
  COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST: rcjStandardConfig,
  COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST: rcjStandardConfig,
  FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST: rcjStandardConfig,
  KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST: rcjStandardConfig,
  KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST: rcjStandardConfig,
  MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST: rcjStandardConfig,
  SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST: rcjStandardConfig,
  LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: {
    extract: extractLondonAdminSummary as SummaryExtractor,
    format: formatLondonAdminSummaryForEmail
  },
  COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST: {
    extract: extractCourtOfAppealSummary as SummaryExtractor,
    format: formatCourtOfAppealSummaryForEmail
  },
  BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: adminCourtConfig,
  LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: adminCourtConfig,
  BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: adminCourtConfig,
  MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: adminCourtConfig
};

export interface NotificationResult {
  totalSubscriptions: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
}

interface UserNotificationResult {
  status: "sent" | "failed" | "skipped";
  error?: string;
}

interface EmailTemplateData {
  templateParameters: TemplateParameters;
  templateId?: string;
  pdfBuffer?: Buffer;
}

export async function sendPublicationNotifications(event: PublicationEvent): Promise<NotificationResult> {
  const validation = validatePublicationEvent(event);
  if (!validation.valid) {
    throw new Error(`Invalid publication event: ${validation.errors.join(", ")}`);
  }

  const locationIdNum = Number.parseInt(event.locationId, 10);
  if (Number.isNaN(locationIdNum)) {
    throw new Error(`Invalid location ID: ${event.locationId}`);
  }

  const subscriptions = await findActiveSubscriptionsByLocation(locationIdNum);

  if (subscriptions.length === 0) {
    return { totalSubscriptions: 0, sent: 0, failed: 0, skipped: 0, errors: [] };
  }

  const results = await Promise.allSettled(subscriptions.map((subscription) => processUserNotification(subscription, event)));

  return aggregateResults(results, subscriptions.length);
}

async function processUserNotification(subscription: SubscriptionWithUser, event: PublicationEvent): Promise<UserNotificationResult> {
  try {
    const validationResult = await validateUserEmail(subscription, event.publicationId);
    if (validationResult) {
      return validationResult;
    }

    const notification = await createNotificationAuditLog({
      subscriptionId: subscription.subscriptionId,
      userId: subscription.userId,
      publicationId: event.publicationId,
      status: "Pending"
    });

    const userName = buildUserName(subscription.user.firstName, subscription.user.surname);
    const emailData = await buildEmailTemplateData(event, userName);

    const emailResult = await sendEmail({
      emailAddress: subscription.user.email!,
      templateParameters: emailData.templateParameters,
      templateId: emailData.templateId,
      pdfBuffer: emailData.pdfBuffer
    });

    if (emailResult.success) {
      await updateNotificationStatus(notification.notificationId, "Sent", new Date(), undefined, emailResult.notificationId);
      return { status: "sent" };
    }

    await updateNotificationStatus(notification.notificationId, "Failed", undefined, emailResult.error);
    return { status: "failed", error: `User ${subscription.userId}: ${emailResult.error}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { status: "failed", error: `User ${subscription.userId}: ${errorMessage}` };
  }
}

async function validateUserEmail(subscription: SubscriptionWithUser, publicationId: string): Promise<UserNotificationResult | null> {
  if (!subscription.user.email) {
    return skipNotification(subscription, publicationId, "No email address");
  }

  return null;
}

async function skipNotification(subscription: SubscriptionWithUser, publicationId: string, reason: string): Promise<UserNotificationResult> {
  const notification = await createNotificationAuditLog({
    subscriptionId: subscription.subscriptionId,
    userId: subscription.userId,
    publicationId,
    status: "Skipped"
  });

  await updateNotificationStatus(notification.notificationId, "Skipped", undefined, reason);

  return { status: "skipped", error: `User ${subscription.userId}: ${reason}` };
}

async function buildEmailTemplateData(event: PublicationEvent, userName: string): Promise<EmailTemplateData> {
  const listTypeName = event.listTypeId !== undefined ? getListTypeName(event.listTypeId) : undefined;
  const config = listTypeName ? EMAIL_BUILDER_REGISTRY[listTypeName] : undefined;

  if (config && event.jsonData) {
    return buildEnhancedEmailData(event, userName, config);
  }

  return buildFallbackEmailData(event, userName);
}

async function buildEnhancedEmailData(event: PublicationEvent, userName: string, config: EmailBuilderConfig): Promise<EmailTemplateData> {
  const listTypeId = event.listTypeId!;

  try {
    const caseSummaryItems = config.extract(event.jsonData);
    const caseSummary = config.format(caseSummaryItems);

    const templateParameters = buildEnhancedTemplateParameters({
      userName,
      hearingListName: event.hearingListName,
      publicationDate: event.publicationDate,
      locationName: event.locationName,
      caseSummary
    });

    if (event.pdfFilePath) {
      return buildEmailDataWithPdf(event.pdfFilePath, templateParameters, listTypeId);
    }

    return {
      templateParameters,
      templateId: getSubscriptionTemplateIdForListType(listTypeId, false, false)
    };
  } catch (error) {
    console.error("Failed to build enhanced template parameters, falling back to standard template:", error);
    return buildFallbackEmailData(event, userName);
  }
}

async function buildEmailDataWithPdf(pdfFilePath: string, templateParameters: TemplateParameters, listTypeId: number): Promise<EmailTemplateData> {
  const pdfStats = await fs.stat(pdfFilePath);
  const pdfUnder2MB = pdfStats.size < MAX_PDF_SIZE_BYTES;

  const templateId = getSubscriptionTemplateIdForListType(listTypeId, true, pdfUnder2MB);

  if (pdfUnder2MB) {
    const pdfBuffer = await fs.readFile(pdfFilePath);
    return { templateParameters, templateId, pdfBuffer };
  }

  return { templateParameters, templateId };
}

function buildFallbackEmailData(event: PublicationEvent, userName: string): EmailTemplateData {
  return {
    templateParameters: buildTemplateParameters({
      userName,
      hearingListName: event.hearingListName,
      publicationDate: event.publicationDate,
      locationName: event.locationName
    })
  };
}

function aggregateResults(results: PromiseSettledResult<UserNotificationResult>[], totalSubscriptions: number): NotificationResult {
  const result: NotificationResult = {
    totalSubscriptions,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  for (const settledResult of results) {
    if (settledResult.status === "fulfilled") {
      const userResult = settledResult.value;
      result[userResult.status]++;
      if (userResult.error) {
        result.errors.push(userResult.error);
      }
    } else {
      result.failed++;
      result.errors.push(settledResult.reason?.message || "Unknown error");
    }
  }

  return result;
}

function buildUserName(firstName: string | null, surname: string | null): string {
  const parts = [firstName, surname].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "User";
}
