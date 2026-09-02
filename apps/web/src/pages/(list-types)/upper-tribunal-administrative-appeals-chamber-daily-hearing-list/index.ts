import { createJsonValidator } from "@hmcts/list-types-common";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import {
  upperTribunalAdministrativeAppealsChamberDailyHearingListCy as cy,
  upperTribunalAdministrativeAppealsChamberDailyHearingListEn as en,
  renderUtaacDailyHearingListData,
  type UtaacHearingList
} from "@hmcts/upper-tribunal-administrative-appeals-chamber-daily-hearing-list";
import { schemaPath } from "@hmcts/upper-tribunal-administrative-appeals-chamber-daily-hearing-list/config";
import { createSimpleListTypeHandler } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

export const GET = createSimpleListTypeHandler<UtaacHearingList>({
  en,
  cy,
  validate,
  logPrefix: "upper-tribunal-administrative-appeals-chamber-daily-hearing-list",
  render: ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const { header, hearings } = renderUtaacDailyHearingListData(jsonData, {
      locale,
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle: t.pageTitle
    });
    const dataSource = PROVENANCE_LABELS[artefact.provenance] || artefact.provenance;
    res.render("upper-tribunal-administrative-appeals-chamber-daily-hearing-list", {
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
