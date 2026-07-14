import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import * as cy from "./cy.js";
import * as en from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/configure-list-type-enter-details/index.njk";

const uncheckedProvenance = { CFT_IDAM: false, PI_AAD: false, CRIME_IDAM: false };

describe("configure-list-type-enter-details template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading and view all button", () => {
      const data = {
        ...en,
        data: {},
        checkedProvenance: uncheckedProvenance,
        isEdit: false
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.configureListType.enterDetails.title);
      expect($('a[href="/view-list-types"]').text()).toContain(en.configureListType.enterDetails.viewAllLink);
      assertNoErrors($);
    });

    it("should render all form field labels", () => {
      const data = {
        ...en,
        data: {},
        checkedProvenance: uncheckedProvenance,
        isEdit: false
      };

      const { $ } = render(env, TEMPLATE, data);

      const bodyText = $("body").text();
      expect(bodyText).toContain(en.configureListType.enterDetails.nameLabel);
      expect(bodyText).toContain(en.configureListType.enterDetails.friendlyNameLabel);
      expect(bodyText).toContain(en.configureListType.enterDetails.welshFriendlyNameLabel);
      expect(bodyText).toContain(en.configureListType.enterDetails.shortenedFriendlyNameLabel);
      expect(bodyText).toContain(en.configureListType.enterDetails.urlLabel);
      expect(bodyText).toContain(en.configureListType.enterDetails.defaultSensitivityLabel);
      expect(bodyText).toContain(en.configureListType.enterDetails.allowedProvenanceLabel);
      expect(bodyText).toContain(en.configureListType.enterDetails.isNonStrategicLabel);
    });

    it("should render the continue button", () => {
      const data = {
        ...en,
        data: {},
        checkedProvenance: uncheckedProvenance,
        isEdit: false
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-button").text()).toContain(en.common.continue);
    });

    it("should populate inputs with existing form data", () => {
      const data = {
        ...en,
        data: {
          name: "MY_LIST_TYPE",
          friendlyName: "My List Type",
          url: "my-list-type"
        },
        checkedProvenance: { CFT_IDAM: true, PI_AAD: false, CRIME_IDAM: false },
        isEdit: true
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("#name").val()).toBe("MY_LIST_TYPE");
      expect($("#friendlyName").val()).toBe("My List Type");
      expect($("#url").val()).toBe("my-list-type");
      expect($('input[name="allowedProvenance"][value="CFT_IDAM"]').is(":checked")).toBe(true);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh page heading and continue button", () => {
      const data = {
        ...cy,
        data: {},
        checkedProvenance: uncheckedProvenance,
        isEdit: false
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.configureListType.enterDetails.title);
      expect($(".govuk-button").text()).toContain(cy.common.continue);
    });
  });

  describe("Error states", () => {
    it("should render an error summary when errors are present", () => {
      const data = {
        ...en,
        data: { name: "" },
        checkedProvenance: uncheckedProvenance,
        errors: { name: { text: "Enter a name" } },
        errorList: [{ text: "Enter a name", href: "#name" }],
        isEdit: false
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, ["Enter a name"]);
      expect($(".govuk-error-summary__title").text()).toContain(en.common.errorSummaryTitle);
    });
  });
});
