import type { BrowserContext } from "playwright";
import { launchChromium } from "../core/index.js";
import type { Environment } from "../environments.js";
import type { ParityUser } from "../fixtures/manifest.js";
import { CFT_LOGIN_PATH, cftIdamForm, SIGN_IN_TIMEOUT_MS } from "../sign-in-forms.js";

// Signs in to a deployed pip as a real test account per role and provenance, through CFT IDAM as
// people do, instead of the local stack's /parity-login (pip-frontend.patch). Hands back
// each session's cookies, one session per language as pip keeps the language in the session
// (keepSessionLanguage). Fixture users with the same role and provenance share the account, so a
// page shows the account's name rather than the fixture user's. A sign-in only counts once the
// role's own home page opens, so an account that signs in without the role is reported, not used.
// IDAM only makes verified CFT users, so every other role and provenance is reported as not compared.
const LOCALES = ["en", "cy"];
// The page each role lands on, which pip redirects away from when the session lacks the role
const ROLE_HOME: Record<string, string> = {
  VERIFIED: "/account-home",
  SYSTEM_ADMIN: "/system-admin-dashboard",
  INTERNAL_SUPER_ADMIN_CTSC: "/admin-dashboard",
  INTERNAL_SUPER_ADMIN_LOCAL: "/admin-dashboard",
  INTERNAL_ADMIN_CTSC: "/admin-dashboard",
  INTERNAL_ADMIN_LOCAL: "/admin-dashboard"
};

export async function signInToPipWithAccounts(environment: Environment, users: ParityUser[]): Promise<PipSignIns> {
  const { pip } = environment;
  if (!pip.baseUrl) throw new Error(`environment ${environment.name} has no pip baseUrl`);
  const result: PipSignIns = { users: {}, unavailable: {} };
  const browser = await launchChromium();
  try {
    for (const key of [...new Set(users.map(accountKey))]) {
      const holders = users.filter((user) => accountKey(user) === key);
      const account = pip.accounts?.[key];
      const vault = { ...pip, keyVault: account?.keyVault ?? pip.keyVault };
      const email = account && (await environment.secret(vault, account.user));
      const password = account && (await environment.secret(vault, account.password));
      if (!account || !email || !password) {
        const reason = account ? `no ${key} test account in ${vault.keyVault ?? "the environment"} (${account.user})` : `no ${key} test account configured`;
        for (const user of holders) result.unavailable[user.id] = reason;
        continue;
      }

      const role = holders[0].role;
      try {
        const cookies: PipSignedInUser["cookies"] = {};
        for (const locale of LOCALES) {
          const context = await browser.newContext({ ignoreHTTPSErrors: true });
          try {
            cookies[locale] = await signIn(context, pip.baseUrl, role, email, password, locale);
          } finally {
            await context.close();
          }
        }
        for (const holder of holders) result.users[holder.id] = { account: key, email, role, cookies };
        console.log(`signed in to pip as the ${key} test account for ${holders.map((holder) => holder.id).join(", ")}`);
      } catch (error) {
        const reason = `signing in as the ${key} test account failed: ${(error as Error).message.split("\n")[0]}`;
        for (const user of holders) result.unavailable[user.id] = reason;
      }
    }
  } finally {
    await browser.close();
  }
  return result;
}

function accountKey(user: ParityUser): string {
  return `${user.role}/${user.provenance}`;
}

async function signIn(
  context: BrowserContext,
  baseUrl: string,
  role: string,
  email: string,
  password: string,
  locale: string
): Promise<{ name: string; value: string }[]> {
  const page = await context.newPage();
  const host = new URL(baseUrl).hostname;
  await page.goto(`${baseUrl}${CFT_LOGIN_PATH}?lng=${locale}`);
  await cftIdamForm(page, email, password);
  await page.waitForURL((url) => url.hostname === host, { timeout: SIGN_IN_TIMEOUT_MS });

  const home = ROLE_HOME[role];
  if (!home) throw new Error(`no home page known for pip role ${role}`);
  // The language a session's pages render in is the last one it asked for
  await page.goto(`${baseUrl}${home}?lng=${locale}`);
  const landed = new URL(page.url());
  if (landed.hostname !== host || landed.pathname !== home)
    throw new Error(`signed in, but ${home} sent the session to ${landed.pathname}: the account may lack the ${role} role`);

  const cookies = await context.cookies(baseUrl);
  if (!cookies.length) throw new Error(`signing in through CFT IDAM left no pip session`);
  return cookies.map(({ name, value }) => ({ name, value }));
}

export interface PipSignIns {
  users: Record<string, PipSignedInUser>;
  // Fixture users that could not be signed in, with why
  unavailable: Record<string, string>;
}

export interface PipSignedInUser {
  // The accounts key ("<role>/<provenance>") whose test account the session belongs to
  account: string;
  // The account's email, which pip's accounts are looked up by (pip/seed.ts)
  email: string;
  role: string;
  // The session's cookies, per language
  cookies: Record<string, { name: string; value: string }[]>;
}
