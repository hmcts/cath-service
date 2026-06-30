import {
  type CareStandardsTribunalHearingList,
  careStandardsTribunalWeeklyHearingListCy as cy,
  careStandardsTribunalWeeklyHearingListEn as en,
  renderCareStandardsTribunalData
} from "@hmcts/care-standards-tribunal-weekly-hearing-list";
import { schemaPath } from "@hmcts/care-standards-tribunal-weekly-hearing-list/config";
import { createJsonValidator } from "@hmcts/list-types-common";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

export const GET = createSimpleListTypeHandler<CareStandardsTribunalHearingList>({
  en,
  cy,
  validate,
  logPrefix: "care-standards-tribunal-weekly-hearing-list",
  serverError: { errorTitle: "Server Error", errorMessage: "An error occurred while loading the list" },
  render: ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, hearings } = renderCareStandardsTribunalData(jsonData, {
      locale,
      courtName: "Care Standards Tribunal",
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle: t.pageTitle
    });
    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });
    res.render("care-standards-tribunal-weekly-hearing-list", { en, cy, t, title: header.listTitle, header, hearings, dataSource });
  }
});
