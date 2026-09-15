import {
  interimApplicationsChdDailyCauseListCy as cy,
  interimApplicationsChdDailyCauseListEn as en,
  type InterimApplicationsChdData,
  renderInterimApplicationsChdDailyCauseList,
  validateInterimApplicationsChdDailyCauseList
} from "@hmcts/interim-applications-chd-daily-cause-list";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

const validate = validateInterimApplicationsChdDailyCauseList;

const SUPPORTED_LIST_TYPE = "INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST";

export const GET = createSimpleListTypeHandler<InterimApplicationsChdData>({
  en,
  cy,
  validate,
  logPrefix: "interim-applications-chd-daily-cause-list",
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
    const { header, hearings, importantInfo } = renderInterimApplicationsChdDailyCauseList(jsonData, {
      locale,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString()
    });
    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });
    res.render("interim-applications-chd-daily-cause-list", { en, cy, t, title: header.listTitle, header, hearings, importantInfo, dataSource });
  }
});
