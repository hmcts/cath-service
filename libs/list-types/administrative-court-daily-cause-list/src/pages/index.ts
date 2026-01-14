import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "@hmcts/postgres";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import type { Request, Response } from "express";
import type { StandardHearingList } from "../models/types.js";
import { renderAdminCourt } from "../rendering/renderer.js";
import { validateAdminCourt } from "../validation/json-validator.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..");
const TEMP_UPLOAD_DIR = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");

// Map list type IDs to their names
const LIST_TYPE_NAMES: Record<number, { en: string; cy: string }> = {
  20: { en: en[20].pageTitle, cy: cy[20].pageTitle },
  21: { en: en[21].pageTitle, cy: cy[21].pageTitle },
  22: { en: en[22].pageTitle, cy: cy[22].pageTitle },
  23: { en: en[23].pageTitle, cy: cy[23].pageTitle }
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
    if (!LIST_TYPE_NAMES[listTypeId]) {
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

    const validationResult = validateAdminCourt(jsonData);
    if (!validationResult.isValid) {
      console.error("Validation errors:", validationResult.errors);
      return res.status(400).render("errors/common", {
        en,
        cy,
        errorTitle: "Invalid Data",
        errorMessage: "The list data is invalid"
      });
    }

    const listTitle = LIST_TYPE_NAMES[listTypeId][locale as keyof (typeof LIST_TYPE_NAMES)[number]];

    const { header, hearings } = renderAdminCourt(jsonData, {
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

    res.render("administrative-court-daily-cause-list/admin-court", {
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
    console.error("Error rendering Administrative Court Daily Cause List:", error);
    return res.status(500).render("errors/common", {
      en,
      cy,
      errorTitle: "Error",
      errorMessage: "An error occurred while displaying the list"
    });
  }
};
