import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/audit-log-list/index.njk";

interface RenderDataOptions {
  content?: typeof en;
  logs?: Array<{ id: string; timestamp: string; userEmail: string; action: string }>;
  errors?: Record<string, { text: string; href: string }> | null;
  errorList?: Array<{ text: string; href: string }> | null;
  filters?: Record<string, unknown>;
  totalPages?: number;
  currentPage?: number;
}

const buildData = ({
  content = en,
  logs = [],
  errors = null,
  errorList = null,
  filters = { email: "", userId: "", day: "", month: "", year: "", actions: [] },
  totalPages = 1,
  currentPage = 1
}: RenderDataOptions = {}) => ({
  en,
  cy,
  title: content.listTitle,
  logs,
  totalCount: logs.length,
  currentPage,
  totalPages,
  filters,
  filters_heading: content.filters.heading,
  selectedFiltersText: content.filters.selectedFilters,
  clearFiltersText: content.filters.clearFilters,
  applyFiltersText: content.filters.applyFilters,
  emailLabel: content.filters.emailLabel,
  userIdLabel: content.filters.userIdLabel,
  userIdHint: content.filters.userIdHint,
  dateLabel: content.filters.dateLabel,
  dateHint: content.filters.dateHint,
  dayLabel: content.filters.dayLabel,
  monthLabel: content.filters.monthLabel,
  yearLabel: content.filters.yearLabel,
  actionsLabel: content.filters.actionsLabel,
  timestampHeader: content.tableHeaders.timestamp,
  emailHeader: content.tableHeaders.email,
  actionHeader: content.tableHeaders.action,
  viewHeader: content.tableHeaders.view,
  viewLinkText: content.viewLink,
  noResultsText: content.noResults,
  backToTopText: content.backToTop,
  availableActions: [{ value: "USER_LOGIN", text: "User login" }],
  errors,
  errorList
});

describe("audit-log-list template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading and filter panel", () => {
      const data = buildData();

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1#top").text()).toContain(en.listTitle);
      expect($("h2").text()).toContain(en.filters.heading);
      expect($('a[href="/audit-log-list"]').text()).toContain(en.filters.clearFilters);
      expect($('button:contains("Apply filters")').length).toBeGreaterThan(0);
    });

    it("should render the filter inputs with labels", () => {
      const data = buildData();

      const { $ } = render(env, TEMPLATE, data);

      expect($("#email")).toHaveLength(1);
      expect($("#userId")).toHaveLength(1);
      expect($("label[for='email']").text()).toContain(en.filters.emailLabel);
      expect($("label[for='userId']").text()).toContain(en.filters.userIdLabel);
      expect($("input[name='day']")).toHaveLength(1);
      expect($("input[name='actions']")).toHaveLength(1);
    });

    it("should render a table of logs with view links", () => {
      const logs = [
        { id: "log-1", timestamp: "01/01/2026 09:00:00", userEmail: "user1@example.com", action: "USER_LOGIN" },
        { id: "log-2", timestamp: "02/01/2026 10:00:00", userEmail: "user2@example.com", action: "USER_LOGOUT" }
      ];
      const data = buildData({ logs });

      const { $ } = render(env, TEMPLATE, data);

      expect($("table.govuk-table tbody tr")).toHaveLength(2);
      expect($("th").text()).toContain(en.tableHeaders.timestamp);
      expect($("table").text()).toContain("user1@example.com");
      expect($('a[href="/audit-log-detail?id=log-1"]')).toHaveLength(1);
      expect($('a[href="/audit-log-detail?id=log-1"]').text()).toContain(en.viewLink);
    });

    it("should render the no results message when there are no logs", () => {
      const data = buildData({ logs: [] });

      const { $ } = render(env, TEMPLATE, data);

      expect($("table.govuk-table")).toHaveLength(0);
      expect($(".govuk-body").text()).toContain(en.noResults);
    });

    it("should render pagination links when there is more than one page", () => {
      const data = buildData({ logs: [{ id: "log-1", timestamp: "t", userEmail: "e", action: "a" }], totalPages: 3, currentPage: 2 });

      const { $ } = render(env, TEMPLATE, data);

      expect($("nav.govuk-pagination")).toHaveLength(1);
      expect($(".govuk-pagination__prev a").attr("href")).toContain("page=1");
      expect($(".govuk-pagination__next a").attr("href")).toContain("page=3");
    });

    it("should not render an error summary when there are no errors", () => {
      const data = buildData();

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });
  });

  describe("Error states", () => {
    it("should render the error summary with validation messages", () => {
      const errors = {
        email: { text: en.invalidEmail, href: "#email" },
        date: { text: en.invalidDate, href: "#day" }
      };
      const data = buildData({ errors, errorList: Object.values(errors) });

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.invalidEmail, en.invalidDate]);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh headings and labels", () => {
      const data = buildData({ content: cy });

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1#top").text()).toContain(cy.listTitle);
      expect($("h2").text()).toContain(cy.filters.heading);
      expect($('a[href="/audit-log-list"]').text()).toContain(cy.filters.clearFilters);
      expect($(".govuk-body").text()).toContain(cy.noResults);
    });
  });
});
