import { formatDisplayDate, formatLastUpdatedDateTime } from "@hmcts/list-types-common";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { InterimApplicationHearing, InterimApplicationsData } from "../models/types.js";

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
  hearings: InterimApplicationHearing[];
  importantInfo: {
    editableParagraph: string;
    staticParagraph: string;
    thirdParagraph: string;
  };
}

// The first paragraph of the "Important information" section is editable per upload: it names the
// interim judge and their contact email from openJusticeStatementDetails[0]. When the array is
// empty (the schema permits it), fall back to the static wording without a name/email.
function buildEditableParagraph(data: InterimApplicationsData, t: typeof en | typeof cy): string {
  const details = data.openJusticeStatementDetails?.[0];

  if (!details || (!details.nameToBeDisplayed && !details.email)) {
    return t.openJusticeFallback;
  }

  return `${t.openJusticeMessage1}${details.nameToBeDisplayed}${t.openJusticeSeparator}${details.email}${t.openJusticeMessage2}`;
}

export function renderInterimApplicationsDailyCauseList(data: InterimApplicationsData, options: RenderOptions): RenderedData {
  const t = options.locale === "cy" ? cy : en;

  const listDate = formatDisplayDate(options.contentDate, options.locale);
  const { date: lastUpdatedDate, time: lastUpdatedTime } = formatLastUpdatedDateTime(options.lastReceivedDate, options.locale);

  return {
    header: {
      listTitle: t.pageTitle,
      listDate,
      lastUpdatedDate,
      lastUpdatedTime
    },
    hearings: data.hearingList.map((hearing) => ({ ...hearing })),
    importantInfo: {
      editableParagraph: buildEditableParagraph(data, t),
      staticParagraph: t.openJusticeMessage3,
      thirdParagraph: t.openJusticeIndividualList
    }
  };
}
