import { getLocationById } from "@hmcts/location";
import { findSubscriptionByUserAndLocation } from "./repository/queries.js";

export async function validateLocationId(locationId: string): Promise<boolean> {
  const location = getLocationById(Number.parseInt(locationId, 10));
  return location !== undefined;
}

export async function validateDuplicateSubscription(userId: string, locationId: string): Promise<boolean> {
  const existing = await findSubscriptionByUserAndLocation(userId, locationId);
  return !existing;
}
