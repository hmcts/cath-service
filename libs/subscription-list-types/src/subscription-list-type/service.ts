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
  const currentCount = await countListTypeSubscriptionsByUserId(userId);

  if (currentCount + listTypeIds.length > MAX_LIST_TYPE_SUBSCRIPTIONS) {
    throw new Error(`Maximum ${MAX_LIST_TYPE_SUBSCRIPTIONS} list type subscriptions allowed`);
  }

  for (const listTypeId of listTypeIds) {
    const duplicate = await findDuplicateListTypeSubscription(userId, listTypeId, language);
    if (duplicate) {
      throw new Error(`Already subscribed to list type ${listTypeId} with language ${language}`);
    }
  }

  const subscriptions = await Promise.all(listTypeIds.map((listTypeId) => createListTypeSubscriptionRecord(userId, listTypeId, language)));

  return subscriptions;
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
