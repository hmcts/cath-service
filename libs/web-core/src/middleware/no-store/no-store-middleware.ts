import type { NextFunction, Request, Response } from "express";

// Matches pip-frontend. Stops the browser keeping a copy of the page, so going Back fetches a fresh
// one instead of a stale page that still shows validation errors the user has already fixed.
export const NO_STORE_CACHE_CONTROL = "private, max-age=0, no-cache, no-store, must-revalidate";

export function noStore() {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", NO_STORE_CACHE_CONTROL);
    next();
  };
}
