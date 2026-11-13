import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ParityUser, PublicationFixture } from "../fixtures/manifest.js";

const mocks = vi.hoisted(() => ({
  loadManifest: vi.fn(),
  loadUsers: vi.fn(),
  readPayload: vi.fn(),
  seedRecords: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  loadEnvironment: vi.fn(),
  actualLoadEnvironment: undefined as undefined | ((name?: string) => Promise<unknown>),
  startRun: vi.fn(),
  files: new Map<string, string>()
}));

vi.mock("../fixtures/manifest.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../fixtures/manifest.js")>()),
  loadManifest: mocks.loadManifest,
  loadUsers: mocks.loadUsers,
  readPayload: mocks.readPayload
}));
vi.mock("./records.js", () => ({ seedRecords: mocks.seedRecords }));
vi.mock("./run.js", async (importOriginal) => ({ ...(await importOriginal<typeof import("./run.js")>()), startRun: mocks.startRun }));
vi.mock("../environments.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../environments.js")>();
  mocks.actualLoadEnvironment = actual.loadEnvironment;
  return { ...actual, loadEnvironment: mocks.loadEnvironment };
});
// The sessions a deployed seed reads are faked, never the real output/seed ones; everything else is read as it is
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, existsSync: (file: string) => (file.includes("pip-sign-in-") ? mocks.files.has(file) : actual.existsSync(file)) };
});
// The seed's output is the real output/seed/pip.json, so writing it is faked
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    readFile: vi.fn(async (file: string, encoding: BufferEncoding) => mocks.files.get(file) ?? actual.readFile(file, encoding)),
    writeFile: mocks.writeFile,
    mkdir: mocks.mkdir
  };
});
vi.mock("@hmcts/location/location-data", () => ({
  locationData: {
    regions: [
      { regionId: 1, name: "London", welshName: "Llundain" },
      { regionId: 2, name: "Wales", welshName: "Cymru" }
    ],
    jurisdictions: [{ jurisdictionId: 1, name: "Civil", welshName: "Sifil" }],
    subJurisdictions: [
      { subJurisdictionId: 1, jurisdictionId: 1, name: "Civil Court", welshName: "Llys Sifil" },
      { subJurisdictionId: 2, jurisdictionId: 1, name: "County Court", welshName: "Llys Sirol" }
    ],
    locations: [{ locationId: 9, name: 'Court "Nine", Annex', welshName: "Llys Naw", regions: [1, 2], subJurisdictions: [1, 2] }]
  }
}));

const DATA = "http://localhost:18090";
const ACCOUNT = "http://localhost:16969";
const REQUESTER = "00000000-0000-4000-8000-000000000001";

function user(id: string, role: string, provenance: ParityUser["provenance"] = "PI_AAD"): ParityUser {
  return { id, provenance, role, provenanceUserId: `${id}-oid`, email: `${id}@example.com`, forenames: "F", surname: "S" };
}

function publication(id: string, format: PublicationFixture["format"], payload = `payloads/${id}.json`): PublicationFixture {
  return {
    id,
    listType: `${id.toUpperCase()}_LIST`,
    cathListType: null,
    paths: { pip: `/${id}`, cath: null },
    payload,
    format,
    origin: "test",
    locationId: 9,
    contentDate: "2026-01-01",
    type: "LIST",
    language: "ENGLISH",
    sensitivity: "PUBLIC",
    provenance: "MANUAL_UPLOAD"
  };
}

const USERS = [user("media", "VERIFIED"), user("admin", "SYSTEM_ADMIN", "SSO")];
const PUBLICATIONS = [publication("json", "json"), publication("excel", "excel", "payloads/excel.xlsx"), publication("flat", "flat-file", "payloads/flat.pdf")];

describe("pip seed script", () => {
  const argv = process.argv;
  const fetchMock = vi.fn();
  let existingUsers: Set<string>;
  let artefacts: number;

  const requests = (url: string) => fetchMock.mock.calls.filter(([called]) => called === url).map(([, init]) => init as RequestInit);

  function pip(url: string, init?: RequestInit): Response {
    if (url === `${DATA}/locations/upload`) return Response.json([{}]);
    const lookup = url.match(/\/account\/provenance\/\w+\/(.+)$/);
    if (lookup) return existingUsers.has(lookup[1]) ? Response.json({ userId: `pip-${lookup[1]}` }) : new Response("", { status: 404 });
    if (url === `${ACCOUNT}/account/system-admin` || url === `${ACCOUNT}/account/add/pi`) {
      const body = JSON.parse(init?.body as string);
      existingUsers.add((Array.isArray(body) ? body[0] : body).provenanceUserId);
      return new Response('{"CREATED_ACCOUNTS":[]}');
    }
    if (url === `${DATA}/publication/search/config`) return new Response("", { status: 201 });
    if (url === `${DATA}/publication` || url === `${DATA}/publication/non-strategic`) return Response.json({ artefactId: `pip-art-${++artefacts}` });
    return new Response(`no fake for ${url}`, { status: 500 });
  }

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    existingUsers = new Set();
    artefacts = 0;
    vi.stubEnv("PIP_DATA_MANAGEMENT_URL", "");
    vi.stubEnv("PIP_ACCOUNT_MANAGEMENT_URL", "");
    delete process.env.PIP_DATA_MANAGEMENT_URL;
    delete process.env.PIP_ACCOUNT_MANAGEMENT_URL;
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => pip(url, init));
    mocks.loadManifest.mockResolvedValue({ displayWindowDays: { before: 1, after: 30 }, publications: PUBLICATIONS });
    mocks.loadUsers.mockResolvedValue(USERS);
    mocks.readPayload.mockImplementation(async (fixture: PublicationFixture) => Buffer.from(`${fixture.id}-payload`));
    mocks.seedRecords.mockResolvedValue({ "manage-user-audit": { id: "a1" } });
    mocks.loadEnvironment.mockImplementation((name?: string) => (mocks.actualLoadEnvironment as (name?: string) => Promise<unknown>)(name));
    mocks.files.clear();
  });

  afterEach(() => {
    process.argv = argv;
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("should upload locations, users, search config and every publication, then write the seed", async () => {
    // Act
    await import("./seed.js");

    // Assert
    const [locations] = requests(`${DATA}/locations/upload`);
    const csv = await ((locations.body as FormData).get("locationList") as File).text();
    const [header, row] = csv.split("\n");
    expect(header.startsWith("P&I ID,Court Desc,Welsh Court Desc,Region")).toBe(true);
    expect(row).toBe(
      '9,"Court ""Nine"", Annex",Llys Naw,London; Wales,Llundain; Cymru,Civil,Sifil,Civil Court; County Court,Llys Sifil; Llys Sirol,MANUAL_UPLOAD,9,Venue,,'
    );

    const [admin] = requests(`${ACCOUNT}/account/system-admin`);
    expect(JSON.parse(admin.body as string)).toEqual({ email: "admin@example.com", firstName: "F", surname: "S", provenanceUserId: "admin-oid" });
    const [media] = requests(`${ACCOUNT}/account/add/pi`);
    expect(JSON.parse(media.body as string)).toEqual([
      { email: "media@example.com", provenanceUserId: "media-oid", userProvenance: "PI_AAD", roles: "VERIFIED", forenames: "F", surname: "S" }
    ]);

    const [config] = requests(`${DATA}/publication/search/config`);
    expect(config.headers).toEqual({ "content-type": "application/json", "x-requester-id": "pip-admin-oid" });
    expect(JSON.parse(config.body as string).listType).toBe("JSON_LIST");

    const [json, flat] = requests(`${DATA}/publication`);
    expect(json.headers).toMatchObject({ "content-type": "application/json", "x-list-type": "JSON_LIST", "x-court-id": "9", "x-requester-id": REQUESTER });
    expect(flat.headers).toMatchObject({ "x-source-artefact-id": "flat.pdf" });
    expect(((flat.body as FormData).get("file") as File).type).toBe("application/pdf");
    const [excel] = requests(`${DATA}/publication/non-strategic`);
    expect(((excel.body as FormData).get("file") as File).name).toBe("publication.xlsx");

    const [file, content] = mocks.writeFile.mock.calls[0];
    expect(String(file).endsWith("output/seed/pip.json")).toBe(true);
    const result = JSON.parse(content);
    expect(result).toMatchObject({ app: "pip", ingestion: "pip data-management POST /publication", rejected: {} });
    expect(Object.keys(result.publications)).toEqual(["json", "excel", "flat"]);
    expect(result.records).toEqual({ "manage-user-audit": { id: "a1" } });
    expect(result.users).toEqual({ media: "pip-media-oid", admin: "pip-admin-oid" });
    expect(mocks.seedRecords).toHaveBeenCalledWith(expect.objectContaining({ deployed: false }), USERS, result.publications, { run: null, owners: undefined });
  });

  it("should seed a deployed pip as a run of its own: its own admin, locations and names, and records owned by the signed-in accounts", async () => {
    // Arrange
    const run = { token: "uib3f9a2c", startedAt: "2026-11-06T10:00:00Z", locationIdBase: 10_000_000 };
    process.argv = ["node", "seed.ts", "--env", "test"];
    mocks.startRun.mockResolvedValue(run);
    mocks.loadEnvironment.mockResolvedValue({
      name: "test",
      pip: {
        storage: {},
        dataManagementUrl: DATA,
        accountManagementUrl: ACCOUNT,
        api: {
          keyVault: "kv",
          tenantId: "t",
          dataManagement: { clientId: "c", clientSecret: "s", scope: "d" },
          accountManagement: { clientId: "c", clientSecret: "s", scope: "a" }
        }
      },
      secret: async (_config: unknown, name: string) => `secret-${name}`
    });
    mocks.files.set(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "../output/seed/pip-sign-in-test.json"),
      JSON.stringify({
        users: { media: { account: "VERIFIED/PI_AAD", email: "real@example.com", role: "VERIFIED", cookies: {} } },
        unavailable: { admin: "no SYSTEM_ADMIN/SSO test account configured" }
      })
    );
    const realMedia = { userId: "real-media", email: "REAL@example.com", roles: "VERIFIED", userProvenance: "PI_AAD" };
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.startsWith("https://login.microsoftonline.com/")) return Response.json({ access_token: "tok" });
      if (url === `${ACCOUNT}/account/system-admin`) return Response.json({ userId: "run-admin" });
      if (url.startsWith(`${ACCOUNT}/account/all?`)) return Response.json({ content: [{ ...realMedia, userProvenance: "SSO" }, realMedia] });
      return pip(url, init);
    });

    // Act
    await import("./seed.js");

    // Assert
    const [admin] = requests(`${ACCOUNT}/account/system-admin`);
    expect(JSON.parse(admin.body as string)).toMatchObject({ email: "uib3f9a2c.system-admin@example.com" });
    expect(admin.headers).toEqual({ authorization: "Bearer tok", "content-type": "application/json" });
    const [locations] = requests(`${DATA}/locations/upload`);
    const [, row] = (await ((locations.body as FormData).get("locationList") as File).text()).split("\n");
    expect(row.startsWith('10000009,"uib3f9a2c Court ""Nine"", Annex",uib3f9a2c Llys Naw,')).toBe(true);
    expect(row).toContain("MANUAL_UPLOAD,10000009,Venue");
    expect(requests(`${ACCOUNT}/account/add/pi`)).toHaveLength(0);
    expect(requests(`${DATA}/publication/search/config`)[0].headers).toMatchObject({ "x-requester-id": "run-admin" });
    expect(requests(`${DATA}/publication`)[0].headers).toMatchObject({ "x-court-id": "10000009", "x-requester-id": "run-admin", authorization: "Bearer tok" });
    const owners = { media: realMedia };
    expect(mocks.seedRecords).toHaveBeenCalledWith(expect.objectContaining({ requesterId: "run-admin" }), USERS, expect.any(Object), { run, owners });
    const result = JSON.parse(mocks.writeFile.mock.calls[0][1]);
    expect(result).toMatchObject({ runToken: "uib3f9a2c", environment: "test", locations: { 9: 10_000_009 }, users: { media: "real-media" } });
    expect(result.publications.json.locationId).toBe(10_000_009);
  });

  it("should need a deployed pip signed in to first", async () => {
    // Arrange
    process.argv = ["node", "seed.ts", "--env", "test"];
    mocks.startRun.mockResolvedValue({ token: "uib3f9a2c", startedAt: "", locationIdBase: 10_000_000 });
    mocks.loadEnvironment.mockResolvedValue({
      name: "test",
      pip: { storage: {}, api: { keyVault: "kv", tenantId: "t", dataManagement: {}, accountManagement: {} } },
      secret: async () => "x"
    });
    fetchMock.mockImplementation(async () => Response.json({ access_token: "tok" }));

    // Act
    const result = import("./seed.js");

    // Assert
    await expect(result).rejects.toThrow("no pip-sign-in-test.json: sign in to pip first");
  });

  it("should skip users pip already has and treat an existing search config as done", async () => {
    // Arrange
    existingUsers = new Set(["media-oid", "admin-oid"]);
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
      url === `${DATA}/publication/search/config` ? new Response("", { status: 409 }) : pip(url, init)
    );

    // Act
    await import("./seed.js");

    // Assert
    expect(requests(`${ACCOUNT}/account/add/pi`)).toHaveLength(0);
    expect(requests(`${ACCOUNT}/account/system-admin`)).toHaveLength(0);
    expect(console.log).toHaveBeenCalledWith("ensured list search config (0 new)");
  });

  it("should record a publication pip rejects", async () => {
    // Arrange
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
      url === `${DATA}/publication/non-strategic` ? new Response("bad spreadsheet", { status: 400 }) : pip(url, init)
    );

    // Act
    await import("./seed.js");

    // Assert
    const result = JSON.parse(mocks.writeFile.mock.calls[0][1]);
    expect(result.rejected).toEqual({ excel: "400 bad spreadsheet" });
    expect(console.log).toHaveBeenCalledWith("REJECTED excel: 400");
  });

  it("should fail when pip rejects the locations", async () => {
    // Arrange
    fetchMock.mockResolvedValue(new Response("bad csv", { status: 400 }));

    // Act
    const result = import("./seed.js");

    // Assert
    await expect(result).rejects.toThrow("pip rejected locations: 400 bad csv");
  });

  it("should fail when pip refuses a user", async () => {
    // Arrange
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
      url === `${ACCOUNT}/account/add/pi` ? new Response('{"ERRORED_ACCOUNTS":[{"x":1}]}') : pip(url, init)
    );

    // Act
    const result = import("./seed.js");

    // Assert
    await expect(result).rejects.toThrow("pip refused user media: 200");
  });

  it("should fail when pip refuses a search config for another reason", async () => {
    // Arrange
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
      url === `${DATA}/publication/search/config` ? new Response("broken", { status: 500 }) : pip(url, init)
    );

    // Act
    const result = import("./seed.js");

    // Assert
    await expect(result).rejects.toThrow("pip refused search config for JSON_LIST: 500 broken");
  });

  it("should fail when users.json has no system admin", async () => {
    // Arrange
    mocks.loadUsers.mockResolvedValue([USERS[0]]);

    // Act
    const result = import("./seed.js");

    // Assert
    await expect(result).rejects.toThrow("users.json has no SYSTEM_ADMIN user");
  });

  it("should fail when a user cannot be found after it was created", async () => {
    // Arrange
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === `${ACCOUNT}/account/add/pi`) return new Response("{}");
      return pip(url, init);
    });

    // Act
    const result = import("./seed.js");

    // Assert
    await expect(result).rejects.toThrow("pip has no user media after creating it: 404");
  });
});
