import { prisma } from "@hmcts/postgres";
import {
  countListTypeSubscriptionsByUserId,
  createListTypeSubscriptionRecord,
  deleteListTypeSubscriptionRecord,
  findDuplicateListTypeSubscription,
  findListTypeSubscriptionById,
  findListTypeSubscriptionsByUserId
} from "./queries.js";

const MAX_LIST_TYPE_SUBSCRIPTIONS = 50;

export async function createListTypeSubscriptions(userId: string, listTypeIds: number[], language: string) {
  // De-duplicate input to prevent unique constraint violations
  const uniqueListTypeIds = Array.from(new Set(listTypeIds));

  // Execute all validations and inserts atomically within a transaction
  return prisma.$transaction(async (tx) => {
    // Check current subscription count
    const currentCount = await countListTypeSubscriptionsByUserId(userId, tx);

    if (currentCount + uniqueListTypeIds.length > MAX_LIST_TYPE_SUBSCRIPTIONS) {
      throw new Error(`Maximum ${MAX_LIST_TYPE_SUBSCRIPTIONS} list type subscriptions allowed`);
    }

    // Check for duplicates
    for (const listTypeId of uniqueListTypeIds) {
      const duplicate = await findDuplicateListTypeSubscription(userId, listTypeId, language, tx);
      if (duplicate) {
        throw new Error(`Already subscribed to list type ${listTypeId} with language ${language}`);
      }
    }

    // Create all subscriptions
    const subscriptions = await Promise.all(
      uniqueListTypeIds.map((listTypeId) => createListTypeSubscriptionRecord(userId, listTypeId, language, tx))
    );

    return subscriptions;
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

export async function hasDuplicateSubscription(userId: string, listTypeId: number, language: string) {
  const duplicate = await findDuplicateListTypeSubscription(userId, listTypeId, language);
  return duplicate !== null;
}
