import {
  fttLrtWeeklyHearingListCy as cy,
  fttLrtWeeklyHearingListEn as en,
  type FttLrtHearingList,
  renderFttLrtData
} from "@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list";
import { schemaPath } from "@hmcts/ftt-lands-registration-tribunal-weekly-hearing-list/config";
import { createJsonValidator } from "@hmcts/list-types-common";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

export const GET = createSimpleListTypeHandler<FttLrtHearingList>({
  en,
  cy,
  validate,
  logPrefix: "ftt-lands-registration-tribunal-weekly-hearing-list",
  serverError: { errorTitle: "Server Error", errorMessage: "An error occurred while loading the list" },
  render: ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;

    const { header, hearings } = renderFttLrtData(jsonData, {
      locale,
      courtName: "First-tier Tribunal (Land Registration Tribunal)",
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle: t.pageTitle
    });

    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });

    res.render("ftt-lands-registration-tribunal-weekly-hearing-list", { en, cy, t, title: header.listTitle, header, hearings, dataSource });
  }
});
