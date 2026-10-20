import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import type { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMPLATE = "pdf-template.njk";

function buildHearing(overrides: Record<string, unknown> = {}) {
  return {
    partyInfo: { name: "John Smith", dob: "", age: "", address: "", asn: "", pncId: "" },
    prosecutingAuthority: "CPS",
    attendanceMethod: "In person",
    hearingType: "Hearing",
    reportingRestriction: false,
    reportingRestrictionDetails: "",
    offences: [],
    ...overrides
  };
}

function buildSittingWithHearing(hearingOverrides: Record<string, unknown> = {}) {
  return [
    {
      courtHouseName: "Preston Magistrates Court",
      lja: "Preston",
      courtRoomName: "Courtroom 1",
      sittings: [
        {
          sittingHeading: "10:00am",
          hearings: [buildHearing(hearingOverrides)]
        }
      ]
    }
  ];
}

function buildOffenceHearing(offenceOverrides: Record<string, unknown> = {}) {
  return [
    {
      courtHouseName: "Preston Magistrates Court",
      lja: "Preston",
      courtRoomName: "Courtroom 1",
      sittings: [
        {
          sittingHeading: "10:00am",
          hearings: [
            buildHearing({
              offences: [
                {
                  offenceTitle: "Theft",
                  reportingRestriction: false,
                  reportingRestrictionDetails: "",
                  ...offenceOverrides
                }
              ]
            })
          ]
        }
      ]
    }
  ];
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    pdfStyles: "",
    dataSource: "Test Source",
    header: {
      locationName: "Preston Magistrates Court",
      contentDate: "13 July 2026",
      publishedDate: "13 July 2026",
      publishedTime: "9am",
      venueAddress: []
    }
  };
}

function renderPdf(rooms: unknown[] = [], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, listData: rooms });
}

let env: nunjucks.Environment;

beforeEach(() => {
  env = createTestEnvironment([__dirname]);
});

describe("magistrates-standard-list pdf-template", () => {
  describe("Party-level reporting restriction", () => {
    it("should wrap the party-level restriction paragraph in the restriction-row-block wrapper when present", () => {
      const { $ } = renderPdf(buildSittingWithHearing({ reportingRestriction: true, reportingRestrictionDetails: "No reporting until trial concludes" }));

      const block = $("div.restriction-row-block");
      expect(block).toHaveLength(1);
      expect(block.text()).toContain("No reporting until trial concludes");
    });

    it("should not render the restriction-row-block when there is no party-level reporting restriction", () => {
      const { $ } = renderPdf(buildSittingWithHearing({ reportingRestriction: false }));

      expect($("div.restriction-row-block")).toHaveLength(0);
    });
  });

  describe("Offence-level reporting restriction", () => {
    it("should wrap the offence-level restriction paragraph in the restriction-row-block wrapper when present", () => {
      const { $ } = renderPdf(buildOffenceHearing({ reportingRestriction: true, reportingRestrictionDetails: "Victim anonymity applies" }));

      const block = $("div.restriction-row-block");
      expect(block).toHaveLength(1);
      expect(block.text()).toContain("Victim anonymity applies");
    });

    it("should not render the restriction-row-block when there is no offence-level reporting restriction", () => {
      const { $ } = renderPdf(buildOffenceHearing({ reportingRestriction: false }));

      expect($("div.restriction-row-block")).toHaveLength(0);
    });
  });
});
