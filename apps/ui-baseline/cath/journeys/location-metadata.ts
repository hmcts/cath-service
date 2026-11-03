import type { Journey } from "../../core/index.js";
import { chooseCourt, courtNames, link, primaryButton } from "./steps.js";

// CaTH's side of pip/journeys/location-metadata.ts: create, update and delete a court's caution and
// no-list messages, ending with no metadata. CaTH reaches the search through its /reference-data
// menu, and its manage page posts create, update and delete as values of one "action" button name.
// Manchester Civil Justice Centre in location-data.ts, which no seeded fixture gives metadata
const LOCATION_ID = 3;

export const locationMetadata: Journey = {
  id: "location-metadata",
  description: "System admin creates, updates and deletes a court's location metadata",
  viewAs: "system-admin",
  run: async ({ page, goto, act, checkpoint }) => {
    const court = courtNames(LOCATION_ID);
    const action = (value: string) => page.locator(`main form button[name="action"][value="${value}"]`);
    const fillMessages = async (suffix: string) => {
      await page.locator("#cautionMessage").fill(`Parity caution message ${suffix}`);
      await page.locator("#welshCautionMessage").fill(`Neges rybudd Parity ${suffix}`);
      await page.locator("#noListMessage").fill(`Parity no list message ${suffix}`);
      await page.locator("#welshNoListMessage").fill(`Neges dim rhestr Parity ${suffix}`);
    };
    const searchForCourt = async () => {
      await chooseCourt(page, "location-search", court);
      await primaryButton(page).click();
    };
    const manageLocation = async () => {
      await goto("/location-metadata-search");
      await searchForCourt();
    };

    await goto("/system-admin-dashboard");
    await act("reference data card, then location metadata", async () => {
      await link(page, "/reference-data").click();
      await page.waitForLoadState("networkidle");
      await link(page, "/location-metadata-search").click();
    });
    await checkpoint("location-metadata-search");
    await act("continue with no court", () => primaryButton(page).click());
    await checkpoint("location-metadata-search-error");
    await act(`search for ${court.name}`, searchForCourt);
    // The create step only means anything if the court has no metadata yet
    if ((await action("delete").count()) > 0) {
      throw new Error(`${court.name} already has location metadata, so this would be an update, not a create. Remove it and run again.`);
    }
    await checkpoint("location-metadata-manage-new");
    await act("enter the messages and create", async () => {
      await fillMessages("one");
      await action("create").click();
    });
    await checkpoint("location-metadata-create-confirmed");

    await act("manage the court again", manageLocation);
    await checkpoint("location-metadata-manage-existing");
    await act("change the messages and update", async () => {
      await fillMessages("two");
      await action("update").click();
    });
    await checkpoint("location-metadata-update-confirmed");

    await act("manage the court again", manageLocation);
    await act("delete", () => action("delete").click());
    await checkpoint("location-metadata-delete-confirmation");
    await act("continue with no answer", () => primaryButton(page).click());
    await checkpoint("location-metadata-delete-confirmation-error");
    await act("answer yes and continue", async () => {
      await page.locator('main input[type=radio][value="yes"]').check();
      await primaryButton(page).click();
    });
    await checkpoint("location-metadata-delete-confirmed");
  }
};
