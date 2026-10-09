# #1142: Increase character limit on Crown Daily Listing notes

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** None
**Created:** 2026-10-09T17:38:18Z
**Updated:** 2026-10-09T17:45:49Z

## Description

**PROBLEM STATEMENT**

We have received feedback from the Crown Daily list users that the current 100-character limit for Common Platform Public List Notes is too restrictive and often results in abbreviated or incomplete information being entered. This ticket is raised to increase the character limit.

 

**AS A** Service

**I WANT** to increase the character limit on the Common Platform Public Listing notes field

**SO THAT** it can accommodate more characters 

 

**ACCEPTANCE CRITERIA**

The character limit for the Common Platform Public Listing Notes is increased from 100 characters to 200 characters.

## Comments

### Comment by OgechiOkelu on 2026-10-09T17:39:17Z

@spec 

### Comment by hmctsclaudecode on 2026-10-09T17:45:27Z

# Technical Specification: Increase character limit on Crown Daily Listing notes

**Issue:** #1142
**List type:** `CROWN_DAILY_PDDA_LIST` (friendly name "Crown Daily List")
**Primary package:** `@hmcts/crown-daily-list` (`libs/list-types/crown-daily-list`)

## 1. User Story

**As a** publisher of Crown Daily Lists from Common Platform
**I want to** have the Public Listing Notes field accept up to 200 characters instead of 100
**So that** listing notes reach the public and the media in full, rather than being abbreviated or cut short at the point of entry

## 2. Background

Crown Daily list users have fed back that the 100-character limit on Common Platform Public List Notes forces them to abbreviate, producing incomplete information on the published list. The ask is to double the limit to 200 characters.

### Where the limit actually lives

**CaTH does not currently enforce any length limit on this field.** In `libs/list-types/crown-daily-list/src/schemas/crown-daily-list.json:242` the field is declared as:

```json
"ListNote": { "type": "string" },
```

There is no `maxLength`, no truncation in the renderer, and no truncation in either template. The 100-character limit is enforced **upstream in Common Platform**, at the point of data entry. This has two consequences for scoping:

1. The acceptance criterion cannot be satisfied by a CaTH change alone. Common Platform must relax its own entry-field limit to 200; until it does, CaTH will simply never receive a note longer than 100 characters. This spec covers the CaTH side only and the Common Platform change must be tracked separately.
2. The CaTH-side work is to make the 200-character contract **explicit and enforced**, so that the service has a defined upper bound it has been verified against, rather than an unbounded field that happens to receive short values today.

### How the field flows through CaTH

| Stage | Location |
|---|---|
| JSON schema | `libs/list-types/crown-daily-list/src/schemas/crown-daily-list.json:242` (`DailyList.CourtLists[].Sittings[].Hearings[].ListNote`) |
| TypeScript model | `libs/list-types/crown-daily-list/src/models/types.ts:34` (`ListNote?: string`) |
| Validator | `libs/list-types/crown-daily-list/src/validation/json-validator.ts` → `validateJson` (Ajv, `allErrors: true`) |
| Renderer | `libs/list-types/crown-daily-list/src/rendering/renderer.ts:125` maps `ListNote` → `listingNotes`; line 98 sets `hasListingNotes` |
| Web display | `apps/web/src/pages/(list-types)/crown-daily-cause-list/crown-daily-cause-list.njk:126,140` |
| PDF display | `libs/list-types/crown-daily-list/src/pdf/pdf-template.njk:104,118` |

Both ingest routes resolve to the same validator, so one schema change covers both:

- **Manual upload** — `libs/admin-pages/src/manual-upload/validation.ts:67` → `validateListTypeJson`
- **Blob ingestion (API)** — `libs/api/src/blob-ingestion/validation.ts:115` → `validateListTypeJson`

`validateListTypeJson` resolves `CROWN_DAILY_PDDA_LIST` → `crown-daily-pdda-list` → aliased to the `crown-daily-list` package (`libs/list-types/common/src/validation/list-type-validator.ts:26`).

### Not in scope

- No database change. `ListNote` is part of the artefact JSON payload held in blob storage; it is not a Postgres column, so there is no migration and no Prisma schema edit.
- Crown Firm List (`crown-firm-list.json:221,437`) and Crown Warned List (`crown-warned-list.json:199,460`) also declare an unconstrained `ListNote`. The ticket names Crown Daily only — see Open Questions.

## 3. Acceptance Criteria

* **Scenario:** A 200-character listing note is accepted on upload
    * **Given** a publisher uploads a Crown Daily List JSON file for list type "Crown Daily List"
    * **And** one hearing has a `ListNote` of exactly 200 characters
    * **When** the file is validated on submission
    * **Then** schema validation passes and the artefact is created

* **Scenario:** A listing note between 101 and 200 characters is accepted
    * **Given** a Crown Daily List JSON file with a `ListNote` of 150 characters
    * **When** the file is validated on submission
    * **Then** schema validation passes, confirming the previous 100-character ceiling no longer applies anywhere in CaTH

* **Scenario:** A listing note over 200 characters is rejected
    * **Given** a publisher uploads a Crown Daily List JSON file with a `ListNote` of 201 characters
    * **When** the file is validated on submission
    * **Then** validation fails
    * **And** the upload form re-renders with an error summary containing "There is a problem" and a file error explaining the JSON is invalid
    * **And** no artefact is created

* **Scenario:** A 200-character listing note renders in full on the web page
    * **Given** a published Crown Daily List artefact with a 200-character `ListNote`
    * **When** a user views `/crown-daily-cause-list?artefactId=<id>`
    * **Then** the Listing Notes column is present in that session's hearings table
    * **And** the cell contains the complete 200 characters with no ellipsis and no truncation
    * **And** the text wraps within the cell rather than forcing horizontal page overflow

* **Scenario:** A 200-character listing note renders in full in the generated PDF
    * **Given** a Crown Daily List artefact with a 200-character `ListNote`
    * **When** the PDF is generated during publication processing
    * **Then** the Listing Notes cell contains all 200 characters, wrapped across lines as needed
    * **And** the table remains within the page width

* **Scenario:** Welsh view is unaffected
    * **Given** a published Crown Daily List artefact with a 200-character `ListNote`
    * **When** a user views the page with `?lng=cy`
    * **Then** the column heading shows the Welsh "Nodiadau rhestru"
    * **And** the note content renders in full, unchanged (note content is court-supplied data and is not translated)

* **Scenario:** Blob ingestion applies the same limit
    * **Given** a Crown Daily List payload arrives via the blob ingestion API
    * **And** a `ListNote` is 201 characters
    * **When** `validateListTypeJson` runs during ingestion
    * **Then** the payload is rejected with a validation error and not published

* **Scenario:** Empty and absent listing notes still behave as before
    * **Given** a Crown Daily List artefact where no hearing has a `ListNote`
    * **When** a user views the page
    * **Then** the Listing Notes column is omitted from the table
    * **And** any reporting-restriction row spans 5 columns rather than 6

## 4. User Journey Flow

There are two actors and no new pages. The change alters what one existing field will accept and display.

### Journey A — Publisher (Common Platform / manual upload)

```
┌──────────────────────────┐
│ Common Platform          │
│ Listing officer enters   │
│ Public List Note         │
│ (limit raised to 200 —   │
│  upstream change)        │
└────────────┬─────────────┘
             │ nightly / on-demand JSON feed
             ▼
┌──────────────────────────┐        ┌───────────────────────────┐
│ CaTH ingest              │  fail  │ Rejected                  │
│ validateListTypeJson     ├───────▶│ • manual upload: error    │
│ → validateCrownDailyList │ >200   │   summary on form         │
│ (maxLength: 200)         │  chars │ • blob ingest: logged,    │
└────────────┬─────────────┘        │   not published           │
             │ pass                 └───────────────────────────┘
             ▼
┌──────────────────────────┐
│ Artefact created         │
│ PDF + Excel generated    │
│ Subscription emails sent │
└────────────┬─────────────┘
             ▼
     Published to public
```

### Journey B — Public / media user

```
Start: /list-option or search
  │
  ▼
Select court  ──▶  Select "Crown Daily List"
  │
  ▼
/crown-daily-cause-list?artefactId=<id>
  │
  ├─ Accordion per courtroom (expanded by default)
  │    └─ Hearings table per sitting
  │         └─ "Listing Notes" column — shown only when at least one
  │            hearing in that session has a note
  │            → now displays up to 200 characters, wrapped
  │
  ├─ Switch language (Cymraeg) ──▶ headings in Welsh, note data unchanged
  │
  └─ Download PDF ──▶ full 200-character note in the PDF table cell
```

No step is added or removed from either journey.

## 5. Low Fidelity Wireframe

### Hearings table — Listing Notes column with a 200-character note (desktop)

```
Crown Daily List for Crown Court at Leeds
List for 09 October 2026
Last updated 09 October 2026 at 9:00am

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ ▼ COURT 1: District Judge Smith                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ Sitting at 10:00am                                                                  │
│ ┌──────────┬───────────┬────────────┬──────────┬─────────────┬────────────────────┐ │
│ │ Hearing  │ Case      │ Defendant  │ Hearing  │ Prosecuting │ Listing Notes      │ │
│ │ Time  ▲▼ │ Reference │ Name(s) ▲▼ │ Type  ▲▼ │ Authority▲▼ │                 ▲▼ │ │
│ ├──────────┼───────────┼────────────┼──────────┼─────────────┼────────────────────┤ │
│ │ Not      │ C12345678 │ DOE, John  │ Trial    │ Crown       │ Custody time limit │ │
│ │ before   │           │            │          │ Prosecution │ expires 14 Nov     │ │
│ │ 10:30am  │           │            │          │ Service     │ 2026. Interpreter  │ │
│ │          │           │            │          │             │ (Romanian)         │ │
│ │          │           │            │          │             │ required for the   │ │
│ │          │           │            │          │             │ first defendant;   │ │
│ │          │           │            │          │             │ video link to HMP  │ │
│ │          │           │            │          │             │ Leeds arranged for │ │
│ │          │           │            │          │             │ the second.        │ │
│ ├──────────┴───────────┴────────────┴──────────┴─────────────┴────────────────────┤ │
│ │ Reporting Restriction: Section 45 order in force                                │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
                     ▲
                     └── 200 characters, wrapped. No ellipsis, no "show more" link,
                         no horizontal scroll introduced.
```

### Same table when no hearing in the session has a note (unchanged behaviour)

```
┌──────────┬───────────┬────────────┬──────────┬─────────────────────┐
│ Hearing  │ Case      │ Defendant  │ Hearing  │ Prosecuting         │
│ Time  ▲▼ │ Reference │ Name(s) ▲▼ │ Type  ▲▼ │ Authority        ▲▼ │
├──────────┼───────────┼────────────┼──────────┼─────────────────────┤
│ 10:00am  │ C12345678 │ DOE, John  │ Trial    │ Crown Prosecution   │
│          │           │            │          │ Service             │
├──────────┴───────────┴────────────┴──────────┴─────────────────────┤
│ Reporting Restriction: Section 45 order in force     (colspan = 5) │
└────────────────────────────────────────────────────────────────────┘
```

### Manual upload — validation failure on a note over 200 characters

```
┌─────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ There is a problem                                      │ │
│ │                                                         │ │
│ │ • Invalid JSON file format. must NOT have more than 200  │ │
│ │   characters                        ← links to #file    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Manual upload                                               │
│                                                             │
│ Upload file                                                 │
│ ┌─────────────────────────────────────────┐                 │
│ │ Choose file   │  crown-daily-list.json  │  ← error state  │
│ └─────────────────────────────────────────┘                 │
│                                                             │
│ [ Continue ]                                                │
└─────────────────────────────────────────────────────────────┘
```

## 6. Page Specifications

### 6.1 Schema change (the only mandatory code change)

`libs/list-types/crown-daily-list/src/schemas/crown-daily-list.json` — line 242, inside `DailyList.CourtLists[].Sittings[].Hearings[]`:

```json
"ListNote": { "type": "string", "maxLength": 200 },
```

Notes on this change:

- `maxLength` in JSON Schema counts **Unicode code points**, not UTF-16 units or bytes. A note containing characters outside the BMP (e.g. an emoji) counts as one code point per character in Ajv, whereas JavaScript `String.length` would count two. This only matters if the length is ever re-checked in TypeScript — it should not be. Enforce the limit in the schema and nowhere else.
- `ListNote` remains optional. Do not add it to any `required` array.
- Do not add a `minLength`. An empty-string note is currently valid and the renderer already treats `""` as "no note" via the falsy check at `renderer.ts:98`.
- The schema is imported statically (`import schema from "../schemas/crown-daily-list.json" with { type: "json" }`), so the change takes effect for both ingest routes with no registration work.

### 6.2 TypeScript model — no change

`libs/list-types/crown-daily-list/src/models/types.ts:34` declares `ListNote?: string`. A length constraint is not expressible in a way worth adding here (a 200-char branded type would add complexity for no gain, contrary to YAGNI). Leave as is.

### 6.3 Renderer — no change

`renderer.ts:125` is a pass-through (`listingNotes: hearing.ListNote || ""`). There is no truncation to remove. `hasListingNotes` at line 98 already uses a truthiness check across all hearings in the sitting, so column visibility is unaffected by note length.

### 6.4 Web page display — verify, change only if overflow is observed

`apps/web/src/pages/(list-types)/crown-daily-cause-list/crown-daily-cause-list.njk`

| Aspect | Current state | Action |
|---|---|---|
| Listing Notes cell | `<td class="govuk-table__cell">{{ case.listingNotes }}</td>` (line 140) | No change. Nunjucks auto-escapes, text wraps by default. |
| Column widths | No `govuk-!-width-*` classes, no `table-layout: fixed` | No change. The browser reflows columns to fit the longest content. |
| `no-wrap` class | Applied only to the Case Reference cell (line 138) | No change. Must **not** be applied to Listing Notes — it would force horizontal overflow. |
| `overflow-table` class | Present on the `<table>` (line 118) but **has no CSS definition anywhere in this repo** — it is inert, carried over from pip-frontend | Leave in place for consistency with sibling list types; do not rely on it to handle overflow. |
| Column count | 6 with notes, 5 without; reporting-restriction row `colspan` switches accordingly (line 145) | No change. |
| Sortable table | `data-module="moj-sortable-table"`, Listing Notes has `aria-sort="none"` | No change. Sorting a 200-character text column is of marginal use but is existing behaviour; removing it would be a regression in consistency. |

**Verification required:** render the page at 320px viewport width with a 200-character note and confirm the table does not force horizontal scrolling of the whole page. If it does, wrap the table in a scrollable container rather than truncating the note — truncation would defeat the purpose of the ticket.

### 6.5 PDF display — verify, change only if the table overruns the page

`libs/list-types/crown-daily-list/src/pdf/pdf-template.njk:118` — `<td>{{ case.listingNotes }}</td>`.

Shared styles in `libs/list-types/common/src/pdf/pdf-styles.ts` define `.no-wrap { white-space: nowrap; }` at line 64, applied only to the Case Reference column. The Listing Notes cell has no nowrap rule, so it wraps. No fixed table layout is set.

**Verification required:** generate a PDF with a 200-character note in a 6-column table and confirm the rightmost column is not clipped at the page margin. If it is, the fix is a width constraint plus `overflow-wrap: anywhere` on the notes column in `pdf-styles.ts` — not truncation of the data.

### 6.6 Email subscription summaries — no change

`libs/list-types/crown-daily-list/src/email-summary/summary-builder.ts` delegates to `extractPddaSittingsSummary`, which does not include `ListNote` in the case summary. Listing notes do not appear in subscription emails, so there is no email length or layout impact.

### 6.7 Excel export — not applicable

`CROWN_DAILY_PDDA_LIST` has `isNonStrategic: false` (`libs/list-types/common/src/list-type-data.ts:55-63`) and the package has no `conversion/` directory. There is no Excel converter and therefore no column-width work.

### 6.8 Reference data — no change

The `list_type` row for `CROWN_DAILY_PDDA_LIST` is unchanged. No edit to `list-type-data.ts`, no seed change, no migration.

## 7. Content

### 7.1 No new user-facing content is required

The listing note itself is court-supplied data passed through verbatim. It is never translated. The only label involved already exists in both locales:

| Key | English (`libs/list-types/crown-daily-list/src/locales/en.ts:20`) | Welsh (`libs/list-types/crown-daily-list/src/locales/cy.ts:20`) |
|---|---|---|
| `listingNotes` | `Listing Notes` | `Nodiadau rhestru` |

No locale key is added, removed or renamed, so the existing key-parity assertion (`Object.keys(en).sort()` equals `Object.keys(cy).sort()`) continues to hold without modification.

### 7.2 Optional content change — a field-specific upload error (recommended, see §10.3)

If the team accepts the recommendation to surface which field failed, one new string is needed in the manual-upload content files. Current content lives in `libs/admin-pages/src/manual-upload/`.

English:

> `Listing notes must be 200 characters or less`

Welsh:

> [WELSH TRANSLATION REQUIRED: "Listing notes must be 200 characters or less"]

If the team declines this enhancement, no content change is made at all and §7.1 is the whole of this section.

### 7.3 Content that must NOT be added

- No character-count hint or counter anywhere in CaTH. CaTH does not provide the data-entry interface for listing notes — Common Platform does. A hint here would describe a field the user cannot see.
- No "note truncated" or "show more" affordance. The requirement is that the full note is visible.

## 8. URL

No routing change. All affected URLs already exist.

| URL | Purpose | Change |
|---|---|---|
| `/crown-daily-cause-list?artefactId=<uuid>` | Public Crown Daily List view (`apps/web/src/pages/(list-types)/crown-daily-cause-list/index.ts`, auto-discovered; `urlPath: "crown-daily-cause-list"` in `list-type-data.ts`) | None — renders longer notes |
| `/manual-upload` (admin) | Publisher upload form; runs `validateManualUploadForm` → `validateListTypeJson` | None — enforces the new limit |
| Blob ingestion API route (`libs/api/src/blob-ingestion`) | Automated Common Platform ingest | None — enforces the new limit |

No redirect, no new route group, no change to the `(list-types)` grouping.

## 9. Validation

### 9.1 Rule

| Field | JSON path | Type | Required | Min | Max | Enforced by |
|---|---|---|---|---|---|---|
| Listing note | `DailyList.CourtLists[].Sittings[].Hearings[].ListNote` | string | No | — (empty string permitted) | **200 code points** (was: unbounded in CaTH, 100 upstream) | Ajv, via `crown-daily-list.json` |

### 9.2 Boundary behaviour

| Input | Result |
|---|---|
| Field absent | Valid. Renderer yields `""`; column hidden if no other hearing has a note. |
| `""` | Valid. Treated as "no note" by `hasListingNotes`. |
| 1–199 characters | Valid. |
| Exactly 200 characters | Valid. `maxLength` is inclusive. |
| 201 characters | **Invalid.** Ajv reports `must NOT have more than 200 characters` at `instancePath` `/DailyList/CourtLists/0/Sittings/0/Hearings/0/ListNote`. |
| Non-string (e.g. number, `null`) | Invalid — existing `"type": "string"` behaviour, unchanged. |
| 200 characters including leading/trailing whitespace | Valid. No trimming is performed anywhere in the pipeline; whitespace counts toward the limit. |

### 9.3 Validation layering

The limit is enforced in exactly one place — the JSON schema. Do not add a duplicate length check in the renderer, controller, or TypeScript model. A second check would be a second thing to update next time the limit moves, and the two would drift.

`validateJson` (`libs/publication/src/validation/json-validator.ts:28`) is configured with `allErrors: true`, so a file with several over-length notes reports all of them, not just the first. Note that the manual-upload form only renders `errors[0]` (see §10.2).

### 9.4 XSS / injection

`ListNote` has no `pattern` constraint stripping HTML — unlike the magistrates schemas, which use `^(?!(.|\r|\n)*<[^>]+>)(.|\r|\n)*$`. Output safety is handled at render time instead: both the web template and the PDF template interpolate with `{{ case.listingNotes }}`, which Nunjucks HTML-escapes. The `| safe` filter is **not** applied to this field and must not be. Doubling the field length does not change the risk profile; it does mean a slightly larger payload for an attacker to work with, which the escaping renders moot.

## 10. Error Messages

### 10.1 Over-length note via manual upload

The existing generic file-error path is reused. `libs/admin-pages/src/manual-upload/validation.ts:70-74` composes:

```
Invalid JSON file format. must NOT have more than 200 characters
```

shown in the GOV.UK error summary under the standard "There is a problem" title, with `href: "#file"` linking to the file input.

### 10.2 Known weakness in the existing message

This message is poor by GOV.UK standards and it is pre-existing, not introduced by this ticket:

- It names no field, so a publisher cannot tell *which* note is too long, or even that the problem is a listing note.
- It reads as a sentence fragment — the raw Ajv `message` is concatenated after a full stop, producing "format. must NOT".
- Only `errors[0]` is surfaced, so a file with five over-length notes reports one problem; the publisher fixes it, re-uploads, and hits the next one.

### 10.3 Recommended improvement (team decision)

`validateJson` returns raw Ajv `ErrorObject`s, which carry `instancePath` as well as `message`. The information needed for a usable message is already available and is being discarded. A targeted improvement in `validateJsonFileSchema`:

| Condition | Message |
|---|---|
| `keyword === "maxLength"` and `instancePath` ends in `/ListNote` | `Listing notes must be 200 characters or less` / [WELSH TRANSLATION REQUIRED: "Listing notes must be 200 characters or less"] |
| Other schema failure | Existing generic message, unchanged |

This is a small change confined to one function. It is called out separately because it is scope beyond the acceptance criterion and should be an explicit decision rather than smuggled in — see Open Questions.

### 10.4 Over-length note via blob ingestion

No user-facing message. `libs/api/src/blob-ingestion/validation.ts:115` records the validation failure through the existing ingestion error path; the artefact is not published. No change to this behaviour, and no new log field — note content must not be logged (it can contain special category data; see `SPECIAL_CATEGORY_DATA_WARNING` in `@hmcts/list-types-common`).

### 10.5 Messages explicitly not added

- No warning when a note is close to 200 characters. CaTH is not the data-entry point.
- No message on the public page when a note is long. It simply renders.

## 11. Navigation

No navigation or redirect logic changes.

| Flow | Behaviour | Change |
|---|---|---|
| Valid upload | POST `/manual-upload` → redirect to the existing upload-summary / confirmation step | None |
| Invalid upload (note > 200 chars) | POST re-renders the upload form with the error summary and preserved form data; no redirect | None — existing `validateManualUploadForm` behaviour |
| Public list view | Accordion sections expanded by default; "Back to top" link (`t.backToTop`) returns to the top of a long page | None |
| Language switch | `?lng=cy` / `?lng=en` re-renders the same artefact view in place | None |
| PDF download | Existing download link on the list view | None |

One point worth noting: longer notes make each hearings table taller, so pages will be longer overall. The existing "Back to top" link already covers this and no new in-page navigation is warranted.

## 12. Accessibility

WCAG 2.2 AA must continue to pass. Nothing in this change introduces a new interactive element, so the surface area is small — but three criteria are worth checking explicitly because they are the ones longer table cells can break.

| Criterion | Requirement | Assessment |
|---|---|---|
| **1.4.10 Reflow** (AA) | No horizontal scrolling at 320px width for vertically-scrolling content | **Must be verified.** A 6-column table with a 200-character cell is the realistic risk in this change. Text wrapping is on by default and no fixed widths are set, so the expectation is that it reflows. If the page scrolls horizontally, fix with a scroll container on the table — never by truncating. |
| **1.4.4 Resize text** (AA) | Usable at 200% zoom with no loss of content | **Must be verified** at 200% with a 200-character note. Content loss is the failure mode to look for, which is precisely why no truncation or clamping may be introduced. |
| **1.3.1 Info and relationships** (A) | Table structure conveyed programmatically | Already met and unchanged: `<th scope="col">` on every header including Listing Notes; cells remain in the same column order. |
| **1.4.3 Contrast** (AA) | 4.5:1 for body text | Unchanged — standard `govuk-table__cell` styling, no custom colour. |
| **2.1.1 Keyboard** (A) | All interactive elements reachable | Unchanged. The only interactive elements in the region are the accordion toggles and the sortable-table column buttons; no new ones added. |
| **4.1.2 Name, Role, Value** (A) | Sort state exposed | Unchanged — `aria-sort="none"` on the Listing Notes header, managed by `moj-sortable-table`. |

### Screen reader behaviour

A 200-character cell is read out in full by a screen reader, which is correct — it is the content the user came for. No `aria-label`, `title` attribute, or truncation-with-tooltip pattern should be introduced: a `title` tooltip would be inaccessible to touch and keyboard users and would duplicate the visible text for screen readers.

### Specific accessibility anti-patterns to avoid in this change

- ❌ CSS `text-overflow: ellipsis` or `-webkit-line-clamp` on the notes cell — hides content (fails 1.4.4) and defeats the ticket.
- ❌ A "show more" JavaScript toggle — makes core content JS-dependent, against the progressive-enhancement rule.
- ❌ `white-space: nowrap` on the notes cell — guarantees a 1.4.10 Reflow failure.
- ❌ Fixed pixel widths on table columns — breaks reflow and zoom.

### Testing

Run the existing Axe scan inline within the Crown Daily List E2E journey, against an artefact fixture whose note is 200 characters, at default zoom and at a 320px viewport. Do not add a standalone accessibility-only test (see §13).

## 13. Test Scenarios

### Schema validator — `libs/list-types/crown-daily-list/src/validation/json-validator.test.ts`

Extend the existing suite, which already runs the real schema against a fully-hydrated `VALID_DATA` fixture with no mocks. The fixture currently omits `ListNote`; add it to the existing hearing object so the boundary cases have something to mutate.

* A `ListNote` of exactly 200 characters is valid — the inclusive upper boundary.
* A `ListNote` of 199 characters is valid.
* A `ListNote` of 201 characters is invalid, and the reported error identifies the `ListNote` path.
* A `ListNote` of 150 characters is valid — proves the old 100-character ceiling is not enforced anywhere in CaTH.
* An omitted `ListNote` is valid — the field stays optional.
* An empty-string `ListNote` is valid.
* A non-string `ListNote` is invalid — guards the existing type constraint against regression.

Each case deep-clones the fixture with `JSON.parse(JSON.stringify(VALID_DATA))` so tests stay isolated.

### Renderer — `libs/list-types/crown-daily-list/src/rendering/renderer.ts`

Existing tests at `renderer.test.ts:501` and `:537` already cover `hasListingNotes` both ways. Add:

* A 200-character `ListNote` is mapped to `listingNotes` byte-for-byte, with no truncation or trimming — the pass-through contract made explicit, so a future "helpful" truncation cannot land silently.

### Web template — `apps/web/src/pages/(list-types)/crown-daily-cause-list/crown-daily-cause-list.njk.test.ts`

Structural assertions with Cheerio via `@hmcts/test-support`, using the file's existing layered fixture builders:

* The Listing Notes cell text equals the full 200-character note — asserted by text equality on the cell, not a substring of raw HTML.
* The Listing Notes cell does not carry the `no-wrap` class, while the Case Reference cell does — pins the wrapping behaviour the reflow criterion depends on.
* With a note present, the hearings table has 6 header cells and the reporting-restriction row has `colspan="6"`.
* With no note on any hearing in the session, the Listing Notes header is absent, there are 5 header cells, and the restriction row has `colspan="5"`.
* Rendering with the `cy` locale shows the Welsh "Nodiadau rhestru" heading and the note content unchanged.
* HTML-like content inside a long note is escaped, not rendered as markup.

### PDF generation — `libs/list-types/crown-daily-list/src/pdf/pdf-generator.test.ts`

* A 200-character note appears in full in the generated PDF output for the Crown Daily List.

### Manual upload validation — `libs/admin-pages/src/manual-upload/`

* A Crown Daily List JSON file whose note is 201 characters produces a file-scoped validation error with `href: "#file"`, and the upload is not accepted.
* A file whose note is exactly 200 characters produces no validation error.
* Only if §10.3 is accepted: the error text names the listing notes field and its 200-character limit rather than emitting the raw Ajv fragment.

### Blob ingestion — `libs/api/src/blob-ingestion/`

* A Crown Daily List payload with a 201-character note is rejected during ingestion and no artefact is published.

### E2E — `e2e-tests/`

Follow the minimum-test rule: **no new spec file and no new test**. Extend the existing Crown Daily List journey so its seeded artefact fixture carries a 200-character listing note, and assert within that single journey that the note renders in full, that the Welsh heading appears after switching language, and that the inline Axe scan reports no violations. Do not add separate tests for the character limit, for Welsh, or for accessibility.

### Manual verification (not automatable, must be done before sign-off)

* Public list view at 320px viewport width with a 200-character note: confirm the page does not scroll horizontally.
* Public list view at 200% browser zoom: confirm no content is clipped or lost.
* Generated PDF with a 200-character note in a 6-column table: confirm the Listing Notes column is not clipped at the right page margin.

## 14. Assumptions & Open Questions

### Assumptions

* **The 100-character limit is enforced by Common Platform, not CaTH.** Verified: `crown-daily-list.json:242` declares `ListNote` with no `maxLength`, and there is no truncation in the renderer or either template. CaTH would accept a 500-character note today.
* **A corresponding Common Platform change is required and is tracked elsewhere.** Without it the acceptance criterion is not met end to end, because CaTH will never receive a note over 100 characters. This spec delivers the CaTH half: an explicit, tested 200-character contract.
* **200 is a hard ceiling, not a soft target.** The schema rejects 201 rather than truncating. Rejecting a whole list file because one note is one character too long is a blunt outcome, but it is consistent with how every other constraint in these schemas behaves, and silent truncation of court information would be worse.
* **Listing note content is never translated.** It is court-supplied free text rendered verbatim in both locales. Only the column heading is translated, and that key already exists in both files.
* **No database or storage impact.** `ListNote` lives in the artefact JSON payload in blob storage, not a Postgres column. The extra 100 bytes per note is immaterial against the existing 2 MB upload ceiling (`MAX_FILE_SIZE` in `manual-upload/validation.ts:30`).
* **Listing notes do not appear in subscription emails**, so there is no email-formatting impact. Verified against `extractPddaSittingsSummary`.
* **`maxLength` counting is by Unicode code point.** Accepted deliberately; the limit is enforced only in the schema, so no JavaScript `.length` mismatch can arise.
* **The `overflow-table` class is inert.** It appears on the table element but has no CSS definition in this repository. Layout must not be assumed to depend on it.

### Open questions

1. **Does Common Platform's 200-character change have a ticket and a target release?** If CaTH ships first the change is invisible in production until the upstream limit moves. Confirm sequencing before the ticket is called done, and set QA expectations accordingly — QA will need a hand-crafted JSON fixture, since the real feed cannot yet produce a note over 100 characters.
2. **Should Crown Firm List and Crown Warned List get the same explicit 200-character limit?** Both declare an unconstrained `ListNote` (`crown-firm-list.json:221,437`; `crown-warned-list.json:199,460`) and both are fed by the same Common Platform PDDA pipeline. Applying the limit to all three is a three-line change and keeps the schemas consistent; applying it to Crown Daily alone leaves two sibling list types with an undocumented contract. Recommendation: do all three, in this ticket. Needs product confirmation as it is beyond the stated acceptance criterion.
3. **Accept the improved upload error message in §10.3?** The current message — "Invalid JSON file format. must NOT have more than 200 characters" — names no field and is a sentence fragment. The data needed to fix it (`instancePath`) is already returned and discarded. Small, contained, and will matter the moment a publisher hits the new limit. Recommendation: accept.
4. **Should the upload form report all over-length notes rather than only the first?** Ajv is already configured with `allErrors: true`, but the form surfaces `errors[0]` only, so correcting a file with several long notes takes several upload cycles. Fixing this touches shared upload validation used by every list type, so it is a larger change than this ticket warrants. Recommendation: raise as a separate ticket.
5. **Is 200 sufficient, or is this the second of several increases?** The original limit was 100 and users hit it. If listing officers routinely need more, a further ticket follows. Worth asking the Crown Daily user group what length actually accommodates their notes before settling on 200.
6. **Is there any downstream consumer of the published JSON with its own 100-character expectation?** CaTH publishes artefact payloads that third parties (including media subscribers) may parse. If any consumer validates against an older copy of this schema, a 150-character note will fail for them. Confirm with the team whether the published schema is versioned or distributed externally — the schema version string passed to `validateJson` is currently the literal `"1.0"` and is not bumped by this change.


### Comment by OgechiOkelu on 2026-10-09T17:45:49Z

@plan 
