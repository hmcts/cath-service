import type { Journey } from "../../core/index.js";
import type { CathJourneyData } from "./index.js";
import { link, primaryButton } from "./steps.js";

// CaTH's side of pip/journeys/delete-user.ts. Each run creates its own CFT IDAM user to delete, as
// pip's does. Unlike pip, CaTH validates the confirmation: continuing with no answer stays on the
// page with an error, so there is no "delete user again" step before answering yes.
export const deleteUser: Journey = {
  id: "delete-user",
  description: "System admin finds a user in user management and deletes them",
  viewAs: "system-admin",
  run: async ({ page, locale, goto, act, checkpoint, data }) => {
    const { records } = data as unknown as CathJourneyData;
    const email = `parity.delete.${locale}@example.com`;
    // Find users lists the newest first, so the throwaway user is on its first page
    const userId = await records.ensureUser({
      email,
      firstName: "Parity",
      surname: "Delete",
      userProvenance: "CFT_IDAM",
      userProvenanceId: `parity-delete-${locale}`,
      role: "VERIFIED"
    });

    await goto("/system-admin-dashboard");
    await act("user management card", () => link(page, "/find-users").click());
    await checkpoint("user-management");
    await act(`manage ${email}`, () => link(page, `/manage-user/${userId}`).click());
    await checkpoint("manage-user");
    await act("delete user", () => page.locator(`main form[action^="/delete-user-confirm/${userId}"] button`).click());
    await checkpoint("delete-user");
    await act("continue with no answer", () => primaryButton(page).click());
    await checkpoint("delete-user-no-answer");
    await act("answer yes and continue", async () => {
      await page.locator('input[name="confirmation"][value="yes"]').check();
      await primaryButton(page).click();
    });
    await checkpoint("delete-user-confirmation");
  }
};
