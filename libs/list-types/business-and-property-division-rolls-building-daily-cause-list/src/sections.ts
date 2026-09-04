/**
 * Single source of truth for the 16 sections of the Business and Property Division
 * Rolls Building Daily Cause List. Drives the Excel sheet config, model keys, JSON
 * schema required keys, renderer output and the template loop. Change this array and
 * everything else follows. Order is the literal section order given in the acceptance criteria.
 */
export const SECTIONS = [
  { key: "appealList", en: "Appeal List", cy: "Y Rhestr Apeliadau" },
  { key: "businessList", en: "Business List", cy: "Y Rhestr Fusnes" },
  { key: "commercialCourt", en: "Commercial Court", cy: "Y Llys Masnach" },
  { key: "financialList", en: "Financial List", cy: "Rhestr Ariannol" },
  { key: "insolvencyAndCompaniesCourt", en: "Insolvency & Companies Court", cy: "Y Llys Ansolfedd a Chwmnïau" },
  { key: "intellectualPropertyAndEnterpriseCourt", en: "Intellectual Property and Enterprise Court", cy: "Y Llys Mentrau Eiddo Deallusol" },
  { key: "intellectualPropertyList", en: "Intellectual Property List", cy: "Y Rhestr Eiddo Deallusol" },
  { key: "londonCircuitCommercialCourt", en: "London Circuit Commercial Court", cy: "Y Llys Masnach - Cylchdaith Llundain" },
  { key: "patentsCourt", en: "Patents Court", cy: "Y Llys Patentau" },
  { key: "propertyTrustsAndProbateList", en: "Property, Trusts and Probate List", cy: "Y Rhestr Eiddo, Ymddiriedolaethau a Phrofiant" },
  { key: "technologyAndConstructionCourt", en: "Technology and Construction Court", cy: "Y Llys Technoleg ac Adeiladwaith" },
  { key: "admiraltyCourt", en: "Admiralty Court", cy: "Llys y Morlys" },
  { key: "companiesWindingUp", en: "Companies Winding Up", cy: "Dirwyn Cwmnïau i Ben" },
  { key: "competitionList", en: "Competition List", cy: "Y Rhestr Gystadleuaeth" },
  { key: "pensionsList", en: "Pensions List", cy: "Y Rhestr Pensiynau" },
  { key: "revenueList", en: "Revenue List", cy: "Y Rhestr Refeniw" }
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];
