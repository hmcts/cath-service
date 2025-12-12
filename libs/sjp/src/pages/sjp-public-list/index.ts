import type { Request, Response } from "express";
import { calculatePagination } from "../../sjp-paginator.js";
import { getSjpListById, getSjpPublicCases, getUniquePostcodes, getUniqueProsecutors } from "../../sjp-service.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const artefactId = req.query.artefactId as string;
  const page = Number.parseInt(req.query.page as string, 10) || 1;
  const sortBy = (req.query.sortBy as string) || "name";
  const sortOrder = (req.query.sortOrder as string) || "asc";

  if (!artefactId) {
    return res.status(400).render("errors/400", {
      en,
      cy,
      locale
    });
  }

  const list = await getSjpListById(artefactId);
  if (!list || list.listType !== "public") {
    return res.status(404).render("errors/404", {
      en,
      cy,
      locale
    });
  }

  const filters = {
    searchQuery: req.query.search as string | undefined,
    postcode: req.query.postcode as string | undefined,
    prosecutor: req.query.prosecutor as string | undefined
  };

  const { cases, totalCases } = await getSjpPublicCases(artefactId, filters, page, sortBy, sortOrder);
  const prosecutors = await getUniqueProsecutors(artefactId);
  const postcodeAreas = await getUniquePostcodes(artefactId);
  const pagination = calculatePagination(page, totalCases, 50);
  const t = locale === "cy" ? cy : en;

  // Format cases for GOV.UK table component
  const casesRows = cases.map((caseItem) => [
    { text: caseItem.name },
    { text: caseItem.postcode || "" },
    { text: caseItem.offence || "" },
    { text: caseItem.prosecutor || "" }
  ]);

  res.render("sjp-public-list/index", {
    ...t,
    en,
    cy,
    locale,
    list,
    cases,
    casesRows,
    prosecutors,
    postcodeAreas,
    pagination,
    filters,
    sortBy,
    sortOrder
  });
};

export const POST = async (req: Request, res: Response) => {
  const artefactId = req.body.artefactId as string;

  const filters = {
    searchQuery: req.body.search?.trim(),
    postcode: req.body.postcode?.trim(),
    prosecutor: req.body.prosecutor
  };

  const queryParams = new URLSearchParams({ artefactId });
  if (filters.searchQuery) queryParams.set("search", filters.searchQuery);
  if (filters.postcode) queryParams.set("postcode", filters.postcode);
  if (filters.prosecutor) queryParams.set("prosecutor", filters.prosecutor);

  res.redirect(`/sjp-public-list?${queryParams.toString()}`);
};
