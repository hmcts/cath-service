import { requireRole, USER_ROLES } from "@hmcts/auth";
import { jurisdictionDataListCy as cy, jurisdictionDataListEn as en, listJurisdictionData } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

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

  const tableRows = data.map((row) => [
    { text: row.name },
    { text: row.type },
    {
      html: `<a href="/jurisdiction-data-modify?id=${row.id}&type=${encodeURIComponent(row.type)}" class="govuk-link">${t.modifyLinkText}</a>`
    }
  ]);

  res.render("jurisdiction-data-list/index", {
    en,
    cy,
    t,
    tableRows,
    filterValues: { jurisdiction: jurisdictionFilter, subJurisdiction: subJurisdictionFilter }
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
