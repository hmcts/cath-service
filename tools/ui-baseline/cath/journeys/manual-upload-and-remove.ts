import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Journey } from "@hmcts/ui-baseline";
import type { Page } from "playwright";
import type { CathJourneyData } from "./index.js";
import { chooseCourt, courtNames, link, primaryButton } from "./steps.js";

// CaTH's side of pip/journeys/manual-upload-and-remove.ts: upload a JSON list, change an answer
// before confirming, then remove the same list, at a location no seeded publication uses. CaTH keeps
// the removal in the session, so answering yes after the confirmation's error removes the list:
// pip's "remove-list-confirmation-yes-after-error" (pip's error page) has no CaTH step, and that
// answer leads straight to remove-list-success.
const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures");
// Manchester Civil Justice Centre in location-data.ts
const LOCATION_ID = 3;
const LIST_TYPE = "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST";
const PAYLOAD = "payloads/civil-and-family-daily-cause-list.json";
const CONTENT_DATE = { day: "01", month: "03", year: "2022" };

export const manualUploadAndRemove: Journey = {
  id: "manual-upload-and-remove-list",
  description: "Admin uploads a JSON list, checks and changes the details, confirms, then removes the same list",
  viewAs: "super-admin-local",
  run: async ({ page, goto, act, checkpoint, data }) => {
    const listTypeId = (data as unknown as CathJourneyData).listTypes[LIST_TYPE];
    if (!listTypeId) throw new Error(`CaTH has no ${LIST_TYPE} list type`);
    const court = courtNames(LOCATION_ID);
    const continueButton = () => primaryButton(page);
    const attachFile = async () =>
      page.locator("#file").setInputFiles({
        name: "civilAndFamilyDailyCauseList.json",
        mimeType: "application/json",
        buffer: await readFile(path.join(FIXTURES_DIR, PAYLOAD))
      });
    const searchForCourt = async () => {
      await chooseCourt(page, "locationId", court);
      await continueButton().click();
    };
    const uploadedList = () => page.locator('main input[type=checkbox][name="artefacts"]');
    const answerYes = async () => {
      await page.locator('main input[name="confirmation"][value="yes"]').check();
      await continueButton().click();
    };

    await goto("/admin-dashboard");
    await checkpoint("admin-dashboard");
    await act("manual upload card", () => link(page, "/manual-upload").click());
    await checkpoint("manual-upload");
    await act("continue with nothing entered", () => continueButton().click());
    await checkpoint("manual-upload-error");
    await act("fill in the upload form and continue", async () => {
      await attachFile();
      await chooseCourt(page, "court", court);
      await page.locator("#listType").selectOption(listTypeId);
      await fillDate(page, "hearingStartDate", CONTENT_DATE);
      await page.locator("#sensitivity").selectOption("PUBLIC");
      await page.locator("#language").selectOption("ENGLISH");
      await fillDate(page, "displayFrom", londonDate(0));
      await fillDate(page, "displayTo", londonDate(1));
      await continueButton().click();
    });
    await checkpoint("manual-upload-summary");
    await act("change the first answer", () => page.locator('main a[href^="/manual-upload#"]').first().click());
    await checkpoint("manual-upload-change");
    // A file input cannot be pre-filled, so the file is attached again as a user would
    await act("continue with the answers unchanged", async () => {
      await attachFile();
      await continueButton().click();
    });
    await checkpoint("manual-upload-summary-again");
    await act("confirm", () => continueButton().click());
    await checkpoint("manual-upload-confirmation");

    await goto("/admin-dashboard");
    await act("remove content card", () => link(page, "/remove-list-search").click());
    await checkpoint("remove-list-search");
    await act("continue with no court", () => continueButton().click());
    await checkpoint("remove-list-search-error");
    await act(`search for ${court.name}`, searchForCourt);
    await checkpoint("remove-list-search-results");
    await act("continue with nothing selected", () => continueButton().click());
    await checkpoint("remove-list-search-results-error");
    // The location is reserved for this journey, so the list just uploaded is the only result
    await act("select the uploaded list and continue", async () => {
      const count = await uploadedList().count();
      if (count !== 1) throw new Error(`expected only the uploaded list at ${court.name}, found ${count}`);
      await uploadedList().check();
      await continueButton().click();
    });
    await checkpoint("remove-list-confirmation");
    await act("continue with no answer", () => continueButton().click());
    await checkpoint("remove-list-confirmation-error");
    await act("answer yes after the error", answerYes);
    await checkpoint("remove-list-success");
  }
};

async function fillDate(page: Page, prefix: string, date: { day: string; month: string; year: string }): Promise<void> {
  await page.locator(`#${prefix}-day`).fill(date.day);
  await page.locator(`#${prefix}-month`).fill(date.month);
  await page.locator(`#${prefix}-year`).fill(date.year);
}

// Display dates have to be current for the upload to be accepted, so they are today's London date
function londonDate(offsetDays: number): { day: string; month: string; year: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000))
      .map((part) => [part.type, part.value])
  );
  return { day: parts.day, month: parts.month, year: parts.year };
}
