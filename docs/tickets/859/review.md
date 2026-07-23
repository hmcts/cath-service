# Code Review: Issue #859

## Summary

Pure catalogue-data change registering four High Court flat-file daily cause list
types (Business & Property, Circuit Commercial Court, HC Civil, HC Family). Two files
touched:

- `libs/list-types/common/src/list-type-data.ts` — four object literals appended to the
  `listTypeData` array (lines 674–715 of the new file; diff shows the added block).
- `libs/list-types/common/src/list-type-data.test.ts` — new co-located unit test (untracked).

The implementation is correct, matches the ticket's page-title and URL tables, follows
repo conventions, and is well tested. All values cross-check against
`libs/location/src/location-data.ts`. No bespoke schema/renderer/PDF/converter work was
attempted, which is correct for flat-file lists per the ticket's "Out of scope" section.

The one substantive point is a deliberate, product-approved divergence from the literal
ticket text (`isNonStrategic: false` vs the ticket's `true`) — see the note under
Acceptance Criteria. This is **not** a bug; it is required for the described flat-file
`/manual-upload` journey.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

None blocking. One item to reconcile (tracking, not a code defect):

1. **Enum `name` / `isNonStrategic` flag must be reconciled with CaTH ORG (#846).**
   Production `list_type` rows are **not** seeded locally — `seed-list-types.ts` skips
   seeding when `ENVIRONMENT === "prod"`, so prod rows arrive via the CaTH ORG data sync
   keyed on `name`. Two risks:
   - If any of the four `name` strings does not match the ORG enum exactly, sync fails
     silently and the list type never appears in prod.
   - The seed here sets `isNonStrategic: false`, while the ticket AC literally says
     `true`. If ORG carries these as non-strategic, the seed diverges from prod and the
     type would land in a different upload journey than the local seed implies.
   Confirm both the four `name` values and the `isNonStrategic` flag against #846 / ORG
   before/at deploy. This is a data-alignment action, not a source fix.

## 💡 SUGGESTIONS

1. `list-type-data.test.ts:83` asserts EN and CY friendly names in a single `it` with two
   `expect`s. Per `.claude/rules/testing.md` a stricter one-assertion-per-behaviour split
   (separate EN and CY `it` blocks) would isolate failures. Minor — the current grouping
   is reasonable and still proves both values.
2. The test re-declares the expected data as a local `NEW_LIST_TYPES` constant. That is
   the right approach (it proves values rather than importing the same source under test),
   but it deliberately omits `provenance`, `isNonStrategic`, and `defaultSensitivity` from
   that fixture and asserts them as literals inside the loop instead. Consider folding
   `defaultSensitivity: "Public"` into an assertion too — it is currently the one
   catalogue field on the new entries with **no** test coverage (see AC below).

## ✅ Positive Feedback

- Correct use of the stable `name` enum throughout; no numeric `listTypeId` anywhere,
  fully compliant with the List Type Implementation rules in CLAUDE.md.
- `&` vs `&amp;` handled correctly: the TS source uses a literal `&` ("Business & Property
  Daily Cause List"), matching the existing `MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST` precedent
  (`list-type-data.ts:157`). The ticket's `&amp;` is just HTML-entity rendering in the
  markdown table, not the intended stored value. Correct call.
- `subJurisdictionIds` are accurate against `libs/location/src/location-data.ts`:
  `[10]` = "High Court" (jurisdictionId 1, Civil) for the first three; `[11]` = "High
  Court of the Family Division" (jurisdictionId 2, Family) for the family list
  (`location-data.ts:324–335`). The family list correctly uses `[11]`, matching the
  ticket's differing "Jurisdiction" column.
- All four enum names, EN names, CY names, and urlPaths match the ticket tables verbatim.
- No duplicate `name` collisions introduced (catalogue has zero duplicate names), and the
  four new `urlPath`s are unique — they are not among the pre-existing shared-path entries
  (e.g. `siac-poac-paac-weekly-hearing-list`). The test explicitly guards both.
- Test follows the AAA pattern, is data-driven over all four entries, asserts concrete
  field values (not mere existence), and includes name/urlPath uniqueness checks that
  catch copy-paste dupes.
- `.js` import extension used correctly (`./list-type-data.js`); module ordering and
  kebab-case file naming conform to CLAUDE.md.

## Test Coverage Assessment

Command: `yarn workspace @hmcts/list-types-common test --coverage`

- Workspace `libs/list-types/common`: **87.68% statements** (463/528), 82.23% branches,
  86.9% lines. 17 files / 274 tests passing.
- `list-type-data.ts` itself does not appear as an under-covered file — as a pure export
  it is fully exercised by the new test.
- Above the 80% threshold. Not flagged. (Low per-file numbers in `src/conversion` are
  pre-existing and unrelated to this change.)

## Acceptance Criteria Verification

### List type data registration
- [x] Add all four list type entries with correct `name`, `englishFriendlyName`,
  `welshFriendlyName`, `urlPath`, `provenance`, `isNonStrategic`, `defaultSensitivity`,
  `subJurisdictionIds` — `list-type-data.ts:674–715`.
  **Note:** implemented as `isNonStrategic: false` (`list-type-data.ts:681,691,701,711`),
  intentionally overriding the ticket's literal `isNonStrategic: true` per the confirmed
  product decision. `/manual-upload` only lists strategic types (`isNonStrategic=false`)
  and accepts PDF/CSV/DOC flat files, whereas `/non-strategic-upload` lists non-strategic
  types but accepts only `.xlsx`; `false` is therefore required for the described
  flat-file journey. Marked met on that basis.
- [~] Enum `name` values match CaTH ORG exactly (#846) — names copied verbatim from the
  ticket table (`list-type-data.ts:677,687,697,707`), but not yet confirmed against ORG.
  Must be reconciled with #846; a name/flag mismatch with ORG would diverge the seed from
  prod (see HIGH PRIORITY item 1).

### Manual upload journey (flat file)
- [~] Each list type selectable in the admin manual-upload journey — delivered by existing
  generic code (dropdown built from `findStrategicListTypes` seeded from the catalogue);
  `isNonStrategic: false` correctly places them in `/manual-upload`. Not manually walked
  through in this change.
- [~] Flat file uploadable/committable producing `isFlatFile: true` — delivered by existing
  `manual-upload-summary` (`isFlatFile = !fileName.endsWith(".json")`); manual QA deferred.
- [~] No JSON schema validation on the flat-file upload — delivered by existing validator
  (only `.json` is schema-checked); manual QA deferred.

### Viewing the flat file
- [~] Viewable/downloadable via generic flat-file path — delivered by existing
  `libs/public-pages/src/flat-file/`; manual QA deferred.
- [~] Correct EN/CY friendly names shown, driven by the catalogue — names present in the
  entries (`list-type-data.ts:678–679`, etc.) and read by `flat-file-service.ts`; manual
  QA deferred.
- [~] Access control 403 when user lacks access — delivered by existing
  `canAccessPublicationData` guard; manual QA deferred.

### Welsh language
- [x] Welsh friendly names present in the catalogue entries — `list-type-data.ts:679,689,
  699,709`; asserted by the test (`list-type-data.test.ts:83–91`). Usage under `?lng=cy`
  is delivered by existing generic view code.

### Tests
- [x] Unit tests added for the `list-type-data.ts` additions —
  `libs/list-types/common/src/list-type-data.test.ts` (all four entries, field values,
  and uniqueness).
- [~] `yarn test` passes across the workspace — scoped `list-types-common` suite passes
  (274/274). Full-workspace `yarn test` reported one flaky unrelated 5000ms timeout in
  `apps/web/src/server.test.ts` under parallel load (passes in isolation per tasks.md);
  not re-run in full here.

**Coverage gap:** no criterion covers `defaultSensitivity: "Public"` — it is set correctly
in all four entries but is the one new field with no assertion in the test (see SUGGESTIONS 2).

## Next Steps

- [ ] Confirm the four `name` enums and the `isNonStrategic: false` flag against CaTH ORG
      / #846 to guarantee the prod data sync populates and journeys align.
- [ ] (Optional) Add a `defaultSensitivity` assertion to the test.
- [ ] Perform the deferred manual QA (upload PDF, view/download, `?lng=cy`, 403) once a
      seeded DB is available.
- [ ] Re-run full `yarn test` to confirm the unrelated `server.test.ts` timeout is flaky.

## Overall Assessment

**NEEDS CHANGES** (advisory — does not block committing).

Rationale for the advisory verdict, per the coverage/AC rules: several acceptance criteria
resolve to `- [~]` — the `name`/#846 reconciliation is outstanding, and the upload/view/
download/403/`?lng=cy` criteria are delivered by existing generic code but not manually
walked through in this change. Statement coverage (87.68%) is above threshold and the code
itself is correct, well-structured, and convention-compliant. The `isNonStrategic: false`
choice is an approved product decision, not a defect. In practice the source change is
sound; the remaining items are data-alignment confirmation (#846) and manual QA.

Security / accessibility / GOV.UK / performance sections are N/A for this change: it adds
no routes, templates, styles, queries, or user-facing markup — only static catalogue data
consumed by pre-existing, already-reviewed generic code.
