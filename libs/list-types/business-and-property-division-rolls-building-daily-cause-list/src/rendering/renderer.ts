import { formatDisplayDate, formatLastUpdatedDateTime, normaliseHearings } from "@hmcts/list-types-common";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { BusinessAndPropertyRollsData, ChdKbHearing } from "../models/types.js";
import { SECTIONS, type SectionKey } from "../sections.js";

export interface RenderOptions {
  locale: string;
  contentDate: Date;
  lastReceivedDate: string;
}

export interface RenderedSection {
  key: SectionKey;
  title: string;
  hearings: ChdKbHearing[];
}

export interface RenderedData {
  header: {
    listTitle: string;
    listDate: string;
    lastUpdatedDate: string;
    lastUpdatedTime: string;
  };
  sections: RenderedSection[];
}

export function renderBusinessAndPropertyRolls(data: BusinessAndPropertyRollsData, options: RenderOptions): RenderedData {
  const listDate = formatDisplayDate(options.contentDate, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);
  const t = options.locale === "cy" ? cy : en;

  const sections = SECTIONS.map((section) => ({
    key: section.key,
    title: options.locale === "cy" ? section.cy : section.en,
    hearings: normaliseHearings(data[section.key] ?? []) as ChdKbHearing[]
  }));

  return {
    header: {
      listTitle: t.pageTitle,
      listDate,
      lastUpdatedDate,
      lastUpdatedTime
    },
    sections
  };
}
