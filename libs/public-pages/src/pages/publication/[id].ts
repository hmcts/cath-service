import { getArtefactById } from "@hmcts/publication";
import type { Request, Response } from "express";

export const GET = async (req: Request, res: Response) => {
  const publicationId = req.params.id;

  if (!publicationId) {
    return res.redirect("/400");
  }

  try {
    // Get artefact from database
    const artefact = await getArtefactById(publicationId);

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
