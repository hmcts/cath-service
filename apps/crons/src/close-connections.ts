import { prisma } from "@hmcts/postgres-prisma";
import { closeRedisClient } from "@hmcts/redis";

// Open Redis and Prisma connections would otherwise keep the process alive. A close failure is
// logged rather than thrown: by then emails have been sent, and failing the job would trigger a
// Kubernetes retry that re-sends them.
export async function closeConnections() {
  const results = await Promise.allSettled([closeRedisClient(), prisma.$disconnect()]);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[SubscriptionSchedule] Failed to close connection:", {
        error: result.reason instanceof Error ? result.reason.message : String(result.reason)
      });
    }
  }
}
