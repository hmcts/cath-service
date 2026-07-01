import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";

export const GET = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.thirdPartyUser.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { subscriptions: true } }
      }
    });

    return res.json(users);
  } catch (error) {
    console.error("Error fetching third party users:", error);
    return res.status(500).json({ error: "Failed to fetch third party users" });
  }
};

export const POST = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "name is required" });
    }

    const user = await prisma.thirdPartyUser.create({
      data: { name }
    });

    return res.status(201).json({
      id: user.id,
      name: user.name,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error("Error creating third party user:", error);
    return res.status(500).json({ error: "Failed to create third party user" });
  }
};

export const DELETE = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array is required" });
    }

    const result = await prisma.thirdPartyUser.deleteMany({
      where: { id: { in: ids } }
    });

    return res.json({ deleted: result.count });
  } catch (error) {
    console.error("Error deleting third party users:", error);
    return res.status(500).json({ error: "Failed to delete third party users" });
  }
};
