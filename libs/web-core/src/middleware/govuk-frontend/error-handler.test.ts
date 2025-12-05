import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "../../views/errors/cy.js";
import { en } from "../../views/errors/en.js";
import { errorHandler, notFoundHandler } from "./error-handler.js";

describe("Error Handler Middleware", () => {
  describe("notFoundHandler", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
      req = {
        path: "/some-path",
        method: "GET"
      };
      res = {
        status: vi.fn().mockReturnThis(),
        render: vi.fn(),
        locals: {
          locale: "en"
        }
      };
      next = vi.fn();
    });

    it("should return a middleware function", () => {
      const middleware = notFoundHandler();
      expect(typeof middleware).toBe("function");
    });

    it("should render 404 for GET requests", () => {
      const middleware = notFoundHandler();
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/404", {
        en: en.error404,
        cy: cy.error404,
        t: en.error404
      });
    });

    it("should render 404 for HEAD requests", () => {
      req.method = "HEAD";
      const middleware = notFoundHandler();
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/404", {
        en: en.error404,
        cy: cy.error404,
        t: en.error404
      });
    });

    it("should pass through POST requests", () => {
      req.method = "POST";
      const middleware = notFoundHandler();
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should pass through PUT requests", () => {
      req.method = "PUT";
      const middleware = notFoundHandler();
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should pass through DELETE requests", () => {
      req.method = "DELETE";
      const middleware = notFoundHandler();
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("errorHandler", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let logger: any;
    let error: Error;

    beforeEach(() => {
      req = {
        path: "/some-path",
        method: "GET"
      };
      res = {
        status: vi.fn().mockReturnThis(),
        render: vi.fn(),
        locals: {
          locale: "en"
        }
      };
      next = vi.fn();
      logger = {
        error: vi.fn(),
        log: vi.fn(),
        warn: vi.fn()
      };
      error = new Error("Test error");
      error.stack = "Error stack trace";
    });

    it("should return a middleware function", () => {
      const middleware = errorHandler();
      expect(typeof middleware).toBe("function");
    });

    it("should log error with provided logger", () => {
      const middleware = errorHandler(logger);
      middleware(error, req as Request, res as Response, next);

      expect(logger.error).toHaveBeenCalledWith("Error:", error.stack);
    });

    it("should use console as default logger", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      const middleware = errorHandler();
      middleware(error, req as Request, res as Response, next);

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it("should render 500 error page", () => {
      const middleware = errorHandler(logger);
      middleware(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith(
        "errors/500",
        expect.objectContaining({
          en: en.error500,
          cy: cy.error500,
          t: en.error500,
          error: error.message,
          stack: error.stack
        })
      );
    });

    it("should log error message if stack is not available", () => {
      const errorWithoutStack = new Error("Test error");
      delete errorWithoutStack.stack;

      const middleware = errorHandler(logger);
      middleware(errorWithoutStack, req as Request, res as Response, next);

      expect(logger.error).toHaveBeenCalledWith("Error:", errorWithoutStack);
    });
  });
});
