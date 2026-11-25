import type { Page } from "playwright";

// CFT IDAM's sign-in form, filled as CaTH's E2E suite fills it (e2e-tests/utils/cft-idam-helpers.ts),
// which tracks IDAM's pages: the new hmcts-access UI asks for the email and the password on separate
// pages, the classic one on one. CaTH and pip both send CFT users to it from /cft-login.
export const SIGN_IN_TIMEOUT_MS = 30_000;
export const CFT_LOGIN_PATH = "/cft-login";

export async function cftIdamForm(page: Page, email: string, password: string): Promise<void> {
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
