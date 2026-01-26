import type { UserProfile } from "@hmcts/auth";
import type { Artefact } from "../repository/model.js";
import { Sensitivity } from "../sensitivity.js";

export interface ListType {
  id: number;
  provenance: string;
  isNonStrategic: boolean;
}

const METADATA_ONLY_ROLES = ["INTERNAL_ADMIN_CTSC", "INTERNAL_ADMIN_LOCAL"] as const;
const VERIFIED_USER_PROVENANCES = ["B2C_IDAM", "CFT_IDAM", "CRIME_IDAM"] as const;

/**
 * Checks if a user has a verified provenance
 * @param user - User profile (may be undefined for unauthenticated users)
 * @returns true if user has a verified provenance, false otherwise
 */
function isVerifiedUser(user: UserProfile | undefined): boolean {
  return !!user?.provenance && VERIFIED_USER_PROVENANCES.includes(user.provenance as (typeof VERIFIED_USER_PROVENANCES)[number]);
}

/**
 * Determines if a user can access a publication based on sensitivity level and user role/provenance
 * @param user - User profile (may be undefined for unauthenticated users)
 * @param artefact - Publication artefact
 * @param listType - List type containing provenance information
 * @returns true if user can access the publication, false otherwise
 */
export function canAccessPublication(user: UserProfile | undefined, artefact: Artefact, listType: ListType | undefined): boolean {
  const sensitivity = artefact.sensitivity || Sensitivity.CLASSIFIED;

  // SYSTEM_ADMIN has full access to everything
  if (user?.role === "SYSTEM_ADMIN") {
    return true;
  }

  // PUBLIC publications are accessible to everyone
  if (sensitivity === Sensitivity.PUBLIC) {
    return true;
  }

  // PRIVATE and CLASSIFIED require authentication
  if (!user) {
    return false;
  }

  // PRIVATE publications require verified user
  if (sensitivity === Sensitivity.PRIVATE) {
    return isVerifiedUser(user);
  }

  // CLASSIFIED publications require provenance matching
  if (sensitivity === Sensitivity.CLASSIFIED) {
    if (!isVerifiedUser(user)) return false;
    if (!listType) return false; // Fail closed if list type not found
    return user!.provenance === listType.provenance;
  }

  // Default: deny access
  return false;
}

/**
 * Determines if a user can access the actual publication data (not just metadata)
 * Local and CTSC admins can only view metadata, not the actual list data
 * @param user - User profile (may be undefined for unauthenticated users)
 * @param artefact - Publication artefact
 * @param listType - List type containing provenance information
 * @returns true if user can access the actual publication data, false otherwise
 */
export function canAccessPublicationData(user: UserProfile | undefined, artefact: Artefact, listType: ListType | undefined): boolean {
  const sensitivity = artefact.sensitivity || Sensitivity.CLASSIFIED;

  // Local and CTSC admins cannot view actual data for PRIVATE/CLASSIFIED
  if (
    user?.role &&
    METADATA_ONLY_ROLES.includes(user.role as (typeof METADATA_ONLY_ROLES)[number]) &&
    (sensitivity === Sensitivity.PRIVATE || sensitivity === Sensitivity.CLASSIFIED)
  ) {
    return false;
  }

  // For everyone else, use the standard access check
  return canAccessPublication(user, artefact, listType);
}

/**
 * Determines if a user can access publication metadata
 * System admins can view all metadata
 * CTSC/Local admins can only view PUBLIC metadata
 * Other users follow standard publication access rules
 * @param user - User profile (may be undefined for unauthenticated users)
 * @param artefact - Publication artefact
 * @param listType - List type containing provenance information
 * @returns true if user can access metadata, false otherwise
 */
export function canAccessPublicationMetadata(user: UserProfile | undefined, artefact: Artefact, listType?: ListType): boolean {
  const sensitivity = artefact.sensitivity || Sensitivity.CLASSIFIED;

  // System admins can view all metadata
  if (user?.role === "SYSTEM_ADMIN") {
    return true;
  }

  // Local and CTSC admins can only view PUBLIC metadata
  if (user?.role && METADATA_ONLY_ROLES.includes(user.role as (typeof METADATA_ONLY_ROLES)[number])) {
    return sensitivity === Sensitivity.PUBLIC;
  }

  // For all other users, use the standard access check
  return canAccessPublication(user, artefact, listType);
}

/**
 * Filters a list of publications to only those accessible by the user
 * @param user - User profile (may be undefined for unauthenticated users)
 * @param artefacts - List of publication artefacts
 * @param listTypes - List of all list types
 * @returns Filtered list of accessible publications
 */
export function filterAccessiblePublications(user: UserProfile | undefined, artefacts: Artefact[], listTypes: ListType[]): Artefact[] {
  return artefacts.filter((artefact) => {
    const listType = listTypes.find((lt) => lt.id === artefact.listTypeId);
    return canAccessPublication(user, artefact, listType);
  });
}

/**
 * Filters a list of publications to show in summaries (metadata-level access)
 * System admins see all publications
 * CTSC/Local admins see only PUBLIC publications
 * Other users see publications based on their provenance and verification status
 * @param user - User profile (may be undefined for unauthenticated users)
 * @param artefacts - List of publication artefacts
 * @param listTypes - List of all list types
 * @returns Filtered list of publications for which user can view metadata
 */
export function filterPublicationsForSummary(user: UserProfile | undefined, artefacts: Artefact[], listTypes: ListType[]): Artefact[] {
  return artefacts.filter((artefact) => {
    const listType = listTypes.find((lt) => lt.id === artefact.listTypeId);
    return canAccessPublicationMetadata(user, artefact, listType);
  });
}
