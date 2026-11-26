import type { Page } from "@playwright/test";

// Admin users get no language toggle link (libs/web-core locale-middleware), so admin pages switch language through
// the lng query parameter. The locale is kept in the session, so a test that switches to Welsh must switch back.
export async function switchLanguage(page: Page, locale: "en" | "cy"): Promise<void> {
  const url = new URL(page.url());
  url.searchParams.set("lng", locale);
  await page.goto(url.toString());
}
