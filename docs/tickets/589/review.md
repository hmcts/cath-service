# Code Review: Issue #589

## Summary

The change adds three independent source-JSON payload size gates, checked BEFORE
output generation, mirroring legacy CaTH ORG behaviour:

- PDF gate 2MB and Excel gate 10MB in `libs/publication/src/processing/service.ts`
  (`processPublication`), backed by `libs/publication/src/processing/payload-limits.ts`.
- Email summary gate 256KB in `libs/notifications/src/notification/notification-service.ts`
  (`buildEmailTemplateData`), backed by `libs/notifications/src/notification/payload-limits.ts`.

When a gate is met/exceeded the corresponding output is skipped, a log line is
written, and the publication still proceeds. Size is computed once per publication
via `Buffer.byteLength(JSON.stringify(jsonData), "utf8")`. Constants are hardcoded
and colocated with each consumer.

The implementation is clean, matches the plan (with one sensible, well-justified
deviation — see Positive Feedback), is well tested, and both changed workspaces are
comfortably above the 80% coverage bar. This is essentially ready to merge.

No accessibility, GOV.UK Design System, or E2E dimensions apply: this is a
server-side generation-gating change with no new page, route, or template.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

None.

## 💡 SUGGESTIONS

1. **Summary skip log line omits a `logPrefix`**
   (`libs/notifications/src/notification/notification-service.ts:435`)
   - The PDF/Excel skip logs are prefixed with `${logPrefix}` (e.g. `[Publication]`),
     but the summary skip log has no prefix. `buildEmailTemplateData` has no
     `logPrefix` in scope, so this is understandable, but a consistent, greppable
     prefix (e.g. `[Notifications]`) would aid log filtering. The `publicationId`
     is already included, which is good.
   - Benefit: consistent, filterable operational logs across the three gates.

2. **`payloadSizeBytes` duplicated across two files** (by design)
   - `libs/publication/src/processing/payload-limits.ts:16` and
     `libs/notifications/src/notification/payload-limits.ts:13` contain an identical
     helper. Per the task brief this is acceptable: `publication` already imports
     `@hmcts/notifications`, so hoisting the summary constant into `publication`
     (or sharing the helper the other direction) would create a
     `publication`↔`notifications` cycle. Colocation is the correct KISS call here.
     Recorded only for completeness — **not** a required change.

3. **Boundary constant expressions are asserted, but no explicit at-limit unit test on the gate itself**
   - The `<` vs `>=` semantics are exercised indirectly (3MB > 2MB skip, sub-limit
     generate) in `service.test.ts` and `notification-service.test.ts`, and the
     constant *values* are asserted in the `payload-limits.test.ts` files. A single
     extra test feeding a payload sized to exactly `MAX_*_PAYLOAD_BYTES` would nail
     down the "equal is over" rule directly. Low value given the current coverage;
     optional.

## ✅ Positive Feedback

- **Correct, well-justified deviation from the plan.** Plan step 3 (line 114) said
  to "import the constant/helper from `@hmcts/publication`", but the implementation
  colocated the summary constant in `notifications` instead. This is the *better*
  choice and is exactly what the plan's own step 1 (lines 89–98) argued for to
  avoid a `publication`↔`notifications` circular dependency. The implementer
  followed the sounder reasoning rather than the contradictory instruction.

- **The PDF-skip branch `listType.findUnique` lookup is correct and necessary.**
  When PDF generation is skipped, `pdfResult.listTypeName` is never produced, yet
  the Excel generator needs the `listTypeName` to select its converter from
  `EXCEL_GENERATOR_REGISTRY` (`service.ts:397`). The fallback lookup at
  `service.ts:645` resolves the name so Excel can still generate independently. It
  is the same query already run inside `generatePublicationPdf`
  (`service.ts:423`) — not an N+1: it runs once, only on the skip branch, and only
  when the PDF path is not taken, so no duplicate query occurs in the common path.
  It uses `select: { name: true }` and is keyed on the numeric `id` param the
  function already receives (consistent with the adjacent existing lookups at
  `service.ts:423` and `service.ts:487`).

- **`result` stays consistent for downstream notifications.** Skipping PDF leaves
  `result.pdfPath` unset; skipping Excel leaves `result.excelPath` unset. Both are
  optional on `ProcessPublicationResult` (`service.ts:580-587`) and are passed
  through to `sendPublicationNotificationsForArtefact` as `pdfFilePath`/`excelPath`
  (`service.ts:675-676`), where `buildEmailDataWithFiles` already guards on their
  presence (`notification-service.ts:482-488`). No undefined-dereference risk, and
  the `notificationsSent`/`Failed` counts still populate — verified by the
  "skip both … and still send notifications" test (`service.test.ts`, asserts
  `result.notificationsSent === 3`).

- **Strict `<` boundary is correct and matches legacy `payloadWithin*` semantics** —
  at/over the limit skips, under generates (`service.ts:625,649`,
  `notification-service.ts:434`).

- **Size computed once**, stored in `payloadBytes`, and reused for both PDF and
  Excel comparisons (`service.ts:621`) — no redundant re-serialisation.

- **No sensitive data in logs.** Skip logs contain only byte counts, the limit,
  and `artefactId`/`publicationId` — no payload contents, no PII.

- **Clean type safety.** `payloadSizeBytes(jsonData: unknown)` accepts `unknown`
  and narrows via serialisation; no unjustified `any` in production code (the `any`
  casts are confined to test mocks, which is standard).

- **Naming and structure follow CLAUDE.md**: `SCREAMING_SNAKE_CASE` constants,
  kebab-case filenames, colocated tests, exported const then exported function
  ordering, `.js` extensions on relative imports.

- **Tests follow AAA and cover realistic scenarios**: PDF-only skip, PDF+Excel
  skip with notifications still sent, both-generate happy path, summary enhanced vs
  fallback, and the byte-length helper including multi-byte (`£`) and empty
  object/array cases.

## Test Coverage Assessment

- **Unit tests**: Strong. New behaviour is covered on both sides — three new
  `processPublication` tests (PDF-skip/Excel-generate, both-skip/notify,
  both-generate) and two new `sendListTypePublicationNotifications` tests
  (within-limit enhanced summary, over-limit fallback + skip log). Both
  `payload-limits.test.ts` files assert constant values and helper behaviour.
- **E2E**: N/A — no user-facing page, route, or journey is added; this is internal
  generation gating.
- **Accessibility (a11y)**: N/A — no UI surface.
- **GOV.UK Design System**: N/A — no template.

Statement coverage per changed workspace (from `Statements :` line):

| Workspace           | Statement coverage | Status |
|---------------------|--------------------|--------|
| `libs/publication`  | 95.47% (422/442)   | ✅ ≥ 80% |
| `libs/notifications`| 90.80% (227/250)   | ✅ ≥ 80% |

Note: a full-monorepo `yarn test:coverage` shows one failing test —
`apps/web` `remove-list-search-results` "should redirect to search page if no
session data" times out at 5000ms. It is unrelated to this change (a different
workspace and feature) and appears to be a pre-existing flaky/slow test.

## Acceptance Criteria Verification

The ticket lists the payload limits to set rather than formal Given/When/Then
criteria; each bullet is treated as a criterion.

- [x] **PDF generation limit (determine the new AI-CaTH limit, since PDF tech differs)** —
  set to 2MB and enforced before generation.
  `libs/publication/src/processing/payload-limits.ts:13`
  (`MAX_PDF_PAYLOAD_BYTES = 2 * 1024 * 1024`); gate at
  `libs/publication/src/processing/service.ts:625`; verified by the PDF-skip test in
  `libs/publication/src/processing/service.test.ts` (asserts `generateMagistratesPublicListPdf`
  not called, `result.pdfPath` undefined at ~3MB source).

- [x] **Excel generation — 10MB** — enforced before generation.
  `libs/publication/src/processing/payload-limits.ts:14`
  (`MAX_EXCEL_PAYLOAD_BYTES = 10 * 1024 * 1024`); gate at
  `libs/publication/src/processing/service.ts:649`; verified by the both-skip test in
  `libs/publication/src/processing/service.test.ts` (asserts Excel not called and
  notifications still sent at ~11MB source).

- [x] **Email summary generation — 256KB** — enforced before building the enhanced summary.
  `libs/notifications/src/notification/payload-limits.ts:11`
  (`MAX_SUMMARY_PAYLOAD_BYTES = 256 * 1024`); gate at
  `libs/notifications/src/notification/notification-service.ts:434`; verified by the
  fallback test in `libs/notifications/src/notification/notification-service.test.ts`
  (asserts `buildEnhancedTemplateParameters` not called, `buildTemplateParameters`
  called, skip log emitted at ~300KB source).

- [x] **Check latest figures from CaTH ORG before implementing** — Excel 10MB and
  summary 256KB match verified legacy `application.yaml` defaults; PDF raised from
  legacy 256KB to 2MB for Puppeteer with an empirical benchmark. Documented in
  `docs/tickets/589/plan.md:31-65`.

## Next Steps

- [ ] (Optional) Add a `logPrefix`-style prefix to the summary skip log for
      consistency (`notification-service.ts:435`).
- [ ] (Optional) Add an exact-at-limit unit test to pin down the `<` boundary directly.
- [ ] (Housekeeping, not this ticket) Investigate the unrelated
      `apps/web` `remove-list-search-results` timeout surfaced by the full coverage run.

## Overall Assessment

**APPROVED**

All three acceptance criteria are fully met with file-referenced tests, both changed
workspaces exceed 80% statement coverage (95.47% and 90.80%), the design decisions
(independent gates, single serialisation, PDF-skip listType lookup, `<` boundary,
colocated constants to avoid a package cycle) are correct and well justified, and no
security, type-safety, or state-consistency issues were found. The remaining items
are optional polish. Accessibility/GOV.UK/E2E dimensions are N/A (no UI surface).
