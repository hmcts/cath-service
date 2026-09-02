import { requireRole, USER_ROLES } from "@hmcts/auth";
import { listJurisdictionData } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const data = await listJurisdictionData();
  const regions = data.filter((row) => row.type === "Region");

  const tableRows = regions.map((row) => [
    { text: row.name },
    {
      html: `<a href="/region-data-modify?id=${row.id}&type=Region" class="govuk-link">${t.modifyLinkText}</a>`
    }
  ]);

  res.render("region-data-list/index", { en, cy, t, tableRows });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
