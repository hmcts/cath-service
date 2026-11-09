import { type Journey, settle } from "../../core/index.js";
import type { CathJourneyData } from "./index.js";
import { inlineAction, link, primaryButton, unsubscribeFromEverything } from "./steps.js";

// CaTH's side of pip/journeys/subscription-basket.ts: the same user goal, with the same checkpoint
// names, through CaTH's own pages. Where CaTH does a step differently (a Remove button rather than a
// link, choosing the method on /add-email-subscription), the action says so.
const FIRST_COURT = "1";
const SECOND_COURT = "2";
// Chosen by name, not position: CaTH orders list types by their name in the page's language, so
// the first in Welsh is a family list that court 1 does not hear, and confirming then fails
const LIST_TYPE = "CIVIL_DAILY_CAUSE_LIST";

export const subscriptionBasket: Journey = {
  id: "subscription-basket",
  description: "Verified user adds, removes and re-adds courts before confirming, and changes the list language",
  viewAs: "journey-subscriber",
  run: async ({ page, goto, act, checkpoint, data }) => {
    const listTypeId = (data as unknown as CathJourneyData).listTypes[LIST_TYPE];
    if (!listTypeId) throw new Error(`CaTH has no ${LIST_TYPE} list type`);
    const continueButton = () => primaryButton(page);
    const chooseCourts = async (...courts: string[]) => {
      await page.locator('input[name="subscriptionMethod"][value="courtOrTribunal"]').check();
      await continueButton().click();
      await settle(page);
      for (const court of courts) await page.locator(`#location-${court}`).check();
      await continueButton().click();
    };

    await goto("/add-email-subscription");
    await act(`choose courts ${FIRST_COURT} and ${SECOND_COURT}`, () => chooseCourts(FIRST_COURT, SECOND_COURT));
    await checkpoint("pending-subscriptions-two-courts");
    await act(`remove court ${SECOND_COURT}`, () => inlineAction(page, "remove", SECOND_COURT).click());
    await checkpoint("pending-subscriptions-after-remove");
    await act("add another email subscription", () => link(page, "/add-email-subscription").click());
    await act(`choose court ${SECOND_COURT} again`, () => chooseCourts(SECOND_COURT));
    await checkpoint("pending-subscriptions-re-added");
    await act("continue", () => continueButton().click());
    await act(`select ${LIST_TYPE} and continue`, async () => {
      await page.locator(`#listType_${listTypeId}`).check();
      await continueButton().click();
    });
    await act("choose English and continue", async () => {
      await page.locator('input[name="language"][value="ENGLISH"]').check();
      await continueButton().click();
    });
    await checkpoint("subscription-confirmation-preview");
    await act(`remove court ${SECOND_COURT} from the preview`, () => inlineAction(page, "remove-location", SECOND_COURT).click());
    await checkpoint("subscription-confirmation-preview-after-remove");
    await act("change list language", () => inlineAction(page, "change-version").click());
    await act("choose Welsh and continue", async () => {
      await page.locator('input[name="language"][value="WELSH"]').check();
      await continueButton().click();
    });
    await checkpoint("subscription-confirmation-preview-welsh");
    await act("confirm subscriptions", () => continueButton().click());
    await checkpoint("subscription-confirmed");

    await unsubscribeFromEverything(page, new URL(page.url()).origin);
  }
};
