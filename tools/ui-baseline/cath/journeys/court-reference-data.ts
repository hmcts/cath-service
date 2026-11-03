import type { Journey } from "@hmcts/ui-baseline";
import type { CathJourneyData } from "./index.js";
import { chooseCourt, link, primaryButton } from "./steps.js";

// CaTH's side of pip/journeys/court-reference-data.ts: upload a throwaway court, give it a
// subscription and a publication, then delete it, which CaTH refuses while it has either. CaTH's
// dashboard reaches upload through its /reference-data menu, and its CSV has its own columns
// (provenance SNL, as CaTH rejects pip's MANUAL_UPLOAD). pip's Welsh-only
// "reference-data-upload-card-not-found" step is a pip defect CaTH does not have, so is not here.
const COURT = { id: "9901", name: "Parity Reference Data Court", welshName: "Llys Data Cyfeirnod Parity" };
const CSV = [
  "LOCATION_ID,LOCATION_NAME,WELSH_LOCATION_NAME,EMAIL,CONTACT_NO,SUB_JURISDICTION_NAME,REGION_NAME,PROVENANCE,PROVENANCE_LOCATION_ID,PROVENANCE_LOCATION_TYPE",
  `${COURT.id},${COURT.name},${COURT.welshName},,,Civil Court,London,SNL,${COURT.id},VENUE`
].join("\n");
const SUBSCRIBER = "journey-subscriber";
const LIST_TYPE = "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST";
const DAY = 24 * 60 * 60 * 1000;

export const courtReferenceData: Journey = {
  id: "court-reference-data",
  description: "System admin uploads a court in reference data, then deletes it after removing its subscriptions and publications",
  viewAs: "system-admin",
  run: async ({ page, goto, act, checkpoint, data }) => {
    const journeyData = data as unknown as CathJourneyData;
    const continueButton = () => primaryButton(page);
    const answerYes = async () => {
      await page.locator('main input[type=radio][value="yes"]').check();
      await continueButton().click();
    };
    const findCourtToDelete = async () => {
      await goto("/delete-court");
      await chooseCourt(page, "court-search", COURT);
      await continueButton().click();
    };

    await goto("/system-admin-dashboard");
    await checkpoint("system-admin-dashboard");
    await act("reference data card, then upload reference data", async () => {
      await link(page, "/reference-data").click();
      await page.waitForLoadState("networkidle");
      await link(page, "/reference-data-upload").click();
    });
    await checkpoint("reference-data-upload");
    await act("continue with no file", () => continueButton().click());
    await checkpoint("reference-data-upload-error");
    await act("attach a one-court CSV and continue", async () => {
      await page.locator("#file").setInputFiles({ name: "parity-court.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) });
      await continueButton().click();
    });
    await checkpoint("reference-data-upload-summary");
    await act("confirm", () => continueButton().click());
    await checkpoint("reference-data-upload-confirmation");

    await giveCourtASubscriptionAndAPublication(journeyData);

    await goto("/system-admin-dashboard");
    await act("delete court card", () => link(page, "/delete-court").click());
    await checkpoint("delete-court-reference-data");
    await act("continue with no court", () => continueButton().click());
    await checkpoint("delete-court-reference-data-error");
    await act(`search for ${COURT.name}`, async () => {
      await chooseCourt(page, "court-search", COURT);
      await continueButton().click();
    });
    await checkpoint("delete-court-reference-data-confirmation");
    // As pip, CaTH refuses while the court has publications, and only checks subscriptions once those are gone
    await act("answer yes while the court has publications", answerYes);
    await checkpoint("delete-court-reference-data-refused-publications");
    await act("delete the court's publications", () => link(page, "/delete-court-publications").click());
    await checkpoint("delete-court-publication-confirmation");
    await act("answer yes", answerYes);
    await checkpoint("delete-court-publication-success");

    await act("delete the court again", findCourtToDelete);
    await act("answer yes while the court has subscriptions", answerYes);
    await checkpoint("delete-court-reference-data-refused-subscriptions");
    await act("delete the court's subscriptions", () => link(page, "/delete-court-subscriptions").click());
    await checkpoint("delete-court-subscription-confirmation");
    await act("answer yes", answerYes);
    await checkpoint("delete-court-subscription-success");

    await act("delete the court again", findCourtToDelete);
    await act("answer yes", answerYes);
    await checkpoint("delete-court-reference-data-success");
  }
};

async function giveCourtASubscriptionAndAPublication({ records, users, listTypes }: CathJourneyData): Promise<void> {
  const subscriber = users[SUBSCRIBER];
  if (!subscriber) throw new Error(`no CaTH account for ${SUBSCRIBER}`);
  const listTypeId = listTypes[LIST_TYPE];
  if (!listTypeId) throw new Error(`CaTH has no ${LIST_TYPE} list type`);
  await records.ensureSubscription(subscriber, "LOCATION_ID", COURT.id);
  const now = Date.now();
  await records.createPublication({
    locationId: COURT.id,
    listTypeId: Number(listTypeId),
    contentDate: "2022-04-01",
    displayFrom: new Date(now - DAY / 24).toISOString(),
    displayTo: new Date(now + DAY).toISOString()
  });
}
