import type { Journey } from "../../core/index.js";

// CaTH's side of pip/journeys/bulk-create-media-accounts.ts. CaTH has no bulk create pages: its
// dashboard tile links to /bulk-media-accounts, which nothing serves. So this reaches none of pip's
// checkpoints and the comparison reports each as missing; port the steps when CaTH has the pages.
export const bulkCreateMediaAccounts: Journey = {
  id: "bulk-create-media-accounts",
  description: "System admin uploads a CSV of media accounts and reaches the confirmation step",
  viewAs: "system-admin",
  run: async () => {}
};
