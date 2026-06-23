import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJsonValidator } from "@hmcts/list-types-common";
import { listTypeData } from "@hmcts/location";
import { getArtefactById } from "@hmcts/publication";
import {
  sscsDailyHearingListCy as cy,
  sscsDailyHearingListEn as en,
  importantInformationByListType,
  renderSscsDailyHearingListData,
  type SscsDailyHearingList
} from "@hmcts/sscs-daily-hearing-list";
import { schemaPath } from "@hmcts/sscs-daily-hearing-list/config";
import type { Request, Response } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..", "..");
const TEMP_UPLOAD_DIR = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");
const validate = createJsonValidator(schemaPath);

function getListTypeName(listTypeId: number): string | undefined {
  return listTypeData.find((lt) => lt.id === listTypeId)?.name;
}

function getImportantInformationText(listTypeName: string | undefined): string {
  if (listTypeName && importantInformationByListType[listTypeName]) {
    return importantInformationByListType[listTypeName];
  }
  return "";
}

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

    const jsonData: SscsDailyHearingList = JSON.parse(jsonContent);

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

    const listTypeName = getListTypeName(artefact.listTypeId);
    const listTypeEntry = listTypeData.find((lt) => lt.id === artefact.listTypeId);
    const listTitle =
      locale === "cy"
        ? (listTypeEntry?.welshFriendlyName ?? listTypeEntry?.englishFriendlyName ?? t.listForDate)
        : (listTypeEntry?.englishFriendlyName ?? t.listForDate);

    const { header, hearings } = renderSscsDailyHearingListData(jsonData, {
      locale,
      courtName: listTitle,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle
    });

    const importantInformationText = getImportantInformationText(listTypeName);
    const dataSource = t.provenanceLabels[artefact.provenance as keyof typeof t.provenanceLabels] || artefact.provenance;

    res.render("sscs-daily-hearing-list", {
      en,
      cy,
      t,
      title: header.listTitle,
      header,
      hearings,
      importantInformationText,
      dataSource
    });
  } catch (error) {
    console.error("Error rendering SSCS Daily Hearing List:", error);
    return res.status(500).render("errors/common", {
      en,
      cy,
      errorTitle: "Server Error",
      errorMessage: "An error occurred while loading the list"
    });
  }
};
