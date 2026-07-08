# Code Review: Issue #779 — Remove hardcoded list type IDs

## Summary

Five controllers in `apps/web/src/pages/(list-types)/` were guarding artefact display using autoincrement numeric IDs from the `list_type` table. Because those IDs differ per environment, the non-strategic lists broke on STG. The fix replaces every numeric guard with a comparison against `artefact.listTypeName`, which is derived from the `@unique` `name` column of the `list_type` table via a join in `getArtefactById`. The `LIST_TYPE_ID_TO_NAME` lookup maps and the two single-value ID constants (`LONDON_ADMIN_COURT_LIST_TYPE_ID`, `COURT_OF_APPEAL_CIVIL_LIST_TYPE_ID`) are deleted. All four test files are updated to use name-keyed fixtures and `listTypeId: 999` to prove ID independence.

---

## CRITICAL Issues

None that would block deployment. The single notable correctness concern (below) is a latent risk, not an immediate break.

---

## HIGH PRIORITY Issues

### 1. `listTypeName` is only populated by `getArtefactById` — other `Artefact`-returning queries silently leave it `undefined`

**File:** `libs/publication/src/repository/queries.ts` (line 114) vs lines 117–165 (`getArtefactsByLocation`, `getArtefactsByIds`)

**Problem:** The `Artefact` interface declares `listTypeName?: string` (optional). Only `getArtefactById` performs the `listType: { select: { name: true } }` join that populates it. `getArtefactsByLocation` and `getArtefactsByIds` do not include this join, so any `Artefact` returned through those paths has `listTypeName: undefined`.

The controllers affected by this PR all call `getArtefactById` (via `createSimpleListTypeHandler`), so the current call paths are safe. However:

- The `Artefact` type does not communicate which queries guarantee the field.
- If a future caller passes an artefact from `getArtefactsByLocation` into one of these guards, it will silently 400 on every request rather than throwing a type error. TypeScript will not catch this because the field is marked optional in the same interface used by both query functions.

**Recommendation:** This is pre-existing, not introduced by this PR, but the PR now makes the field load-bearing for correctness. Consider either adding a separate `ArtefactWithListType` interface that makes `listTypeName` required, or documenting the invariant with a comment on the `Artefact` interface. Neither change is urgent for deployment, but the ambiguity will cause a subtle production bug the moment a second call site is added.

### 2. `artefact.listTypeName!` non-null assertion in `render` is safe today but fragile

**File:** `apps/web/src/pages/(list-types)/list-type-handler.ts` line 320

**Problem:** The `render` function uses `artefact.listTypeName!` after `guardArtefact` has already verified it is truthy. The assertion is logically correct, but TypeScript cannot verify the temporal relationship between `guardArtefact` and `render` — they are separate exported functions with no shared closure enforcing the precondition. If `render` is called directly (e.g., from a future test or a different code path that skips the guard), the assertion will suppress the TypeScript error and produce a runtime `undefined` access on `listTypeConfig[undefined]`, returning `undefined` for `listConfig` and throwing on `listConfig[locale]`.

**Recommendation:** The defensive approach is to keep a short guard inside `render` as well:

```typescript
const listTypeName = artefact.listTypeName;
if (!listTypeName || !listTypeConfig[listTypeName]) {
  // log + 500 or rethrow — should never happen if guard was called
  return;
}
```

Alternatively, the two functions could be collapsed so the guard and render are a single flow, but that is a larger refactor. The current state is acceptable for the immediate fix.

---

## SUGGESTIONS

### 1. No test for `listTypeName: undefined` on the single-type handlers (London and CoA Civil)

**Files:** `london-administrative-court-daily-cause-list/index.test.ts`, `court-of-appeal-civil-daily-cause-list/index.test.ts`

Both test files cover the "wrong name" case using `listTypeName: "UNKNOWN_LIST_TYPE"`. Neither covers `listTypeName: undefined`. The runtime behaviour when `listTypeName` is `undefined` is:

```
undefined !== "LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST"  // true → 400 fires
```

So the guard does handle `undefined` correctly (it returns 400), but the behaviour is untested. Adding a test with `listTypeName: undefined` (omitting the field entirely) would confirm the guard holds for the `getArtefactsByLocation`-path scenario described in HIGH PRIORITY issue 1.

### 2. `(t as any)` casts in `createMultiListGuardAndRender` render function

**File:** `apps/web/src/pages/(list-types)/list-type-handler.ts` lines 332–334

```typescript
const dataSource = (t as any).common?.provenanceLabels?.[artefact.provenance] || ...
const listContent = (t as any)[listTypeName] || {};
```

These casts pre-exist this PR but they are exercised on every render through the updated path. `SimpleLocaleContent` is typed as `Record<string, unknown>`, which should allow `t[listTypeName]` without a cast — `t.common?.provenanceLabels` requires a narrower type but is also accessible via `(t as Record<string, Record<string, Record<string, string>>>)` or a proper type. This is not newly introduced, but noting it as the PR touches this function.

### 3. `resolveTemplate` always returns `"administrative-court-daily-cause-list"` regardless of `listConfig`

**File:** `apps/web/src/pages/(list-types)/administrative-court-daily-cause-list/index.ts` line 48

```typescript
resolveTemplate: () => "administrative-court-daily-cause-list"
```

The `LIST_TYPE_CONFIG` entries each define a distinct `template` field (e.g., `"birmingham-administrative-court-daily-cause-list"`, `"leeds-administrative-court-daily-cause-list"`), but `resolveTemplate` ignores `listConfig.template` and always returns the same string. This was true before the PR too. If the templates are actually distinct, this looks like a pre-existing bug where per-city templates are defined but not used. If they are all the same template, the `template` field in `LIST_TYPE_CONFIG` is misleading. Worth clarifying.

---

## Positive Feedback

- The root cause is correctly identified: autoincrement numeric IDs cannot be used as cross-environment stable identifiers. The fix to use the `@unique` `name` column is the right approach.
- The `createMultiListGuardAndRender` refactor is clean. Removing `listTypeIdToName` from `MultiListHandlerOptions` removes an entire class of error — there is no longer any way to pass a stale or incorrect mapping.
- The `listTypeId: 999` convention in tests is a clear signal to future readers that the ID is irrelevant to routing logic.
- The test renaming (removing `(listTypeId 20)` annotations) improves test titles by removing now-meaningless implementation details.
- The RCJ test upgrade from iterating over numeric IDs `[10, 11, ..., 17]` to iterating over string names is a meaningful improvement — the test now documents which list type names are supported rather than which DB IDs happened to exist in one environment.
- No residual references to the removed constants were found anywhere in `apps/` or `libs/`.

---

## Test Coverage Assessment

| Scenario | Admin Court | RCJ | London Admin | CoA Civil |
|---|---|---|---|---|
| Happy path (correct name, any numeric ID) | Yes | Yes (all 8 names) | Yes | Yes |
| Wrong name returns 400 | Yes | Yes | Yes | Yes |
| `undefined` listTypeName returns 400 | No | No | No | No |
| Missing artefactId returns 400 | Yes | Yes | Yes | Yes |
| Artefact not found returns 404 | Yes | Yes | Yes | Yes |
| JSON blob not found returns 404 | Yes | Yes | Yes | Yes |
| Validation failure returns 400 | Yes | Yes | Yes | Yes |
| Server error returns 500 | Yes | Yes | Yes | Yes |
| Welsh locale | Yes | Yes | Yes | Yes |
| Provenance label lookup | Yes | Yes | Yes | Yes |

The `undefined listTypeName` row is the only gap. It is a low-risk omission because the current runtime behaviour is correct, but the test would act as a regression guard for the HIGH PRIORITY issue 1 scenario.

---

## Acceptance Criteria Verification

- [x] Non-strategic admin court lists (Birmingham, Leeds, Bristol/Cardiff, Manchester) render on any environment — guard now uses `listTypeName`, not a numeric ID
- [x] RCJ lists (all 8 types) render by name — `LIST_TYPE_ID_TO_NAME` map deleted, `createMultiListGuardAndRender` reads `artefact.listTypeName` directly
- [x] London admin court and CoA Civil lists render correctly — `LONDON_ADMIN_COURT_LIST_TYPE_ID` and `COURT_OF_APPEAL_CIVIL_LIST_TYPE_ID` constants replaced with `SUPPORTED_LIST_TYPE` string constants
- [x] Unsupported list type still returns 400 — both guard implementations return 400 when the name is absent from config or does not match
- [x] No hardcoded numeric `listTypeId` comparisons remain — grep confirms zero residual references to the removed constants or patterns

---

## Overall Assessment

**APPROVED with recommendations**

The fix is correct, targeted, and complete within the stated scope. The two HIGH PRIORITY items are pre-existing concerns that the PR brings into focus rather than introducing, and neither blocks the immediate goal of fixing non-strategic list rendering on STG. The missing `undefined listTypeName` test case is the only new coverage gap introduced by the PR. The implementation can be deployed as-is; the recommendations above should be tracked as follow-up items.
