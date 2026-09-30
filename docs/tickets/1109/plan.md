# Technical Plan — #1109 CaTH User Groups

**Primary input:** the technical specification posted as an issue comment and captured in
`docs/tickets/1109/ticket.md`. This plan does **not** restate it. Read ticket.md for the
wireframes (§5), the full content tables (§7), the accessibility detail (§12) and the full
test-scenario lists (§13). This document records only the decisions, the deltas and the
places where the spec is **factually wrong about this codebase** and must not be followed
literally.

---

## 1. Technical Approach

Implement **Option A** from ticket.md §2: derive a user's jurisdiction interest from the
subscription data they already maintain, rather than adding a new field or a new
`user_group` table. It needs no Prisma schema change, no migration and no new
user-facing journey; it covers every existing user immediately, and the data is
self-maintained by users so it does not go stale. Options B, C and D are rejected for the
reasons given in the spec's options table.

**The deliverable is the recipient list, not a send mechanism.** One new System Admin page
(`/user-groups`) filters users by jurisdiction, sub-jurisdiction, role and provenance, shows
the matched count and a paginated table, and downloads all matched users as a CSV for upload
to GOV.UK Notify bulk send. CaTH does not send the emails. Sending in-service would need
rate limiting, retry, per-recipient audit rows and an approval gate — a separate, much
larger piece of work.

**This is gated on business agreement.** AC2 reads "upon agreement with the business, the
agreed solution is implemented". Option A is a recommendation, not a decision. Do not start
coding until open questions 1 and 2 in §5 are answered — if the business picks Option B,
most of this plan is discarded.

No Prisma schema change. No migration. No change to `location-data.ts` or `list-type-data.ts`.
No API routes — nothing outside the service consumes the group.

---

## 2. Implementation Details

### TEMPLATE SOURCE

> TEMPLATE SOURCE: write fresh — no pip-frontend equivalent exists (this is new
> functionality, not a migration). Adapt the in-repo
> `apps/web/src/pages/(system-admin)/find-users/index.njk` MOJ filter layout as the
> structural reference.

### 2.1 Files to create

No `types.ts` files (CLAUDE.md pitfall 11). Interfaces and types are colocated at the
**bottom** of the module that owns them, per CLAUDE.md §8 module ordering
(consts → exported functions → internal functions → types).

```
libs/system-admin-pages/src/user-groups/
├── queries.ts              # searchUserGroup(filters, page), findAllMatchedUsers(filters)
│                           # PAGE_SIZE = 25 at top; types at bottom
├── queries.test.ts
├── service.ts              # buildUserGroupCsv(filters) -> { buffer, filename }
│                           # MAX_EXPORT_ROWS = 50000; formula-injection guard
├── service.test.ts
├── validation.ts           # validateUserGroupFilters (the ONLY export)
└── validation.test.ts

apps/web/src/pages/(system-admin)/user-groups/
├── index.ts                # GET (results) + POST (apply filters, PRG)
├── index.njk
├── en.ts
├── cy.ts
├── index.test.ts
├── index.njk.test.ts
├── download/
│   ├── index.ts            # POST -> CSV attachment
│   └── index.test.ts
├── clear-filters/
│   ├── index.ts            # GET -> clears session, redirects
│   └── index.test.ts
└── remove-filter/
    ├── index.ts            # GET -> removes one filter value, redirects
    └── index.test.ts

e2e-tests/tests/user-groups.spec.ts
```

### 2.2 Files to modify

| File | Change |
|------|--------|
| `libs/system-admin-pages/src/index.ts` | **Explicit named exports only** — see the collision warning below |
| `libs/system-admin-pages/src/audit-log/logger.ts` | Add `DOWNLOAD_USER_GROUP = "Download user group"` to `AuditLogAction`, in alphabetical position immediately after `DOWNLOAD_MI_REPORT` |
| `apps/web/src/pages/(system-admin)/system-admin-dashboard/en.ts` | Add tile after the `User Management` tile (`href: "/find-users"`): title `User Groups`, description `Group users by jurisdiction and download email lists for communications`, href `/user-groups` |
| `apps/web/src/pages/(system-admin)/system-admin-dashboard/cy.ts` | Same tile, Welsh, same array position |

**Export collision — a blanket `export *` will break the build.**
`libs/system-admin-pages/src/index.ts` already exports `validateRoles`, `validateProvenances`
and `ValidationError` (aliased `UserManagementValidationError`) from
`user-management/validation.js`. Add the new module with explicit, non-colliding names:

```ts
export { findAllMatchedUsers, searchUserGroup } from "./user-groups/queries.js";
export { buildUserGroupCsv } from "./user-groups/service.js";
export { type UserGroupValidationError, validateUserGroupFilters } from "./user-groups/validation.js";
```

### 2.3 Corrected query strategy — THE SPEC IS WRONG HERE

ticket.md §6.5 says the jurisdiction joins happen with "the cast … in the join", and §9.3
says "the jurisdiction joins are expressed as Prisma relation filters". **Both are
impossible in this schema:**

- There is **no Prisma relation** from `Subscription` to `Location`. `Subscription.searchValue`
  is `String`; `Location.locationId` is `Int`. Prisma cannot join them and cannot cast.
- There is **no Prisma relation** from `SubscriptionListType` to `ListType`.
  `SubscriptionListType.listTypeIds` is a bare `Int[]` scalar array, not a foreign key.

Do the resolution in application code, in **five explicit steps, all inside
`libs/system-admin-pages/src/user-groups/queries.ts`**:

**Step 1 — names → `subJurisdictionId`s.** Selected filter values are jurisdiction/sub-jurisdiction
*names* (never numeric IDs).

```ts
prisma.subJurisdiction.findMany({
  where: { OR: [{ name: { in: subJurisdictions } }, { jurisdiction: { name: { in: jurisdictions } } }] },
  select: { subJurisdictionId: true, name: true, jurisdiction: { select: { name: true } } }
});
```

Keep the `subJurisdictionId → jurisdiction name` map from this result — steps 2 and 3 need it
to build the per-user matched-jurisdiction display.

**Step 2 — court path** (used when `matchOn` is `courts` or `either`):

```ts
prisma.locationSubJurisdiction.findMany({
  where: { subJurisdictionId: { in: subJurisdictionIds } },
  select: { locationId: true, subJurisdictionId: true }
});
// -> locationId[] ; keep locationId -> jurisdiction name map
prisma.subscription.findMany({
  where: { searchType: "LOCATION_ID", searchValue: { in: locationIds.map(String) } },
  select: { userId: true, searchValue: true }
});
```

`searchType === "LOCATION_ID"` is the string literal used throughout
`libs/subscriptions/src/repository/`. Mapping `locationId` to `String(locationId)` on the
application side means non-numeric `searchValue` rows simply never match — nothing throws.
`idx_subscription_search` on `(search_type, search_value)` serves this query.

**Step 3 — list-type path** (used when `matchOn` is `listTypes` or `either`):

```ts
prisma.listTypeSubJurisdiction.findMany({
  where: { subJurisdictionId: { in: subJurisdictionIds }, listType: { deletedAt: null } },
  select: { listTypeId: true, subJurisdictionId: true }
});
// -> listTypeId[] ; keep listTypeId -> jurisdiction name map
prisma.subscriptionListType.findMany({
  where: { listTypeIds: { hasSome: listTypeIds } },
  select: { userId: true, listTypeIds: true }
});
```

`hasSome` is the Prisma operator for `Int[]` scalar arrays. Resolving a *stored* foreign key
through a live join does **not** breach CLAUDE.md pitfall 15 — that rule forbids *literal*
numeric IDs in source. No numeric list type, jurisdiction or sub-jurisdiction ID may appear
as a literal anywhere in this feature. All filter constants are names.

**Step 4 — combine and fetch users.** Union the step 2 and step 3 `userId` sets per `matchOn`
(`courts` → step 2 only, `listTypes` → step 3 only, `either` → union, deduplicated), then:

```ts
prisma.user.findMany({
  where: {
    userId: { in: [...matchedUserIds] },
    ...(roles?.length && { role: { in: roles } }),
    ...(provenances?.length && { userProvenance: { in: expandedProvenances } })
  },
  select: { userId: true, email: true, role: true },
  skip, take: PAGE_SIZE, orderBy: { createdDate: "desc" }
});
```

Where **no** jurisdiction or sub-jurisdiction filter is selected, skip steps 1–3 entirely and
omit the `userId` clause — the query degenerates to the same shape as `searchUsers`.
`PAGE_SIZE = 25` and the `B2C_IDAM` → `["B2C_IDAM", "PI_AAD"]` expansion both mirror
`libs/system-admin-pages/src/user-management/queries.ts` exactly (legacy accounts carry
`PI_AAD`). Total count comes from a matching `prisma.user.count` so the displayed count is the
**total** matched set, not the page size.

**Step 5 — per-user matched jurisdictions.** Build the display map from the step 2/3
intermediate results: step 2 gives `userId` + `searchValue` (→ `locationId` → jurisdiction
name), step 3 gives `userId` + `listTypeIds` (→ jurisdiction name). Deduplicate and sort
alphabetically. Where a user matched with no interest signal (role/provenance filters only)
the cell renders the em-dash placeholder from the locale file.

The CSV export (`findAllMatchedUsers`) runs the identical pipeline with `skip`/`take`
removed.

**Scale caveat — record as a known risk, not a pre-emptive rewrite.** A
`userId: { in: [...] }` clause degrades once the matched set is very large, because the whole
ID list is serialised into the query. Do not hand-write raw SQL now (YAGNI). Measure first
(§3 has the task). Documented fallbacks, in order: (a) replace the final `userId: { in: [...] }`
with nested relation filters — `Subscription.user` and `SubscriptionListType.user` **do** exist,
so `prisma.user.findMany({ where: { OR: [{ subscriptions: { some: { searchType: "LOCATION_ID", searchValue: { in: [...] } } } }, { subscriptionListTypes: { some: { listTypeIds: { hasSome: [...] } } } }] } })`
pushes the whole match into one query; (b) `$queryRaw` with a CTE if (a) is still too slow.
Steps 1–3 are required either way, because the per-user matched-jurisdiction map needs the
intermediate rows.

### 2.4 Filter options and the validation allow-list — reuse, do not re-query

`listJurisdictionsWithSubJurisdictions()` already exists in
`libs/system-admin-pages/src/jurisdiction-management/queries.ts` and is already exported from
the lib's `index.ts`. It returns every jurisdiction with `name` / `welshName` plus nested
sub-jurisdictions with `name` / `welshName`, both sorted. Use it for **both** the checkbox
options at render time **and** the server-side allow-list inside `validateUserGroupFilters`.
Do not hardcode jurisdiction names, and do not write a second query — new jurisdictions added
via `/jurisdiction-data` must appear on this page automatically. Display `name` in English and
`welshName` in Welsh.

### 2.5 Validation shape

`libs/system-admin-pages/src/user-groups/validation.ts` follows the shape of
`user-management/validation.ts` (`ValidationError { text, href }`, `VALID_ROLES`,
`VALID_PROVENANCES` allow-list arrays) — but exports **only**
`validateUserGroupFilters` and the `UserGroupValidationError` type. Per-field helpers stay
module-private (CLAUDE.md pitfall 13: do not export functions just to test them); they are
covered through the aggregate. Rules, normalisation and the error table are in ticket.md §9
and §10 — implement them as written there, with §9.3's "Prisma relation filters" claim
replaced by §2.3 above.

### 2.6 CSV generation — reuse papaparse

`papaparse` is already a dependency of `@hmcts/system-admin-pages` and
`reference-data-upload/services/download-service.ts` uses `Papa.unparse` for exactly this job.
There is **no** reusable standalone escaping helper in that file. So:

- Use `Papa.unparse` in `user-groups/service.ts` for quoting and for doubling embedded double
  quotes. Do not hand-roll a CSV escaper.
- `Papa.unparse` does **not** guard against spreadsheet formula injection. That small function
  — prefix a single quote onto any field starting `=`, `+`, `-` or `@` — is new and **lives in
  `libs/system-admin-pages/src/user-groups/service.ts`**, applied to each field before
  `unparse`. It is module-private.
- Header row `email,role,jurisdictions`; `jurisdictions` semicolon-separated; **English**
  headers and English jurisdiction names regardless of interface language — the file is
  machine-consumed by Notify, not user-facing content.
- Filename per ticket.md §6.7.

### 2.7 Controller pattern — mirror find-users and mi-report exactly

`apps/web/src/pages/(system-admin)/user-groups/index.ts` follows
`find-users/index.ts` line for line:

- `const language = req.query.lng === "cy" ? "cy" : "en"; const content = language === "cy" ? cy : en;`
- filters read from `req.session`, namespaced `userGroups` (`{ filters, page }`), mirroring
  `session.userManagement`
- `selectedFilterGroups: { heading, tags: [{ label, removeUrl }] }[]`
- `lngParam` (`?lng=cy`) / `lngQueryParam` (`&lng=cy`)
- `paginationItems` / `paginationPrevious` / `paginationNext`
- `res.render("user-groups/index", { ...content, ... })` — **spreads `content`; find-users does
  not pass `t`.** Follow find-users here, since the template is adapted from it.
- try/catch that `console.error`s the error, filters, page and timestamp, then falls back to an
  empty result set
- `export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];`
  and the same for `POST`

`download/index.ts` follows `mi-report/index.ts`: validate → `buildUserGroupCsv` →
`req.auditMetadata = { action: AuditLogAction.DOWNLOAD_USER_GROUP, entityInfo: "Filters: …, Recipients: N" }`
→ `res.setHeader("Content-Type", "text/csv; charset=utf-8")`,
`res.setHeader("Content-Disposition", \`attachment; filename="${filename}"\`)` → `res.send(buffer)`.
The existing `auditLogMiddleware` picks up `auditMetadata` on `res.send`. Note mi-report passes
both `t` and `...t`; the download handler only re-renders on failure, so it must render the same
view model shape as `index.ts` (spread `content`).

`clear-filters/index.ts` and `remove-filter/index.ts` are near-copies of their `find-users`
equivalents, with `remove-filter` handling the four array groups
(`jurisdiction`, `subJurisdiction`, `role`, `provenance`) plus `matchOn` reset, and both
resetting `page` to 1.

### 2.8 Not in scope

No API endpoints. No database schema changes. No new SCSS — the MOJ filter layout
(`moj-filter-layout app-filter-layout--sidebar`) already exists and is used by `find-users`.
No `location-data.ts` / `list-type-data.ts` changes. No stored or named groups. No site
notification banner (see open question 2).

---

## 3. Error Handling & Edge Cases

Condensed from ticket.md §9 and §10 to the rules that actually change code. The full
error-message table with anchors and HTTP behaviour is in ticket.md §10 — implement it as
written. These are the ones easy to get wrong:

- **No filters is valid.** An unfiltered page shows all users. No error, no empty state. That
  is the current de facto comms audience and the honest default.
- **Zero matches with filters applied** → 200, re-render with the `noResultsError` summary,
  filters retained, **no results table and no download button**. Zero matches with *no* filters
  applied must **not** show the error (matches the `hasActiveFilters` check in
  `find-users/index.ts`).
- **`MAX_EXPORT_ROWS = 50000` is a refusal, not a truncation.** Over the cap, no file is
  produced and the page re-renders with `tooManyResultsError`. A silently truncated recipient
  list is worse than no list.
- **Download with zero matches** → no file, re-render with `noDownloadError`.
- **Unknown filter values** are only reachable by hand-crafting a request, since the UI only
  offers valid checkboxes. Still validate against the server-side allow-list and return a
  specific message; discard the submitted values and do not echo any raw submitted value into
  the HTML, so a crafted value cannot be reflected.
- **CSV formula injection.** Any field beginning `=`, `+`, `-` or `@` is prefixed with a single
  quote before `Papa.unparse`. Applies to every field, not just `jurisdictions`.
- **Users with no subscriptions match no jurisdiction filter.** They are reachable only by an
  unfiltered send. This is a real behavioural gap, so the page must state it in the description
  text — an admin must not assume a jurisdiction group covers everyone. See open question 6.
- **A location or list type with no sub-jurisdiction mapping silently drops its subscribers**
  from every jurisdiction group. No error is raised because the row simply does not join. This
  is the main accuracy risk (§6) and needs a pre-release reconciliation.
- **`SubscriptionListType.userId` is `@unique`** — exactly one row per user. So the list-type
  path yields at most one row per user; do not write dedupe logic for it, but **do** dedupe
  across the court and list-type paths when `matchOn` is `either`, since a user can match
  through both.
- **A user's matched jurisdictions are deduplicated and alphabetically sorted**; the em-dash
  placeholder renders when there was no interest signal.
- **Database errors log and render an empty result set — they do not 500.** Same as
  `find-users/index.ts`: `console.error` with the error, filters, page and an ISO timestamp,
  then `{ users: [], totalCount: 0, currentPage: 1, totalPages: 0 }`. An admin page that
  500s on a slow query is worse than one that shows nothing.
- **Email addresses are never written to logs.** Log filters and counts only. This applies to
  the query failure path, the CSV failure path and the audit `entityInfo`.
- **Non-`SYSTEM_ADMIN` access** is handled entirely by the existing `requireRole` middleware —
  no bespoke handling.
- **Page number** — `Number(req.query.page) || 1`, silently falling back. No error.
- **Applying, removing or clearing any filter resets `page` to 1** so an admin cannot be left
  on page 5 of a two-page result.

---

## 4. Acceptance Criteria Mapping

The issue has only two acceptance criteria.

| AC | Status | How it is satisfied / verified |
|----|--------|-------------------------------|
| **AC1** — "Explore different options for grouping CaTH users by jurisdiction/role" | **Already satisfied by the spec.** No code needed. | ticket.md §2 documents four options (A derive from subscriptions, B self-declared field, C static `user_group` table with manual assignment, D manage lists in Notify) with how each works and why it was accepted or rejected. A is recommended. Verification is review of that section with the business. |
| **AC2** — "Upon agreement with the business, the agreed solution is implemented" | **Blocked.** Cannot be closed until the business signs off Option A. | Implementation of §2 of this plan, verified by the unit / template / E2E layers below. If the business picks Option B instead, this plan is replaced. |

### Verification approach for the spec's detailed scenarios (ticket.md §3)

Summary level only — the per-assertion lists are in ticket.md §13 and should be implemented
from there.

| Scenario group (ticket.md §3) | Verified by |
|---|---|
| Query correctness: single jurisdiction, jurisdiction + role, `matchOn` variants, sub-jurisdiction narrowing, dedupe, `B2C_IDAM`/`PI_AAD` expansion, non-numeric `searchValue`, zero matches, count independent of page, matched-jurisdiction names | Unit — `libs/system-admin-pages/src/user-groups/queries.test.ts`, Prisma mocked per `.claude/rules/testing.md`. Fixtures use **arbitrary** numeric `listTypeId` / `subJurisdictionId` values to prove ID-independence. |
| Filter input rules, normalisation, allow-lists, `matchOn` default | Unit — `validation.test.ts`, exercising only `validateUserGroupFilters` |
| CSV shape, escaping, formula-injection prefix, filename, cap and empty-set refusal, English-only output | Unit — `service.test.ts` |
| Controller behaviour: render shape, Welsh, page fallback, no-results error presence/absence, DB-error fallback, filter tags, PRG redirect with `lng`, page reset, validation re-render, `requireRole` wrapping | Unit — `apps/web/src/pages/(system-admin)/user-groups/index.test.ts`, `download/index.test.ts`, `clear-filters/index.test.ts`, `remove-filter/index.test.ts` (handler extracted as the last element of the exported array) |
| Rendered structure: `h1`, fieldsets and legends, options from data not hardcoded, checked state, table rows and headers, em-dash cell, conditional download button and table, error summary present and absent, removable tags with visually hidden text, conditional pagination links | Template — `index.njk.test.ts` using `createTestEnvironment` / `render` from `@hmcts/test-support`, Cheerio structural assertions, plus locale key parity |
| Welsh coverage across the page | Template test rendered with the `cy` object, plus the `?lng=cy` step inside the E2E journey |
| Access control for non-admins | E2E — second journey test |
| Whole journey incl. accessibility and keyboard | E2E — one `@nightly` journey test covering dashboard tile → unfiltered count → Axe → keyboard filter apply → tag assertion → Welsh → no-match error state + Axe → tag removal → CSV download → audit log entry. **Two E2E tests total** (the journey, and non-admin refusal) — do not split per assertion. |

---

## 5. CLARIFICATIONS NEEDED

Carried forward from ticket.md §14. AC2 explicitly requires business agreement, so questions
1 and 2 must be answered before any code is written.

1. **[BLOCKING] Is derived grouping (Option A) acceptable, or does the business want users to
   self-declare their interests (Option B)?** A ships with no schema change and covers existing
   users immediately; B is more explicit but leaves every current user ungrouped until they next
   sign in, so comms would still fall back to "send to everyone". This plan assumes A. If B is
   chosen, §2 and most of ticket.md §6–§13 are replaced.
2. **[BLOCKING] What does "Banner/Label" in the ticket title mean?** The problem statement and
   both acceptance criteria are entirely about outbound communications, and this plan
   deliberately excludes any on-site banner. If the intent is also a GOV.UK notification banner
   shown on the site to a specific audience, that is a different feature — it needs a *stored*
   group, banner content editing and audience evaluation on every request. It should be raised
   as its own ticket, not folded in here. The title and the ACs currently disagree.
3. **Should CaTH send the emails itself rather than exporting a CSV?** In-service sending needs
   Notify rate limiting, retry, per-recipient audit rows, a send preview and an approval gate.
   Materially larger; recommend a follow-on ticket once the grouping logic is proven.
4. **Do groups need to be named and saved?** Recurring sends to the same audience would be
   easier with saved groups, but that means a `user_group` table and CRUD pages. Excluded under
   YAGNI. Confirm the business is content to re-select filters each time.
5. **Should region be a filter too?** `location_region` exists and would let comms target, say,
   Wales-only users. Not in the acceptance criteria so excluded, but it is a small addition to
   the same pipeline (one extra resolution step alongside step 2).
6. **How should users with no subscriptions be treated?** They currently match no jurisdiction
   filter. Options: exclude (current behaviour), or add a "Users with no subscriptions" checkbox
   so they can be deliberately included. Needs a decision — it changes both the query and the
   content.
7. **Is "interest" better measured by recent activity than by subscription existence?** A user
   who subscribed two years ago and has not signed in since is still counted. A
   `lastSignedInDate` filter could be added; out of scope unless asked for.
8. **[NEW] Who signs off exporting a list of user email addresses, and what is the handling
   guidance for the downloaded file?** The spec assumes this is already within the System Admin
   remit because `/find-users` displays emails and `/mi-report` exports account data. That is
   reasonable, but a bulk email export intended for onward use in a third-party tool is a
   different shape of processing. Confirm with the service's information governance contact
   before release, and confirm whether a retention/deletion instruction needs to appear on the
   page itself.
9. **[NEW] Which `matchOn` value should be the default, and is a three-way radio needed at
   all?** The spec defaults to `either`, which is the widest audience and therefore the safest
   for comms. If the business cannot articulate a case for the `courts`-only and
   `listTypes`-only options, drop the radio group entirely under YAGNI — it is the only control
   on the page whose meaning an admin has to be taught.

### Risks

- **Data quality of `location_sub_jurisdiction` and `list_types_sub_jurisdictions` is the
  single biggest risk to group accuracy.** If a Crown Court location is not mapped to the Crown
  Court sub-jurisdiction, its subscribers silently drop out of a Crime group and miss the
  comms — with no error anywhere. Before release, run a reconciliation over `location` and
  `list_types` and report every row with no sub-jurisdiction mapping. The quality of these two
  tables *is* the quality of the feature.
- **Query cost of the `userId: { in: [...] }` approach at scale.** The pipeline spans
  `subscription`, `subscription_list_type`, `location_sub_jurisdiction` and
  `list_types_sub_jurisdictions`, and serialises the whole matched ID set into the final user
  query. `idx_subscription_search` covers the court path; the list-type path scans
  `subscription_list_type`, which is one row per user. Measure against production-scale data
  before release. Mitigation ladder is in §2.3 — nested relation filters first, raw SQL with a
  CTE only if that is still too slow.
- **An exported CSV of user email addresses leaves the service's control.** It is audited on
  the way out and never again. The audit entry is the only control. The team's handling
  guidance for the downloaded file must be written down before this ships (see open
  question 8).
