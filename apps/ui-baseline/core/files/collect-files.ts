import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FileEntry, FileKind } from "../compare/file-compare.js";
import type { BlobContainer } from "./blob-container.js";

// Downloads the files an app generated for each publication, by the names both pip and CaTH store
// them under in their publications container, into <out>/<id>/ with an index.jsonl compareFileRuns
// reads. Deployed apps generate the files after the publication is accepted, and one at a time, so
// with waitSeconds each publication is polled until it has every kind it is expected to have (those
// the other app made for it) and they have stopped changing, or the time runs out. A publication with
// no expected kinds is polled until it has some files and they have stopped changing (a list type
// that has no files waits the whole time). Polling reads only the files' sizes; each file is
// downloaded once, when they have settled.
const BLOB_NAMES: Record<PublicationFileKind, (artefactId: string) => string> = {
  pdf: (artefactId) => `${artefactId}.pdf`,
  "pdf-welsh": (artefactId) => `${artefactId}_cy.pdf`,
  excel: (artefactId) => `${artefactId}.xlsx`
};
const EXTENSIONS: Record<PublicationFileKind, string> = { pdf: "pdf", "pdf-welsh": "pdf", excel: "xlsx" };
const POLL_MS = 5000;

export async function collectFiles(options: CollectFilesOptions): Promise<FileEntry[]> {
  await rm(options.out, { recursive: true, force: true });
  await mkdir(options.out, { recursive: true });
  const deadline = Date.now() + (options.waitSeconds ?? 0) * 1000;
  const collected = await Promise.all(options.publications.map((publication) => collectSettled(options, publication, deadline)));
  const entries = collected.flat();
  await writeFile(path.join(options.out, "index.jsonl"), entries.map((entry) => `${JSON.stringify(entry)}\n`).join(""));
  return entries;
}

async function collectSettled(options: CollectFilesOptions, publication: CollectedPublication, deadline: number): Promise<FileEntry[]> {
  let previous = await sizesOf(options, publication);
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    const current = await sizesOf(options, publication);
    const complete = publication.expectedKinds?.length ? publication.expectedKinds.every((kind) => current.has(kind)) : current.size > 0;
    const settled = complete && signature(current) === signature(previous);
    previous = current;
    if (settled) break;
  }
  return download(options, publication, [...previous.keys()]);
}

// The size of each kind of file the publication has so far
async function sizesOf(options: CollectFilesOptions, publication: CollectedPublication): Promise<Map<PublicationFileKind, number>> {
  const sizes = new Map<PublicationFileKind, number>();
  for (const kind of Object.keys(BLOB_NAMES) as PublicationFileKind[]) {
    const bytes = await options.container.size(BLOB_NAMES[kind](publication.artefactId));
    if (bytes !== null) sizes.set(kind, bytes);
  }
  return sizes;
}

async function download(options: CollectFilesOptions, publication: CollectedPublication, kinds: PublicationFileKind[]): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];
  for (const kind of kinds) {
    const blob = BLOB_NAMES[kind](publication.artefactId);
    const data = await options.container.download(blob);
    if (!data) continue;
    const file = `${publication.id}/${kind}.${EXTENSIONS[kind]}`;
    await mkdir(path.join(options.out, publication.id), { recursive: true });
    await writeFile(path.join(options.out, file), data);
    entries.push({
      id: publication.id,
      kind,
      file,
      blob,
      bytes: data.length,
      seededAt: publication.seededAt ?? null,
      ...(publication.runToken ? { runToken: publication.runToken } : {})
    });
  }
  return entries;
}

function signature(sizes: Map<PublicationFileKind, number>): string {
  return [...sizes].map(([kind, bytes]) => `${kind}:${bytes}`).join(",");
}

export interface CollectedPublication {
  // The fixture (or any name both apps' runs share) the files are paired by
  id: string;
  artefactId: string;
  // When the publication was seeded, so dates derived from it are masked in comparison
  seededAt?: string | null;
  // The run token on names the publication shows, when it was seeded in a shared environment
  runToken?: string | null;
  // The kinds of file it should have, so polling does not stop when only the first has been written
  expectedKinds?: PublicationFileKind[];
}

export interface CollectFilesOptions {
  container: BlobContainer;
  publications: CollectedPublication[];
  out: string;
  waitSeconds?: number;
}

// The files an app keeps per publication in its publications container
export type PublicationFileKind = Extract<FileKind, "pdf" | "pdf-welsh" | "excel">;
