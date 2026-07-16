import { getLocationById, getLocationsByIds } from "@hmcts/location";
import { findSubscriptionByUserAndLocation } from "../repository/queries.js";

export async function validateLocationId(locationId: string): Promise<boolean> {
  const location = await getLocationById(Number.parseInt(locationId, 10));
  return location !== undefined;
}

export async function validateLocationIds(locationIds: string[]): Promise<boolean[]> {
  const ids = locationIds.map((id) => Number.parseInt(id, 10)).filter((id) => !Number.isNaN(id));
  const locations = await getLocationsByIds(ids);
  const locationIdSet = new Set(locations.map((loc) => loc.locationId));

  return locationIds.map((id) => {
    const numId = Number.parseInt(id, 10);
    return !Number.isNaN(numId) && locationIdSet.has(numId);
  });
}

export async function validateDuplicateSubscription(userId: string, locationId: string): Promise<boolean> {
  const locationIdNumber = Number.parseInt(locationId, 10);
  const existing = await findSubscriptionByUserAndLocation(userId, locationIdNumber);
  return !existing;
}
