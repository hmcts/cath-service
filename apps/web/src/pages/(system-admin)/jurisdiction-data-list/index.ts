import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { listJurisdictionData } from "../../jurisdiction-management/jurisdiction-management-service.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;

  const jurisdictionFilter = typeof req.query.jurisdiction === "string" ? req.query.jurisdiction.trim() : "";
  const subJurisdictionFilter = typeof req.query.subJurisdiction === "string" ? req.query.subJurisdiction.trim() : "";

  const filter =
    jurisdictionFilter || subJurisdictionFilter
      ? {
          ...(jurisdictionFilter ? { jurisdiction: jurisdictionFilter } : {}),
          ...(subJurisdictionFilter ? { subJurisdiction: subJurisdictionFilter } : {})
        }
      : undefined;

  const data = await listJurisdictionData(filter);

  const langParam = language === "cy" ? "&lng=cy" : "";
  const tableRows = data.map((row) => [
    { text: row.name },
    { text: row.type },
    {
      html: `<a href="/jurisdiction-data-modify?id=${row.id}&type=${encodeURIComponent(row.type)}${langParam}" class="govuk-link">${content.modifyLinkText}</a>`
    }
  ]);

  res.render("jurisdiction-data-list/index", {
    ...content,
    back: language === "cy" ? "Yn ôl" : "Back",
    tableRows,
    filterValues: { jurisdiction: jurisdictionFilter, subJurisdiction: subJurisdictionFilter }
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
