import { requireRole, USER_ROLES } from "@hmcts/auth";
import { createLocationMetadata, getLocationMetadataByLocationId, updateLocationMetadata } from "@hmcts/location";
import type { LocationMetadataSession } from "@hmcts/system-admin-pages";
import { findDisallowedHtmlTags } from "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const MESSAGE_FIELDS = ["cautionMessage", "welshCautionMessage", "noListMessage", "welshNoListMessage"] as const;

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

const hasAtLeastOneMessage = (formData: FormData) =>
  hasNonEmptyValue(formData.cautionMessage) ||
  hasNonEmptyValue(formData.welshCautionMessage) ||
  hasNonEmptyValue(formData.noListMessage) ||
  hasNonEmptyValue(formData.welshNoListMessage);

// Agreed mock-up: an empty form lists the summary-only "at least one" message, then one required message per field.
const validateMessages = (formData: FormData, content: Content): MessageError[] => {
  if (!hasAtLeastOneMessage(formData)) {
    return [
      { text: content.atLeastOneMessageRequired, href: "#cautionMessage" },
      ...MESSAGE_FIELDS.map((field) => ({ text: content[`${field}Required`], href: `#${field}`, field }))
    ];
  }

  return MESSAGE_FIELDS.flatMap((field) => {
    const value = formData[field];
    const tags = value ? findDisallowedHtmlTags(value) : [];
    return tags.length > 0 ? [{ text: content.htmlTagsNotAllowed(content[`${field}Label`], tags), href: `#${field}`, field }] : [];
  });
};

const toFieldErrors = (errors: MessageError[]) =>
  Object.fromEntries(errors.filter((error) => error.field).map((error) => [error.field, { text: error.text }])) as Partial<
    Record<MessageField, { text: string }>
  >;

const getHandler = async (req: Request, res: Response) => {
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
    errors: undefined,
    fieldErrors: {}
  });
};

const postHandler = async (req: Request, res: Response) => {
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

  const renderWithErrors = async (messageErrors: MessageError[]) => {
    const existingMetadata = await getLocationMetadataByLocationId(locationId);
    return res.render("location-metadata-manage/index", {
      ...content,
      locationName: language === "cy" ? locationWelshName : locationName,
      cautionMessage: formData.cautionMessage || "",
      welshCautionMessage: formData.welshCautionMessage || "",
      noListMessage: formData.noListMessage || "",
      welshNoListMessage: formData.welshNoListMessage || "",
      hasExistingMetadata: !!existingMetadata,
      errors: messageErrors.map(({ text, href }) => ({ text, href })),
      fieldErrors: toFieldErrors(messageErrors)
    });
  };

  const validationErrors = validateMessages(formData, content);
  if (validationErrors.length > 0) {
    return renderWithErrors(validationErrors);
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
    return renderWithErrors([{ text: (error as Error).message, href: "#cautionMessage" }]);
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];

type Content = typeof en | typeof cy;
type FormData = ReturnType<typeof extractFormData>;
type MessageField = (typeof MESSAGE_FIELDS)[number];

interface MessageError {
  text: string;
  href: string;
  field?: MessageField;
}
