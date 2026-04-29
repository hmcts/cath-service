import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";

export const GET = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const application = await prisma.mediaApplication.findUnique({
      where: { id }
    });

    if (!application) {
      return res.status(404).json({ error: "Media application not found" });
    }

    return res.json(application);
  } catch (error) {
    console.error("Error fetching media application:", error);
    return res.status(500).json({ error: "Failed to fetch media application" });
  }
};

export const DELETE = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.mediaApplication.delete({
      where: { id }
    });

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting media application:", error);
    return res.status(500).json({ error: "Failed to delete media application" });
  }
};
