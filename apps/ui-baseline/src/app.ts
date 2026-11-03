import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { healthcheck } from "@hmcts-cft/cloud-native-platform";
import type { Express, Request, Response } from "express";
import express from "express";
import nunjucks from "nunjucks";
import type { ProgressFile } from "../progress.js";
import type { Auth } from "./auth.js";
import { isReportPage, withAppNavigation } from "./report-pages.js";
import { describeProgress } from "./run-progress.js";
import { type Runner, type RunRequest, RunRequestError } from "./runs.js";

// The hosted parity check's pages: start a check of CaTH against the pip baseline, or a comparison
// of the files pip and CaTH made for a publication; follow a run; read its report. An internal tool
// for the CaTH team, so English only. Everything but the health check needs signing in.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOVUK_FRONTEND = path.dirname(fileURLToPath(import.meta.resolve("govuk-frontend/package.json")));
// The report's own stylesheet and the navigation it shares with these pages, served as they are now
// for every report, so one written before them still has them
const REPORT_ASSETS = new Map([
  ["/assets/navigation.css", path.join(__dirname, "assets/navigation.css")],
  ["/assets/navigation.js", path.join(__dirname, "assets/navigation.js")],
  ["/assets/report.css", path.join(__dirname, "../report/report.css")]
]);

export function createApp(options: AppOptions): Express {
  const app = express();
  app.use(healthcheck());

  const views = nunjucks.configure([path.join(__dirname, "views"), path.join(__dirname, "../report"), path.join(GOVUK_FRONTEND, "dist")], {
    autoescape: true,
    express: app
  });
  views.addFilter("date", (value: string | undefined) => (value ? new Date(value).toLocaleString("en-GB", { timeZone: "Europe/London" }) : ""));
  app.set("view engine", "njk");
  app.locals.environment = options.environment;

  app.use("/assets", express.static(path.join(GOVUK_FRONTEND, "dist/govuk/assets")));
  app.use("/assets/govuk-frontend.min.css", express.static(path.join(GOVUK_FRONTEND, "dist/govuk/govuk-frontend.min.css")));
  app.use("/assets/govuk-frontend.min.js", express.static(path.join(GOVUK_FRONTEND, "dist/govuk/govuk-frontend.min.js")));
  app.use("/navigation.css", express.static(path.join(__dirname, "assets/navigation.css")));
  app.use("/navigation.js", express.static(path.join(__dirname, "assets/navigation.js")));
  app.use("/app.css", express.static(path.join(__dirname, "assets/app.css")));
  app.get("/signed-out", (_req, res) => res.render("signed-out"));
  app.use(options.auth.router);
  app.use(options.auth.requireUser);
  app.use(express.urlencoded({ extended: false }));

  app.get("/", async (_req, res) => {
    res.render("index", { runs: options.runner.list(), baseline: await options.baselineStatus() });
  });

  app.post("/runs", async (req, res) => {
    try {
      const run = options.runner.start(requestFrom(req.body as Record<string, string>), res.locals.user.email || res.locals.user.name);
      res.redirect(`/runs/${run.id}`);
    } catch (error) {
      if (!(error instanceof RunRequestError)) throw error;
      res.status(400).render("index", { runs: options.runner.list(), baseline: await options.baselineStatus(), errorMessage: error.message, data: req.body });
    }
  });

  app.get("/runs/:id", async (req, res) => {
    const run = options.runner.get(req.params.id);
    if (!run) return res.status(404).render("not-found");
    const dir = await options.runner.directory(run.id);
    const log = dir && existsSync(path.join(dir, "log.txt")) ? tail(await readFile(path.join(dir, "log.txt"), "utf-8")) : "";
    const files =
      run.kind === "files" && dir && existsSync(path.join(dir, "files/compare/files-compare.json"))
        ? JSON.parse(await readFile(path.join(dir, "files/compare/files-compare.json"), "utf-8"))
        : null;
    // Where the publication is in each app; testers signed in here are signed in to both
    const links =
      run.kind === "files" && dir && existsSync(path.join(dir, "files/compare/links.json"))
        ? JSON.parse(await readFile(path.join(dir, "files/compare/links.json"), "utf-8"))
        : null;
    // How far a check has got, as it writes it (check.ts); replaced whole, so never read half written
    const progressFile = run.kind === "check" && dir ? path.join(dir, "check/progress.json") : null;
    const progress =
      progressFile && existsSync(progressFile) ? describeProgress(JSON.parse(await readFile(progressFile, "utf-8")) as ProgressFile, run.status) : null;
    res.render("run", { run, log, files, links, progress, hasReport: run.kind === "check" && !!dir && existsSync(path.join(dir, "check/report/index.html")) });
  });

  // A check's report and a file comparison's extracted texts, served from the run's directory
  app.use("/runs/:id/report", runFiles(options.runner, "check/report", { linkBack: (html, id) => withAppNavigation(views, html, id), waitForBaseline: true }));
  app.use("/runs/:id/files", runFiles(options.runner, "files/compare"));

  app.use((_req: Request, res: Response) => res.status(404).render("not-found"));
  return app;
}

// linkBack: gives a report page served here the app's links back to its run and to all runs. The report is also
// opened outside this app (zipped into a PR's evidence, served by the command line), where those
// links would go nowhere, so they are added as it is served rather than when it is written.
// waitForBaseline: a check's report links into its baseline, so it waits for the baseline to be on
// this pod's disk; nothing else does, as a baseline is several hundred megabytes.
function runFiles(
  runner: Runner,
  subdirectory: string,
  { linkBack, waitForBaseline = false }: { linkBack?: (html: string, runId: string) => string; waitForBaseline?: boolean } = {}
) {
  return async (req: Request, res: Response, next: () => void) => {
    const id = String(req.params.id);
    const dir = runner.get(id) && (await runner.directory(id, { waitForBaseline }));
    if (!dir) return res.status(404).render("not-found");
    const root = path.join(dir, subdirectory);
    const asset = linkBack && REPORT_ASSETS.get(req.path);
    if (asset) return res.sendFile(asset);
    const page = linkBack && req.path.endsWith(".html") ? await reportPage(root, req.path) : null;
    if (page && linkBack) return res.type("html").send(linkBack(page, id));
    express.static(root, { dotfiles: "deny" })(req, res, next);
  };
}

// A page of the report itself, as make-report.mjs wraps it, rather than one of the captured pip or
// CaTH pages kept beside it; null for anything else, which is served as it is
async function reportPage(root: string, requestPath: string): Promise<string | null> {
  const relative = safeDecode(requestPath);
  if (relative === null || relative.split("/").some((segment) => segment.startsWith("."))) return null;
  const file = path.join(root, relative);
  if (!file.startsWith(`${root}${path.sep}`) || !existsSync(file)) return null;
  const html = await readFile(file, "utf-8").catch(() => null);
  return html && isReportPage(html) ? html : null;
}

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function requestFrom(body: Record<string, string>): RunRequest {
  const list = (value: string | undefined) => (value ?? "").split(/[\s,]+/).filter(Boolean);
  if (body.kind === "files")
    return {
      kind: "files",
      pipArtefactId: (body.pipArtefactId ?? "").trim(),
      cathArtefactId: (body.cathArtefactId ?? "").trim(),
      name: body.name?.trim() || undefined
    };
  if (body.scope === "list-types") return { kind: "check", scope: "list-types", listTypes: list(body.listTypes).map((name) => name.toUpperCase()) };
  if (body.scope === "routes") return { kind: "check", scope: "routes", routes: list(body.routes) };
  return { kind: "check", scope: "all" };
}

// The end of a run's log, which is where its progress and result are
function tail(text: string, lines = 80): string {
  return text.trimEnd().split("\n").slice(-lines).join("\n");
}

export interface AppOptions {
  environment: string;
  auth: Auth;
  runner: Runner;
  // Which stored baseline checks compare against, for the start page
  baselineStatus: () => Promise<{ ready: boolean; description: string }>;
}
