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
  viewProofOfIdHidden: lang.viewProofOfIdHidden,
  approveButton: lang.approveButton,
  rejectButton: lang.rejectButton,
  fileNotAvailable: lang.fileNotAvailable,
  application,
  proofOfIdFilename: application.proofOfIdOriginalName
});

describe("media-applications/[id] template", () => {
  it("should have matching English and Welsh locale keys", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
  });

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
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.pageTitle);
    });

    it("should render applicant details in the summary list", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      const summaryText = $(".govuk-summary-list").text();
      expect(summaryText).toContain(en.tableHeaders.name);
      expect(summaryText).toContain(application.name);
      expect(summaryText).toContain(application.email);
      expect(summaryText).toContain(application.employer);
    });

    it("should render a proof of id link whose name starts with View and says it opens in a new tab", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      const proofLink = $(`a[href="/media-applications/${application.id}/proof-of-id"]`);
      expect(proofLink).toHaveLength(1);
      expect(proofLink.attr("aria-label")).toBeUndefined();
      expect(proofLink.text().replace(/\s+/g, " ").trim()).toBe("View proof of ID (opens in new tab)");
      expect(proofLink.find(".govuk-visually-hidden").text().trim()).toBe(en.viewProofOfIdHidden);
      expect(proofLink.attr("target")).toBe("_blank");
      expect(proofLink.attr("rel")).toBe("noopener noreferrer");
    });

    it("should show the proof of id filename next to the link without inline styles", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-summary-list p.govuk-body").text()).toBe(application.proofOfIdOriginalName);
      expect($("main [style]")).toHaveLength(0);
    });

    it("should escape the proof of id filename", () => {
      const data = { ...buildData(en), proofOfIdFilename: '<img src=x onerror="alert(1)">.pdf' };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-summary-list img")).toHaveLength(0);
      expect($(".govuk-summary-list p.govuk-body").text()).toBe('<img src=x onerror="alert(1)">.pdf');
    });

    it("should group the approve and reject buttons together in that order", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      const group = $(".govuk-button-group");
      expect(group).toHaveLength(1);
      const buttons = group.find(".govuk-button");
      expect(buttons).toHaveLength(2);
      expect($(buttons[0]).text().trim()).toBe(en.approveButton);
      expect($(buttons[0]).attr("href")).toBe(`/media-applications/${application.id}/approve`);
      expect($(buttons[0]).hasClass("govuk-button--warning")).toBe(false);
      expect($(buttons[1]).text().trim()).toBe(en.rejectButton);
      expect($(buttons[1]).attr("href")).toBe(`/media-applications/${application.id}/reject-reasons`);
      expect($(buttons[1]).hasClass("govuk-button--warning")).toBe(true);
    });

    it("should not render an error summary for a valid application", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });

    it("should render the file-not-available text when proof of id is missing", () => {
      const data = {
        ...buildData(en),
        application: { ...application, proofOfIdPath: null }
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-summary-list").text()).toContain(en.fileNotAvailable);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh page heading and labels", () => {
      const data = buildData(cy);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.pageTitle);
      expect($(".govuk-summary-list").text()).toContain(cy.tableHeaders.email);
      expect($(".govuk-button").text()).toContain(cy.approveButton);
      expect($(`a[href="/media-applications/${application.id}/proof-of-id"]`).text()).toContain(cy.proofOfIdText);
    });
  });

  describe("Error state", () => {
    it("should render the error message and a back link when an error is present", () => {
      const data = {
        pageTitle: en.pageTitle,
        error: en.errorMessages.alreadyReviewed,
        application: null
      };

      const { $ } = render(env, TEMPLATE, data);

      const errorSummary = $(".govuk-error-summary");
      expect(errorSummary).toHaveLength(1);
      expect(errorSummary.text()).toContain(en.errorMessages.alreadyReviewed);
      expect($('a[href="/media-applications"]')).toHaveLength(1);
      expect($(".govuk-summary-list")).toHaveLength(0);
    });
  });
});
