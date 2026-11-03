import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PublicationFixture } from "./fixtures/manifest.js";
import { systemCommand } from "./system-command.js";
import { parseVariant } from "./variants.js";

// What a ticket (or explicit --list-type / --route / --journey choices) is about, shared by the
// check, which compares just that, and by a ticket recording of pip, which records just that.
const PARITY_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_DIR = path.join(PARITY_DIR, "../..");

// The ticket's text: docs/tickets/<n>/ticket.md if the plan commands fetched it, else the GitHub issue
export async function ticketText(ticket: string, repo: string): Promise<string> {
  const local = path.join(REPO_DIR, "docs/tickets", ticket, "ticket.md");
  if (existsSync(local)) return readFile(local, "utf-8");
  const { title, body } = JSON.parse(
    execFileSync(systemCommand("gh"), ["issue", "view", ticket, "--repo", repo, "--json", "title,body"], { encoding: "utf-8" })
  );
  return `# ${title}\n\n${body}`;
}

// List types the text names (pip or CaTH name, in capitals) and pages it names by route
export function mentionsIn(text: string | null, listTypes: string[], routes: string[]): Mentions {
  return {
    listTypes: new Set([...(text?.match(/\b[A-Z][A-Z0-9_]{6,}\b/g) ?? []), ...listTypes]),
    routes: new Set([...(text?.match(/(?<=[\s`(])\/[a-z0-9][a-z0-9/-]*[a-z0-9]/g) ?? []), ...routes])
  };
}

export function mentionsPublication(mentions: Mentions, publication: PublicationFixture): boolean {
  return mentions.listTypes.has(publication.listType) || (publication.cathListType !== null && mentions.listTypes.has(publication.cathListType));
}

export function mentionsRoute(mentions: Mentions, entry: RouteEntry): boolean {
  return mentions.routes.has(entry.pip) || (!!entry.cath && mentions.routes.has(entry.cath));
}

// The baseline's id for a pip page
export function pageId(pipPath: string): string {
  return `page${pipPath.replace(/\//g, "--")}`;
}

// A route-map entry the check relies on: same path, a close match, or checked by someone
export function isConfident(entry: RouteEntry): boolean {
  return entry.reviewed || entry.match === "same-path" || entry.confidence === "high";
}

// The scope a ticket recording was limited to (pip/scope.ts writes it), or null for a full recording
export async function loadRecordingScope(file = process.env.UI_BASELINE_SCOPE): Promise<RecordingScope | null> {
  return file ? (JSON.parse(await readFile(file, "utf-8")) as RecordingScope) : null;
}

// Whether a capture belongs to a recording's scope; a variant ("<page>@<user>") goes with its page
export function inRecordingScope(scope: RecordingScope | null, area: "lists" | "pages", id: string): boolean {
  if (!scope) return true;
  return (area === "lists" ? scope.publications : scope.pages).includes(parseVariant(id).base);
}

export interface Mentions {
  listTypes: Set<string>;
  routes: Set<string>;
}

export interface RecordingScope {
  name: string;
  // Publication fixture ids, page ids, journey ids, and the pip routes named
  publications: string[];
  pages: string[];
  journeys: string[];
  routes: string[];
}

export interface RouteEntry {
  // CaTH parameter (path segment or query) -> the pip query parameter it takes its value from, or
  // publication:<fixture> for a page CaTH only offers for one list
  cathParams?: Record<string, string>;
  pip: string;
  cath: string | null;
  match: string;
  confidence?: string;
  reviewed: boolean;
  pipRole: string | null;
}
