import type { Request, Response } from "express";
import { cleanupStaleRuns } from "../../test-data-cleanup.js";

export const DELETE = async (req: Request, res: Response) => {
  const { olderThanMinutes } = req.body;

  if (!Number.isInteger(olderThanMinutes) || olderThanMinutes < 1) {
    return res.status(400).json({ error: "olderThanMinutes must be a positive integer" });
  }

  const olderThan = new Date(Date.now() - olderThanMinutes * 60 * 1000);

  try {
    const results = await cleanupStaleRuns(olderThan);
    const deleted = results.reduce((total, result) => total + result.deleted, 0);
    const hasFailures = results.some((result) => result.failures.length > 0);

    return res.status(hasFailures ? 500 : 200).json({ olderThan: olderThan.toISOString(), deleted, runs: results });
  } catch (error) {
    console.error("Error finding stale E2E runs:", error);
    return res.status(500).json({ error: "Failed to find stale E2E runs" });
  }
};
