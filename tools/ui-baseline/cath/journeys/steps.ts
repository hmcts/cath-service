import { locationData } from "@hmcts/location/location-data";
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

// A court's English and Welsh names, from location-data.ts, which CaTH's reference data is built from
export function courtNames(locationId: number): CourtNames {
  const location = locationData.locations.find((candidate) => candidate.locationId === locationId);
  if (!location) throw new Error(`location ${locationId} is not in location-data.ts`);
  return { name: location.name, welshName: location.welshName };
}

// Types a court name into CaTH's autocomplete and picks the matching suggestion. The name is in the
// language the input's data-locale asks for, which is not always the page's: manual upload is
// English only. The enhanced input reuses the original's id, so the two are told apart by its wrapper.
export async function chooseCourt(page: Page, inputId: string, court: CourtNames): Promise<void> {
  const locale = await page.locator(`input#${inputId}[data-autocomplete]`).getAttribute("data-locale");
  const name = locale === "cy" ? court.welshName : court.name;
  const input = page.locator(`#${inputId}-autocomplete-wrapper input#${inputId}`);
  await input.fill(name);
  await page.locator(`#${inputId}__listbox li[role=option]`).filter({ hasText: name }).first().click();
}

export interface CourtNames {
  name: string;
  welshName: string;
}
