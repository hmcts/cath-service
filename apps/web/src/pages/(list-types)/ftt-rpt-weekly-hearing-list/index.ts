import { fttRptWeeklyHearingListCy as cy, fttRptWeeklyHearingListEn as en, type FttRptHearingList, renderFttRptData } from "@hmcts/ftt-rpt-weekly-hearing-list";
import { schemaPath } from "@hmcts/ftt-rpt-weekly-hearing-list/config";
import { createJsonValidator } from "@hmcts/list-types-common";
import type { Artefact } from "@hmcts/publication";
import type { Response } from "express";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

const LIST_TYPE_CONFIG: Record<number, { courtName: string; enTitle: string; cyTitle: string }> = {
  33: {
    courtName: "First-tier Tribunal (Residential Property Tribunal): Eastern region",
    enTitle: en.rptEasternPageTitle,
    cyTitle: cy.rptEasternPageTitle
  },
  34: {
    courtName: "First-tier Tribunal (Residential Property Tribunal): London region",
    enTitle: en.rptLondonPageTitle,
    cyTitle: cy.rptLondonPageTitle
  },
  35: {
    courtName: "First-tier Tribunal (Residential Property Tribunal): Midlands region",
    enTitle: en.rptMidlandsPageTitle,
    cyTitle: cy.rptMidlandsPageTitle
  },
  36: {
    courtName: "First-tier Tribunal (Residential Property Tribunal): Northern region",
    enTitle: en.rptNorthernPageTitle,
    cyTitle: cy.rptNorthernPageTitle
  },
  37: {
    courtName: "First-tier Tribunal (Residential Property Tribunal): Southern region",
    enTitle: en.rptSouthernPageTitle,
    cyTitle: cy.rptSouthernPageTitle
  }
};

function guardArtefact(artefact: Artefact, res: Response): boolean {
  if (!LIST_TYPE_CONFIG[artefact.listTypeId]) {
    res.status(400).render("errors/common", {
      en,
      cy,
      errorTitle: "Invalid List Type",
      errorMessage: "This list type is not supported by this module"
    });
    return true;
  }
  return false;
}

export const GET = createSimpleListTypeHandler<FttRptHearingList>({
  en,
  cy,
  validate,
  logPrefix: "ftt-rpt-weekly-hearing-list",
  serverError: { errorTitle: "Server Error", errorMessage: "An error occurred while loading the list" },
  guardArtefact,
  render: ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const listTypeConfig = LIST_TYPE_CONFIG[artefact.listTypeId];
    const listTitle = locale === "cy" ? listTypeConfig.cyTitle : listTypeConfig.enTitle;

    const { header, hearings } = renderFttRptData(jsonData, {
      locale,
      courtName: listTypeConfig.courtName,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle
    });

    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });

    res.render("ftt-rpt-weekly-hearing-list", { en, cy, t, title: header.listTitle, header, hearings, dataSource });
  }
});
