import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import { sanitiseHtmlFilter } from "@hmcts/web-core";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(public)/summary-of-publications/index.njk";

const buildData = (t: typeof en, overrides: Record<string, unknown> = {}) => ({
  en,
  cy,
  title: `${t.titlePrefix} Oxford Combined Court Centre${t.titleSuffix}`,
  noPublicationsMessage: t.noPublicationsMessage,
  selectListMessage: t.selectListMessage,
  publications: [],
  cautionMessage: undefined,
  noListMessage: undefined,
  factLinkText: t.factLinkText,
  factLinkUrl: t.factLinkUrl,
  factAdditionalText: t.factAdditionalText,
  isSjpVenue: false,
  sjpAdvisoryPrefix: t.sjpAdvisoryPrefix,
  sjpAdvisoryMessage: t.sjpAdvisoryMessage,
  ...overrides
});

const PUBLICATION = {
  id: "url-artefact",
  displayName: "SJP Public List 12 July 2026",
  languageLabel: en.languageEnglish,
  isFlatFile: false,
  locationId: "9",
  urlPath: "sjp-public-list"
};

describe("summary-of-publications template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
    // Registered as the real filter rather than a stub — it is the control that stops
    // admin-authored markup executing on this page, so stubbing it would make the
    // assertions below meaningless.
    env.addFilter("sanitiseHtml", sanitiseHtmlFilter);
  });

  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("Template rendering", () => {
    it("should render the page title as the heading", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(`${en.titlePrefix} Oxford Combined Court Centre${en.titleSuffix}`);
    });

    it("should render the fact link with url and additional text", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      const link = $(`a[href="${en.factLinkUrl}"]`);
      expect(link.text().trim()).toBe(en.factLinkText);
      expect($("body").text()).toContain(en.factAdditionalText);
    });

    it("should render the no publications message when there are no publications", () => {
      const data = buildData(en, { publications: [] });

      const { $ } = render(env, TEMPLATE, data);

      expect($("body").text()).toContain(en.noPublicationsMessage);
      assertNoErrors($);
    });

    it("should not show the no publications message when a noListMessage is present", () => {
      const data = buildData(en, { noListMessage: "Custom no list message" });

      const { $ } = render(env, TEMPLATE, data);

      expect($("body").text()).toContain("Custom no list message");
      expect($("body").text()).not.toContain(en.noPublicationsMessage);
    });

    it("should render the caution message when present", () => {
      const data = buildData(en, { cautionMessage: "Caution notice" });

      const { $ } = render(env, TEMPLATE, data);

      expect($("body").text()).toContain("Caution notice");
    });

    it("should render the select list message and publication links when publications exist", () => {
      const publications = [
        {
          id: "flat-file-artefact",
          displayName: "SJP Public List 12 July 2026",
          languageLabel: en.languageEnglish,
          isFlatFile: true,
          locationId: "5",
          urlPath: null
        },
        {
          id: "url-artefact",
          displayName: "Civil Daily Cause List 12 July 2026",
          languageLabel: en.languageEnglish,
          isFlatFile: false,
          locationId: "5",
          urlPath: "civil-daily-cause-list"
        },
        {
          id: "fallback-artefact",
          displayName: "Fallback Publication 12 July 2026",
          languageLabel: en.languageWelsh,
          isFlatFile: false,
          locationId: "5",
          urlPath: null
        }
      ];
      const data = buildData(en, { publications });

      const { $ } = render(env, TEMPLATE, data);

      expect($("body").text()).toContain(en.selectListMessage);
      expect($('a[href="/hearing-lists/5/flat-file-artefact"]')).toHaveLength(1);
      expect($('a[href="/civil-daily-cause-list?artefactId=url-artefact"]')).toHaveLength(1);
      expect($('a[href="/publication/fallback-artefact"]')).toHaveLength(1);
      expect($("ul.govuk-list li")).toHaveLength(3);
      expect($("body").text()).not.toContain(en.noPublicationsMessage);
    });

    it.each([["cautionMessage"], ["noListMessage"]])("should render allowed formatting in %s as markup", (field) => {
      const data = buildData(en, { [field]: "<p><strong>Court closed</strong></p><p>Reopens Monday</p>" });

      const { $ } = render(env, TEMPLATE, data);

      const message = $("div.govuk-body");
      expect(message.find("strong").text()).toBe("Court closed");
      expect(message.find("p")).toHaveLength(2);
    });

    it.each([["cautionMessage"], ["noListMessage"]])("should discard unsafe markup in %s while keeping allowed formatting", (field) => {
      const data = buildData(en, {
        [field]: '<strong>Court closed</strong><script>alert(1)</script><img src="x" onerror="alert(2)">'
      });

      const { html, $ } = render(env, TEMPLATE, data);

      const message = $("div.govuk-body");
      expect(message.find("strong").text()).toBe("Court closed");
      expect(message.find("script")).toHaveLength(0);
      expect(message.find("img")).toHaveLength(0);
      expect(html).not.toContain("alert(1)");
      expect(html).not.toContain("onerror");
    });

    it("should render an error summary when an error is present", () => {
      const data = buildData(en, { error: "Something went wrong" });

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, ["Something went wrong"]);
    });

    it("should render Welsh content", () => {
      const data = buildData(cy);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.titlePrefix);
      expect($("h1").text()).toContain(cy.titleSuffix);
      expect($(`a[href="${cy.factLinkUrl}"]`).text().trim()).toBe(cy.factLinkText);
      expect($("body").text()).toContain(cy.noPublicationsMessage);
    });

    it("should render Welsh language labels for publications", () => {
      const publications = [
        {
          id: "english-artefact",
          displayName: "Rhestr Achosion Dyddiol 12 Gorffennaf 2026",
          languageLabel: cy.languageEnglish,
          isFlatFile: false,
          locationId: "5",
          urlPath: null
        },
        {
          id: "welsh-artefact",
          displayName: "Rhestr Achosion Dyddiol 12 Gorffennaf 2026",
          languageLabel: cy.languageWelsh,
          isFlatFile: false,
          locationId: "5",
          urlPath: null
        }
      ];
      const data = buildData(cy, { publications });

      const { $ } = render(env, TEMPLATE, data);

      expect($("ul.govuk-list").text()).toContain(cy.languageEnglish);
      expect($("ul.govuk-list").text()).toContain(cy.languageWelsh);
    });
  });

  describe("SJP publishing advisory", () => {
    const childPositionOf = ($: ReturnType<typeof render>["$"], selector: string) => $(".govuk-grid-column-full").children().index($(selector));

    const positionOfTextBlock = ($: ReturnType<typeof render>["$"], text: string) => {
      const children = $(".govuk-grid-column-full").children();
      return children.index(children.filter((_index, element) => $(element).text().includes(text)).first());
    };

    it("should render the advisory once with a bold prefix when the venue is the SJP venue", () => {
      const data = buildData(en, { isSjpVenue: true, publications: [PUBLICATION] });

      const { $ } = render(env, TEMPLATE, data);

      const advisory = $("#sjp-publishing-advisory");
      expect(advisory).toHaveLength(1);
      expect(advisory.find("strong").text()).toBe(en.sjpAdvisoryPrefix);
      expect(advisory.text()).toContain(en.sjpAdvisoryMessage);
    });

    it("should render the advisory above the select list message when publications exist", () => {
      const data = buildData(en, { isSjpVenue: true, publications: [PUBLICATION] });

      const { $ } = render(env, TEMPLATE, data);

      const advisoryPosition = childPositionOf($, "#sjp-publishing-advisory");
      expect(advisoryPosition).toBeGreaterThan(positionOfTextBlock($, en.factAdditionalText));
      expect(advisoryPosition).toBeLessThan(positionOfTextBlock($, en.selectListMessage));
    });

    it("should render the advisory above the no publications message when there are no publications", () => {
      const data = buildData(en, { isSjpVenue: true, publications: [] });

      const { $ } = render(env, TEMPLATE, data);

      const advisoryPosition = childPositionOf($, "#sjp-publishing-advisory");
      expect(advisoryPosition).toBeGreaterThan(positionOfTextBlock($, en.factAdditionalText));
      expect(advisoryPosition).toBeLessThan(positionOfTextBlock($, en.noPublicationsMessage));
    });

    it("should render the advisory above an admin authored no list message", () => {
      const data = buildData(en, { isSjpVenue: true, publications: [], noListMessage: "Court closed today" });

      const { $ } = render(env, TEMPLATE, data);

      expect(childPositionOf($, "#sjp-publishing-advisory")).toBeLessThan(positionOfTextBlock($, "Court closed today"));
    });

    it.each([
      ["publications exist", [PUBLICATION]],
      ["there are no publications", []]
    ])("should not render the advisory on a non-SJP venue when %s", (_description, publications) => {
      const data = buildData(en, { isSjpVenue: false, publications });

      const { $ } = render(env, TEMPLATE, data);

      expect($("#sjp-publishing-advisory")).toHaveLength(0);
      expect($("body").text()).not.toContain(en.sjpAdvisoryMessage);
    });

    it("should render the caution message before the advisory when both are present", () => {
      const data = buildData(en, { isSjpVenue: true, cautionMessage: "Caution notice", publications: [PUBLICATION] });

      const { $ } = render(env, TEMPLATE, data);

      const cautionPosition = positionOfTextBlock($, "Caution notice");
      const advisoryPosition = childPositionOf($, "#sjp-publishing-advisory");
      expect(cautionPosition).toBeLessThan(advisoryPosition);
      expect(advisoryPosition).toBeLessThan(positionOfTextBlock($, en.selectListMessage));
    });

    it("should render the Welsh advisory and no English advisory text when the Welsh locale is used", () => {
      const data = buildData(cy, { isSjpVenue: true, publications: [] });

      const { $ } = render(env, TEMPLATE, data);

      const advisory = $("#sjp-publishing-advisory");
      expect(advisory.find("strong").text()).toBe(cy.sjpAdvisoryPrefix);
      expect(advisory.text()).toContain(cy.sjpAdvisoryMessage);
      expect($("body").text()).not.toContain(en.sjpAdvisoryMessage);
      expect($("body").text()).not.toContain(en.sjpAdvisoryPrefix);
    });

    it("should escape markup in the advisory content rather than rendering it", () => {
      const data = buildData(en, {
        isSjpVenue: true,
        sjpAdvisoryPrefix: "<em>Please note:</em>",
        sjpAdvisoryMessage: '<script>alert(1)</script><img src="x" onerror="alert(2)">'
      });

      const { $ } = render(env, TEMPLATE, data);

      const advisory = $("#sjp-publishing-advisory");
      expect(advisory.find("strong")).toHaveLength(1);
      expect(advisory.find("em")).toHaveLength(0);
      expect(advisory.find("script")).toHaveLength(0);
      expect(advisory.find("img")).toHaveLength(0);
      expect(advisory.find("strong").text()).toBe("<em>Please note:</em>");
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = [
        "titlePrefix",
        "titleSuffix",
        "noPublicationsMessage",
        "languageEnglish",
        "languageWelsh",
        "sjpAdvisoryPrefix",
        "sjpAdvisoryMessage"
      ];

      for (const key of requiredKeys) {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      }
    });
  });
});
