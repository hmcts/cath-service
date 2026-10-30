import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectFiles, compareFileRuns, type FileCompareSummary, openBlobContainer } from "@hmcts/ui-baseline";
import { filesStorage, loadEnvironment } from "./environments.js";

// Compares the PDF and Excel files pip and CaTH generated for a publication a tester uploaded to
// both, by its artefact id in each, without seeding anything: pip's files from pip's publications
// container, CaTH's from CaTH's, in the same environment
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
  return { out, summary, pipHasFiles: pipFiles.length > 0, cathHasFiles: cathFiles.length > 0 };
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
}
