import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Journey } from "@hmcts/ui-baseline";
import { primaryButton } from "./steps.js";

// Ported from pip's admin/manage-media-account-request-test.ts, plus rejection. Each run creates its
// own two applications through account-management, as pip's E2E suite creates its test data, so the
// seeded application that other baseline pages show is never decided.
const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures");
const ACCOUNT_MANAGEMENT_URL = process.env.PIP_ACCOUNT_MANAGEMENT_URL ?? "http://localhost:16969";
// Approving creates the applicant's account in Azure B2C, which a local pip cannot reach
const APPROVAL_NOTE =
  "Reached by opening pip's post-approval redirect target directly: approving creates the media account in Azure B2C, which local pip cannot reach, so the approval itself is not submitted.";

export const mediaApplications: Journey = {
  id: "media-applications",
  description: "CTSC admin reviews media account applications, starts an approval and rejects one with reasons",
  viewAs: "super-admin-ctsc",
  run: async ({ page, locale, goto, act, checkpoint }) => {
    const continueButton = () => primaryButton(page);
    const toApprove = await pendingApplication(`parity.approve.${locale}@example.com`, `Parity Approve ${locale.toUpperCase()}`);
    const toReject = await pendingApplication(`parity.reject.${locale}@example.com`, `Parity Reject ${locale.toUpperCase()}`);

    await goto("/admin-dashboard");
    await act("media applications card", () => page.locator("#card-media-applications").click());
    await checkpoint("media-applications");

    await act("view the application to approve", () => page.locator(`a[href*="applicantId=${toApprove}"]`).first().click());
    await checkpoint("media-account-review-approve");
    await act("approve", () => page.locator("main form button:not(#reject)").first().click());
    await checkpoint("media-account-approval");
    await act("continue with no answer", () => continueButton().click());
    await checkpoint("media-account-approval-error");
    await goto(`/media-account-approval-confirmation?applicantId=${toApprove}`);
    await checkpoint("media-account-approval-confirmation", APPROVAL_NOTE);

    await goto("/media-applications");
    await act("view the application to reject", () => page.locator(`a[href*="applicantId=${toReject}"]`).first().click());
    await checkpoint("media-account-review-reject");
    await act("reject", () => page.locator("#reject").click());
    await checkpoint("media-account-rejection-reasons");
    await act("continue with no reason", () => continueButton().click());
    await checkpoint("media-account-rejection-reasons-error");
    await act("choose a reason and continue", async () => {
      await page.locator("#rejection-reasons").check();
      await continueButton().click();
    });
    await checkpoint("media-account-rejection");
    await act("continue with no answer", () => continueButton().click());
    await checkpoint("media-account-rejection-error");
    // Known pip defect: the error re-render's form action loses the applicantId, so answering yes
    // now shows pip's error page. Recorded as pip behaves, then the rejection is done cleanly.
    await act("answer yes after the error", async () => {
      await page.locator('input[name="reject-confirmation"][value="Yes"]').check();
      await continueButton().click();
    });
    await checkpoint("media-account-rejection-yes-after-error");
    await goto(`/media-account-rejection-reasons?applicantId=${toReject}`);
    await act("choose a reason, continue and answer yes", async () => {
      await page.locator("#rejection-reasons").check();
      await continueButton().click();
      await page.waitForLoadState("networkidle");
      await page.locator('input[name="reject-confirmation"][value="Yes"]').check();
      await continueButton().click();
    });
    await checkpoint("media-account-rejection-confirmation");
  }
};

// Reuses a still-pending application with this email, or creates one
async function pendingApplication(email: string, fullName: string): Promise<string> {
  const headers = { "x-requester-id": "00000000-0000-4000-8000-000000000001" };
  const pending = (await (await fetch(`${ACCOUNT_MANAGEMENT_URL}/application/status/PENDING`, { headers })).json()) as { id: string; email: string }[];
  const existing = pending.find((application) => application.email === email);
  if (existing) return existing.id;

  const form = new FormData();
  form.append("fullName", fullName);
  form.append("email", email);
  form.append("employer", "Parity News");
  form.append("status", "PENDING");
  form.append("file", new Blob([await readFile(path.join(FIXTURES_DIR, "records/media-application-id.png"))], { type: "image/png" }), "id.png");
  const response = await fetch(`${ACCOUNT_MANAGEMENT_URL}/application`, { method: "POST", headers, body: form });
  if (!response.ok) throw new Error(`pip refused application ${email}: ${response.status} ${await response.text()}`);
  return ((await response.json()) as { id: string }).id;
}
