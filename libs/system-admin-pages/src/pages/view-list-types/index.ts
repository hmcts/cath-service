import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { findAllListTypes } from "../../list-type/queries.js";
import * as cy from "./cy.js";
import * as en from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;

  const listTypes = await findAllListTypes();

  const listTypesData = listTypes.map((listType) => ({
    id: listType.id,
    name: listType.name,
    friendlyName: listType.friendlyName || "",
    welshFriendlyName: listType.welshFriendlyName || "",
    shortenedFriendlyName: listType.shortenedFriendlyName || "",
    url: listType.url || "",
    defaultSensitivity: listType.defaultSensitivity || "",
    allowedProvenance: listType.allowedProvenance,
    isNonStrategic: listType.isNonStrategic,
    subJurisdictions: listType.subJurisdictions.map((sj) => sj.subJurisdiction.name).join(", ")
  }));

  const yesText = language === "cy" ? cy.yesText : en.yesText;
  const noText = language === "cy" ? cy.noText : en.noText;
  const editText = language === "cy" ? cy.editText : en.editText;

  const tableRows = listTypesData.map((listType) => [
    { text: listType.name },
    { text: listType.friendlyName },
    { text: listType.welshFriendlyName },
    { text: listType.shortenedFriendlyName },
    { text: listType.url },
    { text: listType.defaultSensitivity },
    { text: listType.allowedProvenance },
    { text: listType.isNonStrategic ? yesText : noText },
    { text: listType.subJurisdictions },
    { html: `<a class="govuk-link" href="/configure-list-type-enter-details?id=${listType.id}">${editText}</a>` }
  ]);

  res.render("view-list-types/index", {
    ...content,
    tableRows
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
