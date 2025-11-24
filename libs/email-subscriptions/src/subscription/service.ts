import { prisma } from "@hmcts/postgres";
import {
  countActiveSubscriptionsByUserId,
  createSubscriptionRecord,
  deactivateSubscriptionRecord,
  findActiveSubscriptionsByUserId,
  findSubscriptionByUserAndLocation
} from "./queries.js";
import { validateLocationId } from "./validation.js";

const MAX_SUBSCRIPTIONS = 50;

export async function createSubscription(userId: string, locationId: string) {
  const locationValid = await validateLocationId(locationId);
  if (!locationValid) {
    throw new Error("Invalid location ID");
  }

  const existing = await findSubscriptionByUserAndLocation(userId, locationId);
  if (existing?.isActive) {
    throw new Error("You are already subscribed to this court");
  }

  const count = await countActiveSubscriptionsByUserId(userId);
  if (count >= MAX_SUBSCRIPTIONS) {
    throw new Error(`Maximum ${MAX_SUBSCRIPTIONS} subscriptions allowed`);
  }

  if (existing && !existing.isActive) {
    return prisma.subscription.update({
      where: { subscriptionId: existing.subscriptionId },
      data: {
        isActive: true,
        subscribedAt: new Date()
      }
    });
  }

  return createSubscriptionRecord(userId, locationId);
}

export async function getSubscriptionsByUserId(userId: string) {
  return findActiveSubscriptionsByUserId(userId);
}

export async function removeSubscription(subscriptionId: string, userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { subscriptionId }
  });

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  if (subscription.userId !== userId) {
    throw new Error("Unauthorized");
  }

  if (!subscription.isActive) {
    throw new Error("Subscription already removed");
  }

  return deactivateSubscriptionRecord(subscriptionId);
}

export async function createMultipleSubscriptions(userId: string, locationIds: string[]) {
  const results = await Promise.allSettled(locationIds.map((locationId) => createSubscription(userId, locationId)));

  const succeeded = results.filter((r) => r.status === "fulfilled");
  const failed = results.filter((r) => r.status === "rejected");

  return {
    succeeded: succeeded.length,
    failed: failed.length,
    errors: failed.map((r) => (r.status === "rejected" ? r.reason.message : "Unknown error"))
  };
}
