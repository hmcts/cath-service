import { describe, expect, it, vi } from "vitest";
import { CATH_RUN_TOKEN, newRunToken, removeRuns } from "./run.js";

describe("newRunToken", () => {
  it("should make a token the run's courts can be found by", () => {
    // Act
    const token = newRunToken();

    // Assert
    expect(token).toMatch(CATH_RUN_TOKEN);
  });

  it("should make a different token for each run started in the same second", () => {
    // Act
    const tokens = new Set(Array.from({ length: 20 }, () => newRunToken(Date.UTC(2026, 10, 10, 15, 30))));

    // Assert
    expect(tokens.size).toBeGreaterThan(1);
  });
});

describe("removeRuns", () => {
  const STARTED_AT = Date.UTC(2026, 10, 10, 15, 30, 12);
  const RUN = newRunToken(STARTED_AT);
  const OTHER = newRunToken(STARTED_AT + 60 * 1000);

  // A fake CaTH API holding two runs' courts and records, and one real court
  function fakeApi(fail?: (method: string, endpoint: string) => boolean) {
    const calls: { method: string; endpoint: string; body?: unknown }[] = [];
    const api = vi.fn(async (method: string, endpoint: string, body?: unknown) => {
      calls.push({ method, endpoint, body });
      if (fail?.(method, endpoint)) throw new Error(`${method} ${endpoint} failed: 500`);
      if (endpoint === "/test-support/locations")
        return [
          { locationId: 91, name: `${RUN} Oxford Combined Court Centre` },
          { locationId: 92, name: `${OTHER} Oxford Combined Court Centre` },
          { locationId: 9, name: "Single Justice Procedure" }
        ];
      if (endpoint.startsWith("/test-support/media-applications?"))
        return endpoint.includes(encodeURIComponent(`${RUN}.`)) ? { id: "m1" } : Promise.reject(new Error("GET failed: 404"));
      if (endpoint === "/test-support/legacy-third-party-users" && method === "GET")
        return [
          { id: "l1", name: `${RUN} parity-legacy-third-party` },
          { id: "l2", name: "a real legacy user" }
        ];
      if (endpoint === "/test-support/third-party-users" && method === "GET")
        return [
          { id: "t1", name: `${RUN} Parity Third Party Subscriber` },
          { id: "t2", name: "Courtel" }
        ];
      return null;
    });
    return { api, calls };
  }

  it("should remove a run's records, then what was published to its courts, then its courts, leaving everything else", async () => {
    // Arrange
    const { api, calls } = fakeApi();

    // Act
    await removeRuns(api, { token: RUN });

    // Assert
    const deletes = calls.filter((call) => call.method === "DELETE").map((call) => `${call.endpoint} ${JSON.stringify(call.body ?? null)}`);
    expect(deletes).toEqual([
      "/test-support/media-applications/m1 null",
      '/test-support/legacy-third-party-users {"ids":["l1"]}',
      '/test-support/third-party-users {"ids":["t1"]}',
      '/test-support/artefacts {"locationId":"91"}',
      '/test-support/subscriptions {"searchType":"LOCATION_ID","searchValues":["91"]}',
      '/test-support/locations {"locationIds":[91]}'
    ]);
  });

  it("should try every run and then name the ones it could not remove", async () => {
    // Arrange
    const { api, calls } = fakeApi((method, endpoint) => method === "DELETE" && endpoint === "/test-support/legacy-third-party-users");

    // Act
    const removing = removeRuns(api, { staleAt: STARTED_AT + 4 * 60 * 60 * 1000 });

    // Assert
    await expect(removing).rejects.toThrow(`could not remove run ${RUN}`);
    // The other run was still removed, and the failed one keeps its court for a later run
    expect(calls).toContainEqual({ method: "DELETE", endpoint: "/test-support/locations", body: { locationIds: [92] } });
    expect(calls).not.toContainEqual({ method: "DELETE", endpoint: "/test-support/locations", body: { locationIds: [91] } });
  });

  it("should fetch the user lists once for every run it removes, not once per run", async () => {
    // Arrange
    const { api, calls } = fakeApi();

    // Act
    await removeRuns(api, { staleAt: STARTED_AT + 4 * 60 * 60 * 1000 });

    // Assert
    const listFetches = calls.filter((call) => call.method === "GET" && call.endpoint.endsWith("third-party-users"));
    expect(listFetches.map((call) => call.endpoint)).toEqual(["/test-support/legacy-third-party-users", "/test-support/third-party-users"]);
    expect(calls).toContainEqual({ method: "DELETE", endpoint: "/test-support/locations", body: { locationIds: [91] } });
    expect(calls).toContainEqual({ method: "DELETE", endpoint: "/test-support/locations", body: { locationIds: [92] } });
  });

  it("should leave runs that started less than three hours before, as they may still be going", async () => {
    // Arrange
    const { api, calls } = fakeApi();

    // Act
    const removed = await removeRuns(api, { staleAt: STARTED_AT + 2 * 60 * 60 * 1000 });

    // Assert
    expect(removed).toBe(0);
    expect(calls.filter((call) => call.method === "DELETE")).toEqual([]);
  });

  it("should fetch nothing more when there is no run to remove", async () => {
    // Arrange
    const { api, calls } = fakeApi();

    // Act
    const removed = await removeRuns(api, { token: "uicnotarun0000" });

    // Assert
    expect(removed).toBe(0);
    expect(calls.map((call) => call.endpoint)).toEqual(["/test-support/locations"]);
  });
});
