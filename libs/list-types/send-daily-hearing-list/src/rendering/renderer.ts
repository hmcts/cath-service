import type { SendDailyHearingList } from "../models/types.js";

export interface RenderedSendData {
  header: {
    listName: string;
    contentDate: string;
    lastUpdatedDate: string;
    lastUpdatedTime: string;
  };
  hearings: SendDailyHearingList;
}

export interface RenderOptions {
  locale: string;
  contentDate: Date;
  lastReceivedDate: string;
  listTitle: string;
}

export function renderSendData(jsonData: SendDailyHearingList, options: RenderOptions): RenderedSendData {
  const contentDateStr = options.contentDate.toLocaleDateString(options.locale === "cy" ? "cy-GB" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const lastUpdated = new Date(options.lastReceivedDate);
  const lastUpdatedDateStr = lastUpdated.toLocaleDateString(options.locale === "cy" ? "cy-GB" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const lastUpdatedTimeStr = lastUpdated.toLocaleTimeString(options.locale === "cy" ? "cy-GB" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  });

  return {
    header: {
      listName: options.listTitle,
      contentDate: contentDateStr,
      lastUpdatedDate: lastUpdatedDateStr,
      lastUpdatedTime: lastUpdatedTimeStr
    },
    hearings: jsonData
  };
}
