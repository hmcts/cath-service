import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendThirdPartyDeletion, sendThirdPartyPublications } from "./service.js";

const mockPushLogCreate = vi.hoisted(() => vi.fn());

vi.mock("@hmcts/location", () => ({
  getLocationWithDetails: vi.fn().mockResolvedValue({ name: "Test Court", regions: [], subJurisdictions: [] })
}));

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    thirdPartyPushLog: {
      create: mockPushLogCreate
    }
  }
}));

vi.mock("./push/headers.js", () => ({
  buildPushHeaders: vi.fn().mockReturnValue({ "x-provenance": "test" })
}));

vi.mock("./push/retry.js", () => ({
  pushWithRetry: vi.fn().mockResolvedValue({ statusCode: 200, success: true })
}));

vi.mock("./queries.js", () => ({
  findSubscribersByListType: vi.fn()
}));

const { pushWithRetry } = await import("./push/retry.js");
const { findSubscribersByListType } = await import("./queries.js");

const BASE_PARAMS = {
  artefactId: "artefact-1",
  locationId: "1",
  listTypeId: 10,
  contentDate: new Date("2024-01-01"),
  sensitivity: "PUBLIC",
  language: "ENGLISH",
  displayFrom: new Date("2024-01-01"),
  displayTo: new Date("2024-12-31"),
  provenance: "MANUAL_UPLOAD",
  isUpdate: false
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(pushWithRetry).mockResolvedValue({ statusCode: 200, success: true });
  vi.mocked(findSubscribersByListType).mockResolvedValue([{ id: "sub-1", user: { id: "user-1", name: "courtel" } }] as never);
  mockPushLogCreate.mockResolvedValue({});
  process.env.COURTEL_API_URL = "https://courtel.example.com/api";
  process.env.COURTEL_CERTIFICATE = Buffer.from("-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----").toString("base64");
});

describe("sendThirdPartyPublications", () => {
  it("returns early if COURTEL_API_URL is not set", async () => {
    delete process.env.COURTEL_API_URL;
    await sendThirdPartyPublications(BASE_PARAMS);
    expect(pushWithRetry).not.toHaveBeenCalled();
  });

  it("returns early if COURTEL_CERTIFICATE is not set", async () => {
    delete process.env.COURTEL_CERTIFICATE;
    await sendThirdPartyPublications(BASE_PARAMS);
    expect(pushWithRetry).not.toHaveBeenCalled();
  });

  it("returns early if no subscribers for the list type", async () => {
    vi.mocked(findSubscribersByListType).mockResolvedValue([]);
    await sendThirdPartyPublications(BASE_PARAMS);
    expect(pushWithRetry).not.toHaveBeenCalled();
  });

  it("pushes once to Courtel when subscribers exist", async () => {
    await sendThirdPartyPublications({ ...BASE_PARAMS, jsonData: { key: "value" } });
    expect(pushWithRetry).toHaveBeenCalledTimes(1);
    const [url, , , body] = vi.mocked(pushWithRetry).mock.calls[0];
    expect(url).toBe("https://courtel.example.com/api");
    expect(body).toBe(JSON.stringify({ key: "value" }));
  });

  it("sends null body when jsonData is not provided", async () => {
    await sendThirdPartyPublications(BASE_PARAMS);
    const [, , , body] = vi.mocked(pushWithRetry).mock.calls[0];
    expect(body).toBeNull();
  });

  it("decodes the certificate from base64", async () => {
    await sendThirdPartyPublications(BASE_PARAMS);
    const [, certPem] = vi.mocked(pushWithRetry).mock.calls[0];
    expect(certPem).toContain("BEGIN CERTIFICATE");
  });

  it("logs push type as CREATE when isUpdate is false", async () => {
    await sendThirdPartyPublications({ ...BASE_PARAMS, isUpdate: false });
    expect(mockPushLogCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: "CREATE" }) }));
  });

  it("logs push type as UPDATE when isUpdate is true", async () => {
    await sendThirdPartyPublications({ ...BASE_PARAMS, isUpdate: true });
    expect(mockPushLogCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: "UPDATE" }) }));
  });

  it("forwards pdfPath to pushWithRetry when provided", async () => {
    const pdfPath = "/tmp/publication.pdf";
    await sendThirdPartyPublications({ ...BASE_PARAMS, pdfPath });
    const [, , , , , forwardedPdfPath] = vi.mocked(pushWithRetry).mock.calls[0];
    expect(forwardedPdfPath).toBe(pdfPath);
  });

  it("forwards undefined pdfPath to pushWithRetry when not provided", async () => {
    await sendThirdPartyPublications(BASE_PARAMS);
    const [, , , , , forwardedPdfPath] = vi.mocked(pushWithRetry).mock.calls[0];
    expect(forwardedPdfPath).toBeUndefined();
  });
});

describe("sendThirdPartyDeletion", () => {
  it("returns early if COURTEL_API_URL is not set", async () => {
    delete process.env.COURTEL_API_URL;
    await sendThirdPartyDeletion(BASE_PARAMS);
    expect(pushWithRetry).not.toHaveBeenCalled();
  });

  it("returns early if no subscribers", async () => {
    vi.mocked(findSubscribersByListType).mockResolvedValue([]);
    await sendThirdPartyDeletion(BASE_PARAMS);
    expect(pushWithRetry).not.toHaveBeenCalled();
  });

  it("pushes with null body when subscribers exist", async () => {
    await sendThirdPartyDeletion(BASE_PARAMS);
    expect(pushWithRetry).toHaveBeenCalledTimes(1);
    const [, , , body] = vi.mocked(pushWithRetry).mock.calls[0];
    expect(body).toBeNull();
  });

  it("logs push type as DELETION", async () => {
    await sendThirdPartyDeletion(BASE_PARAMS);
    expect(mockPushLogCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: "DELETION" }) }));
  });
});
