# Technical Plan — #1142: Increase character limit on Crown Daily Listing notes

**List type:** `CROWN_DAILY_PDDA_LIST` (friendly name "Crown Daily List")
**Primary package:** `@hmcts/crown-daily-list` (`libs/list-types/crown-daily-list`)
**Acceptance criterion:** the character limit for Common Platform Public Listing Notes is increased from 100 to 200.

---

## 1. Technical Approach

### The headline finding: CaTH does not enforce a 100-character limit today

`libs/list-types/crown-daily-list/src/schemas/crown-daily-list.json:242` declares the field as:

```json
"ListNote": { "type": "string" },
```

No `maxLength`. There is no truncation in the renderer (`rendering/renderer.ts:125` is a straight
pass-through), none in the web template, and none in the PDF template. **CaTH would accept and render
a 500-character listing note today.**

The 100-character limit is enforced **upstream, in Common Platform**, at the point of data entry.
Two consequences for scope:

1. **The acceptance criterion cannot be met by a CaTH change alone.** Common Platform must relax its
   own entry-field limit to 200. Until it does, CaTH will never *receive* a note longer than 100
   characters, so this ticket will be invisible in production. The Common Platform change must be
   tracked separately — see Open Questions Q1.
2. **The CaTH-side work is to make the 200-character contract explicit and tested**, replacing an
   unbounded field that happens to receive short values with a defined, verified upper bound.

That is the whole strategy: one schema line, plus tests that pin the boundary and prove nothing
downstream truncates or breaks layout at 200 characters.

### Architecture decisions

| Decision | Rationale |
|---|---|
| **Enforce the limit in the JSON schema only** | One place to change next time the limit moves. A duplicate check in the renderer, controller or TypeScript model would drift. DRY. |
| **Hard reject at 201, do not truncate** | Consistent with every other constraint in these schemas. Silently truncating court information is worse than rejecting the file. |
| **`maxLength: 200`, no `minLength`** | Empty string is currently valid and `renderer.ts:98` already treats `""` as "no note" via a truthiness check. Adding `minLength` would be a behaviour regression. |
| **`ListNote` stays optional** | Do not add it to any `required` array. |
| **No TypeScript model change** | `models/types.ts:34` declares `ListNote?: string`. A 200-char branded type is complexity for no gain (YAGNI). |
| **No new E2E spec** | See §5. |

`maxLength` in JSON Schema counts **Unicode code points**, not UTF-16 units or bytes. A character
outside the BMP counts as 1 in Ajv but 2 in JavaScript `String.length`. This only matters if the
length is ever re-checked in TypeScript — which is exactly why it must not be.

### Precedent

`maxLength` is already used in this very schema — `$defs/PersonalDetails` constrains
`CitizenNameSurname` to `maxLength: 35`, `CitizenNameRequestedName` to `70`, and so on. Adding
`maxLength` to `ListNote` is idiomatic for this file, not a new pattern.

### How the field flows through CaTH (verified against the codebase)

| Stage | Location |
|---|---|
| JSON schema | `libs/list-types/crown-daily-list/src/schemas/crown-daily-list.json:242` (`DailyList.CourtLists[].Sittings[].Hearings[].ListNote`) |
| TypeScript model | `libs/list-types/crown-daily-list/src/models/types.ts:34` (`ListNote?: string`) |
| Validator | `libs/list-types/crown-daily-list/src/validation/json-validator.ts` → `validateJson` (Ajv, `allErrors: true`, `libs/publication/src/validation/json-validator.ts:28`) |
| Renderer | `rendering/renderer.ts:98` sets `hasListingNotes`; `:125` maps `ListNote` → `listingNotes` |
| Web display | `apps/web/src/pages/(list-types)/crown-daily-cause-list/crown-daily-cause-list.njk:126,140` |
| PDF display | `libs/list-types/crown-daily-list/src/pdf/pdf-template.njk:104,118` |

Both ingest routes resolve to the same validator, so **one schema change covers both**:

- **Manual upload** — `libs/admin-pages/src/manual-upload/validation.ts:67` → `validateListTypeJson`
- **Blob ingestion (API)** — `libs/api/src/blob-ingestion/validation.ts:115` → `validateListTypeJson`

`validateListTypeJson` resolves `CROWN_DAILY_PDDA_LIST` → `crown-daily-pdda-list` → aliased to the
`crown-daily-list` package via `PACKAGE_ALIASES` in
`libs/list-types/common/src/validation/list-type-validator.ts:26`. The schema is imported statically
(`import schema from "../schemas/crown-daily-list.json" with { type: "json" }`), so the change takes
effect for both routes with no registration work.

### Explicitly out of scope

- **No database change.** `ListNote` lives in the artefact JSON payload in blob storage, not a
  Postgres column. No migration, no Prisma edit, no `list-type-data.ts` change — the
  `CROWN_DAILY_PDDA_LIST` row (`libs/list-types/common/src/list-type-data.ts:55-63`) is untouched.
- **No Excel converter work.** `CROWN_DAILY_PDDA_LIST` has `isNonStrategic: false` and the package
  has no `conversion/` directory. There is no converter.
- **No subscription email work.** `src/email-summary/summary-builder.ts` delegates to
  `extractPddaSittingsSummary`, which does not include `ListNote`. Listing notes never appear in
  subscription emails.
- **No locale change.** `listingNotes` already exists in both locales
  (`locales/en.ts:20` = "Listing Notes", `locales/cy.ts:20` = "Nodiadau rhestru"). The note content
  itself is court-supplied data, rendered verbatim, never translated. Existing key-parity assertions
  continue to hold.

---

## 2. Implementation Details

**TEMPLATE SOURCE: n/a** — no new page or list-type view. This change modifies one schema constraint
on an existing, already-migrated list type.

### 2.1 Schema change — the only mandatory code change

`libs/list-types/crown-daily-list/src/schemas/crown-daily-list.json`, line 242:

```diff
- "ListNote": { "type": "string" },
+ "ListNote": { "type": "string", "maxLength": 200 },
```

### 2.2 Renderer — no change

`renderer.ts:125` is `listingNotes: hearing.ListNote || ""`. Nothing to remove. `hasListingNotes`
(`:98`) is a truthiness check across all hearings in the sitting, so column visibility is
independent of note length.

### 2.3 Web template — verify, change only if overflow is observed

`apps/web/src/pages/(list-types)/crown-daily-cause-list/crown-daily-cause-list.njk`

| Aspect | Current state | Action |
|---|---|---|
| Notes cell | `<td class="govuk-table__cell">{{ case.listingNotes }}</td>` (`:140`) | No change. Nunjucks auto-escapes; text wraps by default. |
| Column widths | No `govuk-!-width-*`, no `table-layout: fixed` | No change. Browser reflows to fit. |
| `no-wrap` class | Applied only to the Case Reference cell (`:138`) | No change. Must **not** be added to the notes cell — it would guarantee horizontal overflow. |
| `overflow-table` class | On the `<table>` (`:118`) but **has no CSS definition anywhere in this repo** — inert, carried over from pip-frontend | Leave in place for sibling consistency; do not rely on it. |
| Column count | 6 with notes, 5 without; restriction-row `colspan` switches (`:145`) | No change. |
| Sortable table | `data-module="moj-sortable-table"`, notes header `aria-sort="none"` | No change. Sorting a long text column is of marginal value but is existing behaviour. |

### 2.4 PDF template — verify, change only if the table overruns

`libs/list-types/crown-daily-list/src/pdf/pdf-template.njk:118` — `<td>{{ case.listingNotes }}</td>`.
`libs/list-types/common/src/pdf/pdf-styles.ts:64` defines `.no-wrap { white-space: nowrap; }`,
applied only to the Case Reference column. The notes cell wraps. No fixed table layout is set.

If the rightmost column clips at the page margin, the fix is a width constraint plus
`overflow-wrap: anywhere` on the notes column in `pdf-styles.ts` — **never** truncation of the data.

### 2.5 No API endpoint, no database schema change

Neither is required. All affected URLs already exist and are unchanged:

| URL | Change |
|---|---|
| `/crown-daily-cause-list?artefactId=<uuid>` | None — renders longer notes |
| `/manual-upload` (admin) | None — enforces the new limit via the shared validator |
| Blob ingestion API route | None — enforces the new limit via the shared validator |

---

## 3. Error Handling & Edge Cases

### 3.1 Validation rule

| Field | JSON path | Type | Required | Min | Max |
|---|---|---|---|---|---|
| Listing note | `DailyList.CourtLists[].Sittings[].Hearings[].ListNote` | string | No | — (empty string permitted) | **200 code points** |

### 3.2 Boundary behaviour

| Input | Result |
|---|---|
| Field absent | Valid. Renderer yields `""`; column hidden if no other hearing in the sitting has a note. |
| `""` | Valid. Treated as "no note" by `hasListingNotes`. |
| 1–199 characters | Valid. |
| Exactly 200 | Valid — `maxLength` is inclusive. |
| 201 | **Invalid.** Ajv reports `must NOT have more than 200 characters` at `instancePath` `/DailyList/CourtLists/0/Sittings/0/Hearings/0/ListNote`. |
| Non-string (number, `null`) | Invalid — existing `"type": "string"` behaviour, unchanged. |
| 200 chars including leading/trailing whitespace | Valid. Nothing in the pipeline trims; whitespace counts toward the limit. |

### 3.3 Over-length note via manual upload

The existing generic file-error path is reused. `libs/admin-pages/src/manual-upload/validation.ts:70-74`
composes:

```
Invalid JSON file format. must NOT have more than 200 characters
```

shown in the GOV.UK error summary under "There is a problem", with `href: "#file"`.

**Known pre-existing weaknesses** (not introduced by this ticket):

- The message names no field, so a publisher cannot tell *which* note is too long — or even that the
  problem is a listing note at all.
- It reads as a sentence fragment: the raw Ajv `message` is concatenated after a full stop, giving
  "format. must NOT".
- Only `errors[0]` is surfaced. Ajv already runs with `allErrors: true`, so a file with five
  over-length notes reports one problem; the publisher fixes it, re-uploads, and hits the next.

The data needed to fix the first two (`instancePath` on the Ajv `ErrorObject`) is already returned
and discarded. A contained improvement in `validateJsonFileSchema` would map
`keyword === "maxLength"` + `instancePath` ending `/ListNote` to
`Listing notes must be 200 characters or less` (Welsh translation required), leaving every other
schema failure on the existing generic message. This is **beyond the stated acceptance criterion** —
see Open Questions Q3, and the corresponding optional task in `tasks.md`.

The third weakness touches shared upload validation used by every list type, so it is a larger
change than this ticket warrants — Q4 recommends a separate ticket.

### 3.4 Over-length note via blob ingestion

No user-facing message. `libs/api/src/blob-ingestion/validation.ts:115` records the failure through
the existing ingestion error path and the artefact is not published. No behaviour change and
**no new log field** — note content must not be logged, as it can contain special category data (see
`SPECIAL_CATEGORY_DATA_WARNING` in `@hmcts/list-types-common`).

### 3.5 XSS / injection

`ListNote` has no `pattern` constraint stripping HTML — unlike the magistrates schemas, which use
`^(?!(.|\r|\n)*<[^>]+>)(.|\r|\n)*$`. Output safety is handled at render time: both templates
interpolate with `{{ case.listingNotes }}`, which Nunjucks HTML-escapes. The `| safe` filter is
**not** applied to this field and must not be. Doubling the length does not change the risk profile.

### 3.6 Accessibility edge cases (WCAG 2.2 AA)

| Criterion | Assessment |
|---|---|
| **1.4.10 Reflow** (AA) | **Must be verified.** A 6-column table with a 200-character cell is the realistic risk here. Wrapping is on by default and no fixed widths are set, so it should reflow — but confirm at 320px. If the page scrolls horizontally, fix with a scroll container on the table, never by truncating. |
| **1.4.4 Resize text** (AA) | **Must be verified** at 200% zoom with a 200-char note. Content loss is the failure mode — which is why no clamping may be introduced. |
| **1.3.1 Info and relationships** (A) | Already met, unchanged: `<th scope="col">` on every header; column order preserved. |
| **1.4.3 Contrast** (AA) | Unchanged — standard `govuk-table__cell`, no custom colour. |
| **2.1.1 Keyboard** (A) | Unchanged — no new interactive elements. |
| **4.1.2 Name, Role, Value** (A) | Unchanged — `aria-sort="none"`, managed by `moj-sortable-table`. |

A 200-character cell is read out in full by a screen reader, which is correct — it is the content the
user came for. No `aria-label`, `title` tooltip, or truncation-with-tooltip pattern.

**Anti-patterns that must not be introduced:**

- ❌ `text-overflow: ellipsis` / `-webkit-line-clamp` on the notes cell — hides content (fails 1.4.4)
  and defeats the ticket.
- ❌ A "show more" JavaScript toggle — makes core content JS-dependent.
- ❌ `white-space: nowrap` on the notes cell — guarantees a 1.4.10 failure.
- ❌ Fixed pixel column widths — breaks reflow and zoom.
- ❌ A character-count hint or counter anywhere in CaTH — CaTH is not the data-entry point for
  listing notes; a hint here would describe a field the user cannot see.

---

## 4. Acceptance Criteria Mapping

| # | Criterion | How it is satisfied | Verification |
|---|---|---|---|
| 1 | A 200-character note is accepted on upload | `maxLength: 200` is inclusive | `json-validator.test.ts` — exactly 200 is valid |
| 2 | A note between 101 and 200 is accepted | No 100-char ceiling exists anywhere in CaTH | `json-validator.test.ts` — 150 chars is valid |
| 3 | A note over 200 is rejected | Ajv `maxLength` failure | `json-validator.test.ts` — 201 invalid, error path identifies `ListNote`; manual-upload test asserts file-scoped error with `href: "#file"` and no artefact created |
| 4 | A 200-char note renders in full on the web page | Pass-through renderer + unescaped-but-HTML-escaped interpolation, no truncation | `crown-daily-cause-list.njk.test.ts` — cell text equals the full 200 chars; notes cell carries no `no-wrap`; 6 headers and `colspan="6"` |
| 5 | A 200-char note renders in full in the PDF | No nowrap rule on the notes cell | `pdf-generator.test.ts` — full note present in output; manual check that the column is not clipped |
| 6 | Welsh view unaffected | `listingNotes` key exists in both locales; content never translated | `njk.test.ts` — render with `cy`, assert "Nodiadau rhestru" heading and unchanged note content |
| 7 | Blob ingestion applies the same limit | Same `validateListTypeJson` entry point | `libs/api/src/blob-ingestion/` test — 201-char note rejected, nothing published |
| 8 | Empty / absent notes behave as before | `hasListingNotes` truthiness check unchanged; no `minLength` added | `json-validator.test.ts` (absent + `""` valid); `njk.test.ts` (header absent, 5 headers, `colspan="5"`) |

**AC traceability caveat:** criteria 1–3 and 7 are fully deliverable in CaTH. The *user-visible*
outcome of the ticket — a listing officer actually typing more than 100 characters — depends on the
Common Platform change (Q1). This plan delivers and tests the CaTH half.

---

## 5. Testing Approach

### Schema validator — `libs/list-types/crown-daily-list/src/validation/json-validator.test.ts`

Extend the existing suite (370 lines), which already runs the real schema against a fully-hydrated
`VALID_DATA` fixture with no mocks. The fixture currently omits `ListNote`; add it to the existing
hearing object so boundary cases have something to mutate. Deep-clone with
`JSON.parse(JSON.stringify(VALID_DATA))` in every test.

- exactly 200 characters → valid (inclusive upper boundary)
- 199 → valid
- 201 → invalid, and the reported error path identifies `ListNote`
- 150 → valid (proves the old 100-char ceiling is not enforced anywhere in CaTH)
- omitted → valid (field stays optional)
- `""` → valid
- non-string → invalid (guards the existing type constraint against regression)

### Renderer — `libs/list-types/crown-daily-list/src/rendering/renderer.test.ts`

Existing tests at `:501` and `:537` already cover `hasListingNotes` both ways. Add one:

- a 200-character `ListNote` maps to `listingNotes` byte-for-byte, with no truncation or trimming —
  making the pass-through contract explicit so a future "helpful" truncation cannot land silently.

### Web template — `apps/web/src/pages/(list-types)/crown-daily-cause-list/crown-daily-cause-list.njk.test.ts`

Structural Cheerio assertions via `@hmcts/test-support`, reusing the file's existing layered fixture
builders (`buildCase`, `buildSession`, `buildCourtHouse`, `renderList`) and the `COLUMN` index
constants already defined at `:96`:

- the notes cell text equals the full 200-character note (text equality on the cell, not a substring
  of raw HTML)
- the notes cell does **not** carry `no-wrap` while the Case Reference cell does — pins the wrapping
  behaviour that reflow depends on
- with a note present: 6 header cells and restriction row `colspan="6"`
- with no note on any hearing in the session: notes header absent, 5 header cells, `colspan="5"`
- rendered with the `cy` locale: "Nodiadau rhestru" heading, note content unchanged
- HTML-like content inside a long note is escaped, not rendered as markup

### PDF — `libs/list-types/crown-daily-list/src/pdf/pdf-generator.test.ts`

- a 200-character note appears in full in the generated output

### Manual upload — `libs/admin-pages/src/manual-upload/`

- a Crown Daily List file with a 201-character note produces a file-scoped error with `href: "#file"`
  and is not accepted
- a file with exactly 200 characters produces no validation error
- *only if Q3 is accepted:* the error text names the listing notes field and its limit rather than
  emitting the raw Ajv fragment

### Blob ingestion — `libs/api/src/blob-ingestion/`

- a Crown Daily List payload with a 201-character note is rejected during ingestion and no artefact
  is published

### E2E — no new spec, no new test

**Correction to the `@spec` comment on the issue:** it says to "extend the existing Crown Daily List
journey". **There is no Crown Daily List E2E spec.** `e2e-tests/tests/` contains no `crown-*.spec.ts`
file. Per the CLAUDE.md minimum-test rule, a schema-constraint change does not justify standing up a
new end-to-end journey — the behaviour is fully covered by the validator, renderer, template and
PDF tests above, and the layout risk is covered by the manual checks below. **Do not add an E2E spec
for this ticket.** If the team wants a Crown Daily List journey, that is its own piece of work.

### Manual verification (not automatable — required before sign-off)

- public list view at **320px** viewport with a 200-char note: the page does not scroll horizontally
- public list view at **200%** browser zoom: no content clipped or lost
- generated PDF with a 200-char note in a 6-column table: the Listing Notes column is not clipped at
  the right page margin
- Axe scan on the rendered page with a 200-char note: no violations

QA will need a **hand-crafted JSON fixture** — the real Common Platform feed cannot yet produce a
note over 100 characters.

---

## 6. CLARIFICATIONS NEEDED

1. **Does the Common Platform 200-character change have a ticket and a target release?**
   This is the blocking question for whether the ticket delivers anything user-visible. CaTH can ship
   first, but the change stays invisible in production until Common Platform relaxes its own
   entry-field limit. Confirm sequencing before this is called done, and set QA expectations
   accordingly.

2. **Should Crown Firm List and Crown Warned List get the same explicit 200-character limit?**
   Both declare an unconstrained `ListNote` and both are fed by the same Common Platform PDDA
   pipeline:
   - `libs/list-types/crown-firm-list/src/schemas/crown-firm-list.json:221` and `:437`
   - `libs/list-types/crown-warned-list/src/schemas/crown-warned-list.json:199` and `:460`

   Applying the limit to all three is a four-line change and keeps the sibling schemas consistent.
   Applying it to Crown Daily alone leaves two list types with an undocumented contract.
   **Recommendation: do all three in this ticket.** Needs product confirmation, as it is beyond the
   stated acceptance criterion.

3. **Accept the improved upload error message (§3.3)?**
   Current text — "Invalid JSON file format. must NOT have more than 200 characters" — names no field
   and is a sentence fragment. The `instancePath` needed to fix it is already returned and thrown
   away. Small, contained, and it will matter the moment a publisher hits the new limit.
   **Recommendation: accept.** Requires one new English string and a Welsh translation.

4. **Should the upload form report all over-length notes rather than only the first?**
   Ajv already runs `allErrors: true`, but the form surfaces `errors[0]` only, so correcting a file
   with several long notes takes several upload cycles. Fixing this touches shared upload validation
   used by every list type. **Recommendation: separate ticket.**

5. **Is 200 sufficient, or is this the second of several increases?**
   The original limit was 100 and users hit it. Worth asking the Crown Daily user group what length
   actually accommodates their notes before settling on 200 — otherwise this ticket recurs.

6. **Is there any downstream consumer of the published JSON with its own 100-character expectation?**
   CaTH publishes artefact payloads that third parties (including media subscribers) may parse. If
   any consumer validates against an older copy of this schema, a 150-character note will fail for
   them. The schema version string passed to `validateJson` is currently the literal `"1.0"` and is
   **not** bumped by this change — confirm whether the published schema is versioned or distributed
   externally, and whether it should be.
