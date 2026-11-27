import type { Request } from "express";

const PARSE_BASE = "http://localhost";

// The single place a post-login redirect target is read from the session. returnTo is captured
// from req.originalUrl, so it is attacker-influenced and must be validated before redirecting.
export function consumeReturnTo(req: Request, fallback: string): string {
  const returnTo = req.session.returnTo;
  delete req.session.returnTo;
  return isSameOriginPath(returnTo) ? returnTo : fallback;
}

// The WHATWG parser applies the same normalisation browsers do (backslashes as slashes,
// stripped tabs/newlines, dot segments), so a value that leaves the origin here would leave it
// in the browser too. Values whose normalised path starts with "//" are also rejected: they stay
// same-origin as written, but become protocol-relative if anything later normalises the path.
function isSameOriginPath(returnTo: unknown): returnTo is string {
  if (typeof returnTo !== "string" || !returnTo.startsWith("/")) {
    return false;
  }

  try {
    const url = new URL(returnTo, PARSE_BASE);
    return url.origin === PARSE_BASE && !url.pathname.startsWith("//");
  } catch {
    return false;
  }
}
