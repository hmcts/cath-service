import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/manage-third-party-user/index.njk";

const mockUser = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Test User",
  createdDate: new Date("2026-07-13T09:00:00Z"),
  subscriptions: [{ listTypeId: 1 }, { listTypeId: 2 }]
};

describe("manage-third-party-user template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
    env.addFilter("date", (value: Date | string) => new Date(value).toLocaleDateString("en-GB"));
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      const data = { ...en, user: mockUser, locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.pageTitle);
    });

    it("should render the user details in a summary list", () => {
      const data = { ...en, user: mockUser, locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      const keys = $(".govuk-summary-list__key")
        .map((_, el) => $(el).text().trim())
        .get();
      const values = $(".govuk-summary-list__value")
        .map((_, el) => $(el).text().trim())
        .get();

      expect(keys).toContain(en.nameLabel);
      expect(keys).toContain(en.createdDateLabel);
      expect(keys).toContain(en.numberOfSubscriptionsLabel);
      expect(values).toContain(mockUser.name);
      expect(values).toContain(String(mockUser.subscriptions.length));
    });

    it("should render manage subscriptions and delete buttons with English links", () => {
      const data = { ...en, user: mockUser, locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      const manageLink = $(`a[href="/manage-third-party-subscriptions?id=${mockUser.id}"]`);
      const deleteLink = $(`a[href="/delete-third-party-user?id=${mockUser.id}"]`);
      expect(manageLink.text().trim()).toBe(en.manageSubscriptionsButton);
      expect(deleteLink.text().trim()).toBe(en.deleteUserButton);
      expect(deleteLink.hasClass("govuk-button--warning")).toBe(true);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh page heading", () => {
      const data = { ...cy, user: mockUser, locale: "cy" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.pageTitle);
    });

    it("should append the Welsh locale query to action links", () => {
      const data = { ...cy, user: mockUser, locale: "cy" };

      const { $ } = render(env, TEMPLATE, data);

      expect($(`a[href="/manage-third-party-subscriptions?id=${mockUser.id}&lng=cy"]`).length).toBe(1);
      expect($(`a[href="/delete-third-party-user?id=${mockUser.id}&lng=cy"]`).length).toBe(1);
    });
  });

  describe("No user", () => {
    it("should render the heading without a summary list or action buttons", () => {
      const data = { ...en, errors: [{ text: en.userNotFound }], locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.pageTitle);
      expect($(".govuk-summary-list").length).toBe(0);
      expect($("a.govuk-button").length).toBe(0);
    });
  });
});
