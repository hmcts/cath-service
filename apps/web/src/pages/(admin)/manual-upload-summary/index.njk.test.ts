import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(admin)/manual-upload-summary/index.njk";

const sampleData = {
  courtName: "Manchester Crown Court",
  file: "cause-list.json",
  listType: "Civil Daily Cause List",
  hearingStartDate: "1 January 2026",
  sensitivity: "Public",
  language: "English",
  displayFileDates: "1 January 2026 to 2 January 2026"
};

function baseData(lang: typeof en | typeof cy) {
  return {
    pageTitle: lang.pageTitle,
    heading: lang.heading,
    subHeading: lang.subHeading,
    courtName: lang.courtName,
    file: lang.file,
    listType: lang.listType,
    hearingStartDate: lang.hearingStartDate,
    sensitivity: lang.sensitivity,
    language: lang.language,
    displayFileDates: lang.displayFileDates,
    change: lang.change,
    confirmButton: lang.confirmButton,
    data: sampleData
  };
}

describe("manual-upload-summary template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have required title", () => {
      expect(en.pageTitle).toBe("Manual upload - File upload summary - Court and tribunal hearings - GOV.UK");
    });

    it("should have sub-heading", () => {
      expect(en.subHeading).toBe("Check upload details");
    });

    it("should have court name label", () => {
      expect(en.courtName).toBe("Court name");
    });

    it("should have file label", () => {
      expect(en.file).toBe("File");
    });

    it("should have list type label", () => {
      expect(en.listType).toBe("List type");
    });

    it("should have hearing start date label", () => {
      expect(en.hearingStartDate).toBe("Hearing start date");
    });

    it("should have sensitivity label", () => {
      expect(en.sensitivity).toBe("Sensitivity");
    });

    it("should have language label", () => {
      expect(en.language).toBe("Language");
    });

    it("should have display file dates label", () => {
      expect(en.displayFileDates).toBe("Display file dates");
    });

    it("should have change action text", () => {
      expect(en.change).toBe("Change");
    });

    it("should have confirm button text", () => {
      expect(en.confirmButton).toBe("Confirm");
    });
  });

  describe("Welsh locale", () => {
    it("should have required title", () => {
      expect(cy.pageTitle).toBe("Llwytho i fyny â llaw - Crynodeb lanlwytho ffeil - Gwrandawiadau llys a thribiwnlys - GOV.UK");
    });

    it("should have sub-heading", () => {
      expect(cy.subHeading).toBe("Gwirio manylion lanlwytho");
    });

    it("should have court name label", () => {
      expect(cy.courtName).toBe("Enw'r llys");
    });

    it("should have file label", () => {
      expect(cy.file).toBe("Ffeil");
    });

    it("should have list type label", () => {
      expect(cy.listType).toBe("Math o restr");
    });

    it("should have hearing start date label", () => {
      expect(cy.hearingStartDate).toBe("Dyddiad cychwyn y gwrandawiad");
    });

    it("should have sensitivity label", () => {
      expect(cy.sensitivity).toBe("Sensitifrwydd");
    });

    it("should have language label", () => {
      expect(cy.language).toBe("Iaith");
    });

    it("should have display file dates label", () => {
      expect(cy.displayFileDates).toBe("Dangos dyddiadau ffeil");
    });

    it("should have change action text", () => {
      expect(cy.change).toBe("Newid");
    });

    it("should have confirm button text", () => {
      expect(cy.confirmButton).toBe("Cadarnhau");
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = [
        "pageTitle",
        "heading",
        "subHeading",
        "courtName",
        "file",
        "listType",
        "hearingStartDate",
        "sensitivity",
        "language",
        "displayFileDates",
        "change",
        "confirmButton"
      ];

      requiredKeys.forEach((key) => {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      });
    });
  });

  describe("Content validation", () => {
    it("should have non-empty strings for all English content", () => {
      expect(en.pageTitle.length).toBeGreaterThan(0);
      expect(en.heading.length).toBeGreaterThan(0);
      expect(en.subHeading.length).toBeGreaterThan(0);
      expect(en.courtName.length).toBeGreaterThan(0);
      expect(en.file.length).toBeGreaterThan(0);
      expect(en.listType.length).toBeGreaterThan(0);
      expect(en.hearingStartDate.length).toBeGreaterThan(0);
      expect(en.sensitivity.length).toBeGreaterThan(0);
      expect(en.language.length).toBeGreaterThan(0);
      expect(en.displayFileDates.length).toBeGreaterThan(0);
      expect(en.change.length).toBeGreaterThan(0);
      expect(en.confirmButton.length).toBeGreaterThan(0);
    });

    it("should have non-empty strings for all Welsh content", () => {
      expect(cy.pageTitle.length).toBeGreaterThan(0);
      expect(cy.heading.length).toBeGreaterThan(0);
      expect(cy.subHeading.length).toBeGreaterThan(0);
      expect(cy.courtName.length).toBeGreaterThan(0);
      expect(cy.file.length).toBeGreaterThan(0);
      expect(cy.listType.length).toBeGreaterThan(0);
      expect(cy.hearingStartDate.length).toBeGreaterThan(0);
      expect(cy.sensitivity.length).toBeGreaterThan(0);
      expect(cy.language.length).toBeGreaterThan(0);
      expect(cy.displayFileDates.length).toBeGreaterThan(0);
      expect(cy.change.length).toBeGreaterThan(0);
      expect(cy.confirmButton.length).toBeGreaterThan(0);
    });
  });

  describe("Rendering", () => {
    let env: nunjucks.Environment;

    beforeEach(() => {
      env = createTestEnvironment([
        path.join(__dirname, "../../"), // apps/web/src/pages/
        path.join(__dirname, "../../../../../../libs/web-core/src/views")
      ]);
    });

    describe("English content", () => {
      it("should render the heading and sub-heading", () => {
        // Arrange
        const data = baseData(en);

        // Act
        const { $ } = render(env, TEMPLATE, data);

        // Assert
        expect($("h1").text()).toContain(en.heading);
        expect($("h2").text()).toContain(en.subHeading);
      });

      it("should render the summary list keys and values", () => {
        // Arrange
        const data = baseData(en);

        // Act
        const { $ } = render(env, TEMPLATE, data);

        // Assert
        const keys = $(".govuk-summary-list__key")
          .map((_, el) => $(el).text().trim())
          .get();
        expect(keys).toEqual([en.courtName, en.file, en.listType, en.hearingStartDate, en.sensitivity, en.language, en.displayFileDates]);

        const values = $(".govuk-summary-list__value")
          .map((_, el) => $(el).text().trim())
          .get();
        expect(values).toEqual([
          sampleData.courtName,
          sampleData.file,
          sampleData.listType,
          sampleData.hearingStartDate,
          sampleData.sensitivity,
          sampleData.language,
          sampleData.displayFileDates
        ]);
      });

      it("should render change links pointing back to the manual upload page", () => {
        // Arrange
        const data = baseData(en);

        // Act
        const { $ } = render(env, TEMPLATE, data);

        // Assert
        const hrefs = $(".govuk-summary-list__actions a")
          .map((_, el) => $(el).attr("href"))
          .get();
        expect(hrefs).toEqual([
          "/manual-upload#court",
          "/manual-upload#file",
          "/manual-upload#listType",
          "/manual-upload#hearingStartDate-day",
          "/manual-upload#sensitivity",
          "/manual-upload#language",
          "/manual-upload#displayFrom-day"
        ]);
        expect($(".govuk-summary-list__actions a").first().text()).toContain(en.change);
      });

      it("should render the confirm button inside a post form", () => {
        // Arrange
        const data = baseData(en);

        // Act
        const { $ } = render(env, TEMPLATE, data);

        // Assert
        expect($("form").attr("method")).toBe("post");
        expect($("form button").text()).toContain(en.confirmButton);
      });

      it("should not render an error summary when there are no errors", () => {
        // Arrange
        const data = baseData(en);

        // Act
        const { $ } = render(env, TEMPLATE, data);

        // Assert
        assertNoErrors($);
      });
    });

    describe("Welsh content", () => {
      it("should render Welsh heading, keys and confirm button", () => {
        // Arrange
        const data = baseData(cy);

        // Act
        const { $ } = render(env, TEMPLATE, data);

        // Assert
        expect($("h1").text()).toContain(cy.heading);
        expect($("h2").text()).toContain(cy.subHeading);
        const keys = $(".govuk-summary-list__key")
          .map((_, el) => $(el).text().trim())
          .get();
        expect(keys).toContain(cy.courtName);
        expect(keys).toContain(cy.displayFileDates);
        expect($("form button").text()).toContain(cy.confirmButton);
      });
    });

    describe("Error state", () => {
      it("should not render an error summary even when errors are passed (template has no error block)", () => {
        // Arrange
        const errorText = "We could not process your upload. Please try again.";
        const data = { ...baseData(en), errors: [{ text: errorText, href: "#" }] };

        // Act
        const { $ } = render(env, TEMPLATE, data);

        // Assert
        assertNoErrors($);
      });
    });
  });
});
