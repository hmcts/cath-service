import { createJsonValidator } from "@hmcts/list-types-common";
import type { Artefact } from "@hmcts/publication";
import {
  siacPoacPaacWeeklyHearingListCy as cy,
  siacPoacPaacWeeklyHearingListEn as en,
  renderSiacPoacPaacData,
  type SiacPoacPaacHearingList
} from "@hmcts/siac-poac-paac-weekly-hearing-list";
import { schemaPath } from "@hmcts/siac-poac-paac-weekly-hearing-list/config";
import type { Response } from "express";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

const LIST_TYPE_CONFIG: Record<string, { courtName: string; enTitle: string; cyTitle: string }> = {
  SIAC_WEEKLY_HEARING_LIST: {
    courtName: "Special Immigration Appeals Commission",
    enTitle: en.siacPageTitle,
    cyTitle: cy.siacPageTitle
  },
  POAC_WEEKLY_HEARING_LIST: {
    courtName: "Proscribed Organisations Appeal Commission",
    enTitle: en.poacPageTitle,
    cyTitle: cy.poacPageTitle
  },
  PAAC_WEEKLY_HEARING_LIST: {
    courtName: "Pathogens Access Appeal Commission",
    enTitle: en.paacPageTitle,
    cyTitle: cy.paacPageTitle
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

export const GET = createSimpleListTypeHandler<SiacPoacPaacHearingList>({
  en,
  cy,
  validate,
  logPrefix: "siac-poac-paac-weekly-hearing-list",
  serverError: { errorTitle: "Server Error", errorMessage: "An error occurred while loading the list" },
  guardArtefact,
  render: ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const listTypeConfig = LIST_TYPE_CONFIG[artefact.listTypeName!];
    const listTitle = locale === "cy" ? listTypeConfig.cyTitle : listTypeConfig.enTitle;

    const { header, hearings } = renderSiacPoacPaacData(jsonData, {
      locale,
      courtName: listTypeConfig.courtName,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle
    });

    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });

    res.render("siac-poac-paac-weekly-hearing-list", { en, cy, t, title: header.listTitle, header, hearings, dataSource });
  }
});
