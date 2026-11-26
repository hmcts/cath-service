import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = "(system-admin)/list-type-visibility/index.njk";

function buildData(overrides = {}, t: typeof en | typeof cy = en) {
  return {
    t,
    id: 7,
    title: t.hideTitle,
    hint: t.hideHint,
    listTypeName: "Civil Daily Cause List",
    isHidden: false,
    targetState: "hidden",
    data: {},
    ...overrides
  };
}

describe("list-type-visibility template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("when the list type is visible", () => {
    it("should ask whether to hide it and show a green Visible tag", () => {
      const { $ } = render(env, TEMPLATE, buildData());

      expect($("h1").text().trim()).toBe(en.hideTitle);
      expect($(".govuk-hint").text().trim()).toBe(en.hideHint);
      expect($(".govuk-summary-list__value").first().text().trim()).toBe("Civil Daily Cause List");
      const tag = $(".govuk-summary-list .govuk-tag");
      expect(tag.text().trim()).toBe(en.visibleTag);
      expect(tag.hasClass("govuk-tag--green")).toBe(true);
      assertNoErrors($);
    });

    it("should post the hidden target state", () => {
      const { $ } = render(env, TEMPLATE, buildData());

      expect($('form input[type="hidden"][name="targetState"]').val()).toBe("hidden");
    });
  });

  describe("when the list type is hidden", () => {
    it("should ask whether to show it, show a grey Hidden tag and post the visible target state", () => {
      const { $ } = render(env, TEMPLATE, buildData({ title: en.showTitle, hint: en.showHint, isHidden: true, targetState: "visible" }));

      expect($("h1").text().trim()).toBe(en.showTitle);
      expect($(".govuk-hint").text().trim()).toBe(en.showHint);
      const tag = $(".govuk-summary-list .govuk-tag");
      expect(tag.text().trim()).toBe(en.hiddenTag);
      expect(tag.hasClass("govuk-tag--grey")).toBe(true);
      expect($('input[name="targetState"]').val()).toBe("visible");
    });
  });

  it("should render the question once, as the fieldset legend page heading", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    expect($("h1")).toHaveLength(1);
    expect($("fieldset legend.govuk-fieldset__legend--l h1.govuk-fieldset__heading").text().trim()).toBe(en.hideTitle);
    expect($(".govuk-visually-hidden").filter((_, el) => $(el).text().trim() === en.hideTitle)).toHaveLength(0);
  });

  it("should render inline Yes and No radios inside a fieldset with a legend", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    const radios = $('input[type="radio"][name="confirmVisibility"]');
    expect(radios).toHaveLength(2);
    expect(radios.eq(0).attr("id")).toBe("confirmVisibility");
    expect(radios.eq(0).val()).toBe("yes");
    expect(radios.eq(1).val()).toBe("no");
    expect($("fieldset legend").text().trim()).toBe(en.hideTitle);
    expect($(".govuk-radios--inline")).toHaveLength(1);
  });

  it("should keep the previously selected radio checked", () => {
    const { $ } = render(env, TEMPLATE, buildData({ data: { confirmVisibility: "no" } }));

    expect($('input[value="no"]').attr("checked")).toBeDefined();
    expect($('input[value="yes"]').attr("checked")).toBeUndefined();
  });

  it("should render the confirm button without a cancel link", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    expect($("button.govuk-button").text().trim()).toBe(en.confirmButton);
    expect($('a[href="/manage-list-type?id=7"]')).toHaveLength(0);
  });

  it("should render the error summary and inline error when there is an error", () => {
    const { $ } = render(
      env,
      TEMPLATE,
      buildData({
        errors: [{ text: en.errorHideConfirmationRequired, href: "#confirmVisibility" }],
        fieldError: en.errorHideConfirmationRequired
      })
    );

    assertErrorSummary($, [en.errorHideConfirmationRequired]);
    expect($('.govuk-error-summary a[href="#confirmVisibility"]')).toHaveLength(1);
    expect($(".govuk-error-message").text()).toContain(en.errorHideConfirmationRequired);
    expect($(".govuk-form-group--error")).toHaveLength(1);
  });

  it("should show a summary-only error without marking the radios as invalid", () => {
    const { $ } = render(env, TEMPLATE, buildData({ errors: [{ text: en.errorAlreadyHidden }], fieldError: undefined }));

    assertErrorSummary($, [en.errorAlreadyHidden]);
    expect($(".govuk-error-message")).toHaveLength(0);
    expect($(".govuk-form-group--error")).toHaveLength(0);
  });

  it("should render Welsh content when the cy locale is used", () => {
    const { $ } = render(env, TEMPLATE, buildData({}, cy));

    expect($("h1").text().trim()).toBe(cy.hideTitle);
    expect($('label[for="confirmVisibility"]').text().trim()).toBe(cy.yesOption);
    expect($("button.govuk-button").text().trim()).toBe(cy.confirmButton);
    expect($(".govuk-summary-list .govuk-tag").text().trim()).toBe(cy.visibleTag);
  });

  it("should have matching keys in English and Welsh content", () => {
    expect(Object.keys(cy).sort()).toEqual(Object.keys(en).sort());
  });
});
