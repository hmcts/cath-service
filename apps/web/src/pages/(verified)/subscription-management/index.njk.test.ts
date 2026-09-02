import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/subscription-management/index.njk";

const caseSubscriptions = [{ subscriptionId: "case-1", caseName: "Smith v Jones", caseNumber: "CASE-123", dateAdded: "2024-01-15" }];
const courtSubscriptions = [{ subscriptionId: "court-1", courtOrTribunalName: "Central London County Court", dateAdded: "2024-02-20" }];

const buildData = (t: typeof en, overrides: Record<string, unknown> = {}) => ({
  ...t,
  caseSubscriptions,
  courtSubscriptions,
  count: caseSubscriptions.length + courtSubscriptions.length,
  hasCaseSubscriptions: true,
  hasCourtSubscriptions: true,
  caseSubscriptionsCount: caseSubscriptions.length,
  courtSubscriptionsCount: courtSubscriptions.length,
  allSubscriptionsCount: caseSubscriptions.length + courtSubscriptions.length,
  csrfToken: "test-csrf-token",
  ...overrides
});

describe("subscription-management template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
    env.addFilter("date", (value: string | Date) => (value ? new Date(value).toLocaleDateString("en-GB") : ""));
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.heading);
    });

    it("should render the add and bulk unsubscribe buttons", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      const addButton = $('a[href="/add-email-subscription"]');
      expect(addButton.text()).toContain(en.addEmailSubscriptionButton);
      expect($('a[href="/bulk-unsubscribe"]').text()).toContain(en.bulkUnsubscribeButton);
    });

    it("should render the case and court subscription tables with details", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("#all-case-subscriptions-table").text()).toContain("Smith v Jones");
      expect($("#all-case-subscriptions-table").text()).toContain("CASE-123");
      expect($("#all-court-subscriptions-table").text()).toContain("Central London County Court");
    });

    it("should render an unsubscribe form for each subscription", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      const forms = $('form[action="/delete-subscription"]');
      expect(forms.length).toBeGreaterThanOrEqual(2);
      expect($('input[name="subscriptionId"][value="case-1"]').length).toBeGreaterThanOrEqual(1);
      expect($('input[name="subscriptionId"][value="court-1"]').length).toBeGreaterThanOrEqual(1);
    });

    it("should render the no-subscriptions message when count is zero", () => {
      const data = buildData(en, {
        caseSubscriptions: [],
        courtSubscriptions: [],
        count: 0,
        hasCaseSubscriptions: false,
        hasCourtSubscriptions: false,
        caseSubscriptionsCount: 0,
        courtSubscriptionsCount: 0,
        allSubscriptionsCount: 0
      });

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-body").text()).toContain(en.noSubscriptions);
      expect($("#all-case-subscriptions-table")).toHaveLength(0);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading and buttons", () => {
      const data = buildData(cy);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.heading);
      expect($('a[href="/add-email-subscription"]').text()).toContain(cy.addEmailSubscriptionButton);
    });

    it("should render the Welsh no-subscriptions message when count is zero", () => {
      const data = buildData(cy, {
        caseSubscriptions: [],
        courtSubscriptions: [],
        count: 0,
        hasCaseSubscriptions: false,
        hasCourtSubscriptions: false,
        caseSubscriptionsCount: 0,
        courtSubscriptionsCount: 0,
        allSubscriptionsCount: 0
      });

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-body").text()).toContain(cy.noSubscriptions);
    });
  });
});
