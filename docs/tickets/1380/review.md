# Code Review: Issue #1380

Courtel push: match the legacy request format and headers (follow-up to #323). Reviewed the uncommitted working tree on `vibe-1380`, stacked on `feature/1272-cron-subscription-triggers` (PR #1306).

## Summary

The change does what the plan says. The HTTP layer is now a plain transport (`push/http-client.ts`). A new `push/multipart.ts` builds the single `file` part, and `service.ts` decides which requests to send:
- a JSON publication sends JSON first, then the PDF with `x-provenance: CATH` and `<artefactId>.pdf`
- a flat file sends one multipart
- a deletion sends headers only

The headers now come from the artefact: `x-source-artefact-id` from `sourceArtefactId` (falling back to `artefactId`), `x-type` from `type`. Dates use the `LocalDateTime.toString()` format with UTC getters, and jurisdictions and regions are comma-joined. `libs/publication` looks up `type` and `sourceArtefactId` for the upload and cron paths. The remove-list handler passes them through for deletions. The Courtel mock now accepts only the legacy shapes and has its own tests.

Automated checks run for this review:
- `vitest run`: all tests pass in `libs/legacy-third-party-fulfilment` (99), `libs/publication` (684), `libs/test-support` (284) and the `apps/web` remove-list-confirmation tests.
- `tsc --noEmit`: clean in all three libs and in `apps/web`.
- `biome check` on the changed paths: clean.
- `libs/legacy-third-party-fulfilment` does not import `@hmcts/publication`, so the lib boundary holds.

No code defect blocks the change. The assessment is NEEDS CHANGES only because three acceptance criteria are partly met. In each case the gap comes from a decision the assignee recorded on 2026-11-16, not from missing work.

## 🚨 CRITICAL Issues

None.

## ⚠️ HIGH PRIORITY Issues

1. **AC "Confirm the expected format with whoever owns the Courtel integration…" is only partly met (decided deferral).**
   - Done: the assignee decided that legacy `pip-publication-services` is the specification. The plan records this and builds a line-referenced comparison table from the legacy code (`docs/tickets/1380/plan.md:5`, `plan.md:41-73`).
   - Missing: nobody who owns Courtel has confirmed the format, and the work was not compared with a captured legacy request. The ticket's own risk is still open: Courtel may have adapted to the combined format while #323 was tested (`ticket.md:61`). So is the inferred part `Content-Type: application/octet-stream` (`push/multipart.ts:5`, `plan.md:229`).
   - Recommendation: before release, get a one-line confirmation from the Courtel owner, or a capture from a lower environment. Record it in `plan.md`.

2. **AC "Send the Welsh PDF where legacy does." is only partly met (decided deferral, decision 1).**
   - Done: WELSH publications send `<id>.pdf`, which CaTH already renders in Welsh. ENGLISH matches legacy (`libs/legacy-third-party-fulfilment/src/service.ts:52-55`; tests at `service.test.ts:206-225`).
   - Missing: BILINGUAL publications send CaTH's English PDF, where legacy sends a Welsh one. The decision is recorded at `plan.md:236`. However, the follow-up ticket it depends on has not been raised yet (`tasks.md:6` is still unchecked).
   - Recommendation: raise the follow-up ticket and link it from `plan.md` decision 1 before merging, so the gap is tracked.

3. **AC "Verified end to end against the Courtel test endpoint in a lower environment." is only partly met (decided deferral, decision 6).**
   - Done: TS12 ran locally against the updated CaTH Courtel mock. The covered cases were English JSON with a PDF, Welsh JSON, a flat file and a deletion, and every request matched the table (`tasks.md:43`).
   - Missing: the check did not use the real Courtel test endpoint or a lower environment. The deletion was sent by calling `sendThirdPartyDeletion` directly, not through the remove-list page. That path is covered by the unit test at `apps/web/src/pages/(admin)/remove-list-confirmation/index.test.ts:222-271`.
   - Recommendation: once the branch is deployed to a lower environment, run one push against the Courtel test endpoint. Of the four shapes, the JSON-then-PDF pair matters most. Record the result on the ticket.

All changed workspaces are above 80% statement coverage, so coverage adds no HIGH item.

## 💡 SUGGESTIONS

1. **`x-source-artefact-id` can now carry publisher-controlled text into an HTTP header** (`libs/legacy-third-party-fulfilment/src/push/headers.ts:18`).
   - Before this change the header was always the UUID `artefactId`. Node's `http.request` throws `ERR_INVALID_CHAR` for CR/LF and for any character above U+00FF. Checked: `"a’b.xlsx"` and `"Llŵyd.csv"` throw, and `"café.xlsx"` does not.
   - The throw happens inside the `executePush` promise (`push/http-client.ts:41`). `pushWithRetry` catches it as status 0 and retries it 3 times. The publication then fails with a misleading "last status 0" log, and its PDF is never sent.
   - Likelihood today is low. API uploads receive the value as a Latin-1 header, and multer decodes `originalname` as Latin-1. Migrated or hand-edited rows are not protected, though.
   - The filename is already sanitised (`push/multipart.ts:25-27`). Apply the same treatment to the header value: strip CR/LF, and replace anything above U+00FF with `?`, as Netty would for legacy. Add one test case.
2. **Extra DB lookup on every publication, even when Courtel is not configured** (`libs/publication/src/processing/service.ts:933`).
   - `findArtefactPushFields` runs before `sendThirdPartyPublications` checks the secrets and subscribers. So every upload in an environment without `COURTEL_API_URL`, or without a subscriber for the list type, pays for a query whose result is never used.
   - The 1272 cron also does one lookup per artefact (`libs/publication/src/subscription-schedule/service.ts:80`), and its scheduled-artefact query could select `type` and `sourceArtefactId` directly.
   - The cost is small, but it can be avoided. One option is a lazy `loadPushFields` callback, like `loadFiles`. Another is to let callers that already hold the row pass the fields.
3. **The mock does not check the part `Content-Type` or the flat-file filename** (`libs/test-support/src/routes/test-support/mock-courtel.ts:144-151`). Decision 6 makes the mock the end-to-end check. Yet a regression back to `application/pdf`, or to a flat-file filename that differs from `x-source-artefact-id`, would still get a 201. Reject a `file` part whose content type is not `application/octet-stream`. Optionally, check that a non-CATH file part's filename equals `x-source-artefact-id`.
4. **The mock's part-name regex is order-sensitive** (`mock-courtel.ts:166`). `/name="([^"]+)"/` matches inside `filename="…"` when `filename` comes before `name` in `Content-Disposition`. Use `/\bname="([^"]+)"/`. The word boundary does not match between "file" and "name".
5. **The Courtel URL is logged on every request** (`libs/legacy-third-party-fulfilment/src/service.ts:119`). This was already the case before this change. A JSON publication now logs it twice, though. The URL is a Key Vault secret (`auto-pip-*-courtel-api`). Log `new URL(url).host` instead, in case the secret ever includes a path token or query key.
6. **Inbound content-date parsing still depends on the server time zone, unlike the outbound side** (decision 4).
   - The outbound side is now timezone-independent (`headers.ts:43-51`).
   - The upload path still parses an offset-less `x-content-date` with `new Date(value)` (`libs/api/src/blob-ingestion/publication-headers.ts:143`), which reads it as local time. The wall-clock digits only round-trip because the pods run in UTC.
   - Either pin `TZ=UTC` in the images or charts, or add a comment on that dependency, so the "one day early in BST" defect cannot come back through a local or misconfigured run.
7. **Twice the timeout exposure** (ticket risk, `plan.md:161`). The worst case is about 186s for each JSON-plus-PDF publication. The 1272 cron sends sequentially, and retries are out of scope (decision 5). Add the cron's per-run budget to the retry follow-up, so that ticket handles both.
8. **Minor branch gap**: `service.ts:126` (the non-`Error` arm of the push-log warning) and the response and timeout branches of `push/http-client.ts` are not fully branch-covered. Statements are at 100%, so this is cosmetic.

## ✅ Positive Feedback

- The request comparison table in `plan.md:41-73` is thorough. Every planned header and part has a legacy line reference, and the code follows it faithfully.
- The legacy short-circuit is reproduced: the PDF is only sent after the JSON succeeds (`service.ts:48-50`). The new guard against a body-less non-flat push (`service.ts:42-46`) closes a real bug, where Courtel would have read the push as a deletion.
- The `LocalDateTime.toString()` formatter is small and correct, including the omission rules for seconds and milliseconds (`headers.ts:43-51`). Its tests run under a non-UTC `TZ` and include a check that the zone really is non-UTC (`headers.test.ts:44-62`).
- The lib boundary is kept. Blob reads and artefact lookups stay in `libs/publication`, and the deletion caller passes the fields from rows it fetched before the delete (`remove-list-confirmation/index.ts:126-145`).
- The PDF eligibility rules (absent, empty, over 2,000,000 bytes) are named, logged and tested at the boundary, including exactly 2,000,000 bytes (`service.ts:144-161`, `service.test.ts:227-276`).
- There is one push-log row per request with `*_PDF` types, and no migration is needed (both values fit `VARCHAR(20)`).
- The mock now rejects the old combined format, so a regression shows up locally. The mock also has its first tests (19 cases).
- Module ordering follows CLAUDE.md: exported functions first, then helpers in the order they are used, with types at the bottom. The comments explain why, not what. There is no `any` in source.

## Test Coverage Assessment

- **Unit tests**: good. Each publication shape the DoD names has its own `describe`:
  - JSON with a PDF (TS1): `service.test.ts:164`
  - Welsh and bilingual (TS2, TS3): `:206`
  - no sendable PDF (TS4): `:227`
  - JSON fails (TS5): `:278`
  - PDF fails (TS6): `:297`
  - flat file (TS7): `:316`
  - bad input (TS10): `:359`
  - deletion (TS8): `:412`

  Header formatting is table-driven (`push/headers.test.ts:85-203`). The multipart builder, the transport and the retry are tested in isolation. Caller-side tests cover the lookup, the missing row and the null `sourceArtefactId` (`libs/publication/src/processing/service.test.ts`, `repository/queries.test.ts:1501-1531`). The remove-list handler test asserts the full deletion params (`index.test.ts:222-271`). The tests follow AAA and use `listTypeId: 999`, as the conventions require.
- **E2E tests**: none added. That is appropriate: nothing user-facing changes and the Playwright suite has no Courtel wiring. TS12, a manual local run against the CaTH mock, stands in for E2E (decision 6).
- **Accessibility tests**: not applicable. There is no UI change.

Statement coverage per changed workspace:

| Workspace | Statements | Notes |
|---|---|---|
| `libs/legacy-third-party-fulfilment` | 100% | Full `vitest run --coverage` (branches 94.89%) |
| `libs/publication` | 97.21% | Full `vitest run --coverage` (branches 87.7%) |
| `libs/test-support` | 99.35% | Full `vitest run --coverage`; `mock-courtel.ts` 98.82% |
| `apps/web` | 95.23% | Only the changed `remove-list-confirmation` tests, with coverage limited to that page; a full web run was too heavy for this container. The uncovered lines (105-106, 144) are unrelated to this change |

None is below 80%.

## Acceptance Criteria Verification

Taken verbatim from "3. Scope of Work" and "5. Definition of Done (Technical)" in `ticket.md`.

- [~] Confirm the expected format with whoever owns the Courtel integration. Ideally compare it with a legacy request captured in a lower environment.
  - Done: the assignee decided on 2026-11-16 that legacy code is the specification, and the comparison table is built from that code (`docs/tickets/1380/plan.md:5`, `plan.md:41-73`).
  - Missing: no confirmation from the Courtel owner, and no captured legacy request. This is a decided deferral.
- [x] Send a JSON publication as two requests (JSON, then PDF), with legacy's part name, filename and `x-provenance: CATH` on the PDF call. Skip an empty PDF.
  - `libs/legacy-third-party-fulfilment/src/service.ts:49-55`
  - `push/multipart.ts:7-22` (`name="file"`)
  - `push/headers.ts:33-35` (`CATH`)
  - `service.ts:144-161` (empty and oversize skip)
  - tests at `service.test.ts:164-276`
- [~] Send the Welsh PDF where legacy does.
  - Done: WELSH sends CaTH's Welsh `<id>.pdf` (`service.ts:52-55`, `service.test.ts:206-225`).
  - Missing: BILINGUAL sends the English PDF. This is a decided deferral (decision 1, `plan.md:236`), and the follow-up ticket is not yet raised (`tasks.md:6`).
- [x] Set `x-source-artefact-id` from `sourceArtefactId` and `x-type` from `artefact.type`.
  - `push/headers.ts:18-19, 38-40`
  - `libs/publication/src/processing/service.ts:933-942`
  - `libs/publication/src/repository/queries.ts:339-344`
  - `apps/web/src/pages/(admin)/remove-list-confirmation/index.ts:133-134`
- [x] Send every jurisdiction and region, comma-joined.
  - `push/headers.ts:28-29, 57-59`
  - test at `headers.test.ts:162`
- [x] Match legacy's date header format. Format dates in UTC, or explicitly in Europe/London, rather than with the server's local-time getters.
  - `push/headers.ts:21, 25-26, 43-51`
  - tests under a non-UTC `TZ` at `headers.test.ts:44-103`
- [x] Decide how a failure is logged in `thirdPartyPushLog` when one of the two requests succeeds and the other fails.
  - Decision: `plan.md:33, 146-147`
  - Implementation: `service.ts:110-130` (one row per request, `CREATE_PDF`/`UPDATE_PDF`)
  - test at `service.test.ts:297-314`
- [x] Update the CaTH Courtel mock (commit `cf6021e3`) to match.
  - `libs/test-support/src/routes/test-support/mock-courtel.ts:41-174`
  - `mock-courtel.test.ts:84-294`
- [x] Requests match the confirmed legacy format, covered by unit tests for each publication shape (JSON with PDF, JSON with a Welsh PDF, JSON without a PDF, flat file, deletion).
  - `libs/legacy-third-party-fulfilment/src/service.test.ts:164` (JSON with PDF), `:206` (Welsh), `:227` (no PDF), `:316` (flat file), `:412` (deletion)
- [x] Unit test coverage is >80%.
  - 100% / 97.21% / 99.35% / 95.23% statements (see the table above)
- [x] The format decisions are recorded in `docs/tickets/<issue>/plan.md`.
  - `docs/tickets/1380/plan.md:3-11, 41-94, 232-241`
- [~] Verified end to end against the Courtel test endpoint in a lower environment.
  - Done: a local run against the CaTH Courtel mock passed (`docs/tickets/1380/tasks.md:43`).
  - Missing: the run used neither the real Courtel test endpoint nor a lower environment. This is a decided deferral (decision 6, `plan.md:241`).

Tally: 9 met, 3 partially met, 0 not met.

## Next Steps

- [ ] Raise the bilingual Welsh PDF follow-up ticket, and link it from `plan.md` decision 1.
- [ ] Get confirmation of the format from the Courtel owner, or a captured legacy request. Record it in `plan.md`.
- [ ] After deployment to a lower environment, push one JSON-plus-PDF publication to the Courtel test endpoint and record the result.
- [ ] Optional: sanitise the `x-source-artefact-id` header value (suggestion 1), and tighten the mock's part checks (suggestions 3 and 4).
- [ ] Optional: avoid the push-field lookup when Courtel is not configured (suggestion 2).

## Overall Assessment

**NEEDS CHANGES** (advisory)

The code is sound, well tested and matches the plan. No code changes are required. The assessment is NEEDS CHANGES only because the acceptance-criteria rule applies to three partly met items: the format was not confirmed with the Courtel owner, bilingual publications get the English PDF, and the end-to-end check did not run in a lower environment. All three are deferrals the assignee recorded on 2026-11-16. Once the follow-up ticket is raised and the deferrals are accepted on the ticket, this could be approved.

## Follow-up (2026-11-17)

Suggestions 1-4 were resolved with the assignee before the PR was opened. Suggestions 5-8 are left as they are.

1. **Header-unsafe `sourceArtefactId`: fixed.** `x-source-artefact-id` now falls back to `artefactId` when `sourceArtefactId` holds characters Node refuses in a header (`push/headers.ts`, `toSourceArtefactIdHeader`). This is the same fallback as decision 2. The flat-file part `filename` is in the body, so it keeps the real name. Legacy never hit this case, because pip-frontend sent the name as the `x-source-artefact-id` header at upload, which fails on such names, so they were never stored. The decision is recorded in `plan.md` (decision 2).
2. **Extra DB lookup: fixed.** `sendThirdPartyPublications` takes a `loadArtefactFields` loader and calls it only after the secrets and subscriber checks. `pushPublicationToThirdParties` passes `() => findArtefactPushFields(artefactId)` instead of querying first. A missing row still gives `"failed"` with an error log.
3. and 4. **Mock: tightened.** File parts must be `application/octet-stream`. A flat file's `filename` must equal `x-source-artefact-id`, unless the name is not header-safe, in which case the header carries the `artefactId` (fix 1). `name=` and `filename=` are anchored on `;`, so neither is matched inside the other. Filenames are decoded as UTF-8.

Tests after the fixes: `legacy-third-party-fulfilment` 106 (+7), `test-support` mock 23 (+4), and `publication` 684 all pass. `turbo lint test` across all dependents gave 27/28; the one failure was the known `apps/web` `app.test.ts` timeout under parallel load, and the web suite then passed alone (3,981 passed, 3 skipped). `turbo build` for api, web and crons with dependencies passed 70/70. Biome is clean on all changed files. Coverage: `legacy-third-party-fulfilment` 100%, `test-support` 99.36%.

The three HIGH items are still decided deferrals (decisions 1 and 6, and the format confirmation), so the advisory assessment stays NEEDS CHANGES.
