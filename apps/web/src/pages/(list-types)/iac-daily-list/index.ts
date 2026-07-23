import { iacDailyListCy as cy, iacDailyListEn as en, type IacDailyList, renderIacDailyList } from "@hmcts/iac-daily-list";
import { schemaPath } from "@hmcts/iac-daily-list/config";
import { createJsonValidator } from "@hmcts/list-types-common";
import { createMultiListGuardAndRender, createSimpleListTypeHandler } from "../list-type-handler.js";

export const ROUTES = ["/iac-daily-list", "/iac-daily-list-additional-cases"];

const validate = createJsonValidator(schemaPath);

const LIST_TYPE_CONFIG: Record<string, { en: string; cy: string; template: string }> = {
  IAC_DAILY_LIST: {
    en: en.IAC_DAILY_LIST.pageTitle,
    cy: cy.IAC_DAILY_LIST.pageTitle,
    template: "iac-daily-list"
  },
  IAC_DAILY_LIST_ADDITIONAL_CASES: {
    en: en.IAC_DAILY_LIST_ADDITIONAL_CASES.pageTitle,
    cy: cy.IAC_DAILY_LIST_ADDITIONAL_CASES.pageTitle,
    template: "iac-daily-list-additional-cases"
  }
};

const { guardArtefact, render } = createMultiListGuardAndRender<IacDailyList>({
  en,
  cy,
  listTypeConfig: LIST_TYPE_CONFIG,
  renderFn: renderIacDailyList,
  resolveTemplate: (listConfig) => listConfig.template
});

export const GET = createSimpleListTypeHandler<IacDailyList>({
  en,
  cy,
  validate,
  logPrefix: "iac-daily-list",
  guardArtefact,
  render
});
