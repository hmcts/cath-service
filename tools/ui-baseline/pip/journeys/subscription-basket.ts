import type { Journey } from "@hmcts/ui-baseline";
import { link, primaryButton, unsubscribeFromEverything } from "./steps.js";

// Ported from pip's verified/email-subscriptions-test.ts ("remove subscriptions or add new
// subscription while subscribing by location"): removing courts from the pending basket and the
// confirmation preview, adding another court and changing the list language.
const FIRST_COURT = "1";
const SECOND_COURT = "2";

export const subscriptionBasket: Journey = {
  id: "subscription-basket",
  description: "Verified user adds, removes and re-adds courts before confirming, and changes the list language",
  viewAs: "journey-subscriber",
  run: async ({ page, goto, act, checkpoint }) => {
    const continueButton = () => primaryButton(page);
    const chooseCourts = async (...courts: string[]) => {
      await page.locator("#subscription-choice-1").check();
      await continueButton().click();
      await page.waitForLoadState("networkidle");
      for (const court of courts) await page.locator(`input[type=checkbox][id="${court}"]`).check();
      await continueButton().click();
    };

    await goto("/subscription-add");
    await act(`choose courts ${FIRST_COURT} and ${SECOND_COURT}`, () => chooseCourts(FIRST_COURT, SECOND_COURT));
    await checkpoint("pending-subscriptions-two-courts");
    await act(`remove court ${SECOND_COURT}`, () => link(page, `/remove-subscription?court=${SECOND_COURT}`).click());
    await checkpoint("pending-subscriptions-after-remove");
    await act("add another email subscription", () => link(page, "/subscription-add").click());
    await act(`choose court ${SECOND_COURT} again`, () => chooseCourts(SECOND_COURT));
    await checkpoint("pending-subscriptions-re-added");
    await act("continue", () => continueButton().click());
    await act("select first list type and continue", async () => {
      await page.locator("#list-types-table input[type=checkbox]").first().check();
      await continueButton().click();
    });
    await act("choose English and continue", async () => {
      await page.locator("#english").check();
      await continueButton().click();
    });
    await checkpoint("subscription-confirmation-preview");
    await act(`remove court ${SECOND_COURT} from the preview`, () => link(page, `/remove-pending-subscription?court=${SECOND_COURT}`).click());
    await checkpoint("subscription-confirmation-preview-after-remove");
    await act("change list language", () => link(page, "/subscription-add-list-language").click());
    await act("choose Welsh and continue", async () => {
      await page.locator("#welsh").check();
      await continueButton().click();
    });
    await checkpoint("subscription-confirmation-preview-welsh");
    await act("confirm subscriptions", () => continueButton().click());
    await checkpoint("subscription-confirmed");

    await unsubscribeFromEverything(page, new URL(page.url()).origin);
  }
};
