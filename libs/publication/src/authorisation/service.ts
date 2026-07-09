import type { UserProfile } from "@hmcts/auth";
import { prisma } from "@hmcts/postgres-prisma";
import type { Artefact } from "../repository/model.js";
import { Sensitivity } from "../sensitivity.js";

export interface ListType {
  id: number;
  provenance: string;
  isNonStrategic: boolean;
}

const METADATA_ONLY_ROLES = ["INTERNAL_ADMIN_CTSC", "INTERNAL_ADMIN_LOCAL"] as const;

export async function resolveListType(listTypeId: number): Promise<ListType | undefined> {
  const dbListType = await prisma.listType.findUnique({ where: { id: listTypeId } });
  return dbListType ? { id: dbListType.id, provenance: dbListType.allowedProvenance, isNonStrategic: dbListType.isNonStrategic } : undefined;
}

function isVerifiedUser(user: UserProfile | undefined): boolean {
  return user?.role === "VERIFIED";
}

export function canAccessPublication(user: UserProfile | undefined, artefact: Artefact, listType: ListType | undefined): boolean {
  const sensitivity = artefact.sensitivity || Sensitivity.CLASSIFIED;

  if (user?.role === "SYSTEM_ADMIN") return true;
  if (sensitivity === Sensitivity.PUBLIC) return true;
  if (!user) return false;
  if (sensitivity === Sensitivity.PRIVATE) return isVerifiedUser(user);

  if (sensitivity === Sensitivity.CLASSIFIED) {
    if (!isVerifiedUser(user)) return false;
    if (!listType) return false;
    return !!user.provenance && listType.provenance.split(",").includes(user.provenance);
  }

  return false;
}

export function canAccessPublicationData(user: UserProfile | undefined, artefact: Artefact, listType: ListType | undefined): boolean {
  const sensitivity = artefact.sensitivity || Sensitivity.CLASSIFIED;
  if (
    user?.role &&
    METADATA_ONLY_ROLES.includes(user.role as (typeof METADATA_ONLY_ROLES)[number]) &&
    (sensitivity === Sensitivity.PRIVATE || sensitivity === Sensitivity.CLASSIFIED)
  ) {
    return false;
  }
  return canAccessPublication(user, artefact, listType);
}

export function canAccessPublicationMetadata(user: UserProfile | undefined, artefact: Artefact, listType?: ListType): boolean {
  const sensitivity = artefact.sensitivity || Sensitivity.CLASSIFIED;
  if (user?.role === "SYSTEM_ADMIN") return true;
  if (user?.role && METADATA_ONLY_ROLES.includes(user.role as (typeof METADATA_ONLY_ROLES)[number])) {
    return sensitivity === Sensitivity.PUBLIC;
  }
  return canAccessPublication(user, artefact, listType);
}

export function filterAccessiblePublications(user: UserProfile | undefined, artefacts: Artefact[], listTypes: ListType[]): Artefact[] {
  return artefacts.filter((artefact) => {
    const listType = listTypes.find((lt) => lt.id === artefact.listTypeId);
    return canAccessPublication(user, artefact, listType);
  });
}

export function filterPublicationsForSummary(user: UserProfile | undefined, artefacts: Artefact[], listTypes: ListType[]): Artefact[] {
  return artefacts.filter((artefact) => {
    const listType = listTypes.find((lt) => lt.id === artefact.listTypeId);
    return canAccessPublicationMetadata(user, artefact, listType);
  });
}
