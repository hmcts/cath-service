import { requireRole, USER_ROLES } from "@hmcts/auth";
import { deleteLocationMetadata } from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";
import { validateRadioSelection } from "../../delete-court/validation.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

interface LocationMetadataSession {
  locationMetadata?: {
    locationId: number;
    locationName: string;
    locationWelshName: string;
    operation?: "created" | "updated" | "deleted";
  };
}

export const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const session = req.session as LocationMetadataSession;

  if (!session.locationMetadata) {
    return res.redirect(`/location-metadata-search${language === "cy" ? "?lng=cy" : ""}`);
  }

  const { locationName, locationWelshName } = session.locationMetadata;

  res.render("location-metadata-delete-confirmation/index", {
    ...content,
    locationName: language === "cy" ? locationWelshName : locationName,
    errors: undefined
  });
};

export const postHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const session = req.session as LocationMetadataSession;

  if (!session.locationMetadata) {
    return res.redirect(`/location-metadata-search${language === "cy" ? "?lng=cy" : ""}`);
  }

  const confirmDelete = req.body.confirmDelete as string | undefined;
  const validationError = validateRadioSelection(confirmDelete);

  if (validationError) {
    const { locationName, locationWelshName } = session.locationMetadata;
    return res.render("location-metadata-delete-confirmation/index", {
      ...content,
      locationName: language === "cy" ? locationWelshName : locationName,
      errors: [{ ...validationError, text: content.noRadioSelected }]
    });
  }

  if (confirmDelete === "no") {
    return res.redirect(`/location-metadata-manage${language === "cy" ? "?lng=cy" : ""}`);
  }

  try {
    await deleteLocationMetadata(session.locationMetadata.locationId);
    session.locationMetadata.operation = "deleted";
    res.redirect(`/location-metadata-success${language === "cy" ? "?lng=cy" : ""}`);
  } catch (error) {
    const { locationName, locationWelshName } = session.locationMetadata;
    return res.render("location-metadata-delete-confirmation/index", {
      ...content,
      locationName: language === "cy" ? locationWelshName : locationName,
      errors: [{ text: (error as Error).message }]
    });
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
