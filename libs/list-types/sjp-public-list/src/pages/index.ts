import { calculatePagination, getSjpListById, getSjpPublicCases, getUniquePostcodes, getUniqueProsecutors, validateUkPostcode } from "@hmcts/sjp";
import type { Request, Response } from "express";

const en = {
  title: "Single Justice Procedure Cases",
  accordionTitle: "What are Single Justice Procedure Cases?",
  accordionContent: "Cases ready to be decided by a magistrate without a hearing. Includes TV licensing and minor traffic offences such as speeding.",
  listFor: "List for",
  published: "Published",
  at: "at",
  searchLabel: "Search by postcode",
  postcodeLabel: "Enter postcode (e.g. SW1A 1AA)",
  postcodeHint: "Enter the first part of a postcode to search for cases in your area",
  searchButton: "Search",
  clearSearch: "Clear search",
  filterTitle: "Filter",
  postcodeFilterHeading: "Postcode",
  prosecutorFilterHeading: "Prosecutor",
  selectedFilters: "Selected filters",
  clearFilters: "Clear filters",
  applyFilters: "Apply filters",
  showFilters: "Show filters",
  hideFilters: "Hide filters",
  nameHeader: "Name",
  postcodeHeader: "Postcode",
  prosecutorHeader: "Prosecutor",
  offenceHeader: "Offence",
  noCasesFound: "No cases found",
  previous: "Previous",
  next: "Next",
  backToTop: "Back to top",
  errorSummaryTitle: "There is a problem",
  errorInvalidPostcode: "Enter a valid postcode"
};

const cy = {
  title: "Achosion Gweithdrefn Cyfiawnder Sengl",
  accordionTitle: "Beth yw Achosion Gweithdrefn Cyfiawnder Sengl?",
  accordionContent: "Achosion sy'n barod i gael eu penderfynu gan ynad heb wrandawiad. Mae'n cynnwys trwyddedu teledu a throseddau traffig bach fel goryrru.",
  listFor: "Rhestr ar gyfer",
  published: "Cyhoeddwyd",
  at: "am",
  searchLabel: "Chwilio yn ôl cod post",
  postcodeLabel: "Rhowch god post (e.e. SW1A 1AA)",
  postcodeHint: "Rhowch y rhan gyntaf o god post i chwilio am achosion yn eich ardal",
  searchButton: "Chwilio",
  clearSearch: "Clirio chwiliad",
  filterTitle: "Hidlo",
  postcodeFilterHeading: "Cod post",
  prosecutorFilterHeading: "Erlynydd",
  selectedFilters: "Hidlwyr a ddewiswyd",
  clearFilters: "Clirio hidlwyr",
  applyFilters: "Cymhwyso hidlwyr",
  showFilters: "Dangos hidlwyr",
  hideFilters: "Cuddio hidlwyr",
  nameHeader: "Enw",
  postcodeHeader: "Cod post",
  prosecutorHeader: "Erlynydd",
  offenceHeader: "Trosedd",
  noCasesFound: "Dim achosion wedi'u darganfod",
  previous: "Blaenorol",
  next: "Nesaf",
  backToTop: "Yn ôl i'r brig",
  errorSummaryTitle: "Mae problem wedi codi",
  errorInvalidPostcode: "Rhowch god post dilys"
};

export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const listId = req.query.listId as string;
  const page = Number.parseInt(req.query.page as string, 10) || 1;
  const postcode = req.query.postcode as string | undefined;
  const sortBy = (req.query.sortBy as string) || "name";
  const sortOrder = (req.query.sortOrder as string) || "asc";

  if (!listId) {
    return res.status(400).render("errors/400", {
      en,
      cy,
      locale
    });
  }

  const list = await getSjpListById(listId);
  if (!list || list.listType !== "public") {
    return res.status(404).render("errors/404", {
      en,
      cy,
      locale
    });
  }

  const filters = { postcode };
  const { cases, totalCases } = await getSjpPublicCases(listId, filters, page, sortBy, sortOrder);
  const pagination = calculatePagination(page, totalCases, 1000);

  // Get unique postcodes and prosecutors for filters
  const { postcodes } = await getUniquePostcodes(listId);
  const prosecutors = await getUniqueProsecutors(listId);

  // Format cases into table rows
  const casesRows = cases.map((c) => [{ text: c.name }, { text: c.postcode || "" }, { text: c.offence || "" }, { text: c.prosecutor || "" }]);

  res.render("index", {
    ...t,
    en,
    cy,
    locale,
    list,
    cases,
    casesRows,
    pagination,
    postcode,
    sortBy,
    sortOrder,
    filters: { postcode },
    postcodeAreas: postcodes,
    prosecutors,
    errors: undefined
  });
};

export const POST = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const listId = req.body.listId as string;
  const postcode = req.body.postcode?.trim();

  if (!listId) {
    return res.status(400).render("errors/400", {
      en,
      cy,
      locale
    });
  }

  const list = await getSjpListById(listId);
  if (!list || list.listType !== "public") {
    return res.status(404).render("errors/404", {
      en,
      cy,
      locale
    });
  }

  // Validate postcode if provided
  const postcodeValidation = validateUkPostcode(postcode);
  if (postcode && !postcodeValidation.isValid) {
    const filters = {};
    const { cases, totalCases } = await getSjpPublicCases(listId, filters, 1);
    const pagination = calculatePagination(1, totalCases, 1000);

    // Get unique postcodes and prosecutors for filters
    const { postcodes } = await getUniquePostcodes(listId);
    const prosecutors = await getUniqueProsecutors(listId);

    // Format cases into table rows
    const casesRows = cases.map((c) => [{ text: c.name }, { text: c.postcode || "" }, { text: c.offence || "" }, { text: c.prosecutor || "" }]);

    return res.status(400).render("index", {
      ...t,
      en,
      cy,
      locale,
      list,
      cases,
      casesRows,
      pagination,
      postcode,
      sortBy: "name",
      sortOrder: "asc",
      filters: {},
      postcodeAreas: postcodes,
      prosecutors,
      errors: [
        {
          text: t.errorInvalidPostcode,
          href: "#postcode"
        }
      ]
    });
  }

  // Redirect with postcode as query param
  const queryParams = new URLSearchParams({ listId });
  if (postcode) {
    queryParams.set("postcode", postcode);
  }

  res.redirect(`/sjp-public-list?${queryParams.toString()}`);
};
