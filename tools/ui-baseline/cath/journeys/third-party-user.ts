import type { Journey } from "@hmcts/ui-baseline";
import type { CathJourneyData } from "./index.js";
import { link, primaryButton } from "./steps.js";

// CaTH's side of pip/journeys/third-party-user.ts: create a legacy third-party user (with its
// validation error), set its subscriptions, then delete it, so each run leaves none behind. CaTH
// asks only for a name (pip also asks for a role) and has no channel choice on the subscriptions page.
const LIST_TYPE = "CIVIL_DAILY_CAUSE_LIST";

export const thirdPartyUser: Journey = {
  id: "legacy-third-party-user",
  description: "System admin creates a legacy third-party user, sets its subscriptions and deletes it",
  viewAs: "system-admin",
  run: async ({ page, locale, goto, act, checkpoint, data }) => {
    const { listTypes, records } = data as unknown as CathJourneyData;
    const listTypeId = listTypes[LIST_TYPE];
    if (!listTypeId) throw new Error(`CaTH has no ${LIST_TYPE} list type`);
    const name = `Parity Journey Third Party ${locale.toUpperCase()}`;
    const continueButton = () => primaryButton(page);
    const viewUser = async () => {
      await goto("/manage-third-party-users");
      await page.locator("main tr").filter({ hasText: name }).locator('a[href^="/manage-third-party-user?id="]').first().click();
    };
    // CaTH refuses a name already in use, so one left by a run that stopped early would block this one
    await records.removeLegacyThirdPartyUsers(name);

    await goto("/system-admin-dashboard");
    await act("manage third-party users card", () => link(page, "/manage-third-party-users").click());
    await checkpoint("manage-third-party-users");
    await act("create new third-party user", () => link(page, "/create-third-party-user").click());
    await checkpoint("create-third-party-user");
    await act("continue with nothing entered", () => continueButton().click());
    await checkpoint("create-third-party-user-error");
    await act("enter a name and continue", async () => {
      await page.locator("#name").fill(name);
      await continueButton().click();
    });
    await checkpoint("create-third-party-user-summary");
    await act("confirm", () => continueButton().click());
    await checkpoint("create-third-party-user-success");

    await act("view the new user", viewUser);
    await checkpoint("manage-third-party-users-view");
    await act("manage subscriptions", () => page.locator('main a[href^="/manage-third-party-subscriptions?id="]').click());
    await checkpoint("manage-third-party-users-subscriptions");
    await act(`choose ${LIST_TYPE} and save`, async () => {
      await page.locator(`input[name="listTypes"][value="${listTypeId}"]`).check();
      await continueButton().click();
    });
    await checkpoint("manage-third-party-users-subscriptions-saved");

    await act("view the user again", viewUser);
    await act("delete user", () => page.locator('main a[href^="/delete-third-party-user?id="]').click());
    await checkpoint("delete-third-party-user-confirmation");
    await act("continue with no answer", () => continueButton().click());
    await checkpoint("delete-third-party-user-confirmation-error");
    await act("answer yes and continue", async () => {
      await page.locator('input[name="confirmDelete"][value="yes"]').check();
      await continueButton().click();
    });
    await checkpoint("delete-third-party-user-success");
  }
};
