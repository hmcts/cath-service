import type { Request, Response } from "express";
import { cleanupByPrefix } from "../../test-data-cleanup.js";

export const DELETE = async (req: Request, res: Response) => {
  const { prefix } = req.body;

  if (!prefix || typeof prefix !== "string") {
    return res.status(400).json({ error: "prefix is required" });
  }

  if (prefix.length < 5) {
    return res.status(400).json({ error: "prefix must be at least 5 characters to prevent accidental deletion" });
  }

  const result = await cleanupByPrefix(prefix);

  if (result.failures.length > 0) {
    return res.status(500).json({ error: "Failed to cleanup test data", ...result });
  }

  return res.json(result);
};
