import { readFile } from "node:fs/promises";
import path from "node:path";
import { TEMP_STORAGE_BASE } from "@hmcts/list-types-common";
import { prisma } from "@hmcts/postgres-prisma";
import { canAccessPublicationData, getArtefactById, type ListType, PROVENANCE_LABELS } from "@hmcts/publication";
import type { Request, Response } from "express";
import { renderCrownFirmListData } from "../rendering/renderer.js";
import { validateCrownFirmList } from "../validation/json-validator.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

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
        en: { title: en.error403Title, message: en.error403Message },
        cy: { title: cy.error403Title, message: cy.error403Message }
      });
    }

    const jsonFilePath = path.join(TEMP_STORAGE_BASE, `${artefactId}.json`);

    let jsonContent: string;
    try {
      jsonContent = await readFile(jsonFilePath, "utf-8");
    } catch {
      return res.status(404).render("errors/common", {
        en,
        cy,
        errorTitle: t.errorTitle,
        errorMessage: t.errorMessage
      });
    }

    const jsonData = JSON.parse(jsonContent);

    const validationResult = validateCrownFirmList(jsonData);
    if (!validationResult.isValid) {
      return res.status(400).render("errors/common", {
        en,
        cy,
        errorTitle: t.errorTitle,
        errorMessage: t.errorMessage
      });
    }

    const { header, openJustice, listData, groupedListData } = await renderCrownFirmListData(jsonData, {
      locationId: artefact.locationId,
      contentDate: artefact.contentDate,
      locale
    });

    const dataSource = PROVENANCE_LABELS[artefact.provenance] || artefact.provenance;

    res.render("crown-firm-list", {
      en,
      cy,
      title: t.title,
      header,
      openJustice,
      listData,
      groupedListData,
      dataSource,
      t
    });
  } catch (error) {
    console.error("[crown-firm-list] Unexpected error:", { artefactId, error: error instanceof Error ? error.message : String(error) });
    return res.status(500).render("errors/common", {
      en,
      cy,
      errorTitle: t.errorTitle,
      errorMessage: t.errorMessage
    });
  }
};
