import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectFiles, compareFileRuns, type FileCompareSummary, type FileEntry, openBlobContainer } from "./core/index.js";
import { type Environment, filesStorage, loadEnvironment } from "./environments.js";
import { loadManifest, loadUsers } from "./fixtures/manifest.js";
import { signInToPipWithAccounts } from "./pip/account-sign-in.js";

// Compares the PDF and Excel files pip and CaTH generated for a publication a tester uploaded to
// both, by its artefact id in each, without seeding anything: CaTH's from CaTH's publications
// container, and pip's from pip's container locally or, in a deployed environment, as pip serves
// them to a verified user (pipServedFiles). Also says where the list is in each app.
const PARITY_DIR = path.dirname(fileURLToPath(import.meta.url));
// The fixture user whose test account downloads pip's files in a deployed environment: verified,
// signed in through CFT IDAM, which pip test shares with CaTH AAT (environments.json pip.accounts)
const PIP_FILES_USER = "verified-cft";
// pip-frontend's route for a list's generated files, for a verified user allowed to see the list
const PIP_FILES_ROUTE = "/list-download-files";
const PIP_FILE_TYPES = { pdf: { type: "pdf", extension: "pdf" }, excel: { type: "excel", extension: "xlsx" } } as const;

export async function compareArtefactFiles(options: CompareArtefactOptions): Promise<ArtefactFilesResult> {
  const environment = await loadEnvironment(options.env);
  const name = options.name ?? "publication";
  const out = path.resolve(options.out ?? path.join(PARITY_DIR, "output/files", `${name}-${options.cathArtefactId}`));
  const collect = (app: "pip" | "cath", artefactId: string) =>
    app === "pip" && environment.pip.accounts
      ? pipServedFiles(environment, artefactId, name, path.join(out, "pip"))
      : collectFiles({
          container: openBlobContainer(filesStorage(app, environment[app])),
          out: path.join(out, app),
          publications: [{ id: name, artefactId }]
        });
  const [pipFiles, cathFiles] = await Promise.all([collect("pip", options.pipArtefactId), collect("cath", options.cathArtefactId)]);
  const summary = await compareFileRuns({ source: path.join(out, "pip"), target: path.join(out, "cath"), out: path.join(out, "compare") });
  const links = await listPages(environment, options.cathArtefactId, options.pipArtefactId).catch(() => null);
  if (links) await writeFile(path.join(out, "compare/links.json"), `${JSON.stringify(links, null, 2)}\n`);
  return { out, summary, pipHasFiles: pipFiles.length > 0, cathHasFiles: cathFiles.length > 0, links };
}

// pip's files for a publication as pip-frontend serves them to its test account, which needs no
// access to pip's storage: CaTH's identity in a deployed environment has none. A kind pip does not
// serve the account (a classified list it may not see, or one with no such file) is left out, as a
// missing file would be, and the comparison reports it.
async function pipServedFiles(environment: Environment, artefactId: string, name: string, out: string): Promise<FileEntry[]> {
  const baseUrl = environment.pip.baseUrl;
  if (!baseUrl) throw new Error(`environment ${environment.name} has no pip baseUrl`);
  const user = (await loadUsers()).find((candidate) => candidate.id === PIP_FILES_USER);
  if (!user) throw new Error(`no ${PIP_FILES_USER} fixture user to download pip's files as`);
  const signIns = await signInToPipWithAccounts(environment, [user]);
  const cookies = signIns.users[user.id]?.cookies.en;
  if (!cookies) throw new Error(`could not sign in to pip to download its files: ${signIns.unavailable[user.id] ?? "no session"}`);
  const cookie = cookies.map(({ name: cookieName, value }) => `${cookieName}=${value}`).join("; ");

  await mkdir(path.join(out, name), { recursive: true });
  const entries: FileEntry[] = [];
  for (const [kind, { type, extension }] of Object.entries(PIP_FILE_TYPES)) {
    const url = `${baseUrl}${PIP_FILES_ROUTE}?${new URLSearchParams({ artefactId, type })}`;
    const response = await fetch(url, { headers: { cookie }, redirect: "manual" });
    // A redirect is pip sending the account to sign in: its session was not taken, which says nothing
    // about whether pip has the file, so it must not be reported as a missing one
    if (response.status >= 300 && response.status < 400)
      throw new Error(
        `pip did not accept its test account's session when downloading the ${kind} for ${artefactId}: it redirected to ${response.headers.get("location") ?? "another page"}`
      );
    // pip answers a file it will not serve to the account with its error page
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || contentType.startsWith("text/html")) {
      console.log(`  pip served no ${kind} for ${artefactId} to its test account (${response.status} ${contentType.split(";")[0] || "no content type"})`);
      continue;
    }
    const data = Buffer.from(await response.arrayBuffer());
    const file = `${name}/${kind}.${extension}`;
    await writeFile(path.join(out, file), data);
    entries.push({ id: name, kind: kind as FileEntry["kind"], file, blob: `${PIP_FILES_ROUTE}?type=${type}`, bytes: data.length, seededAt: null });
  }
  await writeFile(path.join(out, "index.jsonl"), entries.map((entry) => `${JSON.stringify(entry)}\n`).join(""));
  return entries;
}

// The publication's page in each app, for a tester to open: staff sign-in is shared between them,
// so whoever is signed in to one is signed in to the other. CaTH says which list type the artefact
// is; the fixtures' route for that list type gives each app's page.
async function listPages(environment: Environment, cathArtefactId: string, pipArtefactId: string): Promise<ListPages | null> {
  const get = async <T>(endpoint: string) => {
    const response = await fetch(`${environment.cath.apiUrl}/test-support${endpoint}`);
    if (!response.ok) throw new Error(`${endpoint}: ${response.status}`);
    return (await response.json()) as T;
  };
  const listType = (await get<{ listTypeName: string }>(`/artefacts/${cathArtefactId}`)).listTypeName;
  const publication = (await loadManifest()).publications.find((p) => p.cathListType === listType);
  if (!listType || !publication) return null;
  return {
    listType,
    cath: publication.paths.cath ? `${environment.cath.baseUrl}${publication.paths.cath}?artefactId=${cathArtefactId}` : null,
    pip: publication.paths.pip && environment.pip.baseUrl ? `${environment.pip.baseUrl}${publication.paths.pip}?artefactId=${pipArtefactId}` : null
  };
}

export interface CompareArtefactOptions {
  env: string;
  pipArtefactId: string;
  cathArtefactId: string;
  // What to call the publication in the results, e.g. its list type
  name?: string;
  out?: string;
}

export interface ArtefactFilesResult {
  out: string;
  summary: FileCompareSummary;
  pipHasFiles: boolean;
  cathHasFiles: boolean;
  links: ListPages | null;
}

export interface ListPages {
  listType: string;
  cath: string | null;
  pip: string | null;
}
