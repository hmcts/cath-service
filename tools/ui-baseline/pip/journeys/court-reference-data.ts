import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Journey } from "@hmcts/ui-baseline";
import { chooseCourt, primaryButton } from "./steps.js";

// Ported from pip's system-admin/upload-reference-data-test.ts and delete-court-test.ts as one
// lifecycle, so each locale's run removes the court it creates. The court gets a subscription and a
// publication through the API after upload (as pip's E2E suite sets up data), which makes pip refuse
// the delete until its publications and then its subscriptions are removed.
const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures");
const DATA_MANAGEMENT_URL = process.env.PIP_DATA_MANAGEMENT_URL ?? "http://localhost:18090";
const ACCOUNT_MANAGEMENT_URL = process.env.PIP_ACCOUNT_MANAGEMENT_URL ?? "http://localhost:16969";
const REQUESTER_ID = "00000000-0000-4000-8000-000000000001";
const COURT = { id: "9901", name: "Parity Reference Data Court", welshName: "Llys Data Cyfeirnod Parity" };
const CSV = [
  "P&I ID,Court Desc,Welsh Court Desc,Region,Welsh Region,Jurisdiction,Welsh Jurisdiction,Jurisdiction Type,Welsh Jurisdiction Type,Provenance,Provenance Location ID,Provenance Location Type,Email,Contact No",
  `${COURT.id},${COURT.name},${COURT.welshName},London,Llundain,Civil,Sifil,Civil Court,Llys Sifil,MANUAL_UPLOAD,${COURT.id},Venue,,`
].join("\n");

export const courtReferenceData: Journey = {
  id: "court-reference-data",
  description: "System admin uploads a court in reference data, then deletes it after removing its subscriptions and publications",
  viewAs: "system-admin",
  run: async ({ page, locale, goto, act, checkpoint }) => {
    const courtName = locale === "cy" ? COURT.welshName : COURT.name;
    const continueButton = () => primaryButton(page);
    const answerYes = async () => {
      await page.locator('main input[type=radio][value="yes"]').first().check();
      await continueButton().click();
    };
    const findCourtToDelete = async () => {
      await goto("/delete-court-reference-data");
      await chooseCourt(page, courtName);
      await continueButton().click();
    };

    await goto("/system-admin-dashboard");
    await checkpoint("system-admin-dashboard");
    // Known pip defect: in Welsh this card links to /manual-reference-data-upload, which does not exist
    await act("upload reference data card", () => page.locator('main a[id^="card-"][id$="reference-data-upload"]').click());
    if (locale === "cy") {
      await checkpoint("reference-data-upload-card-not-found");
      await goto("/reference-data-upload");
    }
    await checkpoint("reference-data-upload");
    await act("continue with no file", () => continueButton().click());
    await checkpoint("reference-data-upload-error");
    await act("attach a one-court CSV and continue", async () => {
      await page.locator("#reference-data-upload").setInputFiles({ name: "parity-court.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) });
      await continueButton().click();
    });
    await checkpoint("reference-data-upload-summary");
    await act("confirm", () => continueButton().click());
    await checkpoint("reference-data-upload-confirmation");

    await giveCourtASubscriptionAndAPublication();

    await goto("/system-admin-dashboard");
    await act("delete court card", () => page.locator("#card-delete-court-reference-data").click());
    await checkpoint("delete-court-reference-data");
    await act("continue with no court", () => continueButton().click());
    await checkpoint("delete-court-reference-data-error");
    await act(`search for ${courtName}`, async () => {
      await chooseCourt(page, courtName);
      await continueButton().click();
    });
    await checkpoint("delete-court-reference-data-confirmation");
    // pip refuses while the court has publications, and only checks subscriptions once those are gone
    await act("answer yes while the court has publications", answerYes);
    await checkpoint("delete-court-reference-data-refused-publications");
    await act("delete the court's publications", () => page.locator('main a[href*="delete-court-publication-confirmation"]').click());
    await checkpoint("delete-court-publication-confirmation");
    await act("answer yes", answerYes);
    await checkpoint("delete-court-publication-success");

    await act("delete the court again", findCourtToDelete);
    await act("answer yes while the court has subscriptions", answerYes);
    await checkpoint("delete-court-reference-data-refused-subscriptions");
    await act("delete the court's subscriptions", () => page.locator('main a[href*="delete-court-subscription-confirmation"]').click());
    await checkpoint("delete-court-subscription-confirmation");
    await act("answer yes", answerYes);
    await checkpoint("delete-court-subscription-success");

    await act("delete the court again", findCourtToDelete);
    await act("answer yes", answerYes);
    await checkpoint("delete-court-reference-data-success");
  }
};

async function giveCourtASubscriptionAndAPublication(): Promise<void> {
  const headers = { "x-requester-id": REQUESTER_ID, "content-type": "application/json" };
  const subscriber = (await (await fetch(`${ACCOUNT_MANAGEMENT_URL}/account/provenance/PI_AAD/00000000-0000-4000-8000-0000000000d1`, { headers })).json()) as {
    userId: string;
  };
  const subscribed = await fetch(`${ACCOUNT_MANAGEMENT_URL}/subscription`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      channel: "EMAIL",
      searchType: "LOCATION_ID",
      searchValue: COURT.id,
      locationName: COURT.name,
      listType: null,
      userId: subscriber.userId
    })
  });
  if (!subscribed.ok) throw new Error(`pip refused the court subscription: ${subscribed.status} ${await subscribed.text()}`);

  const now = new Date();
  const iso = (date: Date) => date.toISOString().slice(0, 19);
  const published = await fetch(`${DATA_MANAGEMENT_URL}/publication`, {
    method: "POST",
    headers: {
      ...headers,
      "x-type": "LIST",
      "x-provenance": "MANUAL_UPLOAD",
      "x-sensitivity": "PUBLIC",
      "x-language": "ENGLISH",
      "x-display-from": iso(new Date(now.getTime() - 60 * 60 * 1000)),
      "x-display-to": iso(new Date(now.getTime() + 24 * 60 * 60 * 1000)),
      "x-list-type": "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
      "x-court-id": COURT.id,
      "x-content-date": "2022-04-01T00:00:00"
    },
    body: await readFile(path.join(FIXTURES_DIR, "payloads/civil-and-family-daily-cause-list.json"))
  });
  if (!published.ok) throw new Error(`pip refused the court publication: ${published.status} ${await published.text()}`);
}
