import type { Artefact } from "@hmcts/publication";
import {
  utiacJrDailyHearingListCy as cy,
  utiacJrDailyHearingListEn as en,
  londonTableHeaders,
  londonTableHeadersCy,
  pageTitleByListType,
  pageTitleByListTypeCy,
  renderUtiacJrDailyHearingListData,
  renderUtiacJrLondonDailyHearingListData,
  type UtiacJrHearingList,
  type UtiacJrLondonHearingList,
  validateUtiacJrAnyDailyHearingList
} from "@hmcts/utiac-jr-daily-hearing-list";
import type { Response } from "express";
import { createSimpleListTypeHandler, LIST_LOAD_SERVER_ERROR, resolveDataSource } from "../list-type-handler.js";

const LONDON_LIST_TYPE_NAME = "UTIAC_JR_LONDON_DAILY_HEARING_LIST";

function renderUtiacJr({ artefact, jsonData, locale, res }: { artefact: Artefact; jsonData: unknown; locale: string; res: Response }): void {
  const listTypeName = artefact.listTypeName ?? "";
  const isLondon = listTypeName === LONDON_LIST_TYPE_NAME;

  const pageTitleMap = locale === "cy" ? pageTitleByListTypeCy : pageTitleByListType;
  const pageTitle = pageTitleMap[listTypeName] ?? listTypeName;

  const t = locale === "cy" ? cy : en;
  const tableHeaders = isLondon ? (locale === "cy" ? londonTableHeadersCy : londonTableHeaders) : t.tableHeaders;

  if (isLondon) {
    const { header, hearings } = renderUtiacJrLondonDailyHearingListData(jsonData as UtiacJrLondonHearingList, {
      locale,
      courtName: "Upper Tribunal (Immigration and Asylum) Chamber",
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle: pageTitle
    });
    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });
    res.render("utiac-jr-london-daily-hearing-list", { en, cy, t: { ...t, tableHeaders }, title: header.listTitle, header, hearings, dataSource });
  } else {
    const { header, hearings } = renderUtiacJrDailyHearingListData(jsonData as UtiacJrHearingList, {
      locale,
      courtName: "Upper Tribunal (Immigration and Asylum) Chamber",
      contentDate: artefact.contentDate,
      lastReceivedDate: artefact.lastReceivedDate.toISOString(),
      listTitle: pageTitle
    });
    const dataSource = resolveDataSource(artefact.provenance, t as { provenanceLabels?: Record<string, string> });
    res.render("utiac-jr-daily-hearing-list", { en, cy, t, title: header.listTitle, header, hearings, dataSource });
  }
}

export const GET = createSimpleListTypeHandler<unknown>({
  en,
  cy,
  validate: validateUtiacJrAnyDailyHearingList,
  logPrefix: "utiac-jr-daily-hearing-list",
  serverError: LIST_LOAD_SERVER_ERROR,
  render: renderUtiacJr
});
