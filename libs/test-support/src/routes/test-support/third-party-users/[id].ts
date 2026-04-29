import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";

export const GET = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.thirdPartyUser.findUnique({
      where: { id },
      include: { subscriptions: true }
    });

    if (!user) {
      return res.status(404).json({ error: "Third party user not found" });
    }

    return res.json(user);
  } catch (error) {
    console.error("Error fetching third party user:", error);
    return res.status(500).json({ error: "Failed to fetch third party user" });
  }
};

export const DELETE = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.thirdPartyUser.delete({
      where: { id }
    });

    return res.status(204).send();
  } catch (error) {
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2025") {
      return res.status(404).json({ error: "Third party user not found" });
    }
    console.error("Error deleting third party user:", error);
    return res.status(500).json({ error: "Failed to delete third party user" });
  }
};
