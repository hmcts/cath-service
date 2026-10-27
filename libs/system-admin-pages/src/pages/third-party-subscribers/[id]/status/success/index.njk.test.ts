import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = "index.njk";

function buildData(locale: typeof en | typeof cy = en, lngParam = "") {
  return { ...locale, en, cy, lngParam };
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("third-party-subscribers status success template", () => {
  it("should render the confirmation panel", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    const panel = $(".govuk-panel--confirmation");
    expect(panel).toHaveLength(1);
    expect(panel.find(".govuk-panel__title").text().trim()).toBe("Third party account status updated");
    expect(panel.find(".govuk-panel__body").text().trim()).toBe("Third party account status has been successfully updated.");
    expect($("title").text()).toContain("Third party account status updated");
  });

  it("should render the next message followed by a link to the subscribers list", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    const message = $("p.govuk-body");
    expect(message.text()).toContain("To further update third party account, you can go to:");
    const link = message.find("a.govuk-link");
    expect(link).toHaveLength(1);
    expect(link.text().trim()).toBe("Manage third party subscribers");
    expect(link.attr("href")).toBe("/third-party-subscribers");
  });

  it("should not render a back link", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    expect($("a.govuk-back-link")).toHaveLength(0);
  });

  it("should render Welsh content and keep the language param on the link", () => {
    const { $ } = render(env, TEMPLATE, buildData(cy, "?lng=cy"));

    expect($(".govuk-panel__title").text().trim()).toBe("Statws cyfrif trydydd parti wedi'i ddiweddaru");
    expect($(".govuk-panel__body").text().trim()).toBe("Mae statws y cyfrif trydydd parti wedi'i ddiweddaru'n llwyddiannus.");
    expect($("p.govuk-body").text()).toContain("I ddiweddaru'r cyfrif trydydd parti ymhellach, gallwch fynd i:");
    const link = $("p.govuk-body a.govuk-link");
    expect(link.text().trim()).toBe("Rheoli tanysgrifwyr trydydd parti");
    expect(link.attr("href")).toBe("/third-party-subscribers?lng=cy");
  });
});

describe("third-party-subscribers status success content", () => {
  it("should have the same keys in English and Welsh", () => {
    expect(Object.keys(cy).sort()).toEqual(Object.keys(en).sort());
  });
});
