import fs from "node:fs/promises";
import { type CauseListData, extractCaseSummary, formatCaseSummaryForEmail } from "@hmcts/civil-and-family-daily-cause-list";
import { sendEmail } from "../govnotify/govnotify-client.js";
import {
  buildEnhancedTemplateParameters,
  buildTemplateParameters,
  getSubscriptionTemplateIdForListType,
  type TemplateParameters
} from "../govnotify/template-config.js";
import { createNotificationAuditLog, updateNotificationStatus } from "./notification-queries.js";
import { findActiveSubscriptionsByLocation, type SubscriptionWithUser } from "./subscription-queries.js";
import { type PublicationEvent, validatePublicationEvent } from "./validation.js";

const CIVIL_AND_FAMILY_DAILY_CAUSE_LIST_ID = 8;
const MAX_PDF_SIZE_BYTES = 2 * 1024 * 1024;

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
  const isCivilFamilyList = event.listTypeId === CIVIL_AND_FAMILY_DAILY_CAUSE_LIST_ID;

  if (isCivilFamilyList && event.jsonData) {
    return buildCivilFamilyEmailData(event, userName);
  }

  return {
    templateParameters: buildTemplateParameters({
      userName,
      hearingListName: event.hearingListName,
      publicationDate: event.publicationDate,
      locationName: event.locationName
    })
  };
}

async function buildCivilFamilyEmailData(event: PublicationEvent, userName: string): Promise<EmailTemplateData> {
  try {
    const caseSummaryItems = extractCaseSummary(event.jsonData as CauseListData);
    const caseSummary = formatCaseSummaryForEmail(caseSummaryItems);

    const templateParameters = buildEnhancedTemplateParameters({
      userName,
      hearingListName: event.hearingListName,
      publicationDate: event.publicationDate,
      locationName: event.locationName,
      caseSummary
    });

    if (event.pdfFilePath) {
      return buildCivilFamilyWithPdf(event.pdfFilePath, templateParameters);
    }

    return {
      templateParameters,
      templateId: getSubscriptionTemplateIdForListType(CIVIL_AND_FAMILY_DAILY_CAUSE_LIST_ID, false, false)
    };
  } catch (error) {
    console.error("Failed to build enhanced template parameters, falling back to standard template:", error);
    return {
      templateParameters: buildTemplateParameters({
        userName,
        hearingListName: event.hearingListName,
        publicationDate: event.publicationDate,
        locationName: event.locationName
      })
    };
  }
}

async function buildCivilFamilyWithPdf(pdfFilePath: string, templateParameters: TemplateParameters): Promise<EmailTemplateData> {
  const pdfStats = await fs.stat(pdfFilePath);
  const pdfUnder2MB = pdfStats.size < MAX_PDF_SIZE_BYTES;

  const templateId = getSubscriptionTemplateIdForListType(CIVIL_AND_FAMILY_DAILY_CAUSE_LIST_ID, true, pdfUnder2MB);

  if (pdfUnder2MB) {
    const pdfBuffer = await fs.readFile(pdfFilePath);
    return { templateParameters, templateId, pdfBuffer };
  }

  return { templateParameters, templateId };
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
