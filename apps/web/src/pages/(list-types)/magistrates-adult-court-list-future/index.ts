import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  magistratesAdultCourtListFutureCy as cy,
  magistratesAdultCourtListFutureEn as en,
  renderMagistratesAdultList,
  validateMagistratesAdultCourtListFuture
} from "@hmcts/magistrates-adult-court-list-future";
import { prisma } from "@hmcts/postgres-prisma";
import { canAccessPublicationData, getArtefactById, type ListType, PROVENANCE_LABELS } from "@hmcts/publication";
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
      errorTitle: t.errorTitle,
      errorMessage: t.errorMessage
    });
  }

  try {
    const artefact = await getArtefactById(artefactId);

    if (!artefact) {
      return res.status(404).render("errors/common", {
        en,
        cy,
        errorTitle: t.errorTitle,
        errorMessage: t.errorMessage
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

    let jsonContent: string;
    try {
      jsonContent = await readFile(jsonFilePath, "utf-8");
    } catch (error) {
      console.error(`[magistrates-adult-court-list-future] Error reading JSON file at ${jsonFilePath}:`, error);
      return res.status(404).render("errors/common", {
        en,
        cy,
        errorTitle: t.errorTitle,
        errorMessage: t.errorMessage
      });
    }

    const jsonData = JSON.parse(jsonContent);

    const validationResult = validateMagistratesAdultCourtListFuture(jsonData);
    if (!validationResult.isValid) {
      console.error("[magistrates-adult-court-list-future] Validation errors:", validationResult.errors);
      return res.status(400).render("errors/common", {
        en,
        cy,
        errorTitle: t.errorTitle,
        errorMessage: t.errorMessage
      });
    }

    const { header, listData } = await renderMagistratesAdultList(jsonData, {
      locationId: artefact.locationId,
      contentDate: artefact.contentDate,
      locale
    });

    const dataSource = PROVENANCE_LABELS[artefact.provenance] || artefact.provenance;

    res.render("magistrates-adult-court-list-future", {
      en,
      cy,
      title: t.title,
      header,
      listData,
      dataSource,
      t
    });
  } catch (error) {
    console.error("[magistrates-adult-court-list-future] Unexpected error:", error);
    return res.status(500).render("errors/common", {
      en,
      cy,
      errorTitle: t.errorTitle,
      errorMessage: t.errorMessage
    });
  }
};
