import {
  phtWeeklyHearingListCy as cy,
  phtWeeklyHearingListEn as en,
  type PhtHearingList,
  renderPhtData,
  validatePhtWeeklyHearingList
} from "@hmcts/pht-weekly-hearing-list";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

export const GET = createSimpleListTypeHandler<PhtHearingList>({
  en,
  cy,
  validate: validatePhtWeeklyHearingList,
  logPrefix: "pht-weekly-hearing-list",
  serverError: { errorTitle: "Server Error", errorMessage: "An error occurred while loading the list" },
  render: ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, hearings } = renderPhtData(jsonData, {
      locale,
      courtName: "Primary Health Tribunal",
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle: t.pageTitle
    });
    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });
    res.render("pht-weekly-hearing-list", { en, cy, t, title: header.listTitle, header, hearings, dataSource });
  }
});
