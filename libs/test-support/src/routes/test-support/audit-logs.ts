import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";
import { isUuid } from "../../uuid.js";

// The audit log of a shared environment keeps growing, so a search must say what it is looking for,
// and returns at most this many entries
const MAX_ENTRIES = 100;

export const GET = async (req: Request, res: Response) => {
  try {
    const filter = (value: unknown) => (typeof value === "string" && value ? value : undefined);
    const action = filter(req.query.action);
    const details = filter(req.query.details);
    const userId = filter(req.query.userId);

    if (!action && !details && !userId) {
      return res.status(400).json({ error: "action, details or userId is required" });
    }

    if (userId && !isUuid(userId)) {
      return res.status(400).json({ error: "userId must be a UUID" });
    }

    const entries = await prisma.auditLog.findMany({
      where: { ...(action ? { action } : {}), ...(details ? { details } : {}), ...(userId ? { userId } : {}) },
      orderBy: { timestamp: "asc" },
      take: MAX_ENTRIES
    });

    return res.json(entries);
  } catch (error) {
    console.error("Error fetching audit log entries:", error);
    return res.status(500).json({ error: "Failed to fetch audit log entries" });
  }
};

// Records an entry as the given user did it; the user's email, role and provenance come from their account
export const POST = async (req: Request, res: Response) => {
  try {
    const { userId, action, details } = req.body;

    if (!userId || typeof action !== "string" || !action) {
      return res.status(400).json({ error: "userId and action are required" });
    }

    if (details !== undefined && details !== null && typeof details !== "string") {
      return res.status(400).json({ error: "details must be a string" });
    }

    if (!isUuid(userId)) {
      return res.status(400).json({ error: "userId must be a UUID" });
    }

    const user = await prisma.user.findUnique({ where: { userId }, select: { email: true, role: true, userProvenance: true } });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const entry = await prisma.auditLog.create({
      data: { action, details: details ?? null, userId, userEmail: user.email, userRole: user.role, userProvenance: user.userProvenance }
    });

    return res.status(201).json(entry);
  } catch (error) {
    console.error("Error creating audit log entry:", error);
    return res.status(500).json({ error: "Failed to create audit log entry" });
  }
};
