import { prisma } from "@hmcts/postgres";
import type { Request, Response } from "express";

const CIVIL_AND_FAMILY_LIST_TYPE_ID = 8;

export const GET = async (req: Request, res: Response) => {
  const publicationId = req.params.id;

  if (!publicationId) {
    return res.redirect("/400");
  }

  try {
    // Get artefact from database
    const artefact = await prisma.artefact.findUnique({
      where: { artefactId: publicationId }
    });

    if (!artefact) {
      return res.redirect("/404");
    }

    // Route to appropriate view based on list type
    if (artefact.listTypeId === CIVIL_AND_FAMILY_LIST_TYPE_ID) {
      return res.redirect(`/civil-and-family-daily-cause-list?artefactId=${artefact.artefactId}`);
    }

    // For other list types, show a generic message (or implement specific views later)
    return res.status(501).render("publication-not-implemented", {
      message: "This publication type is not yet available for viewing."
    });
  } catch (error) {
    console.error("Error loading publication:", error);
    return res.redirect("/500");
  }
};
