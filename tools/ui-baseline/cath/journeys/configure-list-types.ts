import type { Journey } from "@hmcts/ui-baseline";
import type { CathJourneyData } from "./index.js";
import { link, primaryButton, unsubscribeFromEverything } from "./steps.js";

// CaTH's side of pip/journeys/configure-list-types.ts: editing the list types and language of an
// existing court subscription. CaTH removes a list type from the preview with a button rather than
// a link, and identifies list types by id, looked up here by name.
const COURT = "2";
const CIVIL_AND_FAMILY = "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST";
const CIVIL = "CIVIL_DAILY_CAUSE_LIST";
const FAMILY = "FAMILY_DAILY_CAUSE_LIST";

export const configureListTypes: Journey = {
  id: "configure-list-types",
  description: "Verified user subscribes to a court, then changes which list types and language they receive",
  viewAs: "journey-subscriber",
  run: async ({ page, goto, act, checkpoint, data }) => {
    const { listTypes } = data as unknown as CathJourneyData;
    const listType = (name: string) => {
      const id = listTypes[name];
      if (!id) throw new Error(`CaTH has no ${name} list type`);
      return page.locator(`#listType_${id}`);
    };
    const continueButton = () => primaryButton(page);

    await goto("/add-email-subscription");
    await act(`subscribe to court ${COURT} for the civil and family list in English`, async () => {
      await page.locator('input[name="subscriptionMethod"][value="courtOrTribunal"]').check();
      await continueButton().click();
      await page.waitForLoadState("networkidle");
      await page.locator(`#location-${COURT}`).check();
      await continueButton().click();
      await page.waitForLoadState("networkidle");
      await continueButton().click();
      await page.waitForLoadState("networkidle");
      await listType(CIVIL_AND_FAMILY).check();
      await continueButton().click();
      await page.waitForLoadState("networkidle");
      await page.locator('input[name="language"][value="ENGLISH"]').check();
      await continueButton().click();
      await page.waitForLoadState("networkidle");
      await continueButton().click();
    });
    await checkpoint("subscription-confirmed");
    await act("email subscriptions", () => link(page, "/subscription-management").click());
    await act("edit list types", () => link(page, "/subscription-configure-list").click());
    await checkpoint("subscription-configure-list");
    await act("swap the civil and family list for the civil list and the family list", async () => {
      await listType(CIVIL_AND_FAMILY).uncheck();
      await listType(CIVIL).check();
      await listType(FAMILY).check();
      await continueButton().click();
    });
    await checkpoint("subscription-configure-list-language");
    // The subscription's current language is already selected, so there is no empty-answer error here
    await act("continue with the current language", () => continueButton().click());
    await checkpoint("subscription-configure-list-preview");
    await act("remove the family list", () =>
      page
        .locator("main form")
        .filter({ has: page.locator(`input[name=listTypeId][value="${listTypes[FAMILY]}"]`) })
        .filter({ has: page.locator('input[name=action][value="remove-list-type"]') })
        .locator("button")
        .click()
    );
    await checkpoint("subscription-configure-list-preview-after-remove");
    await act("confirm", () => continueButton().click());
    await checkpoint("subscription-configure-list-confirmed");

    await unsubscribeFromEverything(page, new URL(page.url()).origin);
  }
};
