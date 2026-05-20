import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";

export const GET = async (_req: Request, res: Response) => {
  console.log("[HEALTH] Starting health check...");
  console.log("[HEALTH] DATABASE_URL type:", typeof process.env.DATABASE_URL);
  console.log("[HEALTH] PGHOST type:", typeof process.env.PGHOST, "value:", process.env.PGHOST);
  console.log("[HEALTH] PGUSER type:", typeof process.env.PGUSER, "value:", process.env.PGUSER);
  console.log("[HEALTH] PGDATABASE type:", typeof process.env.PGDATABASE, "value:", process.env.PGDATABASE);
  console.log("[HEALTH] PGPORT type:", typeof process.env.PGPORT, "value:", process.env.PGPORT);
  console.log("[HEALTH] POSTGRES_DATABASE type:", typeof process.env.POSTGRES_DATABASE, "value:", process.env.POSTGRES_DATABASE);

  try {
    // Check database connection
    console.log("[HEALTH] Calling prisma.$connect()...");
    await prisma.$connect();
    console.log("[HEALTH] Database connected successfully");

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
    console.error("[HEALTH] Health check failed:");
    console.error("[HEALTH] Error type:", error?.constructor?.name);
    console.error("[HEALTH] Error message:", error instanceof Error ? error.message : String(error));
    console.error("[HEALTH] Error stack:", error instanceof Error ? error.stack : "No stack");
    console.error("[HEALTH] Full error:", JSON.stringify(error, null, 2));
    return res.status(503).json({
      status: "unhealthy",
      database: "disconnected",
      migrations: "unknown",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
