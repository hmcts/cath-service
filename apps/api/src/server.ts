import { createApp } from "./app.js";

const PORT = process.env.API_PORT || 3001;

async function startServer() {
  console.log("[SERVER] Starting server...");
  console.log("[SERVER] Environment:", {
    NODE_ENV: process.env.NODE_ENV,
    PORT,
    DATABASE_URL: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 30)}...` : "not set",
    ENABLE_TEST_SUPPORT: process.env.ENABLE_TEST_SUPPORT
  });

  // Log ALL environment variables that contain "PG" or "POSTGRES"
  console.log("[SERVER] All PG/POSTGRES env vars:");
  Object.keys(process.env)
    .filter((k) => k.includes("PG") || k.includes("POSTGRES"))
    .forEach((key) => {
      const val = process.env[key];
      console.log(`[SERVER]   ${key}:`, typeof val, typeof val === "object" ? JSON.stringify(val) : val?.substring(0, 50) || "undefined");
    });

  try {
    console.log("[SERVER] Creating app...");
    const app = await createApp();
    console.log("[SERVER] App created, starting HTTP server...");

    const server = app.listen(PORT, () => {
      console.log(`🚀 API server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📊 Readiness check: http://localhost:${PORT}/health/readiness`);
      console.log(`📊 Liveness check: http://localhost:${PORT}/health/liveness`);
    });

    server.on("error", (error) => {
      console.error("[SERVER] Server error:", error);
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error("[SERVER] Failed to start server:");
    console.error("[SERVER] Error type:", error?.constructor?.name);
    console.error("[SERVER] Error message:", error instanceof Error ? error.message : String(error));
    console.error("[SERVER] Error stack:", error instanceof Error ? error.stack : "No stack trace");
    process.exit(1);
  }
}

const server = await startServer();

process.on("uncaughtException", (error) => {
  console.error("[SERVER] Uncaught exception:");
  console.error("[SERVER] Error type:", error?.constructor?.name);
  console.error("[SERVER] Error message:", error.message);
  console.error("[SERVER] Error stack:", error.stack);
  console.error("[SERVER] Error details:", JSON.stringify(error, null, 2));
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[SERVER] Unhandled rejection at:", promise);
  console.error("[SERVER] Reason:", reason);
  if (reason instanceof Error) {
    console.error("[SERVER] Stack:", reason.stack);
  }
  process.exit(1);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});
