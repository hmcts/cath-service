import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "index.njk";
const SUBSCRIBER_ID = "00000000-0000-0000-0000-000000000001";

let env: nunjucks.Environment;

function renderPage(locale: typeof en | typeof cy = en, overrides: Record<string, unknown> = {}) {
  return render(env, TEMPLATE, {
    ...locale,
    en,
    cy,
    lngParam: locale === cy ? "?lng=cy" : "",
    userId: SUBSCRIBER_ID,
    ...overrides
  });
}

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../../web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("manage subscriber status success template", () => {
  it("should render a confirmation panel with the title as the only H1", () => {
    const { $ } = renderPage();

    const panel = $(".govuk-panel--confirmation");
    expect(panel).toHaveLength(1);
    expect($("h1")).toHaveLength(1);
    expect(panel.find("h1.govuk-panel__title").text().trim()).toBe("Third Party Account Status Updated");
    expect(panel.find(".govuk-panel__body").text().trim()).toBe("Third party account status has been successfully updated.");
    expect($("title").text()).toContain("Third Party Account Status Updated");
  });

  it("should render the further update text followed by a link to the subscriber list", () => {
    const { $ } = renderPage();

    const paragraph = $("main p.govuk-body");
    expect(paragraph).toHaveLength(1);
    expect(paragraph.text().replace(/\s+/g, " ").trim()).toBe("To further update third party account, you can go to: Manage third party subscriber");
    const link = paragraph.find("a.govuk-link");
    expect(link).toHaveLength(1);
    expect(link.text().trim()).toBe("Manage third party subscriber");
    expect(link.attr("href")).toBe("/third-party-subscribers");
  });

  it("should render a back link to the manage page", () => {
    const { $ } = renderPage();

    expect($("a.govuk-back-link").attr("href")).toBe(`/third-party-subscribers/${SUBSCRIBER_ID}/manage`);
  });

  it("should encode the subscriber id in the back link", () => {
    const { $ } = renderPage(en, { userId: "../x?y" });

    expect($("a.govuk-back-link").attr("href")).toBe("/third-party-subscribers/..%2Fx%3Fy/manage");
  });

  it("should render Welsh content and keep the language parameter on links", () => {
    const { $ } = renderPage(cy);

    expect($(".govuk-panel__title").text().trim()).toBe("Statws Cyfrif Trydydd Parti wedi'i Ddiweddaru");
    expect($(".govuk-panel__body").text().trim()).toBe("Mae statws y cyfrif trydydd parti wedi'i ddiweddaru'n llwyddiannus.");
    const link = $("main p.govuk-body a");
    expect(link.text().trim()).toBe("Rheoli tanysgrifiwr trydydd parti");
    expect(link.attr("href")).toBe("/third-party-subscribers?lng=cy");
    expect($("a.govuk-back-link").attr("href")).toBe(`/third-party-subscribers/${SUBSCRIBER_ID}/manage?lng=cy`);
  });

  describe("locale parity", () => {
    it("should have identical keys in en and cy", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should not contain translation placeholders in cy", () => {
      expect(JSON.stringify(cy)).not.toContain("WELSH TRANSLATION REQUIRED");
    });
  });
});
