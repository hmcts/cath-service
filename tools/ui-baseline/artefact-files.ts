import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectFiles, compareFileRuns, type FileCompareSummary, openBlobContainer } from "@hmcts/ui-baseline";
import { type Environment, filesStorage, loadEnvironment } from "./environments.js";
import { loadManifest } from "./fixtures/manifest.js";

// Compares the PDF and Excel files pip and CaTH generated for a publication a tester uploaded to
// both, by its artefact id in each, without seeding anything: pip's files from pip's publications
// container, CaTH's from CaTH's, in the same environment. Also says where the list is in each app.
const PARITY_DIR = path.dirname(fileURLToPath(import.meta.url));

export async function compareArtefactFiles(options: CompareArtefactOptions): Promise<ArtefactFilesResult> {
  const environment = await loadEnvironment(options.env);
  const name = options.name ?? "publication";
  const out = path.resolve(options.out ?? path.join(PARITY_DIR, "output/files", `${name}-${options.cathArtefactId}`));
  const collect = (app: "pip" | "cath", artefactId: string) =>
    collectFiles({
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

// The publication's page in each app, for a tester to open: staff sign-in is shared between them,
// so whoever is signed in to one is signed in to the other. CaTH says which list type the artefact
// is; the fixtures' route for that list type gives each app's page.
async function listPages(environment: Environment, cathArtefactId: string, pipArtefactId: string): Promise<ListPages | null> {
  const get = async <T>(endpoint: string) => {
    const response = await fetch(`${environment.cath.apiUrl}/test-support${endpoint}`);
    if (!response.ok) throw new Error(`${endpoint}: ${response.status}`);
    return (await response.json()) as T;
  };
  const artefact = await get<{ listTypeId: number }>(`/artefacts/${cathArtefactId}`);
  const listType = (await get<{ id: number; name: string }[]>("/list-types")).find((row) => row.id === artefact.listTypeId)?.name;
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
