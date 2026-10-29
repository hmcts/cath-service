import type { Journey } from "@hmcts/ui-baseline";
import { link, primaryButton } from "./steps.js";

// Ported from pip's system-admin/legacy-manage-third-party-users-test.ts: create a legacy third-party
// user (with its validation error), set its subscriptions, then delete it, so each run leaves none behind.
export const thirdPartyUser: Journey = {
  id: "legacy-third-party-user",
  description: "System admin creates a legacy third-party user, sets its subscriptions and deletes it",
  viewAs: "system-admin",
  run: async ({ page, locale, goto, act, checkpoint }) => {
    const name = `Parity Journey Third Party ${locale.toUpperCase()}`;
    const continueButton = () => primaryButton(page);
    const viewUser = async () => {
      await goto("/manage-third-party-users");
      await page.locator("main tr").filter({ hasText: name }).locator('a[href*="/manage-third-party-users/view"]').first().click();
    };

    await goto("/system-admin-dashboard");
    await act("manage third-party users card", () => page.locator("#card-manage-third-party-users").click());
    await checkpoint("manage-third-party-users");
    await act("create new third-party user", () => link(page, "/create-third-party-user").click());
    await checkpoint("create-third-party-user");
    await act("continue with nothing entered", () => continueButton().click());
    await checkpoint("create-third-party-user-error");
    await act("enter a name, choose the general role and continue", async () => {
      await page.locator("#thirdPartyName").fill(name);
      await page.locator("#thirdPartyRole").check();
      await continueButton().click();
    });
    await checkpoint("create-third-party-user-summary");
    await act("confirm", () => continueButton().click());
    await checkpoint("create-third-party-user-success");

    await act("view the new user", viewUser);
    await checkpoint("manage-third-party-users-view");
    await act("manage subscriptions", () => page.locator("#approve").click());
    await checkpoint("manage-third-party-users-subscriptions");
    await act("choose the Courtel channel and the civil list, then continue", async () => {
      await page.locator("#channel").check();
      await page.locator("#CIVIL_DAILY_CAUSE_LIST").check();
      await continueButton().click();
    });
    await checkpoint("manage-third-party-users-subscriptions-saved");

    await act("view the user again", viewUser);
    await act("delete user", () => link(page, "/delete-third-party-user-confirmation").click());
    await checkpoint("delete-third-party-user-confirmation");
    await act("continue with no answer", () => continueButton().click());
    await checkpoint("delete-third-party-user-confirmation-error");
    await act("answer yes and continue", async () => {
      await page.locator("#delete-user-confirm").check();
      await continueButton().click();
    });
    await checkpoint("delete-third-party-user-success");
  }
};
