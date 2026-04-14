import { formatDisplayDate, formatLastUpdatedDateTime, normaliseHearings } from "@hmcts/list-types-common";
import type { AdministrativeCourtHearing, AdministrativeCourtHearingList } from "../models/types.js";

export interface RenderOptions {
  locale: string;
  listTypeId: number;
  listTitle: string;
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
  hearings: AdministrativeCourtHearing[];
}

export function renderAdminCourt(hearingList: AdministrativeCourtHearingList, options: RenderOptions): RenderedData {
  const listDate = formatDisplayDate(options.contentDate, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);

  return {
    header: {
      listTitle: options.listTitle,
      listDate,
      lastUpdatedDate,
      lastUpdatedTime
    },
    hearings: normaliseHearings(hearingList)
  };
}
