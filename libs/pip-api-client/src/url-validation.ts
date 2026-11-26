import { normaliseHost } from "./pip-apis.js";

const MAX_URL_LENGTH = 2048;
const SCHEME_OR_ROOT_PATTERN = /^([a-z][a-z\d+.-]*:\/\/|\/)/i;

export function validatePipUrl(input: unknown, isAllowedHost: (host: string) => boolean): UrlValidationResult {
  const value = typeof input === "string" ? input.trim() : "";

  if (value === "") {
    return { kind: "invalid", error: "required" };
  }

  if (value.length > MAX_URL_LENGTH) {
    return { kind: "invalid", error: "too-long" };
  }

  const url = parseHttpsUrl(withHttpsScheme(value));
  if (!url) {
    return { kind: "invalid", error: "invalid-format" };
  }

  const isAllowedPort = url.port === "" || url.port === "443";
  if (!isAllowedPort || !isAllowedHost(normaliseHost(url.hostname))) {
    return { kind: "invalid", error: "host-not-allowed" };
  }

  return { kind: "valid", url };
}

// The form asks for the URL without its scheme: Front Door's WAF blocks request
// bodies that contain "https://", so the scheme is added here instead.
function withHttpsScheme(value: string): string {
  return SCHEME_OR_ROOT_PATTERN.test(value) ? value : `https://${value}`;
}

function parseHttpsUrl(value: string): URL | undefined {
  try {
    const url = new URL(value);
    const hasCredentials = url.username !== "" || url.password !== "";
    return url.protocol === "https:" && !hasCredentials ? url : undefined;
  } catch {
    return undefined;
  }
}

export type UrlValidationError = "required" | "too-long" | "invalid-format" | "host-not-allowed";

export type UrlValidationResult = { kind: "valid"; url: URL } | { kind: "invalid"; error: UrlValidationError };
