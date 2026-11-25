import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/blob-explorer-flat-file/index.njk";

const mockMetadata = {
  artefactId: "abc-123",
  locationId: "42",
  locationName: "Test Court",
  publicationType: "LIST",
  listType: "CIVIL_DAILY_CAUSE_LIST",
  provenance: "MANUAL_UPLOAD",
  language: "ENGLISH",
  sensitivity: "PUBLIC",
  contentDate: "2024-01-01T00:00:00Z",
  displayFrom: "2024-01-02T00:00:00Z",
  displayTo: "2024-01-03T00:00:00Z"
};

const ACTIONS = ["resubmit", "courtel", "third-party", "email"] as const;

function buildResendButtons(locale: typeof en | typeof cy, lng = "") {
  const labels = [locale.resubmitButton, locale.sendToCourtelButton, locale.sendToThirdPartyButton, locale.sendSubscriptionEmailButton];
  return ACTIONS.map((action, index) => ({
    text: labels[index],
    href: `/blob-explorer-confirm-resubmission?artefactId=abc-123&action=${action}${lng}`,
    classes: index === 0 ? "govuk-button" : "govuk-button govuk-button--secondary"
  }));
}

const formatDateTime = (value: string) => `formatted:${value}`;

describe("blob-explorer-flat-file template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      const data = { ...en, metadata: mockMetadata, flatFileUrl: "https://example.com/file.pdf", formatDateTime };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1.govuk-heading-xl").text().trim()).toBe(en.header);
    });

    it("should render the metadata heading and the resend buttons", () => {
      const data = { ...en, metadata: mockMetadata, resendButtons: buildResendButtons(en), flatFileUrl: "https://example.com/file.pdf", formatDateTime };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h2.govuk-heading-m").text()).toContain(en.flatFileMetadataHeading);
      expect($(".govuk-button-group a.govuk-button").first().text()).toContain(en.resubmitButton);
    });

    it("should render the metadata summary list values", () => {
      const data = { ...en, metadata: mockMetadata, flatFileUrl: "https://example.com/file.pdf", formatDateTime };

      const { $ } = render(env, TEMPLATE, data);

      const summaryListText = $(".govuk-summary-list").text();
      expect(summaryListText).toContain(en.metadataArtefactId);
      expect(summaryListText).toContain(mockMetadata.locationName);
      expect(summaryListText).toContain(mockMetadata.listType);
      expect(summaryListText).toContain(`formatted:${mockMetadata.contentDate}`);
      expect(summaryListText).toContain(`formatted:${mockMetadata.displayTo}`);
    });

    it("should render the link to the flat file", () => {
      const flatFileUrl = "https://example.com/file.pdf";
      const data = { ...en, metadata: mockMetadata, flatFileUrl, formatDateTime };

      const { $ } = render(env, TEMPLATE, data);

      const link = $(`a[href="${flatFileUrl}"]`);
      expect(link).toHaveLength(1);
      expect(link.text()).toBe(en.flatFileLinkToFile);
    });

    it("should not render an error summary when no error", () => {
      const data = { ...en, metadata: mockMetadata, flatFileUrl: "https://example.com/file.pdf", formatDateTime };

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });

    it("should render an error summary and hide the summary list when error is set", () => {
      const data = { ...en, error: en.flatFileError };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.flatFileError]);
      expect($(".govuk-summary-list")).toHaveLength(0);
      expect($(".govuk-button-group")).toHaveLength(0);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh page heading and metadata", () => {
      const data = {
        ...cy,
        metadata: mockMetadata,
        resendButtons: buildResendButtons(cy, "&lng=cy"),
        flatFileUrl: "https://example.com/file.pdf",
        formatDateTime
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1.govuk-heading-xl").text().trim()).toBe(cy.header);
      expect($("h2.govuk-heading-m").text()).toContain(cy.flatFileMetadataHeading);
      expect($(".govuk-button-group a.govuk-button").first().text()).toContain(cy.resubmitButton);
    });

    it("should render Welsh error summary", () => {
      const data = { ...cy, error: cy.flatFileError };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [cy.flatFileError]);
    });
  });

  describe("resend buttons", () => {
    it("should render the four buttons in order, primary first then secondary, as links to their confirmation pages", () => {
      const { $ } = render(env, TEMPLATE, { ...en, metadata: mockMetadata, resendButtons: buildResendButtons(en), formatDateTime, locale: "en" });

      const buttons = $(".govuk-button-group a.govuk-button");
      expect(buttons).toHaveLength(4);
      expect(buttons.map((_, el) => $(el).text().trim()).get()).toEqual([
        en.resubmitButton,
        en.sendToCourtelButton,
        en.sendToThirdPartyButton,
        en.sendSubscriptionEmailButton
      ]);
      expect(buttons.map((_, el) => $(el).attr("href")).get()).toEqual([
        "/blob-explorer-confirm-resubmission?artefactId=abc-123&action=resubmit",
        "/blob-explorer-confirm-resubmission?artefactId=abc-123&action=courtel",
        "/blob-explorer-confirm-resubmission?artefactId=abc-123&action=third-party",
        "/blob-explorer-confirm-resubmission?artefactId=abc-123&action=email"
      ]);
      expect(buttons.eq(0).hasClass("govuk-button--secondary")).toBe(false);
      for (const index of [1, 2, 3]) {
        expect(buttons.eq(index).hasClass("govuk-button--secondary")).toBe(true);
      }
      expect(buttons.eq(0).attr("role")).toBe("button");
      expect($("form")).toHaveLength(0);
    });

    it("should render the Welsh button labels with lng=cy hrefs", () => {
      const { $ } = render(env, TEMPLATE, { ...cy, metadata: mockMetadata, resendButtons: buildResendButtons(cy, "&lng=cy"), formatDateTime, locale: "cy" });

      const buttons = $(".govuk-button-group a.govuk-button");
      expect(buttons.map((_, el) => $(el).text().trim()).get()).toEqual([
        cy.resubmitButton,
        cy.sendToCourtelButton,
        cy.sendToThirdPartyButton,
        cy.sendSubscriptionEmailButton
      ]);
      expect(buttons.eq(1).attr("href")).toBe("/blob-explorer-confirm-resubmission?artefactId=abc-123&action=courtel&lng=cy");
    });
  });

  describe("locale files", () => {
    it("should have the same keys in en and cy", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });
  });
});
