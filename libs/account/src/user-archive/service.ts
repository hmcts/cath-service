import { archiveAndDeleteUserRecord, findUserForArchive } from "./query.js";

const B2C_PROVENANCE = "PI_AAD";
const PRISMA_RECORD_NOT_FOUND = "P2025";

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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export type B2cUserDeleter = (b2cUserId: string) => Promise<void>;
