import type { Request } from "express";

interface RequestWithCsrf extends Request {
  csrfToken?: () => string;
}

/**
 * Safely extracts the CSRF token from the request.
 * The CSRF middleware injects csrfToken() into the request object.
 * Returns an empty string if the token is not available.
 *
 * @param req - Express request object
 * @returns CSRF token string or empty string
 */
export function getCsrfToken(req: Request): string {
  const csrfReq = req as RequestWithCsrf;
  return csrfReq.csrfToken?.() || "";
}
