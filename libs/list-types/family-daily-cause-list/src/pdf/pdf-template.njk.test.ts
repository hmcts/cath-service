import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMPLATE = "pdf-template.njk";

// The rendered hearings table columns, in order.
const COLUMN = {
  applicant: 7,
  respondent: 8
} as const;

type CheerioApi = ReturnType<typeof render>["$"];

interface CourtHouseAddress {
  line?: string[];
  town?: string;
  county?: string;
  postCode?: string;
}

interface CaseOverrides {
  applicant?: string;
  applicantRepresentative?: string;
  respondent?: string;
  respondentRepresentative?: string;
}

// Fixture builders: each layer defaults to a realistic minimal shape so the deep
// courtHouse → courtRoom → session → sitting → hearing → case tree stays out of tests.
function buildCase(overrides: CaseOverrides = {}) {
  return {
    caseNumber: "F123",
    caseName: "Green v Blue",
    caseType: "Family",
    applicant: "John Green",
    respondent: "Mary Blue",
    ...overrides
  };
}

function buildSitting(caseOverrides: CaseOverrides = {}) {
  return {
    time: "10:00am",
    durationAsHours: 1,
    durationAsMinutes: 0,
    caseHearingChannel: "In person",
    hearing: [{ hearingType: "Hearing", case: [buildCase(caseOverrides)] }]
  };
}

function buildSession(caseOverrides: CaseOverrides = {}) {
  return {
    courtRoomName: "Family Court 1",
    session: [{ formattedJudiciaries: "", sittings: [buildSitting(caseOverrides)] }]
  };
}

function buildCourtHouse({
  courtHouseName = "Main Family Court House",
  courtHouseAddress = { line: ["1 Family Court Street"], postCode: "SW1A 1AA" } as CourtHouseAddress,
  courtRoom = [] as unknown[]
} = {}) {
  return { courtHouse: { courtHouseName, courtHouseAddress, courtRoom } };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    pdfStyles: "",
    dataSource: "Test Family Source",
    header: {
      locationName: "Barnet Civil and Family Courts Centre",
      addressLines: ["1 Venue Street", "VN1 1AA"],
      contentDate: "13 July 2026",
      lastUpdated: "13 July 2026 at 9:00am"
    },
    openJustice: {
      venueName: "Barnet Civil and Family Courts Centre",
      email: "family.barnet.countycourt@justice.gov.uk",
      phone: "0300 123 5577"
    }
  };
}

function renderPdf(courtLists: unknown[] = [], overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, { ...baseData(locale), ...overrides, listData: { courtLists } });
}

// The address blocks join their entries with <br>, so split on the tag rather than
// reading the collapsed text, which would run the lines together.
function addressEntries($: CheerioApi, selector: string) {
  return ($(selector).html() ?? "")
    .split("<br>")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function renderPartyCells(caseOverrides: CaseOverrides, locale: typeof en | typeof cy = en) {
  const { $ } = renderPdf([buildCourtHouse({ courtRoom: [buildSession(caseOverrides)] })], {}, locale);
  const cells = $("tbody tr")
    .first()
    .find("td")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get();
  return { $, applicant: cells[COLUMN.applicant], respondent: cells[COLUMN.respondent] };
}

let env: nunjucks.Environment;

beforeEach(() => {
  env = createTestEnvironment([__dirname]);
});

describe("family-daily-cause-list pdf-template", () => {
  describe("Important information", () => {
    it("should render the open justice contact sentence naming the supplied venue", () => {
      const { $ } = renderPdf();

      const infoBox = $(".info-box");
      expect(infoBox).toHaveLength(1);
      expect(infoBox.find("h3").text()).toContain(en.importantInformation);
      expect(infoBox.text()).toContain(
        en.openJusticeContact("Barnet Civil and Family Courts Centre", "family.barnet.countycourt@justice.gov.uk", "0300 123 5577")
      );
    });

    it("should render the Welsh open justice contact sentence naming the supplied venue", () => {
      const { $ } = renderPdf([], { openJustice: { venueName: "Llys Prawf", email: "family@example.com", phone: "0300 123 5577" } }, cy);

      const infoBox = $(".info-box");
      expect(infoBox.find("h3").text()).toContain(cy.importantInformation);
      expect(infoBox.text()).toContain(cy.openJusticeContact("Llys Prawf", "family@example.com", "0300 123 5577"));
    });
  });

  describe("Venue header address", () => {
    it("should render exactly the header address lines it is given", () => {
      const { $ } = renderPdf([], { header: { ...baseData().header, addressLines: ["1 Venue Street", "Second Line", "VN1 1AA"] } });

      expect(addressEntries($, ".header-section .address")).toEqual(["1 Venue Street", "Second Line", "VN1 1AA"]);
    });
  });

  describe("Court house address", () => {
    it("should render the address lines, town, county and postcode", () => {
      const { $ } = renderPdf([
        buildCourtHouse({
          courtHouseAddress: { line: ["1 Family Court Street", "Building B"], town: "London", county: "Greater London", postCode: "SW1A 1AA" }
        })
      ]);

      expect($(".court-section h2").text()).toContain("Main Family Court House");
      expect(addressEntries($, ".court-section .address")).toEqual(["1 Family Court Street", "Building B", "London", "Greater London", "SW1A 1AA"]);
    });

    it("should render the town and county when only a town and county are supplied", () => {
      const { $ } = renderPdf([buildCourtHouse({ courtHouseAddress: { town: "Leeds", county: "West Yorkshire" } })]);

      expect($(".court-section h2").text()).toContain("Main Family Court House");
      expect(addressEntries($, ".court-section .address")).toEqual(["Leeds", "West Yorkshire"]);
    });

    it("should skip empty address lines", () => {
      const { $ } = renderPdf([buildCourtHouse({ courtHouseAddress: { line: ["", "Valid Line", ""], postCode: "AB1 2CD" } })]);

      expect(addressEntries($, ".court-section .address")).toEqual(["Valid Line", "AB1 2CD"]);
      expect($(".court-section .address br")).toHaveLength(1);
    });

    it("should end the address at the county with no trailing line break when no postcode is supplied", () => {
      const { $ } = renderPdf([buildCourtHouse({ courtHouseAddress: { line: ["1 Family Court Street"], town: "Leeds", county: "West Yorkshire" } })]);

      expect(addressEntries($, ".court-section .address")).toEqual(["1 Family Court Street", "Leeds", "West Yorkshire"]);
      expect($(".court-section .address br")).toHaveLength(2);
      expect($(".court-section .address").html()?.trim().endsWith("<br>")).toBe(false);
    });

    it("should end the address at the last line with no trailing line break when only address lines are supplied", () => {
      const { $ } = renderPdf([buildCourtHouse({ courtHouseAddress: { line: ["1 Family Court Street", "Building B"] } })]);

      expect(addressEntries($, ".court-section .address")).toEqual(["1 Family Court Street", "Building B"]);
      expect($(".court-section .address br")).toHaveLength(1);
      expect($(".court-section .address").html()?.trim().endsWith("<br>")).toBe(false);
    });

    it("should render the court house name but no address block when every address part is empty", () => {
      const { $ } = renderPdf([buildCourtHouse({ courtHouseAddress: { line: [""], town: "", county: "", postCode: "" } })]);

      expect($(".court-section h2").text()).toContain("Main Family Court House");
      expect($(".court-section .address")).toHaveLength(0);
    });

    it("should not render the address block when the court house has no address", () => {
      const { $ } = renderPdf([{ courtHouse: { courtHouseName: "Address-less Family Court", courtRoom: [] } }]);

      expect($(".court-section .address")).toHaveLength(0);
      expect($(".court-section h2")).toHaveLength(0);
    });
  });

  describe("Applicant and respondent columns", () => {
    it("should render the legal advisor after both parties when both have a representative", () => {
      const { applicant, respondent } = renderPartyCells({
        applicantRepresentative: "Family Solicitors Ltd",
        respondentRepresentative: "Blue Family Law LLP"
      });

      expect(applicant).toBe(`John Green, ${en.legalAdvisor}: Family Solicitors Ltd`);
      expect(respondent).toBe(`Mary Blue, ${en.legalAdvisor}: Blue Family Law LLP`);
    });

    it("should render the legal advisor only on the side that has a representative", () => {
      const { applicant, respondent } = renderPartyCells({ applicantRepresentative: "Family Solicitors Ltd" });

      expect(applicant).toBe(`John Green, ${en.legalAdvisor}: Family Solicitors Ltd`);
      expect(respondent).toBe("Mary Blue");
    });

    it("should render the legal advisor on the respondent only when only the respondent has a representative", () => {
      const { applicant, respondent } = renderPartyCells({ respondentRepresentative: "Blue Family Law LLP" });

      expect(applicant).toBe("John Green");
      expect(respondent).toBe(`Mary Blue, ${en.legalAdvisor}: Blue Family Law LLP`);
    });

    it("should render only the party names when neither party has a representative", () => {
      const { $, applicant, respondent } = renderPartyCells({});

      expect(applicant).toBe("John Green");
      expect(respondent).toBe("Mary Blue");
      expect($("tbody").text()).not.toContain(en.legalAdvisor);
    });

    it("should render an empty cell when a representative is set but the party name is empty", () => {
      const { applicant, respondent } = renderPartyCells({
        applicant: "",
        applicantRepresentative: "Family Solicitors Ltd",
        respondent: "",
        respondentRepresentative: "Blue Family Law LLP"
      });

      expect(applicant).toBe("");
      expect(respondent).toBe("");
    });

    it("should use the Welsh legal advisor label when rendered with the cy locale", () => {
      const { $, applicant, respondent } = renderPartyCells(
        { applicantRepresentative: "Family Solicitors Ltd", respondentRepresentative: "Blue Family Law LLP" },
        cy
      );

      expect(applicant).toBe(`John Green, ${cy.legalAdvisor}: Family Solicitors Ltd`);
      expect(respondent).toBe(`Mary Blue, ${cy.legalAdvisor}: Blue Family Law LLP`);
      expect($("tbody").text()).not.toContain(en.legalAdvisor);
      expect($("thead th").eq(COLUMN.applicant).text().trim()).toBe(cy.applicant);
      expect($("thead th").eq(COLUMN.respondent).text().trim()).toBe(cy.respondent);
    });
  });

  describe("Locale consistency", () => {
    it("should have the same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });
  });
});
