import type { Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

describe("GET /", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return welcome message with API information and the commit it was built from", async () => {
    // Arrange
    vi.stubEnv("GIT_COMMIT", "2222222222222222222222222222222222222222");
    const res = { json: vi.fn() } as unknown as Response;

    // Act
    await GET({} as Request, res);

    // Assert
    expect(res.json).toHaveBeenCalledWith({
      message: "Welcome to HMCTS API",
      version: "1.0.0",
      gitCommit: "2222222222222222222222222222222222222222",
      endpoints: {
        health: "/health",
        liveness: "/health/liveness",
        readiness: "/health/readiness"
      }
    });
  });

  it("should report the commit as unknown when GIT_COMMIT is not set", async () => {
    // Arrange
    vi.stubEnv("GIT_COMMIT", "");
    const res = { json: vi.fn() } as unknown as Response;

    // Act
    await GET({} as Request, res);

    // Assert
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ gitCommit: "unknown" }));
  });
});
