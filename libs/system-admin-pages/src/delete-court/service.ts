import { getLocationWithDetails, hasActiveArtefacts, hasActiveSubscriptions, type LocationDetails, softDeleteLocation } from "@hmcts/location";

export const VALIDATION_ERROR_CODES = {
  LOCATION_NOT_FOUND: "LOCATION_NOT_FOUND",
  ACTIVE_SUBSCRIPTIONS: "ACTIVE_SUBSCRIPTIONS",
  ACTIVE_ARTEFACTS: "ACTIVE_ARTEFACTS"
} as const;

export type ValidationErrorCode = (typeof VALIDATION_ERROR_CODES)[keyof typeof VALIDATION_ERROR_CODES];

export interface ValidationResult {
  isValid: boolean;
  errorCode?: ValidationErrorCode;
  location?: LocationDetails;
}

export async function validateLocationForDeletion(locationId: number): Promise<ValidationResult> {
  const location = await getLocationWithDetails(locationId);

  if (!location) {
    return {
      isValid: false,
      errorCode: VALIDATION_ERROR_CODES.LOCATION_NOT_FOUND
    };
  }

  const hasSubscriptions = await hasActiveSubscriptions(locationId);
  if (hasSubscriptions) {
    return {
      isValid: false,
      errorCode: VALIDATION_ERROR_CODES.ACTIVE_SUBSCRIPTIONS,
      location
    };
  }

  const hasArtefacts = await hasActiveArtefacts(locationId);
  if (hasArtefacts) {
    return {
      isValid: false,
      errorCode: VALIDATION_ERROR_CODES.ACTIVE_ARTEFACTS,
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
