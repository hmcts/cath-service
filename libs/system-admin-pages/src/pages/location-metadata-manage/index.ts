import { requireRole, USER_ROLES } from "@hmcts/auth";
import { createLocationMetadata, getLocationMetadataByLocationId, updateLocationMetadata } from "@hmcts/location";
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

  if (!session.locationMetadata) {
    return res.redirect(`/location-metadata-search${language === "cy" ? "?lng=cy" : ""}`);
  }

  const { locationId, locationName, locationWelshName } = session.locationMetadata;
  const existingMetadata = await getLocationMetadataByLocationId(locationId);

  res.render("location-metadata-manage/index", {
    ...content,
    locationName: language === "cy" ? locationWelshName : locationName,
    cautionMessage: existingMetadata?.cautionMessage || "",
    welshCautionMessage: existingMetadata?.welshCautionMessage || "",
    noListMessage: existingMetadata?.noListMessage || "",
    welshNoListMessage: existingMetadata?.welshNoListMessage || "",
    hasExistingMetadata: !!existingMetadata,
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

  const { locationId, locationName, locationWelshName } = session.locationMetadata;
  const action = req.body.action as string;

  if (action === "delete") {
    return res.redirect(`/location-metadata-delete-confirmation${language === "cy" ? "?lng=cy" : ""}`);
  }

  const cautionMessage = req.body.cautionMessage as string | undefined;
  const welshCautionMessage = req.body.welshCautionMessage as string | undefined;
  const noListMessage = req.body.noListMessage as string | undefined;
  const welshNoListMessage = req.body.welshNoListMessage as string | undefined;

  const hasAtLeastOneMessage =
    (cautionMessage && cautionMessage.trim().length > 0) ||
    (welshCautionMessage && welshCautionMessage.trim().length > 0) ||
    (noListMessage && noListMessage.trim().length > 0) ||
    (welshNoListMessage && welshNoListMessage.trim().length > 0);

  if (!hasAtLeastOneMessage) {
    const existingMetadata = await getLocationMetadataByLocationId(locationId);
    return res.render("location-metadata-manage/index", {
      ...content,
      locationName: language === "cy" ? locationWelshName : locationName,
      cautionMessage: cautionMessage || "",
      welshCautionMessage: welshCautionMessage || "",
      noListMessage: noListMessage || "",
      welshNoListMessage: welshNoListMessage || "",
      hasExistingMetadata: !!existingMetadata,
      errors: [{ text: content.atLeastOneMessageRequired, href: "#cautionMessage" }]
    });
  }

  try {
    if (action === "create") {
      await createLocationMetadata({
        locationId,
        cautionMessage,
        welshCautionMessage,
        noListMessage,
        welshNoListMessage
      });
      session.locationMetadata.operation = "created";
    } else if (action === "update") {
      await updateLocationMetadata(locationId, {
        cautionMessage,
        welshCautionMessage,
        noListMessage,
        welshNoListMessage
      });
      session.locationMetadata.operation = "updated";
    }

    res.redirect(`/location-metadata-success${language === "cy" ? "?lng=cy" : ""}`);
  } catch (error) {
    const existingMetadata = await getLocationMetadataByLocationId(locationId);
    return res.render("location-metadata-manage/index", {
      ...content,
      locationName: language === "cy" ? locationWelshName : locationName,
      cautionMessage: cautionMessage || "",
      welshCautionMessage: welshCautionMessage || "",
      noListMessage: noListMessage || "",
      welshNoListMessage: welshNoListMessage || "",
      hasExistingMetadata: !!existingMetadata,
      errors: [{ text: (error as Error).message, href: "#cautionMessage" }]
    });
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
