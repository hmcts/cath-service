# Plan: #792 Mental Health Tribunal Daily Hearing List (flat-file list type)

## 1. Technical Approach

This ticket registers `MENTAL_HEALTH_TRIBUNAL_HEARING_LIST` as a **flat-file, strategic
(`isNonStrategic: false`), manually-uploaded** list type. It is a near-exact mirror of the
PCOL Daily Cause List work done for #438 (commit `706b4894`, `feat(#438): register PCOL
Daily Cause List flat-file list type`).

IMPORTANT BASELINE NOTE: the #438 PCOL commit `706b4894` is **not an ancestor of `master`**
(verified with `git merge-base --is-ancestor`). Its changes to `list-type-data.ts` and the
seed SQL are **not present** in the current tree. Therefore this plan follows the same
*pattern* as PCOL but writes against the **current master** files. The most recent list type
actually merged to master is `PHT_WEEKLY_HEARING_LIST` (commit `ed63e448`), which is the
live reference for how a manual-upload list is wired today.

Because this is a flat-file list, there is (like PCOL/PHT-as-flat-file):
- **No JSON schema** (`libs/list-types/<name>/src/schemas/*.json`) — so the CLAUDE.md
  "every schema needs a validator + guard test" rule does **not** apply.
- **No Excel converter** registration.
- **No bespoke renderer / PDF generator / list page** under `apps/web/src/pages/(list-types)/`.
  Flat files are served directly via `/hearing-lists/{locationId}/{artefactId}` (see the
  `publication.isFlatFile` branch in `summary-of-publications/index.njk` lines 34-38).
- **No new page controllers** — the manual upload form auto-discovers the list type from the
  DB (see below).

### How a list type flows into the product

1. **Catalogue entry** — `libs/list-types/common/src/list-type-data.ts` holds the canonical
   `listTypeData[]` array (the `ListTypeData` interface, lines 1-11). Every list type is an
   object with `name`, `englishFriendlyName`, `welshFriendlyName`, `provenance`,
   `isNonStrategic`, `defaultSensitivity`, optional `shortenedFriendlyName`, optional
   `urlPath`, and `subJurisdictionIds`.

2. **Seeding (non-prod)** — `libs/location/src/seed-list-types.ts` iterates `listTypeData`
   and upserts each into the `list_types` table plus the `list_types_sub_jurisdictions`
   junction (keyed on `listType.subJurisdictionIds`). This runs on STG/local but is skipped
   when `ENVIRONMENT === "prod"` (lines 10-13) or `CI === "true"`.

3. **Seeding (prod / idempotent SQL)** — `apps/postgres/prisma/scripts/`:
   - `001_insert_missing_list_types.sql` — one `VALUES` row per list type inserted into
     `list_types`.
   - `003_upsert_sub_jurisdictions_and_list_type_links.sql` — Step 1 upserts the 30
     sub-jurisdictions (Mental Health Tribunal already exists as id 20, line 38; parent
     jurisdiction Tribunal already exists as id 4, line 10); Step 2 links each list type
     name → sub-jurisdiction id in the `mapping(list_type_name, sub_jurisdiction_id)`
     `VALUES` block (lines 59-177), joined by `lt.name` so it is **id-independent**.

4. **Manual upload form** — `apps/web/src/pages/(admin)/manual-upload/index.ts` builds its
   list-type dropdown from `findStrategicListTypes()` (lines 11-20, 61-64), i.e. every list
   type with `isNonStrategic = false`. The option label is
   `shortenedFriendlyName || friendlyName || name`. So once the list type is seeded as
   strategic, it appears in the dropdown automatically with **no controller change**.

5. **Default sensitivity** — the same form builds a `listTypeSensitivityMap` from
   `defaultSensitivity` (lines 64-72). Setting `defaultSensitivity: "Public"` makes the form
   default the sensitivity to Public for this list.

### The extra requirement (not in #438): summary-of-publications notice

AC5 requires this message on the summary of publications page:

> Mental health hearings are held in private and unless a request has been made by the
> patient for a public hearing a hearing list will not be published.

Current state of `apps/web/src/pages/(public)/summary-of-publications/`:
- `index.ts` renders `cautionMessage` / `noListMessage` that come **from location metadata**
  (`getLocationMetadataByLocationId`, lines 114-119), not per-list-type.
- `index.njk` renders `cautionMessage` (lines 25-27) and `noListMessage` (lines 52-53).
- There is **no** existing per-list-type notice mechanism on this page.

The closest existing pattern is the SEND list's "held in private" copy
(`libs/list-types/send-daily-hearing-list/src/locales/en.ts`,
`importantInformationParagraphs[0]`) — but that renders on the SEND list page, not the
summary page, so it is a content precedent only, not a reusable mechanism.

Recommended approach (see CLARIFICATIONS for the open question on the trigger): drive the
notice off the **location's sub-jurisdiction**. `getLocationById` returns
`location.subJurisdictions: number[]` (`libs/location/src/repository/model.ts` lines 1-8).
Mental Health Tribunal is sub-jurisdiction id 20. To honour the CLAUDE.md "no hardcoded
numeric id" rule, resolve the id by the stable name `"Mental Health Tribunal"` via
`getAllSubJurisdictions()` (exported from `@hmcts/location`, `libs/location/src/index.ts`
line 37) and test membership. When present, pass a locale-file `mentalHealthNotice` string
to the template and render it in a new conditional block. Content lives in the page's
co-located `en.ts` / `cy.ts` (never hardcoded in the controller/template).

## 2. Implementation Details (files to create / modify)

### Modify — catalogue entry (mirrors PCOL diff)
**`libs/list-types/common/src/list-type-data.ts`**
Add one object to `listTypeData[]`, immediately after the
`CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST` entry (grouping with the tribunal lists):
```ts
{
  name: "MENTAL_HEALTH_TRIBUNAL_HEARING_LIST",
  englishFriendlyName: "Mental Health Tribunal Daily Hearing List",
  welshFriendlyName: "Rhestr Wrandawiadau Dyddiol y Tribiwnlys Iechyd Meddwl",
  provenance: "CFT_IDAM",
  isNonStrategic: false,
  defaultSensitivity: "Public",
  shortenedFriendlyName: "Mental Health Tribunal Daily Hearing List",
  subJurisdictionIds: [20]
}
```
Notes:
- No `urlPath` — flat file, served via `/hearing-lists/...`, matching PCOL which set `url = ''`.
- `provenance: "CFT_IDAM"` mirrors PCOL. (PHT used `MANUAL_UPLOAD`; see CLARIFICATIONS.)
- Ticket says shortened friendly name == full friendly name, so both are set explicitly.

### Modify — prod seed insert
**`apps/postgres/prisma/scripts/001_insert_missing_list_types.sql`**
Add one row to the `VALUES` list (empty `url` for flat file, matching PCOL):
```sql
('MENTAL_HEALTH_TRIBUNAL_HEARING_LIST', 'Mental Health Tribunal Daily Hearing List', 'Rhestr Wrandawiadau Dyddiol y Tribiwnlys Iechyd Meddwl', 'Mental Health Tribunal Daily Hearing List', '', 'Public', 'CFT_IDAM', false, NOW()),
```

### Modify — prod seed sub-jurisdiction link
**`apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql`**
Add one mapping row in the Step 2 `VALUES` block (Mental Health Tribunal = id 20, already
upserted in Step 1 line 38 — no Step 0/Step 1 change needed):
```sql
-- MENTAL_HEALTH_TRIBUNAL_HEARING_LIST → Mental Health Tribunal (20)
('MENTAL_HEALTH_TRIBUNAL_HEARING_LIST',                                20),
```

### Create — catalogue unit test (mirrors the PCOL test that never merged)
**`libs/list-types/common/src/list-type-data.test.ts`**
Master currently has **no** `list-type-data.test.ts`. Create one asserting the new entry's
fields, following the AAA pattern in `.claude/rules/testing.md`:
- entry exists with `name === "MENTAL_HEALTH_TRIBUNAL_HEARING_LIST"`
- `isNonStrategic === false`
- `defaultSensitivity === "Public"`
- `provenance === "CFT_IDAM"`
- `subJurisdictionIds` deep-equals `[20]`
- `shortenedFriendlyName === "Mental Health Tribunal Daily Hearing List"`
- English + Welsh friendly names match the ticket
- every `name` in `listTypeData` is unique (guards against duplicate paste)

### Modify — summary-of-publications notice (AC5)
**`apps/web/src/pages/(public)/summary-of-publications/index.ts`**
- Import `getAllSubJurisdictions` from `@hmcts/location`.
- After fetching `location`, resolve the Mental Health Tribunal sub-jurisdiction id by the
  stable name `"Mental Health Tribunal"`, then set
  `const showMentalHealthNotice = location.subJurisdictions.includes(mhtId)`.
- Pass `mentalHealthNotice: showMentalHealthNotice ? t.mentalHealthNotice : undefined` into
  `res.render(...)`.

**`apps/web/src/pages/(public)/summary-of-publications/en.ts`**
Add:
```ts
mentalHealthNotice: "Mental health hearings are held in private and unless a request has been made by the patient for a public hearing a hearing list will not be published."
```

**`apps/web/src/pages/(public)/summary-of-publications/cy.ts`**
Add (Welsh translation required — see CLARIFICATIONS):
```ts
mentalHealthNotice: "[WELSH TRANSLATION REQUIRED: 'Mental health hearings are held in private and unless a request has been made by the patient for a public hearing a hearing list will not be published.']"
```

**`apps/web/src/pages/(public)/summary-of-publications/index.njk`**
Add a conditional block (GOV.UK inset text is appropriate for this kind of standing notice),
placed after the `cautionMessage` block (after line 27):
```njk
{% if mentalHealthNotice %}
  {% from "govuk/components/inset-text/macro.njk" import govukInsetText %}
  {{ govukInsetText({ text: mentalHealthNotice }) }}
{% endif %}
```

### Modify — summary-of-publications tests
**`apps/web/src/pages/(public)/summary-of-publications/index.test.ts`** and
**`.../index.njk.test.ts`**
- Add a case: when the location's sub-jurisdictions include Mental Health Tribunal, the
  notice text is passed to the template / rendered.
- Add a case: when they do not, `mentalHealthNotice` is `undefined` / not rendered.
- Mock `getAllSubJurisdictions` and `getLocationById` accordingly.

## 3. Error Handling & Edge Cases

- **Idempotency:** both SQL scripts already use `ON CONFLICT DO UPDATE` / `DO NOTHING`
  (001 line 5 comment; 003 lines 49-52, 180). Adding one row each is safe to re-run.
- **Prod skip:** `seed-list-types.ts` skips prod; prod relies on the SQL scripts. Both paths
  must be updated (done above) or STG and prod diverge.
- **Duplicate name:** the new unit test asserts uniqueness of `listTypeData[].name`.
- **`getLocationById` returning null:** already handled (redirect to `/400`, index.ts lines
  27-30). Sub-jurisdiction resolution happens only after that guard.
- **Sub-jurisdiction name not found:** if `getAllSubJurisdictions` returns no
  "Mental Health Tribunal" row (misconfigured env), `mhtId` is `undefined`,
  `includes(undefined)` is `false`, so the notice simply does not show — fail-safe, no crash.
- **No numeric-id coupling:** per CLAUDE.md, routing/guards use the stable
  `listTypeName` / sub-jurisdiction name; the `subJurisdictionIds: [20]` value in
  catalogue/SQL is a fixed explicitly-assigned seed id (not autoincrement), consistent with
  every other entry in `list-type-data.ts`.
- **Welsh:** all user-facing copy is in `en.ts` / `cy.ts`; the Welsh friendly name comes
  from the ticket; the Welsh notice is flagged as a placeholder pending translation.

## 4. Acceptance Criteria Mapping

| AC | Requirement | Satisfied by |
|----|-------------|--------------|
| AC1 | List created, linked to Tribunal jurisdiction + National region; shows as "Mental Health Tribunal Daily Hearing List" in manual upload form | Catalogue entry + 001/003 SQL (`subJurisdictionIds: [20]` = Mental Health Tribunal, parent jurisdiction Tribunal id 4). Manual upload dropdown auto-populates via `findStrategicListTypes()` using `shortenedFriendlyName`. (Region "National" is a location attribute, not a list-type field — see CLARIFICATIONS.) |
| AC2 | Strategic (`isNonStrategic = false`) | `isNonStrategic: false` in catalogue + `false` column in 001 SQL; asserted in unit test |
| AC3 | Default sensitivity Public | `defaultSensitivity: "Public"` in catalogue + `'Public'` in 001 SQL; drives `listTypeSensitivityMap` in manual upload form |
| AC4 | Flat file, no JSON schema, no style guide | No schema file, no validator, no converter, no renderer/PDF, no list page created. Flat files served via `/hearing-lists/...` |
| AC5 | Summary-of-publications notice (EN + CY) | New `mentalHealthNotice` in `en.ts`/`cy.ts`, controller trigger via location sub-jurisdiction, `govukInsetText` block in `index.njk`, plus tests |

## 5. CLARIFICATIONS NEEDED

1. **Provenance: `CFT_IDAM` vs `MANUAL_UPLOAD`.** PCOL (#438) used `CFT_IDAM`; the newer
   PHT list (merged to master, `ed63e448`) used `provenance: "MANUAL_UPLOAD"` with
   `defaultSensitivity: null`. The ticket says provenance/restricted-provenances "None" and
   sensitivity defaults to Public. This plan follows PCOL (`CFT_IDAM` + `Public`) since #792
   is explicitly a PCOL mirror, but confirm whether it should instead match the newer
   `MANUAL_UPLOAD` convention. This affects access-control filtering in
   `filterPublicationsForSummary`.

2. **AC5 trigger condition.** The ticket says the notice must appear "in the summary of
   publications page" but not exactly when. This plan shows it when the **location** is
   linked to the Mental Health Tribunal sub-jurisdiction. Alternatives: (a) always for any
   location that has this list type configured, (b) only when there are no publications
   (like `noListMessage`), (c) a location-metadata field maintained by admins. Confirm the
   intended trigger — it changes the controller logic.

3. **Region = National.** In this data model, region is an attribute of a **location**
   (`region` table, `location_region` junction), not of a list type — `list-type-data.ts`
   has no region field. So "Region: National" cannot be set on the list type itself. Confirm
   this is understood and that no location-level change is required by this ticket (i.e. the
   region association is handled by existing reference data, not by #792).

4. **Welsh translation of the AC5 notice.** The Welsh friendly name is supplied by the
   ticket, but the Welsh translation of the summary notice sentence is not. It is added as a
   `[WELSH TRANSLATION REQUIRED: ...]` placeholder — confirm the approved Welsh text before
   release.

5. **List page for flat file.** Confirm no dedicated list-rendering page is expected (as with
   other flat-file uploads). This plan creates none; flat files open via the existing
   `/hearing-lists/{locationId}/{artefactId}` link in the summary template.
