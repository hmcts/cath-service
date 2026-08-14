import { validateChdKbListType } from "@hmcts/chd-kb-common";
import {
  type CommercialCourtKbHearingList,
  commercialCourtKbDailyCauseListCy as cy,
  commercialCourtKbDailyCauseListEn as en,
  renderCommercialCourtKbDailyCauseList
} from "@hmcts/commercial-court-kb-daily-cause-list";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

const validate = validateChdKbListType;

const SUPPORTED_LIST_TYPE = "COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST";

export const GET = createSimpleListTypeHandler<CommercialCourtKbHearingList>({
  en,
  cy,
  validate,
  logPrefix: "commercial-court-kb-daily-cause-list",
  guardArtefact: (artefact, res) => {
    if (artefact.listTypeName !== SUPPORTED_LIST_TYPE) {
      res.status(400).render("errors/common", {
        en,
        cy,
        errorTitle: "Invalid List Type",
        errorMessage: "This list type is not supported by this module"
      });
      return true;
    }
    return false;
  },
  render: ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, hearings } = renderCommercialCourtKbDailyCauseList(jsonData, {
      locale,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString()
    });
    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });
    res.render("commercial-court-kb-daily-cause-list", { en, cy, t, title: header.listTitle, header, hearings, dataSource });
  }
});
