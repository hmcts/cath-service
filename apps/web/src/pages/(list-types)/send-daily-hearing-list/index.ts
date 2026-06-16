import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "@hmcts/postgres-prisma";
import { canAccessPublicationData, getArtefactById, type ListType, PROVENANCE_LABELS } from "@hmcts/publication";
import {
  sendDailyHearingListCy as cy,
  sendDailyHearingListEn as en,
  renderSendData,
  type SendDailyHearingList,
  validateSendDailyHearingList
} from "@hmcts/send-daily-hearing-list";
import type { Request, Response } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..", "..");
const TEMP_UPLOAD_DIR = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");

export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const artefactId = req.query.artefactId as string;

  if (!artefactId) {
    return res.status(400).render("errors/common", {
      en,
      cy,
      errorTitle: "Error",
      errorMessage: "Missing artefact ID"
    });
  }

  try {
    const artefact = await getArtefactById(artefactId);

    if (!artefact) {
      return res.status(404).render("errors/common", {
        en,
        cy,
        errorTitle: "Not found",
        errorMessage: "Artefact not found"
      });
    }

    const dbListType = await prisma.listType.findUnique({
      where: { id: artefact.listTypeId }
    });

    const listType: ListType | undefined = dbListType
      ? {
          id: dbListType.id,
          provenance: dbListType.allowedProvenance,
          isNonStrategic: dbListType.isNonStrategic
        }
      : undefined;

    const canAccess = canAccessPublicationData(req.user, artefact, listType);

    if (!canAccess) {
      return res.status(403).render("errors/403", {
        en: {
          title: "Access denied",
          message: "You do not have permission to view this publication"
        },
        cy: {
          title: "Mynediad wedi'i wrthod",
          message: "Nid oes gennych ganiatâd i weld y cyhoeddiad hwn"
        }
      });
    }

    const jsonFilePath = path.join(TEMP_UPLOAD_DIR, `${artefactId}.json`);

    let jsonContent: string;
    try {
      jsonContent = await readFile(jsonFilePath, "utf-8");
    } catch (error) {
      console.error(`[send-daily-hearing-list] Error reading JSON file at ${jsonFilePath}:`, error);
      return res.status(404).render("errors/common", {
        en,
        cy,
        errorTitle: "Error",
        errorMessage: "Publication data not found"
      });
    }

    const jsonData: SendDailyHearingList = JSON.parse(jsonContent);

    const validationResult = validateSendDailyHearingList(jsonData);
    if (!validationResult.isValid) {
      console.error("[send-daily-hearing-list] Validation errors:", validationResult.errors);
      return res.status(400).render("errors/common", {
        en,
        cy,
        errorTitle: "Error",
        errorMessage: "Invalid publication data"
      });
    }

    const renderedData = renderSendData(jsonData, {
      locale,
      contentDate: new Date(artefact.contentDate),
      lastReceivedDate: artefact.lastReceivedDate,
      listTitle: t.listName
    });

    const dataSource = PROVENANCE_LABELS[artefact.provenance] || artefact.provenance;

    res.render("(list-types)/send-daily-hearing-list/index", {
      en,
      cy,
      t,
      header: renderedData.header,
      hearings: renderedData.hearings,
      dataSource
    });
  } catch (error) {
    console.error("[send-daily-hearing-list] Unexpected error:", error);
    return res.status(500).render("errors/common", {
      en,
      cy,
      errorTitle: "Error",
      errorMessage: "An unexpected error occurred"
    });
  }
};
