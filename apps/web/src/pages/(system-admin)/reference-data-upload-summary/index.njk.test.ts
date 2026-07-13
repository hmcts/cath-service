import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/reference-data-upload-summary/index.njk";

const buildPreviewRow = () => ({
  locationId: 1,
  locationName: "Test Court",
  welshLocationName: "Llys Prawf",
  email: "test@court.gov.uk",
  contactNo: "01234567890",
  jurisdictionNames: ["Family Court"],
  jurisdictionWelshNames: ["Llys Teulu"],
  subJurisdictionNames: ["Civil"],
  subJurisdictionWelshNames: ["Sifil"],
  regionNames: ["London"],
  regionWelshNames: ["Llundain"],
  locationReferences: [{ provenance: "MANUAL_UPLOAD", provenanceLocationId: "123", provenanceLocationType: "COURT" }]
});

const buildData = (t: typeof en, overrides: Record<string, unknown> = {}) => ({
  ...t,
  previewData: [buildPreviewRow()],
  pagination: { items: [], previous: undefined, next: undefined },
  showPagination: false,
  fileName: "locations.csv",
  hasErrors: false,
  locale: "en",
  ...overrides
});

describe("reference-data-upload-summary template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading and preview title", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(en.pageTitle);
      expect($("h2.govuk-heading-l").text()).toContain(en.previewTitle);
    });

    it("should render the file name summary row with a change link", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-summary-list").text()).toContain("locations.csv");
      const changeLink = $('a[href="/reference-data-upload"]');
      expect(changeLink.text()).toContain(en.changeLink);
    });

    it("should render the table headers and the preview row data", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const headers = $("thead .govuk-table__header")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain(en.locationIdHeader);
      expect(headers).toContain(en.provenanceLocationTypeHeader);

      const bodyText = $("tbody").text();
      expect(bodyText).toContain("Test Court");
      expect(bodyText).toContain("Family Court");
      expect(bodyText).toContain("MANUAL_UPLOAD");
    });

    it("should render the confirm button and no error summary when hasErrors is false", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertNoErrors($);
      expect($("form[method='post'] button").text()).toContain(en.confirmButtonText);
    });

    it("should render the error summary and hide the confirm button when hasErrors is true", () => {
      // Arrange
      const data = buildData(en, {
        hasErrors: true,
        errors: [{ text: "Invalid location ID", href: "#file" }]
      });

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, ["Invalid location ID"]);
      expect($(".govuk-error-summary__title").text()).toContain(en.errorSummaryTitle);
      expect($("form[method='post']")).toHaveLength(0);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh page heading", () => {
      // Arrange
      const data = buildData(cy, { locale: "cy" });

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(cy.pageTitle);
      expect($("h2.govuk-heading-l").text()).toContain(cy.previewTitle);
    });
  });
});
