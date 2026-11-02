import type { Page } from "playwright";

// Locale-neutral helpers for CaTH's journeys, the counterparts of pip/journeys/steps.ts. They
// select by id, name and value rather than visible text, so the same journey runs in Welsh.
// CaTH's own submit buttons are GOV.UK buttons; its inline "Remove" and "Change" forms use link-styled buttons
export function primaryButton(page: Page) {
  return page.locator("main form button.govuk-button, main form input[type=submit].govuk-button").last();
}

// The link-styled button of the inline form that posts this action, for one location if given
export function inlineAction(page: Page, action: string, locationId?: string) {
  const form = page.locator("main form").filter({ has: page.locator(`input[name=action][value="${action}"]`) });
  return (locationId ? form.filter({ has: page.locator(`input[name=locationId][value="${locationId}"]`) }) : form).locator("button").first();
}

export function link(page: Page, href: string) {
  return page.locator(`main a[href="${href}"], main a[href^="${href}?"]`).first();
}

// Leaves the signed-in user with no subscriptions, without capturing anything, as pip's helper does
export async function unsubscribeFromEverything(page: Page, baseUrl: string): Promise<void> {
  await page.goto(`${baseUrl}/bulk-unsubscribe`, { waitUntil: "networkidle" });
  const subscriptions = await page.locator("#all-subscriptions input[name=subscriptions]").all();
  if (subscriptions.length === 0) return;
  for (const checkbox of subscriptions) await checkbox.check();
  await primaryButton(page).click();
  await page.waitForLoadState("networkidle");
  await page.locator('input[name="confirm"][value="yes"]').check();
  await primaryButton(page).click();
  await page.waitForLoadState("networkidle");
}
