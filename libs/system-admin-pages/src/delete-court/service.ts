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
import { sendSubscriptionDeletedNotification, sendSystemAdminNotification } from "@hmcts/notifications";
import { deleteArtefactsByLocationId, getArtefactsByLocation } from "@hmcts/publication";
import { deleteSubscriptionsByLocationId, findSubscribersByLocationId } from "@hmcts/subscriptions";
import { sendPublicationDeletionToThirdParties } from "@hmcts/third-party-subscription-fulfilment";

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
  const artefacts = await getArtefactsByLocation(locationId.toString());

  await deleteArtefactsByLocationId(locationId.toString());

  // Legacy findActiveArtefactsForLocation only notifies third parties about publications still on display;
  // a null displayTo is displayed indefinitely in CaTH, so it counts as live
  const now = new Date();
  const liveArtefacts = artefacts.filter((artefact) => !artefact.displayTo || artefact.displayTo >= now);

  for (const artefact of liveArtefacts) {
    sendPublicationDeletionToThirdParties({
      artefactId: artefact.artefactId,
      listTypeId: artefact.listTypeId,
      sensitivity: artefact.sensitivity
    }).catch((error) => {
      console.error("Third-party OAuth deletion failed:", { artefactId: artefact.artefactId, error: error instanceof Error ? error.message : String(error) });
    });
  }

  const adminEmails = await findSystemAdminEmails();
  await sendSystemAdminNotification(adminEmails, {
    requesterEmail,
    changeType: CHANGE_TYPE_DELETE_LOCATION_ARTEFACTS,
    additionalChangeDetail: `Publications for location ${locationName} with Id ${locationId} have been deleted.`
  });
}

export async function performLocationSubscriptionsDeletion(locationId: number, locationName: string, requesterEmail: string): Promise<void> {
  const subscribers = await findSubscribersByLocationId(locationId);

  await deleteSubscriptionsByLocationId(locationId);

  await sendSubscriptionDeletedNotification(
    subscribers.map((subscriber) => subscriber.user),
    locationName
  );

  const adminEmails = await findSystemAdminEmails();
  await sendSystemAdminNotification(adminEmails, {
    requesterEmail,
    changeType: CHANGE_TYPE_DELETE_LOCATION_SUBSCRIPTIONS,
    additionalChangeDetail: `Subscriptions for location ${locationName} with Id ${locationId} have been deleted.`
  });
}
