# Code Review: Issue #791

## Summary

Issue #791 "Style Guide: IAC Daily List" ports two manually-uploaded list types from
the pip source repositories into CaTH: the **Immigration and Asylum Chamber Daily List**
(`IAC_DAILY_LIST`) and the **Immigration and Asylum Chamber Daily List – Additional
Cases** (`IAC_DAILY_LIST_ADDITIONAL_CASES`). The change adds a new
`@hmcts/iac-daily-list` lib (types, JSON schema + validator, renderer, PDF generator,
locales), two web pages sharing one controller, seed-catalogue entries, PDF-registry
registration, and an ordering tie-break so the Daily List always precedes the Additional
Cases list under the same venue.

The implementation is well-structured and adheres closely to the project's
list-type conventions. Both explicit acceptance criteria are met. All four changed
workspaces exceed the 80% coverage bar. There are no CRITICAL blockers. Two
HIGH-priority items should be addressed before merge: a client-side search-filtering
wiring gap on the IAC templates, and unverified party-role string constants in the
renderer. A third HIGH item is the incomplete AC2 permutation coverage.

Overall verdict: **NEEDS CHANGES** (both ACs met and coverage strong, but the
search-box functional defect and the unverified party-role mapping warrant a fix
before merge).

## 🚨 CRITICAL Issues

None identified.

- Both explicit ACs are met.
- No security or data-privacy violations (validation via shared `createJsonValidator`;
  access control delegated to the shared handler; no sensitive logging; no raw SQL).
- No type-safety violations (no `any`; interfaces fully typed in
  `libs/list-types/iac-daily-list/src/models/types.ts`).
- The `listTypeId` numeric-ID rule is followed everywhere — routing, ordering, PDF
  registry and Excel/PDF selection are all keyed on the stable `listTypeName`; the
  controller test fixture uses `listTypeId: 999`
  (`apps/web/src/pages/(list-types)/iac-daily-list/index.test.ts:52`).
- Schema + `validate*` wrapper + `json-validator.test.ts` + `index.ts` export are all
  present, satisfying the CI guard in `libs/list-types/common`.

## ⚠️ HIGH PRIORITY Issues

1. **Client-side case search does not filter/hide rows on the IAC pages**
   - `apps/web/src/assets/js/table-search.ts` targets rows via `#hearings-table tbody tr`
     and `.hearings-table tbody tr` (TABLE_ID `"hearings-table"`, TABLE_CLASS
     `"hearings-table"`). The IAC tables in
     `apps/web/src/pages/(list-types)/iac-daily-list/iac-daily-list.njk` use
     `class="govuk-table overflow-table"` and carry neither the `hearings-table` id
     nor class (confirmed: `grep -c "hearings-table"` returns 0 in the template).
   - **Impact**: The search input (`id="case-search-input"`, wired to
     `INPUT_ID="case-search-input"`) will match the container
     (`court-lists-container` is in `CONTAINER_IDS`), so highlight logic may run, but
     `tableRows` resolves to an empty set — non-matching rows are never hidden. The
     advertised "search cases" progressive enhancement is effectively non-functional
     for these two pages.
   - **Recommendation**: Add the `hearings-table` class (or id) to the IAC tables, or
     extend `table-search.ts` to also select `#court-lists-container .govuk-table tbody tr`.
     Add a `.njk.test.ts` assertion that the tables carry the selector the search
     script relies on, so this cannot silently regress.

2. **Party-role string constants in the renderer are unverified against the pip source**
   - `libs/list-types/iac-daily-list/src/rendering/renderer.ts:18-20` hardcodes
     `APPELLANT_ROLE = "APPELLANT"`, `RESPONDENT_ROLE = "RESPONDENT"`,
     `APPELLANT_REPRESENTATIVE_ROLE = "APPELLANT_REPRESENTATIVE"` and switches on
     `p.partyRole` (lines 94-104). The sibling daily-cause-list code in
     `@hmcts/list-types-common` classifies with different role strings
     (`APPLICANT_PETITIONER` / `RESPONDENT` / `RESPONDENT_REPRESENTATIVE`), so IAC
     reimplements role classification locally with its own assumed strings rather than
     reusing pip's `PartyRoleHelper` semantics.
   - **Impact**: If pip emits any role value other than these exact three strings
     (e.g. `APPELLANT_PETITIONER`, or representatives keyed differently), the
     appellant / respondent / representative columns silently render empty. This is a
     correctness risk for the AC1 "created in the front end" data and is not caught by
     the current tests (which feed the assumed strings back in).
   - **Recommendation**: Confirm the exact `partyRole` enum values against the pip
     `IacDailyListService` / `PartyRoleHelper` source of truth and cite it, or route
     classification through the shared helper so IAC stays aligned with the other
     list types. At minimum, add a renderer test proving unknown role strings are
     handled deliberately.

3. **AC2 ordering is proven for only 3 of 4 publish-order × locale permutations**
   - `apps/web/src/pages/(public)/summary-of-publications/index.test.ts` adds three
     tests (additional-first/en, daily-first/en, additional-first/cy) but omits the
     (daily-first, cy) combination.
   - **Impact**: Low — the `IAC_ORDER` tie-break in
     `apps/web/src/pages/(public)/summary-of-publications/index.ts:110-112` is
     locale-independent, so the gap is unlikely to hide a defect. But the ticket's AC2
     wording ("regardless of the order in which both lists are published") invites
     proving all four permutations.
   - **Recommendation**: Add the fourth permutation for completeness.

## 💡 SUGGESTIONS

1. **Byte-identical duplicate templates** —
   `apps/web/src/pages/(list-types)/iac-daily-list/iac-daily-list.njk` and
   `iac-daily-list-additional-cases.njk` are identical. The title already comes from
   the controller (`listTitle`), so a single shared template selected by the handler
   would remove the duplication (DRY). This matches an established sibling pattern
   where a single template serves multiple list-type names.

2. **Uncovered defensive branches** — `renderer.ts:137` (the empty-string fallback in
   `formatHearingChannel` when neither `sitting.channel` nor `session.sessionChannel`
   is present) and `pdf-generator.ts:44-45` are not exercised. Cheap to cover with one
   extra renderer test each.

3. **Welsh name punctuation inconsistency** — the summary-of-publications test fixture
   uses a hyphen (`-`) in the Welsh name where `libs/list-types/common/src/list-type-data.ts`
   uses an en-dash (`–`). Cosmetic and irrelevant to ordering, but worth aligning.

4. **`$schema` downgraded to draft-07** — the committed schema at
   `libs/list-types/iac-daily-list/src/schemas/iac-daily-list.json` uses
   `http://json-schema.org/draft-07/schema#` whereas the reference
   `docs/tickets/791/iac_daily_list.schema.json` uses draft 2020-12. For the constructs
   actually used (`$defs`, `$ref` with sibling `type`, `pattern`, nested `items`) this
   does not materially change validation behaviour under Ajv, and the `pattern` on the
   boolean `isPresiding` is a harmless strict-mode no-op. No change required, but note
   the divergence from the reference for future maintainers.

## ✅ Positive Feedback

- **Stable-name routing throughout.** Controller `LIST_TYPE_CONFIG`, PDF registry
  entries, and the AC2 tie-break are all keyed on `listTypeName`; the test fixture
  deliberately uses `listTypeId: 999` and comments why. This is exactly the project
  rule and is done consistently.
- **Comprehensive validator tests.** `json-validator.test.ts` has one `it` per required
  field at every nesting level (document → venue → courtLists → courtHouse → courtRoom
  → session → sittings → hearing → case → caseNumber), with `JSON.parse(JSON.stringify())`
  deep-clone isolation and a correct object-root fixture. Runs the real schema, no mocks.
- **Full Welsh support with parity guards.** `en.ts`/`cy.ts` mirror each other with real
  translations (no placeholders), and the `.njk.test.ts` asserts en/cy key parity plus
  renders the `cy` locale.
- **Reuse of shared helpers.** The renderer reuses `createPartyDetails`,
  `formatDisplayDate`, `formatLastUpdatedDateTime` and `formatTime` from
  `@hmcts/list-types-common` rather than re-implementing date/party formatting.
- **Correct handler pattern.** The controller uses `createMultiListGuardAndRender` +
  `createSimpleListTypeHandler`, giving consistent 400/403/404/500 handling; the
  controller test covers success, additional-cases routing, missing artefactId,
  not-found, 403, unsupported list type, missing blob, validation failure, 500 and
  Welsh locale.
- **Structural template tests.** `.njk.test.ts` uses Cheerio with column-index
  constants and layered builders, asserting structure/attributes rather than raw HTML.
- **PDF generator keyed by name** via `LIST_TITLE_MAP` and registered in
  `PDF_GENERATOR_REGISTRY` by `listTypeName`, passing `listTypeName` through — matches
  the mandated list-type checklist.

## Test Coverage Assessment

Coverage run filtered to the changed workspaces
(`yarn turbo test --filter=@hmcts/iac-daily-list --filter=@hmcts/list-types-common
--filter=@hmcts/publication --filter=@hmcts/web -- --coverage`). All four passed. A known
pre-existing environmental crash in 5 unrelated list-type workspaces was excluded from
this run and is not attributable to this change.

| Workspace | Statement coverage | Bar (80%) |
|---|---|---|
| `@hmcts/iac-daily-list` | 92.1% | ✅ |
| `@hmcts/list-types-common` | 87.76% | ✅ |
| `@hmcts/publication` | 97.24% | ✅ |
| `@hmcts/web` | 95.68% | ✅ |

Within `@hmcts/iac-daily-list`: renderer 92.15%, pdf-generator 88.23%, json-validator
100%; `index.ts` (barrel) and `types.ts` (type-only) report 0%, which is expected and
not a concern. All changed workspaces meet the 80% threshold.

## Acceptance Criteria Verification

- [x] **AC1 — Two IAC lists created/publishable in the front end.** Both list types are
  seeded in `libs/list-types/common/src/list-type-data.ts` (provenance `CFT_IDAM`,
  `isNonStrategic: false`, `subJurisdictionIds: [6]`); the controller and routes are
  wired in `apps/web/src/pages/(list-types)/iac-daily-list/index.ts`
  (`ROUTES = ["/iac-daily-list", "/iac-daily-list-additional-cases"]`), with templates
  `iac-daily-list.njk` / `iac-daily-list-additional-cases.njk` and PDF registration in
  `libs/publication/src/processing/service.ts`. Rendering, Welsh, and invalid/missing
  handling are covered by `index.test.ts` and the renderer/validator tests.
- [x] **AC2 — IAC Daily List always appears first under the same venue regardless of
  publish order.** Implemented via the `IAC_ORDER` rank keyed on stable name and applied
  as the first tie-break in the sort comparator at
  `apps/web/src/pages/(public)/summary-of-publications/index.ts:110-112`, with `name`
  exposed on the mapped publication. Proven for both publish orders in English and for
  additional-first in Welsh (`summary-of-publications/index.test.ts`). Marked met; the
  missing (daily-first, cy) permutation is a HIGH test-completeness item, not an AC gap,
  since the tie-break is locale-independent.

Note on deferred scope: the ticket states the two ACs above only, and explicitly notes
the lists are manually uploaded. The E2E `@nightly` journey and the email-summary
builder were intentionally deferred (documented in `tasks.md`). Neither is required by
the two explicit ACs, so their deferral does not fail an AC. The schema/validator was
added despite the ticket note ("no validation schema") because the CI guard mandates a
`validate*` export for any shipped schema — a reasonable and rule-compliant decision.

## Next Steps

- [ ] Fix the client-side search wiring so non-matching rows are actually hidden on the
  IAC pages (add the `hearings-table` selector to the tables or extend `table-search.ts`),
  and add a `.njk.test.ts` assertion for the selector.
- [ ] Verify the three `partyRole` string constants against the pip
  `IacDailyListService` / `PartyRoleHelper` source and cite it (or route through the
  shared classifier); add a renderer test for unexpected role values.
- [ ] Add the fourth AC2 permutation test (daily-first, Welsh).
- [ ] (Optional) De-duplicate the two identical `.njk` templates; cover the
  `renderer.ts:137` and `pdf-generator.ts:44-45` branches; align the Welsh en-dash.
- [ ] Re-run `yarn lint:fix` and the filtered coverage after changes.

## Overall Assessment

**NEEDS CHANGES**

Both explicit acceptance criteria are met, coverage is strong across all four changed
workspaces (all ≥80%), and the code follows the project's list-type conventions well
(stable-name routing, schema+validator+CI-guard, full Welsh, shared-helper reuse). There
are no CRITICAL blockers. The verdict is NEEDS CHANGES rather than APPROVED because of
two HIGH-priority items: (1) the client-side case search does not hide rows on the IAC
pages (a user-facing functional defect in the advertised progressive enhancement), and
(2) the party-role string constants driving the appellant/respondent/representative
columns are unverified against the pip source of truth and risk silently empty columns.
Addressing these two, plus the fourth AC2 permutation test, should clear the path to
approval.
