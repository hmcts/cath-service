# Technical Plan: Update Verified User Case Subscription Search Screen (#762)

## 1. Technical Approach

Three discrete problems to fix, in order of scope:

1. **Fix `searchByCaseNumber` query** — add the same active list-type + display-window filter that `searchByCaseName` already applies. This is the "correct results" fix.
2. **Remove party dead code from `subscription-management` content files** — `tableHeaderPartyName` is defined in `en.ts` and `cy.ts` but never referenced by the template. Delete the key from both.
3. **Remove the `Applicant` field from the civil-and-family daily cause list email summary builder** — `summary-builder.ts` currently pushes an `Applicant` field extracted via `extractParty`; remove it so the email contains only Case reference, Case name, Case type, Hearing type.

No schema changes, no new routes, no new files.

---

## 2. Implementation Details

### 2.1 Fix `searchByCaseNumber`

**File:** `libs/subscriptions/src/repository/queries.ts`

Current implementation:
```typescript
export async function searchByCaseNumber(reference: string): Promise<CaseSearchResult[]> {
  const results = await prisma.artefactSearch.findMany({
    where: {
      caseNumber: reference
    },
    select: { caseNumber: true, caseName: true },
    distinct: ["caseNumber", "caseName"]
  });
  return results;
}
```

The function lacks:
- Filtering by list types that have `caseNumberFieldName` configured in `ListSearchConfig`
- Active display window filter (`displayFrom <= now`, `displayTo >= now`)

Updated implementation:
```typescript
export async function searchByCaseNumber(reference: string): Promise<CaseSearchResult[]> {
  const configs = await prisma.listSearchConfig.findMany({
    where: { caseNumberFieldName: { not: "" } },
    select: { listTypeId: true }
  });

  if (configs.length === 0) {
    return [];
  }

  const listTypeIds = configs.map((c) => c.listTypeId);
  const now = new Date();

  const results = await prisma.artefactSearch.findMany({
    where: {
      caseNumber: reference,
      artefact: {
        listTypeId: { in: listTypeIds },
        displayFrom: { lte: now },
        displayTo: { gte: now }
      }
    },
    select: { caseNumber: true, caseName: true },
    distinct: ["caseNumber", "caseName"],
    take: 50
  });

  return results;
}
```

Note: uses `caseNumberFieldName: { not: "" }` (mirroring the name search which uses `caseNameFieldName: { not: "" }`). A `take: 50` limit is added for consistency.

### 2.2 Remove `tableHeaderPartyName` from subscription management content

**Files:**
- `apps/web/src/pages/(verified)/subscription-management/en.ts`
- `apps/web/src/pages/(verified)/subscription-management/cy.ts`

Confirmed the `index.njk` template does **not** reference this key — it is dead code.

Remove from `en.ts`:
```typescript
tableHeaderPartyName: "Party name(s)",
```

Remove from `cy.ts`:
```typescript
tableHeaderPartyName: "Enw'r parti (partïon)",
```

### 2.3 Remove `Applicant` field from email summary builder

**File:** `libs/list-types/civil-and-family-daily-cause-list/src/email-summary/summary-builder.ts`

Current code:
```typescript
const applicant = extractParty(caseItem, "APPLICANT_PETITIONER");
const fields: CaseSummary = [];

if (applicant) {
  fields.push({ label: "Applicant", value: applicant });
}
fields.push({ label: "Case reference", value: caseItem.caseNumber || "" });
```

Updated code:
```typescript
const fields: CaseSummary = [];
fields.push({ label: "Case reference", value: caseItem.caseNumber || "" });
```

The `extractParty` import from `@hmcts/daily-cause-list-common` should be removed if no longer used in this file.

---

## 3. Error Handling & Edge Cases

- **`searchByCaseNumber` with no `ListSearchConfig` rows:** returns `[]` early (same pattern as `searchByCaseName`). The case reference search controller already handles empty results by re-rendering with an error.
- **Expired artefacts:** with the display-window filter, expired publications are excluded. This is the correct behaviour per the spec.
- **Email builder:** removing the `Applicant` field is safe because the field is conditional (`if (applicant)`) — cases without a party already produce no `Applicant` entry. The test "should not include applicant field when missing" already validates the no-party path; that test can be simplified or replaced.

---

## 4. Acceptance Criteria Mapping

| Criterion | How satisfied |
|---|---|
| Search for case name shows correct results | Already correct; no change needed to `searchByCaseName` |
| Search for case reference number shows correct results | Fixed by aligning `searchByCaseNumber` with the same active list-type + display-window filter |
| Subscription email contains correct information | Fixed by removing the `Applicant`/party field from the email summary builder |
| Party information removed from search results (case name + reference) | Confirmed absent from UI templates; `tableHeaderPartyName` dead key removed from content files |

---

## 5. Files to Change

| File | Change |
|---|---|
| `libs/subscriptions/src/repository/queries.ts` | Update `searchByCaseNumber` to add `ListSearchConfig` filter and display-window filter |
| `libs/subscriptions/src/repository/queries.test.ts` | Update existing `searchByCaseNumber` tests to assert the new filter shape; add test for empty-config early return |
| `apps/web/src/pages/(verified)/subscription-management/en.ts` | Remove `tableHeaderPartyName` key |
| `apps/web/src/pages/(verified)/subscription-management/cy.ts` | Remove `tableHeaderPartyName` key |
| `libs/list-types/civil-and-family-daily-cause-list/src/email-summary/summary-builder.ts` | Remove `extractParty` call and `Applicant` field push; remove unused `extractParty` import |
| `libs/list-types/civil-and-family-daily-cause-list/src/email-summary/summary-builder.test.ts` | Update tests that assert `Applicant` field is present; update the "no applicant when missing" test |

---

## 6. Open Questions / Clarifications Needed

1. **`ListSearchConfig.caseNumberFieldName` vs `caseNameFieldName`:** The fix uses `caseNumberFieldName: { not: "" }` to determine which list types support reference-number search. Is this the intended filter, or should all list types that appear in `ListSearchConfig` (regardless of whether `caseNumberFieldName` is set) be searched by reference number?

2. **Email scope confirmation:** The spec comment from the previous `@spec` run flagged this as an open question: should the `Applicant`/party field be removed from **all** email summary builders (there are several: `care-standards-tribunal-weekly-hearing-list`, `london-administrative-court-daily-cause-list`, `court-of-appeal-civil-daily-cause-list`, `rcj-standard-daily-cause-list`) or only the civil-and-family daily cause list builder? The issue body says "subscription email is containing correct information" without specifying scope.
