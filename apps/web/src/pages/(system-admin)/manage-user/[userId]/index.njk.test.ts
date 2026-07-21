import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/manage-user/[userId]/index.njk";

const buildUser = () => ({
  userId: "user-123",
  email: "test@example.com",
  role: "VERIFIED",
  userProvenance: "B2C",
  userProvenanceId: "prov-456",
  createdDate: "01/02/2024 09:30:00",
  lastSignedInDate: "03/04/2024 14:15:00"
});

describe("manage-user template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("English content", () => {
    it("should render the page heading with the user email", () => {
      const user = buildUser();
      const data = { ...en, user, lng: "" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1.govuk-heading-l").text().trim()).toBe(en.pageTitle(user.email));
    });

    it("should render the warning text", () => {
      const user = buildUser();
      const data = { ...en, user, lng: "" };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-warning-text__text").text()).toContain(en.warningText);
    });

    it("should render the user details in the summary list", () => {
      const user = buildUser();
      const data = { ...en, user, lng: "" };

      const { $ } = render(env, TEMPLATE, data);

      const keys = $(".govuk-summary-list__key")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(keys).toEqual([en.userIdLabel, en.emailLabel, en.roleLabel, en.provenanceLabel, en.provenanceIdLabel, en.creationDateLabel, en.lastSignInLabel]);

      const values = $(".govuk-summary-list__value")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(values).toEqual([user.userId, user.email, user.role, user.userProvenance, user.userProvenanceId, user.createdDate, user.lastSignedInDate]);
    });

    it("should render the delete user form pointing at the confirmation route", () => {
      const user = buildUser();
      const data = { ...en, user, lng: "" };

      const { $ } = render(env, TEMPLATE, data);

      const form = $("form");
      expect(form.attr("method")).toBe("get");
      expect(form.attr("action")).toBe(`/delete-user-confirm/${user.userId}`);
      expect($("button.govuk-button--warning").text().trim()).toBe(en.deleteUserButton);
    });

    it("should render the back link to the user list", () => {
      const user = buildUser();
      const data = { ...en, user, lng: "" };

      const { $ } = render(env, TEMPLATE, data);

      const backLink = $("a.govuk-link[href='/find-users']");
      expect(backLink.text().trim()).toBe(en.backLink);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading, warning and button", () => {
      const user = buildUser();
      const data = { ...cy, user, lng: "cy" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1.govuk-heading-l").text().trim()).toBe(cy.pageTitle(user.email));
      expect($(".govuk-warning-text__text").text()).toContain(cy.warningText);
      expect($("button.govuk-button--warning").text().trim()).toBe(cy.deleteUserButton);
    });

    it("should append the language query to the form action and back link", () => {
      const user = buildUser();
      const data = { ...cy, user, lng: "cy" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("form").attr("action")).toBe(`/delete-user-confirm/${user.userId}?lng=cy`);
      expect($("a.govuk-link[href='/find-users?lng=cy']").text().trim()).toBe(cy.backLink);
    });
  });
});
