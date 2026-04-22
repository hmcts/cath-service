import { prisma } from "@hmcts/postgres";
import type { Request, Response } from "express";

export const GET = async (req: Request, res: Response) => {
  try {
    const { artefactId } = req.params;

    const artefact = await prisma.artefact.findUnique({
      where: { artefactId }
    });

    if (!artefact) {
      return res.status(404).json({ error: "Artefact not found" });
    }

    return res.json(artefact);
  } catch (error) {
    console.error("Error fetching artefact:", error);
    return res.status(500).json({ error: "Failed to fetch artefact" });
  }
};

export const DELETE = async (req: Request, res: Response) => {
  try {
    const { artefactId } = req.params;

    await prisma.artefact.delete({
      where: { artefactId }
    });

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting artefact:", error);
    return res.status(500).json({ error: "Failed to delete artefact" });
  }
};
