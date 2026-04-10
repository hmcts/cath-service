# Code Review: Issue #323 — Third Party Subscription Fulfilment

## Summary

A clean, well-tested implementation of the Courtel push fulfilment pathway. The new `libs/third-party-fulfilment` module follows established module conventions and integrates correctly into `processPublication` and the remove-list deletion flow. All 44 module tests and 286 publication tests pass.

The open question on PDF payload remains unresolved.

---

## 🚨 CRITICAL Issues

None.

---

## ⚠️ HIGH PRIORITY Issues

### 2. PDF payload not sent — open question unresolved

The ticket spec says "It also includes PDF generated for that list." The original `ThirdPartyPushParams` interface in the plan included `pdfFilePath?: string`, but the current implementation does not include this field and only sends JSON. Open question #1 in `plan.md` was never resolved.

**Action required:** Confirm with Courtel/P&I whether the PDF must be sent alongside JSON. If yes, this is missing scope.

---

## 💡 SUGGESTIONS

### 4. `findSubscribersByListType` fetches unnecessary user data

**File:** `libs/third-party-fulfilment/src/queries.ts:13`

```typescript
return prisma.legacyThirdPartySubscription.findMany({
  where: { listTypeId, sensitivity: { in: eligibleSensitivities(sensitivity) } },
  include: { user: true }   // user data is never accessed in the service
});
```

The returned subscriber records are only used to check `subscribers.length === 0`. Since all pushes go to a single fixed Courtel endpoint (not per-subscriber routing), the `include: { user: true }` fetches all user fields unnecessarily. Consider `select: { id: true }` to reduce the query overhead.

### 5. Plan stated "no migration needed" — one was added

**File:** `apps/postgres/prisma/migrations/20260409150532_add_legacy_third_party_push_log/migration.sql`

The plan explicitly states "Database Schema Changes: None." A `legacy_third_party_push_log` table was correctly added during implementation for audit purposes. The migration and Prisma schema are well-structured. This is a positive addition but the plan was not updated to reflect it.

### 7. `ThirdPartyPushLog.type` uses an unconstrained `VARCHAR(20)`

**File:** `libs/third-party-fulfilment/prisma/schema.prisma:14`

The `type` field accepts `"PUBLICATION"` or `"DELETION"` as plain strings. A Prisma enum or DB check constraint would make invalid values impossible at the schema level. Low impact given the field is only set in two places in `service.ts`, but worth considering for data integrity.

---

## ✅ Positive Feedback

- **Module structure** follows CLAUDE.md conventions precisely: `config.ts` separate from `index.ts`, kebab-case files, no circular deps, `prismaSchemas` correctly registered in `apps/postgres/src/schema-discovery.ts`.
- **Sensitivity filtering** (`queries.ts:6-9`) is correctly implemented: a PUBLIC publication reaches all subscriber levels; a CLASSIFIED publication reaches only CLASSIFIED subscribers. The logic and its edge cases are well-tested.
- **Retry logic** (`retry.ts`) is clean: 3 attempts, exponential backoff (1s, 2s), no retry on 4xx (except 429), treats network errors as statusCode 0 for retry purposes.
- **Graceful env var handling**: if either `COURTEL_API_URL` or `COURTEL_CERTIFICATE` is absent, the push is skipped with a clear error log rather than crashing.
- **`writePushLog` is fire-and-forget** with `.catch()` warning — a successful push is never masked by a DB audit log failure.
- **Helm charts** updated correctly in both `values.yaml` and `values.dev.yaml` with the correct Key Vault secret names (`auto-pip-stg-courtel-api`, `courtel-certificate`) and aliases.
- **Fire-and-forget integration** in `processPublication` and the deletion handler matches the existing pattern for email notifications — non-blocking and consistent.
- **Deletion push** correctly reads artefact metadata before deletion and pushes a null body, matching the spec.
- **`x-type` / `x-list-type` headers** use `getListTypeName(listTypeId)` with a correct numeric fallback — they send the proper list type name string, not just the numeric ID.
- **CREATE/UPDATE differentiation** implemented: `processPublication` fetches `artefact.supersededCount`, derives `isUpdate: boolean`, passes it to `sendThirdPartyPublications`, and the push log records `"CREATE"`, `"UPDATE"`, or `"DELETION"` accordingly. Tested in both modules.
- **Certificate correctly uses `ca`** (CA trust store) rather than `cert`+`key`. Courtel uses a private PKI so `ca: certPem` is the right approach — the server's certificate is verified against this CA. `rejectUnauthorized: true` ensures TLS is enforced.
- **Test coverage** is thorough: 44 tests across 5 files covering success, all retry scenarios, env var absence, sensitivity filtering, location fallbacks, timeout handling, null body, certificate CA configuration, timeout/destroy behaviour, and CREATE/UPDATE/DELETION log type differentiation.

---

## Test Coverage Assessment

- **Unit tests:** Strong. All critical paths covered including edge cases (missing env vars, no subscribers, network errors, timeout, 429 retry, CREATE/UPDATE/DELETION log type differentiation).
- **E2E tests:** None added (the push is server-side; no user-facing journey to test end-to-end).
- **Accessibility tests:** N/A — no UI changes in this module.
- **Test counts:** 44/44 pass in `@hmcts/third-party-fulfilment`; 286/286 pass in `@hmcts/publication`.

---

## Acceptance Criteria Verification

| Criterion | Status | Notes |
|-----------|--------|-------|
| Identify Third Party User ID subscribed to publication | ✅ PASS | `findSubscribersByListType(listTypeId, sensitivity)` |
| Retrieve publication metadata from artefact table | ✅ PASS | Params passed through `processPublication` |
| Send file in JSON format via POST | ✅ PASS | `Content-Type: application/json` set when body is non-null |
| Use third party authorisation certificate | ✅ PASS | `ca: certPem` (CA trust store) loaded from Key Vault — correct for Courtel's private PKI |
| Acknowledgment receipt via HTTP status return | ✅ PASS | `executePush` returns `{ statusCode, success }` |
| Notify on upload/update/delete | ✅ PASS | Upload via `processPublication`, delete via `sendThirdPartyDeletion` |
| Accept 200/201/202/204 as success | ✅ PASS | `isSuccessStatus` in `http-client.ts` and `SUCCESS_STATUSES` in `retry.ts` |
| Validate no send without trigger | ✅ PASS | Only called from `processPublication` and remove-list handler |
| Differentiate new vs updated publication | ✅ PASS | `supersededCount > 0` → `isUpdate: true` → push log type `"UPDATE"`; new publication → `"CREATE"` |
| Integration and unit tests | ✅ PASS | 44 unit tests; no E2E (not applicable for server-side push) |

---

## Next Steps

- [ ] **Resolve PDF payload question** — confirm whether PDF delivery is required
- [ ] Consider removing `include: { user: true }` from `findSubscribersByListType`
- [ ] Manual tests: upload a publication matching a subscribed list type → verify push was sent; delete a publication → verify empty-body push was sent

---

## Overall Assessment

**NEEDS CHANGES**

The implementation is architecturally sound, well-tested, and follows project conventions. The only remaining item before this can be closed is the PDF payload question — confirm with Courtel/P&I whether PDF delivery is required.
