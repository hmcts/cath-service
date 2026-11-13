import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";
import { isUuid } from "../../uuid.js";

export const GET = async (req: Request, res: Response) => {
  try {
    const { name } = req.query;

    const users = await prisma.legacyThirdPartyUser.findMany({
      where: typeof name === "string" && name ? { name } : {},
      orderBy: { createdDate: "asc" }
    });

    return res.json(users);
  } catch (error) {
    console.error("Error fetching legacy third party users:", error);
    return res.status(500).json({ error: "Failed to fetch legacy third party users" });
  }
};

export const POST = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "name is required" });
    }

    const user = await prisma.legacyThirdPartyUser.create({ data: { name } });

    return res.status(201).json(user);
  } catch (error) {
    console.error("Error creating legacy third party user:", error);
    return res.status(500).json({ error: "Failed to create legacy third party user" });
  }
};

export const DELETE = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array is required" });
    }

    if (!ids.every(isUuid)) {
      return res.status(400).json({ error: "ids must be UUIDs" });
    }

    const result = await prisma.legacyThirdPartyUser.deleteMany({ where: { id: { in: ids } } });

    return res.json({ deleted: result.count });
  } catch (error) {
    console.error("Error deleting legacy third party users:", error);
    return res.status(500).json({ error: "Failed to delete legacy third party users" });
  }
};
