import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/manage-third-party-users/index.njk";

const mockUsers = [
  { id: "user-1", name: "Alice Example", createdDate: new Date("2024-01-01"), subscriptions: [{}, {}] },
  { id: "user-2", name: "Bob Example", createdDate: new Date("2024-02-02"), subscriptions: [] }
];

describe("manage-third-party-users template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts and components
    ]);

    env.addFilter("date", (value: string | Date) => {
      if (!value) return "";
      const date = typeof value === "string" ? new Date(value) : value;
      return date.toLocaleDateString("en-GB");
    });
  });

  describe("English content", () => {
    it("should render the page heading and create-user button", () => {
      const data = { ...en, locale: "en", users: mockUsers };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.pageTitle);
      const createLink = $("a.govuk-button");
      expect(createLink.text().trim()).toBe(en.createNewUserButton);
      expect(createLink.attr("href")).toBe("/create-third-party-user");
      assertNoErrors($);
    });

    it("should render the table headers and a row per user", () => {
      const data = { ...en, locale: "en", users: mockUsers };

      const { $ } = render(env, TEMPLATE, data);

      const headers = $(".govuk-table__head .govuk-table__header")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([en.nameColumnHeader, en.createdDateColumnHeader, en.numberOfSubscriptionsColumnHeader, en.actionsColumnHeader]);

      const bodyRows = $(".govuk-table__body .govuk-table__row");
      expect(bodyRows).toHaveLength(2);
      expect($(bodyRows[0]).text()).toContain("Alice Example");
      expect($(bodyRows[0]).text()).toContain("2");

      const manageLinks = $(".govuk-table__body a.govuk-link");
      expect(manageLinks).toHaveLength(2);
      expect(manageLinks.first().text().trim()).toBe(en.manageLink);
      expect(manageLinks.first().attr("href")).toBe("/manage-third-party-user?id=user-1");
    });

    it("should render the no-users message when the list is empty", () => {
      const data = { ...en, locale: "en", users: [] };

      const { $ } = render(env, TEMPLATE, data);

      expect($("p.govuk-body").text()).toContain(en.noUsersMessage);
      expect($(".govuk-table")).toHaveLength(0);
      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading, button and manage links with lng=cy", () => {
      const data = { ...cy, locale: "cy", users: mockUsers };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.pageTitle);
      const createLink = $("a.govuk-button");
      expect(createLink.text().trim()).toBe(cy.createNewUserButton);
      expect(createLink.attr("href")).toBe("/create-third-party-user?lng=cy");

      const headers = $(".govuk-table__head .govuk-table__header")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([cy.nameColumnHeader, cy.createdDateColumnHeader, cy.numberOfSubscriptionsColumnHeader, cy.actionsColumnHeader]);

      const manageLinks = $(".govuk-table__body a.govuk-link");
      expect(manageLinks.first().text().trim()).toBe(cy.manageLink);
      expect(manageLinks.first().attr("href")).toBe("/manage-third-party-user?id=user-1&lng=cy");
    });
  });
});
