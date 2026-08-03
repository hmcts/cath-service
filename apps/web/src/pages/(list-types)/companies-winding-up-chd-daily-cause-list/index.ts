import {
  type CompaniesWindingUpHearingList,
  companiesWindingUpChdDailyCauseListCy as cy,
  companiesWindingUpChdDailyCauseListEn as en,
  renderCompaniesWindingUpChdDailyCauseList
} from "@hmcts/companies-winding-up-chd-daily-cause-list";
import { schemaPath } from "@hmcts/companies-winding-up-chd-daily-cause-list/config";
import { createJsonValidator } from "@hmcts/list-types-common";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

const SUPPORTED_LIST_TYPE = "COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST";

export const GET = createSimpleListTypeHandler<CompaniesWindingUpHearingList>({
  en,
  cy,
  validate,
  logPrefix: "companies-winding-up-chd-daily-cause-list",
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
    const { header, hearings } = renderCompaniesWindingUpChdDailyCauseList(jsonData, {
      locale,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString()
    });
    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });
    res.render("companies-winding-up-chd-daily-cause-list", { en, cy, t, title: header.listTitle, header, hearings, dataSource });
  }
});
