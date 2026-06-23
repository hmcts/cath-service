import {
  type CourtOfAppealCivilData,
  courtOfAppealCivilDailyCauseListCy as cy,
  courtOfAppealCivilDailyCauseListEn as en,
  renderCourtOfAppealCivil
} from "@hmcts/court-of-appeal-civil-daily-cause-list";
import { schemaPath } from "@hmcts/court-of-appeal-civil-daily-cause-list/config";
import { createJsonValidator } from "@hmcts/list-types-common";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

export const ROUTES = ["/court-of-appeal-civil-division-daily-cause-list"];

const validate = createJsonValidator(schemaPath);

const COURT_OF_APPEAL_CIVIL_LIST_TYPE_ID = 19;

export const GET = createSimpleListTypeHandler<CourtOfAppealCivilData>({
  en,
  cy,
  validate,
  logPrefix: "court-of-appeal-civil-daily-cause-list",
  guardArtefact: (artefact, res) => {
    if (artefact.listTypeId !== COURT_OF_APPEAL_CIVIL_LIST_TYPE_ID) {
      return res.status(400).render("errors/common", {
        en,
        cy,
        errorTitle: "Invalid List Type",
        errorMessage: "This list type is not supported by this module"
      });
    }
    return undefined;
  },
  render: ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, dailyHearings, futureJudgments } = renderCourtOfAppealCivil(jsonData, {
      locale,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString()
    });
    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });
    res.render("court-of-appeal-civil-daily-cause-list", { en, cy, t, title: header.listTitle, header, dailyHearings, futureJudgments, dataSource });
  }
});
