import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type { CheerioAPI } from "cheerio";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = "index.njk";
const USER_ID = "00000000-0000-0000-0000-000000000001";

function buildData(locale: typeof en | typeof cy = en, overrides: Record<string, unknown> = {}) {
  return {
    ...locale,
    en,
    cy,
    lngParam: "",
    userId: USER_ID,
    name: "Test Corp",
    createdAt: "15/01/2026",
    subscriptionCount: 2,
    status: locale.statusLabels.PENDING,
    ...overrides
  };
}

function findRow($: CheerioAPI, key: string) {
  return $(".govuk-summary-list__row").filter((_, el) => $(el).find(".govuk-summary-list__key").text().trim() === key);
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("third-party-subscribers manage template", () => {
  it("should render a Status row with the status label", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    const row = findRow($, "Status");
    expect(row).toHaveLength(1);
    expect(row.find(".govuk-summary-list__value").text().trim()).toBe("Pending");
  });

  it("should render a Change link to the status page with visually hidden context", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    const link = findRow($, "Status").find(".govuk-summary-list__actions a");
    expect(link).toHaveLength(1);
    expect(link.attr("href")).toBe(`/third-party-subscribers/${USER_ID}/status`);
    expect(link.text().replace(/\s+/g, " ").trim()).toBe("Change Status");
    expect(link.find(".govuk-visually-hidden").text().trim()).toBe("Status");
  });

  it("should not render Change links on the other rows", () => {
    const { $ } = render(env, TEMPLATE, buildData());

    expect($(".govuk-summary-list__actions a")).toHaveLength(1);
    expect(findRow($, "Name").find(".govuk-summary-list__actions a")).toHaveLength(0);
  });

  it("should render the Welsh Status row and keep the language param on the Change link", () => {
    const { $ } = render(env, TEMPLATE, buildData(cy, { lngParam: "?lng=cy", status: cy.statusLabels.ACTIVE }));

    const row = findRow($, "Statws");
    expect(row).toHaveLength(1);
    expect(row.find(".govuk-summary-list__value").text().trim()).toBe("Gweithredol");
    const link = row.find(".govuk-summary-list__actions a");
    expect(link.text().replace(/\s+/g, " ").trim()).toBe("Newid Statws");
    expect(link.attr("href")).toBe(`/third-party-subscribers/${USER_ID}/status?lng=cy`);
  });
});

describe("third-party-subscribers manage content", () => {
  it("should have the same keys in English and Welsh", () => {
    expect(Object.keys(cy).sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(cy.tableHeadings).sort()).toEqual(Object.keys(en.tableHeadings).sort());
    expect(Object.keys(cy.statusLabels).sort()).toEqual(Object.keys(en.statusLabels).sort());
  });
});
