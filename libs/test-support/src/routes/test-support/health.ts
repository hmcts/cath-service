import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";

export const GET = async (_req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$connect();

    // Check if migrations are complete by querying a core table
    const migrationsComplete = await (prisma as any).jurisdiction
      .findMany({ take: 1 })
      .then(() => true)
      .catch(() => false);

    if (!migrationsComplete) {
      return res.status(503).json({
        status: "unhealthy",
        database: "connected",
        migrations: "pending",
        error: "Database migrations not yet applied"
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
