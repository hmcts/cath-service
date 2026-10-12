/**
 * Single source of truth for the 16 sections of the Business and Property Division
 * Rolls Building Daily Cause List. Drives the Excel sheet config, model keys, JSON
 * schema required keys, renderer output and the template loop. Change this array and
 * everything else follows. Order is the literal section order given in the acceptance criteria.
 *
 * Each field has a distinct role:
 * - `key`           JSON data key (the literal upstream form, including "&").
 * - `worksheetName` exact Excel tab name the uploaded workbook must match. The source
 *                   workbook uses "&" in four tab names, so this differs from the display
 *                   label for those rows.
 * - `en` / `cy`     locale display labels shown in the style guide, PDF and email summary.
 *                   These use the word "and", never "&".
 */
export const SECTIONS = [
  { key: "appealList", worksheetName: "Appeal List", en: "Appeal List", cy: "Y Rhestr Apeliadau" },
  { key: "businessList", worksheetName: "Business List", en: "Business List", cy: "Y Rhestr Fusnes" },
  { key: "commercialCourt", worksheetName: "Commercial Court", en: "Commercial Court", cy: "Y Llys Masnach" },
  { key: "financialList", worksheetName: "Financial List", en: "Financial List", cy: "Rhestr Ariannol" },
  { key: "insolvency&CompaniesCourt", worksheetName: "Insolvency & Companies Court", en: "Insolvency and Companies Court", cy: "Y Llys Ansolfedd a Chwmnïau" },
  { key: "ip&EnterpriseCourt", worksheetName: "IP & Enterprise Court", en: "Intellectual Property and Enterprise Court", cy: "Y Llys Mentrau Eiddo Deallusol" },
  { key: "intellectualPropertyList", worksheetName: "Intellectual Property List", en: "Intellectual Property List", cy: "Y Rhestr Eiddo Deallusol" },
  {
    key: "londonCircuitCommercialCourt",
    worksheetName: "London Circuit Commercial Court",
    en: "London Circuit Commercial Court",
    cy: "Y Llys Masnach - Cylchdaith Llundain"
  },
  { key: "patentsCourt", worksheetName: "Patents Court", en: "Patents Court", cy: "Y Llys Patentau" },
  {
    key: "property,Trusts&ProbateList",
    worksheetName: "Property, Trusts & Probate List",
    en: "Property, Trusts and Probate List",
    cy: "Y Rhestr Eiddo, Ymddiriedolaethau a Phrofiant"
  },
  {
    key: "technology&ConstructionCourt",
    worksheetName: "Technology & Construction Court",
    en: "Technology and Construction Court",
    cy: "Y Llys Technoleg ac Adeiladwaith"
  },
  { key: "admiraltyCourt", worksheetName: "Admiralty Court", en: "Admiralty Court", cy: "Llys y Morlys" },
  { key: "companiesWindingUp", worksheetName: "Companies Winding Up", en: "Companies Winding Up", cy: "Dirwyn Cwmnïau i Ben" },
  { key: "competitionList", worksheetName: "Competition List", en: "Competition List", cy: "Y Rhestr Gystadleuaeth" },
  { key: "pensionsList", worksheetName: "Pensions List", en: "Pensions List", cy: "Y Rhestr Pensiynau" },
  { key: "revenueList", worksheetName: "Revenue List", en: "Revenue List", cy: "Y Rhestr Refeniw" }
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];
