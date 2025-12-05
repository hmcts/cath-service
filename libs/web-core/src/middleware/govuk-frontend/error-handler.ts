import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { en } from "../../views/errors/en.js";
import { cy } from "../../views/errors/cy.js";

/**
 * 404 Not Found handler
 * Must be added after all other routes
 */
export function notFoundHandler() {
  return (req: Request, res: Response, next: NextFunction) => {
    // In development, don't catch potential asset paths that Vite might handle
    const looksLikeVite = req.path.startsWith("/@vite") || req.path.startsWith("/@fs") || req.path.endsWith(".ts") || req.path.endsWith(".scss");
    if (process.env.NODE_ENV !== "production" && looksLikeVite) {
      return next();
    }

    // Only handle GET/HEAD requests as 404, let others pass through
    if (req.method === "GET" || req.method === "HEAD") {
      res.status(404).render("errors/404", {
        en: en.error404,
        cy: cy.error404,
        t: res.locals.locale === "cy" ? cy.error404 : en.error404
      });
    } else {
      next();
    }
  };
}

/**
 * General error handler
 * Must be added as the last middleware
 */
export function errorHandler(logger: Logger = console): ErrorRequestHandler {
  return (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // Log the error for debugging
    logger.error("Error:", err.stack || err);

    const locale = res.locals.locale || "en";
    const t = locale === "cy" ? cy.error500 : en.error500;

    // Don't leak error details in production
    if (process.env.NODE_ENV === "production") {
      res.status(500).render("errors/500", {
        en: en.error500,
        cy: cy.error500,
        t
      });
    } else {
      // In development, show more detailed error
      res.status(500).render("errors/500", {
        en: en.error500,
        cy: cy.error500,
        t,
        error: err.message,
        stack: err.stack
      });
    }
  };
}

type Logger = Pick<Console, "error" | "log" | "warn">;
