import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCftIdamConfig, isCftIdamConfigured } from "../config/cft-idam-config.js";
import { cftIdamHealthCheck } from "./health-check.js";

vi.mock("../config/cft-idam-config.js", () => ({
  getCftIdamConfig: vi.fn(),
  isCftIdamConfigured: vi.fn()
}));

const CFT_IDAM_HEALTH_URL = "https://idam-web-public.aat.platform.hmcts.net/health";
const HMCTS_ACCESS_HEALTH_URL = "https://hmcts-access.aat.platform.hmcts.net/health";

describe("cftIdamHealthCheck", () => {
  let res: Response;
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(isCftIdamConfigured).mockReturnValue(true);
    vi.mocked(getCftIdamConfig).mockReturnValue({
      cftIdamUrl: "https://idam-web-public.aat.platform.hmcts.net",
      hmctsAccessUrl: "https://hmcts-access.aat.platform.hmcts.net"
    } as ReturnType<typeof getCftIdamConfig>);
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockHealthResponses(responses: Record<string, unknown>) {
    fetchMock.mockImplementation(async (url: string) => {
      const response = responses[url];
      if (response instanceof Error) {
        throw response;
      }
      return { json: async () => response };
    });
  }

  it("should return 200 when both CFT IDAM services are UP", async () => {
    // Arrange
    mockHealthResponses({ [CFT_IDAM_HEALTH_URL]: { status: "UP" }, [HMCTS_ACCESS_HEALTH_URL]: { status: "UP" } });

    // Act
    await cftIdamHealthCheck()({} as Request, res);

    // Assert
    expect(fetchMock).toHaveBeenCalledWith(CFT_IDAM_HEALTH_URL, expect.anything());
    expect(fetchMock).toHaveBeenCalledWith(HMCTS_ACCESS_HEALTH_URL, expect.anything());
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: "UP", services: { "cft-idam": "UP", "hmcts-access": "UP" } });
  });

  it("should return 503 when a service reports a status other than UP", async () => {
    // Arrange
    mockHealthResponses({ [CFT_IDAM_HEALTH_URL]: { status: "UP" }, [HMCTS_ACCESS_HEALTH_URL]: { status: "DOWN" } });

    // Act
    await cftIdamHealthCheck()({} as Request, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ status: "DOWN", services: { "cft-idam": "UP", "hmcts-access": "DOWN" } });
  });

  it("should return 503 when a service cannot be reached", async () => {
    // Arrange
    mockHealthResponses({ [CFT_IDAM_HEALTH_URL]: new Error("timeout"), [HMCTS_ACCESS_HEALTH_URL]: { status: "UP" } });

    // Act
    await cftIdamHealthCheck()({} as Request, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ status: "DOWN", services: { "cft-idam": "DOWN", "hmcts-access": "UP" } });
  });

  it("should report UP with no services when CFT IDAM is not configured", async () => {
    // Arrange
    vi.mocked(isCftIdamConfigured).mockReturnValue(false);

    // Act
    await cftIdamHealthCheck()({} as Request, res);

    // Assert
    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ status: "UP", services: {} });
  });
});
