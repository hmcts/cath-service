import { createJsonValidator } from "@hmcts/list-types-common";
import { listTypeData } from "@hmcts/location";
import {
  sscsDailyHearingListCy as cy,
  sscsDailyHearingListEn as en,
  importantInformationByListType,
  renderSscsDailyHearingListData,
  type SscsDailyHearingList
} from "@hmcts/sscs-daily-hearing-list";
import { schemaPath } from "@hmcts/sscs-daily-hearing-list/config";
import { createSimpleListTypeHandler, resolveDataSource } from "../list-type-handler.js";

const validate = createJsonValidator(schemaPath);

function getListTypeName(listTypeId: number): string | undefined {
  return listTypeData.find((lt) => lt.id === listTypeId)?.name;
}

function getImportantInformationText(listTypeName: string | undefined): string {
  if (listTypeName && importantInformationByListType[listTypeName]) {
    return importantInformationByListType[listTypeName];
  }
  return "";
}

export const GET = createSimpleListTypeHandler<SscsDailyHearingList>({
  en,
  cy,
  validate,
  logPrefix: "sscs-daily-hearing-list",
  render: ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;
    const listTypeEntry = listTypeData.find((lt) => lt.id === artefact.listTypeId);
    const listTitle =
      locale === "cy"
        ? (listTypeEntry?.welshFriendlyName ?? listTypeEntry?.englishFriendlyName ?? t.listForDate)
        : (listTypeEntry?.englishFriendlyName ?? t.listForDate);

    const { header, hearings } = renderSscsDailyHearingListData(jsonData, {
      locale,
      courtName: String(listTitle),
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle: String(listTitle)
    });

    const listTypeName = getListTypeName(artefact.listTypeId);
    const importantInformationText = getImportantInformationText(listTypeName);
    const dataSource = resolveDataSource(artefact.provenance, t);

    res.render("sscs-daily-hearing-list", {
      en,
      cy,
      t,
      title: header.listTitle,
      header,
      hearings,
      importantInformationText,
      dataSource
    });
  }
});
