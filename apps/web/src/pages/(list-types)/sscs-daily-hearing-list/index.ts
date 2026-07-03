import { createJsonValidator } from "@hmcts/list-types-common";
import { prisma } from "@hmcts/postgres-prisma";
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
  render: async ({ artefact, jsonData, locale, res }) => {
    const t = locale === "cy" ? cy : en;

    const dbListType = await prisma.listType.findUnique({
      where: { id: artefact.listTypeId },
      select: { name: true, friendlyName: true, welshFriendlyName: true }
    });

    const listTitle =
      locale === "cy" ? (dbListType?.welshFriendlyName ?? dbListType?.friendlyName ?? t.listForDate) : (dbListType?.friendlyName ?? t.listForDate);

    const { header, hearings } = renderSscsDailyHearingListData(jsonData, {
      locale,
      courtName: String(listTitle),
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle: String(listTitle)
    });

    const importantInformationText = getImportantInformationText(dbListType?.name ?? undefined);
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
