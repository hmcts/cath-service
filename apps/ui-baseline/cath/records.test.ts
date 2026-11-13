import { prisma } from "@hmcts/postgres-prisma";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BlobContainer } from "../core/index.js";
import { loadManifest } from "../fixtures/manifest.js";
import { type CathUser, prismaRecordStore, type RecordStore, seedRecords, testSupportRecordStore } from "./records.js";

vi.mock("@hmcts/postgres-prisma", () => {
  const model = () => ({
    upsert: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn()
  });
  return {
    prisma: {
      subscription: model(),
      mediaApplication: model(),
      legacyThirdPartyUser: model(),
      thirdPartyUser: model(),
      thirdPartySecret: model(),
      auditLog: model(),
      artefact: model(),
      user: model(),
      listSearchConfig: model(),
      artefactSearch: model()
    }
  };
});

vi.mock("@hmcts/azure-blob", () => ({ CONTAINER: { FILES: "files" }, uploadBlob: vi.fn() }));
vi.mock("@hmcts/publication", () => ({ extractAndStoreArtefactSearch: vi.fn() }));

const { uploadBlob } = await import("@hmcts/azure-blob");
const { extractAndStoreArtefactSearch } = await import("@hmcts/publication");

const ADMIN: CathUser = { userId: "admin-id", email: "admin@example.com", role: "SYSTEM_ADMIN", provenance: "SSO" };
const MEDIA: CathUser = { userId: "media-id", email: "media@example.com", role: "VERIFIED", provenance: "PI_AAD" };

const RUN = "uicsm9x2kababcd";

describe("seedRecords", () => {
  function fakeStore(): RecordStore {
    return {
      ensureSubscription: vi.fn().mockResolvedValue("sub-1"),
      ensureMediaApplication: vi.fn().mockResolvedValue("app-1"),
      ensureLegacyThirdPartyUser: vi.fn().mockResolvedValue("legacy-1"),
      ensureThirdPartySubscriber: vi.fn().mockResolvedValue("tp-1"),
      ensureAuditEntry: vi.fn().mockResolvedValue({ id: "audit-1", timestamp: "2026-01-01T00:00:00.000Z" }),
      createPublication: vi.fn(),
      removeMediaApplication: vi.fn(),
      ensureUser: vi.fn(),
      removeLegacyThirdPartyUsers: vi.fn(),
      removeThirdPartySubscribers: vi.fn(),
      replaceListSearchConfig: vi.fn(),
      indexPublicationCases: vi.fn(),
      restorePublicationCases: vi.fn()
    };
  }

  it("should ensure every record in records.json for the signed-in users", async () => {
    // Arrange
    const store = fakeStore();

    // Act
    const result = await seedRecords(store, { "verified-media": MEDIA, "system-admin": ADMIN });

    // Assert
    expect(store.ensureSubscription).toHaveBeenCalledWith("media-id", "LOCATION_ID", expect.any(String));
    expect(store.ensureMediaApplication).toHaveBeenCalledWith(
      { name: "Parity Applicant", email: "parity.applicant@example.com", employer: "Parity News" },
      { data: expect.any(Buffer), extension: ".png", blobName: "ui-baseline-pending-application.png" }
    );
    expect(store.ensureLegacyThirdPartyUser).toHaveBeenCalledWith("parity-legacy-third-party");
    expect(store.ensureThirdPartySubscriber).toHaveBeenCalledWith("Parity Third Party Subscriber");
    expect(store.ensureAuditEntry).toHaveBeenCalledWith(ADMIN, "MANAGE_USER", "Parity audit entry");
    expect(result).toEqual({
      "location-subscription": { subscriptionId: "sub-1", locationId: vi.mocked(store.ensureSubscription).mock.calls[0][2] },
      "pending-application": { applicantId: "app-1" },
      "legacy-third-party": { userId: "legacy-1" },
      "third-party-subscriber": { userId: "tp-1" },
      "manage-user-audit": { id: "audit-1", timestamp: "2026-01-01T00:00:00.000Z" }
    });
  });

  it("should name what a run seeds with its token, so the run can find and remove it", async () => {
    // Arrange
    const store = fakeStore();

    // Act
    await seedRecords(store, { "verified-media": MEDIA, "system-admin": ADMIN }, { token: RUN, locations: {} });

    // Assert
    expect(store.ensureMediaApplication).toHaveBeenCalledWith(
      { name: `${RUN} Parity Applicant`, email: `${RUN}.parity.applicant@example.com`, employer: "Parity News" },
      expect.anything()
    );
    expect(store.ensureLegacyThirdPartyUser).toHaveBeenCalledWith(`${RUN} parity-legacy-third-party`);
    expect(store.ensureThirdPartySubscriber).toHaveBeenCalledWith(`${RUN} Parity Third Party Subscriber`);
    // test-support cannot delete an audit entry, so each run reuses the one
    expect(store.ensureAuditEntry).toHaveBeenCalledWith(ADMIN, "MANAGE_USER", "Parity audit entry");
  });

  it("should subscribe to the run's copy of the court when the run seeded courts of its own", async () => {
    // Arrange
    const store = fakeStore();
    const court = (await loadManifest()).publications.find((p) => p.id === "civil-and-family-daily-cause-list")?.locationId;

    // Act
    const result = await seedRecords(store, { "verified-media": MEDIA }, { token: RUN, locations: { [String(court)]: 90001 } });

    // Assert
    expect(store.ensureSubscription).toHaveBeenCalledWith("media-id", "LOCATION_ID", "90001");
    expect(result["location-subscription"]).toEqual({ subscriptionId: "sub-1", locationId: "90001" });
  });

  it("should subscribe to no court when the run seeded none for the subscription's list, rather than to the real court", async () => {
    // Arrange
    const store = fakeStore();

    // Act
    const result = await seedRecords(store, { "verified-media": MEDIA }, { token: RUN, locations: {} });

    // Assert
    expect(store.ensureSubscription).not.toHaveBeenCalled();
    expect(result["location-subscription"]).toBeUndefined();
  });

  it("should skip the records of users who could not be signed in", async () => {
    // Arrange
    const store = fakeStore();

    // Act
    const result = await seedRecords(store, {});

    // Assert
    expect(store.ensureSubscription).not.toHaveBeenCalled();
    expect(store.ensureAuditEntry).not.toHaveBeenCalled();
    expect(Object.keys(result).sort()).toEqual(["legacy-third-party", "pending-application", "third-party-subscriber"]);
  });
});

describe("prismaRecordStore", () => {
  let store: RecordStore;

  beforeEach(async () => {
    vi.clearAllMocks();
    store = await prismaRecordStore();
  });

  it("should upsert a subscription on its unique key when ensuring one", async () => {
    // Arrange
    vi.mocked(prisma.subscription.upsert).mockResolvedValue({ subscriptionId: "s1" } as never);

    // Act
    const id = await store.ensureSubscription("u1", "LOCATION_ID", "9");

    // Assert
    expect(id).toBe("s1");
    expect(prisma.subscription.upsert).toHaveBeenCalledWith({
      where: { unique_user_subscription: { userId: "u1", searchType: "LOCATION_ID", searchValue: "9" } },
      update: {},
      create: { userId: "u1", searchType: "LOCATION_ID", searchValue: "9" }
    });
  });

  it("should create a media application and upload its proof of ID when there is none", async () => {
    // Arrange
    vi.mocked(prisma.mediaApplication.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.mediaApplication.create).mockResolvedValue({ id: "m1", proofOfIdPath: null } as never);
    const application = { name: "A", email: "a@example.com", employer: "E" };
    const data = Buffer.from("png");

    // Act
    const id = await store.ensureMediaApplication(application, { data, extension: ".png", blobName: "unused-locally.png" });

    // Assert
    expect(id).toBe("m1");
    expect(prisma.mediaApplication.create).toHaveBeenCalledWith({ data: { ...application, status: "PENDING" } });
    expect(uploadBlob).toHaveBeenCalledWith("m1.png", data, "image/png", "files");
    expect(prisma.mediaApplication.update).toHaveBeenCalledWith({ where: { id: "m1" }, data: { proofOfIdPath: "m1.png", proofOfIdOriginalName: "id.png" } });
  });

  it("should reuse a media application that already has its proof of ID", async () => {
    // Arrange
    vi.mocked(prisma.mediaApplication.findFirst).mockResolvedValue({ id: "m1", proofOfIdPath: "m1.png" } as never);

    // Act
    const id = await store.ensureMediaApplication(
      { name: "A", email: "a@example.com", employer: "E" },
      { data: Buffer.from(""), extension: ".png", blobName: "unused-locally.png" }
    );

    // Assert
    expect(id).toBe("m1");
    expect(prisma.mediaApplication.findFirst).toHaveBeenCalledWith({ where: { email: "a@example.com" } });
    expect(prisma.mediaApplication.create).not.toHaveBeenCalled();
    expect(uploadBlob).not.toHaveBeenCalled();
  });

  it.each([
    ["ensureLegacyThirdPartyUser", "legacyThirdPartyUser"],
    ["ensureThirdPartySubscriber", "thirdPartyUser"]
  ] as const)("should match %s on its name before creating one", async (method, model) => {
    // Arrange
    vi.mocked(prisma[model].findFirst)
      .mockResolvedValueOnce({ id: "found" } as never)
      .mockResolvedValueOnce(null);
    vi.mocked(prisma[model].create).mockResolvedValue({ id: "created" } as never);

    // Act
    const existing = await store[method]("Parity");
    const created = await store[method]("Parity");

    // Assert
    expect(existing).toBe("found");
    expect(created).toBe("created");
    expect(prisma[model].findFirst).toHaveBeenCalledWith({ where: { name: "Parity" } });
    expect(prisma[model].create).toHaveBeenCalledTimes(1);
    expect(prisma[model].create).toHaveBeenCalledWith({ data: { name: "Parity" } });
  });

  it("should create an audit entry as the user when none matches its action and details", async () => {
    // Arrange
    vi.mocked(prisma.auditLog.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({ id: "a1", timestamp: new Date("2026-01-02T03:04:05Z") } as never);

    // Act
    const entry = await store.ensureAuditEntry(ADMIN, "MANAGE_USER", "details");

    // Assert
    expect(entry).toEqual({ id: "a1", timestamp: "2026-01-02T03:04:05.000Z" });
    expect(prisma.auditLog.findFirst).toHaveBeenCalledWith({ where: { action: "MANAGE_USER", details: "details", userId: "admin-id" } });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: { action: "MANAGE_USER", details: "details", userId: "admin-id", userEmail: "admin@example.com", userRole: "SYSTEM_ADMIN", userProvenance: "SSO" }
    });
  });

  it("should create a public list publication with its dates parsed", async () => {
    // Arrange
    vi.mocked(prisma.artefact.create).mockResolvedValue({ artefactId: "art-1" } as never);
    const publication = { locationId: "9", listTypeId: 3, contentDate: "2026-01-01", displayFrom: "2026-01-01T00:00:00Z", displayTo: "2026-02-01T00:00:00Z" };

    // Act
    const id = await store.createPublication(publication);

    // Assert
    expect(id).toBe("art-1");
    expect(prisma.artefact.create).toHaveBeenCalledWith({
      data: {
        locationId: "9",
        listTypeId: 3,
        contentDate: new Date("2026-01-01"),
        displayFrom: new Date("2026-01-01T00:00:00Z"),
        displayTo: new Date("2026-02-01T00:00:00Z"),
        type: "LIST",
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        isFlatFile: false,
        provenance: "MANUAL_UPLOAD"
      }
    });
  });

  it("should delete a media application and legacy third-party users by their keys", async () => {
    // Act
    await store.removeMediaApplication("m1");
    await store.removeLegacyThirdPartyUsers("Parity");

    // Assert
    expect(prisma.mediaApplication.deleteMany).toHaveBeenCalledWith({ where: { id: "m1" } });
    expect(prisma.legacyThirdPartyUser.deleteMany).toHaveBeenCalledWith({ where: { name: "Parity" } });
  });

  it("should upsert a user on its provenance id", async () => {
    // Arrange
    vi.mocked(prisma.user.upsert).mockResolvedValue({ userId: "u1" } as never);
    const user = { email: "e", firstName: "f", surname: "s", userProvenance: "SSO", userProvenanceId: "p1", role: "VERIFIED" };

    // Act
    const id = await store.ensureUser(user);

    // Assert
    expect(id).toBe("u1");
    expect(prisma.user.upsert).toHaveBeenCalledWith({ where: { userProvenanceId: "p1" }, update: {}, create: user });
  });

  it("should remove each third-party subscriber with its OAuth secrets", async () => {
    // Arrange
    vi.mocked(prisma.thirdPartyUser.findMany).mockResolvedValue([{ id: "t1" }, { id: "t2" }] as never);

    // Act
    await store.removeThirdPartySubscribers("Parity");

    // Assert
    expect(prisma.thirdPartyUser.findMany).toHaveBeenCalledWith({ where: { name: "Parity" }, select: { id: true } });
    expect(prisma.thirdPartySecret.deleteMany).toHaveBeenCalledWith({ where: { name: { startsWith: "third-party-t1-" } } });
    expect(prisma.thirdPartySecret.deleteMany).toHaveBeenCalledWith({ where: { name: { startsWith: "third-party-t2-" } } });
    expect(prisma.thirdPartyUser.delete).toHaveBeenCalledWith({ where: { id: "t1" } });
    expect(prisma.thirdPartyUser.delete).toHaveBeenCalledWith({ where: { id: "t2" } });
  });

  describe("replaceListSearchConfig", () => {
    const config = { caseNumberFieldName: "caseNumber", caseNameFieldName: "caseName" };

    it("should upsert the config and return what was there before when given one", async () => {
      // Arrange
      vi.mocked(prisma.listSearchConfig.findUnique).mockResolvedValue({
        listTypeId: 3,
        caseNumberFieldName: "old",
        caseNameFieldName: "older",
        id: 1
      } as never);

      // Act
      const previous = await store.replaceListSearchConfig(3, config);

      // Assert
      expect(previous).toEqual({ caseNumberFieldName: "old", caseNameFieldName: "older" });
      expect(prisma.listSearchConfig.upsert).toHaveBeenCalledWith({ where: { listTypeId: 3 }, update: config, create: { listTypeId: 3, ...config } });
      expect(prisma.listSearchConfig.delete).not.toHaveBeenCalled();
    });

    it("should delete the existing config when given null", async () => {
      // Arrange
      vi.mocked(prisma.listSearchConfig.findUnique).mockResolvedValue({ caseNumberFieldName: "a", caseNameFieldName: "b" } as never);

      // Act
      await store.replaceListSearchConfig(3, null);

      // Assert
      expect(prisma.listSearchConfig.delete).toHaveBeenCalledWith({ where: { listTypeId: 3 } });
      expect(prisma.listSearchConfig.upsert).not.toHaveBeenCalled();
    });

    it("should do nothing and return null when there is no config to remove", async () => {
      // Arrange
      vi.mocked(prisma.listSearchConfig.findUnique).mockResolvedValue(null);

      // Act
      const previous = await store.replaceListSearchConfig(3, null);

      // Assert
      expect(previous).toBeNull();
      expect(prisma.listSearchConfig.delete).not.toHaveBeenCalled();
    });
  });

  it("should index a publication's cases with CaTH's ingestion and return the previous index", async () => {
    // Arrange
    vi.mocked(prisma.artefact.findUniqueOrThrow).mockResolvedValue({ listTypeId: 7 } as never);
    const previous = [{ caseNumber: "1", caseName: "A" }];
    vi.mocked(prisma.artefactSearch.findMany).mockResolvedValue(previous as never);
    const payload = { cases: [] };

    // Act
    const result = await store.indexPublicationCases("art-1", payload);

    // Assert
    expect(result).toEqual(previous);
    expect(prisma.artefact.findUniqueOrThrow).toHaveBeenCalledWith({ where: { artefactId: "art-1" }, select: { listTypeId: true } });
    expect(extractAndStoreArtefactSearch).toHaveBeenCalledWith("art-1", 7, payload);
  });

  it("should replace a publication's case index when restoring it", async () => {
    // Act
    await store.restorePublicationCases("art-1", [{ caseNumber: "1", caseName: null }]);

    // Assert
    expect(prisma.artefactSearch.deleteMany).toHaveBeenCalledWith({ where: { artefactId: "art-1" } });
    expect(prisma.artefactSearch.createMany).toHaveBeenCalledWith({ data: [{ artefactId: "art-1", caseNumber: "1", caseName: null }] });
  });
});

describe("testSupportRecordStore", () => {
  const API = "http://api";
  const fetchMock = vi.fn();
  const files = { upload: vi.fn() } as unknown as BlobContainer;
  let store: RecordStore;

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const call = (index: number) => {
    const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit | undefined];
    return { url, method: init?.method, body: init?.body ? JSON.parse(init.body as string) : undefined };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    store = testSupportRecordStore(API, files);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should return an existing subscription without creating one", async () => {
    // Arrange
    fetchMock.mockResolvedValueOnce(json([{ subscriptionId: "s1" }]));

    // Act
    const id = await store.ensureSubscription("u1", "LOCATION_ID", "9");

    // Assert
    expect(id).toBe("s1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(call(0)).toEqual({ url: `${API}/test-support/subscriptions?userId=u1&searchType=LOCATION_ID&searchValue=9`, method: "GET", body: undefined });
  });

  it("should create a subscription when none matches", async () => {
    // Arrange
    fetchMock.mockResolvedValueOnce(json([])).mockResolvedValueOnce(json({ subscriptionId: "s2" }));

    // Act
    const id = await store.ensureSubscription("u1", "LOCATION_ID", "9");

    // Assert
    expect(id).toBe("s2");
    expect(call(1)).toEqual({
      url: `${API}/test-support/subscriptions`,
      method: "POST",
      body: { userId: "u1", searchType: "LOCATION_ID", searchValue: "9" }
    });
  });

  it("should report the method, endpoint, status and body when test-support refuses", async () => {
    // Arrange
    fetchMock.mockResolvedValueOnce(new Response("boom", { status: 500 }));

    // Act
    const result = store.ensureLegacyThirdPartyUser("Parity");

    // Assert
    await expect(result).rejects.toThrow("GET /test-support/legacy-third-party-users?name=Parity failed: 500 boom");
  });

  describe("ensureMediaApplication", () => {
    const application = { name: "A", email: "a.b@example.com", employer: "E" };
    const image = { data: Buffer.from("png"), extension: ".png", blobName: "ui-baseline-pending-application.png" };

    it("should upload the proof of ID then create the application when test-support has none", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce(new Response("not found", { status: 404 })).mockResolvedValueOnce(json({ id: "m1" }));

      // Act
      const id = await store.ensureMediaApplication(application, image);

      // Assert
      expect(id).toBe("m1");
      expect(call(0).url).toBe(`${API}/test-support/media-applications?email=a.b%40example.com`);
      expect(files.upload).toHaveBeenCalledWith("ui-baseline-pending-application.png", image.data, "image/png");
      expect(call(1)).toEqual({
        url: `${API}/test-support/media-applications`,
        method: "POST",
        body: { ...application, status: "PENDING", proofOfIdPath: "ui-baseline-pending-application.png" }
      });
    });

    it("should reuse an application that already has its proof of ID", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce(json({ id: "m1", proofOfIdPath: "x.png" }));

      // Act
      const id = await store.ensureMediaApplication(application, image);

      // Assert
      expect(id).toBe("m1");
      expect(files.upload).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("should make an existing application without its proof of ID again with it, as test-support only takes one at creation", async () => {
      // Arrange
      fetchMock
        .mockResolvedValueOnce(json({ id: "m1", proofOfIdPath: null }))
        .mockResolvedValueOnce(new Response(null, { status: 204 }))
        .mockResolvedValueOnce(json({ id: "m2" }));

      // Act
      const id = await store.ensureMediaApplication(application, image);

      // Assert
      expect(id).toBe("m2");
      expect(call(1)).toMatchObject({ url: `${API}/test-support/media-applications/m1`, method: "DELETE" });
      expect(files.upload).toHaveBeenCalledWith("ui-baseline-pending-application.png", image.data, "image/png");
      expect(call(2)).toEqual({
        url: `${API}/test-support/media-applications`,
        method: "POST",
        body: { ...application, status: "PENDING", proofOfIdPath: "ui-baseline-pending-application.png" }
      });
    });

    it("should rethrow a failure other than 404", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce(new Response("down", { status: 503 }));

      // Act
      const result = store.ensureMediaApplication(application, image);

      // Assert
      await expect(result).rejects.toThrow("failed: 503 down");
      expect(files.upload).not.toHaveBeenCalled();
    });
  });

  it("should match a legacy third-party user by name before creating one", async () => {
    // Arrange
    fetchMock
      .mockResolvedValueOnce(json([{ id: "l1" }]))
      .mockResolvedValueOnce(json([]))
      .mockResolvedValueOnce(json({ id: "l2" }));

    // Act
    const existing = await store.ensureLegacyThirdPartyUser("Parity");
    const created = await store.ensureLegacyThirdPartyUser("Parity");

    // Assert
    expect(existing).toBe("l1");
    expect(created).toBe("l2");
    expect(call(2)).toEqual({ url: `${API}/test-support/legacy-third-party-users`, method: "POST", body: { name: "Parity" } });
  });

  it("should match a third-party subscriber by name before creating one", async () => {
    // Arrange
    fetchMock
      .mockResolvedValueOnce(json([{ id: "t1", name: "Parity" }]))
      .mockResolvedValueOnce(json([{ id: "t9", name: "Other" }]))
      .mockResolvedValueOnce(json({ id: "t2" }));

    // Act
    const existing = await store.ensureThirdPartySubscriber("Parity");
    const created = await store.ensureThirdPartySubscriber("Parity");

    // Assert
    expect(existing).toBe("t1");
    expect(created).toBe("t2");
    expect(call(2)).toEqual({ url: `${API}/test-support/third-party-users`, method: "POST", body: { name: "Parity" } });
  });

  it("should return an existing audit entry or create one as the user, with an ISO timestamp", async () => {
    // Arrange
    fetchMock
      .mockResolvedValueOnce(json([{ id: "a1", timestamp: "2026-01-02T03:04:05Z", userId: "admin-id" }]))
      .mockResolvedValueOnce(json([]))
      .mockResolvedValueOnce(json({ id: "a2", timestamp: "2026-01-03T00:00:00Z" }));

    // Act
    const existing = await store.ensureAuditEntry(ADMIN, "MANAGE_USER", "d");
    const created = await store.ensureAuditEntry(ADMIN, "MANAGE_USER", "d");

    // Assert
    expect(existing).toEqual({ id: "a1", timestamp: "2026-01-02T03:04:05.000Z" });
    expect(created).toEqual({ id: "a2", timestamp: "2026-01-03T00:00:00.000Z" });
    // Only the user's own entry, never someone else's with the same action and details
    expect(call(0).url).toBe(`${API}/test-support/audit-logs?action=MANAGE_USER&details=d&userId=admin-id`);
    expect(call(2).body).toEqual({ userId: "admin-id", action: "MANAGE_USER", details: "d" });
  });

  it("should create a manually uploaded list publication", async () => {
    // Arrange
    fetchMock.mockResolvedValueOnce(json({ artefactId: "art-1" }));
    const publication = { locationId: "9", listTypeId: 3, contentDate: "c", displayFrom: "f", displayTo: "t" };

    // Act
    const id = await store.createPublication(publication);

    // Assert
    expect(id).toBe("art-1");
    expect(call(0)).toEqual({ url: `${API}/test-support/artefacts`, method: "POST", body: { ...publication, type: "LIST", provenance: "MANUAL_UPLOAD" } });
  });

  it("should delete a media application and fail when test-support refuses", async () => {
    // Arrange
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 })).mockResolvedValueOnce(new Response(null, { status: 404 }));

    // Act
    await store.removeMediaApplication("m1");
    const refused = store.removeMediaApplication("m2");

    // Assert
    expect(call(0)).toEqual({ url: `${API}/test-support/media-applications/m1`, method: "DELETE", body: undefined });
    await expect(refused).rejects.toThrow("DELETE /test-support/media-applications/m2 failed: 404");
  });

  describe("ensureUser", () => {
    const user = { email: "u@example.com", firstName: "f", surname: "s", userProvenance: "SSO", userProvenanceId: "p", role: "VERIFIED" };

    it("should return an existing user found by email", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce(json({ userId: "u1" }));

      // Act
      const id = await store.ensureUser(user);

      // Assert
      expect(id).toBe("u1");
      expect(call(0).url).toBe(`${API}/test-support/users?email=u%40example.com`);
    });

    it("should create the user when test-support answers 404", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce(new Response("", { status: 404 })).mockResolvedValueOnce(json({ userId: "u2" }));

      // Act
      const id = await store.ensureUser(user);

      // Assert
      expect(id).toBe("u2");
      expect(call(1)).toEqual({ url: `${API}/test-support/users`, method: "POST", body: user });
    });

    it("should rethrow a failure other than 404", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce(new Response("err", { status: 500 }));

      // Act
      const result = store.ensureUser(user);

      // Assert
      await expect(result).rejects.toThrow("GET /test-support/users?email=u%40example.com failed: 500 err");
    });
  });

  it("should delete the legacy third-party users found by name, and nothing when there are none", async () => {
    // Arrange
    fetchMock
      .mockResolvedValueOnce(json([{ id: "l1" }, { id: "l2" }]))
      .mockResolvedValueOnce(json({}))
      .mockResolvedValueOnce(json([]));

    // Act
    await store.removeLegacyThirdPartyUsers("Parity");
    await store.removeLegacyThirdPartyUsers("Parity");

    // Assert
    expect(call(1)).toEqual({ url: `${API}/test-support/legacy-third-party-users`, method: "DELETE", body: { ids: ["l1", "l2"] } });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("should delete each third-party subscriber with the name, tolerating ones already gone", async () => {
    // Arrange
    fetchMock
      .mockResolvedValueOnce(
        json([
          { id: "t1", name: "Parity" },
          { id: "t2", name: "Parity" },
          { id: "t3", name: "Other" }
        ])
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));

    // Act
    await store.removeThirdPartySubscribers("Parity");

    // Assert
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(call(1)).toEqual({ url: `${API}/test-support/third-party-users/t1`, method: "DELETE", body: undefined });
    expect(call(2).url).toBe(`${API}/test-support/third-party-users/t2`);
  });

  it("should fail when a third-party subscriber cannot be deleted", async () => {
    // Arrange
    fetchMock.mockResolvedValueOnce(json([{ id: "t1", name: "Parity" }])).mockResolvedValueOnce(new Response(null, { status: 500 }));

    // Act
    const result = store.removeThirdPartySubscribers("Parity");

    // Assert
    await expect(result).rejects.toThrow("DELETE /test-support/third-party-users/t1 failed: 500");
  });

  it("should say what test-support cannot do yet", async () => {
    // Act and assert
    await expect(store.replaceListSearchConfig(1, null)).rejects.toThrow("list search config: not available through test-support yet");
    await expect(store.indexPublicationCases("a", {})).rejects.toThrow("indexing an existing publication's cases: not available through test-support yet");
    await expect(store.restorePublicationCases("a", [])).rejects.toThrow("restoring a publication's case index: not available through test-support yet");
  });
});
