import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";

export const DELETE = async (req: Request, res: Response) => {
  try {
    const locationId = Number.parseInt(req.params.locationId, 10);

    if (Number.isNaN(locationId)) {
      return res.status(400).json({ error: "Invalid locationId" });
    }

    await prisma.location.delete({
      where: { locationId }
    });

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting test location:", error);
    return res.status(500).json({ error: "Failed to delete test location" });
  }
};
