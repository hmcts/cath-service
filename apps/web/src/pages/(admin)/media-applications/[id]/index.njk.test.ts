import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(admin)/media-applications/[id]/index.njk";

const application = {
  id: "app-123",
  name: "Jane Reporter",
  email: "jane@example.com",
  employer: "Example News",
  appliedDate: new Date("2026-01-15T10:00:00Z"),
  proofOfIdPath: "uploads/proof.pdf",
  proofOfIdOriginalName: "proof.pdf"
};

const buildData = (lang: typeof en | typeof cy) => ({
  pageTitle: lang.pageTitle,
  tableHeaders: lang.tableHeaders,
  proofOfIdText: lang.proofOfIdText,
  viewProofOfId: lang.viewProofOfId,
  approveButton: lang.approveButton,
  rejectButton: lang.rejectButton,
  fileNotAvailable: lang.fileNotAvailable,
  application,
  proofOfIdFilename: application.proofOfIdOriginalName
});

describe("media-applications/[id] template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../../"), path.join(__dirname, "../../../../../../../libs/web-core/src/views")]);

    env.addFilter("date", (value: string | Date) => {
      if (!value) return "";
      const date = typeof value === "string" ? new Date(value) : value;
      return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    });
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(en.pageTitle);
    });

    it("should render applicant details in the summary list", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const summaryText = $(".govuk-summary-list").text();
      expect(summaryText).toContain(en.tableHeaders.name);
      expect(summaryText).toContain(application.name);
      expect(summaryText).toContain(application.email);
      expect(summaryText).toContain(application.employer);
    });

    it("should render a proof of id link opening in a new window", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const proofLink = $(`a[href="/media-applications/${application.id}/proof-of-id"]`);
      expect(proofLink).toHaveLength(1);
      expect(proofLink.text()).toContain(en.viewProofOfId);
      expect(proofLink.attr("target")).toBe("_blank");
    });

    it("should render approve and reject forms pointing to the correct actions", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(`form[action="/media-applications/${application.id}/approve"]`)).toHaveLength(1);
      expect($(`form[action="/media-applications/${application.id}/reject-reasons"]`)).toHaveLength(1);
      const buttonText = $(".govuk-button").text();
      expect(buttonText).toContain(en.approveButton);
      expect(buttonText).toContain(en.rejectButton);
    });

    it("should not render an error summary for a valid application", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertNoErrors($);
    });

    it("should render the file-not-available text when proof of id is missing", () => {
      // Arrange
      const data = {
        ...buildData(en),
        application: { ...application, proofOfIdPath: null }
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-summary-list").text()).toContain(en.fileNotAvailable);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh page heading and labels", () => {
      // Arrange
      const data = buildData(cy);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(cy.pageTitle);
      expect($(".govuk-summary-list").text()).toContain(cy.tableHeaders.email);
      expect($(".govuk-button").text()).toContain(cy.approveButton);
    });
  });

  describe("Error state", () => {
    it("should render the error message and a back link when an error is present", () => {
      // Arrange
      const data = {
        pageTitle: en.pageTitle,
        error: en.errorMessages.alreadyReviewed,
        application: null
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const errorSummary = $(".govuk-error-summary");
      expect(errorSummary).toHaveLength(1);
      expect(errorSummary.text()).toContain(en.errorMessages.alreadyReviewed);
      expect($('a[href="/media-applications"]')).toHaveLength(1);
      expect($(".govuk-summary-list")).toHaveLength(0);
    });
  });
});
