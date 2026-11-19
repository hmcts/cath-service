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
  await prisma.$transaction(async (tx) => {
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
    await tx.subscription.deleteMany({ where: { userId: user.userId } });
    await tx.subscriptionListType.deleteMany({ where: { userId: user.userId } });
    await tx.user.delete({ where: { userId: user.userId } });
  });
}

export interface ArchivableUser {
  userId: string;
  userProvenance: string;
  userProvenanceId: string;
  email: string;
  role: string;
  lastSignedInDate: Date | null;
}
