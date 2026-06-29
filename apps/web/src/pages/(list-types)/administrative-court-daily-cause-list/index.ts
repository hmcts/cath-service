import {
  type AdministrativeCourtHearingList,
  administrativeCourtDailyCauseListCy as cy,
  administrativeCourtDailyCauseListEn as en,
  renderAdminCourt
} from "@hmcts/administrative-court-daily-cause-list";
import { schemaPath } from "@hmcts/administrative-court-daily-cause-list/config";
import { createJsonValidator } from "@hmcts/list-types-common";
import { createMultiListGuardAndRender, createSimpleListTypeHandler } from "../list-type-handler.js";

export const ROUTES = [
  "/birmingham-administrative-court-daily-cause-list",
  "/bristol-cardiff-administrative-court-daily-cause-list",
  "/leeds-administrative-court-daily-cause-list",
  "/manchester-administrative-court-daily-cause-list"
];

const validate = createJsonValidator(schemaPath);

const LIST_TYPE_ID_TO_NAME: Record<number, string> = {
  20: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
  21: "LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
  22: "BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
  23: "MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST"
};

const LIST_TYPE_CONFIG: Record<string, { en: string; cy: string; template: string }> = {
  BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: {
    en: en.BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle,
    template: "birmingham-administrative-court-daily-cause-list"
  },
  LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: {
    en: en.LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle,
    template: "leeds-administrative-court-daily-cause-list"
  },
  BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: {
    en: en.BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle,
    template: "bristol-cardiff-administrative-court-daily-cause-list"
  },
  MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: {
    en: en.MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST.pageTitle,
    template: "manchester-administrative-court-daily-cause-list"
  }
};

const { guardArtefact, render } = createMultiListGuardAndRender<AdministrativeCourtHearingList>({
  en,
  cy,
  listTypeIdToName: LIST_TYPE_ID_TO_NAME,
  listTypeConfig: LIST_TYPE_CONFIG,
  renderFn: renderAdminCourt,
  resolveTemplate: () => "administrative-court-daily-cause-list"
});

export const GET = createSimpleListTypeHandler<AdministrativeCourtHearingList>({
  en,
  cy,
  validate,
  logPrefix: "administrative-court-daily-cause-list",
  guardArtefact,
  render
});
