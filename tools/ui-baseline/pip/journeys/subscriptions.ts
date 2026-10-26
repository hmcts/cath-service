import type { Journey } from "@hmcts/ui-baseline";
import { link, primaryButton } from "./steps.js";

// Ported from pip's verified/email-subscriptions-test.ts ("subscribe by court name, URN, case id
// and case name ... remove subscription and bulk unsubscribe"), with a validation-error checkpoint
// wherever a step can be submitted empty. Starts and ends with no subscriptions.
const CASE_NUMBER = "12345678";
const CASE_NAME = "A1 Vs B1";

export const subscriptions: Journey = {
  id: "email-subscriptions",
  description: "Verified user subscribes by court, case reference and case name, then unsubscribes and bulk unsubscribes",
  viewAs: "journey-subscriber",
  run: async ({ page, goto, act, checkpoint, data }) => {
    const locationId = String(
      (data.seed as { publications: Record<string, { locationId: number }> }).publications["civil-and-family-daily-cause-list"].locationId
    );
    const continueButton = () => primaryButton(page);
    const toSubscriptions = () => act("link to email subscriptions", () => link(page, "/subscription-management").click());
    const addSubscription = () => act("add email subscription", () => link(page, "/subscription-add").click());

    await goto("/account-home");
    await checkpoint("account-home");
    await act("email subscriptions card", () => page.locator("#card-subscription-management").click());
    await checkpoint("subscription-management-empty");

    // By court or tribunal name
    await addSubscription();
    await checkpoint("subscription-add");
    await act("continue with nothing chosen", () => continueButton().click());
    await checkpoint("subscription-add-error");
    await act("choose court or tribunal name", async () => {
      await page.locator("#subscription-choice-1").check();
      await continueButton().click();
    });
    await checkpoint("location-name-search");
    await act(`select location ${locationId} and continue`, async () => {
      await page.locator(`input[type=checkbox][id="${locationId}"], input[type=checkbox][value="${locationId}"]`).first().check();
      await continueButton().click();
    });
    await checkpoint("pending-subscriptions-court");
    await act("continue", () => continueButton().click());
    await checkpoint("subscription-add-list");
    await act("continue with no list type", () => continueButton().click());
    await checkpoint("subscription-add-list-error");
    await act("select first list type and continue", async () => {
      await page.locator("#list-types-table input[type=checkbox]").first().check();
      await continueButton().click();
    });
    await checkpoint("subscription-add-list-language");
    await act("continue with no language", () => continueButton().click());
    await checkpoint("subscription-add-list-language-error");
    await act("choose English and continue", async () => {
      await page.locator("#english").check();
      await continueButton().click();
    });
    await checkpoint("subscription-confirmation-preview-court");
    await act("confirm subscriptions", () => continueButton().click());
    await checkpoint("subscription-confirmed-court");

    // By case reference number
    await toSubscriptions();
    await addSubscription();
    await act("choose reference number", async () => {
      await page.locator("#subscription-choice-3").check();
      await continueButton().click();
    });
    await checkpoint("case-reference-number-search");
    await act("continue with no reference", () => continueButton().click());
    await checkpoint("case-reference-number-search-error");
    await act(`search for ${CASE_NUMBER}`, async () => {
      await page.locator("#search-input").fill(CASE_NUMBER);
      await continueButton().click();
    });
    await checkpoint("case-reference-number-search-results");
    await act("continue", () => continueButton().click());
    // Case subscriptions skip list type and language, going straight to pending subscriptions
    await checkpoint("pending-subscriptions-case-reference");
    await act("confirm subscriptions", () => continueButton().click());
    await checkpoint("subscription-confirmed-case-reference");

    // By case name
    await toSubscriptions();
    await addSubscription();
    await act("choose case name", async () => {
      await page.locator("#subscription-choice-2").check();
      await continueButton().click();
    });
    await checkpoint("case-name-search");
    await act("continue with no case name", () => continueButton().click());
    await checkpoint("case-name-search-error");
    await act(`search for ${CASE_NAME}`, async () => {
      await page.locator("#case-name").fill(CASE_NAME);
      await continueButton().click();
    });
    await checkpoint("case-name-search-results");
    await act("select first result and continue", async () => {
      await page.locator("main input[type=checkbox]").first().check();
      await continueButton().click();
    });
    await checkpoint("pending-subscriptions-case-name");
    await act("confirm subscriptions", () => continueButton().click());
    await checkpoint("subscription-confirmed-case-name");

    // Review, unsubscribe one, then bulk unsubscribe the rest
    await toSubscriptions();
    await checkpoint("subscription-management-all");
    await act("unsubscribe the first case subscription", () => page.locator('#cases-table a[href*="delete-subscription"]').first().click());
    await checkpoint("delete-subscription");
    // pip has no validation here: continuing without an answer returns to the subscriptions list
    await act("continue with no answer", () => continueButton().click());
    await checkpoint("delete-subscription-no-answer");
    await act("unsubscribe the first case subscription again", () => page.locator('#cases-table a[href*="delete-subscription"]').first().click());
    await act("answer yes and continue", async () => {
      await page.locator('input[name="unsubscribe-confirm"]').first().check();
      await continueButton().click();
    });
    await checkpoint("unsubscribe-confirmation");
    await toSubscriptions();
    await act("bulk unsubscribe", () => page.locator("#bulk-unsubscribe-button").click());
    await checkpoint("bulk-unsubscribe");
    await act("continue with nothing selected", () => page.locator("#bulk-unsubscribe-button").click());
    await checkpoint("bulk-unsubscribe-error");
    await act("select all and continue", async () => {
      for (const selectAll of await page.locator("#select-all-cases, #select-all-locations").all()) await selectAll.check();
      await page.locator("#bulk-unsubscribe-button").click();
    });
    await checkpoint("bulk-unsubscribe-confirmation");
    await act("answer yes and continue", async () => {
      await page.locator('input[name="bulk-unsubscribe-choice"]').first().check();
      await continueButton().click();
    });
    await checkpoint("bulk-unsubscribe-confirmed");
    await toSubscriptions();
    await checkpoint("subscription-management-empty-again");
  }
};
