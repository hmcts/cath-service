import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";
import type { CreateSubscriptionInput } from "../../types.js";

export const GET = async (req: Request, res: Response) => {
  try {
    const { userId, searchType, searchValue } = req.query;

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId as string;
    if (searchType) where.searchType = searchType as string;
    if (searchValue) where.searchValue = searchValue as string;

    const subscriptions = await prisma.subscription.findMany({ where });

    return res.json(subscriptions);
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
};

export const POST = async (req: Request, res: Response) => {
  try {
    const input = req.body as CreateSubscriptionInput;

    if (!input.userId || !input.searchType || !input.searchValue) {
      return res.status(400).json({
        error: "userId, searchType, and searchValue are required"
      });
    }

    const subscription = await prisma.subscription.create({
      data: {
        userId: input.userId,
        searchType: input.searchType,
        searchValue: input.searchValue
      }
    });

    return res.status(201).json({
      subscriptionId: subscription.subscriptionId,
      userId: subscription.userId,
      searchType: subscription.searchType,
      searchValue: subscription.searchValue
    });
  } catch (error) {
    console.error("Error creating test subscription:", error);
    return res.status(500).json({ error: "Failed to create test subscription" });
  }
};

export const DELETE = async (req: Request, res: Response) => {
  try {
    const { userId, searchType, searchValues } = req.body;

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (searchType) where.searchType = searchType;
    if (searchValues && Array.isArray(searchValues)) {
      where.searchValue = { in: searchValues };
    }

    const result = await prisma.subscription.deleteMany({ where });

    return res.json({ deleted: result.count });
  } catch (error) {
    console.error("Error deleting subscriptions:", error);
    return res.status(500).json({ error: "Failed to delete subscriptions" });
  }
};
