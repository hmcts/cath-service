import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";

export const GET = async (_req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$connect();

    // Check _prisma_migrations for any in-progress migrations (started but not finished/rolled_back).
    // This is reliable regardless of which tables exist, and correctly returns "pending" while
    // the postgres pod is still running DDL migrations in the background (health-first startup).
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count FROM _prisma_migrations
      WHERE finished_at IS NULL AND rolled_back_at IS NULL
    `;
    const pending = Number(rows[0].count);

    if (pending > 0) {
      return res.status(503).json({
        status: "unhealthy",
        database: "connected",
        migrations: "pending",
        error: `${pending} migration(s) still in progress`
      });
    }

    return res.json({
      status: "healthy",
      database: "connected",
      migrations: "complete"
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return res.status(503).json({
      status: "unhealthy",
      database: "disconnected",
      migrations: "unknown",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
