import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Journey } from "@hmcts/ui-baseline";
import type { CathJourneyData } from "./index.js";
import { primaryButton } from "./steps.js";

// CaTH's side of pip/journeys/media-applications.ts. Each run creates its own two applications and
// removes them at the end, so the seeded application other baseline pages show is never decided.
// CaTH keeps the rejection reasons in the session, so answering yes after the confirmation's error
// rejects the application: pip's "media-account-rejection-yes-after-error" (pip's error page) has no
// CaTH step, and that answer leads straight to the rejection confirmation.
const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures");
const IMAGE = "records/media-application-id.png";
// CaTH's approval gets a Microsoft Graph token to create the B2C account; a local CaTH has neither
// MOCK_AZURE_B2C nor B2C credentials, so submitting it only shows CaTH's Azure error
const APPROVAL_NOTE =
  "Reached by opening CaTH's post-approval page directly: approving creates the media account in Azure B2C through Microsoft Graph, which local CaTH has no credentials for, so the approval itself is not submitted.";

export const mediaApplications: Journey = {
  id: "media-applications",
  description: "CTSC admin reviews media account applications, starts an approval and rejects one with reasons",
  viewAs: "super-admin-ctsc",
  run: async ({ page, locale, goto, act, checkpoint, data }) => {
    const { records } = data as unknown as CathJourneyData;
    const image = { data: await readFile(path.join(FIXTURES_DIR, IMAGE)), extension: path.extname(IMAGE) };
    const application = (purpose: string) =>
      records.ensureMediaApplication(
        { name: `Parity ${purpose} ${locale.toUpperCase()}`, email: `parity.${purpose.toLowerCase()}.${locale}@example.com`, employer: "Parity News" },
        image
      );
    const toApprove = await application("Approve");
    const toReject = await application("Reject");
    const continueButton = () => primaryButton(page);
    const review = (id: string) => page.locator(`main a[href="/media-applications/${id}"]`);
    const decide = (id: string, decision: string) => page.locator(`main form[action="/media-applications/${id}/${decision}"] button`);
    const answerYes = async () => {
      await page.locator('main input[name="confirm"][value="yes"]').check();
      await continueButton().click();
    };

    try {
      await goto("/admin-dashboard");
      await act("media applications card", () => page.locator('main a.admin-tile[href="/media-applications"]').click());
      await checkpoint("media-applications");

      await act("view the application to approve", () => review(toApprove).click());
      await checkpoint("media-account-review-approve");
      await act("approve", () => decide(toApprove, "approve").click());
      await checkpoint("media-account-approval");
      await act("continue with no answer", () => continueButton().click());
      await checkpoint("media-account-approval-error");
      await goto(`/media-applications/${toApprove}/approved`);
      await checkpoint("media-account-approval-confirmation", APPROVAL_NOTE);

      await goto("/media-applications");
      await act("view the application to reject", () => review(toReject).click());
      await checkpoint("media-account-review-reject");
      await act("reject", () => decide(toReject, "reject-reasons").click());
      await checkpoint("media-account-rejection-reasons");
      await act("continue with no reason", () => continueButton().click());
      await checkpoint("media-account-rejection-reasons-error");
      await act("choose a reason and continue", async () => {
        await page.locator('main input[name="notAccredited"]').check();
        await continueButton().click();
      });
      await checkpoint("media-account-rejection");
      await act("continue with no answer", () => continueButton().click());
      await checkpoint("media-account-rejection-error");
      await act("answer yes after the error", answerYes);
      await checkpoint("media-account-rejection-confirmation");
    } finally {
      await records.removeMediaApplication(toApprove);
      await records.removeMediaApplication(toReject);
    }
  }
};
