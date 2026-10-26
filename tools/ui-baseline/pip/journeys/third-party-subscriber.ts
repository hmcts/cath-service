import type { Journey } from "@hmcts/ui-baseline";
import { link, primaryButton } from "./steps.js";

// Ported from pip's system-admin/manage-third-party-subscribers-test.ts ("create, view, update and
// remove third-party subscribers"): create, change status, create then update subscriptions, set the
// OAuth configuration and delete, so each run leaves no subscriber behind.
export const thirdPartySubscriber: Journey = {
  id: "third-party-subscriber",
  description: "System admin creates a third-party API subscriber, manages its status, subscriptions and OAuth configuration, then deletes it",
  viewAs: "system-admin",
  run: async ({ page, locale, goto, act, checkpoint }) => {
    const name = `Parity Journey Subscriber ${locale.toUpperCase()}`;
    const continueButton = () => primaryButton(page);
    const viewSubscriber = async () => {
      await goto("/manage-third-party-subscribers");
      await page.locator("main tr").filter({ hasText: name }).locator('a[href*="/manage-third-party-subscribers/view"]').first().click();
    };
    const setSubscription = async (listType: string) => {
      await page.locator(`select#${listType}`).selectOption("Public");
      await continueButton().click();
    };

    await goto("/system-admin-dashboard");
    await act("manage third-party subscribers card", () => page.locator("#card-manage-third-party-subscribers").click());
    await checkpoint("manage-third-party-subscribers");
    await act("create new subscriber", () => link(page, "/create-third-party-subscriber").click());
    await checkpoint("create-third-party-subscriber");
    await act("continue with no name", () => continueButton().click());
    await checkpoint("create-third-party-subscriber-error");
    await act("enter a name and continue", async () => {
      await page.locator("#thirdPartySubscriberName").fill(name);
      await continueButton().click();
    });
    await checkpoint("create-third-party-subscriber-summary");
    await act("confirm", () => continueButton().click());
    await checkpoint("create-third-party-subscriber-success");

    await act("view the new subscriber", viewSubscriber);
    await checkpoint("manage-third-party-subscribers-view");
    await act("change status", () => link(page, "/manage-third-party-subscriber-status").click());
    await checkpoint("manage-third-party-subscriber-status");
    await act("set status to active", async () => {
      await page.locator("#status").selectOption("ACTIVE");
      await continueButton().click();
    });
    await checkpoint("manage-third-party-subscriber-status-success");

    await act("view the subscriber again", viewSubscriber);
    await act("manage subscriptions", () => page.locator("#manage-subscriptions").click());
    await checkpoint("manage-third-party-subscriptions");
    await act("make the civil list public and continue", () => setSubscription("CIVIL_DAILY_CAUSE_LIST"));
    await checkpoint("manage-third-party-subscriptions-summary");
    await act("confirm", () => continueButton().click());
    await checkpoint("manage-third-party-subscriptions-created-success");
    await act("view the subscriber again", viewSubscriber);
    await act("manage subscriptions", () => page.locator("#manage-subscriptions").click());
    await act("also make the family list public and continue", () => setSubscription("FAMILY_DAILY_CAUSE_LIST"));
    await act("confirm", () => continueButton().click());
    await checkpoint("manage-third-party-subscriptions-updated-success");

    await act("view the subscriber again", viewSubscriber);
    await act("manage OAuth configuration", () => page.locator("#manage-subscriber-oauth-configuration").click());
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
    await act("delete subscriber", () => link(page, "/delete-third-party-subscriber-confirmation").click());
    await checkpoint("delete-third-party-subscriber-confirmation");
    await act("answer yes and continue", async () => {
      await page.locator("#delete-subscriber-confirm").check();
      await continueButton().click();
    });
    await checkpoint("delete-third-party-subscriber-success");
  }
};
