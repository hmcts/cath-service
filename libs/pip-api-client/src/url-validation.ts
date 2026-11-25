import { normaliseHost } from "./allowed-hosts.js";

const MAX_URL_LENGTH = 2048;

export function validatePipUrl(input: unknown, allowedHosts: readonly string[]): UrlValidationResult {
  const value = typeof input === "string" ? input.trim() : "";

  if (value === "") {
    return { kind: "invalid", error: "required" };
  }

  if (value.length > MAX_URL_LENGTH) {
    return { kind: "invalid", error: "too-long" };
  }

  const url = parseHttpsUrl(value);
  if (!url) {
    return { kind: "invalid", error: "invalid-format" };
  }

  const isAllowedPort = url.port === "" || url.port === "443";
  if (!isAllowedPort || !allowedHosts.includes(normaliseHost(url.hostname))) {
    return { kind: "invalid", error: "host-not-allowed" };
  }

  return { kind: "valid", url };
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
