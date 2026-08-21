# Technical Plan — Issue #698: Add/Update provenance for all lists

**AC:** "The provenance for all the lists in CaTH are added/updated through the system admin dashboard."

A full technical specification was posted as a comment on the issue (see `ticket.md`). This plan is the
implementation-facing version of it. Every code claim below has been re-verified against `master` at
commit `3c7178c`; where the spec and the current code disagree, this plan follows the code and the
divergence is called out explicitly in §8.

---

## 1. Technical Approach

### 1.1 What the column actually is

`list_types.allowed_provenance` (`ListType.allowedProvenance`, `libs/postgres-prisma/prisma/schema/location.prisma:53`)
is a **non-nullable** `VARCHAR(50)` holding a comma-separated allow-list of **user identity provenances**.
It is not the publication source provenance.

Its only consumer is the classified branch of `canAccessPublication`
(`libs/publication/src/authorisation/service.ts:31-35`):

```typescript
if (sensitivity === Sensitivity.CLASSIFIED) {
  if (!isVerifiedUser(user)) return false;
  if (!listType) return false;
  return !!user.provenance && listType.provenance.split(",").includes(user.provenance);
}
```

Because the check requires `role === "VERIFIED"`, only `CFT_IDAM`, `CRIME_IDAM` and `PI_AAD` can ever
match. `SSO` belongs to admins (never `VERIFIED`); `B2C_IDAM` is the *persisted* value for media accounts
whose *session* provenance is `PI_AAD`. Neither is a valid option here.

Verified current data (`libs/list-types/common/src/list-type-data.ts`, 77 entries):

| Value | Count |
|---|---|
| `CFT_IDAM` | 61 |
| `CRIME_IDAM` | 8 |
| `PI_AAD` | 5 |
| `CRIME_IDAM,PI_AAD` | 2 |
| `MANUAL_UPLOAD` | 1 (`PHT_WEEKLY_HEARING_LIST`, line 702) |

### 1.2 Three defects the AC cannot be met without fixing

**Defect 1 — dashboard edits are reverted on every deploy.**
`apps/postgres/prisma/generate-seed-sql.ts:136` emits
`ON CONFLICT (name) DO UPDATE SET ... allowed_provenance = EXCLUDED.allowed_provenance, ...`.
Anything set through the dashboard is silently overwritten from `list-type-data.ts` on the next
`apps/postgres` deploy. The same overwrite exists on the local upsert path
(`libs/location/src/seed-list-types.ts:57`, the `update` branch).
**Until this clause is removed, "updated through the system admin dashboard" is not achievable.**

**Defect 2 — `PHT_WEEKLY_HEARING_LIST` holds a publication provenance.** `MANUAL_UPLOAD` can never
match a user, so no verified user can see a classified PHT artefact.

**Defect 3 — the value cannot be corrected through the dashboard.**
`PROVENANCE_OPTIONS` (`libs/system-admin-pages/src/list-type/validation.ts:2`) is
`["CFT_IDAM", "PI_AAD", "CRIME_IDAM"]`, and the option set is hardcoded three more times
(`add-list-type/index.njk`, `edit-list-type/index.njk`, and the `checkedProvenance` objects in both
controllers, e.g. `edit-list-type/index.ts:47-51` and `:120-124`). Opening
`PHT_WEEKLY_HEARING_LIST` in `/edit-list-type` shows zero boxes ticked and silently discards
`MANUAL_UPLOAD` on submit — the admin cannot see what is stored, only that nothing is selected.

### 1.3 Strategy

1. **One shared option constant** in `libs/list-types/common` (not `system-admin-pages`), because the
   reference-data guard in §2.6 lives in that package and `system-admin-pages` already depends on
   `@hmcts/list-types-common` (verified in its `package.json`). This direction avoids a cycle.
2. **A dedicated one-question page** `/update-list-type-provenance` rather than routing admins through
   the existing four-step edit wizard. The AC is a bulk task across 77 list types; the wizard costs four
   page loads and re-submission of ten unrelated fields per row, each an opportunity to corrupt a
   different column.
3. **A targeted Prisma update** (`updateListTypeProvenance`) rather than reusing `saveListType`, which
   rewrites all eleven columns plus the sub-jurisdiction join rows.
4. **Make provenance visible** by adding a column to `/manage-list-types`, so the admin can audit all 77
   values at a glance and see which are unrecognised.
5. **Stop the deploy seed asserting ownership of this one column** on conflict, while keeping it in the
   `INSERT` so new environments still get a baseline.
6. **Correct the reference-data baseline** and add a build-failing guard so a publication provenance can
   never be reintroduced.

### 1.4 Architecture decision to accept explicitly

After §2.7, `allowed_provenance` can permanently diverge between an environment's database and
`list-type-data.ts`, with no reconciliation path back other than the dashboard. That is the direct cost
of the AC. The alternative — keep the seed authoritative, requiring a code change and deploy for every
provenance change — contradicts the AC and is not offered. The new provenance column on
`/manage-list-types` plus the audit log entry are what make the divergence visible and accountable.

### 1.5 TEMPLATE SOURCE

**n/a** — this is a System Admin form/table page, not a public list-type view. There is no
pip-frontend equivalent to migrate; the page is built from GOV.UK Frontend macros following the
conventions of its sibling pages under `apps/web/src/pages/(system-admin)/`.

---

## 2. Implementation Details

### 2.1 `libs/list-types/common/src/allowed-provenance.ts` (new)

Single source of truth for the option set. No user-facing strings here — labels live in page content.

```typescript
export const ALLOWED_PROVENANCE_OPTIONS = ["CFT_IDAM", "CRIME_IDAM", "PI_AAD"] as const;

export type AllowedProvenance = (typeof ALLOWED_PROVENANCE_OPTIONS)[number];

export function isAllowedProvenance(value: string): value is AllowedProvenance {
  return (ALLOWED_PROVENANCE_OPTIONS as readonly string[]).includes(value);
}

export function parseAllowedProvenance(stored: string | null | undefined): string[] {
  return (stored ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function canonicaliseAllowedProvenance(selected: string[]): string[] {
  return ALLOWED_PROVENANCE_OPTIONS.filter((option) => selected.includes(option));
}
```

`canonicaliseAllowedProvenance` de-duplicates and imposes a stable declared order in one step, so stored
values are comparable across list types and diffable in the audit log.

Exported from `libs/list-types/common/src/index.ts`.

**Column-width note to include as a comment in this file:** `allowed_provenance` is `VARCHAR(50)`. The
longest canonical value with the current three options is `CFT_IDAM,CRIME_IDAM,PI_AAD` — 26 chars. Adding
two more ~10-char options would exceed 50; widen the column first.

### 2.2 `libs/system-admin-pages/src/list-type/validation.ts` (modify)

- Delete the local `PROVENANCE_OPTIONS` (line 2) and import `ALLOWED_PROVENANCE_OPTIONS` /
  `isAllowedProvenance` from `@hmcts/list-types-common`.
- Add an exported `validateAllowedProvenanceSelection(selected: string[]): ValidationError[]`.
- Reimplement the existing private `validateProvenance` (line 66) as a call to it, so the add, edit and
  new update journeys report identical failures. Messages are lifted verbatim from the current code:
  `"Select at least one allowed provenance"` and `"Select valid provenance options"`, both anchored to
  `#allowedProvenance`. The empty case short-circuits — one error, not two.

Exported from `libs/system-admin-pages/src/index.ts`.

### 2.3 `libs/system-admin-pages/src/list-type/queries.ts` (modify)

```typescript
export async function updateListTypeProvenance(id: number, allowedProvenance: string[]) {
  return prisma.listType.update({
    where: { id },
    data: { allowedProvenance: canonicaliseAllowedProvenance(allowedProvenance).join(",") }
  });
}
```

Only `allowedProvenance` in `data` — no other column, and no touch of the sub-jurisdiction join rows.
`findAllListTypes` (line 3) and `findListTypeById` (line 35) already select `allowedProvenance`, so no
query change is needed for §2.4 or §2.5. Exported from the lib index.

### 2.4 `/manage-list-types` (modify)

**Files:** `apps/web/src/pages/(system-admin)/manage-list-types/{index.ts,index.njk,en.ts,cy.ts,index.test.ts,index.njk.test.ts}`

**Convention note:** this controller resolves language with `req.query.lng === "cy"` and **spreads**
the content object into the render (`...content`), so the template references bare keys
(`{{ heading }}`, `{{ configureLink }}`) — not `t.x`. Keep that. The spec comment on the issue used
`t.` prefixes for this page; that is wrong for this file.

Controller changes, per row:
- `provenanceLabels: string[]` — each parsed token mapped through `content.provenanceLabels`, falling
  back to `` `${token} ${content.unrecognisedSuffix}` `` for an unrecognised token so the admin sees the
  raw stored code.
- `hasUnrecognisedProvenance: boolean` — any token failing `isAllowedProvenance`.
- `provenanceUrl: '/update-list-type-provenance?id=' + listType.id`.
- Read `req.session.listTypeProvenanceUpdated`, build the finished banner string in the controller
  (`content.successBannerMessage(name)`), pass it as `updatedListTypeMessage`, then `delete` the session
  key so the banner shows once. Building the string in the controller keeps the template from calling
  content functions.

Template changes:
- Third `<th scope="col">` for provenance and a fourth for actions. The actions header gets real visible
  text (`{{ actionsColumnHeading }}`), replacing the current empty `<th>`.
- Provenance cell: `{{ listType.provenanceLabels | join(", ") or notSet }}` — plain comma-separated text
  in one cell, not a nested list.
- Actions cell keeps the "Manage" link and adds a "Change provenance" link, each with a visually hidden
  suffix naming the list type (WCAG 2.4.4 — 77 rows of identical link text otherwise).
- `govukNotificationBanner({ type: "success", ... })` as the first element in `page_content`, before the
  `<h1>`, rendered only when `updatedListTypeMessage` is set.

No pagination. 77 rows on one page is the point — the admin's task is to scan the whole set.

### 2.5 `/manage-list-type?id=N` (modify)

**Files:** `apps/web/src/pages/(system-admin)/manage-list-type/{index.ts,index.njk,en.ts,cy.ts}`

This page does use `t` (verified at `index.ts:9`). The detail view is a hand-built `govuk-table`, not a
`govukSummaryList`; converting it is out of scope.

- Controller resolves `provenanceText` from the same label map (labels come from this page's own content
  files, so no lib hardcodes English).
- Add a third cell to the **Allowed provenance** row only (currently `index.njk:44-47`) containing
  `Change<span class="govuk-visually-hidden"> {{ t.allowedProvenanceLabel }}</span>` linking to
  `/update-list-type-provenance?id={{ listType.id }}&amp;from=detail`.
- **Every other row must gain an empty third cell** — uneven row lengths are an axe violation.

### 2.6 `/update-list-type-provenance` (new page)

**Files:** `apps/web/src/pages/(system-admin)/update-list-type-provenance/{index.ts,index.njk,en.ts,cy.ts,index.test.ts,index.njk.test.ts}`

Auto-discovered; `(system-admin)` is a route group contributing no URL segment. Both handlers are
exported as `RequestHandler[]` whose first element is `requireRole([USER_ROLES.SYSTEM_ADMIN])`, matching
every sibling page.

**GET**
1. `const rawId = req.query.id as string; const id = Number.parseInt(rawId, 10);`
   → `400` + `res.render("errors/common", { status: 400 })` when missing or `NaN`
   (identical to `manage-list-type/index.ts:12-18`).
2. `findListTypeById(id)` → `404` + `errors/common` when not found.
3. `selected = parseAllowedProvenance(listType.allowedProvenance)`.
4. `unrecognisedValues = selected.filter((v) => !isAllowedProvenance(v))`.
5. `items` from `ALLOWED_PROVENANCE_OPTIONS`:
   `{ value, text: t.provenanceLabels[value], hint: { text: t.provenanceHints[value] }, checked: selected.includes(value) }`.
6. Render with `t`, `listTypeId`, `listTypeName` (friendly name falling back to `name`), `items`,
   `unrecognisedText` (pre-built string, or omitted), and `backHref`.

`backHref` = `/manage-list-type?id=N` when `req.query.from === "detail"`, else `/manage-list-types`. Both
destinations are hardcoded — `from` is never interpolated into a redirect, so there is no open-redirect
vector.

**No session state.** One field, read from and written to the database directly. Deliberately does not
touch `session.configureListType`, so a half-finished full edit cannot leak into a provenance-only change.

**POST**
1. Same id guards. A POST with a tampered id must not reach a write.
2. Re-read the list type — needed for the audit entry's previous value and the name on re-render.
3. Normalise the body exactly as `edit-list-type/index.ts:72-77` does (string when one box ticked, array
   when several, absent when none).
4. `validateAllowedProvenanceSelection(selected)`.
5. On error: re-render the same template with `errors` (field→`{text}` map) and `errorList`
   (`{text, href}[]`), `items` rebuilt from the **submitted** selection so input is preserved, and no
   write. `auditLogMiddleware` picks the render up as a `validation_error` automatically because the
   render options include `errors`.
6. On success: `updateListTypeProvenance(id, selected)`; set `req.auditMetadata` (§2.8); set
   `req.session.listTypeProvenanceUpdated`; `res.redirect(303, "/manage-list-types")`. 303 (as
   `configure-list-type-preview/index.ts` does) so a refresh cannot repeat the write.

**Template** — extends `layouts/base-template.njk`, `page_content` block, `govukBackLink`,
`govukErrorSummary`, `govukInsetText`, `govukCheckboxes` (h1 as the fieldset legend:
`isPageHeading: true`, `classes: "govuk-fieldset__legend--l"`, with the list type name as a
`govuk-caption-l` span *inside* the legend so it is announced with the question), `govukButton`, and a
Cancel link to `backHref`. `method="post"` `novalidate`.

**Session typing:** add `listTypeProvenanceUpdated?: string` to the session interface alongside the
existing `ListTypeSession` in `libs/system-admin-pages`. Namespaced distinctly from
`session.configureListType` so the two flows cannot interfere.

### 2.7 Reference data baseline and seed ownership

**`libs/list-types/common/src/list-type-data.ts`** — change `PHT_WEEKLY_HEARING_LIST.provenance` from
`"MANUAL_UPLOAD"` to `"CFT_IDAM"` (line 702). The other 76 values are carried forward unchanged; see
§7 blocking question.

**`apps/postgres/prisma/generate-seed-sql.ts:136`** — remove `allowed_provenance = EXCLUDED.allowed_provenance,`
from the `ON CONFLICT (name) DO UPDATE SET` clause. Keep `allowed_provenance` in the `INSERT` column list
and `VALUES`, so new rows get the baseline and existing rows keep whatever the dashboard last set. Add
a comment stating why this one column is insert-only, or the next person will "fix" the inconsistency:

```typescript
// allowed_provenance is intentionally omitted from the conflict update: it is
// operationally owned by the System Admin dashboard (issue #698). Every other
// column is reconciled from list-type-data.ts on each deploy.
```

**`libs/location/src/seed-list-types.ts:57`** — drop `allowedProvenance` from the `update` payload of
the local `upsert`; keep it in `create` (line 48). Otherwise `yarn db:seed` behaves differently from a
deploy.

Every other reconciled column (`friendly_name`, `welsh_friendly_name`, `shortened_friendly_name`, `url`,
`default_sensitivity`, `is_non_strategic`, `deleted_at`, `updated_at`) must keep being reconciled — §5.6
locks that down with a test.

**No Prisma migration.** The column already exists as a non-nullable `VARCHAR(50)`.

### 2.8 Audit logging

`auditLogMiddleware` only logs a redirect when the controller opts in
(`libs/system-admin-pages/src/audit-log/middleware.ts:72`), so the POST sets:

```typescript
req.auditMetadata = {
  shouldLog: true,
  action: "UPDATE_LIST_TYPE_PROVENANCE",
  entityInfo: `List type: ${listTypeName}; Previous provenance: ${previous || "none"}; New provenance: ${selected.join(",")}`
};
```

No change to the audit lib: `generateActionName` uses `auditMetadata.action` when present
(`middleware.ts:154`) and `extractEntityInfo` gives `entityInfo` top priority (`middleware.ts:238`).
The middleware is registered globally at `apps/web/src/app.ts:199`.

### 2.9 URLs

| Method | URL | Handler | Auth |
|---|---|---|---|
| GET | `/manage-list-types` | `(system-admin)/manage-list-types/index.ts` (modified) | `SYSTEM_ADMIN` |
| GET | `/manage-list-type?id=<id>` | `(system-admin)/manage-list-type/index.ts` (modified) | `SYSTEM_ADMIN` |
| GET | `/update-list-type-provenance?id=<id>[&from=detail]` | new | `SYSTEM_ADMIN` |
| POST | `/update-list-type-provenance?id=<id>[&from=detail]` | new, `POST` export | `SYSTEM_ADMIN` |

`id` stays a query parameter to match every sibling list-type page (`/manage-list-type?id=`,
`/edit-list-type?id=`, `/delete-list-type?id=`). No API route — nothing outside the web app sets
provenance.

### 2.10 Content

Co-located `en.ts` / `cy.ts` per page (CLAUDE.md default). Provenance **codes** are identifiers and are
not translated; their labels and hints are. Full key-by-key content is in §7 of the spec comment on the
issue (`ticket.md`); the shape is:

- `update-list-type-provenance`: `pageTitle`, `heading`, `hint`, `provenanceLabels{}`,
  `provenanceHints{}`, `unrecognisedValue(value)`, `saveButton`, `cancelLink`, `backLink`,
  `errorSummaryTitle`, `noSelectionError`, `invalidSelectionError`.
- `manage-list-types` additions: `provenanceColumnHeading`, `actionsColumnHeading`,
  `changeProvenanceLink`, `notSet`, `unrecognisedSuffix`, `successBannerTitle`,
  `successBannerMessage(name)`, `provenanceLabels{}`.
- `manage-list-type` additions: `changeLink`, `provenanceLabels{}`, `unrecognisedSuffix`. Reuse the
  existing `allowedProvenanceLabel` and `notSet` — do not add second copies.

`cy.ts` values that need translation use the `[WELSH TRANSLATION REQUIRED: '…']` convention already used
across these pages. **Also replace the existing placeholders on the provenance label/hint in
`manage-list-type/cy.ts:11` and `add-list-type/cy.ts` with real translations** — these pages are being
modified anyway and the placeholder is currently user-visible in Welsh.

Labels are duplicated across three page content files. That is the existing convention for admin pages
and is preferred over exporting display strings from a lib. If a fourth page needs them, promote to
`libs/system-admin-pages/src/locales/`.

---

## 3. Error Handling & Edge Cases

### 3.1 Validation

| Rule | Message | Anchor | Why |
|---|---|---|---|
| ≥1 checkbox ticked | "Select at least one allowed provenance" | `#allowedProvenance` | An empty allow-list is a silent access outage — no verified user can ever see a classified publication of this type |
| Every value in `ALLOWED_PROVENANCE_OPTIONS` | "Select valid provenance options" | `#allowedProvenance` | Only reachable by a tampered request |
| Duplicates | not an error | — | De-duplicated by `canonicaliseAllowedProvenance` before persisting |
| Order | not an error | — | Canonicalised to declared order so values are comparable and diffable |

Error summary title "There is a problem", rendered above the `<h1>`, linking to the first checkbox.
`<title>` prefixed with "Error: " when errors are present.

### 3.2 Page-level errors

| Condition | Response |
|---|---|
| `id` missing / non-numeric (GET **and** POST) | `400`, `errors/common` with `{ status: 400 }` |
| `id` matches no list type (GET **and** POST) | `404`, `errors/common` with `{ status: 404 }` |
| Not signed in / wrong role | `requireRole([USER_ROLES.SYSTEM_ADMIN])`, as siblings |
| Prisma update throws | Let it propagate to the app error handler (`500`). Do **not** swallow it into a re-render — a re-render would falsely suggest the change was rejected for a content reason |

### 3.3 Edge cases

- **Unrecognised stored value is not an error.** It renders as a `govukInsetText` block on the GET, before
  the fieldset in the DOM. The admin has done nothing wrong; the data is wrong and they are here to fix
  it. Rendering "There is a problem" before any submission would violate the GOV.UK validation pattern.
  Multiple unrecognised values are joined with ", " into a single block.
- **Empty stored value.** The column is `NOT NULL`, so this means the empty string, not null. Renders
  "Not set" in the table and pre-selects nothing on the form.
- **Checkbox body shapes.** One box → string; several → array; none → absent. All three normalised.
- **Refresh after save.** 303 + no session form state, so Back re-issues the GET and shows the freshly
  stored value pre-ticked. No stale-form or double-submit path.
- **Banner replay.** Session key deleted by the `/manage-list-types` GET after being read, so the banner
  appears exactly once.
- **`PHT_WEEKLY_HEARING_LIST` has `defaultSensitivity: null`,** and `canAccessPublication` defaults a
  falsy artefact sensitivity to `CLASSIFIED`. Fixing provenance alone does **not** make an
  explicitly-sensitivity-less PHT artefact visible. Out of scope — raised as a follow-up in §7.
- **`B2C_IDAM` / `PI_AAD` coupling.** Media accounts persist as `B2C_IDAM`
  (`libs/account/src/repository/service.ts`) but their session provenance is `PI_AAD`
  (`apps/web/src/pages/(auth)/login/return/index.ts`). If that login line is ever changed to emit
  `B2C_IDAM`, every list type allowing `PI_AAD` silently stops granting media access. Add a comment at
  that line pointing at this coupling.

---

## 4. Acceptance Criteria Mapping

| AC / Scenario (from the spec on the issue) | Satisfied by | Verified by |
|---|---|---|
| Provenance of every list type visible at a glance | §2.4 column | §5.1, §5.4 template test, E2E |
| Update provenance for one list type without touching other fields | §2.3 targeted update + §2.6 page | §5.2 asserts `data` contains only `allowedProvenance` |
| Existing provenance pre-selected on open | §2.6 GET step 5 | §5.3 GET tests |
| Unrecognised stored value surfaced, not silently dropped | §2.6 GET step 4 + inset text | §5.3, §5.5 both-ways assertion |
| At least one provenance must be selected | §2.2 validator | §5.1 unit, §5.3 POST test, E2E error state |
| Reference data baseline corrected for new environments | §2.7 `list-type-data.ts` | §5.6 build-failing guard test |
| Dashboard changes survive a deployment | §2.7 seed changes | §5.6 asserts `allowed_provenance` absent from the update clause **and** the other columns still present |
| The change is auditable | §2.8 `req.auditMetadata` | §5.3 asserts action + entityInfo; visible at `/audit-log-list` |
| Welsh throughout | §2.10 co-located `cy.ts` | Locale-key parity test; Welsh render tests; E2E `?lng=cy` |
| Non-admins refused (GET and POST) | `requireRole` on both | §5.3 asserts handler arrays are guard-first |
| WCAG 2.2 AA | §6 | Inline `axeCheck` in the E2E journey, clean + error states, en + cy |

---

## 5. Testing

### 5.1 `libs/system-admin-pages/src/list-type/validation.test.ts` (extend)
No errors for one valid value; no errors for all three. "At least one" error for `[]` and for
`undefined`. "Valid options" error for `MANUAL_UPLOAD`, for `SSO` (admin provenance rejected) and for
`B2C_IDAM` (persistence alias rejected in favour of `PI_AAD`). Exactly one error — not two — when empty.
Existing `validateListTypeDetails` provenance assertions still pass after the reimplementation.

### 5.2 `libs/list-types/common/src/allowed-provenance.test.ts` (new)
`parseAllowedProvenance`: splits on commas; trims whitespace; returns `[]` for `null`, `undefined`, `""`;
drops empty tokens from a trailing comma. `isAllowedProvenance`: accepts the three, rejects
`MANUAL_UPLOAD`, `SSO`, `B2C_IDAM` and lower-case variants. `canonicaliseAllowedProvenance`:
de-duplicates; reorders to declared order; drops unknown tokens.

### 5.3 `libs/system-admin-pages/src/list-type/queries.test.ts` (extend)
`updateListTypeProvenance` calls `prisma.listType.update` with the id in `where` and **only**
`allowedProvenance` in `data`; joins with commas and no spaces; canonical order regardless of submitted
order; de-duplicates.

### 5.4 `apps/web/src/pages/(system-admin)/update-list-type-provenance/index.test.ts` (new)
**GET:** pre-checks from a single stored value; pre-checks two from a comma-separated value; nothing
pre-checked plus an `unrecognisedValues` entry for `MANUAL_UPLOAD`; Welsh content for `?lng=cy`; `400`
when `id` absent; `400` when non-numeric; `404` when `findListTypeById` returns null; `backHref` is the
detail page for `from=detail` and the work list otherwise.
**POST:** persists a single selection, sets the session key, `303` to `/manage-list-types`; normalises a
string body into a one-element array; passes an array through; re-renders with an error summary and
**no** DB write when nothing selected; preserves the submitted selection on the error re-render;
`400`/`404` on a bad id **without** calling `updateListTypeProvenance`; sets `req.auditMetadata` with
`shouldLog: true`, `action: "UPDATE_LIST_TYPE_PROVENANCE"` and an `entityInfo` containing the list type
name and both old and new values. Both `GET` and `POST` are arrays whose first element is the
`requireRole` guard.

### 5.5 Template tests
`update-list-type-provenance/index.njk.test.ts` (new): h1 rendered as the fieldset legend; three
checkboxes with expected values and labels; checked/unchecked per selection; inset text present when
`unrecognisedText` is set and **absent** when not (assert both ways); error summary linking to
`#allowedProvenance` when `errorList` present, `assertNoErrors($)` when not; Welsh render; locale-key
parity `Object.keys(en).sort() === Object.keys(cy).sort()`; back and cancel links point at `backHref`.

`manage-list-types/index.njk.test.ts` (extend): four column headers; provenance cell as comma-separated
labels and "Not set" when empty; "not recognised" suffix only on flagged rows; each "Change provenance"
link carries a visually hidden suffix naming its list type; success banner only when
`updatedListTypeMessage` is set, positioned before the `<h1>`.

`manage-list-types/index.test.ts` (extend): rows expose `provenanceLabels` and `provenanceUrl`;
unrecognised rows flagged and keep the raw code; empty stored value yields an empty label array; reads
**and deletes** `session.listTypeProvenanceUpdated`; passes no banner when the key is absent.

### 5.6 `libs/list-types/common/src/list-type-data.test.ts` (new or extend)
Every entry's `provenance` splits into tokens that all satisfy `isAllowedProvenance` — the guard that
would have caught `MANUAL_UPLOAD`, failing the build rather than the runtime. Every entry has a
non-empty `provenance`. No `provenance` string exceeds 50 characters.

### 5.7 `apps/postgres/prisma/generate-seed-sql.test.ts` (extend)
The emitted `ON CONFLICT (name) DO UPDATE SET` clause for `list_types` does **not** contain
`allowed_provenance`, and the `INSERT` column list still does. The other reconciled columns
(`friendly_name`, `welsh_friendly_name`, `shortened_friendly_name`, `url`, `default_sensitivity`,
`is_non_strategic`, `deleted_at`) are still present in the update clause — so the fix does not silently
disable the rest of the reconciliation. Mirror the create/update split assertion for
`libs/location/src/seed-list-types.ts` in its own test.

### 5.8 E2E — `e2e-tests/tests/system-admin/manage-list-types.spec.ts` (extend)
One additional journey test (repo rule: one test per journey, validation + Welsh + accessibility inline):

**"admin can update the allowed provenance for a list type @nightly"** — SSO sign-in as system admin →
`/manage-list-types` → assert the Allowed provenance column shows a value for the seeded test list type
→ axe → follow "Change provenance" → assert the current value is pre-ticked → submit with nothing ticked
and assert the error summary → axe the error state → switch to Welsh, assert the Welsh heading and error,
switch back → tick two provenances → save → assert the redirect, the success banner naming the list type,
and the updated value in the row → axe the banner state → keyboard-only repeat of tick-and-submit.

**This file is currently `test.describe.skip` (`manage-list-types.spec.ts:5-6`).** A skipped test is not
coverage. Either resolve the skip as part of this ticket, or state in the PR why it stays skipped.

### 5.9 Manual verification on STG
Change a provenance through the dashboard → redeploy `apps/postgres` → confirm the dashboard value
survived and no other column drifted.

---

## 6. Accessibility

Target WCAG 2.2 AA; zero axe violations on all three pages in English and Welsh, clean and error states.

**`/update-list-type-provenance`:** `pageTitle` equals `heading`, with "Error: " prefixed to `<title>`
when errors are present. Single `<h1>`, which *is* the fieldset legend via `govukCheckboxes`
(`fieldset.legend.isPageHeading: true`, `govuk-fieldset__legend--l`) so the checkbox group is announced
as a group with the question as its label. The list type name is a `govuk-caption-l` span **inside** the
legend so a screen reader reads "Civil Daily Cause List — Which user provenances…" as one label instead
of leaving the context unread. Group hint and per-option hints are wired via `aria-describedby` by the
macro. Error message gets the visually hidden "Error:" prefix — colour is never the sole carrier. Error
summary is `role="alert"`, `tabindex="-1"`, focused on load, with real links. Native checkboxes and
submit button: Space toggles, Enter submits, Tab order legend → checkboxes → button → cancel. Default
GOV.UK 44×44px targets. Works with JavaScript off — validation is server-side; JS only moves focus.
Inset text sits before the fieldset in the DOM so it is encountered before the options.

**`/manage-list-types`:** keep the visually hidden `<caption>`. Every `<th scope="col">`, including a
real actions header with visible text (currently empty). Repeated "Manage" / "Change provenance" links
across 77 rows fail 2.4.4 without context, so each gets a visually hidden suffix naming the list type.
Multi-value provenance is plain comma-separated text in one cell. "not recognised" is real text, never
colour or an icon. `govukNotificationBanner` with `type: "success"` sets `role="alert"`; it precedes the
`<h1>` as its own region so heading order is undisturbed — confirm with the axe run. Reading order:
banner → h1 → "Add new list type" → table.

**`/manage-list-type`:** keep `<th scope="row">`. **Every row gains a third cell** so row lengths stay
uniform (uneven rows are an axe violation); only the provenance row's cell has content. The Change link
is self-describing: `Change<span class="govuk-visually-hidden"> Allowed provenance</span>`.

Plus a manual keyboard-only pass of the whole journey and a screen-reader spot check that the list type
name is announced with the question and the banner is announced on arrival.

---

## 7. CLARIFICATIONS NEEDED

### Blocking (data half of the AC only — the mechanism is not blocked)

1. **What is the correct allowed provenance for each of the 77 list types?** The ticket says provenance
   must be "added/updated" but supplies no target values. This plan delivers the mechanism, the
   build-failing guard, and a correction for the one demonstrably wrong entry
   (`PHT_WEEKLY_HEARING_LIST`: `MANUAL_UPLOAD` → `CFT_IDAM`). The other 76 are carried forward unchanged
   because there is nothing to change them to. **A signed-off list type → provenance mapping is needed
   before the data half of the AC can be called done.** The distribution in §1.1 is the current state,
   not a decision. §2.1–2.6, §2.8 and all of §5 can proceed now.

2. **Confirm `allowed_provenance` means user identity provenance, not publication source provenance.**
   This is inferred from its only consumer (`canAccessPublication`) and from the current data — and the
   `MANUAL_UPLOAD` entry shows the two have already been conflated once. If the business actually intends
   this column to record *which source systems may publish this list type*, this plan solves the wrong
   problem and the ticket needs re-scoping into a new column plus an enforcement point at ingestion.

3. **Confirm the team accepts the dashboard becoming the operational owner of this column**, with the
   permanent drift from `list-type-data.ts` that follows (§1.4). The alternative contradicts the AC.

### Non-blocking

4. Should provenance changes made through the existing `/edit-list-type` wizard also be audited as
   `UPDATE_LIST_TYPE_PROVENANCE`, rather than the generic path-derived action? Consistency argues yes;
   it would mean the preview POST diffing provenance before saving.
5. Is there already an `allowed_provenance` divergence on STG? Because the seed has been overwriting the
   column on every deploy, all environments *should* currently match `list-type-data.ts` — worth querying
   STG **before** the seed change lands so the starting point is known.
6. `PHT_WEEKLY_HEARING_LIST` has `defaultSensitivity: null`, and `canAccessPublication` defaults a falsy
   sensitivity to `CLASSIFIED`, so fixing provenance alone does not make it visible. Does PHT also need a
   default sensitivity, and are there other list types with `defaultSensitivity: null`? Suggest a
   follow-up ticket rather than widening this one.
7. Should provenance be exposed on any non-system-admin view? Assumed no — which identity providers can
   see a classified list is arguably not public information.

### Assumptions taken

- `SSO` and `B2C_IDAM` are correctly excluded from the option set (§1.1). Including either would create
  dead configuration that reads as if it grants access.
- 77 rows needs no pagination or filtering. A filter by provenance is the obvious next increment if the
  column turns the page into a tool admins use often; not built now.
- A dedicated one-question page is worth building rather than pointing "Change" at `/edit-list-type`.
  The cheaper option saves roughly one page's build but makes the bulk task ~3× longer and forces
  re-submission of ten unrelated fields per row.
- No Prisma migration needed — the column exists as a non-nullable `VARCHAR(50)` and the canonical value
  fits in 26 characters.
