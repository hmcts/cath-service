import { USER_ROLES } from "@hmcts/account";
import { type Prisma, prisma } from "@hmcts/postgres-prisma";
import { buildFlooredDateFilter, type DateCondition, exactDayCondition, onOrBeforeCondition } from "./date-boundaries.js";
import type { InactivitySettings } from "./settings.js";

const BATCH_SIZE = 100;
const PROVENANCE = {
  PI_AAD: "PI_AAD",
  SSO: "SSO",
  CFT_IDAM: "CFT_IDAM",
  CRIME_IDAM: "CRIME_IDAM"
} as const;

export async function findMediaUsersForVerification(settings: InactivitySettings, runDate: Date, afterUserId?: string): Promise<MediaUser[]> {
  return prisma.user.findMany({
    ...page(mediaWhere(exactDayCondition(settings.mediaVerificationEmailDays, runDate), settings.startDate), afterUserId),
    select: { userId: true, email: true, firstName: true }
  });
}

export async function findIdamUsersForSignInNotification(settings: InactivitySettings, runDate: Date, afterUserId?: string): Promise<IdamUser[]> {
  const where: Prisma.UserWhereInput = {
    OR: [
      idamWhere(PROVENANCE.CFT_IDAM, exactDayCondition(settings.cftSignInNotificationDays, runDate), settings.startDate),
      idamWhere(PROVENANCE.CRIME_IDAM, exactDayCondition(settings.crimeSignInNotificationDays, runDate), settings.startDate)
    ]
  };

  return prisma.user.findMany({
    ...page(where, afterUserId),
    select: { userId: true, email: true, firstName: true, surname: true, userProvenance: true, lastSignedInDate: true }
  });
}

export async function findMediaUsersForDeletion(settings: InactivitySettings, runDate: Date, afterUserId?: string): Promise<MediaUserForDeletion[]> {
  return prisma.user.findMany({
    ...page(mediaWhere(onOrBeforeCondition(settings.mediaDeletionDays, runDate), settings.startDate), afterUserId),
    select: { userId: true, email: true, firstName: true, lastVerifiedDate: true }
  });
}

export async function findAdminUsersForDeletion(settings: InactivitySettings, runDate: Date, afterUserId?: string): Promise<UserId[]> {
  const where: Prisma.UserWhereInput = {
    OR: [
      {
        AND: [
          { userProvenance: PROVENANCE.PI_AAD, role: { not: USER_ROLES.VERIFIED } },
          flooredSignedIn(onOrBeforeCondition(settings.aadAdminDeletionDays, runDate), settings.startDate)
        ]
      },
      {
        AND: [{ userProvenance: PROVENANCE.SSO }, flooredSignedIn(onOrBeforeCondition(settings.ssoAdminDeletionDays, runDate), settings.startDate)]
      }
    ]
  };

  return prisma.user.findMany({ ...page(where, afterUserId), select: { userId: true } });
}

export async function findIdamUsersForDeletion(settings: InactivitySettings, runDate: Date, afterUserId?: string): Promise<UserId[]> {
  const where: Prisma.UserWhereInput = {
    OR: [
      idamWhere(PROVENANCE.CFT_IDAM, onOrBeforeCondition(settings.cftDeletionDays, runDate), settings.startDate),
      idamWhere(PROVENANCE.CRIME_IDAM, onOrBeforeCondition(settings.crimeDeletionDays, runDate), settings.startDate)
    ]
  };

  return prisma.user.findMany({ ...page(where, afterUserId), select: { userId: true } });
}

function page(where: Prisma.UserWhereInput, afterUserId: string | undefined) {
  return {
    where: afterUserId ? { AND: [where, { userId: { gt: afterUserId } }] } : where,
    orderBy: { userId: "asc" as const },
    take: BATCH_SIZE
  };
}

function mediaWhere(condition: DateCondition, startDate: Date): Prisma.UserWhereInput {
  return { AND: [{ userProvenance: PROVENANCE.PI_AAD, role: USER_ROLES.VERIFIED }, buildFlooredDateFilter("lastVerifiedDate", condition, startDate)] };
}

function idamWhere(userProvenance: string, condition: DateCondition, startDate: Date): Prisma.UserWhereInput {
  return { AND: [{ userProvenance }, flooredSignedIn(condition, startDate)] };
}

function flooredSignedIn(condition: DateCondition, startDate: Date): Prisma.UserWhereInput {
  return buildFlooredDateFilter("lastSignedInDate", condition, startDate);
}

export interface UserId {
  userId: string;
}

export interface MediaUser extends UserId {
  email: string;
  firstName: string | null;
}

export interface MediaUserForDeletion extends MediaUser {
  lastVerifiedDate: Date;
}

export interface IdamUser extends MediaUser {
  surname: string | null;
  userProvenance: string;
  lastSignedInDate: Date | null;
}
