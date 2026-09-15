import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMPLATE = "pdf-template.njk";

type CheerioApi = ReturnType<typeof render>["$"];

interface CourtHouseAddress {
  line?: string[];
  town?: string;
  county?: string;
  postCode?: string;
}

function buildCourtHouse({
  courtHouseName = "Main Court House",
  courtHouseAddress = { line: ["1 Court Street"], postCode: "SW1A 1AA" } as CourtHouseAddress,
  courtRoom = [] as unknown[]
} = {}) {
  return { courtHouse: { courtHouseName, courtHouseAddress, courtRoom } };
}

function baseData(locale: typeof en | typeof cy = en) {
  return {
    t: locale,
    pdfStyles: "",
    dataSource: "Test Source",
    header: {
      locationName: "Barnet Civil and Family Courts Centre",
      addressLines: ["1 Venue Street", "VN1 1AA"],
      contentDate: "13 July 2026",
      lastUpdated: "13 July 2026 at 9:00am"
    },
    openJustice: {
      venueName: "Barnet Civil and Family Courts Centre",
      email: "civil.barnet.countycourt@justice.gov.uk",
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

let env: nunjucks.Environment;

beforeEach(() => {
  env = createTestEnvironment([__dirname]);
});

describe("civil-daily-cause-list pdf-template", () => {
  describe("Important information", () => {
    it("should render the open justice contact sentence naming the supplied venue", () => {
      const { $ } = renderPdf();

      const infoBox = $(".info-box");
      expect(infoBox).toHaveLength(1);
      expect(infoBox.find("h3").text()).toContain(en.importantInformation);
      expect(infoBox.text()).toContain(
        en.openJusticeContact("Barnet Civil and Family Courts Centre", "civil.barnet.countycourt@justice.gov.uk", "0300 123 5577")
      );
    });

    it("should render the Welsh open justice contact sentence naming the supplied venue", () => {
      const { $ } = renderPdf([], { openJustice: { venueName: "Llys Prawf", email: "civil@example.com", phone: "0300 123 5577" } }, cy);

      const infoBox = $(".info-box");
      expect(infoBox.find("h3").text()).toContain(cy.importantInformation);
      expect(infoBox.text()).toContain(cy.openJusticeContact("Llys Prawf", "civil@example.com", "0300 123 5577"));
    });
  });

  describe("Venue header address", () => {
    it("should render exactly the header address lines it is given", () => {
      const { $ } = renderPdf([], { header: { ...baseData().header, addressLines: ["1 Venue Street", "Second Line", "VN1 1AA"] } });

      expect(addressEntries($, ".header-section .address")).toEqual(["1 Venue Street", "Second Line", "VN1 1AA"]);
    });
  });

  describe("Court house address", () => {
    it("should render the address lines and postcode but neither the town nor the county", () => {
      const { $ } = renderPdf([
        buildCourtHouse({
          courtHouseAddress: { line: ["1 Court Street", "Building B"], town: "London", county: "Greater London", postCode: "SW1A 1AA" }
        })
      ]);

      expect($(".court-section h2").text()).toContain("Main Court House");
      expect(addressEntries($, ".court-section .address")).toEqual(["1 Court Street", "Building B", "SW1A 1AA"]);
      expect($(".court-section").text()).not.toContain("London");
      expect($(".court-section").text()).not.toContain("Greater London");
    });

    it("should render the court house name with an empty address when only a town and county are supplied", () => {
      const { $ } = renderPdf([buildCourtHouse({ courtHouseAddress: { town: "Leeds", county: "West Yorkshire" } })]);

      expect($(".court-section h2").text()).toContain("Main Court House");
      expect(addressEntries($, ".court-section .address")).toEqual([]);
      expect($(".court-section").text()).not.toContain("Leeds");
      expect($(".court-section").text()).not.toContain("West Yorkshire");
    });

    it("should skip empty address lines", () => {
      const { $ } = renderPdf([buildCourtHouse({ courtHouseAddress: { line: ["", "Valid Line", ""], postCode: "AB1 2CD" } })]);

      expect(addressEntries($, ".court-section .address")).toEqual(["Valid Line", "AB1 2CD"]);
    });

    it("should not render the address block when the court house has no address", () => {
      const { $ } = renderPdf([{ courtHouse: { courtHouseName: "Address-less Court", courtRoom: [] } }]);

      expect($(".court-section .address")).toHaveLength(0);
      expect($(".court-section h2")).toHaveLength(0);
    });
  });
});
