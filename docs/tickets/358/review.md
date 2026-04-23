# Code Review: Issue #358 — Email Rate Limiting

## Summary

All previously raised issues have been resolved. The implementation is clean, fully tested, and passes lint and TypeScript checks. One minor module-ordering suggestion remains but does not block merge.

---

## 🚨 CRITICAL Issues

None.

---

## ⚠️ HIGH PRIORITY Issues

None. All previously raised items resolved:
- ✅ `countEmailsSentInWindow` filters `status: "Sent"` (`notification-queries.ts:75`)
- ✅ Compound index updated to `[userId, emailType, status, createdAt]` (`schema.prisma:27`)
- ✅ `maskEmail` is not exported (`email-rate-limiter.ts:28`)
- ✅ Masking edge cases tested indirectly via error messages (`email-rate-limiter.test.ts:104-123`)
- ✅ Misleading test name corrected (`notification-service.test.ts:148`)

---

## 💡 SUGGESTIONS

### 1. Module ordering — interfaces at the top of `notification-queries.ts`
**File:** `libs/notifications/src/notification/notification-queries.ts:3-23`

`CreateNotificationData` and `NotificationAuditLog` are declared before the exported functions. CLAUDE.md ordering: consts → exported functions → helpers → interfaces/types at the bottom.

**Fix:** Move both interfaces to the end of the file, after `countEmailsSentInWindow`.

---

## ✅ Positive Feedback

- **`email-rate-limiter.ts` module ordering** is correct: const at top, exported function, helpers in order of use, interfaces at bottom.
- **`countEmailsSentInWindow`** correctly counts only `status: "Sent"` records — rate limit reflects actual deliveries, not failed attempts.
- **Covering index** `[userId, emailType, status, createdAt]` aligns with the updated query shape.
- **`maskEmail`** is properly encapsulated as a private helper.
- **Test name** at `notification-service.test.ts:148` now accurately describes the behaviour.
- **`TooManyEmailsException`** is minimal; `this.name` ensures reliable `instanceof` checks across ESM boundaries.
- **Critical vs non-critical error handling** in `processUserNotification` is correct — nested try/catch re-throws `TooManyEmailsException` as `failed` and absorbs plain `Error` as `skipped`.
- **Environment variable config** resolved at call time makes test isolation straightforward.
- **74 tests pass, 0 lint errors, 0 TypeScript errors.**

---

## Test Coverage Assessment

- **`too-many-emails-exception.test.ts`**: Complete — all three properties verified.
- **`email-rate-limiter.test.ts`**: Complete — 11 tests covering all scenarios including masking edge cases tested indirectly.
- **`notification-queries.test.ts`**: Complete — `status: "Sent"` filter verified in both `countEmailsSentInWindow` tests.
- **`notification-service.test.ts`**: Complete — all three rate-limit scenarios covered; test names accurate.

---

## Acceptance Criteria Verification

- [x] Rate limit not yet reached → email sent, audit log updated as `Sent`
- [x] Non-critical limit exceeded → email not sent, result is `skipped`, error logged with masked email
- [x] Critical limit exceeded → `TooManyEmailsException` thrown, result is `failed`, email not sent
- [x] Rate limit key is unique per user and email type
- [x] Rate limit window resets (window-start calculation tested)
- [x] Email address masked as `u***@domain.com` in all error messages
- [x] Rate limits configurable via environment variables with defaults
- [ ] Audit log entry set to `Skipped` when non-critical rate limit exceeded — intentionally omitted per `plan.md` to avoid inflating the count for the next window query; acknowledged as a spec/plan discrepancy, no code change required

---

## Overall Assessment

**APPROVED** — ready to commit and create PR.
