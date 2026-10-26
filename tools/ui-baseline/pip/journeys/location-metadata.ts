import type { Journey } from "@hmcts/ui-baseline";
import { chooseCourt, courtName, primaryButton } from "./steps.js";

// Ported from pip's system-admin/manage-location-metadata-test.ts: create, update and delete a
// court's caution and no-list messages, ending with no metadata so each run starts from the same state.
// Manchester Civil Justice Centre in location-data.ts
const LOCATION_ID = 3;

export const locationMetadata: Journey = {
  id: "location-metadata",
  description: "System admin creates, updates and deletes a court's location metadata",
  viewAs: "system-admin",
  run: async ({ page, locale, goto, act, checkpoint }) => {
    const LOCATION_NAME = courtName(LOCATION_ID, locale);
    const submit = (label: RegExp) => page.locator("main form button[type=submit]").filter({ hasText: label }).first();
    const fillMessages = async (suffix: string) => {
      await page.locator("#english-caution-message").fill(`Parity caution message ${suffix}`);
      await page.locator("#welsh-caution-message").fill(`Neges rybudd Parity ${suffix}`);
      await page.locator("#english-no-list-message").fill(`Parity no list message ${suffix}`);
      await page.locator("#welsh-no-list-message").fill(`Neges dim rhestr Parity ${suffix}`);
    };
    const manageLocation = async () => {
      await goto("/location-metadata-search");
      await chooseCourt(page, LOCATION_NAME);
      await primaryButton(page).click();
    };

    await goto("/system-admin-dashboard");
    await act("location metadata card", () => page.locator("#card-location-metadata-search").click());
    await checkpoint("location-metadata-search");
    await act("continue with no court", () => primaryButton(page).click());
    await checkpoint("location-metadata-search-error");
    await act(`search for ${LOCATION_NAME}`, async () => {
      await chooseCourt(page, LOCATION_NAME);
      await primaryButton(page).click();
    });
    // The create step only means anything if the court has no metadata yet
    if ((await page.locator('main a[href*="location-metadata-delete-confirmation"]').count()) > 0) {
      throw new Error(
        `${LOCATION_NAME} already has location metadata, so this would be an update, not a create. Run journeys against a freshly seeded pip stack.`
      );
    }
    await checkpoint("location-metadata-manage-new");
    await act("enter the messages and create", async () => {
      await fillMessages("one");
      await primaryButton(page).click();
    });
    await checkpoint("location-metadata-create-confirmed");

    await act("manage the court again", manageLocation);
    await checkpoint("location-metadata-manage-existing");
    await act("change the messages and update", async () => {
      await fillMessages("two");
      await submit(/update|diweddaru/i).click();
    });
    await checkpoint("location-metadata-update-confirmed");

    await act("manage the court again", manageLocation);
    await act("delete", () => page.locator('main a[href*="location-metadata-delete-confirmation"]').click());
    await checkpoint("location-metadata-delete-confirmation");
    await act("continue with no answer", () => primaryButton(page).click());
    await checkpoint("location-metadata-delete-confirmation-error");
    await act("answer yes and continue", async () => {
      await page.locator('main input[type=radio][value="yes"]').first().check();
      await primaryButton(page).click();
    });
    await checkpoint("location-metadata-delete-confirmed");
  }
};
