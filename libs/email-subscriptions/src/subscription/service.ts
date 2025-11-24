import { prisma } from "@hmcts/postgres";
import {
  countSubscriptionsByUserId,
  createSubscriptionRecord,
  deleteSubscriptionRecord,
  findSubscriptionByUserAndLocation,
  findSubscriptionsByUserId
} from "./queries.js";
import { validateLocationId } from "./validation.js";

const MAX_SUBSCRIPTIONS = 50;

export async function createSubscription(userId: string, locationId: string) {
  const locationValid = await validateLocationId(locationId);
  if (!locationValid) {
    throw new Error("Invalid location ID");
  }

  const existing = await findSubscriptionByUserAndLocation(userId, locationId);
  if (existing) {
    throw new Error("You are already subscribed to this court");
  }

  const count = await countSubscriptionsByUserId(userId);
  if (count >= MAX_SUBSCRIPTIONS) {
    throw new Error(`Maximum ${MAX_SUBSCRIPTIONS} subscriptions allowed`);
  }

  return createSubscriptionRecord(userId, locationId);
}

export async function getSubscriptionsByUserId(userId: string) {
  return findSubscriptionsByUserId(userId);
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

  return deleteSubscriptionRecord(subscriptionId);
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

export async function replaceUserSubscriptions(userId: string, newLocationIds: string[]) {
  const existingSubscriptions = await findSubscriptionsByUserId(userId);
  const existingLocationIds = existingSubscriptions.map((sub) => sub.locationId);

  const newLocationIdSet = new Set(newLocationIds);
  const existingLocationIdSet = new Set(existingLocationIds);

  const toDelete = existingSubscriptions.filter((sub) => !newLocationIdSet.has(sub.locationId));
  const toAdd = newLocationIds.filter((locId) => !existingLocationIdSet.has(locId));

  if (toAdd.length > 0) {
    const currentCount = existingLocationIds.length - toDelete.length;
    if (currentCount + toAdd.length > MAX_SUBSCRIPTIONS) {
      throw new Error(`Maximum ${MAX_SUBSCRIPTIONS} subscriptions allowed`);
    }
  }

  await Promise.all([
    ...toDelete.map((sub) => deleteSubscriptionRecord(sub.subscriptionId)),
    ...toAdd.map(async (locationId) => {
      const locationValid = await validateLocationId(locationId);
      if (!locationValid) {
        throw new Error(`Invalid location ID: ${locationId}`);
      }
      return createSubscriptionRecord(userId, locationId);
    })
  ]);

  return {
    added: toAdd.length,
    removed: toDelete.length
  };
}
