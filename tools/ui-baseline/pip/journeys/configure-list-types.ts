import type { Journey } from "@hmcts/ui-baseline";
import { link, primaryButton, unsubscribeFromEverything } from "./steps.js";

// Ported from pip's verified/email-subscriptions-test.ts ("filter and select which list type to
// receive"): editing the list types and language of an existing court subscription.
const COURT = "2";

export const configureListTypes: Journey = {
  id: "configure-list-types",
  description: "Verified user subscribes to a court, then changes which list types and language they receive",
  viewAs: "journey-subscriber",
  run: async ({ page, goto, act, checkpoint }) => {
    const continueButton = () => primaryButton(page);

    await goto("/subscription-add");
    await act(`subscribe to court ${COURT} for the civil and family list in English`, async () => {
      await page.locator("#subscription-choice-1").check();
      await continueButton().click();
      await page.waitForLoadState("networkidle");
      await page.locator(`input[type=checkbox][id="${COURT}"]`).check();
      await continueButton().click();
      await page.waitForLoadState("networkidle");
      await continueButton().click();
      await page.waitForLoadState("networkidle");
      await page.locator("#CIVIL_AND_FAMILY_DAILY_CAUSE_LIST").check();
      await continueButton().click();
      await page.waitForLoadState("networkidle");
      await page.locator("#english").check();
      await continueButton().click();
      await page.waitForLoadState("networkidle");
      await continueButton().click();
    });
    await checkpoint("subscription-confirmed");
    await act("email subscriptions", () => link(page, "/subscription-management").click());
    await act("edit list types", () => link(page, "/subscription-configure-list").click());
    await checkpoint("subscription-configure-list");
    await act("swap the civil and family list for the civil list and the family list", async () => {
      await page.locator("#CIVIL_AND_FAMILY_DAILY_CAUSE_LIST").uncheck();
      await page.locator("#CIVIL_DAILY_CAUSE_LIST").check();
      await page.locator("#FAMILY_DAILY_CAUSE_LIST").check();
      await continueButton().click();
    });
    await checkpoint("subscription-configure-list-language");
    // The subscription's current language is already selected, so there is no empty-answer error here
    await act("continue with the current language", () => continueButton().click());
    await checkpoint("subscription-configure-list-preview");
    await act("remove the family list", () => link(page, "/remove-configure-list?list-type=FAMILY_DAILY_CAUSE_LIST").click());
    await checkpoint("subscription-configure-list-preview-after-remove");
    await act("confirm", () => continueButton().click());
    await checkpoint("subscription-configure-list-confirmed");

    await unsubscribeFromEverything(page, new URL(page.url()).origin);
  }
};
