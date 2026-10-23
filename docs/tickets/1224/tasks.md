# Tasks — Issue #1224: Make provenance a fixed set of values

Ordered by dependency. The package move (A) must land before any consumer (B onwards), because every other
change imports from its new location.

See `plan.md` for the reasoning behind each decision. Do **not** add Welsh `cy.ts` content for this ticket —
every string involved is an API response body or APIM policy XML.

---

## A. Move the source of truth into `libs/list-types/common`

- [ ] `git mv libs/publication/src/provenance.ts libs/list-types/common/src/provenance.ts`
- [ ] `git mv libs/publication/src/provenance.test.ts libs/list-types/common/src/provenance.test.ts`
- [ ] Add `PROVENANCES` (`Object.values(Provenance)`, declaration order) to `provenance.ts` with a comment
      noting the order drives the `400` message
- [ ] Add `EXTERNAL_PROVENANCES` (`PROVENANCES` minus `MANUAL_UPLOAD`) with a comment explaining the
      location-resolution difference
- [ ] Add `isProvenance(value: string): value is Provenance` and `isExternalProvenance(value: string): boolean`
- [ ] Confirm module ordering per CLAUDE.md: enum, then consts, then exported functions; leave
      `PROVENANCE_LABELS` byte-identical
- [ ] Add a `./provenance` subpath export to `libs/list-types/common/package.json`, mirroring the existing
      `./list-type-provenance` entry
- [ ] Add the barrel line to `libs/list-types/common/src/index.ts` (Biome enforces placement — between
      `./pdf/pdf-utilities.js` and `./rendering/crown-utilities.js`)
- [ ] Replace `libs/publication/src/index.ts:20` with a re-export from
      `@hmcts/list-types-common/provenance` covering all six symbols, so the 43 existing
      `import { PROVENANCE_LABELS } from "@hmcts/publication"` call sites are untouched
- [ ] Re-point `libs/publication/src/repository/queries.ts:5` from `../provenance.js` to
      `@hmcts/list-types-common/provenance`
- [ ] Confirm no root `tsconfig.json` change is needed (subpaths resolve via the workspace `exports` field, as
      `@hmcts/list-types-common/list-type-provenance` already does) — `yarn lint` is the check

## B. Backend validation (`libs/api`)

- [ ] Delete `ALLOWED_PROVENANCES` and `EXTERNAL_PROVENANCES` from
      `libs/api/src/blob-ingestion/validation.ts:10-11`
- [ ] Import `PROVENANCES`, `isProvenance`, `isExternalProvenance` from `@hmcts/publication` (line 3 already
      imports from there — no new dependency edge)
- [ ] Replace the provenance check at `:29` with `isProvenance`, building the message from
      `PROVENANCES.join(", ")` — the output must stay byte-identical
- [ ] Hoist `const isValidProvenance = isProvenance(metadata.provenance)` above the error push so it can be
      reused
- [ ] Wrap the location-resolution block (`:70-84`) in `if (isValidProvenance) { ... }` — defect 6
- [ ] Add a comment explaining why resolution is skipped (the request is already doomed, and the
      `MANUAL_UPLOAD` branch would otherwise append a misleading `x-court-id` error)
- [ ] Confirm the check stays in `validatePublicationMetadata` — do **not** move it into
      `parsePublicationHeaders`, which truncates to one error and emits the generic `Unable to parse …` sentence
- [ ] Delete `PROVENANCE_MAP` from `libs/api/src/blob-ingestion/repository/service.ts:11-17` (an identity map —
      a no-op that reads like validation)
- [ ] Simplify `:152` and `:174` to `provenance: metadata.provenance`
- [ ] Remove `Provenance` from the `@hmcts/publication` import at `repository/service.ts:3` (no remaining use)

## C. Type narrowing

- [ ] Narrow `PublicationMetadata.provenance` to `Provenance` —
      `libs/api/src/blob-ingestion/publication-headers.ts:147`; add `Provenance` to the line 2 import
- [ ] Change `publication-headers.ts:94` to `provenance as Provenance` with a comment justifying the cast and
      noting it is why the runtime guard in B cannot be dropped
- [ ] Narrow `ArtefactResponse.provenance` to `Provenance` —
      `libs/api/src/blob-ingestion/artefact-response.ts:130` (built only from `metadata.provenance`, zero cost)
- [ ] Narrow `GeneratePdfParams.provenance?` to `Provenance` —
      `libs/publication/src/processing/service.ts:115` (stays optional)
- [ ] Narrow `ProcessPublicationParams.provenance` to a **required** `Provenance` —
      `libs/publication/src/processing/service.ts:740`
- [ ] Replace `provenance: provenance ?? ""` with `provenance` at `processing/service.ts:876`
- [ ] Import `Provenance` in `processing/service.ts` from `@hmcts/list-types-common/provenance`
- [ ] Verify **no** change to `libs/publication/src/repository/model.ts:14` (`Artefact.provenance` stays
      `string` — clarification 2) and **no** change to `libs/publication/src/repository/queries.ts:24`
      (`ArtefactMetadata.provenance` holds a display *label*, not a provenance — see `queries.ts:279`)
- [ ] Verify **no** change to `libs/legacy-third-party-fulfilment/src/push/headers.ts:12`,
      `src/service.ts:19`, or `libs/test-support/src/types.ts:36` (all fed from `Artefact.provenance`)
- [ ] Verify the unrelated publisher/IdP concept is untouched: `libs/publication/src/authorisation/service.ts:8`,
      `libs/auth/src/user-profile.ts:6`, `libs/list-types/common/src/list-type-data.ts:5`,
      `libs/list-types/common/src/list-type-provenance.ts`

## D. Fold the location-reference duplicate (`libs/location`)

- [ ] Rewrite `libs/location/src/repository/location-reference-model.ts:1-2` to derive
      `LOCATION_REFERENCE_PROVENANCES` from `EXTERNAL_PROVENANCES` and
      `LocationReferenceProvenance` from `Provenance`, importing from
      `@hmcts/list-types-common/provenance` (not the barrel — the barrel pulls in puppeteer via `pdf-utilities`)
- [ ] Confirm both exported names are preserved so `libs/location/src/index.ts:19,21` need no change
- [ ] Confirm `libs/system-admin-pages/src/reference-data-upload/validation/validation.ts:80-84` compiles
      unchanged and the CSV error text is identical (same four values, same order)

## E. APIM gateway policy (`infrastructure`)

- [ ] Add the provenance gate to `<inbound>` in
      `infrastructure/resources/operation-policies/createPublication.xml`, **after** `<base />` so the Azure AD
      token check in `infrastructure/resources/api-policy/api-policy.xml` still yields `401` first
- [ ] Use `GetValueOrDefault("x-provenance", "").Trim()` to match `readHeader`
      (`publication-headers.ts:108-113`)
- [ ] Include the `!= ""` clause so absent/empty/whitespace-only values fall through to the backend's
      mandatory-header message
- [ ] List all five values, including `MANUAL_UPLOAD`, so the gateway set equals the enum (clarification 3)
- [ ] Emit `400` with `Content-Type: application/json` and a `{ "message", "timestamp" }` body whose `message`
      is byte-identical to the backend's, built by string concatenation (no C# `$"…"` interpolation)
- [ ] Add a comment pointing at `libs/list-types/common/src/provenance.ts` and stating both lists must be kept
      in step
- [ ] Add a comment recording that `/v1/publication` is not in `local.apim_operations` and so bypasses this
      gate, which is why the backend check is authoritative (clarification 6)
- [ ] Confirm **no new XML file** is created — `infrastructure/apim-operation.tf:3-6` keys its `for_each` on the
      basename and the apply fails unless it matches an imported `operationId`

## F. API documentation

- [ ] Expand the `Provenance` parameter `description` in `docs/api/openapi.yaml` (around `:499`): case
      sensitivity, the `400` consequence, per-provenance `x-court-id` interpretation, whitespace trimming.
      Leave the `enum` at `:502` unchanged
- [ ] Add one sentence to the `createPublication` description block (around `:238-247`) noting an unrecognised
      `x-provenance` may be rejected at the gateway before reaching the service
- [ ] Confirm the YAML still parses — `infrastructure/apim.tf:9` `yamldecode`s this file, so a syntax error
      breaks `terraform plan`

## G. Tests

### `libs/list-types/common/src/provenance.test.ts`

- [ ] `PROVENANCES` contains exactly the five values in declaration order
- [ ] `EXTERNAL_PROVENANCES` contains the four non-manual values and not `MANUAL_UPLOAD`
- [ ] `isProvenance` true for each member; false for an unknown value, `""`, `snl` and `Manual_Upload`
- [ ] `isExternalProvenance` false for `MANUAL_UPLOAD`, true for the other four
- [ ] Restate the existing label-coverage test over `PROVENANCES` so a new enum member fails until labelled

### `libs/api/src/blob-ingestion/validation.test.ts`

- [ ] Confirm `:104-114` passes **unedited** (regression guard on the wire message)
- [ ] Update the `metadata()` fixture at `:36` to `Provenance.MANUAL_UPLOAD`, and `:106` / `:284` to
      `"INVALID" as Provenance` with a comment that the cast is the point of the test
- [ ] Table-driven: each of the five provenances is accepted; `MANUAL_UPLOAD` resolves numerically, the four
      external ones resolve via `getLocationByProvenanceLocationId`
- [ ] An invalid provenance produces exactly one error, keyed `x-provenance`
- [ ] **Defect-6 regression:** invalid provenance + non-numeric `x-court-id` yields **only** the
      `x-provenance` error (this test fails against today's code)
- [ ] **No database work:** with an invalid provenance, assert `getLocationById` and
      `getLocationByProvenanceLocationId` were **not called**, on the mocks
- [ ] Invalid provenance + unknown `x-list-type` yields both errors joined with `", "` in that order
- [ ] **APIM/backend parity** `describe`: read `createPublication.xml` via
      `path.resolve(__dirname, "../../../../infrastructure/resources/operation-policies/createPublication.xml")`,
      assert the quoted values in the `<when>` condition equal `PROVENANCES`, and assert the `<set-body>`
      sentence equals the message `validatePublicationMetadata` returns for an invalid provenance

### `libs/api/src/blob-ingestion/publication-headers.test.ts`

- [ ] Confirm `:156` (`"  SNL  "` → `SNL`) still passes — the APIM `.Trim()` is matched to it
- [ ] Absent, empty and whitespace-only `x-provenance` each report the mandatory-header message, and the
      allowlist message never appears at this layer

### `apps/api/src/routes/v1/publication.test.ts`

- [ ] Update the metadata fixture at `:45` to `Provenance.SNL` (leave the raw header string at `:27`)
- [ ] Invalid provenance → `400`, allowlist message, truthy `timestamp`, body has no `errors` property
- [ ] Invalid provenance on the LCSU path → `400` and `uploadHtmlToS3` never called
- [ ] Invalid provenance on the flat-file path → `400` and no blob written

### Consolidation guard

- [ ] Add a guard test asserting no `.ts` file under `libs/` or `apps/` declares an array literal containing two
      or more artefact-provenance names outside `provenance.ts`. Model it on
      `libs/list-types/common/src/validation/guard.test.ts`
- [ ] Scope the guard to array literals so `PUBLISHER_PROVENANCES` and the `PROVENANCE_LABELS` /
      `provenanceLabels` object literals are not false positives; comment that the label objects are a known
      divergent duplicate the guard deliberately does not cover (clarification 5)

### E2E — verify only, add nothing

- [ ] Confirm `e2e-tests/tests/api/blob-ingestion.spec.ts:190` still passes (no new spec file, no new test —
      the existing assertion is `expect(body.message).toBeTruthy()`, so the unchanged message cannot break it)
- [ ] Confirm `e2e-tests/tests/api/flat-file-ingestion.spec.ts:164` still passes

## H. Verification

- [ ] `yarn lint:fix` then `yarn lint` from the repo root — clean
- [ ] `yarn test` from the repo root — all workspaces green, including the previously-unedited regression
      assertions in `validation.test.ts` and `reference-data-upload/validation/validation.test.ts`
- [ ] Confirm the workspace build type-checks with the narrowed `Provenance` fields (the build is the assertion
      for acceptance scenario 9)
- [ ] Confirm no Prisma change was made: no new file in `libs/postgres-prisma/prisma/schema/`, no migration, and
      `yarn db:generate` / `yarn db:migrate:dev` were not needed
- [ ] `yarn test:e2e` — the two existing invalid-header journeys pass
- [ ] `terraform fmt -check` / `terraform validate` in `infrastructure/` for the policy and YAML changes

## I. Manual STG verification after deploy (APIM policies are not reachable from automated tests)

- [ ] `POST` the APIM `/publication` path with a valid publisher token and `x-provenance: INVALID_PROVENANCE` →
      `400` with the allowlist message, **and no corresponding entry in the API pod logs**
- [ ] Same request with `x-provenance: SNL` and otherwise valid headers → `201` (happy path intact)
- [ ] Same request with `x-provenance` omitted → `400` with
      `x-provenance is mandatory however an empty value is provided` (the `!= ""` fall-through works)
- [ ] Same request with `x-provenance: "  SNL  "` → `201` (policy `.Trim()` matches `readHeader`)
- [ ] Unauthenticated request with `x-provenance: INVALID_PROVENANCE` → `401`, not `400` (the gate sits after
      `<base />`)
- [ ] Check App Insights `400` rates for `x-provenance` before/after, confirming no publisher was relying on an
      out-of-set value

## J. Raise before review closes

- [ ] Get a decision on clarification 1 (Prisma enum — the ticket's first acceptance bullet)
- [ ] Get sign-off on clarification 2 (`Artefact.provenance` stays `string`, so acceptance scenario 9 is only
      partially met)
- [ ] Raise a separate defect for clarification 5 — `PROVENANCE_LABELS` vs `provenanceLabels` disagree on `SNL`
      (`"SNL"` vs `"ListAssist"`) and `CP_CATH` (`"CP-CaTH"` vs `"Libra"`), both rendered to the public, with
      `list-type-handler.ts:165` and `:281` falling back from one to the other. **Do not change the strings in
      this ticket** — which label is correct is a product question, and `cy.ts` carries the English value
      untranslated
- [ ] Confirm whether `libs/test-support` is mounted on STG (clarification 4) — a prerequisite for any
      `SELECT DISTINCT provenance` audit under clarification 1
