import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import type { Auth } from "./auth.js";
import { createRunner } from "./runs.js";

const signedIn: Auth = {
  router: express.Router(),
  requireUser: (_req, res, next) => {
    res.locals.user = { name: "Tester", email: "tester@example.com" };
    next();
  }
};
const signedOut: Auth = { router: express.Router(), requireUser: (_req, res) => res.redirect("/sign-in") };

async function appWith(auth = signedIn) {
  const dataDir = await mkdtemp(path.join(tmpdir(), "app-"));
  const runner = createRunner({
    dataDir,
    repoDir: "/repo",
    environment: "test",
    commit: "x",
    store: null,
    baseline: async () => "/baseline",
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
      return 0;
    }
  });
  const app = createApp({ environment: "test", auth, runner, baselineStatus: async () => ({ ready: true, description: "recorded today" }) });
  return { app, runner };
}

describe("createApp", () => {
  it("should answer health checks without signing in", async () => {
    // Arrange
    const { app } = await appWith(signedOut);

    // Act
    const response = await request(app).get("/health");

    // Assert
    expect(response.status).toBe(200);
  });

  it("should send people who are not signed in to sign in", async () => {
    // Arrange
    const { app } = await appWith(signedOut);

    // Act
    const response = await request(app).get("/");

    // Assert
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/sign-in");
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
      listTypes: ["CIVIL_DAILY_CAUSE_LIST", "SJP_PRESS_LIST"],
      requestedBy: "tester@example.com"
    });
    expect(page.text).toContain("List types: CIVIL_DAILY_CAUSE_LIST, SJP_PRESS_LIST");
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
