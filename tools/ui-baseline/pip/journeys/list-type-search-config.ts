import type { Journey } from "@hmcts/ui-baseline";
import { primaryButton } from "./steps.js";

// Ported from pip's system-admin/manage-list-types-test.ts: edit a list type's search fields. It saves
// the values already configured (tools/ui-baseline/fixtures/list-search-config.json), so case search is unaffected.
const LIST_TYPE = "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST";

export const listTypeSearchConfig: Journey = {
  id: "list-type-search-config",
  description: "System admin reviews and saves a list type's case search fields",
  viewAs: "system-admin",
  run: async ({ page, goto, act, checkpoint }) => {
    await goto("/system-admin-dashboard");
    await act("manage list types card", () => page.locator("#card-manage-list-types").click());
    await checkpoint("manage-list-types");
    await act("edit the civil and family list", () => page.locator(`main a[href*="listType=${LIST_TYPE}"]`).first().click());
    await checkpoint("edit-list-type-search-config");
    await act("continue with the current fields", () => primaryButton(page).click());
    await checkpoint("edit-list-type-search-config-summary");
    await act("confirm", () => primaryButton(page).click());
    await checkpoint("edit-list-type-search-config-success");
  }
};
