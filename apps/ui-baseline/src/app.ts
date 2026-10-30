import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { healthcheck } from "@hmcts-cft/cloud-native-platform";
import type { Express, Request, Response } from "express";
import express from "express";
import nunjucks from "nunjucks";
import type { Auth } from "./auth.js";
import { type Runner, type RunRequest, RunRequestError } from "./runs.js";

// The hosted parity check's pages: start a check of CaTH against the pip baseline, or a comparison
// of the files pip and CaTH made for a publication; follow a run; read its report. An internal tool
// for the CaTH team, so English only. Everything but the health check needs signing in.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOVUK_FRONTEND = path.dirname(fileURLToPath(import.meta.resolve("govuk-frontend/package.json")));

export function createApp(options: AppOptions): Express {
  const app = express();
  app.use(healthcheck());

  const views = nunjucks.configure([path.join(__dirname, "views"), path.join(GOVUK_FRONTEND, "dist")], { autoescape: true, express: app });
  views.addFilter("date", (value: string | undefined) => (value ? new Date(value).toLocaleString("en-GB", { timeZone: "Europe/London" }) : ""));
  app.set("view engine", "njk");
  app.locals.environment = options.environment;

  app.use("/assets", express.static(path.join(GOVUK_FRONTEND, "dist/govuk/assets")));
  app.use("/assets/govuk-frontend.min.css", express.static(path.join(GOVUK_FRONTEND, "dist/govuk/govuk-frontend.min.css")));
  app.use("/assets/govuk-frontend.min.js", express.static(path.join(GOVUK_FRONTEND, "dist/govuk/govuk-frontend.min.js")));
  app.use("/app.css", express.static(path.join(__dirname, "assets/app.css")));
  app.get("/signed-out", (_req, res) => res.render("signed-out"));
  app.use(options.auth.router);
  app.use(options.auth.requireUser);
  app.use(express.urlencoded({ extended: false }));

  app.get("/", async (_req, res) => {
    res.render("index", { runs: options.runner.list(), baseline: await options.baselineStatus() });
  });

  app.post("/runs", (req, res) => {
    try {
      const run = options.runner.start(requestFrom(req.body as Record<string, string>), res.locals.user.email || res.locals.user.name);
      res.redirect(`/runs/${run.id}`);
    } catch (error) {
      if (!(error instanceof RunRequestError)) throw error;
      res.status(400).render("index", { runs: options.runner.list(), errorMessage: error.message, data: req.body });
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
    res.render("run", { run, log, files, links, hasReport: run.kind === "check" && !!dir && existsSync(path.join(dir, "check/report/index.html")) });
  });

  // A check's report and a file comparison's extracted texts, served from the run's directory
  app.use("/runs/:id/report", runFiles(options.runner, "check/report"));
  app.use("/runs/:id/files", runFiles(options.runner, "files/compare"));

  app.use((_req: Request, res: Response) => res.status(404).render("not-found"));
  return app;
}

function runFiles(runner: Runner, subdirectory: string) {
  return async (req: Request, res: Response, next: () => void) => {
    const dir = runner.get(String(req.params.id)) && (await runner.directory(String(req.params.id)));
    if (!dir) return res.status(404).render("not-found");
    express.static(path.join(dir, subdirectory), { dotfiles: "deny" })(req, res, next);
  };
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
