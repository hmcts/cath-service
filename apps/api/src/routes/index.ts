import type { Request, Response } from "express";

export const GET = async (_req: Request, res: Response) => {
  res.json({
    message: "Welcome to HMCTS API",
    version: "1.0.0",
    // The commit the image was built from (Dockerfile), so the PROD smoke test can tell
    // when Flux has rolled out a promoted release (#1099).
    gitCommit: process.env.GIT_COMMIT || "unknown",
    endpoints: {
      health: "/health",
      liveness: "/health/liveness",
      readiness: "/health/readiness"
    }
  });
};
