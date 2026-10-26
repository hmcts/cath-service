import { locationData } from "@hmcts/location/location-data";
import type { Page } from "playwright";

// Locale-neutral helpers: journeys run in English and Welsh, so they select by id, name and
// link target rather than by visible text.
// The submit button of the page's last form: pip's filter layouts put the filter form first
export function primaryButton(page: Page) {
  return page
    .locator("main form")
    .filter({ has: page.locator("button[type=submit], input[type=submit]") })
    .last()
    .locator("button[type=submit], input[type=submit]")
    .first();
}

// pip mixes absolute ("/subscription-add") and relative ("subscription-add") hrefs
export function link(page: Page, href: string) {
  const relative = href.replace(/^\//, "");
  return page.locator([href, relative].flatMap((target) => [`a[href="${target}"]`, `a[href^="${target}?"]`]).join(", ")).first();
}

// Leaves the signed-in user with no subscriptions, without capturing anything; journeys that do
// not end empty call it so the next locale's run starts from the same state
export async function unsubscribeFromEverything(page: Page, baseUrl: string): Promise<void> {
  await page.goto(`${baseUrl}/bulk-unsubscribe`, { waitUntil: "networkidle" });
  const selectAll = await page.locator("#select-all-cases, #select-all-locations").all();
  if (selectAll.length === 0) return;
  for (const checkbox of selectAll) await checkbox.check();
  await page.locator("#bulk-unsubscribe-button").click();
  await page.waitForLoadState("networkidle");
  await page.locator('input[name="bulk-unsubscribe-choice"]').first().check();
  await primaryButton(page).click();
  await page.waitForLoadState("networkidle");
}

// pip matches court searches against the name in the page's language, so journeys type the Welsh
// name in Welsh runs. Names come from location-data.ts, which both apps' reference data is built from.
export function courtName(locationId: number, locale: string): string {
  const location = locationData.locations.find((candidate) => candidate.locationId === locationId);
  if (!location) throw new Error(`location ${locationId} is not in location-data.ts`);
  return locale === "cy" ? location.welshName : location.name;
}

// Types a court name into pip's autocomplete and picks the matching suggestion, as a user would.
// Leaving the suggestion list open covers the Continue button on some pages.
export async function chooseCourt(page: Page, name: string): Promise<void> {
  await page.locator("#search-input").fill(name);
  const suggestion = page.locator("#search-input__listbox li[role=option]").filter({ hasText: name }).first();
  if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) await suggestion.click();
}
