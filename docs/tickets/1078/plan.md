# Technical Plan — #1078: Spike — Court Maintenance

> **This is a spike.** Label: `spike`. The deliverable of #1078 is a written investigative report at
> `docs/tickets/1078/report.md` plus a set of follow-on build tickets. **No production code lands
> under #1078** — no new pages, no migration, no service, no schema change, no content files.
> Everything in this plan that describes the recommended option exists so it can be lifted into
> build tickets, not so it can be built now.

---

## 1. Technical Approach

This plan has two clearly separated parts.

**Part (a) — the investigation and the report.** The work #1078 actually pays for: confirm how court
locations are added today, enumerate the realistic alternatives, score each against the hard
constraints the schema and the deploy seed impose, settle the three decisions that a recommendation
is meaningless without (ID allocation, deploy-seed protection, the CSV route's future), and write
`report.md` with an options matrix and exactly one highlighted recommendation.

**Part (b) — the recommended option, specified.** Enough shape on Option C that build tickets can be
raised without redoing the analysis: page layout, service/session/audit code location, the sequence
migration, the single-transaction write. Sizing only — not a build script, and explicitly not built
under #1078.

### 1.1 The problem, stated precisely

A System Admin adds a court today only by CSV round-trip: `GET /reference-data-download` exports
every `location` row, the admin appends a row in a spreadsheet **and invents the primary key**, then
`POST /reference-data-upload` → `GET /reference-data-upload-summary` →
`POST /reference-data-upload-summary` re-upserts the whole file. There is no "add a court" page.
Note what *does* exist in `apps/web/src/pages/(system-admin)/`: region create/modify/delete,
jurisdiction and sub-jurisdiction create/modify/delete, location↔jurisdiction/region mapping
management, location metadata management, and a four-page delete-court journey. Every neighbouring
piece of reference data has a non-CSV journey. The core `location` row is the only one that does not.
That asymmetry is the finding, and it makes the gap a filling-in exercise rather than a new pattern.

### 1.2 The five hard constraints

Any option must be scored against these. They are verified against the codebase, not assumed.

1. **`Location.locationId` has no default and no Postgres sequence.**
   `libs/postgres-prisma/prisma/schema/location.prisma` declares
   `locationId Int @id @map("location_id")` — no `@default(autoincrement())`. Every writer must
   supply the ID. The CSV admin currently invents it. Any UI write path must decide where the ID
   comes from, and must do so in a way that cannot race between web pods.
2. **`welshName` is NOT NULL and globally `@unique`.** So is `name`. `email` and `contactNo` are
   nullable. A court cannot be created without an authoritative Welsh name — this is a content
   dependency, not a technical one, and it constrains every option equally including Option F.
3. **The deploy seed rewrites names.** `apps/postgres/prisma/generate-seed-sql.ts` (run by
   `apps/postgres/start.sh`) emits `generateRealignSql("location", ...)` **first**:
   `UPDATE location SET name = '__realign_' || location_id, welsh_name = '__realign_w_' || location_id WHERE name IN (...) OR welsh_name IN (...)`,
   built from the names in `libs/location/src/location-data.ts`. `generateLocationsSql()` then
   `INSERT ... ON CONFLICT (location_id) DO UPDATE SET name = EXCLUDED.name, welsh_name = EXCLUDED.welsh_name`.
   The hazard is **name collision, not deletion** — unlike `list_types`, locations have no
   soft-delete reconciliation, so a UI-created court with an ID outside `locationData` survives
   deploys untouched. But if its *name* is later added to `location-data.ts` under a different ID,
   the court is parked at `__realign_<id>` and never restored.
4. **`location_reference` has a second collision surface.** `generateLocationReferencesSql()` mints
   deterministic ids `seedref_<locationId>` with `provenance = 'SNL'` and
   `provenance_location_id = String(locationId + 100)`, with
   `ON CONFLICT (provenance, provenance_location_id) DO UPDATE`. `LocationReference` is
   `@@unique([provenance, provenanceLocationId])`. So the seeded band reserves not only
   `location_id` 1–27 but also `provenance_location_id` 101–127 under `SNL`.
5. **`upsertLocations()` is whole-estate, not per-court.**
   `libs/system-admin-pages/src/reference-data-upload/repository/upload-repository.ts` runs one
   `prisma.$transaction`, iterates **every** parsed row, upserts `location`, and `deleteMany`
   then re-creates `locationSubJurisdiction`, `locationRegion` and `locationReference`. A stale
   download therefore reverts other admins' edits, and a blank column silently wipes existing
   mappings. This is a correctness defect, not just an ergonomics one.

### 1.3 The central architectural tension

CLAUDE.md declares `libs/location/src/location-data.ts` the **single source of truth** for locations,
and states that adding an entry there is all that is needed for it to appear on every environment.
Any UI write path creates a **second source of truth for the same table**. That is a real
architectural decision requiring tech-lead sign-off, not an implementation detail — and constraint 3
makes divergence between the two destructive rather than merely untidy. The report must present this
as the spike's headline decision, with the recommendation being: freeze `location-data.ts` for *new*
court entries once a UI ships, retain it for the existing seeded 27, document the split, and treat
UI-created courts as environment-local data rather than reference data.

Note also the low-frequency assumption the whole recommendation rests on: adding a court is believed
to be single figures per month. If it is dozens per week, a multi-page journey is the wrong answer
and the report's recommendation flips (see §5, Q13).

### 1.4 What already exists to reuse

Relevant because it is what makes Option C a 5–8 day job rather than a 15 day one. Each is a live,
tested pattern in this repo:

| Need | Existing thing to copy |
|---|---|
| Field-anchored validation service returning `ValidationError[]` with real `href`s, `HTML_TAG_REGEX` check, `checkUniqueness()` before write | `createJurisdictionData()` in `libs/system-admin-pages/src/jurisdiction-management/service.ts` |
| Session-carried multi-page journey + deep-link guard | `JurisdictionDataSession` in `libs/system-admin-pages/src/session-types.ts`; `if (!session.locationJurisdiction) return res.redirect(...)` in `location-jurisdiction-manage` |
| Grouped region / sub-jurisdiction checkboxes | `listRegions()` and `listJurisdictionsWithSubJurisdictions()`, already shaped by `location-jurisdiction-update` |
| Audit entry | `req.auditMetadata = { shouldLog, action, entityInfo }`, consumed by `libs/system-admin-pages/src/audit-log/middleware.ts` |
| Court autocomplete (for a later amend journey) | `data-autocomplete="true"` against `GET /api/locations?q=&language=` — `libs/location/src/routes/locations.ts` → `searchLocations()`, as used by `delete-court` |
| Entry point | `/reference-data` is a radio list of four `{ value, label, description, href }` entries in `apps/web/src/pages/(system-admin)/reference-data/en.ts` and `cy.ts` |

Two gaps worth recording now: `AuditLogAction` in
`libs/system-admin-pages/src/audit-log/logger.ts` has `ADD_JURISDICTION`, `ADD_REGION`,
`ADD_SUB_JURISDICTION`, `DELETE_COURT` and `REFERENCE_DATA_UPLOAD` but **no `ADD_COURT`** — one must
be added. And there is **no Redis or cache layer** over locations
(`libs/location/src/repository/service.ts` and `queries.ts` hit Prisma directly), so a newly created
court is visible immediately with no invalidation step. That removes a whole class of work people
usually assume is needed here.

---

## 2. Implementation Details

**TEMPLATE SOURCE: n/a**

No rendered page is built under #1078, so the migrate-pip-pages skill does not apply. The follow-on
build tickets for the recommended option would carry **TEMPLATE SOURCE: write fresh** — these are
system-admin forms with no pip-frontend equivalent.

### 2.1 Deliverable of #1078

One file: `docs/tickets/1078/report.md`. Structure:

1. How courts are added today, and why it is inadequate — the five constraints in §1.2, each stated
   with its file reference.
2. The options matrix (§2.2) — one row per option, pros / cons / effort / constraint risks.
3. Per-option detail, one short subsection each, ending in a single-line verdict.
4. The recommendation, highlighted unambiguously, with the three supporting decisions (§2.3) and
   their justification.
5. The 21-rule validation-parity mapping (§3.6).
6. Open questions and risks (§5), each tagged with an owner.
7. The follow-on tickets proposed, sized and ordered.

Verification of #1078 is **review of `report.md`**, not tests. There is nothing to test.

### 2.2 Options matrix — must appear in `report.md`

| # | Option | Pros | Cons | Effort | Constraint risks | Verdict |
|---|---|---|---|---|---|---|
| A | Do nothing — keep the CSV round-trip | Zero cost; live and tested; genuinely good at bulk onboarding | Fails the issue's premise outright. Admin invents the PK (c1). Whole-estate upsert reverts other admins (c5). All 21 errors anchored `#file` — the error summary can never link to a field (WCAG 2.2 AA 3.3.1/3.3.3). Audit records a *filename*, not a court | 0 d | Leaves c1 and c5 unaddressed | **Rejected** — does not meet the ACs |
| B | Single "Add a court" page — all ~9 inputs on one page | Cheapest real journey: one controller, one template, one service fn, two content files. Fast for a repeat expert user. Mirrors `region-data-create` almost exactly | Violates GOV.UK one-thing-per-page at nine inputs with two multi-select fieldsets and three closed vocabularies. No check-answers gate, so a Welsh-name typo reaches a `@unique` column unreviewed. Poor error recovery for screen-reader and magnifier users on a long page | 2–3 d | Fixes c1 and c5; weakest on accessibility | **Viable fallback** if C is descoped — shares C's service layer, so no work is thrown away |
| C | Multi-page one-question-per-page journey: names → contact → regions → sub-jurisdictions → provenance → check answers → confirmation | The only option idiomatic GOV.UK at this input volume. Every error anchors to a real field. Check-answers is a review gate before a unique-constrained write. Reuses five existing tested building blocks (§1.4). Per-court write touches one `location` row, so it cannot revert another admin. Extends naturally to "amend court" by pre-populating from `getLocationWithDetails()` | Seven pages to build, translate and test — the largest surface of the form options. Session state introduces the mid-journey deep-link case (already solved elsewhere in this codebase). Slower than CSV for bulk, so it must not replace the CSV route | 5–8 d incl. unit, template and E2E tests | Fixes c1 (via the sequence), c5 (per-court write); c2 and c3 handled by the supporting decisions | **RECOMMENDED** |
| D | Developer edits `location-data.ts`, deploy seed propagates | Zero new UI. Keeps one source of truth, exactly as CLAUDE.md prescribes. Version-controlled, peer-reviewed, reproducible across environments | Needs a developer, a PR and a release **per court** — precisely the burden this issue exists to remove. A System Admin cannot self-serve. Lead time is a release cycle | 0 new UI | None — it is the mechanism the constraints were designed around | **Rejected as the primary route.** Must still be recorded in the report as the *currently documented* mechanism, and Option C's deliberate divergence from it flagged |
| E | Paste-CSV `govukTextarea`, reusing `parseCsv()` unchanged | Cheapest literal removal of "needing to use a csv file". No new validation code | Satisfies the letter of the ticket and none of its intent. Inherits every CSV defect: `#file`-anchored errors, admin-supplied PK, whole-estate upsert. Asking a user to hand-author delimited text in a textarea is *worse* accessibility than a file picker, not better | 0.5 d | Fixes nothing | **Rejected** |
| F | Automated sync from upstream SNL / Common Platform reference data | The only option that removes manual court maintenance entirely. Provenance data becomes authoritative rather than hand-typed, directly addressing the `@@unique([provenance, provenanceLocationId])` collision class | Depends on an upstream API contract, availability and ownership this spike has not established — cross-team dependency, not a local change. Needs a divergence-reconciliation policy (upstream rename vs local edit) and a soft-delete story locations do not have. Welsh names are unlikely to be available upstream while `welsh_name` is NOT NULL + `@unique` (c2), so a manual step survives regardless | Not estimable without upstream discovery | Would need to solve c2, c3 and a new reconciliation policy | **Separate discovery spike.** Does not block C; C's per-court transactional write is a prerequisite for any reconciliation layer, so C is not wasted work either way |

### 2.3 Recommendation — Option C, with three supporting decisions

The report must justify all three. A recommendation of "Option C" without them is not actionable,
because constraints 1 and 3 have no default answer.

**Decision 1 — ID allocation: reserved high-ID band.** A dedicated Postgres sequence starting at
`100000`, created by migration and attached as the column default so `locationId` becomes omissible
in the Prisma `create`. The report must compare all three candidates and show the chosen one is
provably collision-free against **both** `generateLocationsSql()` and the `+100`
`provenance_location_id` values:

| Strategy | Collision analysis | Verdict |
|---|---|---|
| Application-side `MAX(location_id) + 1` | Read-then-write with no lock. Two web pods confirming simultaneously compute the same max and one fails on the `location_id` PK — or worse, in a future variant, silently overwrite. Also produces IDs immediately adjacent to `locationData`'s band, so the next `locationData` addition can collide | Rejected — races between pods |
| `@default(autoincrement())` starting at 1 | Collides head-on: `locationData` already occupies 1–27, and the sequence would hand out 1 first. `ON CONFLICT (location_id) DO UPDATE` in `generateLocationsSql()` would then rewrite a UI-created court's name and Welsh name on the next deploy. Also collides with the derived `provenance_location_id = locationId + 100` values 101–127 | Rejected — guaranteed collision |
| Sequence starting at `100000` (**chosen**) | `locationData` holds IDs 1–27 and derives `provenance_location_id` 101–127. The `100000+` band is disjoint from both by four orders of magnitude, leaving ~99,973 IDs of headroom before the seeded band could ever reach it. Sequence allocation is atomic inside Postgres, so it cannot race between pods — the same reason CLAUDE.md prefers `INSERT ... ON CONFLICT` over Prisma `upsert` for the deploy seed | **Chosen** |

Illustrative migration shape (for the build ticket, not for #1078):

```sql
CREATE SEQUENCE location_location_id_seq START WITH 100000 OWNED BY location.location_id;
ALTER TABLE location ALTER COLUMN location_id SET DEFAULT nextval('location_location_id_seq');
```

with the Prisma model becoming
`locationId Int @id @default(dbgenerated("nextval('location_location_id_seq')")) @map("location_id")`
or `@default(autoincrement())` with the sequence restarted — the build ticket picks whichever keeps
`prisma migrate diff` clean. The seed's explicit `location_id` inserts continue to work unchanged
because an explicit value bypasses the default; `setval` is deliberately **not** called, so the seed
never advances the UI band.

**Decision 2 — deploy-seed protection.** UI-created IDs sit outside `locationData`, and locations have
no soft-delete reconciliation, so `generateLocationsSql()` never touches them. The residual hazard is
constraint 3: `generateRealignSql` renaming a UI-created court whose *name* later appears in
`location-data.ts`. Mitigation, all three parts:

- Freeze `location-data.ts` for **new** court entries once the UI ships; retain it for the existing
  seeded 27. Needs tech-lead sign-off (§5, Q1).
- Document the split explicitly in CLAUDE.md so the "single source of truth" statement stops being
  silently false.
- Add an assertion in `apps/postgres/prisma/generate-seed-sql.test.ts` that the emitted realign list
  derives **solely** from `locationData` names — i.e. a row not named in `locationData` is never
  renamed. This is a regression guard against someone widening the realign predicate later.

**Decision 3 — keep the CSV route.** Option C is one court at a time; the CSV route stays for bulk
work, which it is genuinely good at. Recommend a follow-on ticket narrowing it to **update-only** so
it can no longer mint primary keys — rejecting a `LOCATION_ID` that does not already exist. Without
that, Option C removes the defect from one path while leaving it live on the other.

### 2.4 Recommended-option shape for the build tickets

Sizing information for ticket-raising. Not to be built under #1078.

```
apps/web/src/pages/(system-admin)/
├── add-court-name/                   # step 1 — English + Welsh name
├── add-court-contact-details/        # step 2 — email + contact number (both optional)
├── add-court-regions/                # step 3 — region checkboxes, >= 1
├── add-court-sub-jurisdictions/      # step 4 — grouped sub-jurisdiction checkboxes, >= 1
├── add-court-provenance-reference/   # step 5 — provenance, provenance location id, type
├── add-court-check-answers/          # step 6 — summary list + Change links; POST does the write
└── add-court-success/                # confirmation panel with name + allocated locationId
```

Each directory: `index.ts` (controller), `index.njk`, co-located `en.ts` / `cy.ts`, `index.test.ts`,
and `*.njk.test.ts` where the template has conditional rendering. Content is page-specific so it is
co-located, per CLAUDE.md — **not** exported from a lib.

```
libs/system-admin-pages/src/court-maintenance/
├── service.ts        # createCourtLocation(session) -> ValidationError[] | { locationId }
├── service.test.ts
├── queries.ts        # uniqueness checks + the single prisma.$transaction write
└── queries.test.ts
```

Shape copied from `createJurisdictionData()` — validate first, return `ValidationError[]` with real
field anchors and write nothing, or write and return the allocated id.

Other touch points, all small:

- `AuditLogAction.ADD_COURT` added in `libs/system-admin-pages/src/audit-log/logger.ts`; the
  check-answers POST sets `req.auditMetadata` so the existing middleware records the court name and
  allocated id — a real entity, unlike `REFERENCE_DATA_UPLOAD`'s filename.
- `SystemAdminSession` extended with an `addCourt` namespace in
  `libs/system-admin-pages/src/session-types.ts`, cleared on success.
- One new radio entry in `apps/web/src/pages/(system-admin)/reference-data/en.ts` and `cy.ts` —
  `{ value, label, description, href }`, matching the four existing entries.
- Prisma sequence migration per Decision 1, in `libs/postgres-prisma/`.
- One `prisma.$transaction` writing `location` + `location_region` + `location_sub_jurisdiction` +
  `location_reference`. Junction rows are **created**, never `deleteMany`-then-recreated — this is
  the specific departure from `upsertLocations()`.
- Reuse in the controllers, with `.js` extensions as ESM requires, e.g.
  `import { listRegions } from "@hmcts/location";` and
  `import { createCourtLocation } from "../../../../../libs/system-admin-pages/src/court-maintenance/service.js";`
  (in practice via the `@hmcts/system-admin-pages` alias).
- `requireRole([USER_ROLES.SYSTEM_ADMIN])` on **both** `GET` and `POST` of all seven pages, exported
  as `RequestHandler[]`.

**No new API endpoints.** `GET /api/locations` already exists for autocomplete and nothing in the
journey needs a fresh route. **No cache invalidation.** There is no cache.

Wireframes, per-page content tables and the full test matrix are already written up — see the
`/spec` comment on #1078, sections 5–13. They are deliberately not re-copied here; the build tickets
should attach them by reference.

---

## 3. Error Handling & Edge Cases

These are what the report must show Option C handles and the CSV route does not. They become
acceptance criteria on the build tickets, not on #1078.

### 3.1 Uniqueness — `name` and `welshName`

Both are `@unique` and the CSV validator already compares case-insensitively. Checked at step 1 with
errors anchored `#name` / `#welshName`, so the GOV.UK error summary links to the offending field —
the thing 21 `#file` anchors cannot do.

### 3.2 Uniqueness — `(provenance, provenanceLocationId)`

`@@unique([provenance, provenanceLocationId])`, checked at step 5, anchored
`#provenanceLocationId`. Must also be checked against the seeded `SNL` / `locationId + 100` values
so an admin cannot pick a value the next deploy will fight over.

### 3.3 Two-phase uniqueness and the concurrent-admin race

Uniqueness is checked at the step **and re-checked at confirm**, because another admin may take the
name in between. The re-check narrows the window but does not close it, so the transaction must also
map Prisma `P2002` onto the specific field and return a field-anchored error rather than a 500. The
message must name which field to change — failing opaquely after nine questions is the worst possible
outcome. Nothing is written on either failure path.

### 3.4 Input rejection and empty selections

- `HTML_TAG_REGEX` rejection on `name`, `welshName`, `email`, `contactNo` — same rule as the CSV
  path, but anchored to the field that failed.
- Zero checkboxes ticked on regions (step 3) or sub-jurisdictions (step 4) → error anchored to the
  fieldset, per the GOV.UK checkboxes pattern. The CSV path already treats both as required.
- `email` and `contactNo` are nullable in the schema, so step 2 must be genuinely skippable and must
  not invent empty strings — write `null`.

### 3.5 Journey, authorisation and atomicity

- Mid-journey deep link with no session → redirect to step 1. Copy the guard from
  `location-jurisdiction-manage`.
- Non-`SYSTEM_ADMIN` on **GET or POST** → `requireRole` blocks and nothing is written. The POST guard
  matters as much as the GET one; a guard on GET alone is a hole.
- The write is one `prisma.$transaction`, so a failure at any insert leaves no orphan
  `location_region` / `location_sub_jurisdiction` / `location_reference` rows and no half-created
  court. `onDelete: Cascade` on both junctions covers subsequent deletion.
- Session cleared on success so a back-button re-POST cannot create a duplicate.

### 3.6 Validation parity — the 21 rules

`libs/system-admin-pages/src/reference-data-upload/validation/validation.ts` contains **21**
`ValidationError` pushes, **every one** with `href: "#file"`. The report must map each to one of
three outcomes: a form-level equivalent with a real anchor, a schema constraint that makes it
unreachable, or an explicit decision to drop it. Anything unmapped is a regression the UI would
introduce. Grouped, the 21 are:

| Group | Rules | Expected mapping |
|---|---|---|
| Required fields | `LOCATION_NAME`, `WELSH_LOCATION_NAME`, `SUB_JURISDICTION_NAME`, `REGION_NAME`, the combined provenance-triple rule, `PROVENANCE`, `PROVENANCE_LOCATION_ID`, `PROVENANCE_LOCATION_TYPE` | Field-level required errors on steps 1, 3, 4, 5 |
| HTML tag rejection | `LOCATION_NAME`, `WELSH_LOCATION_NAME`, `EMAIL`, `CONTACT_NO` | Same `HTML_TAG_REGEX`, field-anchored |
| Closed vocabulary | `PROVENANCE` not in `LOCATION_REFERENCE_PROVENANCES` (`SNL`, `COMMON_PLATFORM`, `CP_CATH`, `PDDA`); `PROVENANCE_LOCATION_TYPE` not in `LOCATION_REFERENCE_TYPES` (`VENUE`, `REGION`, `OWNING_HEARING_LOCATION`, `NATIONAL`) | Unreachable by construction — radios or a select can only offer valid values. Still needs a server-side guard against a tampered POST |
| In-file duplication | duplicate `(PROVENANCE, PROVENANCE_LOCATION_ID)` within the file; `LOCATION_NAME` across multiple IDs; `WELSH_LOCATION_NAME` across multiple IDs | **Drop** — a single-court journey has no "file" to be internally inconsistent with. Record the decision explicitly rather than letting it look like an oversight |
| Database uniqueness | `LOCATION_NAME` exists under a different ID; `WELSH_LOCATION_NAME` exists under a different ID | §3.1, plus `P2002` mapping (§3.3) |
| Referential | sub-jurisdiction not found in reference data; region not found in reference data | Unreachable — checkboxes are built from `listRegions()` / `listJurisdictionsWithSubJurisdictions()`, so only existing rows can be selected |

The exact count per group must be reconciled against the file when the mapping is written; the point
of the task is that the total reconciles to 21 with no rule silently lost.

---

## 4. Acceptance Criteria Mapping

#1078's ACs. Verification is **review of `report.md`** — there is no code to test.

| AC | How it is satisfied | How it is verified |
|---|---|---|
| Various options for adding new court locations through the System Admin portal, without needing to use a CSV file, are investigated | Six options A–F in §2.2, spanning do-nothing, single-page form, multi-page journey, code-plus-deploy, paste-CSV, and upstream sync. Each scored against the five hard constraints in §1.2 | Reviewer confirms `report.md` contains all six with constraint scoring, and that the non-CSV span is genuine rather than six variants of one idea |
| An investigative report with the pros and cons of the various options is provided | `docs/tickets/1078/report.md`, structured per §2.1, with the options matrix giving pros, cons, effort and constraint risks per option | Reviewer confirms every option has at least one pro **and** one con and a dev-day estimate (or an explicit "not estimable", as for F) |
| The best solution is highlighted in the investigative report | Option C highlighted unambiguously, with the three supporting decisions (§2.3) justified — including the collision-freedom proof for the ID band — and a one-line rejection reason for each of A, B, D, E, F | Reviewer confirms exactly one option is highlighted, that the three decisions are present and reasoned, and that the follow-on build tickets exist and are individually shippable |

**The recommended option's own acceptance criteria are inherited by the build tickets, not verified
here.** Bilingual `en`/`cy` parity, the `ADD_COURT` audit entry, the `requireRole` guard on GET and
POST, WCAG 2.2 AA with axe checks inline in the E2E journey, the court surviving a deploy seed, and
locale-key parity assertions all belong to those tickets. #1078 ships a document.

---

## 5. CLARIFICATIONS NEEDED

Split by what actually blocks what. Getting the first three answered is the difference between a
recommendation and an opinion.

### Blocking the spike's recommendation

1. **Is `location-data.ts` frozen for new courts once a UI ships?** *(tech lead)* CLAUDE.md states it
   is the single source of truth for locations and that adding an entry there is sufficient. Option C
   creates a second write path to the same table, and `generateRealignSql` makes a name collision
   between the two destructive (constraint 3). Recommend: freeze for new courts, retain for the
   seeded 27, document the split, treat UI-created courts as environment-local data. This needs
   sign-off — the recommendation cannot be finalised without it.
2. **Which `location_id` allocation strategy?** *(tech lead)* This plan recommends a Postgres sequence
   starting at `100000`. Alternatives are application-side `MAX + 1` (races across web pods) and
   plain `@default(autoincrement())` from 1 (collides head-on with `locationData` 1–27 and with the
   derived `provenance_location_id` 101–127). Confirm before the migration is written.
3. **Is a new court publicly visible the instant it is created, or does it need a draft/staged
   state?** *(PO)* This plan assumes immediately visible. A published court with no lists may look
   broken to citizens — `location_metadata`'s "no list message" exists partly for that. A draft state
   needs a **new schema column and a publish step**, which changes the journey and the estimate, so
   it cannot be deferred to the build ticket.

### Blocking the build ticket, not the spike

4. **One provenance reference at creation, or a repeatable add-another pattern?** *(PO)* The CSV route
   supports several via `;`-delimited columns. If a new court routinely needs both `SNL` and
   `COMMON_PLATFORM`, step 5 becomes materially more work and a court created through the UI with one
   reference would need a CSV follow-up — defeating the point.
5. **`govukSelect` or radios for `provenance` and `provenanceLocationType`?** *(design)*
   `.claude/rules/design.md` says select is a last resort. Four closed options each is within radio
   range; selects keep step 5 to one page. Design to confirm.
6. **Is an "amend court" journey in scope?** *(PO)* Nothing outside the CSV route amends `name`,
   `welshName`, `email`, `contactNo` or `location_reference` —
   `location-jurisdiction-update` amends mappings and `location-metadata-manage` amends messages,
   neither touches the core row. This is arguably the **larger real gap** than adding a court, and
   Option C's service layer is most of what it needs. Raise as a sibling ticket.
7. **Restrict the CSV route to update-only?** *(tech lead / PO)* Leaving it able to mint primary keys
   keeps live the exact defect Option C exists to remove. Recommend a follow-on ticket rejecting a
   `LOCATION_ID` that does not already exist.
8. **Who supplies the mandatory unique Welsh name, and does step 1 block on a translation
   dependency?** *(PO / content)* `welsh_name` is NOT NULL and `@unique`, so the admin cannot proceed
   without one. If there is no authoritative source and the admin waits on a translation, the journey
   blocks on an external dependency at its first step — the team should know that before build, and
   a placeholder-then-amend workaround requires Q6's amend journey to exist first.
9. **Are `provenance_location_id` values to hand at creation time?** *(PO)* Step 5 assumes yes. If
   they arrive later from another team, step 5 must become deferrable and `location_reference`
   creation optional — **which changes the transaction shape** and therefore the design, not just the
   content.
10. **Are the hint strings in the spec's content tables research-backed?** *(design / user research)*
    GDS guidance is to add hint text only where research shows it is needed. Those are the spec
    author's judgement, not findings. Validate or drop.
11. **Is `SYSTEM_ADMIN` the right and only role?** *(PO)* Assumed, matching every other
    `(system-admin)` page. Confirm no separate reference-data role is planned.
12. **Does `location_metadata` stay a separate journey?** *(PO)* Assumed yes, linked from the success
    page rather than folded in, using the existing `location-metadata-*` pages.
13. **Is the assumed add-a-court frequency real?** *(PO)* The recommendation assumes single figures
    per month, which is what makes six pages an acceptable trade for correctness and reviewability.
    **If it is dozens per week, Option B or the retained CSV route wins and the recommendation
    changes.** This is the single assumption most capable of invalidating the report, so it should be
    confirmed before the report is signed off rather than after.

### Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| `generateRealignSql` renames a UI-created court whose name is later added to `location-data.ts` | Court vanishes from search as `__realign_<id>`; publications stop matching. Never restored | Medium — grows with every `locationData` edit | Freeze `locationData` for new courts (Q1); assert in `generate-seed-sql.test.ts` that the realign list derives solely from `locationData` |
| ID allocation collides with the seeded band | `ON CONFLICT (location_id) DO UPDATE` in the deploy seed overwrites a UI-created court's name and Welsh name | Low with a sequence at `100000`; **high** with naive autoincrement from 1 | Sequence well above the seeded band; regression test asserting the two bands are disjoint |
| Two sources of truth for `location` diverge between environments | A court exists on STG but not locally, so a bug is not reproducible | Medium | Document the split; treat UI-created courts as environment-local data, not reference data |
| Welsh name unavailable when the court is needed | Journey cannot be completed at all — the column is NOT NULL | Medium | Escalate Q8 before build; a placeholder-then-amend flow needs Q6's amend journey first |
| Concurrent admins take the same name between session start and confirm | Confusing failure at the last step, after nine questions answered | Low | Two-phase re-validation plus `P2002` field mapping (§3.3); message names the field to change |
| Only one provenance reference supported | A UI-created court is incomplete and needs a CSV follow-up, defeating the point | Medium | Resolve Q4 before build; size the add-another pattern in if needed |
| Six pages too slow for the real add-a-court rate | Admins keep using the CSV route and the feature goes unused | Low–Medium | Confirm frequency with the PO (Q13); Option B is the documented fallback and shares the same service layer |
| Option F turns out to be strategically right | Option C becomes interim work | Low | C's per-court transactional write is a prerequisite for any reconciliation layer, so it is not wasted either way |
