import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Journey } from "../../core/index.js";
import type { CathJourneyData } from "./index.js";
import { link, primaryButton } from "./steps.js";

// CaTH's side of pip/journeys/list-type-search-config.ts: save a list type's search fields unchanged.
// pip's seed configures them (fixtures/list-search-config.json) and CaTH's does not, so the journey
// sets the same values first, for the form to show what pip's does, and puts back what was there
// after. CaTH saves straight from the form, so pip's summary checkpoint is not reached.
const LIST_TYPE = "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST";
const SEARCH_CONFIG_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures/list-search-config.json");
const UNLINKED_NOTE =
  "Reached by URL: no CaTH page links to /list-search-config/<listTypeId> (manage list types leads to manage-list-type, which offers only edit and delete).";

export const listTypeSearchConfig: Journey = {
  id: "list-type-search-config",
  description: "System admin reviews and saves a list type's case search fields",
  viewAs: "system-admin",
  run: async ({ page, goto, act, checkpoint, data }) => {
    const { listTypes, records } = data as unknown as CathJourneyData;
    const listTypeId = Number(listTypes[LIST_TYPE]);
    if (!listTypeId) throw new Error(`CaTH has no ${LIST_TYPE} list type`);
    const { jsonListTypes } = JSON.parse(await readFile(SEARCH_CONFIG_FILE, "utf-8"));
    const original = await records.replaceListSearchConfig(listTypeId, jsonListTypes);

    try {
      await goto("/system-admin-dashboard");
      await act("manage list types card", () => link(page, "/manage-list-types").click());
      await checkpoint("manage-list-types");
      await goto(`/list-search-config/${listTypeId}`);
      await checkpoint("edit-list-type-search-config", UNLINKED_NOTE);
      await act("save the current fields", () => primaryButton(page).click());
      await checkpoint("edit-list-type-search-config-success");
    } finally {
      await records.replaceListSearchConfig(listTypeId, original);
    }
  }
};
