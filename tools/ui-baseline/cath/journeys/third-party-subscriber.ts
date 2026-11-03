import type { Journey } from "@hmcts/ui-baseline";
import type { Page } from "playwright";
import type { CathJourneyData } from "./index.js";
import { link, primaryButton } from "./steps.js";

// CaTH's side of pip/journeys/third-party-subscriber.ts: create a subscriber, create then update its
// subscriptions, set its OAuth configuration and delete it, so each run leaves none behind. CaTH has
// no subscriber status page, so pip's manage-third-party-subscriber-status checkpoints are not
// reached, nor is the subscriptions summary: CaTH saves straight from the (paged) subscriptions form.
const SUBSCRIPTIONS_SAVED = /\/third-party-subscribers\/[^/]+\/subscriptions\/success/;

export const thirdPartySubscriber: Journey = {
  id: "third-party-subscriber",
  description: "System admin creates a third-party API subscriber, manages its status, subscriptions and OAuth configuration, then deletes it",
  viewAs: "system-admin",
  run: async ({ page, locale, goto, act, checkpoint, data }) => {
    const { records } = data as unknown as CathJourneyData;
    const name = `Parity Journey Subscriber ${locale.toUpperCase()}`;
    const continueButton = () => primaryButton(page);
    const viewSubscriber = async () => {
      await goto("/third-party-subscribers");
      await page.locator("main tr").filter({ hasText: name }).locator('a[href^="/third-party-subscribers/"][href*="/manage"]').first().click();
    };
    const manageSubscriptions = () => page.locator('main a[href^="/third-party-subscribers/"][href*="/subscriptions/manage"]').click();
    // CaTH refuses a name already in use, so one left by a run that stopped early would block this one
    await records.removeThirdPartySubscribers(name);

    await goto("/system-admin-dashboard");
    await act("manage third-party subscribers card", () => link(page, "/third-party-subscribers").click());
    await checkpoint("manage-third-party-subscribers");
    await act("create new subscriber", () => link(page, "/third-party-subscribers/create").click());
    await checkpoint("create-third-party-subscriber");
    await act("continue with no name", () => continueButton().click());
    await checkpoint("create-third-party-subscriber-error");
    await act("enter a name and continue", async () => {
      await page.locator("#name").fill(name);
      await continueButton().click();
    });
    await checkpoint("create-third-party-subscriber-summary");
    await act("confirm", () => continueButton().click());
    await checkpoint("create-third-party-subscriber-success");

    await act("view the new subscriber", viewSubscriber);
    await checkpoint("manage-third-party-subscribers-view");
    await act("manage subscriptions", manageSubscriptions);
    await checkpoint("manage-third-party-subscriptions");
    await act("make the civil list public and save", () => setPublicAndSave(page, "CIVIL_DAILY_CAUSE_LIST"));
    await checkpoint("manage-third-party-subscriptions-created-success");
    await act("view the subscriber again", viewSubscriber);
    await act("manage subscriptions", manageSubscriptions);
    await act("also make the family list public and save", () => setPublicAndSave(page, "FAMILY_DAILY_CAUSE_LIST"));
    await checkpoint("manage-third-party-subscriptions-updated-success");

    await act("view the subscriber again", viewSubscriber);
    await act("manage OAuth configuration", () => page.locator('main a[href^="/third-party-subscribers/"][href*="/oauth-config"]').click());
    await checkpoint("manage-third-party-subscriber-oauth-config");
    await act("continue with nothing entered", () => continueButton().click());
    await checkpoint("manage-third-party-subscriber-oauth-config-error");
    await act("enter the OAuth configuration and continue", async () => {
      await page.locator("#destinationUrl").fill("https://parity.example.com/publication");
      await page.locator("#tokenUrl").fill("https://parity.example.com/oauth/token");
      await page.locator("#scope").fill("parity.read");
      await page.locator("#clientId").fill("parity-client");
      await page.locator("#clientSecret").fill("parity-secret");
      await continueButton().click();
    });
    await checkpoint("manage-third-party-subscriber-oauth-config-summary");
    await act("confirm", () => continueButton().click());
    await checkpoint("manage-third-party-subscriber-oauth-config-success");

    await act("view the subscriber again", viewSubscriber);
    await act("delete subscriber", () => page.locator('main a[href^="/third-party-subscribers/"][href*="/delete/confirmation"]').click());
    await checkpoint("delete-third-party-subscriber-confirmation");
    await act("answer yes and continue", async () => {
      await page.locator('input[name="confirmDelete"][value="yes"]').check();
      await continueButton().click();
    });
    await checkpoint("delete-third-party-subscriber-success");
  }
};

// CaTH pages its subscriptions form by list type name, 20 at a time, saving on the last page; each
// list type is a select or a row of radios, depending on a feature flag
async function setPublicAndSave(page: Page, listType: string): Promise<void> {
  for (let pages = 0; !SUBSCRIPTIONS_SAVED.test(new URL(page.url()).pathname); pages++) {
    if (pages > 10) throw new Error(`never reached the subscriptions saved page, at ${page.url()}`);
    const select = page.locator(`select[name="${listType}"]`);
    if ((await select.count()) > 0) await select.selectOption("PUBLIC");
    else {
      const radio = page.locator(`input[name="${listType}"][value="PUBLIC"]`);
      if ((await radio.count()) > 0) await radio.check();
    }
    await primaryButton(page).click();
    await page.waitForLoadState("networkidle");
  }
}
