import { prisma } from "@hmcts/postgres";
import type { Request, Response } from "express";

export const DELETE = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    await prisma.user.delete({
      where: { userId }
    });

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting test user:", error);
    return res.status(500).json({ error: "Failed to delete test user" });
  }
};
