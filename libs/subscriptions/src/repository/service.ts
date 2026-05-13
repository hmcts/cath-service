import { getLocationsByIds } from "@hmcts/location";
import { validateLocationId, validateLocationIds } from "../validation/validation.js";
import {
  countSubscriptionsByUserId,
  createCaseSubscriptionRecord,
  createSubscriptionRecord,
  deleteSubscriptionRecord,
  deleteSubscriptionsByIds as deleteSubscriptionsByIdsQuery,
  findCaseSubscriptionsByUserId,
  findSubscriptionById,
  findSubscriptionByUserAndLocation,
  findSubscriptionsByIds,
  findSubscriptionsByUserId,
  findSubscriptionsWithLocationByUserId,
  searchByCaseName,
  searchByCaseNumber
} from "./queries.js";

export { searchByCaseName, searchByCaseNumber };

import { pruneStaleListTypesForUser } from "./subscription-list-type-service.js";

const MAX_SUBSCRIPTIONS = 50;

type CourtSubscriptionDto = {
  subscriptionId: string;
  type: "court";
  courtOrTribunalName: string;
  locationId: number;
  dateAdded: Date;
};

type CaseConfirmationDto = {
  subscriptionId: string;
  type: "case";
  caseName: string | null;
  caseNumber: string | null;
  dateAdded: Date;
};

type SubscriptionDto = CourtSubscriptionDto | CaseConfirmationDto;

function mapSubscriptionToDto(
  sub: {
    subscriptionId: string;
    searchValue: string;
    dateAdded: Date;
  },
  location: { name: string; welshName: string; locationId: number },
  locale: string
): CourtSubscriptionDto {
  return {
    subscriptionId: sub.subscriptionId,
    type: "court",
    courtOrTribunalName: locale === "cy" && location.welshName ? location.welshName : location.name,
    locationId: location.locationId,
    dateAdded: sub.dateAdded
  };
}

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

export async function getSubscriptionById(subscriptionId: string, userId: string) {
  return findSubscriptionById(subscriptionId, userId);
}

export async function removeSubscription(subscriptionId: string, userId: string) {
  const subscription = await findSubscriptionById(subscriptionId, userId);

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  const removedLocationId = subscription.searchType === "LOCATION_ID" ? Number.parseInt(subscription.searchValue, 10) : Number.NaN;
  const removedLocationIds = Number.isNaN(removedLocationId) ? [] : [removedLocationId];
  const count = await deleteSubscriptionRecord(subscriptionId, userId);

  if (count === 0) {
    throw new Error("Subscription not found");
  }

  if (removedLocationIds.length > 0) {
    const remainingSubscriptions = await findSubscriptionsByUserId(userId);
    const remainingLocationIds = remainingSubscriptions
      .filter((s) => s.searchType === "LOCATION_ID")
      .map((s) => Number.parseInt(s.searchValue, 10))
      .filter((id) => !Number.isNaN(id));

    await pruneStaleListTypesForUser(userId, removedLocationIds, remainingLocationIds);
  }

  return count;
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
  const existingLocationIds = existingSubscriptions
    .filter((sub) => sub.searchType === "LOCATION_ID")
    .map((sub) => Number.parseInt(sub.searchValue, 10))
    .filter((id) => !Number.isNaN(id));

  const newLocationIdNumbers = newLocationIds.map((id) => Number.parseInt(id, 10));
  const newLocationIdSet = new Set(newLocationIdNumbers);
  const existingLocationIdSet = new Set(existingLocationIds);

  const toDelete = existingSubscriptions.filter((sub) => sub.searchType === "LOCATION_ID" && !newLocationIdSet.has(Number.parseInt(sub.searchValue, 10)));
  const toAdd = newLocationIdNumbers.filter((locId) => !existingLocationIdSet.has(locId));

  if (toAdd.length > 0) {
    const currentCount = existingLocationIds.length - toDelete.length;
    if (currentCount + toAdd.length > MAX_SUBSCRIPTIONS) {
      throw new Error(`Maximum ${MAX_SUBSCRIPTIONS} subscriptions allowed`);
    }
  }

  // Validate all location IDs before performing any mutations
  const validationResults = await validateLocationIds(toAdd.map((locationId) => locationId.toString()));

  const invalidLocations = toAdd.filter((_, index) => !validationResults[index]);
  if (invalidLocations.length > 0) {
    throw new Error(`Invalid location ID: ${invalidLocations[0]}`);
  }

  // Perform deletions and creations after validation passes
  await Promise.all([
    ...toDelete.map((sub) => deleteSubscriptionRecord(sub.subscriptionId, userId)),
    ...toAdd.map((locationId) => createSubscriptionRecord(userId, locationId))
  ]);

  return {
    added: toAdd.length,
    removed: toDelete.length
  };
}

async function mapSubscriptionsToDto(
  subscriptions: Array<{
    subscriptionId: string;
    searchValue: string;
    dateAdded: Date;
  }>,
  locale: string
): Promise<SubscriptionDto[]> {
  const locationIds = subscriptions.map((sub) => Number.parseInt(sub.searchValue, 10)).filter((id) => !Number.isNaN(id));
  const locations = await getLocationsByIds(locationIds);

  const locationMap = new Map(locations.map((loc) => [loc.locationId, loc]));

  return subscriptions
    .map((sub) => {
      const locationId = Number.parseInt(sub.searchValue, 10);
      const location = locationMap.get(locationId);
      if (!location) {
        return null;
      }
      return mapSubscriptionToDto(sub, location, locale);
    })
    .filter((dto): dto is SubscriptionDto => dto !== null);
}

export async function getAllSubscriptionsByUserId(userId: string, locale = "en") {
  const subscriptions = await findSubscriptionsWithLocationByUserId(userId);
  return mapSubscriptionsToDto(subscriptions, locale);
}

interface CaseSubscriptionDto {
  subscriptionId: string;
  caseName: string | null;
  caseNumber: string | null;
  dateAdded: Date;
}

export async function getCaseSubscriptionsByUserId(userId: string, _locale = "en"): Promise<CaseSubscriptionDto[]> {
  const subscriptions = await findCaseSubscriptionsByUserId(userId);
  return subscriptions.map((sub) => ({
    subscriptionId: sub.subscriptionId,
    caseName: sub.caseName,
    caseNumber: sub.caseNumber,
    dateAdded: sub.dateAdded
  }));
}

export async function createCaseSubscription(
  userId: string,
  searchType: "CASE_NAME" | "CASE_NUMBER",
  searchValue: string,
  caseName: string,
  caseNumber: string | null
): Promise<void> {
  await createCaseSubscriptionRecord(userId, searchType, searchValue, caseName, caseNumber);
}

export async function getCourtSubscriptionsByUserId(userId: string, locale = "en") {
  return getAllSubscriptionsByUserId(userId, locale);
}

export async function getSubscriptionDetailsForConfirmation(subscriptionIds: string[], userId: string, locale = "en") {
  if (subscriptionIds.length === 0) {
    return [];
  }

  const subscriptions = await findSubscriptionsWithLocationByIds(subscriptionIds, userId);
  return mapSubscriptionsToDto(subscriptions, locale);
}

export async function deleteSubscriptionsByIds(subscriptionIds: string[], userId: string) {
  if (subscriptionIds.length === 0) {
    throw new Error("No subscriptions provided for deletion");
  }

  const toDelete = await findSubscriptionsByIds(subscriptionIds, userId);

  if (toDelete.length !== subscriptionIds.length) {
    throw new Error("Unauthorized: User does not own all selected subscriptions");
  }

  const removedLocationIds = toDelete
    .filter((s) => s.searchType === "LOCATION_ID")
    .map((s) => Number.parseInt(s.searchValue, 10))
    .filter((id) => !Number.isNaN(id));

  const count = await deleteSubscriptionsByIdsQuery(subscriptionIds, userId);

  const remainingSubscriptions = await findSubscriptionsByUserId(userId);
  const remainingLocationIds = remainingSubscriptions
    .filter((s) => s.searchType === "LOCATION_ID")
    .map((s) => Number.parseInt(s.searchValue, 10))
    .filter((id) => !Number.isNaN(id));

  await pruneStaleListTypesForUser(userId, removedLocationIds, remainingLocationIds);

  return count;
}
