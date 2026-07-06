import { createJsonValidator } from "@hmcts/list-types-common";
import {
  wpafccWeeklyHearingListCy as cy,
  wpafccWeeklyHearingListEn as en,
  renderWpafccWeeklyHearingListData,
  type WpafccWeeklyHearingList
} from "@hmcts/wpafcc-weekly-hearing-list";
import { schemaPath } from "@hmcts/wpafcc-weekly-hearing-list/config";
import { createSimpleListTypeHandler, LIST_LOAD_SERVER_ERROR, resolveDataSource } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

export const GET = createSimpleListTypeHandler<WpafccWeeklyHearingList>({
  en,
  cy,
  validate,
  logPrefix: "wpafcc-weekly-hearing-list",
  serverError: LIST_LOAD_SERVER_ERROR,
  render: ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, hearings } = renderWpafccWeeklyHearingListData(jsonData, {
      locale,
      courtName: t.courtName as string,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle: t.pageTitle as string
    });
    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });
    res.render("wpafcc-weekly-hearing-list", { en, cy, t, title: header.listTitle, header, hearings, dataSource });
  }
});
