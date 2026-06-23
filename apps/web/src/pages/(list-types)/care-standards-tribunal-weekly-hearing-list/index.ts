import {
  type CareStandardsTribunalHearingList,
  careStandardsTribunalWeeklyHearingListCy as cy,
  careStandardsTribunalWeeklyHearingListEn as en,
  renderCareStandardsTribunalData
} from "@hmcts/care-standards-tribunal-weekly-hearing-list";
import { schemaPath } from "@hmcts/care-standards-tribunal-weekly-hearing-list/config";
import { createJsonValidator } from "@hmcts/list-types-common";
import { getArtefactById, getPublicationJson } from "@hmcts/publication";
import type { Request, Response } from "express";

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

    const jsonData: CareStandardsTribunalHearingList = (await getPublicationJson(artefactId)) as CareStandardsTribunalHearingList;
    if (!jsonData) {
      console.error(`[care-standards-tribunal-weekly-hearing-list] Blob not found for artefactId: ${artefactId}`);
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

    const courtName = "Care Standards Tribunal";

    const { header, hearings } = renderCareStandardsTribunalData(jsonData, {
      locale,
      courtName,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle: t.pageTitle
    });

    const dataSource = t.provenanceLabels[artefact.provenance as keyof typeof t.provenanceLabels] || artefact.provenance;

    res.render("care-standards-tribunal-weekly-hearing-list", {
      en,
      cy,
      t,
      title: header.listTitle,
      header,
      hearings,
      dataSource
    });
  } catch (error) {
    console.error("Error rendering Care Standards Tribunal list:", error);
    return res.status(500).render("errors/common", {
      en,
      cy,
      errorTitle: "Server Error",
      errorMessage: "An error occurred while loading the list"
    });
  }
};
