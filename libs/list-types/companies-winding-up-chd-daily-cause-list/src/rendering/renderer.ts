import { formatDisplayDate, formatLastUpdatedDateTime } from "@hmcts/list-types-common";
import type { CompaniesWindingUpHearing, CompaniesWindingUpHearingList } from "../models/types.js";

export interface RenderOptions {
  locale: string;
  contentDate: Date;
  lastReceivedDate: string;
}

export interface RenderedData {
  header: {
    listTitle: string;
    listDate: string;
    lastUpdatedDate: string;
    lastUpdatedTime: string;
  };
  hearings: CompaniesWindingUpHearing[];
}

export function renderCompaniesWindingUpChdDailyCauseList(hearingList: CompaniesWindingUpHearingList, options: RenderOptions): RenderedData {
  const listDate = formatDisplayDate(options.contentDate, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);

  return {
    header: {
      listTitle:
        options.locale === "cy" ? "Rhestr Achosion Dyddiol Dirwyn Cwmnïau i Ben (Adran Siawnsri)" : "Companies Winding Up (Chancery Division) Daily Cause List",
      listDate,
      lastUpdatedDate,
      lastUpdatedTime
    },
    hearings: hearingList.map((hearing) => ({ ...hearing }))
  };
}
