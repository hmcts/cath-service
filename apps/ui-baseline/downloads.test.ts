import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { launchChromium } from "./core/index.js";
import { captureDownloads, type DownloadSpec, loadDownloads, seedResolver } from "./downloads.js";

vi.mock("./core/index.js", () => ({
  launchChromium: vi.fn(),
  trackRequests: vi.fn(),
  gotoSettled: vi.fn((page: { goto: (url: string) => Promise<unknown> }, url: string) => page.goto(url))
}));

describe("seedResolver", () => {
  it("should give a fixture's artefact id and a record's field from an app's seed", () => {
    // Arrange
    const resolve = seedResolver({ "sjp-press-list": { artefactId: "a1" } }, { "pending-application": { applicantId: "m1", imageId: "i1" } });

    // Act and assert
    expect(resolve("publication:sjp-press-list")).toBe("a1");
    expect(resolve("record:pending-application.imageId")).toBe("i1");
  });

  it("should give null for anything the seed does not have", () => {
    // Arrange
    const resolve = seedResolver({}, undefined);

    // Act and assert
    expect(resolve("publication:missing")).toBeNull();
    expect(resolve("record:pending-application.imageId")).toBeNull();
    expect(resolve("other:thing")).toBeNull();
  });
});

describe("loadDownloads", () => {
  it("should load every download from routes/downloads.json with both apps' routes", async () => {
    // Act
    const downloads = await loadDownloads();

    // Assert
    expect(downloads.length).toBeGreaterThan(0);
    for (const download of downloads) expect(download).toMatchObject({ id: expect.any(String), kind: expect.any(String), pip: { path: expect.any(String) } });
  });
});

describe("captureDownloads", () => {
  let browser: ReturnType<typeof fakeBrowser>;

  beforeEach(() => {
    vi.clearAllMocks();
    browser = fakeBrowser();
    vi.mocked(launchChromium).mockResolvedValue(browser as never);
  });

  it("should fetch each file as its user, filling in route and query values, and index it", async () => {
    // Arrange
    const out = await outDir();
    await writeFile(path.join(out, "stale.txt"), "old");
    browser.respond(() => ({ status: 200, type: "application/pdf", body: "%PDF" }));
    const session = vi.fn(async () => ({ setup: ["https://pip/sign-in"], cookies: [{ name: "session", value: "s1" }] }));
    const spec: DownloadSpec = {
      id: "list-pdf",
      kind: "pdf",
      pip: { path: "/download/[id]", params: { id: "publication:civil" }, query: { type: "pdf", lang: "record:user.locale" }, as: "verified-media" },
      cath: { path: "/unused" }
    };

    // Act
    const result = await captureDownloads({
      app: "pip",
      baseUrl: "https://pip",
      specs: [spec],
      resolve: seedResolver({ civil: { artefactId: "a 1" } }, { user: { locale: "cy" } }),
      session,
      out,
      seededAt: "2026-10-01T00:00:00Z"
    });

    // Assert
    expect(browser.requested).toEqual(["https://pip/download/a%201?type=pdf&lang=cy"]);
    expect(browser.visited).toEqual(["https://pip/sign-in"]);
    expect(browser.cookies).toEqual([[{ name: "session", value: "s1", url: "https://pip" }]]);
    expect(session).toHaveBeenCalledWith("verified-media");
    const entry = { id: "list-pdf", kind: "pdf", file: "list-pdf/pdf.pdf", blob: "/download/a%201", bytes: 4, seededAt: "2026-10-01T00:00:00Z" };
    expect(result).toEqual({ entries: [entry], notServed: [] });
    expect(await readFile(path.join(out, "list-pdf/pdf.pdf"), "utf-8")).toBe("%PDF");
    expect(await readFile(path.join(out, "index.jsonl"), "utf-8")).toBe(`${JSON.stringify(entry)}\n`);
    await expect(readFile(path.join(out, "stale.txt"))).rejects.toThrow();
    expect(browser.contextsClosed).toBe(1);
    expect(browser.closed).toBe(true);
  });

  it("should fetch a public file without signing in, and record no seed time when none is given", async () => {
    // Arrange
    const out = await outDir();
    browser.respond(() => ({ status: 200, type: "text/csv", body: "a,b" }));
    const session = vi.fn();

    // Act
    const result = await captureDownloads({
      app: "cath",
      baseUrl: "http://cath",
      specs: [{ id: "data", kind: "csv", pip: { path: "/unused" }, cath: { path: "/data.csv" } }],
      resolve: () => null,
      session,
      out
    });

    // Assert
    expect(session).not.toHaveBeenCalled();
    expect(browser.cookies).toEqual([]);
    expect(browser.visited).toEqual([]);
    expect(result.entries).toEqual([{ id: "data", kind: "csv", file: "data/csv.csv", blob: "/data.csv", bytes: 3, seededAt: null }]);
  });

  it("should report each file it could not fetch, and still fetch the rest", async () => {
    // Arrange
    const out = await outDir();
    browser.respond((url) => {
      if (url.endsWith("/page")) return { status: 200, type: "text/html; charset=utf-8", body: "<html>" };
      if (url.endsWith("/forbidden")) return { status: 403, type: "", body: "" };
      if (url.endsWith("/broken")) throw new Error("socket hang up\nat somewhere");
      return { status: 200, type: "application/octet-stream", body: "bytes" };
    });
    const side = (routePath: string, extra: Partial<DownloadSpec["cath"]> = {}) => ({ path: routePath, ...extra });
    const specs: DownloadSpec[] = [
      { id: "no-param", kind: "pdf", pip: side("/x"), cath: side("/x/[id]", { params: { id: "publication:missing" } }) },
      { id: "no-query", kind: "pdf", pip: side("/x"), cath: side("/x", { query: { id: "record:missing.id" } }) },
      { id: "no-session", kind: "pdf", pip: side("/x"), cath: side("/x", { as: "system-admin" }) },
      { id: "page", kind: "excel", pip: side("/x"), cath: side("/page") },
      { id: "forbidden", kind: "excel", pip: side("/x"), cath: side("/forbidden") },
      { id: "broken", kind: "csv", pip: side("/x"), cath: side("/broken") },
      { id: "image", kind: "binary", pip: side("/x"), cath: side("/image", { params: { id: "literal" } }) }
    ];

    // Act
    const result = await captureDownloads({ app: "cath", baseUrl: "http://cath", specs, resolve: () => null, session: async () => null, out });

    // Assert
    expect(result.notServed).toEqual([
      "no-param: no value for publication:missing",
      "no-query: no value for record:missing.id",
      "no-session: system-admin could not be signed in",
      "page: cath answered 200 text/html rather than the file",
      "forbidden: cath answered 403 with no content type rather than the file",
      "broken: socket hang up"
    ]);
    expect(result.entries.map((entry) => entry.file)).toEqual(["image/binary.bin"]);
    expect(browser.contextsClosed).toBe(4);
    expect(browser.closed).toBe(true);
  });
});

async function outDir(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "downloads-"));
}

function fakeBrowser() {
  let answer: (url: string) => { status: number; type: string; body: string } = () => ({ status: 404, type: "", body: "" });
  const state = {
    requested: [] as string[],
    visited: [] as string[],
    cookies: [] as unknown[],
    contextsClosed: 0,
    closed: false,
    respond(next: typeof answer) {
      answer = next;
    },
    async newContext() {
      return {
        addCookies: async (cookies: unknown) => {
          state.cookies.push(cookies);
        },
        newPage: async () => ({
          goto: async (url: string) => {
            state.visited.push(url);
          }
        }),
        request: {
          get: async (url: string) => {
            state.requested.push(url);
            const { status, type, body } = answer(url);
            return {
              ok: () => status >= 200 && status < 300,
              status: () => status,
              headers: () => (type ? { "content-type": type } : {}),
              body: async () => Buffer.from(body)
            };
          }
        },
        close: async () => {
          state.contextsClosed++;
        }
      };
    },
    async close() {
      state.closed = true;
    }
  };
  return state;
}
