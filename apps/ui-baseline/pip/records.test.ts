import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ParityUser, SeedResult } from "../fixtures/manifest.js";
import { seedRecords } from "./records.js";

const ACCOUNT = "http://localhost:16969";
const DATA = "http://localhost:18090";
const MEDIA: ParityUser = {
  id: "verified-media",
  provenance: "PI_AAD",
  role: "VERIFIED",
  provenanceUserId: "media-oid",
  email: "media@example.com",
  forenames: "M",
  surname: "Edia"
};
const ADMIN: ParityUser = { ...MEDIA, id: "system-admin", provenance: "SSO", role: "SYSTEM_ADMIN", provenanceUserId: "admin-oid", email: "admin@example.com" };
const PUBLICATIONS = { "civil-and-family-daily-cause-list": { artefactId: "a1", locationId: 9 } } as unknown as SeedResult["publications"];
const PIP_MEDIA = { userId: "pip-media", email: "media@example.com", roles: "VERIFIED", userProvenance: "PI_AAD" };
const PIP_ADMIN = { userId: "pip-admin", email: "admin@example.com", roles: "SYSTEM_ADMIN", userProvenance: "SSO" };

// pip's state, which the fake account- and data-management answer from and the POSTs add to
interface PipState {
  subscriptions: { subscriptionId: string; locationId: number }[];
  applications: { id: string; email: string; image: string }[];
  legacyUser: boolean;
  thirdParties: { userId: string; name: string }[];
  audits: { id: string; details: string; timestamp: string }[];
}

describe("seedRecords", () => {
  const fetchMock = vi.fn();
  let state: PipState;

  const posts = (url: string) =>
    fetchMock.mock.calls.filter(([called, init]) => called === url && init?.method === "POST").map(([, init]) => init as RequestInit);

  function pip(url: string, init?: RequestInit): Response {
    const method = init?.method ?? "GET";
    const key = `${method} ${url}`;
    const answers: Record<string, () => unknown> = {
      [`GET ${ACCOUNT}/account/provenance/PI_AAD/media-oid`]: () => PIP_MEDIA,
      [`GET ${ACCOUNT}/account/provenance/SSO/admin-oid`]: () => PIP_ADMIN,
      [`GET ${ACCOUNT}/subscription/user/pip-media`]: () => ({ locationSubscriptions: state.subscriptions }),
      [`GET ${DATA}/locations/9`]: () => ({ name: "Court Nine" }),
      [`POST ${ACCOUNT}/subscription`]: () => {
        state.subscriptions.push({ subscriptionId: "sub-new", locationId: 9 });
        return "created";
      },
      [`GET ${ACCOUNT}/application`]: () => state.applications,
      [`POST ${ACCOUNT}/application`]: () => ({ id: "app-new", email: "parity.applicant@example.com", image: "img-new" }),
      [`POST ${ACCOUNT}/account/add/pi`]: () => {
        state.legacyUser = true;
        return { CREATED_ACCOUNTS: [] };
      },
      [`GET ${ACCOUNT}/third-party`]: () => state.thirdParties,
      [`POST ${ACCOUNT}/third-party`]: () => {
        state.thirdParties.push({ userId: "tp-new", name: "Parity Third Party Subscriber" });
        return "created";
      },
      [`GET ${ACCOUNT}/audit?pageSize=500`]: () => ({ content: state.audits }),
      [`POST ${ACCOUNT}/audit`]: () => ({ id: "audit-new", details: "Parity audit entry", timestamp: "2026-01-01T00:00:00" })
    };
    if (key === `GET ${ACCOUNT}/account/provenance/THIRD_PARTY/parity-legacy-third-party`)
      return state.legacyUser ? Response.json({ userId: "legacy-1" }) : new Response("", { status: 404 });
    const answer = answers[key];
    if (!answer) return new Response(`no fake for ${key}`, { status: 500 });
    const body = answer();
    return new Response(typeof body === "string" ? body : JSON.stringify(body));
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => pip(url, init));
    state = { subscriptions: [], applications: [], legacyUser: false, thirdParties: [], audits: [] };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should create every record pip does not have yet and read back its id", async () => {
    // Act
    const result = await seedRecords([MEDIA, ADMIN], PUBLICATIONS);

    // Assert
    expect(result).toEqual({
      "location-subscription": { subscriptionId: "sub-new", locationId: "9" },
      "pending-application": { applicantId: "app-new", imageId: "img-new" },
      "legacy-third-party": { userId: "legacy-1" },
      "third-party-subscriber": { userId: "tp-new" },
      "manage-user-audit": { id: "audit-new", timestamp: "2026-01-01T00:00:00" }
    });
    const [subscription] = posts(`${ACCOUNT}/subscription`);
    expect(JSON.parse(subscription.body as string)).toEqual({
      channel: "EMAIL",
      searchType: "LOCATION_ID",
      searchValue: "9",
      locationName: "Court Nine",
      listType: null,
      userId: "pip-media"
    });
    const [application] = posts(`${ACCOUNT}/application`);
    const form = application.body as FormData;
    expect(form.get("fullName")).toBe("Parity Applicant");
    expect(form.get("status")).toBe("PENDING");
    expect((form.get("file") as File).name).toBe("id.png");
    expect(application.headers).toEqual({ "x-requester-id": "00000000-0000-4000-8000-000000000001" });
    const [legacy] = posts(`${ACCOUNT}/account/add/pi`);
    expect(JSON.parse(legacy.body as string)).toEqual([
      {
        email: "",
        forenames: "Parity",
        surname: "ThirdParty",
        userProvenance: "THIRD_PARTY",
        provenanceUserId: "parity-legacy-third-party",
        roles: "GENERAL_THIRD_PARTY"
      }
    ]);
    const [audit] = posts(`${ACCOUNT}/audit`);
    expect(JSON.parse(audit.body as string)).toEqual({
      userId: "pip-admin",
      userEmail: "admin@example.com",
      roles: "SYSTEM_ADMIN",
      userProvenance: "SSO",
      action: "MANAGE_USER",
      details: "Parity audit entry"
    });
  });

  it("should reuse the records pip already has", async () => {
    // Arrange
    state.subscriptions.push({ subscriptionId: "sub-1", locationId: 9 });
    state.applications.push({ id: "app-1", email: "parity.applicant@example.com", image: "img-1" });
    state.legacyUser = true;
    state.thirdParties.push({ userId: "tp-1", name: "Parity Third Party Subscriber" });
    state.audits.push({ id: "audit-1", details: "Parity audit entry", timestamp: "t1" });

    // Act
    const result = await seedRecords([MEDIA, ADMIN], PUBLICATIONS);

    // Assert
    expect(result["location-subscription"].subscriptionId).toBe("sub-1");
    expect(result["pending-application"]).toEqual({ applicantId: "app-1", imageId: "img-1" });
    expect(result["third-party-subscriber"].userId).toBe("tp-1");
    expect(result["manage-user-audit"]).toEqual({ id: "audit-1", timestamp: "t1" });
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("should fail when records.json names a user that is not a fixture user", async () => {
    // Act
    const result = seedRecords([ADMIN], PUBLICATIONS);

    // Assert
    await expect(result).rejects.toThrow("records.json references unknown verified-media");
  });

  it("should fail when a subscription's publication was not seeded", async () => {
    // Act
    const result = seedRecords([MEDIA, ADMIN], {});

    // Assert
    await expect(result).rejects.toThrow("records.json references unknown civil-and-family-daily-cause-list");
  });

  it("should report the request when pip refuses it", async () => {
    // Arrange
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
      url.endsWith("/application") ? new Response("server error", { status: 500 }) : pip(url, init)
    );

    // Act
    const result = seedRecords([MEDIA, ADMIN], PUBLICATIONS);

    // Assert
    await expect(result).rejects.toThrow("pip GET /application failed: 500 server error");
  });

  it("should treat errored accounts in an OK response as a failure", async () => {
    // Arrange
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
      url.endsWith("/account/add/pi") ? new Response('{"ERRORED_ACCOUNTS":[{"reason":"x"}]}') : pip(url, init)
    );

    // Act
    const result = seedRecords([MEDIA, ADMIN], PUBLICATIONS);

    // Assert
    await expect(result).rejects.toThrow("pip POST /account/add/pi failed: 200");
  });
});
