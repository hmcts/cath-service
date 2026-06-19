# Technical Plan: Issue #744 — Update Verified User Case Subscription Search Screen

## 1. Technical Approach

The root cause is bad data in `list_search_config`: `caseNameFieldName` is set to a party field (e.g. applicant name) for some list types, causing `artefact_search.case_name` to be populated with party data instead of case names. The extraction logic itself is correct; only the configuration data is wrong.

Three changes are needed:

1. **Fix `searchByCaseNumber` query** — add the same display window filter that `searchByCaseName` already applies, so expired artefacts are not returned.
2. **Data fix** — update the misconfigured `list_search_config` rows so `caseNameFieldName` maps to the correct JSON field for each affected list type. This is blocked on a DB audit (see Open Questions).
3. **Re-extraction** — once config is corrected, re-run extraction for all currently-published artefacts to overwrite stale `artefact_search` rows. A one-off script is the safest approach; it reuses the existing `extractAndStoreArtefactSearch` function which already deletes and recreates rows per artefact.

No UI or template changes are required. The template already renders only `caseName` and `caseNumber`; the problem is in the values stored there.

## 2. Implementation Details

### `libs/subscriptions/src/repository/queries.ts`

`searchByCaseNumber` currently has no display window filter:

```typescript
// current — no display window filter
where: {
  caseNumber: reference,
  artefact: { listType: { listSearchConfig: { caseNumberFieldName: { not: "" } } } }
}
```

Add the same `displayFrom`/`displayTo` filter that `searchByCaseName` uses:

```typescript
where: {
  caseNumber: reference,
  artefact: {
    displayFrom: { lte: now },
    displayTo: { gte: now },
    listType: { listSearchConfig: { caseNumberFieldName: { not: "" } } }
  }
}
```

The `now` constant is already used in `searchByCaseName` in the same file — replicate the same pattern.

### `libs/postgres-prisma/prisma/schema/list-search-config.prisma` (data only, no schema change)

No schema change needed. The fix is updating rows in the `list_search_config` table via the existing system admin UI at `/admin/list-search-config/[listTypeId]` or via a targeted migration script. The specific list type IDs and correct field names must be identified by DB audit first.

### One-off re-extraction script (new file)

Create `scripts/reextract-artefact-search.ts` (or a one-off migration) that:

1. Queries all artefacts currently within their display window (where `displayFrom <= now <= displayTo` and `isFlatFile = false`).
2. For each, calls `extractAndStoreArtefactSearch(artefact.id, artefact.listTypeId, artefact.payload)`.
3. Logs counts of processed/skipped artefacts.

This reuses the existing extractor and is safe to run multiple times (extractor deletes before re-inserting). Scope of this step depends on the answer to Open Question 2.

### `libs/subscriptions/src/repository/queries.test.ts` (or co-located test file)

Add a test asserting that `searchByCaseNumber` does not return results outside the display window. Existing tests for `searchByCaseName` cover this pattern and can be used as a reference.

## 3. Error Handling & Edge Cases

- **`displayTo` is null**: Some artefacts may have no `displayTo`. The filter `displayTo: { gte: now }` will exclude rows where `displayTo` is null. Confirm whether null `displayTo` should mean "no expiry" — if so, the filter needs `OR: [{ displayTo: { gte: now } }, { displayTo: null }]`. Check existing `searchByCaseName` behaviour for the established pattern to follow.
- **Re-extraction on large payload volumes**: The re-extraction script should process artefacts in batches (e.g. 100 at a time) to avoid memory pressure or long-running transactions.
- **Subscription rows with stale `caseName`**: Existing `subscription` rows that already captured a party-derived `caseName`/`searchValue` are not corrected by this fix. Whether those need retroactive cleanup is out of scope unless explicitly confirmed (see Open Questions).
- **Config update order**: Update `list_search_config` data before running the re-extraction script. Running the script against stale config will reproduce the same bad data.

## 4. Acceptance Criteria Mapping

| Criterion | How it is met |
|---|---|
| Case search results show case name, not party name | `caseNameFieldName` in config points to the correct field; re-extraction overwrites stale `artefact_search` rows |
| Case number search does not return expired results | Display window filter added to `searchByCaseNumber` |
| Subscription confirmation emails show correct case name | Email formatting is downstream of `artefact_search.case_name`; fixing stored data fixes emails |
| No party data visible in search results | Correct config + re-extraction removes party values from `artefact_search.case_name` |

## 5. Open Questions / CLARIFICATIONS NEEDED

1. **Which list types are misconfigured?** A DB query against `list_search_config` is needed to identify which `listTypeId` rows have `caseNameFieldName` set to a party field. This is a prerequisite before any data fix can be written. The correct field names for each list type also need to be confirmed.

2. **Is backfilling in scope?** Should existing `artefact_search` rows (and potentially `subscription` rows) be corrected for already-published artefacts, or will the fix apply only to artefacts re-published after the config is updated?

3. **`displayTo` null semantics for `searchByCaseNumber`**: Should artefacts with no `displayTo` be treated as never-expiring (include them) or excluded? The existing `searchByCaseName` filter behaviour should be taken as the reference.

4. **Stale subscription rows**: Are there `subscription` rows where `searchValue` or `caseName` already contains party data? If yes, are those in scope for correction?
