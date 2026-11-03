import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ParityUser, PublicationFixture } from "../fixtures/manifest.js";

const mocks = vi.hoisted(() => ({
  loadManifest: vi.fn(),
  loadUsers: vi.fn(),
  readPayload: vi.fn(),
  seedRecords: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn()
}));

vi.mock("../fixtures/manifest.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../fixtures/manifest.js")>()),
  loadManifest: mocks.loadManifest,
  loadUsers: mocks.loadUsers,
  readPayload: mocks.readPayload
}));
vi.mock("./records.js", () => ({ seedRecords: mocks.seedRecords }));
// The seed's output is the real output/seed/pip.json, so writing it is faked
vi.mock("node:fs/promises", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:fs/promises")>()),
  writeFile: mocks.writeFile,
  mkdir: mocks.mkdir
}));
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
  });

  afterEach(() => {
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
    expect(mocks.seedRecords).toHaveBeenCalledWith(USERS, result.publications);
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
