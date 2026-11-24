import { expect, type Page } from "@playwright/test";

// Activates "Back to top" with the keyboard and checks focus lands on <main> so the next Tab
// reaches the first focusable element in the main content (WCAG 2.4.3).
export async function expectBackToTopMovesFocusToMain(page: Page, linkName: string) {
  const backToTop = page.getByRole("link", { name: linkName, exact: true });
  await expect(backToTop).toHaveAttribute("href", "#main-content");

  // Focusing <main> is done by web.js; without this wait a slow script load leaves only the plain
  // fragment jump, which does not move focus. initAll() marks the skip link in the same task that
  // wires up the back to top link.
  await page.locator(".govuk-skip-link[data-govuk-skip-link-init]").waitFor({ state: "attached" });

  await backToTop.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => {
    const main = document.getElementById("main-content");
    const focusable = main?.querySelector<HTMLElement>(
      "a[href], button:not([disabled]), input:not([type='hidden']):not([disabled]), select, textarea, [tabindex='0']"
    );
    return { isInMain: !!main?.contains(document.activeElement), isFirstInMain: document.activeElement === focusable };
  });
  expect(focus.isInMain).toBe(true);
  expect(focus.isFirstInMain).toBe(true);
}
