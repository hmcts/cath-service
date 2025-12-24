import { prisma } from "@hmcts/postgres";
import { requirePublicationAccess } from "@hmcts/publication";
import type { Request, RequestHandler, Response } from "express";

const handler: RequestHandler = async (req: Request, res: Response) => {
  const publicationId = req.params.id;

  if (!publicationId) {
    return res.redirect("/400");
  }

  try {
    // Get artefact from database (authorisation already checked by middleware)
    const artefact = await prisma.artefact.findUnique({
      where: { artefactId: publicationId }
    });

    if (!artefact) {
      return res.redirect("/404");
    }

    // This handler is now only used for list types without a dedicated page
    // List types with implemented pages should have urlPath defined and will be accessed directly
    return res.status(501).render("publication-not-implemented", {
      message: "This publication type is not yet available for viewing."
    });
  } catch (error) {
    console.error("Error loading publication:", error);
    return res.redirect("/500");
  }
};

// Apply authorisation middleware before the handler
export const GET = [requirePublicationAccess(), handler];
