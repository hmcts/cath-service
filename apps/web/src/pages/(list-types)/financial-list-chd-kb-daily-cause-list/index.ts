import { validateChdKbListType } from "@hmcts/chd-kb-common";
import {
  financialListChdKbDailyCauseListCy as cy,
  financialListChdKbDailyCauseListEn as en,
  type FinancialListChdKbHearingList,
  renderFinancialListChdKbDailyCauseList
} from "@hmcts/financial-list-chd-kb-daily-cause-list";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

const validate = validateChdKbListType;

const SUPPORTED_LIST_TYPE = "FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST";

export const GET = createSimpleListTypeHandler<FinancialListChdKbHearingList>({
  en,
  cy,
  validate,
  logPrefix: "financial-list-chd-kb-daily-cause-list",
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
    const { header, hearings } = renderFinancialListChdKbDailyCauseList(jsonData, {
      locale,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString()
    });
    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });
    res.render("financial-list-chd-kb-daily-cause-list", { en, cy, t, title: header.listTitle, header, hearings, dataSource });
  }
});
