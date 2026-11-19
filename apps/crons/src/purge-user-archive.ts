import { purgeExpiredUserArchives } from "@hmcts/account/user-archive";
import { prisma } from "@hmcts/postgres-prisma";

export default async function purgeUserArchive(): Promise<void> {
  try {
    const { deletedCount, cutoff } = await purgeExpiredUserArchives();
    console.log(`Purged ${deletedCount} user_archive row(s) archived on or before ${cutoff.toISOString()}`);
  } finally {
    await prisma.$disconnect();
  }
}
