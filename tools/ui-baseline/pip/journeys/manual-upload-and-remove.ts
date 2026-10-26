import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Journey } from "@hmcts/ui-baseline";
import { chooseCourt, courtName, primaryButton } from "./steps.js";

// Ported from pip's admin/manual-upload-json-test.ts (upload, error messages, change answers before
// confirming) and admin/remove-list-test.ts. One journey, so each locale's run removes exactly
// what it uploaded. The upload uses a location, list type and content date no seeded publication
// has: pip treats identical metadata as an update and would otherwise overwrite a baseline list.
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
  run: async ({ page, locale, goto, act, checkpoint }) => {
    const LOCATION_NAME = courtName(LOCATION_ID, locale);
    const continueButton = () => primaryButton(page);
    const today = londonDate(0);
    const tomorrow = londonDate(1);

    await goto("/admin-dashboard");
    await checkpoint("admin-dashboard");
    await act("manual upload card", () => page.locator("#card-manual-upload").click());
    await checkpoint("manual-upload");
    await act("continue with nothing entered", () => continueButton().click());
    await checkpoint("manual-upload-error");
    await act("fill in the upload form and continue", async () => {
      await page.locator("#manual-file-upload").setInputFiles({
        name: "civilAndFamilyDailyCauseList.json",
        mimeType: "application/json",
        buffer: await readFile(path.join(FIXTURES_DIR, PAYLOAD))
      });
      await chooseCourt(page, LOCATION_NAME);
      await page.locator("#listType").selectOption(LIST_TYPE);
      await fillDate(page, "content-date-from", CONTENT_DATE);
      await page.locator("#classification").selectOption("PUBLIC");
      await page.locator("#language").selectOption("ENGLISH");
      await fillDate(page, "display-date-from", today);
      await fillDate(page, "display-date-to", tomorrow);
      await continueButton().click();
    });
    await checkpoint("manual-upload-summary");
    await act("change the first answer", () => page.locator('main a[href*="manual-upload"]').first().click());
    await checkpoint("manual-upload-change");
    await act("continue with the answers unchanged", async () => {
      // A file input cannot be pre-filled, so the file is attached again as a user would
      await page.locator("#manual-file-upload").setInputFiles({
        name: "civilAndFamilyDailyCauseList.json",
        mimeType: "application/json",
        buffer: await readFile(path.join(FIXTURES_DIR, PAYLOAD))
      });
      await continueButton().click();
    });
    await checkpoint("manual-upload-summary-again");
    await act("confirm", () => continueButton().click());
    await checkpoint("manual-upload-confirmation");

    await goto("/admin-dashboard");
    await act("remove content card", () => page.locator("#card-remove-list-search").click());
    await checkpoint("remove-list-search");
    await act("continue with no court", () => continueButton().click());
    await checkpoint("remove-list-search-error");
    await act(`search for ${LOCATION_NAME}`, async () => {
      await chooseCourt(page, LOCATION_NAME);
      await continueButton().click();
    });
    await checkpoint("remove-list-search-results");
    await act("continue with nothing selected", () => continueButton().click());
    await checkpoint("remove-list-search-results-error");
    // The location is reserved for this journey, so the list just uploaded is the only result
    await act("select the uploaded list and continue", async () => {
      const lists = page.locator('main input[type=checkbox][name="courtLists"]');
      if ((await lists.count()) !== 1) throw new Error(`expected only the uploaded list at ${LOCATION_NAME}, found ${await lists.count()}`);
      await lists.check();
      await continueButton().click();
    });
    await checkpoint("remove-list-confirmation");
    await act("continue with no answer", () => continueButton().click());
    await checkpoint("remove-list-confirmation-error");
    // Known pip defect: the error re-render drops the hidden locationId, so answering yes now shows
    // pip's error page instead of removing the list. Recorded as pip behaves, then done cleanly.
    await act("answer yes after the error", async () => {
      await page.locator("#remove-choice").check();
      await continueButton().click();
    });
    await checkpoint("remove-list-confirmation-yes-after-error");
    await goto("/remove-list-search");
    await act(`search for ${LOCATION_NAME} again`, async () => {
      await chooseCourt(page, LOCATION_NAME);
      await continueButton().click();
    });
    await act("select the uploaded list and continue", async () => {
      await page.locator('main input[type=checkbox][name="courtLists"]').check();
      await continueButton().click();
    });
    await act("answer yes and continue", async () => {
      await page.locator("#remove-choice").check();
      await continueButton().click();
    });
    await checkpoint("remove-list-success");
  }
};

async function fillDate(page: import("playwright").Page, prefix: string, date: { day: string; month: string; year: string }): Promise<void> {
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
