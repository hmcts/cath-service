import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJsonValidator } from "@hmcts/list-types-common";
import { getArtefactById, PROVENANCE_LABELS } from "@hmcts/publication";
import type { Request, Response } from "express";
import type { AdministrativeCourtHearingList } from "../models/types.js";
import { renderAdminCourt } from "../rendering/renderer.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const ROUTES = [
  "/birmingham-administrative-court-daily-cause-list",
  "/bristol-cardiff-administrative-court-daily-cause-list",
  "/leeds-administrative-court-daily-cause-list",
  "/manchester-administrative-court-daily-cause-list"
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..");
const TEMP_UPLOAD_DIR = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");
const schemaPath = path.join(__dirname, "../schemas/administrative-court-daily-cause-list.json");
const validate = createJsonValidator(schemaPath);

const LIST_TYPE_ID_TO_NAME: Record<number, string> = {
  20: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
  21: "LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
  22: "BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
  23: "MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST"
};

const LIST_TYPE_CONFIG: Record<string, { en: string; cy: string; template: string }> = {
  BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: {
    en: en.BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle,
    template: "birmingham-administrative-court-daily-cause-list"
  },
  LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: {
    en: en.LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle,
    template: "leeds-administrative-court-daily-cause-list"
  },
  BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: {
    en: en.BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle,
    template: "bristol-cardiff-administrative-court-daily-cause-list"
  },
  MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: {
    en: en.MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle,
    template: "manchester-administrative-court-daily-cause-list"
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

    const jsonData: AdministrativeCourtHearingList = JSON.parse(jsonContent);

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

    const { header, hearings } = renderAdminCourt(jsonData, {
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

    res.render("administrative-court-daily-cause-list", {
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
    console.error("Error rendering Administrative Court Daily Cause List:", error);
    return res.status(500).render("errors/common", {
      en,
      cy,
      errorTitle: "Error",
      errorMessage: "An error occurred while displaying the list"
    });
  }
};
