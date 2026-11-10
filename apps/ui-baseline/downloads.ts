import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { acceptsUnverifiedCertificate, type FileEntry, type FileKind, gotoSettled, launchChromium, trackRequests } from "./core/index.js";

// Fetches the files pip and CaTH answer with rather than a page (routes/downloads.json), each as
// the user it is for, into <out>/<id>/ with an index.jsonl compareFileRuns reads. Each is fetched
// through a browser session, so it is the file a signed-in user gets. One that comes back as a
// page instead (a sign-in or error page) is reported as not served, not stored as the file.
const PARITY_DIR = path.dirname(fileURLToPath(import.meta.url));
const EXTENSIONS: Record<FileKind, string> = { pdf: "pdf", "pdf-welsh": "pdf", excel: "xlsx", csv: "csv", binary: "bin" };

export async function loadDownloads(): Promise<DownloadSpec[]> {
  return (JSON.parse(await readFile(path.join(PARITY_DIR, "routes/downloads.json"), "utf-8")) as { downloads: DownloadSpec[] }).downloads;
}

export async function captureDownloads(options: CaptureDownloadsOptions): Promise<{ entries: FileEntry[]; notServed: string[] }> {
  await rm(options.out, { recursive: true, force: true });
  await mkdir(options.out, { recursive: true });
  const entries: FileEntry[] = [];
  const notServed: string[] = [];
  const browser = await launchChromium();
  try {
    for (const spec of options.specs) {
      const side = spec[options.app];
      const url = urlFor(options.baseUrl, side, options.resolve);
      if ("missing" in url) {
        notServed.push(`${spec.id}: no value for ${url.missing}`);
        continue;
      }
      const session = side.as ? await options.session(side.as) : {};
      if (!session) {
        notServed.push(`${spec.id}: ${side.as} could not be signed in`);
        continue;
      }
      const context = await browser.newContext({ ignoreHTTPSErrors: acceptsUnverifiedCertificate(options.baseUrl) });
      trackRequests(context);
      // One file that cannot be fetched is reported, and the rest are still fetched
      try {
        if (session.cookies?.length) await context.addCookies(session.cookies.map((cookie) => ({ ...cookie, url: options.baseUrl })));
        if (session.setup?.length) {
          const page = await context.newPage();
          for (const setupUrl of session.setup) await gotoSettled(page, setupUrl);
        }
        const response = await context.request.get(url.href);
        const type = response.headers()["content-type"] ?? "";
        if (!response.ok() || type.startsWith("text/html")) {
          notServed.push(`${spec.id}: ${options.app} answered ${response.status()} ${type.split(";")[0] || "with no content type"} rather than the file`);
          continue;
        }
        const data = await response.body();
        const file = `${spec.id}/${spec.kind}.${EXTENSIONS[spec.kind]}`;
        await mkdir(path.join(options.out, spec.id), { recursive: true });
        await writeFile(path.join(options.out, file), data);
        entries.push({
          id: spec.id,
          kind: spec.kind,
          file,
          blob: new URL(url.href).pathname,
          bytes: data.length,
          seededAt: options.seededAt ?? null,
          ...(options.runToken ? { runToken: options.runToken } : {})
        });
      } catch (error) {
        notServed.push(`${spec.id}: ${(error as Error).message.split("\n")[0]}`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  await writeFile(path.join(options.out, "index.jsonl"), entries.map((entry) => `${JSON.stringify(entry)}\n`).join(""));
  return { entries, notServed };
}

// A route's address with each [param] and query value filled in, or the value that could not be
function urlFor(baseUrl: string, side: DownloadSide, resolve: (value: string) => string | null): { href: string } | { missing: string } {
  const value = (raw: string) => (raw.includes(":") ? resolve(raw) : raw);
  let routePath = side.path;
  for (const [name, raw] of Object.entries(side.params ?? {})) {
    const resolved = value(raw);
    if (resolved === null) return { missing: raw };
    routePath = routePath.replace(`[${name}]`, encodeURIComponent(resolved));
  }
  const query = new URLSearchParams();
  for (const [name, raw] of Object.entries(side.query ?? {})) {
    const resolved = value(raw);
    if (resolved === null) return { missing: raw };
    query.set(name, resolved);
  }
  return { href: `${baseUrl}${routePath}${query.size ? `?${query}` : ""}` };
}

// "publication:<fixture>" and "record:<record>.<field>" from an app's seed results
export function seedResolver(publications: Record<string, { artefactId: string }>, records: Record<string, Record<string, string>> | undefined) {
  return (raw: string): string | null => {
    const [source, reference] = [raw.slice(0, raw.indexOf(":")), raw.slice(raw.indexOf(":") + 1)];
    if (source === "publication") return publications[reference]?.artefactId ?? null;
    if (source === "record") {
      const [record, field] = reference.split(".");
      return records?.[record]?.[field] ?? null;
    }
    return null;
  };
}

export interface DownloadSpec {
  id: string;
  kind: FileKind;
  pip: DownloadSide;
  cath: DownloadSide;
}

interface DownloadSide {
  path: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
  // The fixture user it is fetched as; absent for a public file
  as?: string;
}

// How to be signed in as a user: pages to visit first (pip's parity sign-in), or session cookies (CaTH)
export interface DownloadSession {
  setup?: string[];
  cookies?: { name: string; value: string }[];
}

interface CaptureDownloadsOptions {
  app: "pip" | "cath";
  baseUrl: string;
  specs: DownloadSpec[];
  resolve: (value: string) => string | null;
  // null when the user cannot be signed in in this environment
  session: (userId: string) => Promise<DownloadSession | null>;
  out: string;
  seededAt?: string | null;
  runToken?: string | null;
}
