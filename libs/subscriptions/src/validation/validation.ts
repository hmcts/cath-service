import { getLocationById } from "@hmcts/location";
import { findSubscriptionByUserAndLocation } from "../repository/queries.js";

export async function validateLocationId(locationId: string): Promise<boolean> {
  const location = await getLocationById(Number.parseInt(locationId, 10));
  return location !== undefined;
}

export async function validateDuplicateSubscription(userId: string, locationId: string): Promise<boolean> {
  const locationIdNumber = Number.parseInt(locationId, 10);
  const existing = await findSubscriptionByUserAndLocation(userId, locationIdNumber);
  return !existing;
}
