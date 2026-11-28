import { archiveAndDeleteUserRecord, deleteUserArchivesArchivedOnOrBefore, findUserForArchive } from "./query.js";

const B2C_PROVENANCE = "PI_AAD";
const PRISMA_RECORD_NOT_FOUND = "P2025";
const RETENTION_MONTHS = 3;

export async function archiveAndDeleteUser(userId: string, deleteB2cUser: B2cUserDeleter): Promise<boolean> {
  const user = await findUserForArchive(userId);
  if (!user) {
    return false;
  }

  if (user.userProvenance === B2C_PROVENANCE) {
    try {
      await deleteB2cUser(user.userProvenanceId);
    } catch (error) {
      console.error("Failed to delete B2C account, continuing with archive and delete", { userId, message: errorMessage(error) });
    }
  }

  try {
    await archiveAndDeleteUserRecord(user);
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === PRISMA_RECORD_NOT_FOUND) {
      return false;
    }
    throw error;
  }
}

export async function purgeExpiredUserArchives(): Promise<PurgeResult> {
  const cutoff = subtractUtcMonthsClamped(new Date(), RETENTION_MONTHS);
  const deletedCount = await deleteUserArchivesArchivedOnOrBefore(cutoff);
  return { deletedCount, cutoff };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function subtractUtcMonthsClamped(date: Date, months: number): Date {
  const firstOfTargetMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - months, 1));
  const targetYear = firstOfTargetMonth.getUTCFullYear();
  const targetMonth = firstOfTargetMonth.getUTCMonth();
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      Math.min(date.getUTCDate(), lastDayOfTargetMonth),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
}

export type B2cUserDeleter = (b2cUserId: string) => Promise<void>;

interface PurgeResult {
  deletedCount: number;
  cutoff: Date;
}
