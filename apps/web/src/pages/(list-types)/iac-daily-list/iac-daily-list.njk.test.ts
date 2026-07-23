import path from "node:path";
import { fileURLToPath } from "node:url";
import { iacDailyListCy, iacDailyListEn } from "@hmcts/iac-daily-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "iac-daily-list.njk";

const commonEn = iacDailyListEn.common;
const commonCy = iacDailyListCy.common;

// Rendered case-row columns, in order.
const COLUMN = {
  startTime: 0,
  caseRef: 1,
  appellant: 2,
  respondent: 3,
  language: 4,
  hearingChannel: 5,
  hearingType: 6
} as const;

function buildCase(overrides: Record<string, unknown> = {}) {
  return {
    caseRef: "45684548",
    appellant: "John Doe",
    appellantRepresentative: "Jane Rep",
    prosecutingAuthority: "Home Office",
    language: "English",
    ...overrides
  };
}

function buildSitting(cases: unknown[] = [buildCase()], overrides: Record<string, unknown> = {}) {
  return {
    startTime: "9:30am",
    caseHearingChannel: "VIDEO HEARING",
    hearing: [{ hearingType: "Substantive", case: cases }],
    ...overrides
  };
}

function buildSession(overrides: Record<string, unknown> = {}) {
  return {
    courtRoomName: "Court 1",
    formattedJudiciary: "Judge Smith",
    isBailList: false,
    sittings: [buildSitting()],
    ...overrides
  };
}

function buildCourtList(overrides: Record<string, unknown> = {}) {
  return {
    courtListName: "Substantive List",
    session: [buildSession()],
    ...overrides
  };
}

function baseData(locale: "en" | "cy" = "en") {
  const common = locale === "cy" ? commonCy : commonEn;
  const titles = locale === "cy" ? iacDailyListCy : iacDailyListEn;
  return {
    header: {
      listTitle: titles.IAC_DAILY_LIST.pageTitle,
      venueName: "Manchester",
      contentDate: locale === "cy" ? "15 Ionawr 2026" : "15 January 2026",
      lastUpdatedDate: locale === "cy" ? "14 Ionawr 2026" : "14 January 2026",
      lastUpdatedTime: "12pm"
    },
    common,
    hearings: { courtLists: [] as unknown[] },
    dataSource: "Court and tribunal hearings service"
  };
}

function renderList(courtLists: unknown[] = [], overrides: Record<string, unknown> = {}, locale: "en" | "cy" = "en") {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, hearings: { courtLists } });
}

function firstDataRowCells($: CheerioAPI) {
  return $("tbody.govuk-table__body tr")
    .first()
    .find("td")
    .map((_, el) => $(el).text().trim())
    .get();
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("iac-daily-list template", () => {
  describe("Locale consistency", () => {
    it("should have the same top-level keys in English and Welsh", () => {
      expect(Object.keys(iacDailyListEn).sort()).toEqual(Object.keys(iacDailyListCy).sort());
    });

    it("should have the same common keys in English and Welsh", () => {
      expect(Object.keys(commonEn).sort()).toEqual(Object.keys(commonCy).sort());
    });
  });

  describe("Page header", () => {
    it("should render the list title in the top heading", () => {
      const { $ } = renderList();

      expect($("h1#top").text()).toContain(iacDailyListEn.IAC_DAILY_LIST.pageTitle);
    });

    it("should render the venue name and daily list subheading", () => {
      const { $ } = renderList();

      const subHeading = $("h2.govuk-heading-m").first().text();
      expect(subHeading).toContain(commonEn.heading);
      expect(subHeading).toContain("Manchester");
      expect(subHeading).toContain(commonEn.dailyList);
    });

    it("should render the list date and last updated metadata", () => {
      const { $ } = renderList();

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(`${commonEn.listDate} 15 January 2026`);
      expect(bodyText).toContain(`${commonEn.listUpdated} 14 January 2026 ${commonEn.at} 12pm`);
    });
  });

  describe("Important information details", () => {
    it("should render the details component open by default with the important information title", () => {
      const { $ } = renderList();

      const details = $("details.govuk-details[open]");
      expect(details).toHaveLength(1);
      expect(details.find(".govuk-details__summary-text").text()).toContain(commonEn.importantInformationHeading);
    });

    it("should render all three important information paragraphs", () => {
      const { $ } = renderList();

      const detailsText = $("details.govuk-details").text();
      expect(detailsText).toContain(commonEn.importantInformationP1);
      expect(detailsText).toContain(commonEn.importantInformationP2);
      expect(detailsText).toContain(commonEn.importantInformationP3);
    });
  });

  describe("Search functionality", () => {
    it("should render the search input with an associated label", () => {
      const { $ } = renderList();

      const input = $("#case-search-input");
      expect(input).toHaveLength(1);
      expect(input.attr("name")).toBe("search");
      const label = $("label[for='case-search-input']");
      expect(label.text()).toContain(commonEn.searchCasesLabel);
    });
  });

  describe("Court list and sessions", () => {
    it("should render nothing in the container when there are no court lists", () => {
      const { $ } = renderList([]);

      expect($("#court-lists-container .govuk-accordion")).toHaveLength(0);
    });

    it("should render the court list name as a heading", () => {
      const { $ } = renderList([buildCourtList()]);

      expect($("#court-lists-container h2.govuk-heading-l").text()).toContain("Substantive List");
    });

    it("should render the hearing room prefix for a non-bail session", () => {
      const { $ } = renderList([buildCourtList()]);

      const button = $(".govuk-accordion__section-button").first().text();
      expect(button).toContain(`${commonEn.hearingRoom}: Court 1`);
    });

    it("should render the judge before the court room for a bail list session", () => {
      const { $ } = renderList([buildCourtList({ session: [buildSession({ isBailList: true })] })]);

      const button = $(".govuk-accordion__section-button").first().text();
      expect(button).toContain("Court 1");
      expect(button).toContain(`${commonEn.beforeJudge} Judge Smith`);
    });

    it("should render an accordion section per session", () => {
      const { $ } = renderList([buildCourtList({ session: [buildSession(), buildSession({ courtRoomName: "Court 2" })] })]);

      expect($(".govuk-accordion__section")).toHaveLength(2);
    });
  });

  describe("Cases table", () => {
    it("should render all seven table headers", () => {
      const { $ } = renderList([buildCourtList()]);

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        commonEn.startTime,
        commonEn.caseRef,
        commonEn.appellant,
        commonEn.respondent,
        commonEn.interpreterLanguage,
        commonEn.hearingChannel,
        commonEn.hearingType
      ]);
    });

    it("should place each case field in its correct column", () => {
      const { $ } = renderList([buildCourtList()]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.startTime]).toBe("9:30am");
      expect(cells[COLUMN.caseRef]).toBe("45684548");
      expect(cells[COLUMN.appellant]).toContain("John Doe");
      expect(cells[COLUMN.respondent]).toBe("Home Office");
      expect(cells[COLUMN.language]).toBe("English");
      expect(cells[COLUMN.hearingChannel]).toBe("VIDEO HEARING");
      expect(cells[COLUMN.hearingType]).toBe("Substantive");
    });

    it("should render the representative when one is present", () => {
      const { $ } = renderList([buildCourtList()]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.appellant]).toContain(`${commonEn.rep}: Jane Rep`);
    });

    it("should render the no-representative label when there is no representative", () => {
      const { $ } = renderList([buildCourtList({ session: [buildSession({ sittings: [buildSitting([buildCase({ appellantRepresentative: "" })])] })] })]);

      const cells = firstDataRowCells($);
      expect(cells[COLUMN.appellant]).toContain(`${commonEn.rep}: ${commonEn.noRep}`);
    });

    it("should render a row per case", () => {
      const { $ } = renderList([
        buildCourtList({
          session: [buildSession({ sittings: [buildSitting([buildCase({ caseRef: "111" }), buildCase({ caseRef: "222" })])] })]
        })
      ]);

      const refs = $("tbody.govuk-table__body tr")
        .map((_, row) => $(row).find("td").eq(COLUMN.caseRef).text().trim())
        .get();
      expect(refs).toEqual(["111", "222"]);
    });
  });

  describe("Data source footer", () => {
    it("should render the data source label and value", () => {
      const { $ } = renderList([], { dataSource: "Court and tribunal hearings service" });

      expect($("p.govuk-body-s").text()).toContain(`${commonEn.dataSource}: Court and tribunal hearings service`);
    });
  });

  describe("Back to top link", () => {
    it("should render a back-to-top link pointing at the top anchor", () => {
      const { $ } = renderList();

      const backToTop = $(".back-to-top a[href='#top']");
      expect(backToTop).toHaveLength(1);
      expect(backToTop.text()).toContain(commonEn.backToTop);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh headings, labels and metadata", () => {
      const { $ } = renderList([buildCourtList()], {}, "cy");

      expect($("h1#top").text()).toContain(iacDailyListCy.IAC_DAILY_LIST.pageTitle);
      expect($("h2.govuk-heading-m").first().text()).toContain(commonCy.heading);
      expect($(".govuk-body").text()).toContain(commonCy.listDate);
      expect($("details.govuk-details .govuk-details__summary-text").text()).toContain(commonCy.importantInformationHeading);
      expect($("p.govuk-body-s").text()).toContain(commonCy.dataSource);
      expect($(".back-to-top a").text()).toContain(commonCy.backToTop);
    });

    it("should render Welsh table headers", () => {
      const { $ } = renderList([buildCourtList()], {}, "cy");

      const headers = $("thead th")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([
        commonCy.startTime,
        commonCy.caseRef,
        commonCy.appellant,
        commonCy.respondent,
        commonCy.interpreterLanguage,
        commonCy.hearingChannel,
        commonCy.hearingType
      ]);
    });
  });
});
