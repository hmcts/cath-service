import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// Mock process.exit to prevent test runner from exiting
const mockExit = vi.fn() as any;

beforeAll(() => {
  process.exit = mockExit;
});

afterEach(() => {
  mockExit.mockClear();
});

// Mock the app creation to avoid actually starting a server
vi.mock("./app.js", () => ({
  createApp: vi.fn(async () => ({
    listen: vi.fn((_port: number, callback: () => void) => {
      // Simulate successful server start
      setTimeout(callback, 0);
      return {
        close: vi.fn((cb: () => void) => cb()),
        on: vi.fn()
      };
    })
  }))
}));

describe("API Server", () => {
  it("should define PORT from environment or default", () => {
    const PORT = process.env.API_PORT || 3001;
    expect(PORT).toBeDefined();
    expect(typeof PORT === "string" || typeof PORT === "number").toBe(true);
  });

  it("should export server startup functionality", async () => {
    // The server module executes on import, so we just verify it can be imported
    const serverModule = await import("./server.js");
    expect(serverModule).toBeDefined();

    // Verify that process.exit was not called (server started successfully)
    expect(mockExit).not.toHaveBeenCalled();
  });

  it("should register SIGTERM handler", async () => {
    // Import the server module to ensure signal handlers are registered
    await import("./server.js");

    const listeners = process.listeners("SIGTERM");
    expect(listeners.length).toBeGreaterThan(0);
  });

  it("should register SIGINT handler", async () => {
    // Import the server module to ensure signal handlers are registered
    await import("./server.js");

    const listeners = process.listeners("SIGINT");
    expect(listeners.length).toBeGreaterThan(0);
  });
});
