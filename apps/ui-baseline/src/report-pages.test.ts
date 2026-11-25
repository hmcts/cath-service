import path from "node:path";
import { fileURLToPath } from "node:url";
import nunjucks from "nunjucks";
import { describe, expect, it } from "vitest";
import { APP_NAVIGATION } from "../report/report-page.mjs";
import { isReportPage, withAppNavigation } from "./report-pages.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOVUK_FRONTEND = path.dirname(fileURLToPath(import.meta.resolve("govuk-frontend/package.json")));
const views = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([path.join(__dirname, "views"), path.join(__dirname, "../report"), path.join(GOVUK_FRONTEND, "dist")]),
  { autoescape: true }
);

// A list's page as the report's layout before report-page.njk wrote it, one folder down
const OLD_LIST_PAGE = `<!doctype html>
<html lang="en" class="govuk-template govuk-template--rebranded">
<head>
  <title>CIC_WEEKLY_HEARING_LIST &amp; more – CaTH parity</title>
  <link rel="stylesheet" href="../assets/govuk-frontend.min.css">
</head>
<body class="govuk-template__body">
  <header class="govuk-header"><span class="parity-logo">CaTH parity</span></header>
  <section class="govuk-service-navigation"><div class="govuk-service-navigation__container">
    <span class="govuk-service-navigation__service-name"><span class="govuk-service-navigation__text">pip-frontend baseline</span></span>
    <nav class="govuk-service-navigation__wrapper" aria-label="Menu"><ul class="govuk-service-navigation__list"><li class="govuk-service-navigation__item"><a class="govuk-service-navigation__link" href="../index.html">Overview</a></li><li class="govuk-service-navigation__item"><a class="govuk-service-navigation__link" href="../comparison.html">Comparison</a></li><li class="govuk-service-navigation__item govuk-service-navigation__item--active"><a class="govuk-service-navigation__link" href="../lists.html" aria-current="true">List pages</a></li><li class="govuk-service-navigation__item"><a class="govuk-service-navigation__link" href="../defects.html">Known pip defects</a></li></ul></nav>
  </div></section>
  <div class="govuk-width-container parity-wide"><main class="govuk-main-wrapper" id="main-content"><h1 class="govuk-heading-l">The list</h1><a href="../files.html">files</a></main></div>
  <footer class="govuk-footer"><p class="govuk-body-s">Local verification report built from parity capture output. Not a deployed service. Baseline run finished 03/11/2026, 12:40:24 · pip-frontend@f9ccef8a</p></footer>
  <script type="module">import { initAll } from "../assets/govuk-frontend.min.js"; initAll();</script>
  <script>filterTables();</script>
</body></html>`;

const navigationOf = (html: string) => html.slice(html.indexOf('<ul class="govuk-service-navigation__list"'), html.indexOf("</ul>\n        </nav>"));
const linkTexts = (html: string) => [...navigationOf(html).matchAll(/<(?:a|summary)[^>]*>\s*(?:<strong[^>]*>)?([^<]+?)\s*</g)].map((match) => match[1]);

describe("isReportPage", () => {
  it("should know a report page in either layout from a captured page", () => {
    // Act
    const results = [isReportPage(`<ul>${APP_NAVIGATION}</ul>`), isReportPage(OLD_LIST_PAGE), isReportPage("<main>a page CaTH showed</main>")];

    // Assert
    expect(results).toEqual([true, true, false]);
  });
});

describe("withAppNavigation", () => {
  it("should put Home and Result where the current layout leaves room for them", () => {
    // Arrange
    const page = `<ul class="govuk-service-navigation__list">${APP_NAVIGATION}<li>Overview</li></ul>`;

    // Act
    const html = withAppNavigation(views, page, "run-1");

    // Assert
    expect(html).not.toContain(APP_NAVIGATION);
    expect(html).toMatch(/href="\/">Home<\/a>[\s\S]*href="\/runs\/run-1">Result<\/a>[\s\S]*<li>Overview<\/li>/);
  });

  it("should redraw an old page in the current layout, with its sections and the one it is in", () => {
    // Act
    const html = withAppNavigation(views, OLD_LIST_PAGE, "run-1");

    // Assert
    expect(html).toContain('class="govuk-header"');
    expect(html).toContain("Court and tribunal hearings: UI baseline");
    expect(html).not.toContain("pip-frontend baseline");
    expect(html).not.toContain("parity-logo");
    expect(linkTexts(html)).toEqual(["Home", "Result", "Overview", "Comparison", "Pages", "List pages", "Other pages", "Journeys", "Known pip defects"]);
    expect(html).toMatch(/govuk-service-navigation__item--active">\s*<details/);
    expect(html).toContain('<a class="govuk-service-navigation__link" href="../index.html">');
  });

  it("should keep an old page's content, title, scripts and where its baseline came from", () => {
    // Act
    const html = withAppNavigation(views, OLD_LIST_PAGE, "run-1");

    // Assert
    expect(html).toContain('<h1 class="govuk-heading-l">The list</h1><a href="../files.html">files</a>');
    expect(html).toContain("<title>CIC_WEEKLY_HEARING_LIST &amp; more – Court and tribunal hearings: UI baseline</title>");
    expect(html).toContain("<script>filterTables();</script>");
    expect(html).toContain('import { initAll } from "../assets/govuk-frontend.min.js"');
    expect(html).toContain('href="../assets/navigation.css"');
    expect(html).toContain("Baseline recorded 03/11/2026, 12:40:24 from pip-frontend@f9ccef8a.");
    expect(html).toContain('class="govuk-footer');
  });

  it("should put the links in the navigation of an old page it cannot take apart", () => {
    // Arrange
    const page = '<nav class="govuk-service-navigation__wrapper" aria-label="Menu"><ul class="govuk-service-navigation__list"><li>Overview</li></ul></nav>';

    // Act
    const html = withAppNavigation(views, page, "run-1");

    // Assert
    expect(html).toMatch(
      /^<nav[^>]*><ul class="govuk-service-navigation__list">\s*<li class="govuk-service-navigation__item">[\s\S]*Home[\s\S]*Result[\s\S]*<li>Overview<\/li>/
    );
  });
});
