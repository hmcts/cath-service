import { prisma } from "@hmcts/postgres-prisma";

export async function findUserForArchive(userId: string): Promise<ArchivableUser | null> {
  return prisma.user.findUnique({
    where: { userId },
    select: {
      userId: true,
      userProvenance: true,
      userProvenanceId: true,
      email: true,
      role: true,
      lastSignedInDate: true
    }
  });
}

export async function archiveAndDeleteUserRecord(user: ArchivableUser): Promise<void> {
  // Delete the user before writing the archive row: when two deletes of the same user race, the
  // second blocks on the user row lock and then fails with P2025 (already deleted), instead of
  // hitting a P2002 duplicate key on user_archive. Any failure still rolls back the whole transaction.
  await prisma.$transaction(async (tx) => {
    await tx.subscription.deleteMany({ where: { userId: user.userId } });
    await tx.subscriptionListType.deleteMany({ where: { userId: user.userId } });
    await tx.user.delete({ where: { userId: user.userId } });
    await tx.userArchive.create({
      data: {
        userId: user.userId,
        userProvenance: user.userProvenance,
        provenanceUserId: user.userProvenanceId,
        email: user.email,
        roles: user.role,
        lastSignedInDate: user.lastSignedInDate
      }
    });
  });
}

export async function deleteUserArchivesArchivedOnOrBefore(cutoff: Date): Promise<number> {
  const { count } = await prisma.userArchive.deleteMany({ where: { archivedDate: { lte: cutoff } } });
  return count;
}

export interface ArchivableUser {
  userId: string;
  userProvenance: string;
  userProvenanceId: string;
  email: string;
  role: string;
  lastSignedInDate: Date | null;
}
