import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/account-home/index.njk";

describe("account-home template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      const data = { title: en.title, sections: en.sections };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text().trim()).toBe(en.title);
    });

    it("should render the three tiles with headings and descriptions", () => {
      const data = { title: en.title, sections: en.sections };

      const { $ } = render(env, TEMPLATE, data);

      const tileHeadings = $(".verified-tile-heading")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(tileHeadings).toEqual([en.sections.courtHearings.title, en.sections.sjpCases.title, en.sections.emailSubscriptions.title]);

      const body = $("body").text();
      expect(body).toContain(en.sections.courtHearings.description);
      expect(body).toContain(en.sections.sjpCases.description);
      expect(body).toContain(en.sections.emailSubscriptions.description);
    });

    it("should link each tile to the correct destination from its heading only", () => {
      const data = { title: en.title, sections: en.sections };

      const { $ } = render(env, TEMPLATE, data);

      const links = $(".verified-tile a");
      expect(links).toHaveLength(3);
      expect(links.map((_, el) => $(el).attr("href")).get()).toEqual(["/search", "/summary-of-publications?locationId=9", "/subscription-management"]);
      links.each((_, el) => {
        expect($(el).parent().is("h2.verified-tile-heading")).toBe(true);
        expect($(el).hasClass("verified-tile__link")).toBe(true);
      });
    });

    it("should render one link per tile whose name is the heading, with the description outside the link", () => {
      const data = { title: en.title, sections: en.sections };

      const { $ } = render(env, TEMPLATE, data);

      const tiles = $("div.verified-tile");
      expect(tiles).toHaveLength(3);
      tiles.each((_, tile) => {
        const tileLinks = $(tile).find("a");
        expect(tileLinks).toHaveLength(1);
        expect(tileLinks.text().trim()).toBe($(tile).find(".verified-tile-heading").text().trim());
        expect($(tile).find(".verified-tile-description").closest("a")).toHaveLength(0);
      });
      expect($("a.verified-tile")).toHaveLength(0);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading and tile headings", () => {
      const data = { title: cy.title, sections: cy.sections };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text().trim()).toBe(cy.title);
      const tileHeadings = $(".verified-tile-heading")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(tileHeadings).toEqual([cy.sections.courtHearings.title, cy.sections.sjpCases.title, cy.sections.emailSubscriptions.title]);
    });
  });
});
