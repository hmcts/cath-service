# #1078: Spike - Court Maintenance

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** spike
**Created:** 2026-09-25T14:41:30Z
**Updated:** 2026-09-25T14:54:38Z

## Description

**PROBLEM STATEMENT**
This spike ticket is created to investigate how Court Maintenance (adding new court locations without needing to use a csv file) can be improved in the System Admin portal.


**AS A** Service
**I WANT** to investigate possible options for adding new court locations in CaTH
**SO THAT** I can identify the best solution for implementation

**ACCEPTANCE CRITERIA**
- Various options for adding new court locations through the System Admin portal, without needing to use a csv file, are investigated
- An investigative report with the pros and cons of the various options is provided
- The best solution is highlighted in the investigative report 

## Comments

### Comment by OgechiOkelu on 2026-09-25T14:41:45Z

@spec 

### Comment by hmctsclaudecode on 2026-09-25T14:53:25Z

# Technical Specification — Issue #1078: Spike — Court Maintenance

> **Note on template fit:** #1078 is a spike. Its deliverable is an investigative report and a
> recommendation, not shipped pages. This spec therefore uses the new-feature template in two
> registers: sections 1–3 and 14 specify **the spike itself** (what must be investigated and
> what "done" looks like), and sections 4–13 specify **the recommended option (Option C)** in
> enough detail to be lifted directly into the follow-on build tickets. Nothing in sections
> 4–13 should be built under #1078.

## 1. User Story

**As a** Service
**I want to** investigate possible options for adding new court locations in CaTH
**So that** I can identify the best solution for implementation

Secondary story, satisfied by the option this spike recommends:

**As a** System Admin
**I want to** add a new court or tribunal location through the System Admin portal
**So that** I can onboard a venue without producing, editing and re-uploading a reference data CSV

## 2. Background

### How court locations are added today

A System Admin adds or amends court locations exclusively by CSV round-trip:

1. `GET /reference-data-download` — `generateReferenceDataCsv()`
   (`libs/system-admin-pages/src/reference-data-upload/services/download-service.ts`) exports every
   row in `location` as a 10-column CSV.
2. The admin opens the file in a spreadsheet, appends a row, and invents a `LOCATION_ID`.
3. `POST /reference-data-upload` — the file is validated by `multer`, stashed in session
   (`apps/web/src/pages/(system-admin)/reference-data-upload/index.ts`).
4. `GET /reference-data-upload-summary` — `parseCsv()` then `enrichLocationData()` renders a
   paginated 10-per-page preview.
5. `POST /reference-data-upload-summary` — `validateLocationData()` then `upsertLocations()`
   writes `location`, `location_region`, `location_sub_jurisdiction` and `location_reference`
   inside one `prisma.$transaction`. An `AuditLogAction.REFERENCE_DATA_UPLOAD` entry is written
   with the filename and record count.

### Why this is a problem

- **The whole estate is in play for a one-row change.** `upsertLocations()` iterates every parsed
  row. A stale download plus a fresh deploy means the upload silently reverts other admins' edits.
- **The admin invents the primary key.** `LOCATION_ID` is not generated; `parseCsv()` only checks
  it parses as an integer. A duplicate ID overwrites an existing court by design (`upsert`).
- **Junction rows are replaced, not merged.** `upsertLocations()` runs `deleteMany` on
  `location_sub_jurisdiction`, `location_region` and `location_reference` for each row before
  re-creating them, so a column the admin forgot to fill wipes existing mappings.
- **Errors are row-numbered strings, not fields.** Every `ValidationError` from
  `validateLocationData()` has `href: "#file"`, so the GOV.UK error summary cannot link to the
  offending input — it links back at the file picker. This is a WCAG 2.2 AA weakness as well as a
  usability one.
- **Spreadsheets are an unlogged, uncontrolled intermediate.** The audit trail records the
  filename, not which court changed or what it changed from.

### What already exists that we can build on

Non-CSV reference-data maintenance journeys are already live in `(system-admin)`, so the pattern
is established and only the core `location` row lacks one:

| Journey | Pages | What it maintains |
|---|---|---|
| Region data | `region-data`, `region-data-create`, `region-data-modify`, `region-data-update`, `region-data-delete` | `region` |
| Jurisdiction data | `jurisdiction-data*` (9 pages) | `jurisdiction`, `sub_jurisdiction` |
| Location jurisdiction/region mapping | `location-jurisdiction-search`, `-manage`, `-update`, `-delete` | `location_region`, `location_sub_jurisdiction` |
| Location metadata | `location-metadata-search`, `-manage`, `-delete-confirmation` | `location_metadata` |
| Delete court | `delete-court`, `-confirm`, `-publications`, `-subscriptions` | deletes `location` |
| **Add court** | **— none —** | **`location`, `location_reference`** |

Reusable building blocks:

- **Court autocomplete** — `data-autocomplete="true"` on an input, backed by
  `GET /api/locations?q=&language=` (`libs/location/src/routes/locations.ts` →
  `searchLocations()`). Used by `delete-court` and `location-jurisdiction-search`.
- **Validation service shape** — `createJurisdictionData()`
  (`libs/system-admin-pages/src/jurisdiction-management/service.ts`) returns
  `ValidationError[]` with field-anchored `href` values (`#name`, `#welshName`), checks
  `HTML_TAG_REGEX` and runs `checkUniqueness()` before writing. This is the pattern to copy.
- **Session-carried multi-page journeys** — `JurisdictionDataSession` in
  `libs/system-admin-pages/src/session-types.ts`; `location-jurisdiction-search` stores
  `session.locationJurisdiction` and redirects to the manage page.
- **Audit logging** — `req.auditMetadata = { shouldLog, action, entityInfo }` picked up by
  `libs/system-admin-pages/src/audit-log/middleware.ts`.
- **Checkbox group builders** — `listJurisdictionsWithSubJurisdictions()` and `listRegions()`,
  already shaped into grouped checkboxes by `location-jurisdiction-update`.
- **No caching layer.** `libs/location/src/repository/service.ts` and `queries.ts` hit Prisma
  directly; there is no Redis cache over locations, so a new court is visible immediately with no
  invalidation step.

### Hard constraints the investigation must respect

These are properties of the current schema and deploy pipeline, verified in code. Any option that
ignores them will fail on STG.

1. **`location_id` has no database default.**
   `libs/postgres-prisma/prisma/schema/location.prisma`:
   `model Location { locationId Int @id @map("location_id") ... }` — no
   `@default(autoincrement())`, therefore no Postgres sequence. Every writer must supply the ID.
   This is the single biggest design decision the spike has to settle.
2. **`welshName` is `String @unique` and NOT NULL.** A Welsh name is mandatory and must be
   globally unique. `name` is likewise `@unique`. `email` and `contactNo` are nullable.
3. **`location_reference` is uniquely keyed on `(provenance, provenanceLocationId)`** and its
   `location_reference_id` has no DB default (the `cuid()` lives in Prisma, not Postgres).
   Allowed values are closed sets in `libs/location/src/repository/location-reference-model.ts`:
   `LOCATION_REFERENCE_PROVENANCES = ["SNL", "COMMON_PLATFORM", "CP_CATH", "PDDA"]` and
   `LOCATION_REFERENCE_TYPES = ["VENUE", "REGION", "OWNING_HEARING_LOCATION", "NATIONAL"]`.
4. **The deploy seed rewrites locations it owns — and can strand ones it does not.**
   `apps/postgres/prisma/generate-seed-sql.ts` runs on every deploy via `apps/postgres/start.sh`.
   `generateLocationsSql()` emits
   `INSERT INTO location (...) VALUES (...) ON CONFLICT (location_id) DO UPDATE SET name = EXCLUDED.name, welsh_name = EXCLUDED.welsh_name`
   for each entry in `locationData` (`libs/location/src/location-data.ts`, 474 lines, ~50 courts).
   Crucially, `generateRealignSql("location", ...)` runs *first* and executes
   `UPDATE location SET name = '__realign_' || location_id, welsh_name = '__realign_w_' || location_id WHERE name IN (...) OR welsh_name IN (...)`.
   A UI-created court whose name is later added to `location-data.ts` under a *different* ID is
   parked to `__realign_<id>` and never restored — it stays in the database under a placeholder
   name, invisible to admins searching for it. **Unlike `list_types`, locations have no
   soft-delete reconciliation**, so a UI-created court with an ID outside `locationData` does
   survive deploys untouched. The hazard is name collision, not deletion.
   `generateLocationReferencesSql()` also mints deterministic IDs `seedref_<locationId>` with
   `provenance = SNL` and `provenance_location_id = String(locationId + 100)` — a second
   collision surface for any ID-allocation scheme.
5. **`AuditLogAction` has no court-creation member.** `libs/system-admin-pages/src/audit-log/logger.ts`
   exposes `ADD_JURISDICTION`, `ADD_REGION`, `ADD_SUB_JURISDICTION`, `DELETE_COURT`,
   `REFERENCE_DATA_UPLOAD` … but nothing for adding or amending a court.

### References

- GitHub issue #1078
- `.claude/rules/design.md` — GOV.UK Design System patterns index
- GOV.UK "Question pages" pattern — https://design-system.service.gov.uk/patterns/question-pages/
- GOV.UK "Check answers" pattern — https://design-system.service.gov.uk/patterns/check-answers/
- GOV.UK "Validation" pattern — https://design-system.service.gov.uk/patterns/validation/

## 3. Acceptance Criteria

### Spike deliverable criteria

* **Scenario:** Options are investigated and documented
    * **Given** the current CSV-only route to adding a court location
    * **When** the spike is complete
    * **Then** a written report exists at `docs/tickets/1078/report.md` covering at minimum
      Options A–F below, each with pros, cons, effort estimate in dev-days, and the risks it
      carries against the five hard constraints in section 2

* **Scenario:** A single option is recommended
    * **Given** the completed options analysis
    * **When** a reader reaches the end of the report
    * **Then** exactly one option is named as the recommendation, with the reasoning stated, and
      the rejected options each carry a one-line reason for rejection

* **Scenario:** The `location_id` allocation question is answered
    * **Given** that `location.location_id` has no `@default(autoincrement())` and no Postgres sequence
    * **When** the report presents the recommended option
    * **Then** it states which of the three allocation strategies (application-side
      `MAX(location_id) + 1`; a new Postgres sequence seeded above the `locationData` range; a
      reserved high-ID band such as `>= 100000` for UI-created courts) is chosen, and demonstrates
      that the chosen strategy cannot collide with `generateLocationsSql()` or the
      `provenance_location_id = locationId + 100` values emitted by `generateLocationReferencesSql()`

* **Scenario:** The deploy-seed interaction is resolved
    * **Given** `generateRealignSql("location", ...)` parks any row whose `name` or `welsh_name`
      matches a `locationData` entry
    * **When** the report presents the recommended option
    * **Then** it states how a UI-created court is protected from being renamed to
      `__realign_<id>` by a later addition to `location-data.ts`, and whether
      `location-data.ts` should be frozen as the source of truth for locations once the UI exists

* **Scenario:** Validation parity with the CSV route is confirmed
    * **Given** the 20+ checks in `validateLocationData()`
    * **When** the report presents the recommended option
    * **Then** it maps every existing CSV validation rule to either a form-level equivalent, a
      schema-level constraint, or an explicit decision to drop it

* **Scenario:** The CSV route's future is decided
    * **Given** that `reference-data-upload` and `reference-data-download` remain useful for bulk work
    * **When** the report presents the recommended option
    * **Then** it states whether the CSV route is retained alongside the new journey, deprecated,
      or restricted to update-only

* **Scenario:** Follow-on tickets are raised
    * **Given** an accepted recommendation
    * **When** the spike is closed
    * **Then** implementation tickets exist for the recommended option, sized to be individually
      shippable, and this specification's sections 4–13 are attached to them

### Criteria for the recommended option (Option C), to be inherited by the build tickets

* **Scenario:** System Admin adds a court successfully
    * **Given** I am signed in with the `SYSTEM_ADMIN` role and I am on `/reference-data`
    * **When** I select "Add a court or tribunal" and complete every question with valid answers
    * **Then** I see a check-your-answers page listing every value with a "Change" link, and on
      confirming I see a confirmation panel naming the court and the allocated location ID

* **Scenario:** The new court is immediately usable
    * **Given** I have just added "Newport Combined Court Centre"
    * **When** a member of the public visits the court list A–Z or a subscriber searches for a court
    * **Then** the new court appears under the correct region and sub-jurisdiction, in English and
      in Welsh, with no cache flush or redeploy

* **Scenario:** Duplicate English name is rejected
    * **Given** a `location` row already exists named "Oxford Combined Court Centre"
    * **When** I submit that name, in any letter case, as the English court name
    * **Then** the page re-renders with a GOV.UK error summary whose entry links to `#name`, no
      row is written, and my other answers are preserved

* **Scenario:** Duplicate Welsh name is rejected
    * **Given** a `location` row already holds the Welsh name I have entered
    * **When** I submit the form
    * **Then** the error summary entry links to `#welshName` and no row is written

* **Scenario:** Duplicate provenance reference is rejected
    * **Given** a `location_reference` row already exists for `(SNL, "104")`
    * **When** I enter provenance `SNL` with provenance location ID `104`
    * **Then** the error summary entry links to `#provenanceLocationId` and no row is written,
      honouring `@@unique([provenance, provenanceLocationId])`

* **Scenario:** Incomplete mapping is rejected
    * **Given** I am on the region or sub-jurisdiction question
    * **When** I continue without ticking any checkbox
    * **Then** the error summary entry links to the fieldset and I cannot proceed — matching the
      CSV rule that `REGION_NAME` and `SUB_JURISDICTION_NAME` are required

* **Scenario:** Markup in a free-text field is rejected
    * **Given** I enter `<script>alert(1)</script>` as the court name
    * **When** I continue
    * **Then** the `HTML_TAG_REGEX` check rejects it with a field-anchored error, consistently with
      `createJurisdictionData()` and `validateLocationData()`

* **Scenario:** The journey is fully bilingual
    * **Given** any page in the journey
    * **When** I append `?lng=cy`
    * **Then** every heading, label, hint, button and error message renders in Welsh, and
      `Object.keys(en).sort()` equals `Object.keys(cy).sort()` for that page's content files

* **Scenario:** Every write is audited
    * **Given** I confirm a new court
    * **When** I open `/audit-log-list`
    * **Then** an entry exists for the new `AuditLogAction.ADD_COURT` action recording my user ID,
      email, role, provenance, and the court name and allocated location ID

* **Scenario:** Non-admins are refused
    * **Given** I am signed in without the `SYSTEM_ADMIN` role, or not signed in
    * **When** I request any URL in the journey by `GET` or `POST`
    * **Then** `requireRole([USER_ROLES.SYSTEM_ADMIN])` blocks me and nothing is written

* **Scenario:** Deep-linking mid-journey is handled
    * **Given** I have no journey data in session
    * **When** I request a later page in the journey directly
    * **Then** I am redirected to the first page of the journey, matching the
      `if (!session.locationJurisdiction) return res.redirect(...)` guard already used by
      `location-jurisdiction-manage` and `location-jurisdiction-update`

* **Scenario:** The court survives a deploy
    * **Given** I added a court through the UI
    * **When** `apps/postgres/start.sh` runs the generated seed SQL on the next deploy
    * **Then** the court's `name`, `welsh_name`, region mappings, sub-jurisdiction mappings and
      provenance references are unchanged, and its name has not been parked to `__realign_<id>`

## 4. User Journey Flow

### 4.1 Options under investigation

The spike must evaluate these six options. Each is scored against the five hard constraints from
section 2.

#### Option A — Do nothing: keep the CSV round-trip

Retain `reference-data-download` → edit spreadsheet → `reference-data-upload`.

*Pros:* zero cost; already live and tested; naturally handles bulk onboarding.
*Cons:* fails the issue's premise outright. Whole-estate `upsertLocations()` on every submit;
admin invents the primary key; junction rows replaced not merged; all errors anchored at `#file`
so the error summary cannot link to a field (WCAG 2.2 AA 3.3.1/3.3.3 weakness); audit trail
records a filename, not a court.
*Effort:* 0 days. **Rejected** — does not meet the acceptance criteria.

#### Option B — Single "Add a court" form page

One page holding all nine inputs (English name, Welsh name, email, contact number, region
checkboxes, sub-jurisdiction checkboxes, provenance select, provenance location ID, provenance
location type select), then a success page.

*Pros:* cheapest journey to build — roughly one controller, one template, one service function,
two content files. Fast for an expert admin who does this repeatedly. Mirrors the existing
`region-data-create` shape almost exactly.
*Cons:* violates the GOV.UK one-thing-per-page principle for a nine-input form with two
multi-select fieldsets and three closed vocabularies. No check-answers step, so a typo in a Welsh
name reaches the database unreviewed. Error recovery on a long page is poor for screen-reader and
magnifier users.
*Effort:* ~2–3 days including tests. **Viable fallback** if the recommended option is descoped.

#### Option C — Multi-page one-question-per-page journey *(recommended)*

Session-carried journey: court names → contact details → regions → sub-jurisdictions →
provenance reference → check your answers → confirmation. Reuses `JurisdictionDataSession`, the
`requireRole` guard, the checkbox builders from `location-jurisdiction-update`, and the
`ValidationError[]` service shape from `createJurisdictionData()`.

*Pros:* the only option that is idiomatic GOV.UK for this input volume. Every error anchors to a
real field. Check-answers gives a review gate before a unique-constrained write. Reuses five
existing, tested building blocks. A per-court write touches exactly one `location` row, so it
cannot revert another admin's work. Naturally extends to an "amend court" journey later by
pre-populating from `getLocationWithDetails()`.
*Cons:* seven pages to build, translate and test — the largest surface area of the form-based
options. Session state introduces the mid-journey deep-link case (already solved elsewhere in the
codebase). Slower for an admin onboarding many courts, which is exactly what the CSV route is
good at — so Option C should not replace it.
*Effort:* ~5–8 days including unit, template and E2E tests.

#### Option D — Code change to `location-data.ts` plus deploy seed

Add the court to `libs/location/src/location-data.ts` and let
`apps/postgres/prisma/generate-seed-sql.ts` propagate it on the next deploy.

*Pros:* zero new UI. Keeps one source of truth, exactly as CLAUDE.md prescribes for reference
data. Fully version-controlled and peer-reviewed; trivially reproducible across environments.
*Cons:* requires a developer, a PR and a deploy for every court — this is the operational burden
the issue exists to remove. A System Admin cannot self-serve. Lead time is a release cycle, not
minutes. **Rejected as the primary route**, but worth noting in the report that this is the
*current* documented mechanism, and that Option C deliberately diverges from it.

#### Option E — Paste-CSV textarea

Replace the file picker with a `govukTextarea` accepting pasted CSV rows, reusing `parseCsv()`
unchanged.

*Pros:* cheapest possible removal of the literal "needing to use a csv file" requirement —
roughly half a day. No new validation code.
*Cons:* satisfies the letter of the ticket and none of its intent. Inherits every CSV defect:
`#file`-anchored errors, admin-supplied primary key, whole-estate upsert. Asking a user to author
delimited text in a textarea is worse accessibility than a file upload, not better.
**Rejected.**

#### Option F — Automated sync from an upstream reference-data source

Poll or subscribe to SNL / Common Platform reference data and reconcile `location` and
`location_reference` automatically.

*Pros:* the only option that removes manual court maintenance entirely. Provenance data becomes
authoritative rather than hand-typed, which directly addresses the
`@@unique([provenance, provenanceLocationId])` collision class.
*Cons:* depends on an upstream API contract, availability and ownership that this spike has not
established — cross-team dependency, not a local change. Needs a reconciliation policy for
divergence (upstream rename vs. local edit) and a soft-delete story locations currently lack.
Welsh names are unlikely to be available upstream, yet `welsh_name` is NOT NULL and `@unique`, so
a manual completion step survives regardless.
*Effort:* not estimable without upstream discovery. **Recommend a separate discovery spike**;
this does not block Option C, and Option C's per-court write is a prerequisite for any
reconciliation layer anyway.

### 4.2 Recommendation

**Option C**, with these three supporting decisions:

1. **ID allocation — reserved high-ID band.** Allocate UI-created IDs from a dedicated Postgres
   sequence starting at `100000`. Rationale: `locationData` occupies a low, dense range
   (currently ~1–50) and `generateLocationReferencesSql()` derives `provenance_location_id` as
   `locationId + 100`, so the low range is doubly reserved. A band at `100000+` is provably
   collision-free against both, and a sequence — unlike an application-side
   `MAX(location_id) + 1` — cannot race between web pods. The sequence is created by migration and
   attached as the column default, so `locationId` becomes omissible in the Prisma `create`.
2. **Deploy-seed protection.** Because UI-created IDs sit outside `locationData` and locations have
   no soft-delete reconciliation, `generateLocationsSql()` never touches them. The residual hazard
   is `generateRealignSql` renaming a UI-created court whose *name* later appears in
   `location-data.ts`. Mitigate by treating `location-data.ts` as frozen for new court entries once
   the UI ships, and by asserting in `generate-seed-sql.test.ts` that the emitted realign list is
   derived solely from `locationData`.
3. **Keep the CSV route.** Option C is for onboarding one court at a time; the CSV route stays for
   bulk work. Recommend narrowing it to update-only in a follow-on ticket so it can no longer mint
   primary keys.

### 4.3 Recommended journey — page flow

```
                        /system-admin-dashboard
                                  │
                          "Reference Data"
                                  │
                                  ▼
                          /reference-data
              ┌───────────────────┴───────────────────┐
              │  (new radio option added to en.options)│
              │      "Add a court or tribunal"         │
              └───────────────────┬───────────────────┘
                                  ▼
                       /add-court-name                     ◄── English + Welsh name
                                  │  POST: uniqueness + HTML checks
                                  ▼
                   /add-court-contact-details                ◄── email + contact no (both optional)
                                  │
                                  ▼
                       /add-court-regions                    ◄── region checkboxes (≥1)
                                  │
                                  ▼
                  /add-court-sub-jurisdictions                ◄── grouped sub-jurisdiction checkboxes (≥1)
                                  │
                                  ▼
                /add-court-provenance-reference               ◄── provenance, provenance location ID, type
                                  │  POST: (provenance, id) uniqueness check
                                  ▼
                   /add-court-check-answers  ◄──── "Change" links return here after edit
                                  │  POST: allocate ID, write in one transaction, audit
                                  ▼
                      /add-court-success                      ◄── panel with court name + allocated ID
                                  │
                       ┌──────────┴──────────┐
                       ▼                     ▼
              "Add another court"    "Return to dashboard"
              /add-court-name        /system-admin-dashboard
```

### 4.4 Sequence — the confirm step

```
Admin            web (/add-court-check-answers)      @hmcts/system-admin-pages         Postgres
  │                        │                                    │                         │
  │── POST confirm ───────►│                                    │                         │
  │                        │── createCourtLocation(session) ───►│                         │
  │                        │                                    │── validate uniqueness ─►│
  │                        │                                    │◄── name/welsh/prov ─────│
  │                        │◄── ValidationError[] (if any) ──────│                         │
  │◄── re-render + summary │   (nothing written)                │                         │
  │                        │                                    │                         │
  │                        │                                    │── BEGIN ───────────────►│
  │                        │                                    │   INSERT location       │
  │                        │                                    │     (id from sequence)  │
  │                        │                                    │   INSERT location_region│
  │                        │                                    │   INSERT location_sub_j.│
  │                        │                                    │   INSERT location_ref.  │
  │                        │                                    │── COMMIT ──────────────►│
  │                        │◄── { locationId } ─────────────────│                         │
  │                        │── req.auditMetadata = ADD_COURT ───┼────────────────────────►│
  │◄── 302 /add-court-success (session cleared) ────────────────│                         │
```

## 5. Low Fidelity Wireframe

### 5.1 `/reference-data` — new option added to the existing radio list

```
┌────────────────────────────────────────────────────────────────────┐
│ GOV.UK  Court and Tribunal Hearings            [ Cymraeg ]  Sign out│
├────────────────────────────────────────────────────────────────────┤
│ BETA  This is a new service – your feedback will help us improve it │
├────────────────────────────────────────────────────────────────────┤
│  ‹ Back                                                            │
│                                                                    │
│  What do you want to do?                                     (h1)  │
│                                                                    │
│  ( ) Add a Court or Tribunal                              ◄── NEW  │
│      Add a new court or tribunal location                          │
│                                                                    │
│  ( ) Upload Reference Data                                         │
│      Upload CSV location reference data                            │
│                                                                    │
│  ( ) Manage Region Data                                            │
│      View, update and remove region data                           │
│                                                                    │
│  ( ) Manage Location Jurisdiction and Region Data                  │
│      View and update location jurisdiction and region data         │
│                                                                    │
│  ( ) Manage Location Metadata                                      │
│      View, update and remove location metadata                     │
│                                                                    │
│  [ Continue ]                                                      │
└────────────────────────────────────────────────────────────────────┘
```

### 5.2 `/add-court-name` — step 1 of 6

```
┌────────────────────────────────────────────────────────────────────┐
│  ‹ Back                                                            │
│                                                                    │
│  Step 1 of 6                                              (caption)│
│  What is the name of the court or tribunal?                   (h1)  │
│                                                                    │
│  Enter the full official name. It must not already be in use.      │
│                                                                    │
│  English name                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Newport Combined Court Centre                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  Welsh name                                                        │
│  This is shown to users who choose Welsh. It is required.          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Canolfan Llysoedd Cyfun Casnewydd                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  [ Continue ]                                                      │
│                                                                    │
│  Cancel                                                            │
└────────────────────────────────────────────────────────────────────┘
```

### 5.3 `/add-court-name` — error state

```
┌────────────────────────────────────────────────────────────────────┐
│  ‹ Back                                                            │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ There is a problem                                           ┃  │
│  ┃                                                              ┃  │
│  ┃ • A court or tribunal with this English name already exists  ┃  │
│  ┃   → links to #name                                           ┃  │
│  ┃ • Enter the Welsh name of the court or tribunal              ┃  │
│  ┃   → links to #welshName                                      ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                    │
│  Step 1 of 6                                                       │
│  What is the name of the court or tribunal?                         │
│                                                                    │
│  English name                                                      │
│  ✗ A court or tribunal with this English name already exists       │
│  ┃──────────────────────────────────────────────────────────────┐  │
│  ┃ Oxford Combined Court Centre                                 │  │
│  ┗──────────────────────────────────────────────────────────────┘  │
│   ▲ red 4px left border, .govuk-input--error                       │
│                                                                    │
│  Welsh name                                                        │
│  ✗ Enter the Welsh name of the court or tribunal                   │
│  ┃──────────────────────────────────────────────────────────────┐  │
│  ┃                                                              │  │
│  ┗──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  [ Continue ]                                                      │
└────────────────────────────────────────────────────────────────────┘
```

### 5.4 `/add-court-contact-details` — step 2 of 6

```
┌────────────────────────────────────────────────────────────────────┐
│  ‹ Back                                                            │
│                                                                    │
│  Step 2 of 6                                                       │
│  What are the contact details for Newport Combined Court Centre?    │
│                                                                    │
│  You can leave these blank and add them later.                      │
│                                                                    │
│  Email address (optional)                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ newport.enquiries@justice.gov.uk                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  Telephone number (optional)                                       │
│  ┌────────────────────────────────┐                                │
│  │ 01633 000000                   │  (width-20)                    │
│  └────────────────────────────────┘                                │
│                                                                    │
│  [ Continue ]        Cancel                                        │
└────────────────────────────────────────────────────────────────────┘
```

### 5.5 `/add-court-regions` — step 3 of 6

```
┌────────────────────────────────────────────────────────────────────┐
│  ‹ Back                                                            │
│                                                                    │
│  Step 3 of 6                                                       │
│  Which regions does this court or tribunal cover?             (h1)  │
│   ▲ h1 is the <legend> of the fieldset                             │
│                                                                    │
│  Select all that apply.                                            │
│                                                                    │
│  [✓] London                                                        │
│  [ ] Midlands                                                      │
│  [ ] South East                                                    │
│  [ ] North West                                                    │
│  [✓] Wales                                                         │
│  [ ] North East                                                    │
│  [ ] South West                                                    │
│  [ ] Scotland                                                      │
│  [ ] Northern Ireland                                              │
│   ▲ rendered from listRegions(); this list is data, not hardcoded   │
│                                                                    │
│  [ Continue ]        Cancel                                        │
└────────────────────────────────────────────────────────────────────┘
```

### 5.6 `/add-court-sub-jurisdictions` — step 4 of 6

Reuses the grouped-checkbox shape already produced by `location-jurisdiction-update`'s
`subJurisdictionGroups`.

```
┌────────────────────────────────────────────────────────────────────┐
│  ‹ Back                                                            │
│                                                                    │
│  Step 4 of 6                                                       │
│  Which jurisdictions does this court or tribunal handle?       (h1)  │
│                                                                    │
│  Select all that apply.                                            │
│                                                                    │
│  Civil court                                                 (h2)  │
│    [✓] Civil                                                       │
│    [ ] Magistrates                                                 │
│                                                                    │
│  Criminal court                                              (h2)  │
│    [ ] Crown                                                       │
│    [ ] Single Justice Procedure                                    │
│                                                                    │
│  Family court                                                (h2)  │
│    [✓] Family                                                      │
│                                                                    │
│  Tribunal                                                    (h2)  │
│    [ ] Employment                                                  │
│    [ ] Immigration and Asylum                                      │
│   ▲ groups from listJurisdictionsWithSubJurisdictions(); headings   │
│     come from locale files, never hardcoded English                 │
│                                                                    │
│  [ Continue ]        Cancel                                        │
└────────────────────────────────────────────────────────────────────┘
```

### 5.7 `/add-court-provenance-reference` — step 5 of 6

```
┌────────────────────────────────────────────────────────────────────┐
│  ‹ Back                                                            │
│                                                                    │
│  Step 5 of 6                                                       │
│  How is this court identified in the source system?           (h1)  │
│                                                                    │
│  CaTH matches incoming publications to this court using these       │
│  values. They must match the source system exactly.                 │
│                                                                    │
│  Source system                                                     │
│  ┌────────────────────────────────┐                                │
│  │ SNL                        ▼   │  SNL / COMMON_PLATFORM /       │
│  └────────────────────────────────┘  CP_CATH / PDDA                │
│                                                                    │
│  Location ID in the source system                                  │
│  ┌────────────────────────────────┐                                │
│  │ 458                            │  (width-10)                    │
│  └────────────────────────────────┘                                │
│                                                                    │
│  Location type                                                     │
│  ┌────────────────────────────────┐                                │
│  │ VENUE                      ▼   │  VENUE / REGION /              │
│  └────────────────────────────────┘  OWNING_HEARING_LOCATION /     │
│                                       NATIONAL                     │
│                                                                    │
│  [ Continue ]        Cancel                                        │
└────────────────────────────────────────────────────────────────────┘
```

### 5.8 `/add-court-check-answers` — step 6 of 6

```
┌────────────────────────────────────────────────────────────────────┐
│  ‹ Back                                                            │
│                                                                    │
│  Step 6 of 6                                                       │
│  Check your answers before adding this court or tribunal      (h1)  │
│                                                                    │
│  ⚠  Warning                                                        │
│     Ensure authorisation has been granted before adding a new       │
│     court or tribunal location.                                     │
│                                                                    │
│  ┌──────────────────────┬──────────────────────────┬────────────┐  │
│  │ English name         │ Newport Combined Court   │ Change     │  │
│  │                      │ Centre                   │            │  │
│  ├──────────────────────┼──────────────────────────┼────────────┤  │
│  │ Welsh name           │ Canolfan Llysoedd Cyfun  │ Change     │  │
│  │                      │ Casnewydd                │            │  │
│  ├──────────────────────┼──────────────────────────┼────────────┤  │
│  │ Email address        │ newport.enquiries@       │ Change     │  │
│  │                      │ justice.gov.uk           │            │  │
│  ├──────────────────────┼──────────────────────────┼────────────┤  │
│  │ Telephone number     │ Not provided             │ Change     │  │
│  ├──────────────────────┼──────────────────────────┼────────────┤  │
│  │ Regions              │ London                   │ Change     │  │
│  │                      │ Wales                    │            │  │
│  ├──────────────────────┼──────────────────────────┼────────────┤  │
│  │ Jurisdictions        │ Civil                    │ Change     │  │
│  │                      │ Family                   │            │  │
│  ├──────────────────────┼──────────────────────────┼────────────┤  │
│  │ Source system        │ SNL                      │ Change     │  │
│  ├──────────────────────┼──────────────────────────┼────────────┤  │
│  │ Source location ID   │ 458                      │ Change     │  │
│  ├──────────────────────┼──────────────────────────┼────────────┤  │
│  │ Location type        │ VENUE                    │ Change     │  │
│  └──────────────────────┴──────────────────────────┴────────────┘  │
│                                                                    │
│  [ Add court or tribunal ]        Cancel                           │
└────────────────────────────────────────────────────────────────────┘
```

### 5.9 `/add-court-success`

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃                    (govuk-panel, green)                      ┃  │
│  ┃              Court or tribunal added                         ┃  │
│  ┃                                                              ┃  │
│  ┃              Newport Combined Court Centre                   ┃  │
│  ┃              Location ID: 100001                             ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                    │
│  What happens next                                           (h2)  │
│                                                                    │
│  This court or tribunal is now available to the public and to       │
│  subscribers. You can:                                             │
│                                                                    │
│  • Add a caution or no-list message for this court                 │
│  • Add another court or tribunal                                   │
│  • Return to the System Admin dashboard                            │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

## 6. Page Specifications

### 6.1 File layout

Pages live in the web app; business logic lives in the lib, per CLAUDE.md.

```
apps/web/src/pages/(system-admin)/
├── add-court-name/
│   ├── index.ts          # GET/POST, both wrapped in requireRole([USER_ROLES.SYSTEM_ADMIN])
│   ├── index.njk
│   ├── en.ts
│   ├── cy.ts
│   ├── index.test.ts
│   └── index.njk.test.ts
├── add-court-contact-details/     ── same six files
├── add-court-regions/             ── same six files
├── add-court-sub-jurisdictions/   ── same six files
├── add-court-provenance-reference/── same six files
├── add-court-check-answers/       ── same six files
└── add-court-success/             ── same six files

libs/system-admin-pages/src/court-maintenance/
├── service.ts        # createCourtLocation(), validateCourtFields(), checkCourtUniqueness()
├── service.test.ts
├── queries.ts        # allocateLocationId(), insertCourtLocation(), findByName/WelshName/Provenance
└── queries.test.ts
```

`libs/system-admin-pages/src/index.ts` gains the `createCourtLocation` and
`CreateCourtInput` exports. `libs/system-admin-pages/src/session-types.ts` gains the
`AddCourtSession` interface. No new lib registration is needed in `apps/web/src/app.ts` —
`@hmcts/system-admin-pages` is already wired in and pages are auto-discovered.

### 6.2 Database change

One migration, in `libs/postgres-prisma/prisma/schema/location.prisma`:

```prisma
model Location {
  locationId  Int       @id @default(autoincrement()) @map("location_id")
  ...
}
```

The migration must additionally set the sequence's starting point above the seeded band, so
UI-created IDs are provably disjoint from `locationData`:

```sql
-- set the sequence to the reserved UI band; locationData occupies the low, dense range
SELECT setval(pg_get_serial_sequence('location', 'location_id'), 100000, false);
```

`generateLocationsSql()` supplies explicit `location_id` values and is unaffected — an explicit
insert does not advance the sequence, and its IDs sit far below `100000`.

### 6.3 Shared behaviour across all six input pages

| Concern | Specification |
|---|---|
| Auth | `export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler]`, same for `POST` |
| Locale | `const locale = res.locals.locale \|\| "en"; const t = locale === "cy" ? cy : en;` — matches `region-data-create` |
| Render contract | `res.render("<page>/index", { en, cy, t, data, errors })`, so template tests can assert on both locales |
| Session guard | Every page after step 1: `if (!session.addCourt) return res.redirect("/add-court-name");` — same guard as `location-jurisdiction-manage` |
| Session key | `session.addCourt` typed by `AddCourtSession` in `libs/system-admin-pages/src/session-types.ts` |
| Progress | `govuk-caption-l` reading "Step N of 6" from the locale file. No `govukTaskList` — the journey is linear |
| Back link | `govukBackLink` in the `{% block backLink %}` slot, `href` = previous step; step 1's back link is `/reference-data` |
| Cancel | Secondary link, not a button. Clears `session.addCourt` and returns to `/reference-data` |
| Layout | `{% extends "layouts/base-template.njk" %}`, content in `govuk-grid-column-two-thirds` |
| Forms | `<form method="post" novalidate>` — `novalidate` so server-side validation is authoritative, per the existing pages |
| Error pattern | `errors` is `ValidationError[]`; templates select with `errors \| selectattr("href", "equalto", "#field") \| first`, exactly as `region-data-create/index.njk` does |
| Re-render on error | Same URL, HTTP 200, `data` repopulated from `req.body` so nothing is retyped |

### 6.4 Per-page detail

#### `/reference-data` (modified, not new)

Prepend one entry to `en.options` / `cy.options` in
`apps/web/src/pages/(system-admin)/reference-data/`:

```typescript
{
  value: "add-court",
  label: "Add a Court or Tribunal",
  description: "Add a new court or tribunal location",
  href: "/add-court-name"
}
```

Placed first because adding is the primary task this feature introduces. No controller change —
the page already maps `value` → `href`.

#### `/add-court-name` — step 1

- Two `govukInput` fields: `name` (`autocomplete="off"`), `welshName` (`autocomplete="off"`,
  `spellcheck="false"`, `lang="cy"`).
- `POST` trims both, runs `validateCourtNameFields()`, then `checkCourtUniqueness()` against the
  database case-insensitively. Uniqueness is checked here rather than only at confirm, so the admin
  learns about a clash before entering eight more values. It is checked **again** at confirm,
  because the session is long-lived and a concurrent write could land in between.
- On success: writes `session.addCourt.name` / `.welshName`, redirects to
  `/add-court-contact-details`.

#### `/add-court-contact-details` — step 2

- `govukInput` `email` (`type="email"`, `autocomplete="email"`), `govukInput` `contactNo`
  (`type="tel"`, `autocomplete="tel"`, `govuk-input--width-20`).
- Both optional — the schema has them nullable and `validateLocationData()` does not require them.
  Labels carry "(optional)" per GOV.UK guidance.
- Empty string is normalised to `null` before the insert, matching
  `upsertLocations()`'s `row.email || null`.

#### `/add-court-regions` — step 3

- `govukCheckboxes` inside a `govukFieldset` whose `legend` is the page `h1`
  (`isPageHeading: true`).
- Items built from `listRegions()` — `{ value: String(regionId), text: region.name }`. Region names
  come from the database, so they are already environment-correct and need no locale file.
- At least one required.

#### `/add-court-sub-jurisdictions` — step 4

- Built from `listJurisdictionsWithSubJurisdictions()`, filtered to
  `j.subJurisdictions.length > 0`, grouped under `h2` headings — the exact transform already in
  `location-jurisdiction-update/index.ts`. Lift it into the lib so both pages share it rather than
  duplicating (DRY).
- Group headings are resolved through a locale map (`t.civilCourtLabel`, `t.criminalCourtLabel`,
  `t.familyCourtLabel`, `t.tribunalLabel`), never hardcoded English — same as the existing page.
- At least one required.

#### `/add-court-provenance-reference` — step 5

- `govukSelect` `provenance`, options from `LOCATION_REFERENCE_PROVENANCES`; `govukInput`
  `provenanceLocationId`; `govukSelect` `provenanceLocationType`, options from
  `LOCATION_REFERENCE_TYPES`.
- `govukSelect` is used here despite the design guidance's caution, because both are closed
  four-item technical vocabularies that must be transmitted verbatim — free text would produce the
  exact invalid values `validateLocationData()` currently rejects after the fact. Radios are the
  alternative and are acceptable; the choice should be confirmed with the design team in the build
  ticket.
- Option *values* are the literal enum strings and are not translated. Option *labels* may carry a
  plain-English gloss from the locale file (for example `SNL — Scheduling and Listing`).
- `POST` checks `(provenance, provenanceLocationId)` is unused, honouring
  `@@unique([provenance, provenanceLocationId])`.
- Scope note: the CSV route supports several `;`-delimited references per court. Step 5 captures
  **one**. A court needing more is either completed via the CSV route or via a follow-on
  "add another reference" ticket. This is a deliberate, stated narrowing — flag it to the PO.

#### `/add-court-check-answers` — step 6

- `govukWarningText` reusing the wording already approved for
  `location-jurisdiction-manage` ("Ensure authorisation has been granted…").
- `govukSummaryList` with nine rows. Every row has a `Change` action whose `href` is the owning
  step plus `?change=true`, and a `visuallyHiddenText` naming the row.
- `?change=true` makes the step's back link and its Continue target return to
  `/add-court-check-answers` instead of advancing, so a correction does not replay the whole
  journey.
- Multi-value rows (regions, jurisdictions) render as a `<ul class="govuk-list">`, resolving IDs to
  names at render time so the summary shows names, not numbers.
- Unanswered optional fields render `t.notProvided`, never an empty cell.
- `POST` calls `createCourtLocation(session.addCourt, user)`. On `ValidationError[]`, re-renders the
  summary with the error summary at the top and writes nothing. On success: sets
  `req.auditMetadata`, stores `{ name, locationId }` on the session for the success page, deletes
  `session.addCourt`, redirects.

#### `/add-court-success`

- `govukPanel` with `titleText: t.panelTitle` and `html` giving the court name and allocated
  location ID.
- `GET` with no success data in session redirects to `/reference-data` rather than rendering an
  empty panel.
- Reads then deletes the success data so a refresh cannot re-show a stale confirmation.
- Three onward links: `/location-metadata-search` (add caution/no-list messages),
  `/add-court-name` (add another), `/system-admin-dashboard`.

### 6.5 Service layer — `libs/system-admin-pages/src/court-maintenance/service.ts`

Functional, no classes, matching `jurisdiction-management/service.ts`:

```typescript
export interface CreateCourtInput {
  name: string;
  welshName: string;
  email?: string;
  contactNo?: string;
  regionIds: number[];
  subJurisdictionIds: number[];
  provenance: string;
  provenanceLocationId: string;
  provenanceLocationType: string;
}

export interface CreateCourtResult {
  errors: ValidationError[];
  locationId?: number;
}

export async function createCourtLocation(input: CreateCourtInput, user: UserContext): Promise<CreateCourtResult>
```

Order of operations inside `createCourtLocation`:

1. Field-level validation — required, length, `HTML_TAG_REGEX`, enum membership.
2. Uniqueness — `name`, `welshName`, `(provenance, provenanceLocationId)`.
3. Referential checks — every `regionId` exists in `region`, every `subJurisdictionId` exists in
   `sub_jurisdiction`. Protects against a tampered POST body.
4. Return early with `errors` if any step failed. **Nothing is written on a partial failure.**
5. One `prisma.$transaction`: `location.create` (ID from the sequence), then
   `locationRegion.createMany`, `locationSubJurisdiction.createMany`,
   `locationReference.create`.
6. Return the allocated `locationId`.

`P2002` from the transaction — the race where a concurrent admin took the name between step 2 and
step 5 — is caught and converted to the same field-anchored `ValidationError` a step-2 failure
produces, rather than surfacing a 500.

### 6.6 Audit logging

Add to `AuditLogAction` in `libs/system-admin-pages/src/audit-log/logger.ts`, keeping the
alphabetical ordering the enum currently maintains:

```typescript
ADD_COURT = "Add court",
```

Set on the check-answers `POST` after a successful write:

```typescript
req.auditMetadata = {
  shouldLog: true,
  action: AuditLogAction.ADD_COURT,
  entityInfo: `Court: ${result.name}, Location ID: ${result.locationId}`
};
```

## 7. Content

All content is page-specific, so `en.ts` and `cy.ts` are co-located with each controller in
`apps/web/src/pages/(system-admin)/`, per the default pattern in CLAUDE.md. Nothing goes into a lib
locale file — none of this copy is reused across pages.

Every Welsh value is given as a `[WELSH TRANSLATION REQUIRED: "…"]` marker for the post-processing script. Key
parity between `en.ts` and `cy.ts` is asserted by a test in every page's `index.njk.test.ts`.

### 7.1 `/reference-data` — added option

```typescript
// en.ts — prepended to options
{
  value: "add-court",
  label: "Add a Court or Tribunal",
  description: "Add a new court or tribunal location",
  href: "/add-court-name"
}

// cy.ts
{
  value: "add-court",
  label: [WELSH TRANSLATION REQUIRED: "Add a Court or Tribunal"],
  description: [WELSH TRANSLATION REQUIRED: "Add a new court or tribunal location"],
  href: "/add-court-name"
}
```

### 7.2 `/add-court-name`

```typescript
// en.ts
export const en = {
  title: "What is the name of the court or tribunal?",
  stepCaption: "Step 1 of 6",
  hint: "Enter the full official name. It must not already be in use.",
  nameLabel: "English name",
  welshNameLabel: "Welsh name",
  welshNameHint: "This is shown to users who choose Welsh. It is required.",
  continueButton: "Continue",
  cancelLink: "Cancel",
  backLink: "/reference-data",
  errorSummaryTitle: "There is a problem"
};
```

```typescript
// cy.ts
export const cy = {
  title: [WELSH TRANSLATION REQUIRED: "What is the name of the court or tribunal?"],
  stepCaption: [WELSH TRANSLATION REQUIRED: "Step 1 of 6"],
  hint: [WELSH TRANSLATION REQUIRED: "Enter the full official name. It must not already be in use."],
  nameLabel: [WELSH TRANSLATION REQUIRED: "English name"],
  welshNameLabel: [WELSH TRANSLATION REQUIRED: "Welsh name"],
  welshNameHint: [WELSH TRANSLATION REQUIRED: "This is shown to users who choose Welsh. It is required."],
  continueButton: Parhau,
  cancelLink: Canslo,
  backLink: "/reference-data",
  errorSummaryTitle: Mae problem
};
```

### 7.3 `/add-court-contact-details`

```typescript
// en.ts
export const en = {
  title: "What are the contact details for this court or tribunal?",
  stepCaption: "Step 2 of 6",
  hint: "You can leave these blank and add them later.",
  emailLabel: "Email address (optional)",
  contactNoLabel: "Telephone number (optional)",
  continueButton: "Continue",
  cancelLink: "Cancel",
  backLink: "/add-court-name",
  errorSummaryTitle: "There is a problem"
};
```

```typescript
// cy.ts
export const cy = {
  title: [WELSH TRANSLATION REQUIRED: "What are the contact details for this court or tribunal?"],
  stepCaption: [WELSH TRANSLATION REQUIRED: "Step 2 of 6"],
  hint: [WELSH TRANSLATION REQUIRED: "You can leave these blank and add them later."],
  emailLabel: [WELSH TRANSLATION REQUIRED: "Email address (optional)"],
  contactNoLabel: [WELSH TRANSLATION REQUIRED: "Telephone number (optional)"],
  continueButton: Parhau,
  cancelLink: Canslo,
  backLink: "/add-court-name",
  errorSummaryTitle: Mae problem
};
```

### 7.4 `/add-court-regions`

```typescript
// en.ts
export const en = {
  title: "Which regions does this court or tribunal cover?",
  stepCaption: "Step 3 of 6",
  hint: "Select all that apply.",
  continueButton: "Continue",
  cancelLink: "Cancel",
  backLink: "/add-court-contact-details",
  errorSummaryTitle: "There is a problem"
};
```

```typescript
// cy.ts
export const cy = {
  title: [WELSH TRANSLATION REQUIRED: "Which regions does this court or tribunal cover?"],
  stepCaption: [WELSH TRANSLATION REQUIRED: "Step 3 of 6"],
  hint: [WELSH TRANSLATION REQUIRED: "Select all that apply."],
  continueButton: Parhau,
  cancelLink: Canslo,
  backLink: "/add-court-contact-details",
  errorSummaryTitle: Mae problem
};
```

Region names themselves are rendered from `listRegions()`. The `region` table holds both `name` and
`welshName`, so the query must select the locale-appropriate column — it must **not** fall back to
the English name when rendering Welsh.

### 7.5 `/add-court-sub-jurisdictions`

```typescript
// en.ts
export const en = {
  title: "Which jurisdictions does this court or tribunal handle?",
  stepCaption: "Step 4 of 6",
  hint: "Select all that apply.",
  civilCourtLabel: "Civil court",
  criminalCourtLabel: "Criminal court",
  familyCourtLabel: "Family court",
  tribunalLabel: "Tribunal",
  continueButton: "Continue",
  cancelLink: "Cancel",
  backLink: "/add-court-regions",
  errorSummaryTitle: "There is a problem"
};
```

```typescript
// cy.ts
export const cy = {
  title: [WELSH TRANSLATION REQUIRED: "Which jurisdictions does this court or tribunal handle?"],
  stepCaption: [WELSH TRANSLATION REQUIRED: "Step 4 of 6"],
  hint: [WELSH TRANSLATION REQUIRED: "Select all that apply."],
  civilCourtLabel: Llys Sifil,
  criminalCourtLabel: Llys Troseddol,
  familyCourtLabel: Llys Teulu,
  tribunalLabel: [WELSH TRANSLATION REQUIRED: "Tribunal"],
  continueButton: Parhau,
  cancelLink: Canslo,
  backLink: "/add-court-regions",
  errorSummaryTitle: Mae problem
};
```

The four group-heading keys deliberately mirror those already in
`apps/web/src/pages/(system-admin)/location-jurisdiction-update/en.ts`, so the two pages read
consistently and the translations can be reused.

### 7.6 `/add-court-provenance-reference`

```typescript
// en.ts
export const en = {
  title: "How is this court identified in the source system?",
  stepCaption: "Step 5 of 6",
  hint: "CaTH matches incoming publications to this court using these values. They must match the source system exactly.",
  provenanceLabel: "Source system",
  provenanceLocationIdLabel: "Location ID in the source system",
  provenanceLocationIdHint: "For example, 458",
  provenanceLocationTypeLabel: "Location type",
  continueButton: "Continue",
  cancelLink: "Cancel",
  backLink: "/add-court-sub-jurisdictions",
  errorSummaryTitle: "There is a problem"
};
```

```typescript
// cy.ts
export const cy = {
  title: [WELSH TRANSLATION REQUIRED: "How is this court identified in the source system?"],
  stepCaption: [WELSH TRANSLATION REQUIRED: "Step 5 of 6"],
  hint: [WELSH TRANSLATION REQUIRED: "CaTH matches incoming publications to this court using these values. They must match the source system exactly."],
  provenanceLabel: [WELSH TRANSLATION REQUIRED: "Source system"],
  provenanceLocationIdLabel: [WELSH TRANSLATION REQUIRED: "Location ID in the source system"],
  provenanceLocationIdHint: [WELSH TRANSLATION REQUIRED: "For example, 458"],
  provenanceLocationTypeLabel: [WELSH TRANSLATION REQUIRED: "Location type"],
  continueButton: Parhau,
  cancelLink: Canslo,
  backLink: "/add-court-sub-jurisdictions",
  errorSummaryTitle: Mae problem
};
```

Select option values are the literal enum members and are never translated:
`SNL`, `COMMON_PLATFORM`, `CP_CATH`, `PDDA`; `VENUE`, `REGION`, `OWNING_HEARING_LOCATION`,
`NATIONAL`.

### 7.7 `/add-court-check-answers`

```typescript
// en.ts
export const en = {
  title: "Check your answers before adding this court or tribunal",
  stepCaption: "Step 6 of 6",
  warningText: "Ensure authorisation has been granted before adding a new court or tribunal location",
  nameRow: "English name",
  welshNameRow: "Welsh name",
  emailRow: "Email address",
  contactNoRow: "Telephone number",
  regionsRow: "Regions",
  subJurisdictionsRow: "Jurisdictions",
  provenanceRow: "Source system",
  provenanceLocationIdRow: "Source location ID",
  provenanceLocationTypeRow: "Location type",
  changeLink: "Change",
  notProvided: "Not provided",
  confirmButton: "Add court or tribunal",
  cancelLink: "Cancel",
  backLink: "/add-court-provenance-reference",
  errorSummaryTitle: "There is a problem"
};
```

```typescript
// cy.ts
export const cy = {
  title: [WELSH TRANSLATION REQUIRED: "Check your answers before adding this court or tribunal"],
  stepCaption: [WELSH TRANSLATION REQUIRED: "Step 6 of 6"],
  warningText: [WELSH TRANSLATION REQUIRED: "Ensure authorisation has been granted before adding a new court or tribunal location"],
  nameRow: [WELSH TRANSLATION REQUIRED: "English name"],
  welshNameRow: [WELSH TRANSLATION REQUIRED: "Welsh name"],
  emailRow: Cyfeiriad e-bost,
  contactNoRow: [WELSH TRANSLATION REQUIRED: "Telephone number"],
  regionsRow: [WELSH TRANSLATION REQUIRED: "Regions"],
  subJurisdictionsRow: [WELSH TRANSLATION REQUIRED: "Jurisdictions"],
  provenanceRow: [WELSH TRANSLATION REQUIRED: "Source system"],
  provenanceLocationIdRow: [WELSH TRANSLATION REQUIRED: "Source location ID"],
  provenanceLocationTypeRow: [WELSH TRANSLATION REQUIRED: "Location type"],
  changeLink: [WELSH TRANSLATION REQUIRED: "Change"],
  notProvided: [WELSH TRANSLATION REQUIRED: "Not provided"],
  confirmButton: [WELSH TRANSLATION REQUIRED: "Add court or tribunal"],
  cancelLink: Canslo,
  backLink: "/add-court-provenance-reference",
  errorSummaryTitle: Mae problem
};
```

### 7.8 `/add-court-success`

```typescript
// en.ts
export const en = {
  title: "Court or tribunal added",
  panelTitle: "Court or tribunal added",
  locationIdLabel: "Location ID",
  whatHappensNextHeading: "What happens next",
  whatHappensNextBody: "This court or tribunal is now available to the public and to subscribers. You can:",
  addMetadataLink: "Add a caution or no list message for this court",
  addAnotherLink: "Add another court or tribunal",
  dashboardLink: "Return to the System Admin dashboard"
};
```

```typescript
// cy.ts
export const cy = {
  title: [WELSH TRANSLATION REQUIRED: "Court or tribunal added"],
  panelTitle: [WELSH TRANSLATION REQUIRED: "Court or tribunal added"],
  locationIdLabel: [WELSH TRANSLATION REQUIRED: "Location ID"],
  whatHappensNextHeading: Beth fydd yn digwydd nesaf,
  whatHappensNextBody: [WELSH TRANSLATION REQUIRED: "This court or tribunal is now available to the public and to subscribers. You can:"],
  addMetadataLink: [WELSH TRANSLATION REQUIRED: "Add a caution or no list message for this court"],
  addAnotherLink: [WELSH TRANSLATION REQUIRED: "Add another court or tribunal"],
  dashboardLink: [WELSH TRANSLATION REQUIRED: "Return to the System Admin dashboard"]
};
```

### 7.9 Content notes

- Headings are questions, in sentence case, addressing the admin as "you" — per the GDS interface
  writing rules in `.claude/rules/design.md`.
- Hint text appears on four of six pages. Each one earns its place: step 1 warns about uniqueness
  before the admin invests effort, step 2 removes doubt about optionality, steps 3–4 state
  multi-select, step 5 explains why exact values matter. Hints should still be validated in
  research; drop any that testing shows is noise.
- The court name is **not** interpolated into step 2–5 headings in the implementation even though
  wireframe 5.4 shows it, because Welsh sentence structure does not reliably accommodate an
  inserted English proper noun in that position. Show the court name in a `govuk-caption-l` above
  the heading instead.
- No display strings are hardcoded in controllers. Region, jurisdiction and sub-jurisdiction names
  come from the database with the locale-appropriate column selected.

## 8. URL

All pages sit in the `(system-admin)` route group. Parentheses do not appear in the URL, so
`apps/web/src/pages/(system-admin)/add-court-name/index.ts` serves `/add-court-name`. Pages are
auto-discovered; no registration is required in `apps/web/src/app.ts`.

| Method | URL | Purpose | Success outcome |
|---|---|---|---|
| `GET` | `/reference-data` | Existing hub, new radio option | — |
| `GET` | `/add-court-name` | Step 1 form | 200 |
| `POST` | `/add-court-name` | Validate names, store in session | 302 → `/add-court-contact-details` |
| `GET` | `/add-court-contact-details` | Step 2 form | 200 |
| `POST` | `/add-court-contact-details` | Store contact details | 302 → `/add-court-regions` |
| `GET` | `/add-court-regions` | Step 3 form | 200 |
| `POST` | `/add-court-regions` | Store region IDs | 302 → `/add-court-sub-jurisdictions` |
| `GET` | `/add-court-sub-jurisdictions` | Step 4 form | 200 |
| `POST` | `/add-court-sub-jurisdictions` | Store sub-jurisdiction IDs | 302 → `/add-court-provenance-reference` |
| `GET` | `/add-court-provenance-reference` | Step 5 form | 200 |
| `POST` | `/add-court-provenance-reference` | Store provenance triple | 302 → `/add-court-check-answers` |
| `GET` | `/add-court-check-answers` | Step 6 summary | 200 |
| `POST` | `/add-court-check-answers` | Write the court, audit | 302 → `/add-court-success` |
| `GET` | `/add-court-success` | Confirmation panel | 200 |

Naming rationale: these are page routes, not API endpoints, so the plural/singular API convention
in CLAUDE.md does not apply. The flat `add-court-*` prefix matches the established style of
`delete-court`, `delete-court-confirm`, `delete-court-success` and `region-data-create`,
`region-data-create-success` rather than introducing a nested `/add-court/name` shape that no other
system-admin journey uses.

### Query parameters

| Parameter | Values | Applies to | Behaviour |
|---|---|---|---|
| `lng` | `en`, `cy` | all pages | Selects the locale. Handled by the existing i18n middleware, surfaced as `res.locals.locale` |
| `change` | `true` | steps 1–5 | Entered from a check-answers "Change" link. The back link and the Continue target both become `/add-court-check-answers` instead of the adjacent step |

No path parameters. Nothing identifying is placed in a URL — the in-progress court exists only in
session until confirmed, so no draft ID needs exposing.

### API routes

No new API routes. `GET /api/locations` already exists
(`libs/location/src/routes/locations.ts`) and is unaffected; a newly created court appears in its
results on the next request because there is no caching over `searchLocations()`.

## 9. Validation

Validation is server-side and authoritative. `novalidate` on every form disables browser
validation, so HTML5 attributes are progressive-enhancement hints only, exactly as on the existing
system-admin forms.

### 9.1 Field rules

| Field | Step | Required | Rules |
|---|---|---|---|
| `name` | 1 | Yes | Trimmed. Non-empty. Max 255 chars. Must not match `HTML_TAG_REGEX` (`/<[^<>]*>/`). Case-insensitively unique across `location.name` |
| `welshName` | 1 | Yes | Trimmed. Non-empty. Max 255 chars. No HTML tags. Case-insensitively unique across `location.welshName`. Required because the column is NOT NULL and `@unique` |
| `email` | 2 | No | Trimmed. If present: no HTML tags, max 255 chars, must contain a single `@` with non-empty local and domain parts. Empty → `null` |
| `contactNo` | 2 | No | Trimmed. If present: no HTML tags, max 50 chars, permitted characters are digits, space, `+`, `-`, `(`, `)`. Empty → `null` |
| `regionIds` | 3 | Yes | At least one. Every value parses to an integer and exists in `region` |
| `subJurisdictionIds` | 4 | Yes | At least one. Every value parses to an integer and exists in `sub_jurisdiction` |
| `provenance` | 5 | Yes | Must be a member of `LOCATION_REFERENCE_PROVENANCES` |
| `provenanceLocationId` | 5 | Yes | Trimmed, non-empty, max 255 chars, no HTML tags. `(provenance, provenanceLocationId)` must not already exist in `location_reference` |
| `provenanceLocationType` | 5 | Yes | Must be a member of `LOCATION_REFERENCE_TYPES` |

Max lengths mirror the `@db.VarChar` widths on `location_reference` and the effective text limits
on `location`. They are enforced in the service, not only in the template, because a client can
bypass `maxlength`.

### 9.2 Normalisation

Applied before validation, matching `parseCsv()`'s `transform: (value) => value.trim()`:

1. Trim leading and trailing whitespace on every text field.
2. Collapse internal runs of whitespace to a single space in `name` and `welshName`, so
   `"Oxford  Combined"` cannot masquerade as distinct from `"Oxford Combined"`.
3. Coerce `""` to `null` for `email` and `contactNo`.
4. Normalise a single checkbox value to a one-element array — Express yields a string, not an
   array, when only one box is ticked. `location-jurisdiction-update` already handles this:
   `Array.isArray(body.regionIds) ? body.regionIds.map(Number) : [Number(body.regionIds)]`.

### 9.3 Uniqueness checks — two-phase

Uniqueness is checked twice on purpose.

**Phase 1, at the owning step.** Immediate feedback, so the admin is not told about a name clash
after answering eight more questions.

```typescript
await prisma.location.findFirst({
  where: { name: { equals: input.name, mode: "insensitive" } }
});
```

The same case-insensitive form `validateLocationData()` already uses. Note the difference: the CSV
validator excludes the current row with `locationId: { not: row.locationId }` because it validates
upserts. Creation has no incumbent ID, so no exclusion applies.

**Phase 2, inside `createCourtLocation()` immediately before the transaction.** The session can be
minutes old and another admin may have taken the name. A `P2002` escaping the transaction is caught
and mapped back to a field-anchored error on the relevant field rather than surfacing a 500.

### 9.4 Cross-field and referential rules

- Region IDs and sub-jurisdiction IDs are re-checked against the database in
  `createCourtLocation()`, not trusted from the session. A tampered POST body must fail validation,
  not a foreign-key violation.
- Values submitted for `provenance` and `provenanceLocationType` are checked by set membership
  against the exported constants, never by string comparison to literals in the controller.
- The `location_id` is never accepted from user input on any step. It is allocated by the Postgres
  sequence inside the transaction. This is the single most important difference from the CSV route.

### 9.5 Validation parity with the CSV route

Mapping every rule in `validateLocationData()` to its Option C equivalent, as required by AC
"Validation parity":

| CSV rule | Option C |
|---|---|
| `LOCATION_ID` required and integer | Removed — allocated by the sequence |
| `LOCATION_NAME` required | `name` required, step 1 |
| `LOCATION_NAME` no HTML tags | Same regex, step 1 |
| `WELSH_LOCATION_NAME` required | `welshName` required, step 1 |
| `WELSH_LOCATION_NAME` no HTML tags | Same regex, step 1 |
| `EMAIL` no HTML tags | Retained, plus a format check the CSV route lacks |
| `CONTACT_NO` no HTML tags | Retained, plus a character-set check |
| `SUB_JURISDICTION_NAME` required | ≥1 checkbox, step 4 |
| `REGION_NAME` required | ≥1 checkbox, step 3 |
| Provenance triple required | All three required, step 5 |
| `PROVENANCE` in allowed set | Constrained by `govukSelect` and re-checked server-side |
| `PROVENANCE_LOCATION_TYPE` in allowed set | Constrained by `govukSelect` and re-checked server-side |
| Duplicate `(provenance, id)` **within the file** | N/A — one court per submission |
| Duplicate location name within the file | N/A — one court per submission |
| Duplicate Welsh name within the file | N/A — one court per submission |
| Location name already in DB at another ID | Step 1 uniqueness check |
| Welsh name already in DB at another ID | Step 1 uniqueness check |
| Sub-jurisdiction name exists in lookup table | Structurally impossible — checkboxes are built from the table |
| Region name exists in lookup table | Structurally impossible — checkboxes are built from the table |

Four rules become unnecessary because a form submits one court, and two more become structurally
impossible because the vocabularies are rendered from the database rather than typed. No rule is
silently dropped.

## 10. Error Messages

Every error is a `ValidationError { text, href }`, rendered both in `govukErrorSummary` at the top
of the page and as an inline `govuk-error-message` against the field. Unlike the CSV route's
uniform `href: "#file"`, each `href` here targets a real input or fieldset so the summary link
moves focus to the offending control.

Errors appear in each page's own `en.ts`/`cy.ts` alongside its other content.

### 10.1 `/add-court-name`

| Condition | `href` | English text |
|---|---|---|
| `name` empty | `#name` | Enter the English name of the court or tribunal |
| `name` over 255 chars | `#name` | The English name must be 255 characters or fewer |
| `name` contains HTML | `#name` | The English name cannot contain HTML tags |
| `name` already used | `#name` | A court or tribunal with this English name already exists |
| `welshName` empty | `#welshName` | Enter the Welsh name of the court or tribunal |
| `welshName` over 255 chars | `#welshName` | The Welsh name must be 255 characters or fewer |
| `welshName` contains HTML | `#welshName` | The Welsh name cannot contain HTML tags |
| `welshName` already used | `#welshName` | A court or tribunal with this Welsh name already exists |

```typescript
// en.ts
errorMessages: {
  nameRequired: "Enter the English name of the court or tribunal",
  nameTooLong: "The English name must be 255 characters or fewer",
  nameHtmlTags: "The English name cannot contain HTML tags",
  nameDuplicate: "A court or tribunal with this English name already exists",
  welshNameRequired: "Enter the Welsh name of the court or tribunal",
  welshNameTooLong: "The Welsh name must be 255 characters or fewer",
  welshNameHtmlTags: "The Welsh name cannot contain HTML tags",
  welshNameDuplicate: "A court or tribunal with this Welsh name already exists"
}

// cy.ts
errorMessages: {
  nameRequired: [WELSH TRANSLATION REQUIRED: "Enter the English name of the court or tribunal"],
  nameTooLong: [WELSH TRANSLATION REQUIRED: "The English name must be 255 characters or fewer"],
  nameHtmlTags: [WELSH TRANSLATION REQUIRED: "The English name cannot contain HTML tags"],
  nameDuplicate: [WELSH TRANSLATION REQUIRED: "A court or tribunal with this English name already exists"],
  welshNameRequired: [WELSH TRANSLATION REQUIRED: "Enter the Welsh name of the court or tribunal"],
  welshNameTooLong: [WELSH TRANSLATION REQUIRED: "The Welsh name must be 255 characters or fewer"],
  welshNameHtmlTags: [WELSH TRANSLATION REQUIRED: "The Welsh name cannot contain HTML tags"],
  welshNameDuplicate: [WELSH TRANSLATION REQUIRED: "A court or tribunal with this Welsh name already exists"]
}
```

### 10.2 `/add-court-contact-details`

| Condition | `href` | English text |
|---|---|---|
| `email` malformed | `#email` | Enter an email address in the correct format, like name@example.com |
| `email` over 255 chars | `#email` | The email address must be 255 characters or fewer |
| `email` contains HTML | `#email` | The email address cannot contain HTML tags |
| `contactNo` has disallowed characters | `#contactNo` | Enter a telephone number using only numbers, spaces, brackets, plus and hyphens |
| `contactNo` over 50 chars | `#contactNo` | The telephone number must be 50 characters or fewer |
| `contactNo` contains HTML | `#contactNo` | The telephone number cannot contain HTML tags |

```typescript
// en.ts
errorMessages: {
  emailInvalid: "Enter an email address in the correct format, like name@example.com",
  emailTooLong: "The email address must be 255 characters or fewer",
  emailHtmlTags: "The email address cannot contain HTML tags",
  contactNoInvalid: "Enter a telephone number using only numbers, spaces, brackets, plus and hyphens",
  contactNoTooLong: "The telephone number must be 50 characters or fewer",
  contactNoHtmlTags: "The telephone number cannot contain HTML tags"
}

// cy.ts
errorMessages: {
  emailInvalid: [WELSH TRANSLATION REQUIRED: "Enter an email address in the correct format, like name@example.com"],
  emailTooLong: [WELSH TRANSLATION REQUIRED: "The email address must be 255 characters or fewer"],
  emailHtmlTags: [WELSH TRANSLATION REQUIRED: "The email address cannot contain HTML tags"],
  contactNoInvalid: [WELSH TRANSLATION REQUIRED: "Enter a telephone number using only numbers, spaces, brackets, plus and hyphens"],
  contactNoTooLong: [WELSH TRANSLATION REQUIRED: "The telephone number must be 50 characters or fewer"],
  contactNoHtmlTags: [WELSH TRANSLATION REQUIRED: "The telephone number cannot contain HTML tags"]
}
```

### 10.3 `/add-court-regions`

| Condition | `href` | English text |
|---|---|---|
| No checkbox ticked | `#regionIds` | Select at least one region |
| Submitted region does not exist | `#regionIds` | Select a region from the list |

```typescript
// en.ts
errorMessages: {
  regionRequired: "Select at least one region",
  regionNotFound: "Select a region from the list"
}

// cy.ts
errorMessages: {
  regionRequired: [WELSH TRANSLATION REQUIRED: "Select at least one region"],
  regionNotFound: [WELSH TRANSLATION REQUIRED: "Select a region from the list"]
}
```

### 10.4 `/add-court-sub-jurisdictions`

| Condition | `href` | English text |
|---|---|---|
| No checkbox ticked | `#subJurisdictionIds` | Select at least one jurisdiction |
| Submitted sub-jurisdiction does not exist | `#subJurisdictionIds` | Select a jurisdiction from the list |

```typescript
// en.ts
errorMessages: {
  subJurisdictionRequired: "Select at least one jurisdiction",
  subJurisdictionNotFound: "Select a jurisdiction from the list"
}

// cy.ts
errorMessages: {
  subJurisdictionRequired: [WELSH TRANSLATION REQUIRED: "Select at least one jurisdiction"],
  subJurisdictionNotFound: [WELSH TRANSLATION REQUIRED: "Select a jurisdiction from the list"]
}
```

### 10.5 `/add-court-provenance-reference`

| Condition | `href` | English text |
|---|---|---|
| `provenance` not selected | `#provenance` | Select the source system |
| `provenance` not an allowed value | `#provenance` | Select a source system from the list |
| `provenanceLocationId` empty | `#provenanceLocationId` | Enter the location ID from the source system |
| `provenanceLocationId` contains HTML | `#provenanceLocationId` | The location ID cannot contain HTML tags |
| `(provenance, id)` already used | `#provenanceLocationId` | This source system and location ID are already used by another court or tribunal |
| `provenanceLocationType` not selected | `#provenanceLocationType` | Select the location type |
| `provenanceLocationType` not an allowed value | `#provenanceLocationType` | Select a location type from the list |

```typescript
// en.ts
errorMessages: {
  provenanceRequired: "Select the source system",
  provenanceInvalid: "Select a source system from the list",
  provenanceLocationIdRequired: "Enter the location ID from the source system",
  provenanceLocationIdHtmlTags: "The location ID cannot contain HTML tags",
  provenanceLocationIdDuplicate: "This source system and location ID are already used by another court or tribunal",
  provenanceLocationTypeRequired: "Select the location type",
  provenanceLocationTypeInvalid: "Select a location type from the list"
}

// cy.ts
errorMessages: {
  provenanceRequired: [WELSH TRANSLATION REQUIRED: "Select the source system"],
  provenanceInvalid: [WELSH TRANSLATION REQUIRED: "Select a source system from the list"],
  provenanceLocationIdRequired: [WELSH TRANSLATION REQUIRED: "Enter the location ID from the source system"],
  provenanceLocationIdHtmlTags: [WELSH TRANSLATION REQUIRED: "The location ID cannot contain HTML tags"],
  provenanceLocationIdDuplicate: [WELSH TRANSLATION REQUIRED: "This source system and location ID are already used by another court or tribunal"],
  provenanceLocationTypeRequired: [WELSH TRANSLATION REQUIRED: "Select the location type"],
  provenanceLocationTypeInvalid: [WELSH TRANSLATION REQUIRED: "Select a location type from the list"]
}
```

### 10.6 `/add-court-check-answers`

Errors here are the phase-2 re-validation failures and the write failure. The summary link returns
the admin to the owning step so they can correct the value in place.

| Condition | `href` | English text |
|---|---|---|
| Name taken since step 1 | `/add-court-name?change=true` | A court or tribunal with this English name has been added since you started. Change the English name |
| Welsh name taken since step 1 | `/add-court-name?change=true` | A court or tribunal with this Welsh name has been added since you started. Change the Welsh name |
| Provenance pair taken since step 5 | `/add-court-provenance-reference?change=true` | This source system and location ID have been used since you started. Change the location ID |
| Transaction failed for any other reason | `#` | The court or tribunal could not be added. Try again |

```typescript
// en.ts
errorMessages: {
  nameTakenSinceStart: "A court or tribunal with this English name has been added since you started. Change the English name",
  welshNameTakenSinceStart: "A court or tribunal with this Welsh name has been added since you started. Change the Welsh name",
  provenanceTakenSinceStart: "This source system and location ID have been used since you started. Change the location ID",
  writeFailed: "The court or tribunal could not be added. Try again"
}

// cy.ts
errorMessages: {
  nameTakenSinceStart: [WELSH TRANSLATION REQUIRED: "A court or tribunal with this English name has been added since you started. Change the English name"],
  welshNameTakenSinceStart: [WELSH TRANSLATION REQUIRED: "A court or tribunal with this Welsh name has been added since you started. Change the Welsh name"],
  provenanceTakenSinceStart: [WELSH TRANSLATION REQUIRED: "This source system and location ID have been used since you started. Change the location ID"],
  writeFailed: [WELSH TRANSLATION REQUIRED: "The court or tribunal could not be added. Try again"]
}
```

### 10.7 Error message rules

- Error summary title is always "There is a problem" / `Mae problem`,
  matching every other system-admin page.
- Messages are specific and actionable. "Enter the English name of the court or tribunal", never
  "This field is required".
- Errors are listed in the summary in the order the fields appear on the page, so the summary reads
  in tab order.
- Messages never echo the submitted value back into the page, avoiding a reflected-XSS surface in
  the error summary. The HTML-tag rejection messages name the rule, not the offending input.
- A duplicate-name message states the fact but does not reveal the incumbent court's location ID —
  System Admins can look that up through the existing search journeys.
- The 404 and 500 pages are the service-wide `errors/*` templates already in `libs/web-core`. No
  bespoke error pages are introduced.

## 11. Navigation

### 11.1 Entry points

1. **`/system-admin-dashboard` → "Reference Data" tile → `/reference-data` → "Add a Court or
   Tribunal"**. The primary route. No new dashboard tile is added: the existing tile's description
   ("Upload CSV data, manage jurisdiction and location data") already covers this, and the dashboard
   already lists ten tiles — an eleventh for one journey inside an existing group would degrade it.
2. **Direct URL to `/add-court-name`** — supported, since step 1 requires no prior session state.
3. **`/reference-data-upload-summary` validation errors** — these already render an
   `html` variant linking to `/region-data-create` when a region is missing. A follow-on ticket
   should add the equivalent link to `/add-court-name` when an admin's CSV references an unknown
   court, closing the loop between the two routes.

### 11.2 Forward navigation

Each `POST` on success redirects (302) to the next step. Redirect-after-POST throughout, so the
browser back button never replays a submission and a refresh on a `GET` is always safe.

| From | On success | On validation failure |
|---|---|---|
| `POST /add-court-name` | 302 `/add-court-contact-details` | 200, re-render step 1 with errors and `data` |
| `POST /add-court-contact-details` | 302 `/add-court-regions` | 200, re-render step 2 |
| `POST /add-court-regions` | 302 `/add-court-sub-jurisdictions` | 200, re-render step 3 |
| `POST /add-court-sub-jurisdictions` | 302 `/add-court-provenance-reference` | 200, re-render step 4 |
| `POST /add-court-provenance-reference` | 302 `/add-court-check-answers` | 200, re-render step 5 |
| `POST /add-court-check-answers` | 302 `/add-court-success` | 200, re-render summary with errors |

When `?change=true` is present, every step's success redirect becomes
`/add-court-check-answers` instead of the adjacent step.

### 11.3 Backward navigation

`govukBackLink` in the `{% block backLink %}` slot on all six input pages. `href` is the previous
step, or `/add-court-check-answers` when `?change=true`. Step 1's back link is `/reference-data`.
No back link on `/add-court-success` — the transaction is complete, per the GOV.UK confirmation
pages pattern.

### 11.4 Session guards

Steps 2–6 begin with:

```typescript
if (!session.addCourt) {
  return res.redirect("/add-court-name");
}
```

The same guard `location-jurisdiction-manage` and `location-jurisdiction-update` use. A redirect,
not an error page: the admin's intent is clear and restarting is the correct recovery.

`/add-court-success` guards on its own one-shot success data and redirects to `/reference-data` if
absent, so a bookmarked or refreshed success URL cannot show a stale confirmation.

### 11.5 Cancel and exit

"Cancel" is a link (`govuk-link`), not a button, on all six input pages. It points at
`/reference-data`. Because it is a `GET`, the abandoned `session.addCourt` must be cleared by the
`/reference-data` controller when it is reached from a cancel — or, more simply, by making Cancel a
`POST` to a small clear-and-redirect handler. Recommend the latter in the build ticket: a stale
session silently resurrecting on a later visit is worse than one extra handler.

### 11.6 Onward navigation from success

Three links, no buttons — none of these is a form submission:

| Link | Target | Why |
|---|---|---|
| Add a caution or no list message for this court | `/location-metadata-search` | The natural next task; a new court often needs a caution message |
| Add another court or tribunal | `/add-court-name` | Bulk-ish onboarding without returning to the hub |
| Return to the System Admin dashboard | `/system-admin-dashboard` | Standard exit |

### 11.7 Authorisation failures

`requireRole([USER_ROLES.SYSTEM_ADMIN])` guards every `GET` and every `POST`. An unauthorised
request is handled by the existing middleware behaviour — this journey introduces no bespoke
handling. Critically, the guard is on `POST` as well as `GET`: a guard applied only to `GET` would
leave the write endpoint open.

## 12. Accessibility

WCAG 2.2 AA is mandatory. Using unmodified GOV.UK Frontend macros delivers most of this; the
requirements below are the ones this journey has to get right itself.

### 12.1 Page structure

- Exactly one `h1` per page, and the `<title>` begins with the same text. On error, the title is
  prefixed `Error: ` — required by WCAG 2.4.2 so a screen-reader user hears the failure on page
  load without reaching the summary.
- Heading order is `h1` → `h2` with no skipped levels. On `/add-court-sub-jurisdictions` the
  checkbox group headings are `h2`; on `/add-court-success` "What happens next" is `h2`.
- `lang="en"` or `lang="cy"` on `<html>`, set by the base template from `res.locals.locale`.
- The Welsh-name input on step 1 carries `lang="cy"` so assistive technology pronounces it with
  Welsh phonetics even when the page is in English. This is a real requirement of a bilingual
  service and is easy to miss.
- Skip link and landmarks come from `layouts/base-template.njk`; no page overrides them.

### 12.2 Forms

- Every input has a programmatically associated `<label>` via the macro's `label` option. No
  placeholder-as-label anywhere.
- Hint text is wired through `aria-describedby` by the macro. Where a field has both a hint and an
  error, `aria-describedby` must list both IDs — the macros do this, so hand-rolled markup must not
  be substituted. Note that `delete-court/index.njk` hand-rolls its input and sets
  `aria-describedby` only for the error; do **not** copy that page's markup.
- `govukCheckboxes` on steps 3 and 4 is wrapped in a `govukFieldset` whose `legend` is the `h1`
  (`isPageHeading: true`). A checkbox group without a fieldset and legend fails 1.3.1 — the group's
  question would be invisible to a screen reader.
- `autocomplete` attributes are set where a value maps to a known token: `email` on the email
  field, `tel` on the telephone field. Court names are not personal data, so they carry
  `autocomplete="off"`. This satisfies 1.3.5 Identify Input Purpose.
- `type="email"` and `type="tel"` give mobile users the right keyboard.
- All forms are `method="post"` and `novalidate` — server-side validation is authoritative, so no
  user depends on browser validation bubbles, which are not reliably announced.

### 12.3 Error handling

- `govukErrorSummary` is the first element inside the content block and receives focus on page
  load. The macro handles the `role`, `tabindex="-1"` and focus call.
- Each summary entry is an anchor to the field's `id`. Activating it moves focus to that control —
  which is exactly why the CSV route's uniform `#file` anchor is a defect this journey must not
  reproduce.
- Inline errors use `govuk-error-message` with a visually hidden "Error:" prefix so the nature of
  the message is announced, not just its text.
- Errors are conveyed by text, not colour alone: the red border is accompanied by the message and
  the summary entry, satisfying 1.4.1.
- Submitted values are preserved on re-render. Forcing a user to retype a long court name after one
  validation failure is a 3.3 failure in practice, and this journey has nine fields.

### 12.4 Keyboard and focus

- Full journey completable by keyboard alone: `Tab` through inputs, `Space` to toggle checkboxes,
  `Enter` to submit.
- Visible focus indicator on every focusable element — the GOV.UK Frontend yellow focus style,
  unmodified. No `outline: none` anywhere in the journey's styles.
- Tab order follows DOM order, which follows visual order. No `tabindex` above 0.
- 2.4.11 Focus Not Obscured: the journey adds no sticky headers or footers, so a focused control is
  never hidden behind fixed furniture.
- 2.5.8 Target Size: standard GOV.UK checkbox (40×40 CSS px) and button sizes are used unmodified.
- On check-answers, every "Change" link has `visuallyHiddenText` naming its row
  (`Change English name`), so a screen-reader user listing links hears nine distinct
  destinations rather than nine identical "Change" links. The `govukSummaryList` macro's
  `actions.items[].visuallyHiddenText` option provides this.

### 12.5 Content and cognition

- Headings are questions in plain English, aimed at a reading age of 9 as far as the domain allows.
  Where a technical term is unavoidable — "source system", "location type" — hint text explains it
  rather than assuming knowledge.
- "Step N of 6" in a `govuk-caption-l` gives orientation without a progress bar. It is read as part
  of the heading block, so a screen-reader user hears their position.
- One question per page limits working memory load. This is the main accessibility argument for
  Option C over Option B: nine inputs and two multi-select fieldsets on one page is a significant
  cognitive and navigational burden, and its error summary can grow to eight entries at once.
- No time limits. Session expiry is the service-wide setting; nothing in this journey imposes its
  own deadline.

### 12.6 Bilingual accessibility

- Welsh is a first-class locale, not a translation overlay. Every page is tested at `?lng=cy`.
- Error messages are translated. An untranslated error would drop a Welsh-language user into
  English at the exact moment they are struggling.
- Region and jurisdiction names come from the `welsh_name` column when the locale is Welsh. Falling
  back to the English name would fail 3.1.2 Language of Parts unless the fallback is also marked
  `lang="en"` — select the right column instead.
- Locale-key parity is asserted per page:
  `expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort())`. This catches a missing Welsh
  key at build time rather than in production.

### 12.7 Progressive enhancement

The journey works with JavaScript disabled. There is no client-side validation to lose, no
autocomplete component in this journey (unlike `delete-court`, which needs one for search), and no
conditionally revealed fields. Everything is plain form posts and server-rendered responses.

### 12.8 Testing

- `axe-core` via `AxeBuilder` inline in the Playwright journey test, at the points listed in
  section 13 — not as a separate test, per the E2E guidance in CLAUDE.md.
- Both locales scanned within the same journey test.
- Manual screen-reader pass (NVDA + Firefox, VoiceOver + Safari) before the build ticket is closed,
  focusing on the error summary focus jump and the check-answers "Change" link announcements.
- Manual keyboard-only pass of the full journey including a deliberate validation failure at each
  step.

## 13. Test Scenarios

Scenario descriptions only, no test code.

### 13.1 Spike verification (#1078)

* The report at `docs/tickets/1078/report.md` covers all six options with pros, cons and effort
* Exactly one option is recommended, with stated reasoning, and each rejected option carries a
  reason for rejection
* The report names a `location_id` allocation strategy and demonstrates it cannot collide with
  `generateLocationsSql()`'s explicit IDs or with the `locationId + 100` values
  `generateLocationReferencesSql()` derives
* The report states how a UI-created court is protected from `generateRealignSql` renaming it to
  `__realign_<id>`
* The report maps every rule in `validateLocationData()` to a form equivalent or an explicit
  decision to drop it
* The report states whether the CSV route is retained, deprecated or restricted to update-only
* Follow-on implementation tickets exist and reference this specification

### 13.2 Unit tests — `libs/system-admin-pages/src/court-maintenance/service.test.ts`

Prisma is mocked; AAA comments throughout; `vi.clearAllMocks()` in `beforeEach`.

* Returns a `#name`-anchored error when the English name is empty
* Returns a `#welshName`-anchored error when the Welsh name is empty
* Returns a `#name`-anchored error when the English name matches an existing row, ignoring case
* Returns a `#welshName`-anchored error when the Welsh name matches an existing row, ignoring case
* Returns a `#provenanceLocationId`-anchored error when `(provenance, provenanceLocationId)`
  already exists
* Returns an error when the region ID list is empty
* Returns an error when the sub-jurisdiction ID list is empty
* Returns an error when a submitted region ID does not exist in `region`
* Returns an error when a submitted sub-jurisdiction ID does not exist in `sub_jurisdiction`
* Returns an error when `provenance` is outside `LOCATION_REFERENCE_PROVENANCES`
* Returns an error when `provenanceLocationType` is outside `LOCATION_REFERENCE_TYPES`
* Returns an error when any free-text field contains a value matching `HTML_TAG_REGEX`
* Accumulates multiple field errors from one submission rather than stopping at the first
* Writes nothing to any table when validation fails — asserted on the mock, not inferred
* Normalises an empty `email` and `contactNo` to `null`
* Collapses internal whitespace runs in the English and Welsh names
* Creates `location`, `location_region`, `location_sub_jurisdiction` and `location_reference`
  within a single `prisma.$transaction` on the happy path
* Returns the allocated `locationId` without the caller having supplied one
* Does not pass a `locationId` into `location.create`, proving the sequence owns allocation
* Maps a `P2002` raised inside the transaction to a field-anchored `ValidationError` rather than
  letting it propagate as a 500

### 13.3 Unit tests — page controllers

One `index.test.ts` per page, mocking the service.

* Each `GET` renders its template with `en`, `cy` and `t` present
* Each `GET` selects `cy` when `res.locals.locale` is `"cy"` and `en` otherwise
* Steps 2–6 redirect to `/add-court-name` when `session.addCourt` is absent
* Each `POST` stores its fields on `session.addCourt` and redirects to the next step on success
* Each `POST` re-renders its own template with `errors` and a repopulated `data` on failure, and
  does not redirect
* A `POST` with `?change=true` redirects to `/add-court-check-answers` instead of the next step
* Step 3's controller coerces a single checkbox string value into a one-element array
* Step 4's controller groups sub-jurisdictions by jurisdiction and resolves group headings from the
  locale file, not from hardcoded English
* Check-answers `POST` sets `req.auditMetadata` with `AuditLogAction.ADD_COURT` and an
  `entityInfo` containing the court name and allocated location ID
* Check-answers `POST` deletes `session.addCourt` before redirecting to success
* Check-answers `POST` does not set `req.auditMetadata` when the service returns errors
* Success `GET` redirects to `/reference-data` when there is no success data in session
* Success `GET` clears the success data so a refresh cannot re-show the confirmation
* `GET` and `POST` are both exported as arrays whose first element is the `requireRole` guard, on
  every page in the journey

### 13.4 Template tests — `*.njk.test.ts`

Cheerio structural assertions via `createTestEnvironment` and `render` from `@hmcts/test-support`.
No AAA comments.

* Each page renders its `h1` containing the English title
* Each page renders its `h1` containing the Welsh title when the `cy` locale object is passed
* Each page renders `Object.keys(en).sort()` equal to `Object.keys(cy).sort()`
* Step 1 renders two text inputs with ids `name` and `welshName`
* Step 1's Welsh-name input carries `lang="cy"`
* The error summary is absent when `errors` is undefined and present when it is populated
* Each summary entry's `href` matches the `href` on its `ValidationError`
* An inline `govuk-error-message` renders against the field named by each error's `href`
* An input with both a hint and an error has both IDs listed in its `aria-describedby`
* Step 3 renders one checkbox per region supplied, inside a fieldset whose legend is the `h1`
* Step 4 renders one `h2` per jurisdiction group and the right number of checkboxes under each
* Step 4 renders no group for a jurisdiction with zero sub-jurisdictions
* Step 5 renders exactly four `provenance` options and four `provenanceLocationType` options,
  matching the constant arrays
* Check-answers renders nine summary rows
* Each check-answers "Change" link has distinct `visuallyHiddenText`
* Check-answers renders multi-value rows as a list, showing names rather than numeric IDs
* Check-answers renders the `notProvided` string for an omitted optional field, not an empty cell
* Success renders a `govuk-panel` containing the court name and the allocated location ID

### 13.5 E2E tests — Playwright, `e2e-tests/tests/`

Minimum test count. One test per complete journey, with validation, Welsh and accessibility checks
folded into the journey, per CLAUDE.md.

* **`system admin can add a new court or tribunal @nightly`** — a single test covering the whole
  journey:
  * Sign in as System Admin, navigate dashboard → `/reference-data` → "Add a Court or Tribunal"
  * Submit step 1 empty; assert the error summary appears and its entry links to `#name`
  * Switch to Welsh mid-journey; assert the step 1 heading and the error message are in Welsh
  * Run an inline `AxeBuilder` scan on the step 1 error state — the highest-risk page state
  * Return to English, enter a name that already exists; assert the duplicate-name error
  * Enter a valid unique name and Welsh name; continue
  * Leave both contact fields blank; continue — proves they are genuinely optional
  * Continue past step 3 with nothing ticked; assert the "Select at least one region" error; tick
    two regions; continue
  * Tick one sub-jurisdiction; continue
  * Complete step 5; continue
  * Run an inline `AxeBuilder` scan on check-answers — the most structurally complex page
  * Use a "Change" link to amend the Welsh name and assert it returns to check-answers with the new
    value shown
  * Navigate the final button by keyboard (`Tab` then `Enter`) and confirm
  * Assert the success panel shows the court name and a location ID
  * Assert the new court is findable in the public court list in both English and Welsh, with no
    redeploy — this is the acceptance test for the whole feature
  * Assert an "Add court" entry appears in `/audit-log-list`
* **`unauthorised user cannot reach the add court journey @nightly`** — a separate test because it
  is a different journey: request step 1 and the check-answers `POST` without the System Admin role
  and assert both are refused

Test data is created in-test and removed in `global-teardown.ts`. New courts must not be seeded into
`location-data.ts` for test purposes — that file is the production source of truth and a test
fixture there would ship to STG.

### 13.6 Integration and regression checks

* `yarn db:migrate:dev` applies the `location_id` sequence migration cleanly against a database
  already populated by `locationData`
* After the migration, `generateSeedSql()` still applies without a unique-constraint violation —
  cover this in `apps/postgres/prisma/generate-seed-sql.test.ts`
* A court created through the UI still exists, with its name intact and not parked to
  `__realign_<id>`, after the generated seed SQL is applied a second time
* A court created through the UI is not soft-deleted or renamed by the seed, confirming locations
  have no reconciliation pass
* `generateReferenceDataCsv()` includes UI-created courts, so the download stays a complete export
* Re-uploading that download does not corrupt a UI-created court — the round-trip stays lossless
* The sequence's next value remains above `100000` and above every ID in `locationData` after the
  seed has run
* `yarn lint` and `yarn test` pass with no new Biome warnings

## 14. Assumptions & Open Questions

### 14.1 Assumptions

* `SYSTEM_ADMIN` is the only role that may add a court. No new role or permission is introduced.
* Adding a court is low-frequency — single figures per month. Option C's six pages are therefore an
  acceptable trade for correctness and reviewability; if the real rate is dozens per week, Option B
  or the retained CSV route is the better fit.
* A court needs exactly one provenance reference at creation. Multiple references, which the CSV
  route supports via `;`-delimited columns, are out of scope for the first build ticket.
* A newly added court legitimately has no publications and no subscriptions. Nothing in the journey
  needs to create either.
* `location_metadata` (caution and no-list messages) stays a separate task via the existing
  `location-metadata-*` journey. It is linked from the success page but not folded into the journey.
* The existing session store is durable enough for a multi-page journey. The current
  `reference-data-upload` flow already stores a whole file buffer in session, so nine short strings
  are well within tolerance.
* The i18n middleware already populates `res.locals.locale` on these routes, as it does for every
  other `(system-admin)` page.
* There is no production deployment yet, per CLAUDE.md, so this ships to local and STG only and no
  prod-specific guarding is needed in the seed generator.
* `region`, `jurisdiction` and `sub_jurisdiction` reference data is complete before a court is
  added. If a required region is missing, the admin uses `/region-data-create` first — the same
  ordering the CSV validator's "Click here to add the region" link already assumes.

### 14.2 Open questions

**Blocking the spike's recommendation:**

1. **Is `location-data.ts` frozen for new courts once the UI ships?** CLAUDE.md states it is the
   single source of truth for locations and that adding an entry there is all that is needed. Option
   C creates a second write path. Two sources of truth for the same table is a real architectural
   decision, not a detail — and `generateRealignSql` makes a name collision between them
   destructive. Recommend: freeze `locationData` for *new* courts, keep it for the existing seeded
   set, and document the split. Needs tech-lead sign-off.
2. **Which `location_id` allocation strategy?** This spec recommends a Postgres sequence starting at
   `100000`. Alternatives are application-side `MAX(location_id) + 1`, which races across web pods,
   and a plain `@default(autoincrement())` starting at 1, which collides with `locationData`
   head-on. Needs confirming before the migration is written.
3. **Is a court visible to the public the instant it is created, or does it need a staged/draft
   state?** This spec assumes immediately visible. A published court with no lists yet may look
   broken to citizens, and the `location_metadata` "no list message" exists partly for that. If a
   draft state is wanted, the schema needs a new column and this spec's journey needs a publish step.

**Blocking the build ticket, not the spike:**

4. **Does the PO accept one provenance reference at creation?** If a new court routinely needs
   several (for example both `SNL` and `COMMON_PLATFORM`), step 5 needs to become a repeatable
   add-another pattern, which is materially more work.
5. **Select or radios for `provenance` and `provenanceLocationType`?** `.claude/rules/design.md`
   says use `govukSelect` only as a last resort. Four closed options each is within radio range.
   This spec proposes selects to keep step 5 to one page; design should confirm.
6. **Is an "amend court" journey in scope?** `location-jurisdiction-update` already amends mappings
   and `location-metadata-manage` amends messages, but nothing amends `name`, `welshName`, `email`,
   `contactNo` or `location_reference` outside the CSV route. Option C's service layer is most of
   what an amend journey needs. Worth raising as a sibling ticket — it is arguably the larger real
   gap.
7. **Should the CSV route be restricted to update-only?** Leaving it able to mint primary keys keeps
   the defect Option C exists to remove. Recommend a follow-on ticket rejecting a `LOCATION_ID` in
   the CSV that does not already exist.
8. **Who supplies the Welsh court name?** `welsh_name` is NOT NULL and `@unique`, so the admin
   cannot proceed without one. Is there an authoritative source, or does the admin wait on a
   translation? If the latter, the journey blocks on an external dependency at step 1 and the team
   should know that before build.
9. **Are the `provenance_location_id` values known to the admin at the point of adding a court?**
   Step 5 assumes they are to hand. If they arrive later from another team, step 5 must become
   optional and `location_reference` creation must be deferrable — which changes the transaction
   shape.
10. **Are the four `en.ts` hint strings research-backed?** GDS guidance is to add hint text only
    where research shows it is needed. These are the spec author's judgement, not findings. Validate
    or drop them.

### 14.3 Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| `generateRealignSql` renames a UI-created court whose name is later added to `location-data.ts` | Court disappears from search under a `__realign_<id>` name; publications stop matching | Medium — grows with every `locationData` edit | Freeze `locationData` for new courts (Q1); add a `generate-seed-sql.test.ts` assertion that the realign list derives only from `locationData` |
| ID allocation collides with the seeded range | Deploy seed overwrites a UI-created court's name via `ON CONFLICT (location_id) DO UPDATE` | Low if the sequence starts at `100000`; high with a naive autoincrement | Sequence starting well above the seeded band; regression test asserting disjointness |
| Two sources of truth for `location` diverge between environments | A court exists on STG but not locally, so a bug is not reproducible | Medium | Document the split; treat UI-created courts as environment-local data, not reference data |
| Welsh name unavailable when the court is needed | Journey cannot be completed — the column is NOT NULL | Medium | Escalate Q8 before build; a placeholder-then-amend flow needs the amend journey (Q6) to exist first |
| Concurrent admins take the same name between session start and confirm | Confusing failure at the last step, after nine questions | Low | Phase-2 re-validation plus `P2002` mapping already specified; message tells the admin exactly which field to change |
| Only one provenance reference supported | Court added through the UI is incomplete and needs a CSV follow-up, defeating the point | Medium | Resolve Q4 before build; if multiple are needed, size the add-another pattern in |
| Six pages proves too slow for the real add-a-court rate | Admins keep using the CSV route and the feature goes unused | Low–Medium | Validate the assumed frequency with the PO; Option B is the documented fallback and shares the same service layer |
| Spike concludes Option F (upstream sync) is strategically right | Option C becomes interim work | Low | Option C's per-court transactional write is a prerequisite for any reconciliation layer, so it is not wasted either way |



### Comment by OgechiOkelu on 2026-09-25T14:54:38Z

@plan 

