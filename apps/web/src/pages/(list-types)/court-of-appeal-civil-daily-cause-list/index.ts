import {
  type CourtOfAppealCivilData,
  courtOfAppealCivilDailyCauseListCy as cy,
  courtOfAppealCivilDailyCauseListEn as en,
  renderCourtOfAppealCivil
} from "@hmcts/court-of-appeal-civil-daily-cause-list";
import { schemaPath } from "@hmcts/court-of-appeal-civil-daily-cause-list/config";
import { createJsonValidator } from "@hmcts/list-types-common";
import { getArtefactById, getPublicationJson, PROVENANCE_LABELS } from "@hmcts/publication";
import type { Request, Response } from "express";

export const ROUTES = ["/court-of-appeal-civil-division-daily-cause-list"];

const validate = createJsonValidator(schemaPath);

export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const artefactId = typeof req.query.artefactId === "string" ? req.query.artefactId : undefined;

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

    // Verify this is list type 19 (Court of Appeal Civil Division)
    if (artefact.listTypeId !== 19) {
      return res.status(400).render("errors/common", {
        en,
        cy,
        errorTitle: "Invalid List Type",
        errorMessage: "This list type is not supported by this module"
      });
    }

    const jsonData: CourtOfAppealCivilData = (await getPublicationJson(artefactId)) as CourtOfAppealCivilData;
    if (!jsonData) {
      console.error(`[court-of-appeal-civil-daily-cause-list] Blob not found for artefactId: ${artefactId}`);
      return res.status(404).render("errors/common", {
        en,
        cy,
        errorTitle: "Not Found",
        errorMessage: "The requested list could not be found"
      });
    }

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

    const { header, dailyHearings, futureJudgments } = renderCourtOfAppealCivil(jsonData, {
      locale,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString()
    });

    const dataSource =
      t.provenanceLabels?.[artefact.provenance as keyof typeof t.provenanceLabels] || PROVENANCE_LABELS[artefact.provenance] || artefact.provenance;

    res.render("court-of-appeal-civil-daily-cause-list", {
      en,
      cy,
      t,
      title: header.listTitle,
      header,
      dailyHearings,
      futureJudgments,
      dataSource
    });
  } catch (error) {
    console.error("Error rendering Court of Appeal (Civil Division) list:", error);
    return res.status(500).render("errors/common", {
      en,
      cy,
      errorTitle: "Error",
      errorMessage: "An error occurred while displaying the list"
    });
  }
};
