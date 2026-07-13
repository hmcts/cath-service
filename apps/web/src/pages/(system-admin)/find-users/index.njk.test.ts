import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/find-users/index.njk";

const userRows = [
  [
    { text: "user@example.com" },
    { text: en.roleVerified },
    { text: en.provenanceCftIdam },
    { html: '<a href="/manage-user/user-1" class="govuk-link">Manage</a>' }
  ]
];

const baseData = {
  ...en,
  userRows,
  totalCount: 1,
  currentPage: 1,
  totalPages: 1,
  paginationItems: [{ number: 1, current: true, href: "/find-users?page=1" }],
  paginationPrevious: undefined,
  paginationNext: undefined,
  filters: {},
  selectedFilterGroups: [],
  hasFilters: false,
  errors: undefined,
  lng: ""
};

describe("find-users template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      // Arrange
      const data = { ...baseData };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1.govuk-heading-xl").text().trim()).toBe(en.pageTitle);
    });

    it("should render the filter form inputs and apply button", () => {
      // Arrange
      const data = { ...baseData };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("form").attr("method")).toBe("post");
      expect($("input#email")).toHaveLength(1);
      expect($("input#userId")).toHaveLength(1);
      expect($("input#userProvenanceId")).toHaveLength(1);
      expect($("input[name='roles']")).toHaveLength(4);
      expect($("input[name='provenances']")).toHaveLength(4);
      expect($("button.govuk-button").text().trim()).toBe(en.applyFiltersButton);
    });

    it("should render the results count and table with a user row", () => {
      // Arrange
      const data = { ...baseData };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("p.govuk-body").first().text().trim()).toBe(en.resultsCount(1));
      const headers = $(".govuk-table__header")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain(en.tableHeadEmail);
      expect(headers).toContain(en.tableHeadRole);
      expect(headers).toContain(en.tableHeadProvenance);
      expect($(".govuk-table__body .govuk-table__row")).toHaveLength(1);
      const manageLink = $('.govuk-table__body a[href="/manage-user/user-1"]');
      expect(manageLink).toHaveLength(1);
      expect(manageLink.text().trim()).toBe(en.manageLink);
    });

    it("should render selected filter tags and clear filters link when filters are applied", () => {
      // Arrange
      const data = {
        ...baseData,
        filters: { email: "user@example.com" },
        hasFilters: true,
        selectedFilterGroups: [
          {
            heading: en.emailLabel,
            tags: [{ label: "user@example.com", removeUrl: "/find-users/remove-filter?filter=email" }]
          }
        ]
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".user-management-selected-filters h3").text().trim()).toBe(en.selectedFiltersHeading);
      const removeLink = $('a[href="/find-users/remove-filter?filter=email"]');
      expect(removeLink).toHaveLength(1);
      expect(removeLink.text()).toContain("user@example.com");
      const clearLink = $('a[href="/find-users/clear-filters"]');
      expect(clearLink).toHaveLength(1);
      expect(clearLink.text().trim()).toBe(en.clearFiltersButton);
    });

    it("should render pagination when there is more than one page", () => {
      // Arrange
      const data = {
        ...baseData,
        currentPage: 1,
        totalPages: 2,
        paginationNext: { href: "/find-users?page=2" },
        paginationItems: [
          { number: 1, current: true, href: "/find-users?page=1" },
          { number: 2, current: false, href: "/find-users?page=2" }
        ]
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-pagination")).toHaveLength(1);
      expect($('.govuk-pagination a[href="/find-users?page=2"]').length).toBeGreaterThan(0);
    });

    it("should not render the results table when there are no results", () => {
      // Arrange
      const data = { ...baseData, userRows: [], totalCount: 0, totalPages: 0 };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-table")).toHaveLength(0);
    });

    it("should not render an error summary when there are no errors", () => {
      // Arrange
      const data = { ...baseData };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertNoErrors($);
    });

    it("should render an error summary when a no-results error exists", () => {
      // Arrange
      const data = {
        ...baseData,
        totalCount: 0,
        userRows: [],
        totalPages: 0,
        errors: [{ text: en.noResultsError, href: "#email" }]
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [en.noResultsError]);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading and controls", () => {
      // Arrange
      const data = { ...baseData, ...cy };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1.govuk-heading-xl").text().trim()).toBe(cy.pageTitle);
      expect($("button.govuk-button").text().trim()).toBe(cy.applyFiltersButton);
      expect($("p.govuk-body").first().text().trim()).toBe(cy.resultsCount(1));
    });

    it("should render the Welsh error summary", () => {
      // Arrange
      const data = {
        ...baseData,
        ...cy,
        totalCount: 0,
        userRows: [],
        totalPages: 0,
        errors: [{ text: cy.noResultsError, href: "#email" }]
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [cy.noResultsError]);
    });
  });
});
