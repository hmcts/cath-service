import {
  cicWeeklyHearingListCy as cy,
  cicWeeklyHearingListEn as en,
  type CicWeeklyHearingList,
  renderCicWeeklyHearingListData
} from "@hmcts/cic-weekly-hearing-list";
import { schemaPath } from "@hmcts/cic-weekly-hearing-list/config";
import { createJsonValidator } from "@hmcts/list-types-common";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

export const GET = createSimpleListTypeHandler<CicWeeklyHearingList>({
  en,
  cy,
  validate,
  logPrefix: "cic-weekly-hearing-list",
  serverError: { errorTitle: "Server Error", errorMessage: "An error occurred while loading the list" },
  render: ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, hearings } = renderCicWeeklyHearingListData(jsonData, {
      locale,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle: t.pageTitle
    });
    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });
    res.render("cic-weekly-hearing-list", { en, cy, t, title: header.listTitle, header, hearings, dataSource });
  }
});
