import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";

vi.mock("@hmcts/cloud-native-platform", () => ({
  configurePropertiesVolume: vi.fn(),
  healthcheck: vi.fn(() => (_req: any, res: any, next: any) => {
    if (_req.path === "/health") {
      return res.json({ status: "UP" });
    }
    next();
  })
}));

vi.mock("config", () => ({
  default: {
    get: vi.fn((key: string) => {
      const values: Record<string, string> = {
        newServiceUrl: "http://localhost:8080",
        oldServiceUrl: "http://localhost:3000"
      };
      return values[key];
    })
  }
}));

vi.mock("./proxy-middleware.js", () => ({
  createRoutingProxy: vi.fn(() => (_req: any, res: any) => {
    res.status(200).send("proxied");
  })
}));

describe("createApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should respond to health check without proxying", async () => {
    // Arrange
    const app = await createApp(null);

    // Act
    const response = await request(app).get("/health");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "UP" });
  });

  it("should proxy non-health requests", async () => {
    // Arrange
    const app = await createApp(null);

    // Act
    const response = await request(app).get("/some-page");

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toBe("proxied");
  });
});
