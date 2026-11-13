import { buildB2cLogoutUrl } from "../b2c/logout-url.js";
import { buildCftIdamLogoutUrl } from "../cft-idam/logout-url.js";
import { getCftIdamConfig } from "../config/cft-idam-config.js";

export const RE_SIGN_IN_URLS = {
  CFT: "/cft-login",
  CRIME: "/crime-login",
  AAD: "/b2c-login",
  SSO: "/login"
} as const;

export function getRedirectType(provenance: string | undefined): RedirectType {
  switch (provenance) {
    case "PI_AAD":
      return "AAD";
    case "CRIME_IDAM":
      return "CRIME";
    case "SSO":
      return "SSO";
    default:
      return "CFT";
  }
}

export function isRedirectType(value: unknown): value is RedirectType {
  return typeof value === "string" && Object.hasOwn(RE_SIGN_IN_URLS, value);
}

export function buildSessionExpiredPath(redirectType: RedirectType, locale: string | undefined): string {
  const lng = locale === "cy" ? "cy" : "en";
  return `/session-expired?lng=${lng}&reSignInUrl=${redirectType}`;
}

export function buildSessionExpiredRedirectUrl({ provenance, locale, origin }: SessionExpiredRedirectOptions): string {
  const sessionExpiredPath = buildSessionExpiredPath(getRedirectType(provenance), locale);

  if (provenance === "CFT_IDAM") {
    return buildCftIdamLogoutUrl(sessionExpiredPath, getCftIdamConfig());
  }

  if (provenance === "PI_AAD") {
    return buildB2cLogoutUrl(`${origin}${sessionExpiredPath}`);
  }

  return sessionExpiredPath;
}

export type RedirectType = keyof typeof RE_SIGN_IN_URLS;

interface SessionExpiredRedirectOptions {
  provenance: string | undefined;
  locale: string | undefined;
  origin: string;
}
