import { getLocationWithDetails } from "@hmcts/location";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadFlatFile } from "../delivery/flat-file.js";
import { getAccessToken } from "../oauth/access-token.js";
import { getDestinationUrl } from "../oauth/oauth-config.js";
import { type FulfilmentArtefact, findArtefactForFulfilment, findListTypeName, findMatchingSubscriptions } from "./queries.js";
import { sendPublicationDeletionToThirdParties, sendPublicationToThirdParties } from "./service.js";

vi.mock("@hmcts/location", () => ({ getLocationWithDetails: vi.fn() }));
vi.mock("./queries.js", () => ({
  findArtefactForFulfilment: vi.fn(),
  findListTypeName: vi.fn(),
  findMatchingSubscriptions: vi.fn()
}));
vi.mock("../oauth/oauth-config.js", () => ({ getDestinationUrl: vi.fn() }));
vi.mock("../oauth/access-token.js", () => ({ getAccessToken: vi.fn() }));
vi.mock("../delivery/flat-file.js", () => ({ loadFlatFile: vi.fn() }));
vi.mock("../delivery/retry.js", () => ({
  withRetry: vi.fn(async (operation: () => Promise<void>) => {
    try {
      await operation();
      return true;
    } catch {
      return false;
    }
  })
}));

const ARTEFACT_ID = "artefact-1";
const NOW = new Date("2026-06-15T10:00:00Z");
const JSON_DATA = { courtLists: [{ name: "confidential-payload-value" }] };

const mockFetch = vi.fn();

function buildArtefact(overrides: Partial<FulfilmentArtefact> = {}): FulfilmentArtefact {
  return {
    artefactId: ARTEFACT_ID,
    locationId: "123",
    contentDate: new Date("2026-06-15T00:00:00Z"),
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    displayFrom: new Date("2026-06-14T23:30:00Z"),
    displayTo: new Date("2026-06-16T22:00:00Z"),
    isFlatFile: false,
    sourceArtefactId: null,
    listType: { name: "CIVIL_DAILY_CAUSE_LIST" },
    ...overrides
  };
}

const SUBSCRIBER_1 = { id: "user-1", name: "Courtel" };
const SUBSCRIBER_2 = { id: "user-2", name: "Snl" };

function destinationUrlFor(userId: string): string {
  return `https://${userId}.example/publication`;
}

function fetchCall(index = 0) {
  const [url, init] = mockFetch.mock.calls[index];
  return { url: url as string, init: init as RequestInit & { headers: Record<string, string> } };
}

function parseMultipart(init: RequestInit & { headers: Record<string, string> }) {
  const boundary = init.headers["Content-Type"].replace("multipart/form-data; boundary=", "");
  const raw = Buffer.from(init.body as Uint8Array).toString("utf-8");
  return raw
    .split(`--${boundary}`)
    .slice(1, -1)
    .map((section) => {
      const [headers, ...content] = section.replace(/^\r\n/, "").replace(/\r\n$/, "").split("\r\n\r\n");
      return {
        name: /name="([^"]+)"/.exec(headers)?.[1],
        fileName: /filename="([^"]+)"/.exec(headers)?.[1],
        contentType: /Content-Type: (.+)/.exec(headers)?.[1],
        content: content.join("\r\n\r\n")
      };
    });
}

function allLogs(): string {
  return JSON.stringify([...vi.mocked(console.error).mock.calls, ...vi.mocked(console.info).mock.calls, ...vi.mocked(console.warn).mock.calls]);
}

describe("third-party fulfilment service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    vi.stubGlobal("fetch", mockFetch);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});

    mockFetch.mockImplementation(async () => new Response(null, { status: 200 }));
    vi.mocked(findArtefactForFulfilment).mockResolvedValue(buildArtefact());
    vi.mocked(findListTypeName).mockResolvedValue("CIVIL_DAILY_CAUSE_LIST");
    vi.mocked(findMatchingSubscriptions).mockResolvedValue([SUBSCRIBER_1]);
    vi.mocked(getDestinationUrl).mockImplementation(async (_name, userId) => destinationUrlFor(userId));
    vi.mocked(getAccessToken).mockImplementation(async (_name, userId) => `token-for-${userId}`);
    vi.mocked(getLocationWithDetails).mockResolvedValue({
      locationId: 123,
      name: "Test Court",
      welshName: "Llys Prawf",
      regions: [],
      subJurisdictions: []
    } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("sendPublicationToThirdParties", () => {
    it.each([
      ["PUBLIC", ["PUBLIC", "PRIVATE", "CLASSIFIED"]],
      ["PRIVATE", ["PRIVATE", "CLASSIFIED"]],
      ["CLASSIFIED", ["CLASSIFIED"]]
    ])("should match %s publications against subscriptions at %j", async (sensitivity, allowed) => {
      // Arrange
      vi.mocked(findArtefactForFulfilment).mockResolvedValue(buildArtefact({ sensitivity }));

      // Act
      await sendPublicationToThirdParties({ artefactId: ARTEFACT_ID, isUpdate: false, jsonData: JSON_DATA });

      // Assert
      expect(findMatchingSubscriptions).toHaveBeenCalledWith("CIVIL_DAILY_CAUSE_LIST", allowed);
    });

    it("should match nothing for an unknown sensitivity", async () => {
      // Arrange
      vi.mocked(findArtefactForFulfilment).mockResolvedValue(buildArtefact({ sensitivity: "UNKNOWN" }));

      // Act
      await sendPublicationToThirdParties({ artefactId: ARTEFACT_ID, isUpdate: false, jsonData: JSON_DATA });

      // Assert
      expect(findMatchingSubscriptions).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it.each([
      ["displayFrom is tomorrow", { displayFrom: new Date("2026-06-16T00:00:00Z") }],
      ["displayTo was yesterday", { displayTo: new Date("2026-06-14T12:00:00Z") }]
    ])("should push nothing when %s", async (_label, overrides) => {
      // Arrange
      vi.mocked(findArtefactForFulfilment).mockResolvedValue(buildArtefact(overrides));

      // Act
      await sendPublicationToThirdParties({ artefactId: ARTEFACT_ID, isUpdate: false, jsonData: JSON_DATA });

      // Assert
      expect(findMatchingSubscriptions).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it.each([
      ["displayFrom is later today", { displayFrom: new Date("2026-06-15T20:00:00Z") }],
      ["displayTo was earlier today", { displayTo: new Date("2026-06-15T01:00:00Z") }],
      ["both display dates are null", { displayFrom: null, displayTo: null }],
      ["the stored displayFrom date is today but its London time is tomorrow", { displayFrom: new Date("2026-06-15T23:30:00Z") }]
    ])("should push when %s", async (_label, overrides) => {
      // Arrange
      vi.mocked(findArtefactForFulfilment).mockResolvedValue(buildArtefact(overrides));

      // Act
      await sendPublicationToThirdParties({ artefactId: ARTEFACT_ID, isUpdate: false, jsonData: JSON_DATA });

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should read no secrets, request no token and send nothing when no subscribers match", async () => {
      // Arrange
      vi.mocked(findMatchingSubscriptions).mockResolvedValue([]);

      // Act
      await sendPublicationToThirdParties({ artefactId: ARTEFACT_ID, isUpdate: false, jsonData: JSON_DATA });

      // Assert
      expect(getDestinationUrl).not.toHaveBeenCalled();
      expect(getAccessToken).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should POST metadata and payload parts with the bearer token for a new JSON publication", async () => {
      // Act
      await sendPublicationToThirdParties({ artefactId: ARTEFACT_ID, isUpdate: false, jsonData: JSON_DATA });

      // Assert
      const { url, init } = fetchCall();
      expect(url).toBe("https://user-1.example/publication");
      expect(init.method).toBe("POST");
      expect(init.headers.Authorization).toBe("Bearer token-for-user-1");
      expect(init.headers["Content-Type"]).toMatch(/^multipart\/form-data; boundary=/);
      const parts = parseMultipart(init);
      expect(parts.map((part) => part.name)).toEqual(["metadata", "payload"]);
      expect(parts[0].contentType).toBe("application/json");
      expect(parts[0].fileName).toBeUndefined();
      expect(JSON.parse(parts[0].content)).toEqual({
        publicationId: ARTEFACT_ID,
        listType: "CIVIL_DAILY_CAUSE_LIST",
        locationName: "Test Court",
        contentDate: [2026, 6, 15, 0, 0],
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: [2026, 6, 14, 23, 30],
        displayTo: [2026, 6, 16, 22, 0]
      });
      expect(parts[1].contentType).toBe("application/json");
      expect(JSON.parse(parts[1].content)).toEqual(JSON_DATA);
      expect(getLocationWithDetails).toHaveBeenCalledWith(123);
      expect(getDestinationUrl).toHaveBeenCalledWith("Courtel", "user-1");
      expect(getAccessToken).toHaveBeenCalledWith("Courtel", "user-1");
    });

    it.each([
      ["seconds when they are non-zero", "2026-06-15T09:30:15Z", [2026, 6, 15, 9, 30, 15]],
      ["seconds and nanoseconds when there are milliseconds", "2026-06-15T09:30:00.123Z", [2026, 6, 15, 9, 30, 0, 123000000]]
    ])("should include %s in metadata dates", async (_label, displayFrom, expected) => {
      // Arrange
      vi.mocked(findArtefactForFulfilment).mockResolvedValue(buildArtefact({ displayFrom: new Date(displayFrom) }));

      // Act
      await sendPublicationToThirdParties({ artefactId: ARTEFACT_ID, isUpdate: false, jsonData: JSON_DATA });

      // Assert
      const metadata = JSON.parse(parseMultipart(fetchCall().init)[0].content);
      expect(metadata.displayFrom).toEqual(expected);
    });

    it("should send null display dates and an empty location name when they are absent", async () => {
      // Arrange
      vi.mocked(findArtefactForFulfilment).mockResolvedValue(buildArtefact({ displayFrom: null, displayTo: null }));
      vi.mocked(getLocationWithDetails).mockResolvedValue(null);

      // Act
      await sendPublicationToThirdParties({ artefactId: ARTEFACT_ID, isUpdate: false, jsonData: JSON_DATA });

      // Assert
      const metadata = JSON.parse(parseMultipart(fetchCall().init)[0].content);
      expect(metadata).toEqual(expect.objectContaining({ locationName: "", displayFrom: null, displayTo: null }));
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Location not found"), expect.objectContaining({ artefactId: ARTEFACT_ID }));
    });

    it("should send metadata and file parts with the {id}{ext} filename for a flat file", async () => {
      // Arrange
      vi.mocked(findArtefactForFulfilment).mockResolvedValue(buildArtefact({ isFlatFile: true, sourceArtefactId: "upload.pdf" }));
      vi.mocked(loadFlatFile).mockResolvedValue({ buffer: Buffer.from("pdf-bytes"), fileName: `${ARTEFACT_ID}.pdf` });

      // Act
      await sendPublicationToThirdParties({ artefactId: ARTEFACT_ID, isUpdate: false });

      // Assert
      expect(loadFlatFile).toHaveBeenCalledWith(ARTEFACT_ID, "upload.pdf");
      const parts = parseMultipart(fetchCall().init);
      expect(parts.map((part) => part.name)).toEqual(["metadata", "file"]);
      expect(parts[1]).toEqual({ name: "file", fileName: `${ARTEFACT_ID}.pdf`, contentType: "application/octet-stream", content: "pdf-bytes" });
    });

    it("should PUT to {destinationUrl}/{publicationId} for an update", async () => {
      // Act
      await sendPublicationToThirdParties({ artefactId: ARTEFACT_ID, isUpdate: true, jsonData: JSON_DATA });

      // Assert
      const { url, init } = fetchCall();
      expect(url).toBe(`https://user-1.example/publication/${ARTEFACT_ID}`);
      expect(init.method).toBe("PUT");
      expect(parseMultipart(init).map((part) => part.name)).toEqual(["metadata", "payload"]);
    });

    it("should skip a subscriber with no destination URL, log the user ID only, and still deliver to the others", async () => {
      // Arrange
      vi.mocked(findMatchingSubscriptions).mockResolvedValue([SUBSCRIBER_1, SUBSCRIBER_2]);
      vi.mocked(getDestinationUrl).mockImplementation(async (_name, userId) => (userId === "user-1" ? null : destinationUrlFor(userId)));

      // Act
      await sendPublicationToThirdParties({ artefactId: ARTEFACT_ID, isUpdate: false, jsonData: JSON_DATA });

      // Assert
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("no destination URL configured"), { userId: "user-1" });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(fetchCall().url).toBe("https://user-2.example/publication");
    });

    it("should still send the request without a bearer token when the token request fails", async () => {
      // Arrange
      vi.mocked(getAccessToken).mockResolvedValue(null);

      // Act
      await sendPublicationToThirdParties({ artefactId: ARTEFACT_ID, isUpdate: false, jsonData: JSON_DATA });

      // Assert
      const { init } = fetchCall();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(init.headers.Authorization).toBeUndefined();
    });

    it("should log the user and publication ID when retries are exhausted, without throwing or affecting other subscribers", async () => {
      // Arrange
      vi.mocked(findMatchingSubscriptions).mockResolvedValue([SUBSCRIBER_1, SUBSCRIBER_2]);
      mockFetch.mockImplementation(async (url: string) => new Response(null, { status: url.includes("user-1") ? 500 : 200 }));

      // Act
      const act = sendPublicationToThirdParties({ artefactId: ARTEFACT_ID, isUpdate: false, jsonData: JSON_DATA });

      // Assert
      await expect(act).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("failed after retries"), { userId: "user-1", publicationId: ARTEFACT_ID });
      expect(console.info).toHaveBeenCalledWith(expect.stringContaining("POST sent"), { userId: "user-2", publicationId: ARTEFACT_ID });
    });

    it("should log and carry on when a subscriber throws unexpectedly", async () => {
      // Arrange
      vi.mocked(findMatchingSubscriptions).mockResolvedValue([SUBSCRIBER_1, SUBSCRIBER_2]);
      vi.mocked(getAccessToken).mockImplementation(async (_name, userId) => {
        if (userId === "user-1") throw new Error("Redis down");
        return "token";
      });

      // Act
      await sendPublicationToThirdParties({ artefactId: ARTEFACT_ID, isUpdate: false, jsonData: JSON_DATA });

      // Assert
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Third-party delivery failed"), {
        userId: "user-1",
        publicationId: ARTEFACT_ID,
        error: "Redis down"
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should log and send nothing when the artefact is not found", async () => {
      // Arrange
      vi.mocked(findArtefactForFulfilment).mockResolvedValue(null);

      // Act
      await sendPublicationToThirdParties({ artefactId: ARTEFACT_ID, isUpdate: false, jsonData: JSON_DATA });

      // Assert
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("artefact not found"), { artefactId: ARTEFACT_ID });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should log and send nothing when the flat file blob is missing", async () => {
      // Arrange
      vi.mocked(findArtefactForFulfilment).mockResolvedValue(buildArtefact({ isFlatFile: true, sourceArtefactId: "upload.pdf" }));
      vi.mocked(loadFlatFile).mockResolvedValue(null);

      // Act
      await sendPublicationToThirdParties({ artefactId: ARTEFACT_ID, isUpdate: false });

      // Assert
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("flat file not found"), { artefactId: ARTEFACT_ID });
      expect(getDestinationUrl).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should log and send nothing when a JSON publication has no jsonData", async () => {
      // Act
      await sendPublicationToThirdParties({ artefactId: ARTEFACT_ID, isUpdate: false });

      // Assert
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("no JSON payload"), { artefactId: ARTEFACT_ID });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should never log tokens, secrets, URLs or payload content", async () => {
      // Arrange
      vi.mocked(findMatchingSubscriptions).mockResolvedValue([SUBSCRIBER_1, SUBSCRIBER_2]);
      mockFetch.mockImplementation(async (url: string) => new Response(null, { status: url.includes("user-1") ? 500 : 200 }));

      // Act
      await sendPublicationToThirdParties({ artefactId: ARTEFACT_ID, isUpdate: false, jsonData: JSON_DATA, logPrefix: "[Test]" });

      // Assert
      const logs = allLogs();
      expect(logs).toContain("[Test]");
      expect(logs).not.toContain("token-for-");
      expect(logs).not.toContain(".example");
      expect(logs).not.toContain("confidential-payload-value");
    });
  });

  describe("sendPublicationDeletionToThirdParties", () => {
    it("should DELETE {destinationUrl}/{publicationId} with the bearer token and no body", async () => {
      // Act
      await sendPublicationDeletionToThirdParties({ artefactId: ARTEFACT_ID, listTypeId: 999, sensitivity: "PRIVATE" });

      // Assert
      expect(findListTypeName).toHaveBeenCalledWith(999);
      expect(findMatchingSubscriptions).toHaveBeenCalledWith("CIVIL_DAILY_CAUSE_LIST", ["PRIVATE", "CLASSIFIED"]);
      const { url, init } = fetchCall();
      expect(url).toBe(`https://user-1.example/publication/${ARTEFACT_ID}`);
      expect(init.method).toBe("DELETE");
      expect(init.body).toBeUndefined();
      expect(init.headers).toEqual({ Authorization: "Bearer token-for-user-1" });
    });

    it("should send the deletion whatever the display window", async () => {
      // Act
      await sendPublicationDeletionToThirdParties({ artefactId: ARTEFACT_ID, listTypeId: 999, sensitivity: "PUBLIC" });

      // Assert
      expect(findArtefactForFulfilment).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should send nothing when the list type is not found", async () => {
      // Arrange
      vi.mocked(findListTypeName).mockResolvedValue(null);

      // Act
      await sendPublicationDeletionToThirdParties({ artefactId: ARTEFACT_ID, listTypeId: 999, sensitivity: "PUBLIC" });

      // Assert
      expect(findMatchingSubscriptions).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should send nothing when no subscribers match", async () => {
      // Arrange
      vi.mocked(findMatchingSubscriptions).mockResolvedValue([]);

      // Act
      await sendPublicationDeletionToThirdParties({ artefactId: ARTEFACT_ID, listTypeId: 999, sensitivity: "PUBLIC" });

      // Assert
      expect(getDestinationUrl).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
