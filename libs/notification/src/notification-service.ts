import { findUserById } from "@hmcts/account/repository/query";
import { mockListTypes } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";
import { findSubscriptionsByLocationId } from "@hmcts/subscriptions";
import { createNotificationLog, updateNotificationLogFailed, updateNotificationLogSent } from "./repository/queries.js";

const GOVUK_NOTIFY_API_KEY = process.env.GOVUK_NOTIFY_API_KEY || "";
const GOVUK_NOTIFY_TEMPLATE_ID = process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION || "";

let notifyClient: any = null;

async function getNotifyClient() {
  if (!notifyClient) {
    // @ts-expect-error - notifications-node-client has no type definitions
    const notifyClientModule = await import("notifications-node-client");
    const NotifyClient = notifyClientModule.default?.NotifyClient || notifyClientModule.NotifyClient;
    notifyClient = new NotifyClient(GOVUK_NOTIFY_API_KEY);
  }
  return notifyClient;
}

interface SendNotificationParams {
  publicationId: string;
  locationId: string;
  hearingListName: string;
  publicationDate: string;
}

interface NotificationResult {
  success: boolean;
  totalSubscribers: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  errors: Array<{ userId: string; error: string }>;
}

export async function sendPublicationNotifications(params: SendNotificationParams): Promise<NotificationResult> {
  const { publicationId, locationId, hearingListName, publicationDate } = params;

  console.log("[Notification Service] Starting notification process", {
    publicationId,
    locationId,
    hearingListName,
    publicationDate,
    timestamp: new Date().toISOString()
  });

  const result: NotificationResult = {
    success: true,
    totalSubscribers: 0,
    sentCount: 0,
    failedCount: 0,
    skippedCount: 0,
    errors: []
  };

  try {
    const subscriptions = await findSubscriptionsByLocationId(Number(locationId));
    result.totalSubscribers = subscriptions.length;

    console.log("[Notification Service] Found subscriptions", {
      locationId,
      subscriberCount: subscriptions.length,
      timestamp: new Date().toISOString()
    });

    if (subscriptions.length === 0) {
      console.log("[Notification Service] No subscribers for location", {
        locationId,
        timestamp: new Date().toISOString()
      });
      return result;
    }

    const location = await getLocationById(Number(locationId));
    if (!location) {
      console.error("[Notification Service] Location not found", {
        locationId,
        timestamp: new Date().toISOString()
      });
      result.success = false;
      return result;
    }

    console.log("[Notification Service] Location details retrieved", {
      locationId,
      locationName: location.name,
      timestamp: new Date().toISOString()
    });

    for (const subscription of subscriptions) {
      const notificationId = await createNotificationLog({
        subscriptionId: subscription.subscriptionId,
        userId: subscription.userId,
        publicationId,
        locationId,
        status: "PENDING"
      });

      console.log("[Notification Service] Processing subscription", {
        notificationId,
        subscriptionId: subscription.subscriptionId,
        userId: subscription.userId,
        timestamp: new Date().toISOString()
      });

      try {
        const user = await findUserById(subscription.userId);

        if (!user || !user.email) {
          console.warn("[Notification Service] User or email not found", {
            notificationId,
            userId: subscription.userId,
            timestamp: new Date().toISOString()
          });

          await updateNotificationLogFailed(notificationId, "User or email not found");
          result.skippedCount++;
          continue;
        }

        console.log("[Notification Service] Sending email via GOV.UK Notify", {
          notificationId,
          userId: subscription.userId,
          email: user.email,
          templateId: GOVUK_NOTIFY_TEMPLATE_ID,
          timestamp: new Date().toISOString()
        });

        const baseUrl = process.env.BASE_URL || "https://localhost:8080";

        // Convert list type name to friendly name
        const listType = mockListTypes.find((lt) => lt.name === hearingListName);
        const listTypeFriendlyName = listType?.englishFriendlyName || hearingListName;

        // Format date to dd/mm/yyyy
        const date = new Date(publicationDate);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;

        const client = await getNotifyClient();
        const response = await client.sendEmail(GOVUK_NOTIFY_TEMPLATE_ID, user.email, {
          personalisation: {
            ListType: listTypeFriendlyName,
            content_date: formattedDate,
            locations: location.name,
            start_page_link: baseUrl,
            subscription_page_link: `${baseUrl}/account-home`
          },
          reference: `${publicationId}-${subscription.subscriptionId}`
        });

        console.log("[Notification Service] GOV.UK Notify API response", {
          notificationId,
          userId: subscription.userId,
          notifyId: response.data.id,
          notifyReference: response.data.reference,
          notifyUri: response.data.uri,
          notifyTemplateId: response.data.template.id,
          notifyTemplateVersion: response.data.template.version,
          timestamp: new Date().toISOString()
        });

        await updateNotificationLogSent(notificationId);
        result.sentCount++;

        console.log("[Notification Service] Email sent successfully", {
          notificationId,
          userId: subscription.userId,
          email: user.email,
          notifyId: response.data.id,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        // Extract detailed error information from Axios error
        const errorDetails: any = {
          notificationId,
          userId: subscription.userId,
          error: errorMessage,
          errorName: error instanceof Error ? error.name : "Unknown",
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        };

        // Add Axios-specific error details if available
        if (error && typeof error === "object" && "response" in error) {
          const axiosError = error as any;
          errorDetails.statusCode = axiosError.response?.status;
          errorDetails.responseData = axiosError.response?.data;
          errorDetails.responseHeaders = axiosError.response?.headers;
        }

        console.error("[Notification Service] GOV.UK Notify API error", errorDetails);

        // Log the full error response data as JSON to see detailed error messages
        if (errorDetails.responseData) {
          console.error("[Notification Service] GOV.UK Notify Error Details:", JSON.stringify(errorDetails.responseData, null, 2));
        }

        await updateNotificationLogFailed(notificationId, errorMessage);
        result.failedCount++;
        result.errors.push({
          userId: subscription.userId,
          error: errorMessage
        });
      }
    }

    console.log("[Notification Service] Notification process completed", {
      publicationId,
      locationId,
      totalSubscribers: result.totalSubscribers,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      skippedCount: result.skippedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[Notification Service] Fatal error during notification process", {
      publicationId,
      locationId,
      error: error instanceof Error ? error.message : "Unknown error",
      errorStack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    result.success = false;
  }

  return result;
}
