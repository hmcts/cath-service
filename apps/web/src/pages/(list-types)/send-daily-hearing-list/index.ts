import { createJsonValidator } from "@hmcts/list-types-common";
import {
  sendDailyHearingListCy as cy,
  sendDailyHearingListEn as en,
  renderSendDailyHearingListData,
  type SendDailyHearingList
} from "@hmcts/send-daily-hearing-list";
import { schemaPath } from "@hmcts/send-daily-hearing-list/config";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

export const GET = createSimpleListTypeHandler<SendDailyHearingList>({
  en,
  cy,
  validate,
  logPrefix: "send-daily-hearing-list",
  serverError: { errorTitle: "Server Error", errorMessage: "An error occurred while loading the list" },
  render: ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, hearings } = renderSendDailyHearingListData(jsonData, {
      locale,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle: t.pageTitle
    });
    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });
    res.render("send-daily-hearing-list", { en, cy, t, title: header.listTitle, header, hearings, dataSource });
  }
});
