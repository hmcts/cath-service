import { expect, type Page } from "@playwright/test";

// Activates "Back to top" with the keyboard and checks focus lands on <main> so the next Tab
// reaches the first focusable element in the main content (WCAG 2.4.3).
export async function expectBackToTopMovesFocusToMain(page: Page, linkName: string) {
  const backToTop = page.getByRole("link", { name: linkName, exact: true });
  await expect(backToTop).toHaveAttribute("href", "#main-content");

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
