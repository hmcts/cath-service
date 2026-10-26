import type { Journey } from "@hmcts/ui-baseline";
import { primaryButton } from "./steps.js";

// Ported from pip's system-admin/bulk-create-media-accounts-test.ts, up to confirming: creating the
// accounts makes them in Azure B2C, which local pip cannot reach, so the confirmation is not submitted.
const CSV = ["email,firstName,surname", "parity.bulk.one@example.com,Parity,BulkOne", "parity.bulk.two@example.com,Parity,BulkTwo"].join("\n");
const CONFIRMED_NOTE =
  "Reached by opening pip's post-confirmation redirect target directly: creating the accounts makes them in Azure B2C, which local pip cannot reach. The page is static, so it is what pip shows after a successful bulk create.";

export const bulkCreateMediaAccounts: Journey = {
  id: "bulk-create-media-accounts",
  description: "System admin uploads a CSV of media accounts and reaches the confirmation step",
  viewAs: "system-admin",
  run: async ({ page, goto, act, checkpoint }) => {
    await goto("/system-admin-dashboard");
    await act("bulk create media accounts card", () => page.locator("#card-bulk-create-media-accounts").click());
    await checkpoint("bulk-create-media-accounts");
    await act("continue with no file", () => primaryButton(page).click());
    await checkpoint("bulk-create-media-accounts-error");
    await act("attach a CSV of two accounts and continue", async () => {
      await page.locator("#bulk-account-upload").setInputFiles({ name: "parity-media-accounts.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) });
      await primaryButton(page).click();
    });
    await checkpoint("bulk-create-media-accounts-confirmation");
    await act("continue with no answer", () => primaryButton(page).click());
    await checkpoint("bulk-create-media-accounts-confirmation-error");
    await goto("/bulk-create-media-accounts-confirmed");
    await checkpoint("bulk-create-media-accounts-confirmed", CONFIRMED_NOTE);
  }
};
