# Technical Plan — Issue #1224: Make provenance a fixed set of values

Requirements source: the `/spec` comment on the issue (`docs/tickets/1224/ticket.md`, §1–§14). That spec
is authoritative and is not restated here. This document resolves its open decisions and turns §6 into an
ordered, file-by-file change set. Where this plan departs from the spec, it says so and why.

---

## 1. Technical Approach

### The ticket's premise is wrong, and that changes the shape of the work

The ticket says "the provenance field is a String with no validation applied". It is validated today.
`libs/api/src/blob-ingestion/validation.ts:29` already rejects an unrecognised `x-provenance` with `400`
and the exact message `Invalid x-provenance. Allowed values: MANUAL_UPLOAD, SNL, COMMON_PLATFORM, CP_CATH, PDDA`,
`docs/api/openapi.yaml:502` already documents the five values as an `enum`, and both
`e2e-tests/tests/api/blob-ingestion.spec.ts:190` and `flat-file-ingestion.spec.ts:164` already assert the
rejection. No publisher can currently succeed with an out-of-set provenance on the inbound API.

So "add validation" is already done. The real work is three things:

1. **Single-sourcing.** The value set is currently declared in *five* places, not one:
   - `Provenance` enum — `libs/publication/src/provenance.ts:1`
   - `ALLOWED_PROVENANCES` — `libs/api/src/blob-ingestion/validation.ts:10` (bare string array)
   - `EXTERNAL_PROVENANCES` — `libs/api/src/blob-ingestion/validation.ts:11`
   - `LOCATION_REFERENCE_PROVENANCES` — `libs/location/src/repository/location-reference-model.ts:1`
   - `PROVENANCE_MAP` — `libs/api/src/blob-ingestion/repository/service.ts:11` **(missed by the spec — see below)**

   Plus a sixth, divergent copy of the *display labels* (`PROVENANCE_LABELS` vs `provenanceLabels`), which is
   a live user-facing bug — see §6, clarification 5.

2. **Closing defect 6.** `validation.ts:72-84` resolves the location regardless of whether the provenance was
   accepted. Confirmed: with `x-provenance: INVALID`, control falls into the `else` (MANUAL_UPLOAD) branch,
   parses `x-court-id` as a number, and either issues a `getLocationById` query whose result is thrown away or
   — if `x-court-id` is non-numeric — appends a second, misleading `x-court-id must be a valid number` error to
   a request whose only fault was the provenance.

3. **Adding the APIM gate.** `infrastructure/resources/operation-policies/createPublication.xml` is confirmed to
   contain nothing but `<base />` passthroughs, so spec §6.6 applies as written.

### `PROVENANCE_MAP` — a fifth duplicate the spec missed

`libs/api/src/blob-ingestion/repository/service.ts:11-17`:

```typescript
const PROVENANCE_MAP: Record<string, string> = {
  MANUAL_UPLOAD: Provenance.MANUAL_UPLOAD,
  SNL: Provenance.SNL,
  ...
};
```

It is an identity map. `PROVENANCE_MAP[x] || x` evaluates to `x` for every one of the five values **and** for
every value outside the set, so the expression at `:152` (the artefact write) and `:174` (the processing
hand-off) is a no-op that reads like validation. Delete it outright. This is the highest value-per-line change
in the ticket and it is in the write path.

### Where the single source of truth lives: `libs/list-types/common`

Spec §6.5 and open question 3 flag a possible circular dependency. **Confirmed, and resolved in favour of
option (a).** `libs/publication/package.json` lists `@hmcts/location` as a dependency, so a
`location → publication` edge is forbidden by CLAUDE.md pitfall 7. But both `libs/publication` and
`libs/location` already depend on `@hmcts/list-types-common`, and `libs/list-types/common` depends on neither.
So `provenance.ts` moves to `libs/list-types/common/src/provenance.ts`, next to the existing sibling
`list-type-provenance.ts` whose comment already warns readers about the two concepts. No new dependency edges.

`@hmcts/publication` re-exports the symbols so the 43 files that `import { PROVENANCE_LABELS } from "@hmcts/publication"`
are untouched.

### Which of the ticket's six "possible solutions" are delivered

| Ticket bullet | Delivered? |
|---|---|
| "Validation is added to the provenance field so that it can only be a fixed set of values" | Yes — already present; now derived from the enum (§2.2) |
| "Provenance is fixed to a specific set of values" | Yes — `PROVENANCES`/`isProvenance` become the only declaration (§2.1) |
| "Validation fails if provenance is not found" | Yes — unchanged `400`, plus defect 6 fixed so the message names only `x-provenance` (§2.2) |
| "Validation is added at the APIM level ... similar to the validation in HMI" | Yes — inbound gate in `createPublication.xml` (§2.7) |
| "Validation is implemented on Azure APIM level" | Same bullet as above |
| "Make Provenance enum in pip data model" | **Declined.** See below |

**Prisma enum declined** (spec §6.7, summarised): the schema contains no Prisma enums at all —
`Artefact.type`, `Artefact.sensitivity` and `Artefact.language` each have a TypeScript enum and are all still
`String` columns, so making `provenance` the lone exception is an inconsistency nobody can explain. The
`ALTER TABLE ... USING provenance::provenance_enum` migration fails outright on any pre-existing out-of-set row,
and STG data predates all validation. The payoff is a constraint on a column nothing can write an invalid value
to once §2.2–§2.4 land. If the team wants it, it is a separate ticket covering all four columns, starting with a
`SELECT DISTINCT` audit per environment. **This is clarification 1 — it is the ticket's first acceptance bullet,
so it needs an explicit decision before the ticket closes.**

### Type narrowing: narrower than the spec asks, and deliberately so

Spec §6.4 and the ninth acceptance scenario want `Artefact.provenance` typed `Provenance`. **Do not do it.**
Three verified reasons:

- `Artefact` is both the write DTO (`createArtefact(data: Artefact)`, `queries.ts:38`) **and** the read model:
  `getArtefactsByLocation` and `getArtefactsByIds` (`queries.ts:118`, `:142`) return the raw Prisma result
  directly as `Promise<Artefact[]>`. Narrowing forces an unchecked `as Artefact[]` at each site — an assertion
  over an unconstrained `String` column containing rows that predate validation. That is a lie in the type
  system, not a guarantee.
- TypeScript string enums are nominal: `const p: Provenance = "MANUAL_UPLOAD"` does **not** compile. There are
  447 `provenance: "..."` literal assignments across 122 files. Roughly 14 of them are
  `apps/web/src/pages/(list-types)/*/index.test.ts` fixtures that deliberately mock `getArtefactById` with
  `provenance: "UNKNOWN_SOURCE"` / `"UNKNOWN_PROVENANCE"` to exercise the `?? provenance` fallback in
  `resolveDataSource` (`list-type-handler.ts:165`). Narrowing deletes that coverage to buy nothing.
- The write path gets its safety anyway: once `PROVENANCE_MAP` is deleted, `buildArtefact`
  (`repository/service.ts:152`) writes `metadata.provenance`, which **is** typed `Provenance` after §2.3. The
  one site that persists a publication is provably in-set without touching the read model.

Decisions per field, all verified by reading the file:

| Target | Decision |
|---|---|
| `PublicationMetadata.provenance` — `publication-headers.ts:147` | **Narrow** to `Provenance`. This is the gate-adjacent type; everything else is downstream of it |
| `ArtefactResponse.provenance` — `artefact-response.ts:130` | **Narrow**. Built only from `metadata.provenance` (`:28`, `:62`) — zero cost |
| `GeneratePdfParams.provenance?` — `processing/service.ts:115` | **Narrow**, stays optional |
| `ProcessPublicationParams.provenance?` — `processing/service.ts:740` | **Narrow and make required**; drop the `?? ""` fallback at `:876`. An artefact must not be pushed with an empty provenance |
| `Artefact.provenance` — `publication/repository/model.ts:14` | **Decline** — reasons above. Clarification 2 |
| `ArtefactMetadata.provenance` — `publication/repository/queries.ts:24` | **Decline — the brief's fact list is wrong about this one.** `queries.ts:279` assigns `PROVENANCE_LABELS[artefact.provenance] \|\| artefact.provenance`. The field holds a *display label* ("Manual Upload"), not a provenance. Narrowing it would be incorrect |
| `PushHeaderParams.provenance` — `legacy-third-party-fulfilment/src/push/headers.ts:12` | **Decline.** `apps/web/src/pages/(admin)/remove-list-confirmation/index.ts:140` feeds it `artefact.provenance` straight from `getArtefactsByIds`. Narrowing it while `Artefact` stays `string` breaks compilation; also needs a new `@hmcts/list-types-common` dependency on a package that currently has only two |
| `ThirdPartyPushParams.provenance` — `legacy-third-party-fulfilment/src/service.ts:19` | **Decline** — same call site, same reason |
| `CreateArtefactInput.provenance?` — `test-support/src/types.ts:36` | **Decline.** `artefacts.ts:51` writes it straight to Prisma and `artefacts.test.ts:141` seeds `"SYSTEM"` on purpose. Clarification 4 |

**Out of scope, must not be touched** — all three verified as the unrelated publisher/IdP concept:
`libs/publication/src/authorisation/service.ts:8` (`provenance: string[]`, hydrated from
`listType.allowedProvenance`), `libs/auth/src/user-profile.ts:6` (`CFT_IDAM`/`PI_AAD`/`CRIME_IDAM`/`SSO`),
`libs/list-types/common/src/list-type-data.ts:5`. `MANUAL_UPLOAD` must never leak into any of them.

### Welsh

**No Welsh content is required and none should be added.** Every string this ticket touches is either a JSON
API response `message` for a machine-to-machine endpoint with no locale negotiation, or APIM policy XML. Do not
create `cy.ts` files for this ticket. (The pre-existing Welsh defect in the provenance *labels* is clarification 5
and is explicitly not fixed here.)

---

## 2. Implementation Details

**TEMPLATE SOURCE: n/a** — this ticket renders no page.

**No database schema change.** `libs/postgres-prisma/prisma/schema/base.prisma:23` keeps `provenance String`,
and `IngestionLog.sourceSystem` (`:83`) stays `String` because it also records non-provenance source identifiers.
No new `.prisma` file, no migration, no `yarn db:generate`, no `yarn db:migrate:dev`. See the Prisma-enum
rationale in §1 and clarification 1.

Change set in dependency order. The package move (2.1) must land before every consumer.

### 2.1 Move the source of truth into `libs/list-types/common`

```
git mv libs/publication/src/provenance.ts      libs/list-types/common/src/provenance.ts
git mv libs/publication/src/provenance.test.ts libs/list-types/common/src/provenance.test.ts
```

Extend `libs/list-types/common/src/provenance.ts` with the derived members from spec §6.2–§6.3 — keep the enum
and `PROVENANCE_LABELS` byte-identical. CLAUDE.md module ordering: enum first, then module-level consts, then
exported functions. No types needed, so nothing at the bottom.

```typescript
export enum Provenance { /* unchanged, 5 members */ }

/** Declaration order — this is the order publishers see in the 400 message. */
export const PROVENANCES: readonly Provenance[] = Object.values(Provenance);

/** Every provenance except MANUAL_UPLOAD: these supply their own location IDs, resolved
 *  against location_reference. MANUAL_UPLOAD supplies a numeric CaTH location ID. */
export const EXTERNAL_PROVENANCES: readonly Provenance[] = PROVENANCES.filter((p) => p !== Provenance.MANUAL_UPLOAD);

export const PROVENANCE_LABELS: Record<string, string> = { /* unchanged */ };

export function isProvenance(value: string): value is Provenance { /* includes */ }

export function isExternalProvenance(value: string): boolean { /* includes */ }
```

Both guards are case-sensitive by construction, which is the required behaviour.

Add a `./provenance` subpath to `libs/list-types/common/package.json`, mirroring the existing
`./list-type-provenance` entry:

```json
"./provenance": {
  "production": "./dist/provenance.js",
  "default": "./src/provenance.ts"
}
```

**The subpath is worth having, not redundant with the barrel.** `libs/list-types/common/src/index.ts:54-70`
re-exports `./pdf/pdf-utilities.js`, which pulls in `@hmcts/pdf-generation` → `puppeteer`. `libs/location` is
imported by almost everything; it must not acquire puppeteer at module-eval time just to read five strings.
`libs/location/src/seed-list-types.ts:5` already imports `@hmcts/list-types-common/list-type-provenance` for
exactly this reason — follow that precedent. **No root `tsconfig.json` change is needed**: subpaths resolve
through the workspace `exports` field (there is no path entry for `@hmcts/list-types-common/list-type-provenance`
either). `yarn lint` will confirm.

Also add the barrel line to `libs/list-types/common/src/index.ts` for consumers that already pull the barrel
(Biome enforces the export ordering — place it between `./pdf/pdf-utilities.js` and `./rendering/crown-utilities.js`):

```typescript
export { EXTERNAL_PROVENANCES, isExternalProvenance, isProvenance, PROVENANCE_LABELS, PROVENANCES, Provenance } from "./provenance.js";
```

### 2.2 Re-export from `@hmcts/publication` so 43 call sites stay untouched

`libs/publication/src/index.ts:20` currently reads
`export { PROVENANCE_LABELS, Provenance } from "./provenance.js";`. Replace with:

```typescript
export { EXTERNAL_PROVENANCES, isExternalProvenance, isProvenance, PROVENANCE_LABELS, PROVENANCES, Provenance } from "@hmcts/list-types-common/provenance";
```

43 files import `PROVENANCE_LABELS` from `@hmcts/publication` (verified count); none of them change.

One internal import needs re-pointing: `libs/publication/src/repository/queries.ts:5`
(`import { PROVENANCE_LABELS } from "../provenance.js"`) → `@hmcts/list-types-common/provenance`.

### 2.3 `libs/api/src/blob-ingestion/validation.ts` — consume the enum, short-circuit the location work

Delete lines 10-11 (`ALLOWED_PROVENANCES`, `EXTERNAL_PROVENANCES`). Import
`EXTERNAL_PROVENANCES` is *not* needed here — import `PROVENANCES`, `isProvenance`, `isExternalProvenance`
from `@hmcts/publication` (line 3 already imports `buildNoMatchLocationId` from there, so no new edge).

Then apply spec §6.2 verbatim: compute `const isValidProvenance = isProvenance(metadata.provenance)` once, push
the error when false, and wrap the whole location-resolution block (currently lines 70-84) in
`if (isValidProvenance) { ... }`. Keep the existing comment about `NoMatch`, and add why the block is skipped.

The emitted message is **byte-identical**: `PROVENANCES.join(", ")` reproduces the enum declaration order, which
matches the order of the deleted array. `validation.test.ts:104-114` therefore keeps passing with no edit — that
is a deliberate regression guard, not a test to rewrite.

**The check stays in `validatePublicationMetadata`.** Do not move it next to the `x-language`/`x-sensitivity`/`x-type`
enum checks in `parsePublicationHeaders`: that layer truncates to a single error (`publication-headers.ts:88`)
and emits the incumbent's generic `Unable to parse …` sentence, which never names the permitted values. Moving
it would degrade the message and silently change which error a publisher sees when two headers are wrong. Spec
§2 defect 5 is a documented consequence, not a bug to fix here.

### 2.4 `libs/api/src/blob-ingestion/publication-headers.ts` — narrow `PublicationMetadata`

- `PublicationMetadata.provenance: string` → `provenance: Provenance` (line 147).
- Add `Provenance` to the existing `@hmcts/publication` import on line 2.
- Line 94 `provenance: provenance as string` → `provenance as Provenance`, with a justifying comment as
  CLAUDE.md requires — the value has passed the presence check but not yet the allowlist check, which is
  exactly why the runtime guard in 2.3 stays mandatory:

```typescript
// Allowlist-checked in validatePublicationMetadata, which every caller runs before the value
// reaches persistence. This cast is the reason that guard cannot be dropped.
provenance: provenance as Provenance,
```

Known compile fallout, both in tests, both one-line:
- `libs/api/src/blob-ingestion/validation.test.ts:36` fixture (`provenance: "MANUAL_UPLOAD"` →
  `Provenance.MANUAL_UPLOAD`) and `:106`/`:284` (`metadata({ provenance: "INVALID" })` →
  `provenance: "INVALID" as Provenance`, with a comment that the cast is the point of the test).
- `apps/api/src/routes/v1/publication.test.ts:45` (`provenance: "SNL"` → `Provenance.SNL`). Line 27 is a raw
  HTTP header string and does not change.

### 2.5 `libs/api/src/blob-ingestion/repository/service.ts` — delete `PROVENANCE_MAP`

- Delete lines 11-17.
- `:152` and `:174`: `PROVENANCE_MAP[metadata.provenance] || metadata.provenance` → `metadata.provenance`.
- Remove `Provenance` from the line 3 import — after the deletion it has no other use in the file (verified).

After this, `buildArtefact` writes a value typed `Provenance` to Prisma at the single site that persists an
inbound publication. That is where the write-path guarantee comes from, in place of narrowing `Artefact`.

### 2.6 `libs/publication/src/processing/service.ts` — narrow the processing params

- `:115` `GeneratePdfParams.provenance?: string` → `provenance?: Provenance` (optional; the per-list-type PDF
  generators keep their own `provenance?: string` options and tolerate unknown values, so `Provenance` flows in
  fine).
- `:740` `ProcessPublicationParams.provenance?: string` → `provenance: Provenance` (**required**).
- `:876` `provenance: provenance ?? ""` → `provenance`. The sole production caller
  (`libs/api/src/blob-ingestion/repository/service.ts:166`) already passes it, so making it required costs
  nothing there; the compiler will flag any fixture in `processing/service.test.ts` that omits it.
- Import `Provenance` from `../provenance.js`'s new home — use `@hmcts/list-types-common/provenance`.

`sendThirdPartyPublications` keeps `provenance: string` (2.1 decision table), and `Provenance` is assignable to
`string`, so the call at `:867` compiles unchanged.

### 2.7 `libs/location/src/repository/location-reference-model.ts` — fold the duplicate

```typescript
import type { Provenance } from "@hmcts/list-types-common/provenance";
import { EXTERNAL_PROVENANCES } from "@hmcts/list-types-common/provenance";

export const LOCATION_REFERENCE_PROVENANCES = EXTERNAL_PROVENANCES;
export type LocationReferenceProvenance = Provenance;
```

Both exported names are preserved, so `libs/location/src/index.ts:19,21` need no change.

The sole consumer is `libs/system-admin-pages/src/reference-data-upload/validation/validation.ts:80-84`. It
already derives its message from the constant, and its cast
`ref.provenance as (typeof LOCATION_REFERENCE_PROVENANCES)[number]` still resolves (to `Provenance`), so it
compiles untouched and the user-facing CSV error text is unchanged —
`PROVENANCE "X" is invalid. Allowed values: SNL, COMMON_PLATFORM, CP_CATH, PDDA` in the same order as today,
because `EXTERNAL_PROVENANCES` preserves enum declaration order minus `MANUAL_UPLOAD`.

### 2.8 APIM inbound policy — `infrastructure/resources/operation-policies/createPublication.xml`

Apply spec §6.6 as written. The file currently holds only `<base />` passthroughs (confirmed). Add the gate to
`<inbound>` **after** `<base />`, so the `validate-azure-ad-token` in the API-level policy still runs first and
an unauthenticated caller gets `401`, not `400`.

Two corrections to the spec's file references, both verified:
- The API-level policy is at `infrastructure/resources/api-policy/api-policy.xml`, **not** in
  `operation-policies/`. `operation-policies/` contains exactly two files, `createPublication.xml` and
  `healthCheck.xml`.
- The `templatefile()` warning lives at `api-policy/api-policy.xml:2`. `createPublication.xml` is read with
  plain `file()` (`infrastructure/apim-operation.tf:5`), so `${...}` is not interpolated. Use string
  concatenation for the body anyway, for consistency and in case the rendering ever changes.

Non-negotiables:
- **Do not add a second policy file.** `apim-operation.tf:3-6` builds its `for_each` from
  `fileset("resources/operation-policies/*.xml")` keyed on the basename, and the apply fails unless the basename
  equals an imported `operationId`. `infrastructure/env-config.tf:66-69` exposes only
  `"/publication" = { post = "createPublication" }`. A `createPublicationAtRoot.xml` would fail the apply.
- **Absent and empty values must fall through** (`!= ""`), so the publisher still gets the established
  `x-provenance is mandatory however an empty value is provided` from the backend. Restating that sentence at
  the gateway buys nothing.
- **`.Trim()` is mandatory** to match `readHeader` (`publication-headers.ts:108-113`). Without it APIM would
  reject `"  SNL  "`, a value the backend accepts — the one divergence that breaks a working publisher.
- **All five values are permitted at the gateway, including `MANUAL_UPLOAD`,** so the gateway list equals the
  enum. See clarification 3.
- The APIM gate is defence-in-depth, **not** the authority. `/v1/publication` is not in `apim_operations` and so
  bypasses the gateway entirely while serving the same handler; 2.3 is the authoritative implementation.

### 2.9 `docs/api/openapi.yaml` — description only

The `enum` at `:502` is already correct; the schema does not change. Apply spec §7:
- Expand the `Provenance` parameter `description` (`:499`) from one line to the block in spec §7 — case
  sensitivity, consequence of a bad value, how `x-court-id` is interpreted per provenance, whitespace trimming.
- Add one sentence to the `createPublication` description block (around `:238-247`) recording that an
  unrecognised `x-provenance` may be rejected at the gateway before reaching the service.

**Keep the YAML parseable**: `infrastructure/apim.tf:9` `yamldecode`s this file to build the APIM import, so a
syntax error here breaks `terraform plan`, not just the docs.

---

## 3. Error Handling & Edge Cases

From spec §9 and §10.

- **Precedence: missing-header beats invalid-value.** A request with both a missing `x-content-date` and a bad
  `x-provenance` reports only the missing header. `parsePublicationHeaders` truncates with `errors.slice(0, 1)`
  (`publication-headers.ts:88`), returns no `metadata`, and the route short-circuits at
  `apps/api/src/routes/v1/publication.ts:41-43`. Unchanged by this ticket and must stay unchanged.
- **Absent / empty / whitespace-only `x-provenance`** reports
  `x-provenance is mandatory however an empty value is provided`, never the allowlist message. `readHeader`
  trims and maps `""` to `undefined`, so all three collapse to the same path.
- **Case sensitivity.** `snl`, `Snl`, `MANUAL_upload` are all `400`. `isProvenance` is a plain `includes`, so
  there is no coercion, aliasing or defaulting — matching the existing treatment of `x-type`, `x-language` and
  `x-sensitivity`.
- **Trimming parity.** APIM's `.Trim()` and the backend's `readHeader` trim must agree, or a padded-but-valid
  value is rejected at one layer and accepted at the other. `publication-headers.test.ts:156` covers the backend
  side; the gateway side is manual (§5).
- **Gateway fall-through.** The `!= ""` clause in the `<when>` condition means a missing or whitespace-only
  header is forwarded, deliberately, so the backend owns the mandatory-header message.
- **Multiple `x-provenance` headers.** `readHeader` takes `raw[0]`, so `["SNL", "PDDA"]` resolves to `SNL`.
  Existing behaviour, covered by `publication-headers.test.ts:164`. The APIM policy's
  `GetValueOrDefault("x-provenance", "")` returns the comma-joined value for repeated headers; a
  `"SNL,PDDA"` string fails the gateway `Contains` check and is rejected with `400` rather than being forwarded.
  That is a *stricter* gateway than backend for a pathological input. Accept it; do not try to replicate
  `raw[0]` in XML.
- **Multi-error join.** `validatePublicationMetadata` errors are joined with `", "` by
  `joinValidationMessages`, so an invalid provenance plus an unknown `x-list-type` yields
  `Invalid x-provenance. Allowed values: … , Invalid x-list-type. Allowed values: …` in that order.
- **No `errors` array in the response body.** The body is `{ message, timestamp }` from `buildMessage`
  (`artefact-response.ts:69`); the per-field `ValidationError[]` stays internal.
  `e2e-tests/tests/api/blob-ingestion.spec.ts:163` asserts `not.toHaveProperty("errors")` — do not start leaking it.
- **Invalid provenance does zero database work.** After 2.3 neither `getLocationById` nor
  `getLocationByProvenanceLocationId` is called, and no spurious `x-court-id must be a valid number` is
  appended. This is a behaviour change, and the only user-visible one in the ticket.
- **Byte-identical message preserved as a regression guard.**
  `Invalid x-provenance. Allowed values: MANUAL_UPLOAD, SNL, COMMON_PLATFORM, CP_CATH, PDDA`, built by
  interpolating `PROVENANCES.join(", ")` and never typed as a literal in production code. Adding a sixth
  provenance to the enum updates the message automatically. `validation.test.ts:111-113` and both E2E specs
  guard it.
- **`timestamp` differs between layers.** APIM reports its own instance clock via
  `DateTime.Now.ToString("yyyy-MM-dd'T'HH:mm:ss.fff")`; the backend reports the pod's via `localDateTimeNow`.
  The field is informational, not echoed back and not persisted. Acceptable.
- **LCSU leaves nothing behind.** `handleLcsuUpload` calls `validatePublicationMetadata` at
  `apps/api/src/routes/v1/publication.ts:110` *before* `uploadHtmlToS3` at `:115`, so an invalid provenance
  cannot orphan an S3 object. Do not reorder those two calls.

---

## 4. Acceptance Criteria Mapping

The ten scenarios in spec §3.

| # | Scenario (spec §3) | Change that satisfies it | Verified by |
|---|---|---|---|
| 1 | The enum is the single source of truth | 2.1 move + derived members; 2.3 deletes `ALLOWED_PROVENANCES`/`EXTERNAL_PROVENANCES`; 2.5 deletes `PROVENANCE_MAP`; 2.7 folds `LOCATION_REFERENCE_PROVENANCES` | `provenance.test.ts`; the consolidation guard test (§5) |
| 2 | A recognised provenance is accepted | 2.3 — `isProvenance` returns true for all five; location resolution unchanged | Table-driven `validation.test.ts` case per provenance; existing E2E happy paths |
| 3 | An unrecognised provenance is rejected by the API | 2.3 — message byte-identical | `validation.test.ts:104-114` passing **unedited**; route test asserts `400` + `timestamp` + no `errors` |
| 4 | Validation is case-sensitive | 2.1 — `isProvenance` is a plain `includes`, no coercion | `provenance.test.ts` cases for `snl`, `Manual_Upload`, `""` |
| 5 | Missing/empty reported as missing, not invalid | No change — `parsePublicationHeaders` presence check keeps precedence; APIM `!= ""` fall-through (2.8) | `publication-headers.test.ts` absent/empty/whitespace cases; STG manual check 3 |
| 6 | An invalid provenance does no database work | 2.3 — location block wrapped in `if (isValidProvenance)` | `validation.test.ts` defect-6 regression test + mock-call assertions (§5). **Fails against today's code** |
| 7 | Rejected at the APIM gateway before reaching the backend | 2.8 `createPublication.xml` inbound gate | APIM/backend parity test (§5) + STG manual checks 1-2 |
| 8 | Location-reference allowlist stops being a separate copy | 2.7 | `reference-data-upload/validation/validation.test.ts` passing unedited (error text unchanged) |
| 9 | Types are narrowed so the rule cannot be bypassed | **Partially.** 2.4 narrows `PublicationMetadata.provenance` and `ArtefactResponse.provenance`; 2.6 narrows the processing params; 2.5 makes the single write site provably in-set. `Artefact.provenance` is **declined** — clarification 2 | `yarn lint` / workspace build is the assertion; no separate test |
| 10 | Publisher and location provenance untouched | No change to `authorisation/service.ts:8`, `auth/user-profile.ts:6`, `list-type-data.ts:5`, `list-type-provenance.ts`, or the `user_provenance` / `allowed_provenance` columns | Existing suites in `libs/account`, `libs/auth`, `libs/system-admin-pages` passing unedited |

Scenario 9 is the only one not fully met, and it is met in the place that matters (the write path). The gap is
explicit, not accidental.

---

## 5. Test Scenarios

Condensed from spec §13. Every item below has a matching task in `tasks.md`.

### `libs/list-types/common/src/provenance.test.ts` (moved; extend the 3 existing tests)

- `PROVENANCES` contains exactly the five values **in declaration order** — this is what keeps the `400`
  message stable.
- `EXTERNAL_PROVENANCES` contains the four non-manual values and does **not** contain `MANUAL_UPLOAD` — the
  guard against misrouting every manual upload into provenance-location resolution.
- `isProvenance` is true for each enum member; false for an unknown value, for `""`, and for `snl` /
  `Manual_Upload` — pinning case sensitivity.
- `isExternalProvenance` is false for `MANUAL_UPLOAD`, true for the other four.
- Retain the existing label-coverage test, restated over `PROVENANCES`, so a newly added enum member fails the
  suite until it is given a label.

### `libs/api/src/blob-ingestion/validation.test.ts`

- **`:104-114` passes unedited** — proves the enum-derived list did not change the wire message.
- Table-driven: each of the five provenances is accepted; `MANUAL_UPLOAD` resolves a numeric court ID, the four
  external ones resolve through `getLocationByProvenanceLocationId`.
- An invalid provenance produces exactly one error, keyed `x-provenance`.
- **Defect-6 regression:** invalid provenance **and** a non-numeric `x-court-id` produce **only** the
  `x-provenance` error. Fails against today's code.
- **No database work:** with an invalid provenance, assert `getLocationById` and
  `getLocationByProvenanceLocationId` were **not called**, on the mocks. An error-count assertion would not
  catch a stray query.
- Invalid provenance plus unknown `x-list-type` yields both errors, joined in that order.
- **APIM/backend message parity** (add as a `describe` in this file — the `@hmcts/location` and
  `@hmcts/system-admin-pages` mocks are already set up here, so no new file is needed): read
  `infrastructure/resources/operation-policies/createPublication.xml` via
  `path.resolve(__dirname, "../../../../infrastructure/resources/operation-policies/createPublication.xml")`,
  extract the quoted values from the `<when>` condition, assert the set equals `PROVENANCES`, and assert the
  `<set-body>` sentence equals the message `validatePublicationMetadata` actually returns for an invalid
  provenance. This is the only mechanism that catches TypeScript↔XML drift.

### `libs/api/src/blob-ingestion/publication-headers.test.ts`

- `"  SNL  "` still parses to `SNL` — `:156` must keep passing, because the APIM `.Trim()` is matched to it.
- Absent, empty and whitespace-only `x-provenance` each report the mandatory-header message, and the allowlist
  message never appears at this layer.

### `apps/api/src/routes/v1/publication.test.ts`

- Invalid provenance → `400`, allowlist message, truthy `timestamp`, body has no `errors` property.
- Invalid provenance on the **LCSU** path → `400` and `uploadHtmlToS3` **never called**.
- Invalid provenance on the flat-file path → `400` and no blob written.

### Consolidation guard

- A test asserting no `.ts` file under `libs/` or `apps/` declares an array literal containing two or more
  artefact-provenance names outside `provenance.ts`. This is the executable form of acceptance criterion 1;
  without it the next developer re-introduces a local copy and nothing complains. Model it on
  `libs/list-types/common/src/validation/guard.test.ts`. Scope it to array literals so
  `PUBLISHER_PROVENANCES` (different values) and the `provenanceLabels` / `PROVENANCE_LABELS` *object*
  literals are not false positives — and note in a comment that the label objects are a known duplicate the
  guard deliberately does not cover (clarification 5).

### Type level

- `yarn lint` and the workspace build pass with `PublicationMetadata.provenance`,
  `ArtefactResponse.provenance`, `GeneratePdfParams.provenance` and `ProcessPublicationParams.provenance`
  typed `Provenance`. The build is the assertion; no separate test.

### E2E — no new tests

Per CLAUDE.md the suite is one test per journey. `x-provenance: INVALID_PROVENANCE` is already a row in the
invalid-header table of `e2e-tests/tests/api/blob-ingestion.spec.ts:190` and
`flat-file-ingestion.spec.ts:164`, inside journeys that already assert `400`. **Do not add a spec file and do
not add a case.** Verified: those assertions are `expect(body.message).toBeTruthy()` — loose, so the unchanged
message cannot break them, and tightening them is not worth a journey edit. Just confirm both still pass.

### Manual verification on STG (automated tests cannot reach an APIM policy)

1. `POST` the APIM `/publication` path with a valid publisher token and `x-provenance: INVALID_PROVENANCE` →
   `400` with the allowlist message, **and no corresponding entry in the API pod logs**, confirming the request
   was never forwarded.
2. Same request with `x-provenance: SNL` and otherwise valid headers → `201`, confirming the happy path is intact.
3. Same request with `x-provenance` omitted → `400` with
   `x-provenance is mandatory however an empty value is provided`, confirming the `!= ""` fall-through.
4. Same request with `x-provenance: "  SNL  "` (padded) → `201`, confirming the policy `.Trim()` matches `readHeader`.
5. An unauthenticated request with `x-provenance: INVALID_PROVENANCE` → `401`, not `400`, confirming the gate
   sits after `<base />`.

---

## 6. CLARIFICATIONS NEEDED

### 1. Does the team want the Prisma enum after all? — **BLOCKS CLOSING THE TICKET**

*Unclear:* "Make Provenance enum in pip data model" is the ticket's first acceptance bullet; this plan declines it.

*Options:* (a) leave `provenance String` and rely on the TypeScript guard plus the APIM gate; (b) migrate
`artefact.provenance` to a Postgres enum in this ticket; (c) separate ticket covering all four value columns
(`type`, `sensitivity`, `language`, `provenance`) together.

*Recommendation:* (c). The schema contains no Prisma enums at all, the three sibling columns are `String`
despite having TypeScript enums, and `ALTER TABLE ... USING ...::provenance_enum` fails outright on any
pre-existing out-of-set row — which cannot be ruled out, because STG predates all validation and
`libs/test-support/src/routes/test-support/artefacts.ts:51` can write arbitrary values (see question 4).
`.claude/rules/backend.md` points the other way, so this needs a human.

*Blocking?* Not for implementation — the rest of the plan stands either way. **Blocking for closing the ticket**,
since it is acceptance bullet 1.

### 2. Is partial type narrowing acceptable? `Artefact.provenance` stays `string`

*Unclear:* spec §6.4 and acceptance scenario 9 name `Artefact.provenance` explicitly; this plan declines it.

*Options:* (a) narrow only `PublicationMetadata` / `ArtefactResponse` / the processing params, as planned;
(b) also narrow `Artefact.provenance`, accepting `as Artefact[]` casts in `getArtefactsByLocation` /
`getArtefactsByIds` plus edits to ~14 `apps/web/src/pages/(list-types)/*/index.test.ts` fixtures that
deliberately use `"UNKNOWN_SOURCE"`; (c) split `Artefact` into a write DTO (narrowed) and a read model (`string`).

*Recommendation:* (a) now, (c) as a follow-up. `Artefact` is simultaneously the `createArtefact` input and the
read model returned straight from Prisma; narrowing it asserts a guarantee the `String` column does not provide.
The write path is covered regardless once `PROVENANCE_MAP` goes, because `buildArtefact` then writes
`metadata.provenance`, which is `Provenance`.

*Blocking?* No. Decide at review.

### 3. Should APIM permit `MANUAL_UPLOAD`?

*Unclear:* whether a supplier calling through the gateway should ever be able to claim `MANUAL_UPLOAD`.

*Options:* (a) permit all five so the gateway list equals the enum; (b) permit only the four external
provenances, which needs its own distinct error message.

*Recommendation:* (a). Making the two layers disagree by design is precisely the drift this ticket exists to
remove. Switch to (b) only if product confirms no APIM caller will ever legitimately publish as `MANUAL_UPLOAD`.

*Blocking?* No — (a) is implementable now and is a one-line change if the answer is (b).

### 4. One in-repo writer bypasses the gate

*Unclear:* whether `libs/test-support` should be allowed to seed out-of-set provenances.
`artefacts.ts:51` writes `provenance: input.provenance || "MANUAL_UPLOAD"` straight to Prisma with no
allowlist check, and `:16` / `:101` filter on a raw query-string value.
`artefacts.test.ts:141` seeds `"SYSTEM"` on purpose. `apps/crons` has no provenance references at all, so the
scheduled jobs are clear.

*Options:* (a) leave it — arbitrary fixtures are a feature for E2E setup/teardown; (b) type
`CreateArtefactInput.provenance` as `Provenance`, which requires adding a `@hmcts/list-types-common` dependency
to `libs/test-support` (safe — no cycle; `list-types/common` does not depend on `test-support`) and editing the
`"SYSTEM"` fixtures.

*Recommendation:* (a) for this ticket. But it means `artefact.provenance` can hold an out-of-set value on any
environment where test-support is mounted, which is exactly what would break question 1's migration. **Confirm
whether test-support is mounted on STG before treating any `SELECT DISTINCT provenance` audit as conclusive.**

*Blocking?* No for this ticket; a prerequisite for question 1.

### 5. The provenance *labels* are a divergent duplicate shown to users — **REPLACES spec §14 question 5, which understated it**

Spec §14 question 5 calls `PROVENANCE_LABELS` merely "English-only strings needing a Welsh follow-up". That is
wrong. It is a live, user-facing data-source bug and a sixth copy of provenance knowledge.

*The finding, verified:* two label maps disagree on two of the five values.

| Value | `PROVENANCE_LABELS` (`libs/publication/src/provenance.ts`) | `provenanceLabels` (`libs/list-types/common/src/locales/en.ts` and `cy.ts`) |
|---|---|---|
| `SNL` | `"SNL"` | `"ListAssist"` |
| `CP_CATH` | `"CP-CaTH"` | `"Libra"` |

Both are rendered to the public. `apps/web/src/pages/(list-types)/list-type-handler.ts:165` falls back from one
to the other *in the same expression* — `t?.provenanceLabels?.[provenance] ?? PROVENANCE_LABELS[provenance] ?? provenance`
— and `:281` does the same. `libs/publication/src/repository/queries.ts:279` uses `PROVENANCE_LABELS` alone. So
**the same artefact displays a different data source depending on the render path**: a list page reached through
`list-type-handler` says "ListAssist", the artefact-details path says "SNL".

*Options:* (a) fix the values in this ticket; (b) raise it as a separate defect and leave the maps alone;
(c) merge the two maps into one locale-backed source now.

*Recommendation:* **(b), and raise it as a blocking clarification before anyone "tidies" it.** Which label is
correct is a product question — "ListAssist" vs "SNL", "Libra" vs "CP-CaTH" are different product names for
arguably the same system, and picking one silently changes what citizens see on published lists. Do **not**
change the strings in this ticket. The move in 2.1 does help: it puts `provenance.ts` and `locales/en.ts` in the
same package, so the divergence is visible to the next reader. Note the Welsh angle too — `cy.ts` already carries
`SNL: "ListAssist"` untranslated, so the eventual fix is a content decision, not a mechanical refactor.

*Blocking?* Not for implementation. **Blocking for any decision to consolidate the labels**, which must not
happen here.

### 6. Is `/v1/publication` meant to stay unexposed through APIM?

*Unclear:* `apps/api/src/routes/publication.ts:1-3` says `/v1/publication` is "kept until the gateway path
question is settled", and `env-config.tf:66-69` exposes only `/publication`. The provenance gate therefore
protects one of the two paths serving the same handler.

*Options:* (a) accept it, since the backend check is authoritative; (b) add `/v1/publication` to
`apim_operations`, which also requires duplicating the policy file under the new `operationId`; (c) retire
`/v1/publication`.

*Recommendation:* (a) for this ticket, and record in the policy comment that adding the path later requires a
matching policy file. Does the open gateway-path question have an owner?

*Blocking?* No.

### Assumptions being carried forward (flag if any is wrong)

- The five values in `Provenance` are the complete and correct set. The ticket is read as "make this set
  authoritative", not "change this set". Adding or removing a value is a one-line change to `provenance.ts`
  plus the APIM list, but it needs saying explicitly.
- The ticket's acceptance criteria are a menu ("Possible solutions:"), not six mandatory deliverables.
- "Validation similar to the validation in HMI" means HMI's APIM-level header allowlisting. No HMI policy
  source exists in this repository, so 2.8 follows this service's own `api-policy.xml` structure instead.
- No publisher is currently sending an out-of-set provenance — they cannot be succeeding, since
  `validation.ts:29` already rejects them — so the APIM gate cannot break a working integration. Worth
  confirming against App Insights `400` rates before deploy.
