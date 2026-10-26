import type { Journey } from "@hmcts/ui-baseline";
import { primaryButton } from "./steps.js";

// Ported from pip's system-admin/blob-explorer-test.ts: browse to a publication and re-submit its
// subscriptions. Uses the seeded civil and family publication.
export const blobResubmit: Journey = {
  id: "blob-explorer-resubmit",
  description: "System admin browses the blob explorer to a publication and re-submits its subscriptions",
  viewAs: "system-admin",
  run: async ({ page, goto, act, checkpoint, data }) => {
    const seeded = (data.seed as { publications: Record<string, { artefactId: string; locationId: number }> }).publications[
      "civil-and-family-daily-cause-list"
    ];

    await goto("/system-admin-dashboard");
    await act("blob explorer card", () => page.locator("#card-blob-view-locations").click());
    await checkpoint("blob-view-locations");
    await act(`open location ${seeded.locationId}`, () => page.locator(`main a[href$="locationId=${seeded.locationId}"]`).first().click());
    await checkpoint("blob-view-publications");
    await act("open the civil and family publication", () => page.locator(`main a[href*="artefactId=${seeded.artefactId}"]`).first().click());
    await checkpoint("blob-view-publication");
    await act("re-submit subscriptions", () => page.locator("#resubmit-subscription").click());
    await checkpoint("blob-view-subscription-resubmit-confirmation");
    await act("confirm", () => primaryButton(page).click());
    await checkpoint("blob-view-subscription-resubmit-confirmed");
  }
};
