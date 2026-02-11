import { prisma } from "@hmcts/postgres";
import {
  createListTypeSubscriptionRecord,
  deleteListTypeSubscriptionRecord,
  findExistingListTypeSubscription,
  findListTypeSubscriptionById,
  findListTypeSubscriptionsByUserId,
  updateListTypeSubscriptionLanguage
} from "./queries.js";

export async function createListTypeSubscriptions(userId: string, listTypeIds: number[], language: string[]) {
  // De-duplicate input to prevent unique constraint violations
  const uniqueListTypeIds = Array.from(new Set(listTypeIds));

  // Execute all validations and inserts/updates atomically within a transaction
  return prisma.$transaction(async (tx) => {
    // Separate existing and new subscriptions
    const existingSubscriptions: number[] = [];
    const newSubscriptions: number[] = [];

    for (const listTypeId of uniqueListTypeIds) {
      const existing = await findExistingListTypeSubscription(userId, listTypeId, tx);
      if (existing) {
        existingSubscriptions.push(listTypeId);
      } else {
        newSubscriptions.push(listTypeId);
      }
    }

    // Update existing subscriptions with new language preferences
    await Promise.all(existingSubscriptions.map((listTypeId) => updateListTypeSubscriptionLanguage(userId, listTypeId, language, tx)));

    // Create new subscriptions
    await Promise.all(newSubscriptions.map((listTypeId) => createListTypeSubscriptionRecord(userId, listTypeId, language, tx)));

    // Fetch and return all subscriptions (both updated and created)
    const allSubscriptions = await findListTypeSubscriptionsByUserId(userId, tx);
    return allSubscriptions.filter((sub: { listTypeId: number }) => uniqueListTypeIds.includes(sub.listTypeId));
  });
}

export async function getListTypeSubscriptionsByUserId(userId: string) {
  return findListTypeSubscriptionsByUserId(userId);
}

export async function deleteListTypeSubscription(userId: string, listTypeSubscriptionId: string) {
  const subscription = await findListTypeSubscriptionById(listTypeSubscriptionId, userId);

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  const count = await deleteListTypeSubscriptionRecord(listTypeSubscriptionId, userId);

  if (count === 0) {
    throw new Error("Subscription not found");
  }

  return count;
}

export async function hasExistingSubscription(userId: string, listTypeId: number) {
  const existing = await findExistingListTypeSubscription(userId, listTypeId);
  return existing !== null;
}
