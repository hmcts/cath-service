import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The controller inlines its locale content and does not export it. These
// objects mirror the en/cy passed to res.render in index.ts. The i18n
// middleware flattens the selected locale to top-level template variables, so
// the render data is the locale object spread directly.
const en = {
  pageTitle: "Page not found",
  heading: "Page not found",
  bodyText: "You have attempted to view a page that no longer exists. This could be because the publication you are trying to view has expired.",
  buttonText: "Find a court or tribunal"
};

const cy = {
  pageTitle: "Ni chanfuwyd y dudalen",
  heading: "Ni chanfuwyd y dudalen",
  bodyText: "Rydych chi wedi ceisio gweld tudalen nad yw'n bodoli mwyach. Gallai hyn fod oherwydd bod y cyhoeddiad rydych chi'n ceisio'i weld wedi dod i ben.",
  buttonText: "Dod o hyd i lys neu dribiwnlys"
};

const TEMPLATE = "(public)/publication-not-found/index.njk";

describe("publication-not-found template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the heading", () => {
      // Arrange
      const data = { ...en };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(en.heading);
    });

    it("should render the body text", () => {
      // Arrange
      const data = { ...en };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("p.govuk-body").text()).toContain(en.bodyText);
    });

    it("should render the start button linking to the courts and tribunals list", () => {
      // Arrange
      const data = { ...en };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const button = $("a.govuk-button--start");
      expect(button.text().trim()).toBe(en.buttonText);
      expect(button.attr("href")).toBe("/courts-tribunals-list");
    });

    it("should not render an error summary", () => {
      // Arrange
      const data = { ...en };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading", () => {
      // Arrange
      const data = { ...cy };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(cy.heading);
    });

    it("should render the Welsh body text", () => {
      // Arrange
      const data = { ...cy };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("p.govuk-body").text()).toContain(cy.bodyText);
    });

    it("should render the Welsh button text with the same link", () => {
      // Arrange
      const data = { ...cy };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const button = $("a.govuk-button--start");
      expect(button.text().trim()).toBe(cy.buttonText);
      expect(button.attr("href")).toBe("/courts-tribunals-list");
    });
  });
});
