import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Journey, JourneyContext } from "../../core/index.js";
import { loadManifest, readPayload } from "../../fixtures/manifest.js";
import type { CathJourneyData } from "./index.js";
import { link, primaryButton, unsubscribeFromEverything } from "./steps.js";

// CaTH's side of pip/journeys/subscriptions.ts. CaTH chooses the subscription method on
// /add-email-subscription, shows both case searches' results on /case-search-results (where a case
// must be ticked, unlike pip's reference results), and removes a subscription with a button that
// posts to /delete-subscription rather than a link. Starts and ends with no subscriptions.
// pip's seed sets the list types' case search fields before publishing, so its search index holds
// the seeded list's cases; CaTH's seed does not, so the journey sets them and indexes the seeded
// publication as an upload would, and puts both back after.
const PUBLICATION = "civil-and-family-daily-cause-list";
const SEARCH_CONFIG_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures/list-search-config.json");
const CASE_NUMBER = "12345678";
const CASE_NAME = "A1 Vs B1";
// Chosen by name, not pip's "first": CaTH orders list types by their name in the page's language
const LIST_TYPE = "CIVIL_DAILY_CAUSE_LIST";

export const subscriptions: Journey = {
  id: "email-subscriptions",
  description: "Verified user subscribes by court, case reference and case name, then unsubscribes and bulk unsubscribes",
  viewAs: "journey-subscriber",
  run: async (context) => {
    const { listTypes, seed, records } = context.data as unknown as CathJourneyData;
    const seeded = seed?.publications[PUBLICATION];
    if (!seeded) throw new Error(`CaTH was not seeded with ${PUBLICATION}`);
    const listTypeId = listTypes[LIST_TYPE];
    if (!listTypeId) throw new Error(`CaTH has no ${LIST_TYPE} list type`);
    const fixture = (await loadManifest()).publications.find((publication) => publication.id === PUBLICATION);
    if (!fixture) throw new Error(`no ${PUBLICATION} fixture`);
    const searchListTypeId = Number(listTypes[fixture.listType]);
    const { jsonListTypes } = JSON.parse(await readFile(SEARCH_CONFIG_FILE, "utf-8"));
    const originalConfig = await records.replaceListSearchConfig(searchListTypeId, jsonListTypes);
    const originalCases = await records.indexPublicationCases(seeded.artefactId, JSON.parse((await readPayload(fixture)).toString("utf-8")));

    try {
      await subscribeAndUnsubscribe(context, String(seeded.locationId), listTypeId);
    } finally {
      await records.restorePublicationCases(seeded.artefactId, originalCases);
      await records.replaceListSearchConfig(searchListTypeId, originalConfig);
      // Only does anything if the journey stopped before its bulk unsubscribe
      await unsubscribeFromEverything(context.page, new URL(context.page.url()).origin);
    }
  }
};

async function subscribeAndUnsubscribe({ page, goto, act, checkpoint }: JourneyContext, locationId: string, listTypeId: string) {
  const continueButton = () => primaryButton(page);
  const toSubscriptions = () => act("link to email subscriptions", () => link(page, "/subscription-management").click());
  const addSubscription = () => act("add email subscription", () => link(page, "/add-email-subscription").click());
  const chooseMethod = (method: string) => page.locator(`input[name="subscriptionMethod"][value="${method}"]`).check();
  const caseRemoveButton = () => page.locator('#all-case-subscriptions-table form[action="/delete-subscription"] button').first();

  await goto("/account-home");
  await checkpoint("account-home");
  await act("email subscriptions card", () => link(page, "/subscription-management").click());
  await checkpoint("subscription-management-empty");

  // By court or tribunal name
  await addSubscription();
  await checkpoint("subscription-add");
  await act("continue with nothing chosen", () => continueButton().click());
  await checkpoint("subscription-add-error");
  await act("choose court or tribunal name", async () => {
    await chooseMethod("courtOrTribunal");
    await continueButton().click();
  });
  await checkpoint("location-name-search");
  await act(`select location ${locationId} and continue`, async () => {
    await page.locator(`#location-${locationId}`).check();
    await continueButton().click();
  });
  await checkpoint("pending-subscriptions-court");
  await act("continue", () => continueButton().click());
  await checkpoint("subscription-add-list");
  await act("continue with no list type", () => continueButton().click());
  await checkpoint("subscription-add-list-error");
  await act(`select ${LIST_TYPE} and continue`, async () => {
    await page.locator(`#listType_${listTypeId}`).check();
    await continueButton().click();
  });
  await checkpoint("subscription-add-list-language");
  await act("continue with no language", () => continueButton().click());
  await checkpoint("subscription-add-list-language-error");
  await act("choose English and continue", async () => {
    await page.locator('input[name="language"][value="ENGLISH"]').check();
    await continueButton().click();
  });
  await checkpoint("subscription-confirmation-preview-court");
  await act("confirm subscriptions", () => continueButton().click());
  await checkpoint("subscription-confirmed-court");

  // By case reference number
  await toSubscriptions();
  await addSubscription();
  await act("choose reference number", async () => {
    await chooseMethod("caseReference");
    await continueButton().click();
  });
  await checkpoint("case-reference-number-search");
  await act("continue with no reference", () => continueButton().click());
  await checkpoint("case-reference-number-search-error");
  await act(`search for ${CASE_NUMBER}`, async () => {
    await page.locator("#caseReference").fill(CASE_NUMBER);
    await continueButton().click();
  });
  await checkpoint("case-reference-number-search-results");
  await act(`select case ${CASE_NUMBER} and continue`, async () => {
    await page.locator(`input[name="selectedCase"][value$="|||${CASE_NUMBER}"]`).first().check();
    await continueButton().click();
  });
  // Case subscriptions skip list type and language, going straight to pending subscriptions
  await checkpoint("pending-subscriptions-case-reference");
  await act("confirm subscriptions", () => continueButton().click());
  await checkpoint("subscription-confirmed-case-reference");

  // By case name
  await toSubscriptions();
  await addSubscription();
  await act("choose case name", async () => {
    await chooseMethod("caseName");
    await continueButton().click();
  });
  await checkpoint("case-name-search");
  await act("continue with no case name", () => continueButton().click());
  await checkpoint("case-name-search-error");
  await act(`search for ${CASE_NAME}`, async () => {
    await page.locator("#caseName").fill(CASE_NAME);
    await continueButton().click();
  });
  await checkpoint("case-name-search-results");
  await act("select first result and continue", async () => {
    await page.locator('main input[name="selectedCase"]').first().check();
    await continueButton().click();
  });
  await checkpoint("pending-subscriptions-case-name");
  await act("confirm subscriptions", () => continueButton().click());
  await checkpoint("subscription-confirmed-case-name");

  // Review, unsubscribe one, then bulk unsubscribe the rest
  await toSubscriptions();
  await checkpoint("subscription-management-all");
  await act("unsubscribe the first case subscription", () => caseRemoveButton().click());
  await checkpoint("delete-subscription");
  // pip has no validation here and returns to the subscriptions list, so pip then picks the
  // subscription again; CaTH stays on the question with an error, so it is answered there
  await act("continue with no answer", () => continueButton().click());
  await checkpoint("delete-subscription-no-answer");
  await act("answer yes and continue", async () => {
    await page.locator('input[name="unsubscribe-confirm"][value="yes"]').check();
    await continueButton().click();
  });
  await checkpoint("unsubscribe-confirmation");
  await toSubscriptions();
  await act("bulk unsubscribe", () => link(page, "/bulk-unsubscribe").click());
  await checkpoint("bulk-unsubscribe");
  await act("continue with nothing selected", () => continueButton().click());
  await checkpoint("bulk-unsubscribe-error");
  await act("select all and continue", async () => {
    for (const checkbox of await page.locator("#all-subscriptions input[name=subscriptions]").all()) await checkbox.check();
    await continueButton().click();
  });
  await checkpoint("bulk-unsubscribe-confirmation");
  await act("answer yes and continue", async () => {
    await page.locator('input[name="confirm"][value="yes"]').check();
    await continueButton().click();
  });
  await checkpoint("bulk-unsubscribe-confirmed");
  await toSubscriptions();
  await checkpoint("subscription-management-empty-again");
}
