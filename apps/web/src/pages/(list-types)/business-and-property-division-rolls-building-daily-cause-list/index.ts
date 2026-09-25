import {
  type BusinessAndPropertyRollsData,
  businessAndPropertyDivisionRollsBuildingDailyCauseListCy as cy,
  businessAndPropertyDivisionRollsBuildingDailyCauseListEn as en,
  renderBusinessAndPropertyRolls
} from "@hmcts/business-and-property-division-rolls-building-daily-cause-list";
import { schemaPath } from "@hmcts/business-and-property-division-rolls-building-daily-cause-list/config";
import { createJsonValidator } from "@hmcts/list-types-common";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

export const ROUTES = ["/business-and-property-division-rolls-building-daily-cause-list"];

const validate = createJsonValidator(schemaPath);

const SUPPORTED_LIST_TYPE = "BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST";

export const GET = createSimpleListTypeHandler<BusinessAndPropertyRollsData>({
  en,
  cy,
  validate,
  logPrefix: "business-and-property-division-rolls-building-daily-cause-list",
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
    const { header, sections } = renderBusinessAndPropertyRolls(jsonData, {
      locale,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString()
    });
    const dataSource =
      resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> }) ||
      PROVENANCE_LABELS[artefact.provenance] ||
      artefact.provenance;
    res.render("business-and-property-division-rolls-building-daily-cause-list", {
      en,
      cy,
      t,
      title: header.listTitle,
      header,
      sections,
      dataSource
    });
  }
});
