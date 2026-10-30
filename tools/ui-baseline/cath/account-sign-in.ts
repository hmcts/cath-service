import { launchChromium } from "@hmcts/ui-baseline";
import type { BrowserContext, Page } from "playwright";
import type { Environment, TestAccount } from "../environments.js";
import type { ParityUser } from "../fixtures/manifest.js";
import { CATH_ROLE, LOCALES, type SignIns } from "./sign-ins.js";

// Signs in to a deployed CaTH as a real test account per role, through the same sign-in flows
// people use, and hands back each session's cookies, one session per language as CaTH keeps the
// language in the session. Fixture users with the same CaTH role share that role's account, so a
// page is captured with the account's name and email rather than the fixture user's. A role whose
// account is not in the environment's vault is reported, and its pages are not compared.
const FLOW_ENTRY: Record<TestAccount["flow"], string> = { sso: "/login", crime: "/crime-login", cft: "/cft-login" };
const SIGN_IN_TIMEOUT_MS = 30_000;

export async function signInWithAccounts(environment: Environment, users: ParityUser[]): Promise<SignIns> {
  const { cath } = environment;
  const result: SignIns = { users: {}, cathUsers: {}, unavailable: {} };
  const browser = await launchChromium();
  try {
    const roles = [...new Set(users.map((user) => required(CATH_ROLE[user.role], `CaTH role for ${user.id} (${user.role})`)))];
    for (const role of roles) {
      const holders = users.filter((user) => CATH_ROLE[user.role] === role);
      const account = cath.accounts?.[role];
      const email = account && (await environment.secret(cath, account.user));
      const password = account && (await environment.secret(cath, account.password));
      if (!account || !email || !password) {
        const reason = account ? `no ${role} test account in ${cath.keyVault ?? "the environment"} (${account.user})` : `no ${role} test account configured`;
        for (const user of holders) result.unavailable[user.id] = reason;
        continue;
      }

      const cookies: SignIns["users"][string]["cookies"] = {};
      for (const locale of LOCALES) {
        const context = await browser.newContext({ ignoreHTTPSErrors: true });
        try {
          cookies[locale] = await signIn(context, cath.baseUrl, account.flow, email, password, locale);
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

async function signIn(
  context: BrowserContext,
  baseUrl: string,
  flow: TestAccount["flow"],
  email: string,
  password: string,
  locale: string
): Promise<{ name: string; value: string }[]> {
  const page = await context.newPage();
  const host = new URL(baseUrl).hostname;
  await page.goto(`${baseUrl}${FLOW_ENTRY[flow]}?lng=${locale}`);
  if (flow === "sso") await ssoForm(page, email, password);
  else if (flow === "crime") await crimeIdamForm(page, email, password);
  else await cftIdamForm(page, email, password);
  await page.waitForURL((url) => url.hostname === host, { timeout: SIGN_IN_TIMEOUT_MS });
  // The language a session's pages render in is the last one it asked for
  await page.goto(`${baseUrl}/?lng=${locale}`);
  const cookies = await context.cookies(baseUrl);
  if (!cookies.length) throw new Error(`signing in through ${flow} left no CaTH session`);
  return cookies.map(({ name, value }) => ({ name, value }));
}

// The forms below follow the E2E suite's helpers (e2e-tests/utils), which track the providers' pages
async function ssoForm(page: Page, email: string, password: string): Promise<void> {
  await page.waitForURL(/login\.microsoftonline\.com/, { timeout: SIGN_IN_TIMEOUT_MS });
  await page.fill('input[type="email"]', email);
  await page.click('input[type="submit"]');
  await page.fill('input[type="password"]', password);
  await page.click('input[type="submit"]');
  const staySignedIn = page.locator('input[type="submit"][value="Yes"]');
  if (await staySignedIn.isVisible({ timeout: 5000 }).catch(() => false)) await staySignedIn.click();
}

async function crimeIdamForm(page: Page, email: string, password: string): Promise<void> {
  const emailInput = page.locator('input[name="IDToken1"], input[type="text"]').first();
  await emailInput.waitFor({ state: "visible", timeout: SIGN_IN_TIMEOUT_MS });
  await emailInput.fill(email);
  await page.locator('input[name="IDToken2"], input[type="password"]').first().fill(password);
  await page.locator('input[type="submit"], button[type="submit"]').first().click();
}

async function cftIdamForm(page: Page, email: string, password: string): Promise<void> {
  const classic = page.locator('input[type="text"]#username, input[type="email"]#username, input[name="username"]');
  const modern = page.locator("input#email");
  await classic.or(modern).first().waitFor({ state: "visible", timeout: SIGN_IN_TIMEOUT_MS });
  if (await modern.isVisible()) {
    await modern.fill(email);
    await page.getByRole("button", { name: /^(continue|parhau)$/i }).click();
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole("button", { name: /^(continue|parhau)$/i }).click();
  } else {
    await classic.fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('input[type="submit"], button[type="submit"]').first().click();
  }
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
