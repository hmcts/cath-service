import {
  type AstDailyHearingList,
  astDailyHearingListCy as cy,
  astDailyHearingListEn as en,
  renderAstDailyHearingListData
} from "@hmcts/ast-daily-hearing-list";
import { schemaPath } from "@hmcts/ast-daily-hearing-list/config";
import { createJsonValidator } from "@hmcts/list-types-common";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

export const GET = createSimpleListTypeHandler<AstDailyHearingList>({
  en,
  cy,
  validate,
  logPrefix: "ast-daily-hearing-list",
  serverError: { errorTitle: "Server Error", errorMessage: "An error occurred while loading the list" },
  render: ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, hearings } = renderAstDailyHearingListData(jsonData, {
      locale,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle: t.pageTitle
    });
    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });
    res.render("ast-daily-hearing-list", { en, cy, t, title: header.listTitle, header, hearings, dataSource });
  }
});
