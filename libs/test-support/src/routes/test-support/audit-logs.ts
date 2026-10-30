import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";

export const GET = async (req: Request, res: Response) => {
  try {
    const { action, details } = req.query;

    const entries = await prisma.auditLog.findMany({
      where: {
        ...(typeof action === "string" && action ? { action } : {}),
        ...(typeof details === "string" && details ? { details } : {})
      },
      orderBy: { timestamp: "asc" }
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

    if (!userId || !action) {
      return res.status(400).json({ error: "userId and action are required" });
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
