import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type AstDailyHearingList, cy, en, renderAstDailyHearingListData } from "@hmcts/ast-daily-hearing-list";
import { schemaPath } from "@hmcts/ast-daily-hearing-list/config";
import { createJsonValidator } from "@hmcts/list-types-common";
import { prisma } from "@hmcts/postgres-prisma";
import { canAccessPublicationData, getArtefactById, type ListType, PROVENANCE_LABELS } from "@hmcts/publication";
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
      errorTitle: t.errorTitle || "Error",
      errorMessage: t.errorMessage || "Missing artefact ID"
    });
  }

  try {
    const artefact = await getArtefactById(artefactId);

    if (!artefact) {
      return res.status(404).render("errors/common", {
        en,
        cy,
        errorTitle: t.errorTitle || "Not found",
        errorMessage: t.errorMessage || "Artefact not found"
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
          title: t.error403Title || "Forbidden",
          message: t.error403Message || "You do not have permission to view this content"
        },
        cy: {
          title: t.error403Title || "Gwaharddedig",
          message: t.error403Message || "Nid oes gennych ganiatâd i weld y cynnwys hwn"
        }
      });
    }

    const jsonFilePath = path.join(TEMP_UPLOAD_DIR, `${artefactId}.json`);

    let jsonContent: string;
    try {
      jsonContent = await readFile(jsonFilePath, "utf-8");
    } catch (error) {
      console.error(`[ast-daily-hearing-list] Error reading JSON file at ${jsonFilePath}:`, error);
      return res.status(404).render("errors/common", {
        en,
        cy,
        errorTitle: t.errorTitle || "Error",
        errorMessage: t.errorMessage || "File not found"
      });
    }

    const listData: AstDailyHearingList = JSON.parse(jsonContent);

    const validationResult = validate(listData);
    if (!validationResult.isValid) {
      console.error("Validation errors:", validationResult.errors);
      return res.status(400).render("errors/common", {
        en,
        cy,
        errorTitle: "Invalid Data",
        errorMessage: "The list data is invalid"
      });
    }

    const { header, hearings } = renderAstDailyHearingListData(listData, {
      locale,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle: t.listName
    });

    const dataSource = PROVENANCE_LABELS[artefact.provenance] || artefact.provenance;

    res.render("(list-types)/ast-daily-hearing-list/index", {
      en,
      cy,
      t,
      title: header.listTitle,
      header,
      hearings,
      dataSource
    });
  } catch (error) {
    console.error("[ast-daily-hearing-list] Unexpected error:", error);
    return res.status(500).render("errors/common", {
      en,
      cy,
      errorTitle: t.errorTitle || "Error",
      errorMessage: t.errorMessage || "An unexpected error occurred"
    });
  }
};
