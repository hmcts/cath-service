import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "@hmcts/postgres";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import type { Request, Response } from "express";
import type { StandardHearingList } from "../models/types.js";
import { renderStandardDailyCauseList } from "../rendering/renderer.js";
import { validateStandardDailyCauseList } from "../validation/json-validator.js";
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

// Map list type IDs to their names and template names
const LIST_TYPE_CONFIG: Record<number, { en: string; cy: string; template: string }> = {
  10: { en: en[10].pageTitle, cy: cy[10].pageTitle, template: "civil-courts-rcj-daily-cause-list" },
  11: { en: en[11].pageTitle, cy: cy[11].pageTitle, template: "county-court-central-london-civil-daily-cause-list" },
  12: { en: en[12].pageTitle, cy: cy[12].pageTitle, template: "court-of-appeal-criminal-division-daily-cause-list" },
  13: { en: en[13].pageTitle, cy: cy[13].pageTitle, template: "family-division-high-court-daily-cause-list" },
  14: { en: en[14].pageTitle, cy: cy[14].pageTitle, template: "kings-bench-division-daily-cause-list" },
  15: { en: en[15].pageTitle, cy: cy[15].pageTitle, template: "kings-bench-masters-daily-cause-list" },
  16: { en: en[16].pageTitle, cy: cy[16].pageTitle, template: "mayor-city-civil-daily-cause-list" },
  17: { en: en[17].pageTitle, cy: cy[17].pageTitle, template: "senior-courts-costs-office-daily-cause-list" }
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
    const artefact = await prisma.artefact.findUnique({
      where: { artefactId }
    });

    if (!artefact) {
      return res.status(404).render("errors/common", {
        en,
        cy,
        errorTitle: "Not Found",
        errorMessage: "The requested list could not be found"
      });
    }

    const listTypeId = artefact.listTypeId;

    // Verify this is one of our supported list types
    if (!LIST_TYPE_CONFIG[listTypeId]) {
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

    const validationResult = validateStandardDailyCauseList(jsonData);
    if (!validationResult.isValid) {
      console.error("Validation errors:", validationResult.errors);
      return res.status(400).render("errors/common", {
        en,
        cy,
        errorTitle: "Invalid Data",
        errorMessage: "The list data is invalid"
      });
    }

    const listConfig = LIST_TYPE_CONFIG[listTypeId];
    const listTitle = listConfig[locale as "en" | "cy"];

    const { header, hearings } = renderStandardDailyCauseList(jsonData, {
      locale,
      listTypeId,
      listTitle,
      displayFrom: artefact.displayFrom,
      displayTo: artefact.displayTo,
      lastReceivedDate: artefact.lastReceivedDate.toISOString()
    });

    const dataSource = PROVENANCE_LABELS[artefact.provenance] || artefact.provenance;

    // Get list-specific content
    const listContent = (t as any)[listTypeId] || {};

    res.render(listConfig.template, {
      en,
      cy,
      t,
      title: header.listTitle,
      header,
      hearings,
      dataSource,
      listTypeId,
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
