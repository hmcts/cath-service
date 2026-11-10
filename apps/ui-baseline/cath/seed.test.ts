import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicationFixture } from "../fixtures/manifest.js";

const mocks = vi.hoisted(() => ({
  loadEnvironment: vi.fn(),
  loadManifest: vi.fn(),
  readPayload: vi.fn(),
  convertExcelForListTypeName: vi.fn(),
  validateListTypeJson: vi.fn(),
  uploadBlob: vi.fn(),
  processPublication: vi.fn(),
  disconnect: vi.fn()
}));

vi.mock("../environments.js", () => ({ loadEnvironment: mocks.loadEnvironment }));
vi.mock("../fixtures/manifest.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../fixtures/manifest.js")>()),
  loadManifest: mocks.loadManifest,
  readPayload: mocks.readPayload
}));
vi.mock("@hmcts/list-types-common", () => ({
  convertExcelForListTypeName: mocks.convertExcelForListTypeName,
  validateListTypeJson: mocks.validateListTypeJson
}));
vi.mock("@hmcts/azure-blob", () => ({ uploadBlob: mocks.uploadBlob }));
vi.mock("@hmcts/publication", () => ({ processPublication: mocks.processPublication }));
vi.mock("@hmcts/postgres-prisma", () => ({ prisma: { $disconnect: mocks.disconnect } }));
// Stands in for libs/list-types, so loading the Excel converters imports one cheap, mocked package
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  const isListTypesDir = (dir: unknown) => String(dir).endsWith(path.join("libs", "list-types"));
  return {
    ...actual,
    readdir: vi.fn(async (dir: string, options?: unknown) =>
      isListTypesDir(dir)
        ? [
            { name: "common", isDirectory: () => true },
            { name: "README.md", isDirectory: () => false }
          ]
        : actual.readdir(dir, options as never)
    ),
    readFile: vi.fn(async (file: string, options?: unknown) =>
      String(file).endsWith(path.join("list-types", "common", "package.json"))
        ? JSON.stringify({ name: "@hmcts/list-types-common" })
        : actual.readFile(file, options as never)
    )
  };
});

const API = "http://api";
const LIST_TYPES = [
  { id: 1, name: "JSON_LIST", friendlyName: null },
  { id: 2, name: "EXCEL_LIST", friendlyName: null },
  { id: 3, name: "FLAT_LIST", friendlyName: null }
];

function publication(id: string, overrides: Partial<PublicationFixture> = {}): PublicationFixture {
  return {
    id,
    listType: "JSON_LIST",
    cathListType: "JSON_LIST",
    paths: { pip: `/${id}`, cath: `/${id}` },
    payload: `payloads/${id}.json`,
    format: "json",
    origin: "test",
    locationId: 9,
    contentDate: "2026-01-01",
    type: "LIST",
    language: "ENGLISH",
    sensitivity: "PUBLIC",
    provenance: "MANUAL_UPLOAD",
    ...overrides
  };
}

const PUBLICATIONS = [
  publication("json-list"),
  publication("welsh-list", { language: "WELSH" }),
  publication("invalid-list"),
  publication("excel-list", { listType: "EXCEL_LIST", cathListType: "EXCEL_LIST", format: "excel", payload: "payloads/excel-list.xlsx" }),
  publication("flat-list", {
    listType: "FLAT_LIST",
    cathListType: "FLAT_LIST",
    format: "flat-file",
    payload: "payloads/flat-list.pdf",
    paths: { pip: "/x", cath: null }
  }),
  publication("pip-only", { paths: { pip: "/pip-only", cath: null } }),
  publication("unknown-list", { cathListType: "MISSING_LIST" })
];

describe("cath seed script", () => {
  const argv = process.argv;
  const fetchMock = vi.fn();
  let dir: string;
  let output: string;
  let artefactCount: number;
  let locationCount: number;
  // What GET /test-support/locations answers: CaTH's locations, including runs' own courts
  let existingLocations: { locationId: number; name: string }[];

  function route(url: string, init?: RequestInit): Response {
    const method = init?.method ?? "GET";
    if (url === `${API}/test-support/list-types`) return Response.json(LIST_TYPES);
    if (url === `${API}/test-support/artefacts` && method === "DELETE") return new Response(null, { status: 204 });
    if (url === `${API}/test-support/artefacts` && method === "POST") return Response.json({ artefactId: `art-${++artefactCount}` });
    if (url === `${API}/test-support/flat-files`) return Response.json({});
    if (url.startsWith("https://login.microsoftonline.com/")) return Response.json({ access_token: "token-1" });
    if (url === `${API}/publication`) return Response.json({ artefactId: `api-${++artefactCount}` });
    if (url === `${API}/test-support/locations` && method === "GET") return Response.json(existingLocations);
    if (url === `${API}/test-support/locations` && method === "POST") return Response.json({ locationId: 90000 + ++locationCount });
    if (url === `${API}/test-support/locations` && method === "DELETE") return Response.json({ deleted: 1 });
    if (url === `${API}/test-support/subscriptions` && method === "DELETE") return Response.json({ deleted: 0 });
    // A run's records, which removing it looks for: none here
    if (url.startsWith(`${API}/test-support/media-applications?`)) return new Response("not found", { status: 404 });
    if (url === `${API}/test-support/legacy-third-party-users` || url === `${API}/test-support/third-party-users`) return Response.json([]);
    return new Response("unexpected", { status: 500 });
  }

  const calls = (url: string, method = "POST") =>
    fetchMock.mock.calls.filter(([called, init]) => called === url && (init?.method ?? "GET") === method).map(([, init]) => init as RequestInit);

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    artefactCount = 0;
    locationCount = 0;
    existingLocations = [];
    dir = await mkdtemp(path.join(tmpdir(), "cath-seed-"));
    output = path.join(dir, "seed", "cath-local.json");
    process.argv = ["node", "seed.ts"];
    vi.stubEnv("PARITY_SEED_OUTPUT", output);
    vi.stubEnv("CATH_SERVICE_API_URL", API);
    vi.stubEnv("CATH_SERVICE_API_CLIENT_ID", "");
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => route(url, init));
    mocks.loadManifest.mockResolvedValue({ displayWindowDays: { before: 1, after: 30 }, publications: PUBLICATIONS });
    mocks.readPayload.mockImplementation(async (fixture: PublicationFixture) =>
      Buffer.from(fixture.format === "json" ? JSON.stringify({ list: fixture.id }) : `${fixture.id}-bytes`)
    );
    mocks.convertExcelForListTypeName.mockResolvedValue([{ converted: true }]);
    mocks.validateListTypeJson.mockImplementation(async (_id: string, json: { list: string }) =>
      json.list === "invalid-list" ? { isValid: false, errors: [{ message: "bad" }] } : { isValid: true, errors: [] }
    );
    mocks.loadEnvironment.mockResolvedValue({ name: "local", cath: { apiUrl: API, signIn: "session" }, secret: vi.fn() });
  });

  afterEach(async () => {
    process.argv = argv;
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it("should publish a local CaTH's lists through test-support, blob storage and CaTH's processing", async () => {
    // Act
    await import("./seed.js");

    // Assert
    const result = JSON.parse(await readFile(output, "utf-8"));
    expect(result.app).toBe("cath");
    expect(result.ingestion).toBe("test-support POST /test-support/artefacts + blob upload + processPublication");
    expect(Object.keys(result.publications).sort()).toEqual(["excel-list", "flat-list", "json-list", "welsh-list"]);
    expect(result.rejected).toEqual({
      "invalid-list": 'schema rejected: [{"message":"bad"}]',
      "unknown-list": "CaTH has no list type MISSING_LIST"
    });
    expect(result.publications["json-list"]).toMatchObject({ locationId: 9, metadata: { contentDate: "2026-01-01T00:00:00" } });
    expect(result.publications["excel-list"].excelUploaded).toBeUndefined();
    expect(mocks.validateListTypeJson).toHaveBeenCalledWith("1", { list: "json-list" }, LIST_TYPES);
    expect(mocks.convertExcelForListTypeName).toHaveBeenCalledWith("EXCEL_LIST", Buffer.from("excel-list-bytes"));

    const jsonId = result.publications["json-list"].artefactId;
    expect(mocks.uploadBlob).toHaveBeenCalledWith(jsonId, Buffer.from(JSON.stringify({ list: "json-list" })), "application/json");
    expect(mocks.processPublication).toHaveBeenCalledWith(
      expect.objectContaining({ artefactId: jsonId, locationId: "9", listTypeId: 1, locale: "en", uploadedExcel: undefined, skipNotifications: true })
    );
    expect(mocks.processPublication).toHaveBeenCalledWith(expect.objectContaining({ artefactId: result.publications["welsh-list"].artefactId, locale: "cy" }));
    expect(mocks.processPublication).toHaveBeenCalledWith(
      expect.objectContaining({ jsonData: [{ converted: true }], uploadedExcel: Buffer.from("excel-list-bytes") })
    );

    const [flatFile] = calls(`${API}/test-support/flat-files`);
    expect(JSON.parse(flatFile.body as string)).toEqual({
      artefactId: result.publications["flat-list"].artefactId,
      content: Buffer.from("flat-list-bytes").toString("base64"),
      extension: ".pdf",
      sourceArtefactId: "flat-list.pdf"
    });
    const flatArtefact = calls(`${API}/test-support/artefacts`)
      .map((init) => JSON.parse(init.body as string))
      .find((body) => body.isFlatFile);
    expect(flatArtefact).toMatchObject({ locationId: "9", listTypeId: 3, isFlatFile: true });
    expect(calls(`${API}/test-support/artefacts`, "DELETE")).toHaveLength(0);
    expect(mocks.disconnect).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(`wrote ${output}`);
  });

  it("should remove the previous seed's artefacts and seed only the publications asked for", async () => {
    // Arrange
    process.argv = ["node", "seed.ts", "--only", "json-list,"];
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify({ publications: { a: { artefactId: "old-1" }, b: { artefactId: "old-2" } } }));

    // Act
    await import("./seed.js");

    // Assert
    const [removed] = calls(`${API}/test-support/artefacts`, "DELETE");
    expect(JSON.parse(removed.body as string)).toEqual({ artefactIds: ["old-1", "old-2"] });
    expect(console.log).toHaveBeenCalledWith("removed 2 artefacts from the previous seed");
    const result = JSON.parse(await readFile(output, "utf-8"));
    expect(Object.keys(result.publications)).toEqual(["json-list"]);
    expect(result.rejected).toEqual({});
  });

  it("should publish through the publication API with a client token when one is configured", async () => {
    // Arrange
    vi.stubEnv("CATH_SERVICE_API_CLIENT_ID", "client-1");
    vi.stubEnv("AZURE_TENANT_ID", "tenant-1");
    vi.stubEnv("CATH_SERVICE_API_CLIENT_SECRET", "secret-1");

    // Act
    await import("./seed.js");

    // Assert
    const [tokenRequest] = calls("https://login.microsoftonline.com/tenant-1/oauth2/v2.0/token");
    expect(String(tokenRequest.body)).toBe("client_id=client-1&client_secret=secret-1&scope=client-1%2F.default&grant_type=client_credentials");
    const published = calls(`${API}/publication`);
    expect(published).toHaveLength(3);
    expect(published[0].headers).toMatchObject({
      Authorization: "Bearer token-1",
      "x-court-id": "9",
      "x-list-type": "JSON_LIST",
      "x-language": "ENGLISH",
      "x-content-date": "2026-01-01T00:00:00"
    });
    const result = JSON.parse(await readFile(output, "utf-8"));
    expect(result.ingestion).toBe("publication API POST /publication");
    expect(result.publications["excel-list"].excelUploaded).toBe(false);
    expect(result.publications["json-list"].artefactId).toMatch(/^api-/);
    expect(mocks.processPublication).not.toHaveBeenCalled();
    expect(mocks.disconnect).not.toHaveBeenCalled();
  });

  it("should record a publication the publication API refuses", async () => {
    // Arrange
    vi.stubEnv("CATH_SERVICE_API_CLIENT_ID", "client-1");
    vi.stubEnv("AZURE_TENANT_ID", "tenant-1");
    vi.stubEnv("CATH_SERVICE_API_CLIENT_SECRET", "secret-1");
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
      url === `${API}/publication` ? new Response("nope", { status: 400 }) : route(url, init)
    );

    // Act
    await import("./seed.js");

    // Assert
    const result = JSON.parse(await readFile(output, "utf-8"));
    expect(result.rejected["json-list"]).toBe("publication API 400: nope");
    expect(Object.keys(result.publications)).toEqual(["flat-list"]);
  });

  it("should read the deployed environment's publication API client from its vault", async () => {
    // Arrange
    const secrets: Record<string, string> = { "client-name": "vault-client", "tenant-name": "vault-tenant", "secret-name": "vault-secret" };
    mocks.loadEnvironment.mockResolvedValue({
      name: "test",
      cath: { apiUrl: API, signIn: "accounts", publicationApi: { clientId: "client-name", tenantId: "tenant-name", clientSecret: "secret-name" } },
      secret: vi.fn(async (_config: unknown, name: string) => secrets[name])
    });

    // Act
    await import("./seed.js");

    // Assert
    expect(calls("https://login.microsoftonline.com/vault-tenant/oauth2/v2.0/token")).toHaveLength(1);
    expect(calls(`${API}/publication`)).toHaveLength(3);
  });

  it("should refuse to seed a deployed CaTH without publication API credentials", async () => {
    // Arrange
    mocks.loadEnvironment.mockResolvedValue({
      name: "test",
      cath: { apiUrl: API, signIn: "accounts", publicationApi: { clientId: "c", tenantId: "t", clientSecret: "s" } },
      secret: vi.fn().mockResolvedValue(null)
    });

    // Act
    const result = import("./seed.js");

    // Assert
    await expect(result).rejects.toThrow("no publication API credentials for test");
  });

  describe("a deployed CaTH", () => {
    const body = (init: RequestInit) => JSON.parse(String(init.body));
    const header = (init: RequestInit, name: string) => (init.headers as Record<string, string>)[name];
    // A run token as run.ts makes them, for a run started at this time
    const tokenAt = (ms: number) => `uic${Math.floor(ms / 1000).toString(36)}abcd`;

    const secrets: Record<string, string> = { "client-name": "vault-client", "tenant-name": "vault-tenant", "secret-name": "vault-secret" };

    beforeEach(() => {
      mocks.loadEnvironment.mockResolvedValue({
        name: "aat",
        cath: { apiUrl: API, signIn: "accounts", publicationApi: { clientId: "client-name", tenantId: "tenant-name", clientSecret: "secret-name" } },
        secret: vi.fn(async (_config: unknown, name: string) => secrets[name])
      });
    });

    it("should publish through the publication API, as CaTH's E2E tests do, to courts of the run's own", async () => {
      // Act
      await import("./seed.js");

      // Assert
      const result = JSON.parse(await readFile(output, "utf-8"));
      expect(result.runToken).toMatch(/^uic[0-9a-z]{8,}$/);
      expect(result).toMatchObject({ environment: "aat", locations: { "9": 90001 } });
      expect(result.ingestion).toBe("publication API POST /publication, on courts of the run's own");
      const [court] = calls(`${API}/test-support/locations`);
      expect(body(court)).toEqual({
        name: `${result.runToken} Single Justice Procedure`,
        welshName: `${result.runToken} Gweithdrefn Un Ynad`,
        regionIds: [1, 2, 3, 4, 5],
        subJurisdictionIds: [7]
      });
      const published = calls(`${API}/publication`);
      expect(published).toHaveLength(3);
      expect(published.map((init) => header(init, "x-court-id"))).toEqual(["90001", "90001", "90001"]);
      expect(published.every((init) => header(init, "Authorization") === "Bearer token-1")).toBe(true);
      expect(calls("https://login.microsoftonline.com/vault-tenant/oauth2/v2.0/token")).toHaveLength(1);
      expect(result.publications["json-list"]).toMatchObject({ artefactId: expect.stringMatching(/^api-/), locationId: 90001 });
      expect(result.publications["excel-list"].excelUploaded).toBe(false);
      expect(body(calls(`${API}/test-support/artefacts`)[0])).toMatchObject({ locationId: "90001", isFlatFile: true });
      expect(mocks.processPublication).not.toHaveBeenCalled();
    });

    it("should first remove runs old enough to be over, with what was published to their courts, and leave recent ones", async () => {
      // Arrange
      const old = tokenAt(Date.now() - 4 * 60 * 60 * 1000);
      const recent = tokenAt(Date.now() - 10 * 60 * 1000);
      existingLocations = [
        { locationId: 91, name: `${old} Oxford Combined Court Centre` },
        { locationId: 92, name: `${old} Single Justice Procedure` },
        { locationId: 93, name: `${recent} Oxford Combined Court Centre` },
        { locationId: 9, name: "Single Justice Procedure" }
      ];

      // Act
      await import("./seed.js");

      // Assert
      expect(calls(`${API}/test-support/artefacts`, "DELETE").map(body)).toEqual([{ locationId: "91" }, { locationId: "92" }]);
      expect(calls(`${API}/test-support/subscriptions`, "DELETE").map(body)).toEqual([{ searchType: "LOCATION_ID", searchValues: ["91", "92"] }]);
      expect(calls(`${API}/test-support/locations`, "DELETE").map(body)).toEqual([{ locationIds: [91, 92] }]);
    });

    it("should still seed when an old run cannot be removed, leaving it for a later run", async () => {
      // Arrange
      existingLocations = [{ locationId: 91, name: `${tokenAt(Date.now() - 4 * 60 * 60 * 1000)} Oxford Combined Court Centre` }];
      fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
        url === `${API}/test-support/artefacts` && init?.method === "DELETE" ? new Response("locked", { status: 500 }) : route(url, init)
      );

      // Act
      await import("./seed.js");

      // Assert
      const result = JSON.parse(await readFile(output, "utf-8"));
      expect(Object.keys(result.publications)).toContain("json-list");
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("left for a later run: could not remove run"));
    });

    it("should remove the courts it made when it fails before recording the run", async () => {
      // Arrange
      fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
        if (url === `${API}/test-support/locations` && init?.method === "POST") {
          // The court is made, but CaTH fails to answer, so the run stops partway
          existingLocations.push({ locationId: 95, name: body(init).name });
          return new Response("timeout", { status: 504 });
        }
        return route(url, init);
      });

      // Act
      const seeding = import("./seed.js");

      // Assert
      await expect(seeding).rejects.toThrow("POST /test-support/locations failed: 504");
      expect(calls(`${API}/test-support/locations`, "DELETE").map(body)).toEqual([{ locationIds: [95] }]);
    });

    it("should remove the run its previous seed recorded, however recent", async () => {
      // Arrange
      const previous = tokenAt(Date.now() - 60 * 1000);
      await mkdir(path.dirname(output), { recursive: true });
      await writeFile(output, JSON.stringify({ app: "cath", runToken: previous, publications: { "json-list": { artefactId: "old-1" } }, rejected: {} }));
      existingLocations = [{ locationId: 94, name: `${previous} Single Justice Procedure` }];

      // Act
      await import("./seed.js");

      // Assert
      expect(calls(`${API}/test-support/locations`, "DELETE").map(body)).toEqual([{ locationIds: [94] }]);
      expect(calls(`${API}/test-support/artefacts`, "DELETE").map(body)).toEqual([{ locationId: "94" }]);
    });
  });

  it("should fail when a client id is set without its tenant or secret", async () => {
    // Arrange
    vi.stubEnv("CATH_SERVICE_API_CLIENT_ID", "client-1");
    vi.stubEnv("AZURE_TENANT_ID", "");

    // Act
    const result = import("./seed.js");

    // Assert
    await expect(result).rejects.toThrow("a publication API client id is set, so its tenant id and secret are needed too");
  });

  it("should fail when the token request is refused", async () => {
    // Arrange
    vi.stubEnv("CATH_SERVICE_API_CLIENT_ID", "client-1");
    vi.stubEnv("AZURE_TENANT_ID", "tenant-1");
    vi.stubEnv("CATH_SERVICE_API_CLIENT_SECRET", "secret-1");
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
      url.startsWith("https://login.microsoftonline.com/") ? new Response("", { status: 401 }) : route(url, init)
    );

    // Act
    const result = import("./seed.js");

    // Assert
    await expect(result).rejects.toThrow("token request failed: 401");
  });

  it("should fail when test-support refuses a request", async () => {
    // Arrange
    fetchMock.mockResolvedValue(new Response("down", { status: 503 }));

    // Act
    const result = import("./seed.js");

    // Assert
    await expect(result).rejects.toThrow("GET /test-support/list-types failed: 503 down");
  });
});
