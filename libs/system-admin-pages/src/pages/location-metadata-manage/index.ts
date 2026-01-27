import { requireRole, USER_ROLES } from "@hmcts/auth";
import { createLocationMetadata, getLocationMetadataByLocationId, updateLocationMetadata } from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";
import type { LocationMetadataSession } from "../location-metadata-session.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getLanguage = (req: Request) => (req.query.lng === "cy" ? "cy" : "en");
const getContent = (language: "cy" | "en") => (language === "cy" ? cy : en);
const getLanguageParam = (language: "cy" | "en") => (language === "cy" ? "?lng=cy" : "");

const extractFormData = (body: Request["body"]) => ({
  cautionMessage: body.cautionMessage as string | undefined,
  welshCautionMessage: body.welshCautionMessage as string | undefined,
  noListMessage: body.noListMessage as string | undefined,
  welshNoListMessage: body.welshNoListMessage as string | undefined
});

const hasNonEmptyValue = (value: string | undefined) => value && value.trim().length > 0;

const hasAtLeastOneMessage = (formData: ReturnType<typeof extractFormData>) =>
  hasNonEmptyValue(formData.cautionMessage) ||
  hasNonEmptyValue(formData.welshCautionMessage) ||
  hasNonEmptyValue(formData.noListMessage) ||
  hasNonEmptyValue(formData.welshNoListMessage);

export const getHandler = async (req: Request, res: Response) => {
  const language = getLanguage(req);
  const content = getContent(language);
  const session = req.session as LocationMetadataSession;

  if (!session.locationMetadata) {
    return res.redirect(`/location-metadata-search${getLanguageParam(language)}`);
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
  const language = getLanguage(req);
  const content = getContent(language);
  const session = req.session as LocationMetadataSession;

  if (!session.locationMetadata) {
    return res.redirect(`/location-metadata-search${getLanguageParam(language)}`);
  }

  const { locationId, locationName, locationWelshName } = session.locationMetadata;
  const action = req.body.action as string;

  if (action === "delete") {
    return res.redirect(`/location-metadata-delete-confirmation${getLanguageParam(language)}`);
  }

  const formData = extractFormData(req.body);

  const renderWithError = async (errorText: string) => {
    const existingMetadata = await getLocationMetadataByLocationId(locationId);
    return res.render("location-metadata-manage/index", {
      ...content,
      locationName: language === "cy" ? locationWelshName : locationName,
      cautionMessage: formData.cautionMessage || "",
      welshCautionMessage: formData.welshCautionMessage || "",
      noListMessage: formData.noListMessage || "",
      welshNoListMessage: formData.welshNoListMessage || "",
      hasExistingMetadata: !!existingMetadata,
      errors: [{ text: errorText, href: "#cautionMessage" }]
    });
  };

  if (!hasAtLeastOneMessage(formData)) {
    return renderWithError(content.atLeastOneMessageRequired);
  }

  try {
    if (action === "create") {
      await createLocationMetadata({ locationId, ...formData });
      session.locationMetadata.operation = "created";
    } else if (action === "update") {
      await updateLocationMetadata(locationId, formData);
      session.locationMetadata.operation = "updated";
    }

    res.redirect(`/location-metadata-success${getLanguageParam(language)}`);
  } catch (error) {
    return renderWithError((error as Error).message);
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
