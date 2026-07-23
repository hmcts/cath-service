import path from "node:path";
import { fileURLToPath } from "node:url";
import { iacDailyListCy, iacDailyListEn } from "@hmcts/iac-daily-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "iac-daily-list-additional-cases.njk";

const commonEn = iacDailyListEn.common;
const commonCy = iacDailyListCy.common;

function buildCourtList() {
  return {
    courtListName: "Additional Cases List",
    session: [
      {
        courtRoomName: "Court 2",
        formattedJudiciary: "Judge Jones",
        isBailList: false,
        sittings: [
          {
            startTime: "10am",
            caseHearingChannel: "IN PERSON",
            hearing: [
              {
                hearingType: "Case Management",
                case: [
                  {
                    caseRef: "99999999",
                    appellant: "Alice Appellant",
                    appellantRepresentative: "Bob Rep",
                    prosecutingAuthority: "Home Office",
                    language: "Welsh"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  };
}

function baseData(locale: "en" | "cy" = "en") {
  const common = locale === "cy" ? commonCy : commonEn;
  const titles = locale === "cy" ? iacDailyListCy : iacDailyListEn;
  return {
    header: {
      listTitle: titles.IAC_DAILY_LIST_ADDITIONAL_CASES.pageTitle,
      venueName: "Manchester",
      contentDate: "15 January 2026",
      lastUpdatedDate: "14 January 2026",
      lastUpdatedTime: "12pm"
    },
    common,
    hearings: { courtLists: [buildCourtList()] },
    dataSource: "Court and tribunal hearings service"
  };
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("iac-daily-list-additional-cases template", () => {
  it("should render the additional cases title in the top heading", () => {
    const { $ } = render(env, TEMPLATE, baseData());

    expect($("h1#top").text()).toContain(iacDailyListEn.IAC_DAILY_LIST_ADDITIONAL_CASES.pageTitle);
  });

  it("should render the case row in the correct columns", () => {
    const { $ } = render(env, TEMPLATE, baseData());

    const cells = $("tbody.govuk-table__body tr")
      .first()
      .find("td")
      .map((_, el) => $(el).text().trim())
      .get();
    expect(cells[0]).toBe("10am");
    expect(cells[1]).toBe("99999999");
    expect(cells[2]).toContain("Alice Appellant");
    expect(cells[3]).toBe("Home Office");
    expect(cells[4]).toBe("Welsh");
    expect(cells[5]).toBe("IN PERSON");
    expect(cells[6]).toBe("Case Management");
  });

  it("should render the Welsh additional cases title", () => {
    const { $ } = render(env, TEMPLATE, baseData("cy"));

    expect($("h1#top").text()).toContain(iacDailyListCy.IAC_DAILY_LIST_ADDITIONAL_CASES.pageTitle);
  });
});
