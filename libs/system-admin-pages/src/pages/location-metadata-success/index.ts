import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
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

  const operation = session.locationMetadata?.operation || "created";

  let pageTitle = content.pageTitleCreated;

  if (operation === "updated") {
    pageTitle = content.pageTitleUpdated;
  } else if (operation === "deleted") {
    pageTitle = content.pageTitleDeleted;
  }

  delete session.locationMetadata;

  res.render("location-metadata-success/index", {
    ...content,
    pageTitle
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
