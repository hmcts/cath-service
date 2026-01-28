import fs from "node:fs/promises";
import { type CauseListData, extractCaseSummary, formatCaseSummaryForEmail } from "@hmcts/civil-and-family-daily-cause-list";
import { sendEmail } from "../govnotify/govnotify-client.js";
import { buildEnhancedTemplateParameters, buildTemplateParameters, getTemplateIdForListType, type TemplateParameters } from "../govnotify/template-config.js";
import { createNotificationAuditLog, updateNotificationStatus } from "./notification-queries.js";
import { findActiveSubscriptionsByLocation, type SubscriptionWithUser } from "./subscription-queries.js";
import { isValidEmail, type PublicationEvent, validatePublicationEvent } from "./validation.js";

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
    return {
      totalSubscriptions: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
  }

  const results = await Promise.allSettled(subscriptions.map((subscription) => processUserNotification(subscription, event)));

  const result: NotificationResult = {
    totalSubscriptions: subscriptions.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  for (const settledResult of results) {
    if (settledResult.status === "fulfilled") {
      const userResult = settledResult.value;
      switch (userResult.status) {
        case "sent":
          result.sent++;
          break;
        case "failed":
          result.failed++;
          if (userResult.error) {
            result.errors.push(userResult.error);
          }
          break;
        case "skipped":
          result.skipped++;
          if (userResult.error) {
            result.errors.push(userResult.error);
          }
          break;
      }
    } else {
      result.failed++;
      result.errors.push(settledResult.reason?.message || "Unknown error");
    }
  }

  return result;
}

async function processUserNotification(subscription: SubscriptionWithUser, event: PublicationEvent): Promise<UserNotificationResult> {
  try {
    if (!subscription.user.email) {
      const notification = await createNotificationAuditLog({
        subscriptionId: subscription.subscriptionId,
        userId: subscription.userId,
        publicationId: event.publicationId,
        status: "Skipped"
      });

      await updateNotificationStatus(notification.notificationId, "Skipped", undefined, "No email address");

      return {
        status: "skipped",
        error: `User ${subscription.userId}: No email address`
      };
    }

    if (!isValidEmail(subscription.user.email)) {
      const notification = await createNotificationAuditLog({
        subscriptionId: subscription.subscriptionId,
        userId: subscription.userId,
        publicationId: event.publicationId,
        status: "Skipped"
      });

      await updateNotificationStatus(notification.notificationId, "Skipped", undefined, "Invalid email format");

      return {
        status: "skipped",
        error: `User ${subscription.userId}: Invalid email format`
      };
    }

    const notification = await createNotificationAuditLog({
      subscriptionId: subscription.subscriptionId,
      userId: subscription.userId,
      publicationId: event.publicationId,
      status: "Pending"
    });

    const userName = buildUserName(subscription.user.firstName, subscription.user.surname);

    // Determine if this is a Civil and Family Daily Cause List (listTypeId 8)
    const isCivilFamilyList = event.listTypeId === 8;
    let templateParameters: TemplateParameters;
    let templateId: string | undefined;

    // Track PDF buffer for GOV.UK Notify upload
    let pdfBuffer: Buffer | undefined;

    if (isCivilFamilyList && event.jsonData && event.pdfFilePath) {
      // Enhanced flow for Civil and Family lists with PDF
      try {
        const caseSummaryItems = extractCaseSummary(event.jsonData as CauseListData);
        const caseSummary = formatCaseSummaryForEmail(caseSummaryItems);

        // Check PDF size
        const pdfStats = await fs.stat(event.pdfFilePath);
        const pdfSizeBytes = pdfStats.size;
        const pdfUnder2MB = pdfSizeBytes < 2 * 1024 * 1024;

        // Get appropriate template ID
        templateId = getTemplateIdForListType(8, true, pdfUnder2MB);

        // Read PDF buffer for GOV.UK Notify upload (only if under 2MB)
        if (pdfUnder2MB) {
          pdfBuffer = await fs.readFile(event.pdfFilePath);
        }

        // Build enhanced template parameters (link_to_file will be added by govnotify-client)
        templateParameters = buildEnhancedTemplateParameters({
          userName,
          hearingListName: event.hearingListName,
          publicationDate: event.publicationDate,
          locationName: event.locationName,
          caseSummary
        });
      } catch (error) {
        console.error("Failed to build enhanced template parameters, falling back to standard template:", error);
        // Fall back to standard template
        templateParameters = buildTemplateParameters({
          userName,
          hearingListName: event.hearingListName,
          publicationDate: event.publicationDate,
          locationName: event.locationName
        });
      }
    } else if (isCivilFamilyList && event.jsonData) {
      // Civil/Family list but no PDF (or PDF generation failed)
      try {
        const caseSummaryItems = extractCaseSummary(event.jsonData as CauseListData);
        const caseSummary = formatCaseSummaryForEmail(caseSummaryItems);

        // Get summary-only template ID
        templateId = getTemplateIdForListType(8, false, false);

        templateParameters = buildEnhancedTemplateParameters({
          userName,
          hearingListName: event.hearingListName,
          publicationDate: event.publicationDate,
          locationName: event.locationName,
          caseSummary
        });
      } catch (error) {
        console.error("Failed to build enhanced template parameters, falling back to standard template:", error);
        // Fall back to standard template
        templateParameters = buildTemplateParameters({
          userName,
          hearingListName: event.hearingListName,
          publicationDate: event.publicationDate,
          locationName: event.locationName
        });
      }
    } else {
      // Standard flow for other list types
      templateParameters = buildTemplateParameters({
        userName,
        hearingListName: event.hearingListName,
        publicationDate: event.publicationDate,
        locationName: event.locationName
      });
    }

    const emailResult = await sendEmail({
      emailAddress: subscription.user.email,
      templateParameters,
      templateId,
      pdfBuffer
    });

    if (emailResult.success) {
      await updateNotificationStatus(notification.notificationId, "Sent", new Date(), undefined, emailResult.notificationId);
      return {
        status: "sent"
      };
    }

    await updateNotificationStatus(notification.notificationId, "Failed", undefined, emailResult.error);
    return {
      status: "failed",
      error: `User ${subscription.userId}: ${emailResult.error}`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      status: "failed",
      error: `User ${subscription.userId}: ${errorMessage}`
    };
  }
}

function buildUserName(firstName: string | null, surname: string | null): string {
  const parts = [firstName, surname].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "User";
}
