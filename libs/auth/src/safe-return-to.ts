const PARSE_BASE = "http://localhost";

// returnTo is captured from req.originalUrl and redirected to after login, so it must stay a
// same-origin path. The WHATWG parser applies the same normalisation browsers do (backslashes
// as slashes, stripped tabs/newlines), so a value that resolves to another origin here would
// also leave the site in the browser. The original string is returned unchanged so its encoding
// is preserved.
export function safeReturnTo(returnTo: unknown, fallback: string): string {
  if (typeof returnTo !== "string" || !returnTo.startsWith("/")) {
    return fallback;
  }

  try {
    return new URL(returnTo, PARSE_BASE).origin === PARSE_BASE ? returnTo : fallback;
  } catch {
    return fallback;
  }
}
