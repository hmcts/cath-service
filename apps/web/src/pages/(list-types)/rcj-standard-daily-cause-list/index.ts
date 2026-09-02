import { createJsonValidator } from "@hmcts/list-types-common";
import {
  rcjStandardDailyCauseListCy as cy,
  rcjStandardDailyCauseListEn as en,
  renderStandardDailyCauseList,
  type StandardHearingList
} from "@hmcts/rcj-standard-daily-cause-list";
import { schemaPath } from "@hmcts/rcj-standard-daily-cause-list/config";
import { createMultiListGuardAndRender, createSimpleListTypeHandler } from "../list-type-handler.js";

export const ROUTES = [
  "/civil-courts-rcj-daily-cause-list",
  "/county-court-central-london-civil-daily-cause-list",
  "/court-of-appeal-criminal-division-daily-cause-list",
  "/family-division-high-court-daily-cause-list",
  "/kings-bench-division-daily-cause-list",
  "/kings-bench-masters-daily-cause-list",
  "/mayor-city-civil-daily-cause-list",
  "/senior-courts-costs-office-daily-cause-list"
];

const validate = createJsonValidator(schemaPath);

const LIST_TYPE_CONFIG: Record<string, { en: string; cy: string; template: string }> = {
  CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST: {
    en: en.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST.pageTitle,
    template: "civil-courts-rcj-daily-cause-list"
  },
  COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST: {
    en: en.COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST.pageTitle,
    template: "county-court-central-london-civil-daily-cause-list"
  },
  COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST: {
    en: en.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST.pageTitle,
    template: "court-of-appeal-criminal-division-daily-cause-list"
  },
  FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST: {
    en: en.FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST.pageTitle,
    template: "family-division-high-court-daily-cause-list"
  },
  KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST: {
    en: en.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST.pageTitle,
    template: "kings-bench-division-daily-cause-list"
  },
  KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST: {
    en: en.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST.pageTitle,
    template: "kings-bench-masters-daily-cause-list"
  },
  MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST: {
    en: en.MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST.pageTitle,
    template: "mayor-city-civil-daily-cause-list"
  },
  SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST: {
    en: en.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST.pageTitle,
    cy: cy.SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST.pageTitle,
    template: "senior-courts-costs-office-daily-cause-list"
  }
};

const { guardArtefact, render } = createMultiListGuardAndRender<StandardHearingList>({
  en,
  cy,
  listTypeConfig: LIST_TYPE_CONFIG,
  renderFn: renderStandardDailyCauseList,
  resolveTemplate: (listConfig) => listConfig.template
});

export const GET = createSimpleListTypeHandler<StandardHearingList>({
  en,
  cy,
  validate,
  logPrefix: "rcj-standard-daily-cause-list",
  guardArtefact,
  render
});
