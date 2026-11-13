import type { BrowserContext } from "playwright";
import { acceptsUnverifiedCertificate, launchChromium } from "../core/index.js";
import type { Environment } from "../environments.js";
import type { ParityUser } from "../fixtures/manifest.js";
import { CFT_LOGIN_PATH, cftIdamForm, SIGN_IN_TIMEOUT_MS } from "../sign-in-forms.js";
import { CATH_ROLE, LOCALES, type SignIns } from "./sign-ins.js";

// Signs in to a deployed CaTH as a real test account per role, through CFT IDAM as people do, and
// hands back each session's cookies, one session per language as CaTH keeps the
// language in the session. Fixture users with the same CaTH role share that role's account, so a
// page is captured with the account's name and email rather than the fixture user's. IDAM only
// makes verified users, so only VERIFIED has an account; a role with none, or whose account is not
// in its vault, is reported, and its pages are not compared.

export async function signInWithAccounts(environment: Environment, users: ParityUser[]): Promise<SignIns> {
  const { cath } = environment;
  const result: SignIns = { users: {}, cathUsers: {}, unavailable: {} };
  const browser = await launchChromium();
  try {
    const roles = [...new Set(users.map((user) => required(CATH_ROLE[user.role], `CaTH role for ${user.id} (${user.role})`)))];
    for (const role of roles) {
      const holders = users.filter((user) => CATH_ROLE[user.role] === role);
      const account = cath.accounts?.[role];
      const vault = { ...cath, keyVault: account?.keyVault ?? cath.keyVault };
      const email = account && (await environment.secret(vault, account.user));
      const password = account && (await environment.secret(vault, account.password));
      if (!account || !email || !password) {
        const reason = account ? `no ${role} test account in ${vault.keyVault ?? "the environment"} (${account.user})` : `no ${role} test account configured`;
        for (const user of holders) result.unavailable[user.id] = reason;
        continue;
      }

      const cookies: SignIns["users"][string]["cookies"] = {};
      for (const locale of LOCALES) {
        const context = await browser.newContext({ ignoreHTTPSErrors: acceptsUnverifiedCertificate(cath.baseUrl) });
        try {
          cookies[locale] = await signIn(context, cath.baseUrl, email, password, locale);
        } finally {
          await context.close();
        }
      }
      const user = await findUser(cath.apiUrl, email);
      for (const holder of holders) {
        result.users[holder.id] = { userId: user.userId, role, cookies };
        result.cathUsers[holder.id] = { userId: user.userId, email: user.email, role: user.role, provenance: user.userProvenance };
      }
      console.log(`signed in as the ${role} test account for ${holders.map((holder) => holder.id).join(", ")}`);
    }
  } finally {
    await browser.close();
  }
  return result;
}

async function signIn(context: BrowserContext, baseUrl: string, email: string, password: string, locale: string): Promise<{ name: string; value: string }[]> {
  const page = await context.newPage();
  const host = new URL(baseUrl).hostname;
  await page.goto(`${baseUrl}${CFT_LOGIN_PATH}?lng=${locale}`);
  await cftIdamForm(page, email, password);
  await page.waitForURL((url) => url.hostname === host, { timeout: SIGN_IN_TIMEOUT_MS });
  // The language a session's pages render in is the last one it asked for
  await page.goto(`${baseUrl}/?lng=${locale}`);
  const cookies = await context.cookies(baseUrl);
  if (!cookies.length) throw new Error(`signing in through CFT IDAM left no CaTH session`);
  return cookies.map(({ name, value }) => ({ name, value }));
}

async function findUser(apiUrl: string, email: string): Promise<{ userId: string; email: string; role: string; userProvenance: string }> {
  const response = await fetch(`${apiUrl}/test-support/users?${new URLSearchParams({ email })}`);
  if (!response.ok) throw new Error(`CaTH has no user for the test account after it signed in: ${response.status}`);
  return (await response.json()) as { userId: string; email: string; role: string; userProvenance: string };
}

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`missing ${what}`);
  return value;
}
