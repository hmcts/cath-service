import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ seed: "", loadManifest: vi.fn(), loadUsers: vi.fn() }));

vi.mock("../fixtures/manifest.js", () => ({ loadManifest: mocks.loadManifest, loadUsers: mocks.loadUsers }));
// pip's seed is read from output/seed/pip.json, which the test supplies
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    readFile: vi.fn(async (file: string, options?: unknown) =>
      String(file).endsWith(path.join("output", "seed", "pip.json")) ? mocks.seed : actual.readFile(file, options as never)
    )
  };
});

const PIP = "https://localhost:8180";
// A real fixture file, so a response with the same bytes matches it
const PAYLOAD = "records/media-application-id.png";
const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures", PAYLOAD);

function flatFile(id: string, viewAs?: string) {
  return { id, listType: `${id.toUpperCase()}_LIST`, format: "flat-file", payload: PAYLOAD, ...(viewAs ? { viewAs } : {}) };
}

describe("pip record-flat-files script", () => {
  const argv = process.argv;
  const tls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  const fetchMock = vi.fn();
  let dir: string;
  let fixture: Buffer;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    dir = await mkdtemp(path.join(tmpdir(), "pip-flat-files-"));
    fixture = await readFile(FIXTURE);
    process.argv = ["node", "record-flat-files.ts", dir];
    vi.stubEnv("UI_BASELINE_SCOPE", "");
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});
    mocks.seed = JSON.stringify({ publications: { "public-flat": { artefactId: "a1" }, "private-flat": { artefactId: "a2" }, other: { artefactId: "a3" } } });
    mocks.loadManifest.mockResolvedValue({
      publications: [flatFile("public-flat"), flatFile("private-flat", "verified-cft"), flatFile("unseeded-flat"), { id: "other", format: "json" }]
    });
    mocks.loadUsers.mockResolvedValue([
      { id: "verified-cft", provenance: "CFT_IDAM", provenanceUserId: "cft-uid", role: "VERIFIED", email: "c", forenames: "C", surname: "F" },
      { id: "admin", provenance: "SSO", provenanceUserId: "sso-oid", role: "SYSTEM_ADMIN", email: "a", forenames: "A", surname: "D" }
    ]);
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/parity-login")) {
        const headers = new Headers();
        headers.append("set-cookie", "session=abc; Path=/; HttpOnly");
        headers.append("set-cookie", "other=def; Path=/");
        return new Response(null, { status: 302, headers });
      }
      if (url.endsWith("artefactId=a1"))
        return new Response(new Uint8Array(fixture), { headers: { "content-type": "image/png", "content-disposition": "inline; filename=id.png" } });
      return new Response("not the file", { status: 403, headers: { "content-type": "text/html" } });
    });
  });

  afterEach(async () => {
    process.argv = argv;
    if (tls === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = tls;
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it("should record what pip serves for each seeded flat file, signed in as its viewer", async () => {
    // Act
    await import("./record-flat-files.js");

    // Assert
    const publicRecord = JSON.parse(await readFile(path.join(dir, "public-flat.json"), "utf-8"));
    expect(publicRecord).toEqual({
      id: "public-flat",
      listType: "PUBLIC-FLAT_LIST",
      artefactId: "a1",
      viewAs: null,
      status: 200,
      contentType: "image/png",
      contentDisposition: "inline; filename=id.png",
      bytes: fixture.length,
      sha256: createHash("sha256").update(fixture).digest("hex"),
      matchesFixture: true
    });
    expect(fetchMock).toHaveBeenCalledWith(`${PIP}/file-publication?artefactId=a1`, { headers: {}, redirect: "manual" });

    const privateRecord = JSON.parse(await readFile(path.join(dir, "private-flat.json"), "utf-8"));
    expect(privateRecord).toMatchObject({ viewAs: "verified-cft", status: 403, matchesFixture: false });
    expect(fetchMock).toHaveBeenCalledWith(`${PIP}/parity-login?uid=cft-uid&flow=CFT&redirect=/`, { redirect: "manual" });
    expect(fetchMock).toHaveBeenCalledWith(`${PIP}/file-publication?artefactId=a2`, { headers: { cookie: "session=abc; other=def" }, redirect: "manual" });

    expect(console.log).toHaveBeenCalledWith("skipped unseeded-flat: not seeded");
    expect(console.log).toHaveBeenCalledWith(`ok   public-flat: 200 image/png ${fixture.length} bytes`);
    expect(console.log).toHaveBeenCalledWith("FAIL private-flat: 403 text/html 12 bytes");
    expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBe("0");
  });

  it("should sign SSO users in by oid", async () => {
    // Arrange
    mocks.loadManifest.mockResolvedValue({ publications: [flatFile("private-flat", "admin")] });

    // Act
    await import("./record-flat-files.js");

    // Assert
    expect(fetchMock).toHaveBeenCalledWith(`${PIP}/parity-login?oid=sso-oid&flow=SSO&redirect=/`, { redirect: "manual" });
  });

  it("should fail for a flat file viewed as an unknown user", async () => {
    // Arrange
    mocks.loadManifest.mockResolvedValue({ publications: [flatFile("private-flat", "nobody")] });

    // Act
    const result = import("./record-flat-files.js");

    // Assert
    await expect(result).rejects.toThrow("unknown parity user nobody");
  });

  it("should fail without an output directory", async () => {
    // Arrange
    process.argv = ["node", "record-flat-files.ts"];

    // Act
    const result = import("./record-flat-files.js");

    // Assert
    await expect(result).rejects.toThrow("usage: record-flat-files.ts <output dir>");
  });
});
