import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as keepAlive from "./index.js";

describe("session-keep-alive", () => {
  let res: Partial<Response>;

  beforeEach(() => {
    res = {
      set: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
      send: vi.fn(),
      json: vi.fn()
    };
  });

  function requestAs(isAuthenticated: boolean) {
    return { isAuthenticated: () => isAuthenticated } as unknown as Request;
  }

  it("should respond 204 with no-store for a signed-in user", async () => {
    // Act
    await keepAlive.POST(requestAs(true), res as Response);

    // Assert
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.set).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(res.end).toHaveBeenCalled();
  });

  it("should respond 401 when there is no signed-in user", async () => {
    // Act
    await keepAlive.POST(requestAs(false), res as Response);

    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.end).toHaveBeenCalled();
  });

  it("should end the response without send or json so no audit log row is written", async () => {
    // Act
    await keepAlive.POST(requestAs(true), res as Response);

    // Assert
    expect(res.send).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("should only handle POST", () => {
    expect(Object.keys(keepAlive)).toEqual(["POST"]);
  });
});
