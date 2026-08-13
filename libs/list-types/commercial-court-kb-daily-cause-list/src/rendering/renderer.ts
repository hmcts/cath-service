import { type ChdKbHearing, type ChdKbHearingList, renderChdKbHearingList } from "@hmcts/chd-kb-common";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

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
  hearings: ChdKbHearing[];
}

// Rendering logic is shared with future list types via @hmcts/chd-kb-common. The list title is
// specific to this list type, so it is sourced from this package's own locale files and passed in.
export function renderCommercialCourtKbDailyCauseList(hearingList: ChdKbHearingList, options: RenderOptions): RenderedData {
  const t = options.locale === "cy" ? cy : en;

  return renderChdKbHearingList(hearingList, { ...options, listTitle: t.pageTitle });
}
