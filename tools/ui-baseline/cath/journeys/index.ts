import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { JourneySuite } from "@hmcts/ui-baseline";
import type { Page } from "playwright";
import { loadEnvironment } from "../../environments.js";
import type { SignInResult } from "../sign-in.js";
import { subscriptionBasket } from "./subscription-basket.js";

// CaTH's journeys for `parity journeys --module`, compared with pip's journey of the same id.
// Only journeys ported so far are here; check.ts reports the rest of pip's as not run. Needs the
// sign-in file cath/sign-in.ts writes (check.ts runs it first); PARITY_TARGET overrides the base URL.
const PARITY_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

const config = JSON.parse(await readFile(path.join(PARITY_DIR, "apps.json"), "utf-8")).cath;
const environment = await loadEnvironment();
const baseUrl = process.env.PARITY_TARGET ?? environment.cath.baseUrl;
const signInFile = process.env.PARITY_SIGN_IN_OUTPUT ?? path.join(PARITY_DIR, "output/seed", `cath-sign-in-${environment.name}.json`);
const signedIn = JSON.parse(await readFile(signInFile, "utf-8").catch(() => "null")) as SignInResult | null;

const suite: JourneySuite = {
  app: "cath",
  baseUrl,
  cookies: config.cookies,
  // CaTH's list type ids by name, which differ between environments
  data: { listTypes: signedIn?.listTypes ?? {} },
  signIn: async (page: Page, userId: string, locale: string) => {
    if (!signedIn) throw new Error(`no CaTH sign-in at ${signInFile}: run cath/sign-in.ts first`);
    const unavailable = signedIn.unavailable[userId];
    if (unavailable) throw new Error(`${userId} cannot sign in to CaTH here: ${unavailable}`);
    const cookies = signedIn.users[userId]?.cookies[locale];
    if (!cookies) throw new Error(`no CaTH session for ${userId} (${locale}) in ${signInFile}`);
    await page.context().addCookies(cookies.map((cookie) => ({ ...cookie, url: baseUrl })));
  },
  journeys: [subscriptionBasket]
};

export default suite;
