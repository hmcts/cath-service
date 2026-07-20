import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";

export const GET = async (_req: Request, res: Response) => {
  try {
    await prisma.$connect();

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
