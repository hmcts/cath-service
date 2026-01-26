import { findAllArtefactSearchByArtefactId } from "@hmcts/publication";
import { sendEmail } from "../govnotify/govnotify-client.js";
import { buildTemplateParameters } from "../govnotify/template-config.js";
import { createNotificationAuditLog, updateNotificationStatus } from "./notification-queries.js";
import {
  findActiveSubscriptionsByCaseNames,
  findActiveSubscriptionsByCaseNumbers,
  findActiveSubscriptionsByLocation,
  type SubscriptionWithUser
} from "./subscription-queries.js";
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

  // 1. Get location subscriptions
  const locationSubscriptions = await findActiveSubscriptionsByLocation(locationIdNum);

  // 2. Get case numbers and case names from artefact search table (publicationId is artefactId)
  const artefactCases = await findAllArtefactSearchByArtefactId(event.publicationId);
  const caseNumbers = artefactCases.map((ac) => ac.caseNumber).filter((cn): cn is string => cn !== null);
  const caseNames = artefactCases.map((ac) => ac.caseName).filter((cn): cn is string => cn !== null);

  console.log("[notification-service] Artefact cases found:", {
    publicationId: event.publicationId,
    totalCases: artefactCases.length,
    caseNumbers,
    caseNames,
    caseSamples: artefactCases.slice(0, 3).map((ac) => ({ caseNumber: ac.caseNumber, caseName: ac.caseName }))
  });

  // 3. Get case subscriptions by both case numbers and case names
  const caseNumberSubscriptions = caseNumbers.length > 0 ? await findActiveSubscriptionsByCaseNumbers(caseNumbers) : [];
  const caseNameSubscriptions = caseNames.length > 0 ? await findActiveSubscriptionsByCaseNames(caseNames) : [];

  // Combine and deduplicate case subscriptions by subscriptionId
  const seenSubscriptionIds = new Set<string>();
  const caseSubscriptions: SubscriptionWithUser[] = [];

  for (const sub of [...caseNumberSubscriptions, ...caseNameSubscriptions]) {
    if (!seenSubscriptionIds.has(sub.subscriptionId)) {
      seenSubscriptionIds.add(sub.subscriptionId);
      caseSubscriptions.push(sub);
    }
  }

  console.log("[notification-service] Case subscriptions found:", {
    totalCaseNumberSubscriptions: caseNumberSubscriptions.length,
    totalCaseNameSubscriptions: caseNameSubscriptions.length,
    totalCaseSubscriptions: caseSubscriptions.length,
    caseSubscriptionSamples: caseSubscriptions.slice(0, 3).map((cs) => ({
      userId: cs.userId,
      searchValue: cs.searchValue,
      caseName: cs.caseName
    }))
  });

  // 4. Group subscriptions by userId while preserving case vs location information
  const allSubscriptions = [...locationSubscriptions, ...caseSubscriptions];
  const userSubscriptionsMap = groupSubscriptionsByUser(allSubscriptions);

  console.log("[notification-service] Grouped subscriptions:", {
    totalLocationSubscriptions: locationSubscriptions.length,
    totalCaseSubscriptions: caseSubscriptions.length,
    uniqueUsers: userSubscriptionsMap.size
  });

  if (userSubscriptionsMap.size === 0) {
    return {
      totalSubscriptions: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
  }

  // 5. Process all subscriptions
  const results = await Promise.allSettled(
    Array.from(userSubscriptionsMap.entries()).map(([userId, subscriptions]) => processUserNotification(subscriptions, event, artefactCases))
  );

  const result: NotificationResult = {
    totalSubscriptions: userSubscriptionsMap.size,
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

function groupSubscriptionsByUser(subscriptions: SubscriptionWithUser[]): Map<string, SubscriptionWithUser[]> {
  const grouped = new Map<string, SubscriptionWithUser[]>();

  for (const subscription of subscriptions) {
    const existing = grouped.get(subscription.userId) || [];
    existing.push(subscription);
    grouped.set(subscription.userId, existing);
  }

  return grouped;
}

interface ArtefactCase {
  caseNumber: string | null;
  caseName: string | null;
}

function formatCaseInfo(subscriptions: SubscriptionWithUser[], artefactCases: ArtefactCase[]): string | undefined {
  const caseSubscriptions = subscriptions.filter((sub) => sub.searchType === "CASE_NUMBER" || sub.searchType === "CASE_NAME");

  if (caseSubscriptions.length === 0) {
    return undefined;
  }

  // Create maps for both case number and case name lookups (case-insensitive)
  const artefactByCaseNumber = new Map<string, ArtefactCase>();
  const artefactByCaseName = new Map<string, ArtefactCase>();

  for (const artefactCase of artefactCases) {
    if (artefactCase.caseNumber) {
      artefactByCaseNumber.set(artefactCase.caseNumber.toLowerCase(), artefactCase);
    }
    if (artefactCase.caseName) {
      artefactByCaseName.set(artefactCase.caseName.toLowerCase(), artefactCase);
    }
  }

  // Collect display values for each subscription (only show what was searched for)
  const displayedCases = new Set<string>();

  for (const sub of caseSubscriptions) {
    const searchValue = sub.searchValue;

    // Check if subscription matches by case number
    const matchedByCaseNumber = artefactByCaseNumber.get(searchValue.toLowerCase());
    if (matchedByCaseNumber) {
      // Display the case number from the artefact
      if (matchedByCaseNumber.caseNumber) {
        displayedCases.add(matchedByCaseNumber.caseNumber);
      }
      continue;
    }

    // Check if subscription matches by case name
    const matchedByCaseName = artefactByCaseName.get(searchValue.toLowerCase());
    if (matchedByCaseName) {
      // Display the case name from the artefact
      if (matchedByCaseName.caseName) {
        displayedCases.add(matchedByCaseName.caseName);
      }
    }
  }

  const caseInfo = Array.from(displayedCases).join(", ");
  return caseInfo || undefined;
}

function hasLocationSubscription(subscriptions: SubscriptionWithUser[]): boolean {
  return subscriptions.some((sub) => sub.searchType === "LOCATION_ID");
}

async function processUserNotification(
  subscriptions: SubscriptionWithUser[],
  event: PublicationEvent,
  artefactCases: ArtefactCase[]
): Promise<UserNotificationResult> {
  // Use the first subscription to get user info (all subscriptions have the same user)
  const firstSubscription = subscriptions[0];
  const userId = firstSubscription.userId;
  const user = firstSubscription.user;

  try {
    if (!user.email) {
      const notification = await createNotificationAuditLog({
        subscriptionId: firstSubscription.subscriptionId,
        userId,
        publicationId: event.publicationId,
        status: "Skipped"
      });

      await updateNotificationStatus(notification.notificationId, "Skipped", undefined, "No email address");

      return {
        status: "skipped",
        error: `User ${userId}: No email address`
      };
    }

    if (!isValidEmail(user.email)) {
      const notification = await createNotificationAuditLog({
        subscriptionId: firstSubscription.subscriptionId,
        userId,
        publicationId: event.publicationId,
        status: "Skipped"
      });

      await updateNotificationStatus(notification.notificationId, "Skipped", undefined, "Invalid email format");

      return {
        status: "skipped",
        error: `User ${userId}: Invalid email format`
      };
    }

    const notification = await createNotificationAuditLog({
      subscriptionId: firstSubscription.subscriptionId,
      userId,
      publicationId: event.publicationId,
      status: "Pending"
    });

    const userName = buildUserName(user.firstName, user.surname);
    const caseInfo = formatCaseInfo(subscriptions, artefactCases);
    const hasLocation = hasLocationSubscription(subscriptions);

    const templateParameters = buildTemplateParameters({
      userName,
      hearingListName: event.hearingListName,
      publicationDate: event.publicationDate,
      locationName: event.locationName,
      caseInfo,
      hasLocationSubscription: hasLocation
    });

    const emailResult = await sendEmail({
      emailAddress: user.email,
      templateParameters
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
      error: `User ${userId}: ${emailResult.error}`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      status: "failed",
      error: `User ${userId}: ${errorMessage}`
    };
  }
}

function buildUserName(firstName: string | null, surname: string | null): string {
  const parts = [firstName, surname].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "User";
}
