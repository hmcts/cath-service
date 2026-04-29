import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "@hmcts/postgres-prisma";
import { canAccessPublicationData, getArtefactById, type ListType, PROVENANCE_LABELS } from "@hmcts/publication";
import type { Request, Response } from "express";
import { renderCauseListData } from "../rendering/renderer.js";
import { validateCivilFamilyCauseList } from "../validation/json-validator.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Navigate to monorepo root (from libs/list-types/civil-and-family-daily-cause-list/src/pages/)
const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..");
const TEMP_UPLOAD_DIR = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");

export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const artefactId = req.query.artefactId as string;

  console.log(`[civil-and-family-daily-cause-list] GET artefactId=${artefactId} MONOREPO_ROOT=${MONOREPO_ROOT} TEMP_UPLOAD_DIR=${TEMP_UPLOAD_DIR}`);

  if (!artefactId) {
    console.log("[civil-and-family-daily-cause-list] No artefactId provided, returning 400");
    return res.status(400).render("errors/common", {
      en,
      cy,
      errorTitle: t.errorTitle,
      errorMessage: t.errorMessage
    });
  }

  try {
    console.log(`[civil-and-family-daily-cause-list] Looking up artefact ${artefactId}`);
    const artefact = await getArtefactById(artefactId);

    if (!artefact) {
      console.log(`[civil-and-family-daily-cause-list] Artefact not found: ${artefactId}`);
      return res.status(404).render("errors/common", {
        en,
        cy,
        errorTitle: t.errorTitle,
        errorMessage: t.errorMessage
      });
    }

    console.log(`[civil-and-family-daily-cause-list] Artefact found: listTypeId=${artefact.listTypeId} sensitivity=${artefact.sensitivity}`);

    // Check if user has permission to access the publication data
    const dbListType = await prisma.listType.findUnique({
      where: { id: artefact.listTypeId }
    });

    console.log(`[civil-and-family-daily-cause-list] dbListType=${JSON.stringify(dbListType)}`);

    const listType: ListType | undefined = dbListType
      ? {
          id: dbListType.id,
          provenance: dbListType.allowedProvenance,
          isNonStrategic: dbListType.isNonStrategic
        }
      : undefined;

    const canAccess = canAccessPublicationData(req.user, artefact, listType);
    console.log(`[civil-and-family-daily-cause-list] canAccess=${canAccess} user=${JSON.stringify(req.user)}`);

    if (!canAccess) {
      return res.status(403).render("errors/403", {
        en: {
          title: en.error403Title,
          message: en.error403Message
        },
        cy: {
          title: cy.error403Title,
          message: cy.error403Message
        }
      });
    }

    const jsonFilePath = path.join(TEMP_UPLOAD_DIR, `${artefactId}.json`);
    console.log(`[civil-and-family-daily-cause-list] Reading JSON from ${jsonFilePath}`);

    let jsonContent: string;
    try {
      jsonContent = await readFile(jsonFilePath, "utf-8");
      console.log(`[civil-and-family-daily-cause-list] JSON file read successfully (${jsonContent.length} bytes)`);
    } catch (error) {
      console.error(`[civil-and-family-daily-cause-list] Error reading JSON file at ${jsonFilePath}:`, error);
      return res.status(404).render("errors/common", {
        en,
        cy,
        errorTitle: t.errorTitle,
        errorMessage: t.errorMessage
      });
    }

    const jsonData = JSON.parse(jsonContent);

    const validationResult = validateCivilFamilyCauseList(jsonData);
    console.log(`[civil-and-family-daily-cause-list] Validation result: isValid=${validationResult.isValid} errors=${JSON.stringify(validationResult.errors)}`);
    if (!validationResult.isValid) {
      console.error("[civil-and-family-daily-cause-list] Validation errors:", validationResult.errors);
      return res.status(400).render("errors/common", {
        en,
        cy,
        errorTitle: t.errorTitle,
        errorMessage: t.errorMessage
      });
    }

    const { header, openJustice, listData } = await renderCauseListData(jsonData, {
      locationId: artefact.locationId,
      contentDate: artefact.contentDate,
      locale
    });

    const dataSource = PROVENANCE_LABELS[artefact.provenance] || artefact.provenance;

    console.log(`[civil-and-family-daily-cause-list] Rendering successfully`);
    res.render("civil-and-family-daily-cause-list", {
      en,
      cy,
      title: t.title,
      header,
      openJustice,
      listData,
      dataSource,
      t
    });
  } catch (error) {
    console.error("[civil-and-family-daily-cause-list] Unexpected error:", error);
    return res.status(500).render("errors/common", {
      en,
      cy,
      errorTitle: t.errorTitle,
      errorMessage: t.errorMessage
    });
  }
};
