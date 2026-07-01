import { requireRole, USER_ROLES } from "@hmcts/auth";
import { jurisdictionDataListCy as cy, jurisdictionDataListEn as en, listJurisdictionData } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";

const ALL_TYPES = ["Jurisdiction", "Sub-Jurisdiction"] as const;
type RecordType = (typeof ALL_TYPES)[number];

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const typeParam = req.query.type;
  const selectedTypes: RecordType[] = Array.isArray(typeParam)
    ? (typeParam.filter((v) => ALL_TYPES.includes(v as RecordType)) as RecordType[])
    : typeParam && ALL_TYPES.includes(typeParam as RecordType)
      ? [typeParam as RecordType]
      : [];

  const data = await listJurisdictionData();

  const jurisdictionRows = data.filter((row) => ALL_TYPES.includes(row.type as RecordType));
  const filtered = selectedTypes.length > 0 ? jurisdictionRows.filter((row) => selectedTypes.includes(row.type as RecordType)) : jurisdictionRows;

  const tableRows = filtered.map((row) => [
    { text: row.name },
    { text: t.typeLabels[row.type as RecordType] ?? row.type },
    {
      html: `<a href="/jurisdiction-data-modify?id=${row.id}&type=${encodeURIComponent(row.type)}" class="govuk-link">${t.modifyLinkText}</a>`
    }
  ]);

  const typeItems = ALL_TYPES.map((type) => ({
    value: type,
    text: t.typeLabels[type],
    checked: selectedTypes.includes(type)
  }));

  const selectedTypesDisplay = selectedTypes.map((type) => t.typeLabels[type]);

  const buildRemoveUrl = (indexToRemove: number) => {
    const remaining = selectedTypes.filter((_, i) => i !== indexToRemove);
    const params = new URLSearchParams();
    for (const type of remaining) params.append("type", type);
    const qs = params.toString();
    return `/jurisdiction-data-list${qs ? `?${qs}` : ""}`;
  };

  const typeRemoveUrls = selectedTypes.map((_, i) => buildRemoveUrl(i));

  res.render("jurisdiction-data-list/index", {
    en,
    cy,
    t,
    tableRows,
    typeItems,
    selectedTypes,
    selectedTypesDisplay,
    typeRemoveUrls
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
