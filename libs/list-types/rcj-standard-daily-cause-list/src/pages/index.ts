import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJsonValidator } from "@hmcts/list-types-common";
import { getArtefactById, PROVENANCE_LABELS } from "@hmcts/publication";
import type { Request, Response } from "express";
import type { StandardHearingList } from "../models/types.js";
import { renderStandardDailyCauseList } from "../rendering/renderer.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const ROUTES = [
  "/civil-courts-rcj-daily-cause-list",
  "/county-court-central-london-civil-daily-cause-list",
  "/court-of-appeal-criminal-division-daily-cause-list",
  "/family-division-high-court-daily-cause-list",
  "/kings-bench-division-daily-cause-list",
  "/kings-bench-masters-daily-cause-list",
  "/mayor-city-civil-daily-cause-list",
  "/senior-courts-costs-office-daily-cause-list"
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..");
const TEMP_UPLOAD_DIR = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");
const schemaPath = path.join(__dirname, "../schemas/rcj-standard-daily-cause-list.json");
const validate = createJsonValidator(schemaPath);

const LIST_TYPE_ID_TO_NAME: Record<number, string> = {
  10: "CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST",
  11: "COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST",
  12: "COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST",
  13: "FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST",
  14: "KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST",
  15: "KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST",
  16: "MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST",
  17: "SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST"
};

const LIST_TYPE_CONFIG: Record<string, { en: string; cy: string; template: string }> = {
  CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST: {
    en: en.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.pageTitle,
    template: "civil-courts-rcj-daily-cause-list"
  },
  COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST: {
    en: en.COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST.pageTitle,
    template: "county-court-central-london-civil-daily-cause-list"
  },
  COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST: {
    en: en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.pageTitle,
    template: "court-of-appeal-criminal-division-daily-cause-list"
  },
  FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST: {
    en: en.FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST.pageTitle,
    template: "family-division-high-court-daily-cause-list"
  },
  KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST: {
    en: en.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST.pageTitle,
    template: "kings-bench-division-daily-cause-list"
  },
  KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST: {
    en: en.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.pageTitle,
    template: "kings-bench-masters-daily-cause-list"
  },
  MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST: {
    en: en.MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST.pageTitle,
    template: "mayor-city-civil-daily-cause-list"
  },
  SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST: {
    en: en.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST.pageTitle,
    template: "senior-courts-costs-office-daily-cause-list"
  }
};

export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const artefactId = req.query.artefactId as string;

  if (!artefactId) {
    return res.status(400).render("errors/common", {
      en,
      cy,
      errorTitle: "Bad Request",
      errorMessage: "Missing artefactId parameter"
    });
  }

  try {
    const artefact = await getArtefactById(artefactId);

    if (!artefact) {
      return res.status(404).render("errors/common", {
        en,
        cy,
        errorTitle: "Not Found",
        errorMessage: "The requested list could not be found"
      });
    }

    const listTypeId = artefact.listTypeId;
    const listTypeName = LIST_TYPE_ID_TO_NAME[listTypeId];

    if (!listTypeName || !LIST_TYPE_CONFIG[listTypeName]) {
      return res.status(400).render("errors/common", {
        en,
        cy,
        errorTitle: "Invalid List Type",
        errorMessage: "This list type is not supported by this module"
      });
    }

    const jsonFilePath = path.join(TEMP_UPLOAD_DIR, `${artefactId}.json`);

    let jsonContent: string;
    try {
      jsonContent = await readFile(jsonFilePath, "utf-8");
    } catch (error) {
      console.error(`Error reading JSON file at ${jsonFilePath}:`, error);
      return res.status(404).render("errors/common", {
        en,
        cy,
        errorTitle: "Not Found",
        errorMessage: "The requested list could not be found"
      });
    }

    const jsonData: StandardHearingList = JSON.parse(jsonContent);

    const validationResult = validate(jsonData);
    if (!validationResult.isValid) {
      console.error("Validation errors:", validationResult.errors);
      return res.status(400).render("errors/common", {
        en,
        cy,
        errorTitle: "Invalid Data",
        errorMessage: "The list data is invalid"
      });
    }

    const listConfig = LIST_TYPE_CONFIG[listTypeName];
    const listTitle = listConfig[locale as "en" | "cy"];

    const { header, hearings } = renderStandardDailyCauseList(jsonData, {
      locale,
      listTypeId,
      listTitle,
      displayFrom: artefact.displayFrom,
      displayTo: artefact.displayTo,
      lastReceivedDate: artefact.lastReceivedDate.toISOString()
    });

    const dataSource =
      t.common.provenanceLabels?.[artefact.provenance as keyof typeof t.common.provenanceLabels] ||
      PROVENANCE_LABELS[artefact.provenance] ||
      artefact.provenance;

    const listContent = (t as any)[listTypeName] || {};

    res.render(listConfig.template, {
      en,
      cy,
      t,
      title: header.listTitle,
      header,
      hearings,
      dataSource,
      listTypeName,
      listContent,
      common: t.common
    });
  } catch (error) {
    console.error("Error rendering RCJ Standard Daily Cause List:", error);
    return res.status(500).render("errors/common", {
      en,
      cy,
      errorTitle: "Error",
      errorMessage: "An error occurred while displaying the list"
    });
  }
};
