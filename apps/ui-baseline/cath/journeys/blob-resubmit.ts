import type { Journey } from "../../core/index.js";
import type { CathJourneyData } from "./index.js";
import { primaryButton } from "./steps.js";

// CaTH's side of pip/journeys/blob-resubmit.ts: browse the blob explorer to the seeded civil and
// family publication and re-submit its subscriptions. CaTH opens a JSON publication on
// /blob-explorer-json-file, where pip has /blob-view-publication.
const LOCATIONS_PATH = "/blob-explorer-locations";

export const blobResubmit: Journey = {
  id: "blob-explorer-resubmit",
  description: "System admin browses the blob explorer to a publication and re-submits its subscriptions",
  viewAs: "system-admin",
  run: async ({ page, goto, act, checkpoint, data }) => {
    const seeded = (data as unknown as CathJourneyData).seed?.publications["civil-and-family-daily-cause-list"];
    if (!seeded) throw new Error("CaTH was not seeded with civil-and-family-daily-cause-list");

    await goto("/system-admin-dashboard");
    await act("blob explorer card", () => page.locator('main a[href^="/blob-explorer"]').first().click());
    // CaTH's Welsh dashboard links the tile to /blob-explorer, which has no page, so the rest of
    // the journey can only be reached from the locations page by URL
    if (new URL(page.url()).pathname === LOCATIONS_PATH) await checkpoint("blob-view-locations");
    else {
      await goto(LOCATIONS_PATH);
      await checkpoint("blob-view-locations", "reached by URL: the dashboard's blob explorer tile links to /blob-explorer, which has no page");
    }
    await act(`open location ${seeded.locationId}`, () => page.locator(`main a[href$="locationId=${seeded.locationId}"]`).first().click());
    await checkpoint("blob-view-publications");
    await act("open the civil and family publication", () => page.locator(`main a[href*="artefactId=${seeded.artefactId}"]`).first().click());
    await checkpoint("blob-view-publication");
    await act("re-submit subscriptions", () => primaryButton(page).click());
    await checkpoint("blob-view-subscription-resubmit-confirmation");
    await act("confirm", () => primaryButton(page).click());
    await checkpoint("blob-view-subscription-resubmit-confirmed");
  }
};
