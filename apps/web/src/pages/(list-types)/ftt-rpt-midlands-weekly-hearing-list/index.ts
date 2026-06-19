import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fttRptWeeklyHearingListCy as cy, fttRptWeeklyHearingListEn as en, type FttRptHearingList, renderFttRptData } from "@hmcts/ftt-rpt-weekly-hearing-list";
import { schemaPath } from "@hmcts/ftt-rpt-weekly-hearing-list/config";
import { createJsonValidator } from "@hmcts/list-types-common";
import { getArtefactById } from "@hmcts/publication";
import type { Request, Response } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..", "..");
const TEMP_UPLOAD_DIR = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");
const validate = createJsonValidator(schemaPath);

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

    const jsonData: FttRptHearingList = JSON.parse(jsonContent);

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

    const courtName = "First-tier Tribunal (Residential Property Tribunal): Midlands region";
    const listTitle = t.rptMidlandsPageTitle;

    const { header, hearings } = renderFttRptData(jsonData, {
      locale,
      courtName,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle
    });

    const dataSource = t.provenanceLabels[artefact.provenance as keyof typeof t.provenanceLabels] || artefact.provenance;

    res.render("ftt-rpt-weekly-hearing-list", {
      en,
      cy,
      t,
      title: header.listTitle,
      header,
      hearings,
      dataSource
    });
  } catch (error) {
    console.error("Error rendering FTT RPT Midlands Weekly Hearing List:", error);
    return res.status(500).render("errors/common", {
      en,
      cy,
      errorTitle: "Server Error",
      errorMessage: "An error occurred while loading the list"
    });
  }
};
