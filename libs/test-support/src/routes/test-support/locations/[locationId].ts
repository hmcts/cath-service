import { prisma } from "@hmcts/postgres-prisma";
import { getParamAsNumber } from "@hmcts/web-core";
import type { Request, Response } from "express";

export const DELETE = async (req: Request, res: Response) => {
  try {
    const locationId = getParamAsNumber(req.params, "locationId");

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
