import { prisma } from "@hmcts/postgres";
import { validateLocationId } from "../validation/validation.js";
import {
  countSubscriptionsByUserId,
  createSubscriptionRecord,
  deleteSubscriptionRecord,
  findSubscriptionByUserAndLocation,
  findSubscriptionsByUserId
} from "./queries.js";

const MAX_SUBSCRIPTIONS = 50;

export async function createSubscription(userId: string, locationId: string) {
  const locationValid = await validateLocationId(locationId);
  if (!locationValid) {
    throw new Error("Invalid location ID");
  }

  const locationIdNumber = Number.parseInt(locationId, 10);
  const existing = await findSubscriptionByUserAndLocation(userId, locationIdNumber);
  if (existing) {
    throw new Error("You are already subscribed to this court");
  }

  const count = await countSubscriptionsByUserId(userId);
  if (count >= MAX_SUBSCRIPTIONS) {
    throw new Error(`Maximum ${MAX_SUBSCRIPTIONS} subscriptions allowed`);
  }

  return createSubscriptionRecord(userId, locationIdNumber);
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

  const newLocationIdNumbers = newLocationIds.map((id) => Number.parseInt(id, 10));
  const newLocationIdSet = new Set(newLocationIdNumbers);
  const existingLocationIdSet = new Set(existingLocationIds);

  const toDelete = existingSubscriptions.filter((sub) => !newLocationIdSet.has(sub.locationId));
  const toAdd = newLocationIdNumbers.filter((locId) => !existingLocationIdSet.has(locId));

  if (toAdd.length > 0) {
    const currentCount = existingLocationIds.length - toDelete.length;
    if (currentCount + toAdd.length > MAX_SUBSCRIPTIONS) {
      throw new Error(`Maximum ${MAX_SUBSCRIPTIONS} subscriptions allowed`);
    }
  }

  // Validate all location IDs before performing any mutations
  const validationResults = await Promise.all(toAdd.map((locationId) => validateLocationId(locationId.toString())));

  const invalidLocations = toAdd.filter((_, index) => !validationResults[index]);
  if (invalidLocations.length > 0) {
    throw new Error(`Invalid location ID: ${invalidLocations[0]}`);
  }

  // Perform deletions and creations after validation passes
  await Promise.all([
    ...toDelete.map((sub) => deleteSubscriptionRecord(sub.subscriptionId)),
    ...toAdd.map((locationId) => createSubscriptionRecord(userId, locationId))
  ]);

  return {
    added: toAdd.length,
    removed: toDelete.length
  };
}

function mapSubscriptionToDto(
  sub: { subscriptionId: string; locationId: number; dateAdded: Date; location: { name: string; welshName: string | null } },
  locale: string
) {
  return {
    subscriptionId: sub.subscriptionId,
    type: "court" as const,
    courtOrTribunalName: locale === "cy" && sub.location.welshName ? sub.location.welshName : sub.location.name,
    locationId: sub.locationId,
    dateAdded: sub.dateAdded
  };
}

export async function getAllSubscriptionsByUserId(userId: string, locale = "en") {
  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
    orderBy: { dateAdded: "desc" },
    include: {
      location: true
    }
  });

  return subscriptions.map((sub) => mapSubscriptionToDto(sub, locale));
}

export async function getCaseSubscriptionsByUserId(_userId: string, _locale = "en") {
  // Case subscriptions not yet implemented (VIBE-300)
  // When implemented, this will query a case_subscription table
  return [];
}

export async function getCourtSubscriptionsByUserId(userId: string, locale = "en") {
  return getAllSubscriptionsByUserId(userId, locale);
}

export async function validateSubscriptionOwnership(subscriptionIds: string[], userId: string): Promise<boolean> {
  if (subscriptionIds.length === 0) {
    return false;
  }

  const subscriptions = await prisma.subscription.findMany({
    where: {
      subscriptionId: { in: subscriptionIds }
    },
    select: {
      subscriptionId: true,
      userId: true
    }
  });

  if (subscriptions.length !== subscriptionIds.length) {
    return false;
  }

  return subscriptions.every((sub) => sub.userId === userId);
}

export async function getSubscriptionDetailsForConfirmation(subscriptionIds: string[], locale = "en") {
  if (subscriptionIds.length === 0) {
    return [];
  }

  const subscriptions = await prisma.subscription.findMany({
    where: {
      subscriptionId: { in: subscriptionIds }
    },
    orderBy: { dateAdded: "desc" },
    include: {
      location: true
    }
  });

  return subscriptions.map((sub) => mapSubscriptionToDto(sub, locale));
}

export async function deleteSubscriptionsByIds(subscriptionIds: string[], userId: string) {
  if (subscriptionIds.length === 0) {
    throw new Error("No subscriptions provided for deletion");
  }

  const isValid = await validateSubscriptionOwnership(subscriptionIds, userId);
  if (!isValid) {
    throw new Error("Unauthorized: User does not own all selected subscriptions");
  }

  return prisma.$transaction(async (tx) => {
    const deleteResult = await tx.subscription.deleteMany({
      where: {
        subscriptionId: { in: subscriptionIds },
        userId
      }
    });

    console.log(`Bulk unsubscribe: User ${userId} deleted ${deleteResult.count} subscriptions`);

    return deleteResult.count;
  });
}
