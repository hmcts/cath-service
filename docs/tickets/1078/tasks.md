# Tasks — #1078: Spike — Court Maintenance

**This is a spike.** These tasks are investigation and writing. Option C is **not** built under
#1078 — it is specified in `plan.md` so it can be lifted into follow-on build tickets.

## Investigation

- [ ] Confirm the current CSV-only route end to end: `GET /reference-data-download` →
      spreadsheet edit → `POST /reference-data-upload` → `GET /reference-data-upload-summary` →
      `POST /reference-data-upload-summary`, and record that there is no "add a court" page.
- [ ] Confirm the five hard constraints against the code and record the file reference for each:
      (1) `Location.locationId` has no default or sequence; (2) `welshName` is NOT NULL and
      `@unique`; (3) `generateRealignSql` renames by name and locations have no soft-delete
      reconciliation; (4) `generateLocationReferencesSql()` reserves `provenance_location_id`
      `locationId + 100` under `SNL`; (5) `upsertLocations()` is whole-estate and
      `deleteMany`-then-recreates all three junction tables.
- [ ] Record the asymmetry finding: region, jurisdiction, sub-jurisdiction, location↔jurisdiction
      mapping, location metadata and delete-court all have non-CSV journeys in
      `apps/web/src/pages/(system-admin)/`; only the core `location` row does not.
- [ ] Inventory the reusable building blocks (`createJurisdictionData()` validation shape,
      `JurisdictionDataSession` + deep-link guard, `listRegions()` /
      `listJurisdictionsWithSubJurisdictions()` checkbox builders, `req.auditMetadata`,
      `/reference-data` radio list) and the two gaps (`AuditLogAction.ADD_COURT` missing; no cache
      layer over locations, so no invalidation work is needed).
- [ ] Enumerate and assess Options A–F, each with pros, cons, a dev-day estimate (or an explicit
      "not estimable" for F), and how it fares against the five constraints.

## Decisions the recommendation depends on

- [ ] Settle the `location_id` allocation strategy. Compare `MAX(location_id) + 1`, plain
      `@default(autoincrement())` from 1, and a reserved sequence at `100000`; **prove** the chosen
      one is collision-free against both `generateLocationsSql()`'s
      `ON CONFLICT (location_id) DO UPDATE` and the derived `provenance_location_id` values 101–127.
- [ ] Settle the deploy-seed / realign protection: whether `location-data.ts` is frozen for new
      court entries, what the documented split is, and the `generate-seed-sql.test.ts` assertion that
      the realign list derives solely from `locationData`. Escalate the two-sources-of-truth question
      to the tech lead — the recommendation is not final without a decision.
- [ ] Complete the validation-parity mapping: map each of the 21 `#file`-anchored rules in
      `libs/system-admin-pages/src/reference-data-upload/validation/validation.ts` to a form-level
      field-anchored equivalent, a schema constraint that makes it unreachable, or an explicit
      decision to drop it. Reconcile the total back to 21 so no rule is silently lost.
- [ ] Decide the CSV route's future: keep it for bulk work, and recommend a follow-on ticket
      narrowing it to update-only so it can no longer mint primary keys.

## Write and socialise the report

- [ ] Write `docs/tickets/1078/report.md`: current state and the five constraints; the options matrix
      (pros / cons / effort / constraint risks per option); exactly **one** highlighted
      recommendation with a one-line rejection reason for each rejected option; the three supporting
      decisions with their justification; the 21-rule parity mapping; open questions and risks with
      an owner against each.
- [ ] Raise the spike-blocking questions with the tech lead and PO: is `location-data.ts` frozen for
      new courts; which ID allocation strategy; does a new court need a draft/staged state.
- [ ] Confirm the assumed add-a-court frequency with the PO. If it is dozens per week rather than
      single figures per month, Option B or the CSV route wins and the recommendation must change
      before sign-off.
- [ ] Raise the build-blocking questions with the PO, design and content: one provenance reference or
      add-another; select vs radios for the two four-option vocabularies; who supplies the mandatory
      unique Welsh name; are `provenance_location_id` values to hand at creation; are the hint
      strings research-backed.

## Follow-on tickets

- [ ] Raise the Option C build tickets, individually shippable and ordered, attaching the `/spec`
      comment sections 5–13 by reference: (1) sequence migration + `court-maintenance` service and
      transactional write + `AuditLogAction.ADD_COURT`; (2) steps 1–2 pages and the `/reference-data`
      radio entry; (3) steps 3–4 checkbox pages; (4) step 5 provenance page; (5) check-answers,
      success page and the E2E journey with inline axe checks.
- [ ] Raise the sibling ticket for an "amend court" journey (`name`, `welshName`, `email`,
      `contactNo`, `location_reference` — nothing outside the CSV route amends these today).
- [ ] Raise the sibling ticket restricting the CSV route to update-only.
- [ ] Raise the Option F discovery spike for upstream SNL / Common Platform sync, noting the
      cross-team dependency, the divergence-reconciliation policy, the missing soft-delete story and
      the Welsh-name gap.
- [ ] Get `report.md` reviewed by the tech lead and PO, fold in the answers to the spike-blocking
      questions, and close #1078.
