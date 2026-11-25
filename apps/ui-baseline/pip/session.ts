import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvironment } from "../environments.js";
import type { ParityUser } from "../fixtures/manifest.js";
import type { PipSignIns } from "./account-sign-in.js";
import { pipSignInUrl } from "./sign-in-url.js";

// Which pip a recording captures and how it is signed in there as a fixture user, for the steps of
// pip/baseline.sh. UI_BASELINE_PIP_ENV picks the environment: local (the default) is the local stack,
// signed in through /parity-login before each page (pip-frontend.patch); any other is a deployed pip,
// signed in with the sessions pip/sign-in.ts saved, which are per language because pip keeps the
// language in the session. A fixture user with no session there is reported, and not captured.
const PARITY_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function loadPipSessions(environmentName = process.env.UI_BASELINE_PIP_ENV ?? "local"): Promise<PipSessions> {
  const apps = JSON.parse(await readFile(path.join(PARITY_DIR, "apps.json"), "utf-8"));
  const local = apps.pip as { baseUrl: string; signIn: string; cookies: Cookie[] };
  if (environmentName === "local") {
    return {
      environment: environmentName,
      baseUrl: local.baseUrl,
      cookies: local.cookies,
      signIn: (user) => ({ setup: [pipSignInUrl(local, user)] })
    };
  }

  const environment = await loadEnvironment(environmentName);
  if (!environment.pip.baseUrl) throw new Error(`environment ${environmentName} has no pip baseUrl`);
  const file = path.join(PARITY_DIR, "output/seed", `pip-sign-in-${environmentName}.json`);
  if (!existsSync(file)) throw new Error(`no ${path.basename(file)}: sign in to pip first (tsx apps/ui-baseline/pip/sign-in.ts --env ${environmentName})`);
  const signIns = JSON.parse(await readFile(file, "utf-8")) as PipSignIns;
  return {
    environment: environmentName,
    baseUrl: environment.pip.baseUrl,
    cookies: local.cookies,
    signIn: (user, locale = "en") => {
      const session = signIns.users[user.id]?.cookies[locale];
      if (session) return { cookies: session };
      return { unavailable: signIns.unavailable[user.id] ?? `${user.id} was not signed in to pip ${environmentName}` };
    }
  };
}

// A capture target as a fixture user, in each of its languages: one target for both where sign-in
// is a page to visit, one per language where it is that language's session, none where the user
// cannot be signed in (with why)
export function signedInTargets<T extends SignedInTarget>(sessions: PipSessions, target: T, user: ParityUser): { targets: T[]; unavailable?: string } {
  const first = sessions.signIn(user, target.locales[0]);
  if ("unavailable" in first) return { targets: [], unavailable: first.unavailable };
  if (first.setup) return { targets: [{ ...target, setup: first.setup }] };
  const targets = target.locales.flatMap((locale) => {
    const session = sessions.signIn(user, locale);
    return "cookies" in session && session.cookies ? [{ ...target, locales: [locale], cookies: [...(target.cookies ?? []), ...session.cookies] }] : [];
  });
  return { targets };
}

export interface PipSessions {
  environment: string;
  baseUrl: string;
  // The consent cookies every capture sends, so banners stay out of the page frame
  cookies: Cookie[];
  signIn: (user: ParityUser, locale?: string) => PipSession;
}

export type PipSession = { setup: string[]; cookies?: undefined } | { cookies: Cookie[]; setup?: undefined } | { unavailable: string };

export interface SignedInTarget {
  locales: string[];
  cookies?: Cookie[];
  setup?: string[];
}

interface Cookie {
  name: string;
  value: string;
}
