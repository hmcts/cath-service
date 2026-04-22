import { prisma } from "@hmcts/postgres";
import type { Request, Response } from "express";

export const GET = async (req: Request, res: Response) => {
  try {
    const { publicationId, subscriptionId } = req.query;

    if (!publicationId && !subscriptionId) {
      return res.status(400).json({
        error: "Either publicationId or subscriptionId query parameter is required"
      });
    }

    const where: Record<string, unknown> = {};
    if (publicationId) where.publicationId = publicationId as string;
    if (subscriptionId) where.subscriptionId = subscriptionId as string;

    const notifications = await prisma.notificationAuditLog.findMany({
      where,
      orderBy: { createdAt: "asc" }
    });

    return res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

export const DELETE = async (req: Request, res: Response) => {
  try {
    const { publicationIds, subscriptionIds } = req.body;

    if (!publicationIds && !subscriptionIds) {
      return res.status(400).json({
        error: "Either publicationIds or subscriptionIds array is required"
      });
    }

    const where: Record<string, unknown> = {};

    if (publicationIds && Array.isArray(publicationIds) && publicationIds.length > 0) {
      where.publicationId = { in: publicationIds };
    }

    if (subscriptionIds && Array.isArray(subscriptionIds) && subscriptionIds.length > 0) {
      where.subscriptionId = { in: subscriptionIds };
    }

    const result = await prisma.notificationAuditLog.deleteMany({ where });

    return res.json({ deleted: result.count });
  } catch (error) {
    console.error("Error deleting notifications:", error);
    return res.status(500).json({ error: "Failed to delete notifications" });
  }
};
