import { type InactiveAccountsSummary, processInactiveAccounts } from "@hmcts/inactive-accounts";
import { prisma } from "@hmcts/postgres-prisma";
import { closeRedisClient } from "@hmcts/redis";

export default async function inactiveVerification(): Promise<void> {
  try {
    const summary = await processInactiveAccounts();
    logSummary(summary);

    const failureCount = Object.values(summary).reduce((total, step) => total + step.failed, 0);
    if (failureCount > 0) {
      throw new Error(`Inactive accounts run finished with ${failureCount} failure(s)`);
    }
  } finally {
    await Promise.allSettled([prisma.$disconnect(), closeRedisClient()]);
  }
}

function logSummary(summary: InactiveAccountsSummary): void {
  for (const [step, { succeeded, skipped, failed }] of Object.entries(summary)) {
    console.log(`Inactive accounts ${step}: succeeded=${succeeded} skipped=${skipped} failed=${failed}`);
  }
}
