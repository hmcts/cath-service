import { fttRptWeeklyHearingListCy as cy, fttRptWeeklyHearingListEn as en, type FttRptHearingList, renderFttRptData } from "@hmcts/ftt-rpt-weekly-hearing-list";
import { schemaPath } from "@hmcts/ftt-rpt-weekly-hearing-list/config";
import { createJsonValidator } from "@hmcts/list-types-common";
import type { Artefact } from "@hmcts/publication";
import type { Response } from "express";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

const LIST_TYPE_CONFIG: Record<string, { enCourtName: string; cyCourtName: string; enTitle: string; cyTitle: string }> = {
  FTT_RPT_EASTERN_WEEKLY_HEARING_LIST: {
    enCourtName: en.rptEasternCourtName,
    cyCourtName: cy.rptEasternCourtName,
    enTitle: en.rptEasternPageTitle,
    cyTitle: cy.rptEasternPageTitle
  },
  FTT_RPT_LONDON_WEEKLY_HEARING_LIST: {
    enCourtName: en.rptLondonCourtName,
    cyCourtName: cy.rptLondonCourtName,
    enTitle: en.rptLondonPageTitle,
    cyTitle: cy.rptLondonPageTitle
  },
  FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST: {
    enCourtName: en.rptMidlandsCourtName,
    cyCourtName: cy.rptMidlandsCourtName,
    enTitle: en.rptMidlandsPageTitle,
    cyTitle: cy.rptMidlandsPageTitle
  },
  FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST: {
    enCourtName: en.rptNorthernCourtName,
    cyCourtName: cy.rptNorthernCourtName,
    enTitle: en.rptNorthernPageTitle,
    cyTitle: cy.rptNorthernPageTitle
  },
  FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST: {
    enCourtName: en.rptSouthernCourtName,
    cyCourtName: cy.rptSouthernCourtName,
    enTitle: en.rptSouthernPageTitle,
    cyTitle: cy.rptSouthernPageTitle
  }
};

function guardArtefact(artefact: Artefact, res: Response): boolean {
  if (!artefact.listTypeName || !LIST_TYPE_CONFIG[artefact.listTypeName]) {
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
    const listTypeConfig = LIST_TYPE_CONFIG[artefact.listTypeName ?? ""];
    if (!listTypeConfig) {
      res.status(500).render("errors/common", { en, cy, errorTitle: "Server Error", errorMessage: "An error occurred while loading the list" });
      return;
    }
    const courtName = locale === "cy" ? listTypeConfig.cyCourtName : listTypeConfig.enCourtName;
    const listTitle = locale === "cy" ? listTypeConfig.cyTitle : listTypeConfig.enTitle;

    const { header, hearings } = renderFttRptData(jsonData, {
      locale,
      courtName,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle
    });

    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });

    res.render("ftt-rpt-weekly-hearing-list", { en, cy, t, title: header.listTitle, header, hearings, dataSource });
  }
});
