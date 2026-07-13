import { createJsonValidator } from "@hmcts/list-types-common";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import {
  upperTribunalLandsChamberDailyHearingListCy as cy,
  upperTribunalLandsChamberDailyHearingListEn as en,
  renderUtlcDailyHearingListData,
  type UtlcHearingList
} from "@hmcts/upper-tribunal-lands-chamber-daily-hearing-list";
import { schemaPath } from "@hmcts/upper-tribunal-lands-chamber-daily-hearing-list/config";
import { createSimpleListTypeHandler } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

export const GET = createSimpleListTypeHandler<UtlcHearingList>({
  en,
  cy,
  validate,
  logPrefix: "upper-tribunal-lands-chamber-daily-hearing-list",
  render: ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, hearings } = renderUtlcDailyHearingListData(jsonData, {
      locale,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle: t.pageTitle
    });
    const dataSource = PROVENANCE_LABELS[artefact.provenance] || artefact.provenance;
    res.render("upper-tribunal-lands-chamber-daily-hearing-list", {
      en,
      cy,
      t,
      title: header.listTitle,
      header,
      hearings,
      dataSource,
      pdfDownloadUrl: `/api/pdf/${artefact.artefactId}/download`
    });
  }
});
