import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/blob-explorer-confirm-resubmission/index.njk";

const metadata = {
  locationName: "Test Court",
  publicationType: "LIST",
  listType: "Civil Daily Cause List",
  provenance: "MANUAL_UPLOAD",
  language: "ENGLISH",
  sensitivity: "PUBLIC",
  contentDate: "2024-01-01T00:00:00Z",
  displayFrom: "2024-01-02T00:00:00Z",
  displayTo: "2024-01-03T00:00:00Z"
};

const formatDateTime = (date: string) => date;
const CANCEL_HREF = "/blob-explorer-json-file?artefactId=abc-123";

type Locale = typeof en | typeof cy;
type Action = keyof typeof en.actions;

function flat(locale: Locale, action: Action) {
  const { actions, ...content } = locale;
  return { ...content, title: actions[action].title, header: actions[action].header };
}

describe("blob-explorer-confirm-resubmission template", () => {
  let env: nunjucks.Environment;

  function renderPage(locale: Locale, action: Action, overrides: Record<string, unknown> = {}) {
    return render(env, TEMPLATE, {
      ...flat(locale, action),
      metadata,
      artefactId: "abc-123",
      cancelHref: CANCEL_HREF,
      formatDateTime,
      locale: locale === cy ? "cy" : "en",
      ...overrides
    });
  }

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      const { $ } = renderPage(en, "courtel");

      expect($("h1.govuk-heading-xl").text().trim()).toBe(en.actions.courtel.header);
    });

    it("should render the page title for the action", () => {
      const { $ } = renderPage(en, "third-party");

      expect($("title").text()).toContain(en.actions["third-party"].title);
    });

    it("should render the metadata table with values", () => {
      const { $ } = renderPage(en, "resubmit");

      const tableText = $(".govuk-table").text();
      expect(tableText).toContain(en.metadataLocationName);
      expect(tableText).toContain(metadata.locationName);
      expect(tableText).toContain(en.metadataListType);
      expect(tableText).toContain(metadata.listType);
      expect(tableText).toContain(metadata.provenance);
      expect(tableText).toContain(metadata.sensitivity);
    });

    it("should render the confirm form and a cancel link back to the publication page", () => {
      const { $ } = renderPage(en, "email");

      const form = $("form");
      expect(form.attr("method")).toBe("post");

      const submitButton = $("button[type='submit']");
      expect(submitButton.text().trim()).toBe(en.confirmButton);
      expect(submitButton.attr("data-prevent-double-click")).toBe("true");

      const cancelLink = $(`a[href="${CANCEL_HREF}"]`);
      expect(cancelLink).toHaveLength(1);
      expect(cancelLink.text().trim()).toBe(en.confirmCancelLink);
    });

    it("should not render error summary when no error", () => {
      const { $ } = renderPage(en, "courtel");

      assertNoErrors($);
    });

    it("should render the error summary above the heading and table, and keep Confirm, when a send fails with metadata", () => {
      const { $ } = renderPage(en, "courtel", { error: en.actions.courtel.noRecipientsError });

      assertErrorSummary($, [en.actions.courtel.noRecipientsError]);
      expect($(".govuk-table")).toHaveLength(1);
      expect($("button[type='submit']")).toHaveLength(1);

      const ordered = $(".govuk-error-summary, h1, .govuk-table").toArray();
      expect(ordered.map((el) => $(el).is(".govuk-error-summary"))).toEqual([true, false, false]);
    });

    it("should render the error summary with no table, no Confirm, and Cancel to Locations when there is no metadata", () => {
      const { $ } = render(env, TEMPLATE, { ...flat(en, "resubmit"), error: en.actions.resubmit.error, locale: "en" });

      assertErrorSummary($, [en.actions.resubmit.error]);
      expect($(".govuk-table")).toHaveLength(0);
      expect($("button[type='submit']")).toHaveLength(0);
      expect($('a[href="/blob-explorer-locations"]').text().trim()).toBe(en.confirmCancelLink);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading and confirm button", () => {
      const { $ } = renderPage(cy, "courtel");

      expect($("h1.govuk-heading-xl").text().trim()).toBe(cy.actions.courtel.header);
      expect($("button[type='submit']").text().trim()).toBe(cy.confirmButton);
    });

    it("should render Welsh error summary when error exists", () => {
      const { $ } = renderPage(cy, "email", { error: cy.actions.email.noRecipientsError });

      assertErrorSummary($, [cy.actions.email.noRecipientsError]);
    });
  });

  describe("locale files", () => {
    it("should have the same keys in en and cy", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
      for (const action of Object.keys(en.actions) as (keyof typeof en.actions)[]) {
        expect(Object.keys(en.actions[action]).sort()).toEqual(Object.keys(cy.actions[action]).sort());
      }
    });

    it("should use the ticket copy for each action", () => {
      expect(en.actions.resubmit.error).toBe("We could not re-submit this publication. Try again later.");
      expect(en.actions.courtel.noRecipientsError).toBe("Courtel is not subscribed to this list type, so nothing was sent.");
      expect(en.actions["third-party"].noRecipientsError).toBe("No third party subscribers are subscribed to this list type, so nothing was sent.");
      expect(en.actions.email.noRecipientsError).toBe("No one is subscribed to this publication, so no emails were sent.");
    });
  });
});
