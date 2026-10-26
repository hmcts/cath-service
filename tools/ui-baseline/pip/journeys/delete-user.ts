import type { Journey } from "@hmcts/ui-baseline";
import { primaryButton } from "./steps.js";

// Ported from pip's system-admin/user-management-test.ts ("delete a user"). Each run creates its own
// CFT IDAM user to delete: deleting a B2C media user also deletes it from Azure B2C, which local pip
// cannot reach, while CFT IDAM users exist only in account-management.
const ACCOUNT_MANAGEMENT_URL = process.env.PIP_ACCOUNT_MANAGEMENT_URL ?? "http://localhost:16969";

export const deleteUser: Journey = {
  id: "delete-user",
  description: "System admin finds a user in user management and deletes them",
  viewAs: "system-admin",
  run: async ({ page, locale, goto, act, checkpoint }) => {
    const email = `parity.delete.${locale}@example.com`;
    const userId = await throwawayUser(email, locale);

    await goto("/system-admin-dashboard");
    await act("user management card", () => page.locator("#card-user-management").click());
    await checkpoint("user-management");
    await act(`manage ${email}`, () => page.locator(`main a[href*="manage-user?id=${userId}"]`).first().click());
    await checkpoint("manage-user");
    await act("delete user", () => page.locator(`main a[href*="delete-user?id=${userId}"]`).first().click());
    await checkpoint("delete-user");
    // pip has no validation here: continuing without an answer returns to the manage user page
    await act("continue with no answer", () => primaryButton(page).click());
    await checkpoint("delete-user-no-answer");
    await act("delete user again", () => page.locator(`main a[href*="delete-user?id=${userId}"]`).first().click());
    await act("answer yes and continue", async () => {
      await page.locator("#delete-user-confirm").check();
      await primaryButton(page).click();
    });
    await checkpoint("delete-user-confirmation");
  }
};

async function throwawayUser(email: string, locale: string): Promise<string> {
  const headers = { "x-requester-id": "00000000-0000-4000-8000-000000000001", "content-type": "application/json" };
  const provenanceUserId = `parity-delete-${locale}`;
  const lookup = async () => fetch(`${ACCOUNT_MANAGEMENT_URL}/account/provenance/CFT_IDAM/${provenanceUserId}`, { headers });
  let found = await lookup();
  if (!found.ok) {
    await fetch(`${ACCOUNT_MANAGEMENT_URL}/account/add/pi`, {
      method: "POST",
      headers,
      body: JSON.stringify([{ email, provenanceUserId, userProvenance: "CFT_IDAM", roles: "VERIFIED", forenames: "Parity", surname: "Delete" }])
    });
    found = await lookup();
  }
  if (!found.ok) throw new Error(`could not create the user to delete: ${found.status} ${await found.text()}`);
  return ((await found.json()) as { userId: string }).userId;
}
