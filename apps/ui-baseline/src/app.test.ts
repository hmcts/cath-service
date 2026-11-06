import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createRunner } from "./runs.js";

async function appWith() {
  const dataDir = await mkdtemp(path.join(tmpdir(), "app-"));
  const runner = createRunner({
    dataDir,
    repoDir: "/repo",
    environment: "test",
    commit: "x",
    store: null,
    baseline: async () => ({ id: "2026-11-03", dir: "/baseline", release: () => {} }),
    execute: async (script, args) => {
      const out = (args.find((arg) => arg.startsWith("--out=")) as string).slice("--out=".length);
      if (script.endsWith("compare-files.ts")) {
        await mkdir(path.join(out, "compare"), { recursive: true });
        await writeFile(path.join(out, "compare/files-compare.json"), JSON.stringify({ totals: { files: 1, match: 1, differs: 0 }, results: [] }));
        await writeFile(
          path.join(out, "compare/links.json"),
          JSON.stringify({ listType: "CIVIL_DAILY_CAUSE_LIST", cath: "https://cath.example/civil?artefactId=c", pip: "https://pip.example/civil?artefactId=p" })
        );
        return 0;
      }
      await mkdir(path.join(out, "report"), { recursive: true });
      await writeFile(path.join(out, "report/index.html"), "<p>the report</p>");
      // A report page as make-report.mjs writes it now, and one written before it had room for the app's links
      await writeFile(
        path.join(out, "report/lists.html"),
        '<nav class="govuk-service-navigation__wrapper app-navigation"><ul class="govuk-service-navigation__list"><!-- ui-baseline: app navigation --><li>Overview</li></ul></nav><main>the list pages</main>'
      );
      await writeFile(
        path.join(out, "report/pages.html"),
        '<nav class="govuk-service-navigation__wrapper" aria-label="Menu"><ul class="govuk-service-navigation__list"><li>Overview</li></ul></nav><main>the other pages</main>'
      );
      await mkdir(path.join(out, "report/lists/cath"), { recursive: true });
      await writeFile(
        path.join(out, "report/lists/cath/page.html"),
        '<div class="govuk-width-container"><main class="govuk-main-wrapper" id="main-content">a page CaTH showed</main></div>'
      );
      await writeFile(
        path.join(out, "progress.json"),
        JSON.stringify({
          updatedAt: "2026-11-03T12:00:00Z",
          stages: [
            { id: "capture-lists", label: "Capturing list pages", status: "done", done: 4, total: 4 },
            { id: "journeys", label: "Running journeys", status: "skipped", reason: "no journeys in scope" }
          ]
        })
      );
      return 0;
    }
  });
  const app = createApp({ environment: "aat", runner, baselineStatus: async () => ({ ready: true, description: "recorded today" }) });
  return { app, runner };
}

describe("createApp", () => {
  it("should answer health checks", async () => {
    // Arrange
    const { app } = await appWith();

    // Act
    const response = await request(app).get("/health");

    // Assert
    expect(response.status).toBe(200);
  });

  it("should show the start page without anyone signing in", async () => {
    // Arrange
    const { app } = await appWith();

    // Act
    const response = await request(app).get("/");

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).not.toContain("Sign out");
  });

  it("should show the start page with the baseline in use", async () => {
    // Arrange
    const { app } = await appWith();

    // Act
    const response = await request(app).get("/");

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toContain("Check CaTH against pip");
    expect(response.text).toContain("Baseline: recorded today.");
    expect(response.text).toContain("No runs yet.");
  });

  it("should start a check, then show it and its report", async () => {
    // Arrange
    const { app, runner } = await appWith();

    // Act
    const started = await request(app)
      .post("/runs")
      .type("form")
      .send({ kind: "check", scope: "list-types", listTypes: "civil_daily_cause_list\nSJP_PRESS_LIST" });
    await runner.idle();
    const page = await request(app).get(started.headers.location);
    const report = await request(app).get(`${started.headers.location}/report/index.html`);

    // Assert
    expect(started.status).toBe(302);
    const [run] = runner.list();
    expect(run).toMatchObject({
      kind: "check",
      scope: "list-types",
      listTypes: ["CIVIL_DAILY_CAUSE_LIST", "SJP_PRESS_LIST"]
    });
    expect(page.text).toContain("List types: CIVIL_DAILY_CAUSE_LIST, SJP_PRESS_LIST");
    expect(page.text).toContain("1 of 1 stages done");
    expect(page.text).toContain("Capturing list pages");
    expect(page.text).toContain("4 of 4");
    expect(page.text).toContain("no journeys in scope");
    expect(page.text).toContain("Open the full report");
    expect(report.text).toBe("<p>the report</p>");
  });

  it("should link to the publication in both apps after comparing its files", async () => {
    // Arrange
    const { app, runner } = await appWith();
    const started = await request(app)
      .post("/runs")
      .type("form")
      .send({ kind: "files", pipArtefactId: "2a7b1d4e-0000-4000-8000-000000000001", cathArtefactId: "2a7b1d4e-0000-4000-8000-000000000002" });
    await runner.idle();

    // Act
    const page = await request(app).get(started.headers.location);

    // Assert
    expect(page.text).toContain("CIVIL_DAILY_CAUSE_LIST:");
    expect(page.text).toContain('href="https://cath.example/civil?artefactId=c"');
    expect(page.text).toContain('href="https://pip.example/civil?artefactId=p"');
    expect(page.text).not.toContain("stages done");
  });

  it("should show the problem when a file comparison is asked for with a bad id", async () => {
    // Arrange
    const { app, runner } = await appWith();

    // Act
    const response = await request(app).post("/runs").type("form").send({ kind: "files", pipArtefactId: "not-an-id", cathArtefactId: "" });

    // Assert
    expect(response.status).toBe(400);
    expect(response.text).toContain("There is a problem");
    expect(response.text).toContain("Enter both artefact ids");
    expect(runner.list()).toEqual([]);
  });

  it("should put Home and Result first in a report page's navigation, new or old, leaving the captured pages as they are", async () => {
    // Arrange
    const { app, runner } = await appWith();
    const started = await request(app).post("/runs").type("form").send({ kind: "check", scope: "all" });
    await runner.idle();
    const navigation = (html: string) => (html.match(/<ul class="govuk-service-navigation__list">([\s\S]*)<\/ul>/)?.[1] ?? "").replace(/\s+/g, " ");

    // Act
    const reportPage = await request(app).get(`${started.headers.location}/report/lists.html`);
    const olderReportPage = await request(app).get(`${started.headers.location}/report/pages.html`);
    const capturedPage = await request(app).get(`${started.headers.location}/report/lists/cath/page.html`);

    // Assert
    expect(reportPage.status).toBe(200);
    expect(reportPage.headers["content-type"]).toMatch(/^text\/html/);
    for (const page of [reportPage, olderReportPage]) {
      const items = navigation(page.text);
      expect(items).toMatch(/^ ?<li class="govuk-service-navigation__item"> ?<a class="govuk-service-navigation__link" href="\/">Home<\/a>/);
      expect(items).toContain(`href="${started.headers.location}">Result</a>`);
      expect(items.indexOf("Result")).toBeLessThan(items.indexOf("Overview"));
      expect(page.text).not.toContain("govuk-breadcrumbs");
    }
    expect(reportPage.text).not.toContain("<!-- ui-baseline: app navigation -->");
    expect(capturedPage.text).toBe('<div class="govuk-width-container"><main class="govuk-main-wrapper" id="main-content">a page CaTH showed</main></div>');
  });

  it("should show its pages in the GOV.UK header, navigation and footer, marking where you are", async () => {
    // Arrange
    const { app } = await appWith();

    // Act
    const page = await request(app).get("/");

    // Assert
    expect(page.text).toContain('class="govuk-header"');
    expect(page.text).toContain("Court and tribunal hearings: UI baseline (aat)");
    expect(page.text).toMatch(
      /<a class="govuk-service-navigation__link" href="\/" aria-current="page">\s*<strong class="govuk-service-navigation__active-fallback">Home<\/strong>/
    );
    expect(page.text).toContain('class="govuk-footer"');
    expect(page.text).toContain('<script src="/navigation.js"></script>');
  });

  it("should serve a report the navigation's and its own stylesheet as they are now, whenever it was written", async () => {
    // Arrange
    const { app, runner } = await appWith();
    const started = await request(app).post("/runs").type("form").send({ kind: "check", scope: "all" });
    await runner.idle();

    // Act
    const [css, script, reportCss] = await Promise.all(
      ["navigation.css", "navigation.js", "report.css"].map((file) => request(app).get(`${started.headers.location}/report/assets/${file}`))
    );

    // Assert
    expect([css.status, script.status, reportCss.status]).toEqual([200, 200, 200]);
    expect(css.text).toContain(".app-navigation-menu");
    expect(script.text).toContain("app-navigation-menu__details");
    expect(reportCss.text).toContain(".parity-report .govuk-width-container");
  });

  it("should not serve files outside a run's report", async () => {
    // Arrange
    const { app, runner } = await appWith();
    const started = await request(app).post("/runs").type("form").send({ kind: "check", scope: "all" });
    await runner.idle();

    // Act
    const response = await request(app).get(`${started.headers.location}/report/..%2f..%2frun.json`);

    // Assert
    expect(response.status).toBe(404);
  });

  it("should say when a run does not exist", async () => {
    // Arrange
    const { app } = await appWith();

    // Act
    const response = await request(app).get("/runs/nope");

    // Assert
    expect(response.status).toBe(404);
    expect(response.text).toContain("Page not found");
  });
});
