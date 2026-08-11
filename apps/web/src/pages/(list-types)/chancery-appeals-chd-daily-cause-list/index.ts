import {
  type ChanceryAppealsChdHearingList,
  chanceryAppealsChdDailyCauseListCy as cy,
  chanceryAppealsChdDailyCauseListEn as en,
  renderChanceryAppealsChdDailyCauseList
} from "@hmcts/chancery-appeals-chd-daily-cause-list";
import { validateChdKbListType } from "@hmcts/chd-kb-common";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

const validate = validateChdKbListType;

const SUPPORTED_LIST_TYPE = "CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST";

export const GET = createSimpleListTypeHandler<ChanceryAppealsChdHearingList>({
  en,
  cy,
  validate,
  logPrefix: "chancery-appeals-chd-daily-cause-list",
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
    const { header, hearings } = renderChanceryAppealsChdDailyCauseList(jsonData, {
      locale,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString()
    });
    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });
    res.render("chancery-appeals-chd-daily-cause-list", { en, cy, t, title: header.listTitle, header, hearings, dataSource });
  }
});
