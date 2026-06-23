import { createJsonValidator } from "@hmcts/list-types-common";
import {
  londonAdministrativeCourtDailyCauseListCy as cy,
  londonAdministrativeCourtDailyCauseListEn as en,
  type LondonAdminCourtData,
  renderLondonAdminCourt
} from "@hmcts/london-administrative-court-daily-cause-list";
import { schemaPath } from "@hmcts/london-administrative-court-daily-cause-list/config";
import { getArtefactById, getPublicationJson, PROVENANCE_LABELS } from "@hmcts/publication";
import type { Request, Response } from "express";

export const ROUTES = ["/london-administrative-court-daily-cause-list"];

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

    // Verify this is list type 18 (London Administrative Court)
    if (artefact.listTypeId !== 18) {
      return res.status(400).render("errors/common", {
        en,
        cy,
        errorTitle: "Invalid List Type",
        errorMessage: "This list type is not supported by this module"
      });
    }

    const jsonData: LondonAdminCourtData = (await getPublicationJson(artefactId)) as LondonAdminCourtData;
    if (!jsonData) {
      console.error(`[london-administrative-court-daily-cause-list] Blob not found for artefactId: ${artefactId}`);
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

    const { header, mainHearings, planningCourt } = renderLondonAdminCourt(jsonData, {
      locale,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString()
    });

    const dataSource =
      t.provenanceLabels?.[artefact.provenance as keyof typeof t.provenanceLabels] || PROVENANCE_LABELS[artefact.provenance] || artefact.provenance;

    res.render("london-administrative-court-daily-cause-list", {
      en,
      cy,
      t,
      title: header.listTitle,
      header,
      mainHearings,
      planningCourt,
      dataSource
    });
  } catch (error) {
    console.error("Error rendering London Administrative Court list:", error);
    return res.status(500).render("errors/common", {
      en,
      cy,
      errorTitle: "Error",
      errorMessage: "An error occurred while displaying the list"
    });
  }
};
