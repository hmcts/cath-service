import type { Request, Response } from "express";
import "@hmcts/auth";
import { calculatePagination, getSjpListById, getSjpPressCases, getUniquePostcodes, getUniqueProsecutors } from "@hmcts/sjp";

const en = {
  title: "Single Justice Procedure – Press List",
  accordionTitle: "What are Single Justice Procedure Cases?",
  accordionContent: "Cases ready to be decided by a magistrate without a hearing. Includes TV licensing and minor traffic offences such as speeding.",
  listFor: "List for",
  published: "Published",
  at: "at",
  importantInfoTitle: "Important Information",
  importantInfoContent:
    "In accordance with the media protocol, additional documents from these cases are available to the members of the media on request. The link below takes you to the full protocol and further information in relation to what documentation can be obtained.",
  mediaProtocolLink: "Protocol on sharing court lists, registers and documents with the media",
  downloadButton: "Download a copy",
  searchLabel: "Search filters",
  showFilters: "Show filters",
  hideFilters: "Hide filters",
  postcodeFilterHeading: "Postcode",
  postcodeLabel: "Enter postcode",
  prosecutorFilterHeading: "Prosecutor",
  prosecutorLabel: "Select prosecutor",
  selectProsecutor: "Select a prosecutor",
  filterTitle: "Filter",
  selectedFilters: "Selected filters",
  clearFilters: "Clear filters",
  applyFilters: "Apply filters",
  nameHeader: "Name",
  dobHeader: "Date of Birth",
  referenceHeader: "Reference",
  addressHeader: "Address",
  prosecutorHeader: "Prosecutor",
  reportingRestrictionHeader: "Reporting Restriction",
  offenceHeader: "Offence",
  noCasesFound: "No cases found",
  previous: "Previous",
  next: "Next",
  backToTop: "Back to top",
  errorSummaryTitle: "There is a problem",
  errorInvalidPostcode: "Enter a valid postcode",
  errorNotVerified: "You must be a verified user to access press lists"
};

const cy = {
  title: "Gweithdrefn Cyfiawnder Sengl – Rhestr y Wasg",
  accordionTitle: "Beth yw Achosion Gweithdrefn Cyfiawnder Sengl?",
  accordionContent: "Achosion sy'n barod i gael eu penderfynu gan ynad heb wrandawiad. Mae'n cynnwys trwyddedu teledu a throseddau traffig bach fel goryrru.",
  listFor: "Rhestr ar gyfer",
  published: "Cyhoeddwyd",
  at: "am",
  importantInfoTitle: "Gwybodaeth Bwysig",
  importantInfoContent:
    "Yn unol â'r protocol cyfryngau, mae dogfennau ychwanegol o'r achosion hyn ar gael i aelodau o'r cyfryngau ar gais. Mae'r ddolen isod yn mynd â chi at y protocol llawn a rhagor o wybodaeth ynghylch pa ddogfennaeth y gellir ei chael.",
  mediaProtocolLink: "Protocol ar rannu rhestrau llysoedd, cofrestrau a dogfennau gyda'r cyfryngau",
  downloadButton: "Lawrlwytho copi",
  searchLabel: "Chwilio hidlwyr",
  showFilters: "Dangos hidlwyr",
  hideFilters: "Cuddio hidlwyr",
  postcodeFilterHeading: "Cod post",
  postcodeLabel: "Rhowch god post",
  prosecutorFilterHeading: "Erlynydd",
  prosecutorLabel: "Dewiswch erlynydd",
  selectProsecutor: "Dewiswch erlynydd",
  filterTitle: "Hidlo",
  selectedFilters: "Hidlwyr a ddewiswyd",
  clearFilters: "Clirio hidlwyr",
  applyFilters: "Cymhwyso hidlwyr",
  nameHeader: "Enw",
  dobHeader: "Dyddiad Geni",
  referenceHeader: "Cyfeirnod",
  addressHeader: "Cyfeiriad",
  prosecutorHeader: "Erlynydd",
  reportingRestrictionHeader: "Cyfyngiad Adrodd",
  offenceHeader: "Trosedd",
  noCasesFound: "Dim achosion wedi'u darganfod",
  previous: "Blaenorol",
  next: "Nesaf",
  backToTop: "Yn ôl i'r brig",
  errorSummaryTitle: "Mae problem wedi codi",
  errorInvalidPostcode: "Rhowch god post dilys",
  errorNotVerified: "Rhaid i chi fod yn ddefnyddiwr dilysedig i gael mynediad at restrau'r wasg"
};

export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  // Skip authentication in development mode
  const isDevelopment = process.env.NODE_ENV !== "production";
  if (!isDevelopment && (!req.isAuthenticated() || req.user?.role !== "VERIFIED")) {
    return res.status(403).render("errors/403", {
      en,
      cy,
      locale,
      message: t.errorNotVerified
    });
  }

  const listId = req.query.listId as string;
  const page = Number.parseInt(req.query.page as string, 10) || 1;

  if (!listId) {
    return res.status(400).render("errors/400", {
      en,
      cy,
      locale
    });
  }

  const list = await getSjpListById(listId);
  if (!list || list.listType !== "press") {
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

  const { cases, totalCases } = await getSjpPressCases(listId, filters, page);
  const prosecutors = await getUniqueProsecutors(listId);
  const postcodeAreas = await getUniquePostcodes(listId);
  const pagination = calculatePagination(page, totalCases, 50);

  res.render("index", {
    ...t,
    en,
    cy,
    locale,
    list,
    cases,
    prosecutors,
    postcodeAreas,
    pagination,
    filters,
    errors: undefined
  });
};

export const POST = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  // Skip authentication in development mode
  const isDevelopment = process.env.NODE_ENV !== "production";
  if (!isDevelopment && (!req.isAuthenticated() || req.user?.role !== "VERIFIED")) {
    return res.status(403).render("errors/403", {
      en,
      cy,
      locale,
      message: t.errorNotVerified
    });
  }

  const listId = req.body.listId as string;

  const filters = {
    searchQuery: req.body.search?.trim(),
    postcode: req.body.postcode,
    prosecutor: req.body.prosecutor
  };

  const queryParams = new URLSearchParams({ listId });
  if (filters.searchQuery) queryParams.set("search", filters.searchQuery);
  if (filters.postcode) queryParams.set("postcode", filters.postcode);
  if (filters.prosecutor) queryParams.set("prosecutor", filters.prosecutor);

  res.redirect(`/sjp-press-list?${queryParams.toString()}`);
};
