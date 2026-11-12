import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createRunner, type Runner, type RunRecord } from "./runs.js";

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
      // A report links into its baseline, in the data folder; a planted link could point anywhere
      const baselineLists = path.join(dataDir, "baselines/2026-11-03/lists");
      await mkdir(baselineLists, { recursive: true });
      await writeFile(path.join(baselineLists, "page.html"), "a page pip showed");
      await symlink(baselineLists, path.join(out, "report/lists/pip"));
      const outside = path.join(await mkdtemp(path.join(tmpdir(), "outside-")), "environ");
      await writeFile(outside, "SECRET=from-the-pod");
      await symlink(outside, path.join(out, "report/environ"));
      await symlink(path.dirname(outside), path.join(out, "report/elsewhere"));
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
  const app = createApp({ environment: "aat", runner, dataDir, baselineStatus: async () => ({ ready: true, description: "recorded today" }) });
  return { app, runner };
}

// Posts a form to /runs as the start page's own form would: with the page's cookie and token
async function postForm(app: Express, body: Record<string, string>, headers: Record<string, string> = {}) {
  const startPage = await request(app).get("/");
  const cookie = (startPage.headers["set-cookie"] as unknown as string[])[0].split(";")[0];
  const token = startPage.text.match(/name="formToken" value="([0-9a-f]+)"/)?.[1] as string;
  return request(app)
    .post("/runs")
    .set("Cookie", cookie)
    .set(headers)
    .type("form")
    .send({ ...body, formToken: token });
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
    const started = await postForm(app, { kind: "check", scope: "list-types", listTypes: "civil_daily_cause_list\nSJP_PRESS_LIST" });
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
    const started = await postForm(app, {
      kind: "files",
      pipArtefactId: "2a7b1d4e-0000-4000-8000-000000000001",
      cathArtefactId: "2a7b1d4e-0000-4000-8000-000000000002"
    });
    await runner.idle();

    // Act
    const page = await request(app).get(started.headers.location);

    // Assert
    expect(page.text).toContain("CIVIL_DAILY_CAUSE_LIST:");
    expect(page.text).toContain('href="https://cath.example/civil?artefactId=c"');
    expect(page.text).toContain('href="https://pip.example/civil?artefactId=p"');
    expect(page.text).not.toContain("stages done");
  });

  it("should show a file comparison while its results are still being written", async () => {
    // Arrange
    const { app, runner } = await appWith();
    const started = await postForm(app, {
      kind: "files",
      pipArtefactId: "2a7b1d4e-0000-4000-8000-000000000001",
      cathArtefactId: "2a7b1d4e-0000-4000-8000-000000000002"
    });
    await runner.idle();
    const dir = (await runner.directory(started.headers.location.split("/").pop() as string)) as string;
    await writeFile(path.join(dir, "files/compare/files-compare.json"), '{"totals": {"files"');

    // Act
    const page = await request(app).get(started.headers.location);

    // Assert
    expect(page.status).toBe(200);
  });

  it("should show the problem when a file comparison is asked for with a bad id", async () => {
    // Arrange
    const { app, runner } = await appWith();

    // Act
    const response = await postForm(app, { kind: "files", pipArtefactId: "not-an-id", cathArtefactId: "" });

    // Assert
    expect(response.status).toBe(400);
    expect(response.text).toContain("There is a problem");
    expect(response.text).toContain("Enter both artefact ids");
    expect(runner.list()).toEqual([]);
  });

  describe("starting a run from another site", () => {
    it("should start a run posted from the start page's own form", async () => {
      // Arrange
      const { app, runner } = await appWith();

      // Act
      const response = await postForm(
        app,
        { kind: "check", scope: "all" },
        { Host: "cath-ui-baseline.aat.platform.hmcts.net", Origin: "https://cath-ui-baseline.aat.platform.hmcts.net", "Sec-Fetch-Site": "same-origin" }
      );
      await runner.idle();

      // Assert
      expect(response.status).toBe(302);
      expect(runner.list()).toHaveLength(1);
    });

    it("should refuse a form posted without the start page's token, or with another one", async () => {
      // Arrange
      const { app, runner } = await appWith();
      const startPage = await request(app).get("/");
      const cookie = (startPage.headers["set-cookie"] as unknown as string[])[0].split(";")[0];

      // Act
      const noToken = await request(app).post("/runs").set("Cookie", cookie).type("form").send({ kind: "check", scope: "all" });
      const noCookie = await request(app)
        .post("/runs")
        .type("form")
        .send({ kind: "check", scope: "all", formToken: "a".repeat(64) });
      const otherToken = await request(app)
        .post("/runs")
        .set("Cookie", cookie)
        .type("form")
        .send({ kind: "check", scope: "all", formToken: "b".repeat(64) });

      // Assert
      for (const response of [noToken, noCookie, otherToken]) {
        expect(response.status).toBe(403);
        expect(response.text).toContain("That request was refused");
      }
      expect(runner.list()).toEqual([]);
    });

    it("should refuse, not fail on, a token as long as the real one in characters but not in bytes", async () => {
      // Arrange
      const { app, runner } = await appWith();
      const startPage = await request(app).get("/");
      const cookie = (startPage.headers["set-cookie"] as unknown as string[])[0].split(";")[0];

      // Act
      const response = await request(app)
        .post("/runs")
        .set("Cookie", cookie)
        .type("form")
        .send({ kind: "check", scope: "all", formToken: `${"a".repeat(63)}é` });

      // Assert
      expect(response.status).toBe(403);
      expect(runner.list()).toEqual([]);
    });

    it("should refuse a form the browser says came from another site, even with a token", async () => {
      // Arrange
      const { app, runner } = await appWith();

      // Act
      const crossSite = await postForm(app, { kind: "check", scope: "all" }, { "Sec-Fetch-Site": "cross-site" });
      const otherOrigin = await postForm(app, { kind: "check", scope: "all" }, { Origin: "https://attacker.example" });
      const nullOrigin = await postForm(app, { kind: "check", scope: "all" }, { Origin: "null" });

      // Assert
      expect([crossSite.status, otherOrigin.status, nullOrigin.status]).toEqual([403, 403, 403]);
      expect(runner.list()).toEqual([]);
    });

    it("should set the form cookie HttpOnly and SameSite=Strict, and Secure behind HTTPS", async () => {
      // Arrange
      const { app } = await appWith();

      // Act
      const plain = await request(app).get("/");
      const secure = await request(app).get("/").set("X-Forwarded-Proto", "https");

      // Assert
      expect((plain.headers["set-cookie"] as unknown as string[])[0]).toMatch(/^ui-baseline-form=[0-9a-f]{64}; Path=\/; HttpOnly; SameSite=Strict$/);
      expect((secure.headers["set-cookie"] as unknown as string[])[0]).toMatch(/; Secure$/);
    });
  });

  it("should serve what CaTH and pip showed sandboxed, and the report itself as it is, all without type sniffing", async () => {
    // Arrange
    const { app, runner } = await appWith();
    const started = await postForm(app, { kind: "check", scope: "all" });
    await runner.idle();

    // Act
    const reportPage = await request(app).get(`${started.headers.location}/report/lists.html`);
    const capturedPage = await request(app).get(`${started.headers.location}/report/lists/cath/page.html`);

    // Assert
    expect(reportPage.headers["content-security-policy"]).toBeUndefined();
    expect(capturedPage.headers["content-security-policy"]).toBe("sandbox");
    for (const response of [reportPage, capturedPage]) expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("should serve a captured page sandboxed even when it carries the report's navigation", async () => {
    // Arrange
    const { app, runner } = await appWith();
    const started = await postForm(app, { kind: "check", scope: "all" });
    await runner.idle();
    const dir = (await runner.directory(started.headers.location.split("/").pop() as string)) as string;
    await writeFile(
      path.join(dir, "check/report/lists/cath/navigation.html"),
      '<nav class="govuk-service-navigation__wrapper" aria-label="Menu"><ul class="govuk-service-navigation__list"><li>Home</li></ul></nav>'
    );

    // Act
    const capturedPage = await request(app).get(`${started.headers.location}/report/lists/cath/navigation.html`);

    // Assert
    expect(capturedPage.headers["content-security-policy"]).toBe("sandbox");
  });

  it("should show the last 80 lines of a long log", async () => {
    // Arrange
    const { app, runner } = await appWith();
    const started = await postForm(app, { kind: "check", scope: "all" });
    await runner.idle();
    const dir = (await runner.directory(started.headers.location.split("/").pop() as string)) as string;
    await writeFile(path.join(dir, "log.txt"), `${Array.from({ length: 100_000 }, (_, i) => `capture ${i}`).join("\n")}\n`);

    // Act
    const page = await request(app).get(started.headers.location);

    // Assert
    const shown = page.text.match(/capture \d+/g) ?? [];
    expect(shown).toHaveLength(80);
    expect(shown[0]).toBe("capture 99920");
    expect(shown.at(-1)).toBe("capture 99999");
  });

  it("should follow a report's links into its baseline, but not links to files outside the data folder", async () => {
    // Arrange
    const { app, runner } = await appWith();
    const started = await postForm(app, { kind: "check", scope: "all" });
    await runner.idle();

    // Act
    const baselinePage = await request(app).get(`${started.headers.location}/report/lists/pip/page.html`);
    const linkedFile = await request(app).get(`${started.headers.location}/report/environ`);
    const linkedFolder = await request(app).get(`${started.headers.location}/report/elsewhere/environ`);

    // Assert
    expect(baselinePage.status).toBe(200);
    expect(baselinePage.text).toBe("a page pip showed");
    for (const response of [linkedFile, linkedFolder]) {
      expect(response.status).toBe(404);
      expect(response.text).not.toContain("SECRET");
    }
  });

  it("should put Home and Result first in a report page's navigation, new or old, leaving the captured pages as they are", async () => {
    // Arrange
    const { app, runner } = await appWith();
    const started = await postForm(app, { kind: "check", scope: "all" });
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
    const started = await postForm(app, { kind: "check", scope: "all" });
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
    const started = await postForm(app, { kind: "check", scope: "all" });
    await runner.idle();

    // Act
    const response = await request(app).get(`${started.headers.location}/report/..%2f..%2frun.json`);

    // Assert
    expect(response.status).toBe(404);
  });

  it("should say a run handed over by a pod that restarted will still start", async () => {
    // Arrange
    const run: RunRecord = { id: "r1", kind: "check", scope: "all", status: "queued", createdAt: "2026-11-12T10:00:00Z", handedOverAt: "2026-11-12T10:05:00Z" };
    const runner = { list: () => [run], get: () => run, directory: async () => null } as unknown as Runner;
    const app = createApp({
      environment: "aat",
      runner,
      dataDir: await mkdtemp(path.join(tmpdir(), "app-")),
      baselineStatus: async () => ({ ready: true, description: "" })
    });

    // Act
    const page = await request(app).get("/runs/r1");

    // Assert
    expect(page.status).toBe(200);
    expect(page.text).toContain("You do not need to start it again.");
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
