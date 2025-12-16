import { getLocationWithDetails, hasActiveArtefacts, hasActiveSubscriptions, type LocationDetails, softDeleteLocation } from "./queries.js";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  location?: LocationDetails;
}

export async function validateLocationForDeletion(locationId: number): Promise<ValidationResult> {
  const location = await getLocationWithDetails(locationId);

  if (!location) {
    return {
      isValid: false,
      error: "Court or tribunal not found"
    };
  }

  const hasSubscriptions = await hasActiveSubscriptions(locationId);
  if (hasSubscriptions) {
    return {
      isValid: false,
      error: "There are active subscriptions for the given location.",
      location
    };
  }

  const hasArtefacts = await hasActiveArtefacts(locationId);
  if (hasArtefacts) {
    return {
      isValid: false,
      error: "There are active artefacts for the given location.",
      location
    };
  }

  return {
    isValid: true,
    location
  };
}

export async function performLocationDeletion(locationId: number): Promise<void> {
  await softDeleteLocation(locationId);
}
