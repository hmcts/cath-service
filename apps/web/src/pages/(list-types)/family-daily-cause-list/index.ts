import { familyDailyCauseListCy as cy, familyDailyCauseListEn as en, renderCauseListData, validateFamilyDailyCauseList } from "@hmcts/family-daily-cause-list";
import { prisma } from "@hmcts/postgres-prisma";
import { canAccessPublicationData, getArtefactById, getPublicationJson, type ListType, PROVENANCE_LABELS } from "@hmcts/publication";
import type { Request, Response } from "express";

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

    const jsonData = await getPublicationJson(artefactId);
    if (!jsonData) {
      console.error(`[family-daily-cause-list] Blob not found for artefactId: ${artefactId}`);
      return res.status(404).render("errors/common", {
        en,
        cy,
        errorTitle: t.errorTitle,
        errorMessage: t.errorMessage
      });
    }

    const validationResult = validateFamilyDailyCauseList(jsonData);
    if (!validationResult.isValid) {
      console.error("[family-daily-cause-list] Validation errors:", validationResult.errors);
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

    res.render("family-daily-cause-list", {
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
    console.error("[family-daily-cause-list] Unexpected error:", error);
    return res.status(500).render("errors/common", {
      en,
      cy,
      errorTitle: t.errorTitle,
      errorMessage: t.errorMessage
    });
  }
};
