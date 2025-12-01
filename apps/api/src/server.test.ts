import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockExit = vi.fn();
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();

let mockServer: {
  listen: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
};

let mockCreateApp: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();

  // Mock process methods
  process.exit = mockExit as any;
  console.log = mockConsoleLog;
  console.error = mockConsoleError;

  // Setup mock server
  mockServer = {
    listen: vi.fn(),
    close: vi.fn(),
    on: vi.fn()
  };

  // Setup mock createApp
  mockCreateApp = vi.fn();
});

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("API Server", () => {
  describe("startServer", () => {
    it("should start server successfully on default port", async () => {
      delete process.env.API_PORT;

      mockCreateApp.mockResolvedValue({
        listen: vi.fn((_port: number, callback: () => void) => {
          callback();
          return mockServer;
        })
      });

      vi.doMock("./app.js", () => ({
        createApp: mockCreateApp
      }));

      await import("./server.js");

      expect(mockCreateApp).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("http://localhost:3001"));
      expect(mockExit).not.toHaveBeenCalled();
    });

    it("should start server on custom port from environment", async () => {
      process.env.API_PORT = "4000";

      mockCreateApp.mockResolvedValue({
        listen: vi.fn((port: number, callback: () => void) => {
          expect(port).toBe("4000");
          callback();
          return mockServer;
        })
      });

      vi.doMock("./app.js", () => ({
        createApp: mockCreateApp
      }));

      await import("./server.js");

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("http://localhost:4000"));
    });

    it("should log all health check endpoints on startup", async () => {
      mockCreateApp.mockResolvedValue({
        listen: vi.fn((_port: number, callback: () => void) => {
          callback();
          return mockServer;
        })
      });

      vi.doMock("./app.js", () => ({
        createApp: mockCreateApp
      }));

      await import("./server.js");

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("API server running"));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("/health"));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("/health/readiness"));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("/health/liveness"));
    });

    it("should exit with code 1 when createApp fails", async () => {
      const error = new Error("Failed to create app");
      mockCreateApp.mockRejectedValue(error);

      vi.doMock("./app.js", () => ({
        createApp: mockCreateApp
      }));

      await import("./server.js");

      expect(mockConsoleError).toHaveBeenCalledWith("Failed to start server:", error);
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should register server error handler", async () => {
      mockCreateApp.mockResolvedValue({
        listen: vi.fn((_port: number, callback: () => void) => {
          callback();
          return mockServer;
        })
      });

      vi.doMock("./app.js", () => ({
        createApp: mockCreateApp
      }));

      await import("./server.js");

      expect(mockServer.on).toHaveBeenCalledWith("error", expect.any(Function));
    });

    it("should exit with code 1 when server emits error event", async () => {
      let errorHandler: (error: Error) => void;

      mockCreateApp.mockResolvedValue({
        listen: vi.fn((_port: number, callback: () => void) => {
          callback();
          return {
            ...mockServer,
            on: vi.fn((event: string, handler: any) => {
              if (event === "error") {
                errorHandler = handler;
              }
            })
          };
        })
      });

      vi.doMock("./app.js", () => ({
        createApp: mockCreateApp
      }));

      await import("./server.js");

      const serverError = new Error("Server error");
      errorHandler!(serverError);

      expect(mockConsoleError).toHaveBeenCalledWith("Server error:", serverError);
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe("signal handlers", () => {
    it("should register SIGTERM handler", async () => {
      mockCreateApp.mockResolvedValue({
        listen: vi.fn((_port: number, callback: () => void) => {
          callback();
          return mockServer;
        })
      });

      vi.doMock("./app.js", () => ({
        createApp: mockCreateApp
      }));

      await import("./server.js");

      const listeners = process.listeners("SIGTERM");
      expect(listeners.length).toBeGreaterThan(0);
    });

    it("should register SIGINT handler", async () => {
      mockCreateApp.mockResolvedValue({
        listen: vi.fn((_port: number, callback: () => void) => {
          callback();
          return mockServer;
        })
      });

      vi.doMock("./app.js", () => ({
        createApp: mockCreateApp
      }));

      await import("./server.js");

      const listeners = process.listeners("SIGINT");
      expect(listeners.length).toBeGreaterThan(0);
    });

    it("should close server gracefully on SIGTERM", async () => {
      let sigtermHandler: () => void;
      const originalOn = process.on.bind(process);

      process.on = vi.fn((event: string, handler: any) => {
        if (event === "SIGTERM") {
          sigtermHandler = handler;
        }
        return originalOn(event, handler);
      }) as any;

      mockServer.close.mockImplementation((callback: () => void) => {
        callback();
      });

      mockCreateApp.mockResolvedValue({
        listen: vi.fn((_port: number, callback: () => void) => {
          callback();
          return mockServer;
        })
      });

      vi.doMock("./app.js", () => ({
        createApp: mockCreateApp
      }));

      await import("./server.js");

      sigtermHandler!();

      expect(mockConsoleLog).toHaveBeenCalledWith("SIGTERM signal received: closing HTTP server");
      expect(mockServer.close).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith("HTTP server closed");
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("should close server gracefully on SIGINT", async () => {
      let sigintHandler: () => void;
      const originalOn = process.on.bind(process);

      process.on = vi.fn((event: string, handler: any) => {
        if (event === "SIGINT") {
          sigintHandler = handler;
        }
        return originalOn(event, handler);
      }) as any;

      mockServer.close.mockImplementation((callback: () => void) => {
        callback();
      });

      mockCreateApp.mockResolvedValue({
        listen: vi.fn((_port: number, callback: () => void) => {
          callback();
          return mockServer;
        })
      });

      vi.doMock("./app.js", () => ({
        createApp: mockCreateApp
      }));

      await import("./server.js");

      sigintHandler!();

      expect(mockConsoleLog).toHaveBeenCalledWith("SIGINT signal received: closing HTTP server");
      expect(mockServer.close).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith("HTTP server closed");
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe("error handlers", () => {
    it("should register uncaughtException handler", async () => {
      mockCreateApp.mockResolvedValue({
        listen: vi.fn((_port: number, callback: () => void) => {
          callback();
          return mockServer;
        })
      });

      vi.doMock("./app.js", () => ({
        createApp: mockCreateApp
      }));

      await import("./server.js");

      const listeners = process.listeners("uncaughtException");
      expect(listeners.length).toBeGreaterThan(0);
    });

    it("should register unhandledRejection handler", async () => {
      mockCreateApp.mockResolvedValue({
        listen: vi.fn((_port: number, callback: () => void) => {
          callback();
          return mockServer;
        })
      });

      vi.doMock("./app.js", () => ({
        createApp: mockCreateApp
      }));

      await import("./server.js");

      const listeners = process.listeners("unhandledRejection");
      expect(listeners.length).toBeGreaterThan(0);
    });

    it("should exit with code 1 on uncaughtException", async () => {
      let uncaughtExceptionHandler: (error: Error) => void;
      const originalOn = process.on.bind(process);

      process.on = vi.fn((event: string, handler: any) => {
        if (event === "uncaughtException") {
          uncaughtExceptionHandler = handler;
        }
        return originalOn(event, handler);
      }) as any;

      mockCreateApp.mockResolvedValue({
        listen: vi.fn((_port: number, callback: () => void) => {
          callback();
          return mockServer;
        })
      });

      vi.doMock("./app.js", () => ({
        createApp: mockCreateApp
      }));

      await import("./server.js");

      const error = new Error("Uncaught exception");
      uncaughtExceptionHandler!(error);

      expect(mockConsoleError).toHaveBeenCalledWith("Uncaught exception:", error);
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should exit with code 1 on unhandledRejection", async () => {
      let unhandledRejectionHandler: (reason: any, promise: Promise<any>) => void;
      const originalOn = process.on.bind(process);

      process.on = vi.fn((event: string, handler: any) => {
        if (event === "unhandledRejection") {
          unhandledRejectionHandler = handler;
        }
        return originalOn(event, handler);
      }) as any;

      mockCreateApp.mockResolvedValue({
        listen: vi.fn((_port: number, callback: () => void) => {
          callback();
          return mockServer;
        })
      });

      vi.doMock("./app.js", () => ({
        createApp: mockCreateApp
      }));

      await import("./server.js");

      const reason = "Promise rejection reason";
      const promise = Promise.reject(reason);
      unhandledRejectionHandler!(reason, promise);

      expect(mockConsoleError).toHaveBeenCalledWith("Unhandled rejection at:", promise, "reason:", reason);
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
