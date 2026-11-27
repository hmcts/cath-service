import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deploymentHealthCheck } from "./deployment-health-check.js";

const API_URL = "http://cath-api";
const WEB_COMMIT = "1111111111111111111111111111111111111111";
const API_COMMIT = "2222222222222222222222222222222222222222";

describe("deploymentHealthCheck", () => {
  let res: Response;
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("CATH_API_URL", API_URL);
    vi.stubEnv("GIT_COMMIT", WEB_COMMIT);
    res = { set: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function mockApiResponse(response: { ok: boolean; body?: unknown } | Error) {
    fetchMock.mockImplementation(async () => {
      if (response instanceof Error) {
        throw response;
      }
      return { ok: response.ok, json: async () => response.body };
    });
  }

  it("should return 200 with both commits when the API is UP", async () => {
    // Arrange
    mockApiResponse({ ok: true, body: { message: "Welcome to HMCTS API", gitCommit: API_COMMIT } });

    // Act
    await deploymentHealthCheck()({} as Request, res);

    // Assert
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/`, expect.anything());
    expect(res.set).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "UP",
      gitCommit: WEB_COMMIT,
      services: { "cath-api": { status: "UP", gitCommit: API_COMMIT } }
    });
  });

  it("should not double the slash when CATH_API_URL ends with one", async () => {
    // Arrange
    vi.stubEnv("CATH_API_URL", `${API_URL}/`);
    mockApiResponse({ ok: true, body: { gitCommit: API_COMMIT } });

    // Act
    await deploymentHealthCheck()({} as Request, res);

    // Assert
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/`, expect.anything());
  });

  it("should report the API commit as unknown when the API does not return one", async () => {
    // Arrange
    mockApiResponse({ ok: true, body: { message: "Welcome to HMCTS API" } });

    // Act
    await deploymentHealthCheck()({} as Request, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ services: { "cath-api": { status: "UP", gitCommit: "unknown" } } }));
  });

  it("should return 503 when the API returns an error status", async () => {
    // Arrange
    mockApiResponse({ ok: false });

    // Act
    await deploymentHealthCheck()({} as Request, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      status: "DOWN",
      gitCommit: WEB_COMMIT,
      services: { "cath-api": { status: "DOWN", gitCommit: "unknown" } }
    });
  });

  it("should return 503 when the API cannot be reached", async () => {
    // Arrange
    mockApiResponse(new Error("timeout"));

    // Act
    await deploymentHealthCheck()({} as Request, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: "DOWN" }));
  });

  it("should return 503 without calling the API when CATH_API_URL is not set", async () => {
    // Arrange
    vi.stubEnv("CATH_API_URL", "");

    // Act
    await deploymentHealthCheck()({} as Request, res);

    // Assert
    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it("should report the web commit as unknown when GIT_COMMIT is not set", async () => {
    // Arrange
    vi.stubEnv("GIT_COMMIT", "");
    mockApiResponse({ ok: true, body: { gitCommit: API_COMMIT } });

    // Act
    await deploymentHealthCheck()({} as Request, res);

    // Assert
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ gitCommit: "unknown" }));
  });
});
