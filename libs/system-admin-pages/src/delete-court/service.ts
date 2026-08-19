import { findSystemAdminEmails } from "@hmcts/account/repository/query";
import {
  deleteLocation,
  deleteLocationMetadataRecord,
  findLocationMetadataByLocationId,
  getLocationWithDetails,
  hasActiveArtefacts,
  hasActiveSubscriptions,
  type LocationDetails
} from "@hmcts/location";
import { sendSystemAdminNotification } from "@hmcts/notifications";
import { deleteArtefactsByLocationId } from "@hmcts/publication";
import { deleteSubscriptionsByLocationId } from "@hmcts/subscriptions";

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

  const hasArtefacts = await hasActiveArtefacts(locationId);
  if (hasArtefacts) {
    return {
      isValid: false,
      errorCode: VALIDATION_ERROR_CODES.ACTIVE_ARTEFACTS,
      location
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

  return {
    isValid: true,
    location
  };
}

const CHANGE_TYPE_DELETE_LOCATION = "Delete Location";
const CHANGE_TYPE_DELETE_LOCATION_ARTEFACTS = "Delete Location Artefact(s)";
const CHANGE_TYPE_DELETE_LOCATION_SUBSCRIPTIONS = "Delete Location Subscription(s)";

export async function performLocationDeletion(locationId: number, locationName: string, requesterEmail: string): Promise<void> {
  const existingMetadata = await findLocationMetadataByLocationId(locationId);
  if (existingMetadata) {
    await deleteLocationMetadataRecord(locationId);
  }

  await deleteLocation(locationId);

  const adminEmails = await findSystemAdminEmails();
  await sendSystemAdminNotification(adminEmails, {
    requesterEmail,
    changeType: CHANGE_TYPE_DELETE_LOCATION,
    additionalChangeDetail: `Location ${locationName} with Id ${locationId} has been deleted.`
  });
}

export async function performLocationPublicationsDeletion(locationId: number, locationName: string, requesterEmail: string): Promise<void> {
  await deleteArtefactsByLocationId(locationId.toString());

  const adminEmails = await findSystemAdminEmails();
  await sendSystemAdminNotification(adminEmails, {
    requesterEmail,
    changeType: CHANGE_TYPE_DELETE_LOCATION_ARTEFACTS,
    additionalChangeDetail: `Publications for location ${locationName} with Id ${locationId} have been deleted.`
  });
}

export async function performLocationSubscriptionsDeletion(locationId: number, locationName: string, requesterEmail: string): Promise<void> {
  await deleteSubscriptionsByLocationId(locationId);

  const adminEmails = await findSystemAdminEmails();
  await sendSystemAdminNotification(adminEmails, {
    requesterEmail,
    changeType: CHANGE_TYPE_DELETE_LOCATION_SUBSCRIPTIONS,
    additionalChangeDetail: `Subscriptions for location ${locationName} with Id ${locationId} have been deleted.`
  });
}
