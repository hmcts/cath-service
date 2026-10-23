# #1224: Make provenance a fixed set of values

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** Post-Migration
**Created:** 2026-10-22T16:13:10Z
**Updated:** 2026-10-23T09:39:19Z

## Description

**PROBLEM STATEMENT**
Presently, the provenance field is a String with no validation applied. This ticket is to add validation to the provenance field.

<img width="1217" height="204" alt="Image" src="https://github.com/user-attachments/assets/15862f0f-9a0e-4073-82e6-83dd97f2385a" />



**AS A** Service
**I WANT** to add validation the provenance field 
**SO THAT** it can only be a fixed set of values



**ACCEPTANCE CRITERIA**
Possible solutions:
- Make Provenance enum in pip data model.
- Validation is added at the APIM level which will validate the the header value similar to the validation in HMI.
- Validation is added to the provenance field so that it can only be a fixed set of values.
- Validation is implemented on Azure APIM level
- Provenance is fixed to a specific set of values
- Validation fails if provenance is not found

## Comments

### Comment by OgechiOkelu on 2026-10-23T09:30:00Z

@spec 

### Comment by hmctsclaudecode on 2026-10-23T09:38:21Z

# Technical Specification — Issue #1224: Make provenance a fixed set of values

## 1. User Story

**As a** Service
**I want to** validate the `provenance` value supplied on every inbound publication against a fixed, single-sourced set
**So that** an artefact can never be persisted with an unrecognised provenance, and a publisher sending one gets an immediate, specific `400` naming the permitted values

## 2. Background

### What already exists

The premise in the ticket — "the provenance field is a String with no validation applied" — is only half true for this codebase. Three things are already in place:

| Asset | Location | State |
|---|---|---|
| `Provenance` enum (5 values) | `libs/publication/src/provenance.ts:1` | Exists, exported from `@hmcts/publication` |
| `PROVENANCE_LABELS` display map | `libs/publication/src/provenance.ts:9` | Exists, used by `getArtefactDetails` (`libs/publication/src/repository/queries.ts:279`) |
| `x-provenance` allowlist check | `libs/api/src/blob-ingestion/validation.ts:29` | Exists, returns `400` |
| OpenAPI `enum` on the header | `docs/api/openapi.yaml:502` | Already documents the 5 values |
| E2E coverage of a bad value | `e2e-tests/tests/api/blob-ingestion.spec.ts:190`, `flat-file-ingestion.spec.ts:164` | Already asserts `400` for `INVALID_PROVENANCE` |

So the request is **already rejected** today. The real defects are structural, and they are what this ticket should fix:

1. **The allowlist is a hardcoded duplicate of the enum.** `libs/api/src/blob-ingestion/validation.ts:10` declares
   `const ALLOWED_PROVENANCES = ["MANUAL_UPLOAD", "SNL", "COMMON_PLATFORM", "CP_CATH", "PDDA"];`
   as a bare string array while `Provenance` sits one package away. Adding a sixth provenance means editing two files that nothing links together, and the enum is not the authority the ticket asks for.
2. **`EXTERNAL_PROVENANCES` is a third copy.** `validation.ts:11` lists the 4 non-manual provenances; `libs/location/src/repository/location-reference-model.ts:1` declares the identical 4 as `LOCATION_REFERENCE_PROVENANCES`. Two independent definitions of the same set.
3. **The types stay wide.** `PublicationMetadata.provenance` is `string` (`publication-headers.ts:147`), as is `Artefact.provenance` (`libs/publication/src/repository/model.ts:14`). Nothing downstream of the one `if` statement is type-protected, so a new code path that writes an artefact without going through `validatePublicationMetadata` compiles happily.
4. **No gateway-level check.** Every unrecognised provenance costs a full APIM → backend → Postgres round trip (see defect 6) before being rejected. The ticket explicitly asks for APIM validation.
5. **Validation ordering differs from sibling headers.** `x-language`, `x-sensitivity` and `x-type` are enum-checked in `parsePublicationHeaders` (`publication-headers.ts:65-77`), which truncates to a single error. `x-provenance` is checked a layer later in `validatePublicationMetadata`, whose errors are joined with `", "`. The two layers therefore produce different message shapes for the same class of fault.
6. **An invalid provenance still hits the database.** `validation.ts:72-84` resolves the location regardless of whether the provenance was accepted. With `x-provenance: INVALID`, control falls to the `else` branch, parses `x-court-id` as a number and issues a `getLocationById` query whose result is discarded. Worse, a non-numeric `x-court-id` then appends a second, misleading `x-court-id must be a valid number` error to a request whose only actual fault was the provenance.

### Three unrelated "provenance" concepts — do not conflate

This is the main hazard in the ticket. The codebase uses the word for three different things, and `libs/list-types/common/src/list-type-provenance.ts:1-4` already carries a warning comment about two of them.

| Concept | Values | Defined in | In scope? |
|---|---|---|---|
| **Artefact provenance** — the system publishing the list | `MANUAL_UPLOAD`, `SNL`, `COMMON_PLATFORM`, `CP_CATH`, `PDDA` | `libs/publication/src/provenance.ts` | **Yes — this ticket** |
| **Location-reference provenance** — whose location ID `x-court-id` is | `SNL`, `COMMON_PLATFORM`, `CP_CATH`, `PDDA` | `libs/location/src/repository/location-reference-model.ts` | Consolidation only |
| **Publisher / user provenance** — the identity provider | `CFT_IDAM`, `PI_AAD`, `CRIME_IDAM` (+ `SSO` in `libs/account/src/repository/model.ts:7`) | `libs/list-types/common/src/list-type-provenance.ts` | **No — out of scope** |

`list_type.allowed_provenance`, `user.user_provenance` and `audit_log.user_provenance` are all the third concept. They must not be changed by this ticket, and `MANUAL_UPLOAD` must never leak into them.

### Supporting references

- Inbound endpoint contract: `docs/api/openapi.yaml` (`createPublication`, lines 225-260 and 490-510)
- Prior decision to keep the allowlist: `docs/tickets/1026/plan.md:36` — "an unrecognised provenance cannot resolve a location anyway, so failing fast with a clear `400` beats persisting an orphan artefact"
- APIM policy wiring: `infrastructure/apim-operation.tf` (file name must equal the imported `operationId`), policies in `infrastructure/resources/operation-policies/`
- Prisma enum guidance: `.claude/rules/backend.md` §"Use Enums in Prisma Schema"

## 3. Acceptance Criteria

* **Scenario:** The enum is the single source of truth
    * **Given** `Provenance` in `libs/publication/src/provenance.ts` is the only declaration of the artefact-provenance value set
    * **When** the inbound publication endpoint validates `x-provenance`
    * **Then** the permitted values are derived from `Provenance` at runtime, and no hardcoded array of provenance strings remains anywhere in `libs/` or `apps/`

* **Scenario:** A recognised provenance is accepted
    * **Given** an authenticated `POST /api/v1/publication` with all mandatory headers present and valid
    * **When** `x-provenance` is any of `MANUAL_UPLOAD`, `SNL`, `COMMON_PLATFORM`, `CP_CATH` or `PDDA`
    * **Then** the request proceeds to ingestion and returns `201` with the artefact body, exactly as today

* **Scenario:** An unrecognised provenance is rejected by the API
    * **Given** an authenticated `POST /api/v1/publication` that is otherwise entirely valid
    * **When** `x-provenance` is `INVALID_PROVENANCE`
    * **Then** the response is `400` with body `{"message": "Invalid x-provenance. Allowed values: MANUAL_UPLOAD, SNL, COMMON_PLATFORM, CP_CATH, PDDA", "timestamp": "<local date-time>"}`
    * **And** no artefact row, blob, PDF or subscriber notification is created

* **Scenario:** Validation is case-sensitive
    * **Given** an authenticated `POST /api/v1/publication`
    * **When** `x-provenance` is `snl` or `Snl` or `MANUAL_upload`
    * **Then** the response is `400` — the value is not coerced to upper case, matching the existing treatment of `x-type`, `x-language` and `x-sensitivity`

* **Scenario:** A missing or empty provenance is still reported as missing, not invalid
    * **Given** an authenticated `POST /api/v1/publication`
    * **When** `x-provenance` is absent, empty, or whitespace only
    * **Then** the response is `400` with message `x-provenance is mandatory however an empty value is provided` — the pre-existing presence check in `parsePublicationHeaders` keeps precedence and the allowlist message is not used

* **Scenario:** An invalid provenance does no database work
    * **Given** an authenticated `POST /api/v1/publication` with `x-provenance: INVALID_PROVENANCE`
    * **When** validation runs
    * **Then** no location lookup is attempted, and the response message names only `x-provenance` — no `x-court-id must be a valid number` error is appended even when `x-court-id` is non-numeric

* **Scenario:** Rejected at the APIM gateway before reaching the backend
    * **Given** a supplier calling the APIM-fronted `createPublication` operation with a valid Azure AD token
    * **When** `x-provenance` is not one of the five permitted values
    * **Then** APIM returns `400` from the inbound policy with the same JSON body shape as the backend, and the request is never forwarded to the CaTH API

* **Scenario:** The location-reference allowlist stops being a separate copy
    * **Given** `LOCATION_REFERENCE_PROVENANCES` and `EXTERNAL_PROVENANCES` describe the same four external provenances
    * **When** the reference-data CSV upload validates a `PROVENANCE` column value
    * **Then** the permitted values are derived from `Provenance` minus `MANUAL_UPLOAD`, and the existing user-facing error text is unchanged

* **Scenario:** Types are narrowed so the rule cannot be bypassed
    * **Given** `PublicationMetadata.provenance` and `Artefact.provenance`
    * **When** the project is type-checked
    * **Then** both are typed `Provenance` rather than `string`, and any call site attempting to assign an arbitrary string fails compilation

* **Scenario:** Publisher and location provenance are untouched
    * **Given** the unrelated `PUBLISHER_PROVENANCES` set and the `user.user_provenance`, `audit_log.user_provenance` and `list_type.allowed_provenance` columns
    * **When** this change is deployed
    * **Then** their values, validation and behaviour are unchanged, and `MANUAL_UPLOAD` is not accepted for any of them

## 4. User Journey Flow

There is no citizen-facing journey. The "user" is a publishing supplier system calling the inbound publication API, and the journey is a single request.

### Request flow with the two validation gates

```
 ┌──────────────────────┐
 │ Publisher / supplier │  POST /publication
 │  (SNL, CP, PDDA …)   │  x-provenance: <value>
 └──────────┬───────────┘
            │
            v
 ╔══════════════════════════════════════════════════════════════╗
 ║ AZURE APIM                                                   ║
 ║                                                              ║
 ║  api-policy.xml        validate-azure-ad-token               ║
 ║                        (roles: api.publisher.user)           ║
 ║                                │                             ║
 ║                                │ 401 if token invalid        ║
 ║                                v                             ║
 ║  createPublication.xml   ┌──────────────────────────┐        ║
 ║    << NEW GATE >>        │ x-provenance in the      │        ║
 ║                          │ permitted set?           │        ║
 ║                          └───────┬──────────┬───────┘        ║
 ║                             no   │          │  yes           ║
 ║                                  v          │                ║
 ║                         400 return-response │                ║
 ║                         (never forwarded)   │                ║
 ║                                             │                ║
 ║  api-policy.xml      swap supplier token    │                ║
 ║                      for APIM's own token   │                ║
 ╚═════════════════════════════════════════════╪════════════════╝
                                               │
                                               v
 ┌──────────────────────────────────────────────────────────────┐
 │ CaTH API — apps/api/src/routes/v1/publication.ts             │
 │                                                              │
 │  authenticateApi()                                           │
 │         │                                                    │
 │         v                                                    │
 │  parsePublicationHeaders()                                   │
 │    presence of x-provenance ──── absent/empty ──> 400        │
 │    "x-provenance is mandatory however an empty                │
 │     value is provided"                                       │
 │         │ present                                            │
 │         v                                                    │
 │  validatePublicationMetadata()                               │
 │    ┌────────────────────────────────────┐                    │
 │    │ isProvenance(metadata.provenance)? │  << AUTHORITATIVE  │
 │    └──────┬──────────────────┬──────────┘     GATE >>        │
 │       no  │                  │ yes                           │
 │           v                  v                               │
 │   push x-provenance    resolve location:                     │
 │   allowlist error      external  -> by provenance location id│
 │           │            MANUAL_UPLOAD -> numeric CaTH id      │
 │           │                  │                               │
 │           │ SKIP location    │                               │
 │           │ resolution       │                               │
 │           │ entirely         │                               │
 │           v                  v                               │
 │        400 Message     list-type + payload schema checks     │
 │                              │                               │
 │                              v                               │
 │                        persist artefact ──> PDF ──> notify   │
 │                              │                               │
 │                              v                               │
 │                        201 ArtefactResponse                  │
 └──────────────────────────────────────────────────────────────┘
```

### Why two gates and not one

APIM is defence-in-depth, not the authority. `MANUAL_UPLOAD` publications and anything reaching the API by a route other than the supplier-facing APIM product never pass through `createPublication.xml`, so the backend check cannot be dropped. Conversely the APIM check exists because the ticket asks for it and because it saves a token exchange, a backend hop and a Postgres connection for traffic that is certain to be rejected.

The cost is that the value set is stated in two languages — TypeScript and APIM policy XML — and Terraform cannot read the TypeScript. This duplication is accepted and mitigated in §6.

## 5. Low Fidelity Wireframe

Not applicable. This ticket changes header validation on a machine-to-machine API and an APIM inbound policy. It renders no page and alters no existing page.

## 6. Page Specifications

No pages. The specification below covers the modules, the gateway policy and the data model.

### 6.1 `libs/publication/src/provenance.ts` — the single source of truth

Keep the existing `Provenance` enum and `PROVENANCE_LABELS` exactly as they are, and add the derived members that every other module will consume. Per CLAUDE.md module ordering, module-level consts come first, then exported functions, then types.

```typescript
export enum Provenance {
  MANUAL_UPLOAD = "MANUAL_UPLOAD",
  SNL = "SNL",
  COMMON_PLATFORM = "COMMON_PLATFORM",
  CP_CATH = "CP_CATH",
  PDDA = "PDDA"
}

/** Every permitted artefact provenance, in declaration order — the order publishers see in error messages. */
export const PROVENANCES: readonly Provenance[] = Object.values(Provenance);

/**
 * Every provenance except MANUAL_UPLOAD. These supply their own location IDs, resolved against
 * location_reference; MANUAL_UPLOAD supplies a numeric CaTH location ID directly.
 */
export const EXTERNAL_PROVENANCES: readonly Provenance[] = PROVENANCES.filter((p) => p !== Provenance.MANUAL_UPLOAD);

export const PROVENANCE_LABELS: Record<string, string> = {
  /* unchanged */
};

export function isProvenance(value: string): value is Provenance {
  return (PROVENANCES as readonly string[]).includes(value);
}

export function isExternalProvenance(value: string): boolean {
  return (EXTERNAL_PROVENANCES as readonly string[]).includes(value);
}
```

`Object.values` on a string enum returns only the values, so `PROVENANCES` needs no filtering. Both guards are case-sensitive by construction, which is the required behaviour.

Export all four new members from `libs/publication/src/index.ts` alongside the existing `PROVENANCE_LABELS, Provenance` export on line 20.

### 6.2 `libs/api/src/blob-ingestion/validation.ts` — consume, don't duplicate

**Delete** lines 10-11:

```typescript
const ALLOWED_PROVENANCES = ["MANUAL_UPLOAD", "SNL", "COMMON_PLATFORM", "CP_CATH", "PDDA"];
const EXTERNAL_PROVENANCES = ["SNL", "COMMON_PLATFORM", "CP_CATH", "PDDA"];
```

Import `PROVENANCES`, `isProvenance` and `isExternalProvenance` from `@hmcts/publication` instead — `buildNoMatchLocationId` is already imported from there on line 3, so no new dependency edge is introduced.

Restructure the provenance and location blocks so an invalid provenance short-circuits location resolution (defect 6 in §2):

```typescript
const isValidProvenance = isProvenance(metadata.provenance);

if (!isValidProvenance) {
  errors.push({
    field: "x-provenance",
    message: `Invalid x-provenance. Allowed values: ${PROVENANCES.join(", ")}`
  });
}

// … list type and display-date checks unchanged …

// An unresolvable court id is not an error — the publication is still accepted, with the
// submitted id carried behind the "NoMatch" prefix so downstream code can tell it apart.
// Skipped outright for an invalid provenance: the request is already doomed, and the
// MANUAL_UPLOAD branch would otherwise append a misleading x-court-id error.
let resolvedLocationId: string | undefined;

if (isValidProvenance) {
  if (isExternalProvenance(metadata.provenance)) {
    const location = await getLocationByProvenanceLocationId(metadata.provenance, metadata.courtId, listTypeLocationType);
    resolvedLocationId = location ? location.locationId.toString() : buildNoMatchLocationId(metadata.courtId);
  } else {
    const locationId = Number.parseInt(metadata.courtId, 10);
    if (Number.isNaN(locationId)) {
      errors.push({ field: "x-court-id", message: "x-court-id must be a valid number" });
    } else {
      // MANUAL_UPLOAD is never NoMatch-prefixed, even when the location doesn't exist
      await getLocationById(locationId);
      resolvedLocationId = locationId.toString();
    }
  }
}
```

The emitted message string is byte-identical to today's, because `PROVENANCES.join(", ")` reproduces the declaration order of the enum, which matches the order of the deleted array. The existing assertion at `validation.test.ts:111-113` therefore keeps passing unaltered — a deliberate regression guard rather than a test to rewrite.

**The check stays in `validatePublicationMetadata`; it is not moved into `parsePublicationHeaders`.** It is tempting to move it next to the `x-language` / `x-sensitivity` / `x-type` enum checks for symmetry, but `parsePublicationHeaders` truncates to one error (`publication-headers.ts:88`) and emits the incumbent's generic `Unable to parse …` sentence, which never names the permitted values. Moving the check would both degrade the message and silently change which error a publisher sees when two headers are wrong. The asymmetry noted in §2 defect 5 is a documented consequence of the incumbent having no provenance enum to match, not a bug to fix here.

### 6.3 `libs/api/src/blob-ingestion/publication-headers.ts` — narrow the type

`PublicationMetadata.provenance` becomes `Provenance`:

```typescript
export interface PublicationMetadata {
  provenance: Provenance;
  // … unchanged …
}
```

`Provenance` is already reachable: line 2 imports `ArtefactType, Language, Sensitivity` from `@hmcts/publication`; add `Provenance` to that import.

This forces one cast at the construction site (line 94), where the value has passed the presence check but not yet the allowlist check:

```typescript
// Allowlist-checked in validatePublicationMetadata, which every caller runs before
// the value reaches persistence.
provenance: provenance as Provenance,
```

That cast is the single acknowledged soft spot and is why the runtime guard in §6.2 remains mandatory. It is justified in a comment as CLAUDE.md requires, rather than left bare.

### 6.4 `libs/publication/src/repository/model.ts` — narrow the artefact type

`Artefact.provenance: string` becomes `Artefact.provenance: Provenance` (line 14). Two consequences to work through:

- `libs/publication/src/processing/service.ts:876` writes `provenance: provenance ?? ""`, where `provenance?: string` is optional on both `ProcessPublicationParams` (line 740) and the PDF options (line 115). An empty-string fallback is not a `Provenance`. Type these as `Provenance` (still optional) and replace the `?? ""` fallback — an artefact must not be written with an empty provenance. Make the field required on the persistence path and let the compiler find the callers.
- `libs/legacy-third-party-fulfilment/src/service.ts:19` and `push/headers.ts:12` both declare `provenance: string` and forward it to the outbound `x-provenance` header (`headers.ts:30`). Narrow both to `Provenance` so the value CaTH pushes to Courtel is provably one of the five.

### 6.5 `libs/location` — fold the duplicate set

`libs/location/src/repository/location-reference-model.ts:1-2` currently declares:

```typescript
export const LOCATION_REFERENCE_PROVENANCES = ["SNL", "COMMON_PLATFORM", "CP_CATH", "PDDA"] as const;
export type LocationReferenceProvenance = (typeof LOCATION_REFERENCE_PROVENANCES)[number];
```

Re-point both at the enum:

```typescript
import { EXTERNAL_PROVENANCES, type Provenance } from "@hmcts/publication";

export const LOCATION_REFERENCE_PROVENANCES = EXTERNAL_PROVENANCES;
export type LocationReferenceProvenance = Provenance;
```

**Check the dependency direction before doing this.** If `@hmcts/publication` already imports from `@hmcts/location` — it does, `validation.ts:2` imports location queries, and `libs/publication/src/repository/queries.ts:3` imports `getLocationById` — then adding `location → publication` creates the circular dependency CLAUDE.md pitfall 7 forbids. In that case move `provenance.ts` into a leaf package that both can depend on (`libs/list-types/common` already hosts the sibling `list-type-provenance.ts` and is a plausible home), or leave `libs/location` alone and accept the one remaining duplication, documented with a comment pointing at `provenance.ts`. Resolve this during implementation; see §14.

The sole consumer, `libs/system-admin-pages/src/reference-data-upload/validation/validation.ts:80-84`, needs no change — it already derives its message from the constant, so the user-facing text is unaffected either way.

### 6.6 APIM inbound policy — `infrastructure/resources/operation-policies/createPublication.xml`

The file currently contains only `<base />` passthroughs. Add the provenance gate to `<inbound>`, after `<base />` so the Azure AD token check in `api-policy.xml` still runs first — an unauthenticated caller must get `401`, not `400`.

```xml
<policies>
  <inbound>
    <base />
    <!-- Mirrors Provenance in libs/publication/src/provenance.ts. The CaTH API remains the
         authority (validatePublicationMetadata); this gate only avoids a pointless token
         exchange and backend hop. Keep both lists in step when adding a provenance. -->
    <set-variable name="provenance" value="@(context.Request.Headers.GetValueOrDefault("x-provenance", "").Trim())" />
    <choose>
      <when condition="@(context.Variables.GetValueOrDefault<string>("provenance") != "" &amp;&amp; !new[] { "MANUAL_UPLOAD", "SNL", "COMMON_PLATFORM", "CP_CATH", "PDDA" }.Contains((string)context.Variables["provenance"]))">
        <return-response>
          <set-status code="400" reason="Bad Request" />
          <set-header name="Content-Type" exists-action="override">
            <value>application/json</value>
          </set-header>
          <set-body>@("{\"message\":\"Invalid x-provenance. Allowed values: MANUAL_UPLOAD, SNL, COMMON_PLATFORM, CP_CATH, PDDA\",\"timestamp\":\"" + DateTime.Now.ToString("yyyy-MM-dd'T'HH:mm:ss.fff") + "\"}")</set-body>
        </return-response>
      </when>
    </choose>
  </inbound>
  <backend><base /></backend>
  <outbound><base /></outbound>
  <on-error><base /></on-error>
</policies>
```

Four points of care:

- **Absent and empty values deliberately fall through.** The `!= ""` clause lets a missing or whitespace-only header reach the backend so the publisher receives the established `x-provenance is mandatory however an empty value is provided` message. Rejecting it at APIM would mean restating that sentence in a second place for no benefit.
- **`x-provenance` is trimmed** to match `readHeader` in `publication-headers.ts:108-113`, so `"  SNL  "` is accepted at both layers. Without the trim, APIM would reject a value the backend accepts — the one divergence that actually breaks a working publisher. `publication-headers.test.ts:156` covers the backend side of this.
- **The file name must stay `createPublication.xml`, and one file is enough.** `apim-operation.tf:1` keys the `for_each` on the basename and the apply fails unless it matches an imported `operationId`. That `operationId` comes from `infrastructure/env-config.tf:66-69`, **not** from the OpenAPI document: APIM exposes only `"/publication" = { post = "createPublication" }`, and `apim.tf:11-16` overwrites the spec's own `createPublicationAtRoot` with that name. `docs/api/openapi.yaml` also documents `POST /v1/publication` (`operationId: createPublication`, line 247), but that path is absent from `apim_operations` and so is **not** reachable through the gateway. No `createPublicationAtRoot.xml` is needed; creating one would fail the apply.

  The corollary is the important part: because `/v1/publication` bypasses APIM entirely while `apps/api/src/routes/publication.ts` re-exports the same handler for both paths, a request to `/v1/publication` never meets the gateway gate. The backend check is the only one guaranteed to run, which is why §6.2 — not this policy — is the authoritative implementation of the acceptance criteria.
- **No C# `$"…"` interpolation.** `api-policy.xml:2` carries that warning because the file is rendered through `templatefile()`. `createPublication.xml` is read with plain `file()` (`apim-operation.tf:5`) so `${...}` is not interpolated, but string concatenation is used above regardless to keep the two policy files stylistically consistent and to stay safe if the rendering ever changes.
- **All five values are permitted at the gateway, including `MANUAL_UPLOAD`.** Narrowing APIM to the four external provenances would be defensible — a supplier should arguably never claim `MANUAL_UPLOAD` — but it would make the gateway's set differ from the enum's, which is precisely the kind of drift this ticket exists to remove. Flagged in §14 as a question for the team rather than decided here.

### 6.7 Data model — the Prisma column stays `String`

`libs/postgres-prisma/prisma/schema/base.prisma:23` declares `provenance String` on `Artefact`. The ticket's first bullet proposes "Make Provenance enum in pip data model", and `.claude/rules/backend.md` does say to use Prisma enums for fixed value sets. **The recommendation is not to do it in this ticket**, for three reasons:

1. **The schema has no Prisma enums at all.** `grep "^enum"` across `libs/postgres-prisma/prisma/schema/*.prisma` returns nothing. `Artefact.type`, `Artefact.sensitivity` and `Artefact.language` each have a corresponding TypeScript enum (`ArtefactType`, `Sensitivity`, `Language`) and each is still a `String` column. Making `provenance` the single exception creates an inconsistency a reader cannot explain, and the backend rule read in isolation would equally mandate changing all four.
2. **The migration carries real risk for no behavioural gain.** `ALTER TABLE artefact ALTER COLUMN provenance TYPE provenance_enum USING provenance::provenance_enum` fails outright if any existing row holds a value outside the set — and the STG data predates any validation, so that cannot be assumed. The data would have to be audited and backfilled first. The payoff is a constraint on a column that, after §6.2 and §6.4, nothing can write an invalid value to anyway.
3. **It is one of several "possible solutions", not a requirement.** The ticket lists its acceptance criteria under "Possible solutions:" — a menu. The outcomes it actually names ("validation fails if provenance is not found", "provenance is fixed to a specific set of values") are fully met by the enum-derived guard plus the APIM gate.

If the team wants the database constraint regardless, the work is a separate ticket covering all four columns together: audit `SELECT DISTINCT provenance FROM artefact` on every environment, backfill or quarantine outliers, then one migration in `apps/postgres/prisma/migrations/` introducing the enums. Raised in §14.

`IngestionLog.sourceSystem` (`base.prisma:83`) receives `metadata.provenance` at `apps/api/src/routes/v1/publication.ts:126` and stays `String` for the same reasons — it also records non-provenance source identifiers.

## 7. Content

### API response copy

The only copy this ticket introduces or relies on is the `message` field of the `400` body. The allowlist message is unchanged from today's text, which is retained deliberately so the existing unit and E2E assertions act as regression guards:

```
Invalid x-provenance. Allowed values: MANUAL_UPLOAD, SNL, COMMON_PLATFORM, CP_CATH, PDDA
```

It is built by interpolation, never typed as a literal: `` `Invalid x-provenance. Allowed values: ${PROVENANCES.join(", ")}` ``. Adding a sixth provenance to the enum updates the message automatically.

This message deliberately names the permitted values rather than saying "Invalid input" — `.claude/rules/design.md` lists `"Invalid input"` as an error-message anti-pattern, and the principle holds for a machine-to-machine API, where the reader is a supplier's integration engineer reading a log line with no further context.

### OpenAPI documentation

`docs/api/openapi.yaml:496-508` already declares the correct `enum` on the `Provenance` parameter, so the schema needs no change. Extend its one-line description to state the consequence and the case sensitivity, matching how the `CourtId` parameter below it documents its own resolution behaviour:

```yaml
    Provenance:
      name: x-provenance
      in: header
      required: true
      description: |
        Source system publishing the list. Matched case-sensitively against the fixed set
        below; any other value is rejected with `400` and the publication is not stored.

        For the external provenances (`SNL`, `COMMON_PLATFORM`, `CP_CATH`, `PDDA`)
        `x-court-id` is resolved as that provenance's own location ID. For `MANUAL_UPLOAD`
        it must be a numeric CaTH location ID.

        Leading and trailing whitespace is trimmed before matching.
      schema:
        type: string
        enum: [MANUAL_UPLOAD, SNL, COMMON_PLATFORM, CP_CATH, PDDA]
      example: SNL
```

Also amend the `createPublication` description block at `docs/api/openapi.yaml:225-247`, which lists the per-header validation outcomes, to record that an unrecognised `x-provenance` may be rejected at the gateway before reaching the service.

### Welsh content

**No Welsh translations are required by this ticket, and none should be added.** Every string it touches is in a JSON API response body or an APIM policy. The inbound publication API has no locale negotiation, serves supplier systems rather than citizens, and its messages are deliberately matched word-for-word to the incumbent Java service — translating them would break the contract. Inventing `cy.ts` entries here would be boilerplate for its own sake.

Two adjacent Welsh observations, both pre-existing and both out of scope:

- `PROVENANCE_LABELS` (`libs/publication/src/provenance.ts:9`) holds English display strings (`"Manual Upload"`, `"Common Platform"`, `"CP-CaTH"`) and is rendered through `getArtefactDetails` (`libs/publication/src/repository/queries.ts:279`). Per CLAUDE.md these belong in `en.ts` / `cy.ts` locale files, not in a lib constant. This ticket does not change that map and must not quietly refactor it — raised in §14.
- The reference-data CSV upload error at `libs/system-admin-pages/src/reference-data-upload/validation/validation.ts:82` is user-facing, English-only and hardcoded. §6.5 changes only the constant it reads, so the rendered text is unchanged.

## 8. URL

No new or changed routes. The affected endpoint is the existing inbound publication endpoint.

| Layer | Path | Source |
|---|---|---|
| CaTH API route | `POST /api/v1/publication` | `apps/api/src/routes/v1/publication.ts` (auto-discovered) |
| APIM operation | `POST /publication` → `createPublication` | `infrastructure/apim.tf`, policy in `infrastructure/resources/operation-policies/createPublication.xml` |

All three request modes of that one endpoint are covered by the same gate, because `validatePublicationMetadata` is on every path:

| Mode | `Content-Type` | Reaches the check via |
|---|---|---|
| JSON publication | `application/json` | `processBlobIngestion` → `validateBlobRequest` → `validatePublicationMetadata` |
| Flat file | `multipart/form-data` | `processFlatFileBlobIngestion` → `validateFlatFileRequest` → `validatePublicationMetadata` |
| LCSU / PDDA HTML | `multipart/form-data` + `x-type: LCSU` | `handleLcsuUpload` → `validatePublicationMetadata` directly (`publication.ts:110`) |

The LCSU path matters: it validates metadata *before* uploading to S3 (`publication.ts:110-115`), so an invalid provenance cannot leave an orphan object in the bucket.

## 9. Validation

### `x-provenance` rules

| # | Rule | Layer | Outcome |
|---|---|---|---|
| 1 | Header must be present and non-empty after trimming | `parsePublicationHeaders` (`requirePresent`, existing) | `400`, mandatory-header message, reported alone |
| 2 | Leading/trailing whitespace is stripped | `readHeader` (existing) | `"  SNL  "` → `SNL`, accepted |
| 3 | If the header is sent more than once, the first value is used | `readHeader` (existing) | `["SNL", "PDDA"]` → `SNL`; covered by `publication-headers.test.ts:164` |
| 4 | Value must be a member of `Provenance`, matched case-sensitively | `validatePublicationMetadata` via `isProvenance` | `400`, allowlist message |
| 5 | No case coercion, no aliasing, no defaulting | `isProvenance` | `snl`, `Snl`, `manual_upload` all rejected |
| 6 | An invalid value suppresses location resolution | `validatePublicationMetadata` | No `getLocationById` / `getLocationByProvenanceLocationId` call; no spurious `x-court-id` error |
| 7 | Rejected at the gateway when present-but-invalid | `createPublication.xml` | `400`, same body shape, request not forwarded |
| 8 | Gateway passes absent/empty through to the backend | `createPublication.xml` `!= ""` guard | Rule 1's message is preserved |

### Interaction with `x-court-id`

The provenance determines how `x-court-id` is interpreted, so rule 6 is a correctness requirement rather than an optimisation:

| `x-provenance` | `x-court-id` interpreted as | On failure to resolve |
|---|---|---|
| `SNL`, `COMMON_PLATFORM`, `CP_CATH`, `PDDA` | that provenance's own location ID, resolved via `location_reference` | Accepted with `201`; location stored behind the `NoMatch` prefix, PDF and notifications skipped |
| `MANUAL_UPLOAD` | numeric CaTH `location.location_id` | `400` if non-numeric; a non-existent but numeric ID is still accepted and never `NoMatch`-prefixed |
| anything else | not interpreted at all | `400` on provenance alone |

### Error precedence

1. Missing/invalid Azure AD token → `401` (APIM `api-policy.xml`) or `401` from `authenticateApi()`.
2. Present-but-invalid `x-provenance` at the gateway → `400`, request never forwarded.
3. Any missing mandatory header → `400`, **single** error only, because `parsePublicationHeaders` truncates with `errors.slice(0, 1)` (`publication-headers.ts:88`).
4. Unparseable `x-type` / `x-language` / `x-sensitivity` / date headers → `400`, single error, same truncation.
5. Invalid `x-provenance` at the backend → `400`, joined with any sibling `validatePublicationMetadata` errors (unknown `x-list-type`, bad display-date ordering, oversized payload) using `", "`.

Level 3 beats level 5: a request with both a missing `x-content-date` and a bad `x-provenance` reports only the missing header, since `parsePublicationHeaders` returns no `metadata` and the route short-circuits at `publication.ts:41-43`. Preserved exactly as today.

### Not validated by this ticket

- `list_type.allowed_provenance`, `user.user_provenance`, `audit_log.user_provenance`, `user_archive.user_provenance` — the unrelated publisher/IdP concept (§2).
- `location_reference.provenance` — validated already at `reference-data-upload/validation/validation.ts:80`; §6.5 only changes where its constant comes from.
- The outbound `x-provenance` header CaTH pushes to Courtel — type-narrowed in §6.4 but not runtime-validated, since the value originates from an artefact row that passed the inbound gate.

## 10. Error Messages

Response bodies use the incumbent's `Message` shape, `{ message, timestamp }`, built by `buildMessage` (`libs/api/src/blob-ingestion/artefact-response.ts:69`). `timestamp` is an ISO local date-time with three fractional digits and **no** trailing `Z` or offset — see the rationale at `artefact-response.ts:73-85`.

| Condition | Status | `message` |
|---|---|---|
| `x-provenance` absent, empty, or whitespace only | `400` | `x-provenance is mandatory however an empty value is provided` |
| `x-provenance` present but not in the set (backend) | `400` | `Invalid x-provenance. Allowed values: MANUAL_UPLOAD, SNL, COMMON_PLATFORM, CP_CATH, PDDA` |
| `x-provenance` present but not in the set (APIM gateway) | `400` | identical to the row above |
| Invalid `x-provenance` **and** unknown `x-list-type` | `400` | `Invalid x-provenance. Allowed values: MANUAL_UPLOAD, SNL, COMMON_PLATFORM, CP_CATH, PDDA, Invalid x-list-type. Allowed values: <names>` |
| Invalid `x-provenance` **and** a missing mandatory header | `400` | the missing-header message only — see §9 precedence |

Example rejection:

```http
POST /api/v1/publication HTTP/1.1
Content-Type: application/json
x-provenance: INVALID_PROVENANCE
x-court-id: 1
x-content-date: 2026-10-23
x-list-type: CIVIL_AND_FAMILY_DAILY_CAUSE_LIST
x-language: ENGLISH
x-type: LIST
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "message": "Invalid x-provenance. Allowed values: MANUAL_UPLOAD, SNL, COMMON_PLATFORM, CP_CATH, PDDA",
  "timestamp": "2026-10-23T14:31:07.482"
}
```

Note the response carries **no** `errors` array. `blob-ingestion.spec.ts:163` asserts `expect(body).not.toHaveProperty("errors")`, so the per-field `ValidationError[]` stays internal and must not start leaking into the body.

### Gateway / backend message parity

The two layers must emit the same `message`. The duplication is unavoidable (§4), so it is guarded by test rather than by types — see §13. If the strings ever diverge, a supplier sees a different error for the same mistake depending on whether their traffic went through APIM, which is far more confusing than either message alone.

The `timestamp` values will differ in format precision risk: APIM's `DateTime.Now.ToString("yyyy-MM-dd'T'HH:mm:ss.fff")` is matched to `localDateTimeNow`, but it reports the APIM instance's local clock rather than the API pod's. Acceptable — the field is informational and is not echoed back or persisted.

## 11. Navigation

Not applicable. No redirects, links or journey transitions. A rejected publication returns `400` to the calling system; there is no browser involved and no page to navigate to.

## 12. Accessibility

Not applicable in the WCAG sense — this ticket renders no UI, so there is nothing to test with Axe or a screen reader, and no keyboard interaction, contrast or focus behaviour changes.

The one principle from `.claude/rules/design.md` that does carry over is error-message quality. The message names the field and enumerates the permitted values instead of a bare `"Invalid input"`, which is the behaviour §7 preserves deliberately. No new accessibility test is needed and none should be added to pad the suite.

## 13. Test Scenarios

### Unit — `libs/publication/src/provenance.test.ts` (extend the existing file)

* `PROVENANCES` contains exactly the five expected values in declaration order, so the error message built from it stays stable.
* `EXTERNAL_PROVENANCES` contains the four non-manual provenances and does not contain `MANUAL_UPLOAD` — the guard against the bug that would misroute every manual upload into provenance-location resolution.
* `isProvenance` returns true for each enum member and false for an unknown value, for the empty string, and for a lower-case or mixed-case rendering of a real member (`snl`, `Manual_Upload`) — pinning case sensitivity.
* `isExternalProvenance` returns false for `MANUAL_UPLOAD` and true for each of the other four.
* The existing label-coverage test is retained and restated in terms of `PROVENANCES`, so a newly added enum member fails the suite until it is given a label.

### Unit — `libs/api/src/blob-ingestion/validation.test.ts`

* The existing assertion at line 104-114 passes **unchanged**, proving the refactor to an enum-derived list did not alter the wire message.
* Each of the five valid provenances is accepted (table-driven), with `MANUAL_UPLOAD` resolving a numeric court ID and the four external ones resolving through the provenance-location lookup.
* An invalid provenance produces exactly one error, keyed `x-provenance`.
* An invalid provenance **and** a non-numeric `x-court-id` together produce only the `x-provenance` error — the regression test for defect 6 in §2. This fails against today's code.
* With an invalid provenance, neither `getLocationById` nor `getLocationByProvenanceLocationId` is called — asserted on the mocks, since "no database work" is the actual requirement and an error-count assertion would not catch a stray query.
* An invalid provenance alongside an unknown `x-list-type` yields both errors, joined in that order by `joinValidationMessages`.

### Unit — `libs/api/src/blob-ingestion/publication-headers.test.ts`

* A trimmed-whitespace provenance (`"  SNL  "`) still parses to `SNL` — line 156 already covers this and must keep passing, because the APIM policy's `.Trim()` is matched to it.
* An absent, empty and whitespace-only `x-provenance` each report the mandatory-header message, and the allowlist message never appears at this layer.

### Unit — route level, `apps/api/src/routes/v1/publication.test.ts`

* An invalid provenance returns `400` with the allowlist message and a truthy `timestamp`, and the body has no `errors` property.
* An invalid provenance on the **LCSU** path returns `400` and `uploadHtmlToS3` is never called — the check runs before the S3 write (`publication.ts:110-115`), so nothing is left in the bucket.
* An invalid provenance on the flat-file path returns `400` and no blob is written.

### Unit — consolidation guard

* A test asserting that no source file under `libs/` or `apps/` declares an array literal containing two or more artefact-provenance names outside `provenance.ts`. This is the executable form of acceptance criterion 1 — without it, the next developer re-introduces a local copy and nothing complains. Model it on the existing CI guard pattern in `libs/list-types/common/src/validation/guard.test.ts`.
* A test asserting the APIM policy and the backend agree: read `infrastructure/resources/operation-policies/createPublication.xml`, extract the quoted provenance values from the `<when>` condition, and assert the set equals `PROVENANCES` and that the `<set-body>` message equals the string the backend builds. This is the only mechanism that can catch the TypeScript/XML drift described in §4 and §10, and it costs one file read.

### Type-level

* `yarn lint` and the workspace build pass with `PublicationMetadata.provenance`, `Artefact.provenance`, `PushHeaderParams.provenance` and the processing-service params all typed `Provenance`. The build is the assertion; no separate test is written for it.

### E2E — `e2e-tests/tests/api/`

No new spec files and no new tests. Per CLAUDE.md the E2E suite is one test per journey, and `x-provenance: INVALID_PROVENANCE` is already an entry in the invalid-header table of both `blob-ingestion.spec.ts:190` and `flat-file-ingestion.spec.ts:164`, inside journeys that already assert `400` and the message body. Confirm both still pass; add a provenance case to the existing table only if the message assertion there is currently loose enough to miss a changed string.

### Manual verification on STG

Automated tests cannot reach the APIM policy, so the gateway gate needs one manual check after deploy:

* `POST` to the APIM `/publication` path with a valid publisher token and `x-provenance: INVALID_PROVENANCE` → `400` with the allowlist message, and **no** corresponding entry in the API pod logs, confirming the request was never forwarded.
* The same request with `x-provenance: SNL` and otherwise valid headers → `201`, confirming the policy has not broken the happy path.
* The same request with `x-provenance` omitted entirely → `400` with `x-provenance is mandatory however an empty value is provided`, confirming the `!= ""` fall-through works and the gateway did not swallow the backend's message.
* `x-provenance: "  SNL  "` (padded) → `201`, confirming the policy's `.Trim()` matches `readHeader`.

## 14. Assumptions & Open Questions

### Assumptions

* The five values in the existing `Provenance` enum are the complete and correct set. They match `docs/api/openapi.yaml:501-508`, `docs/tickets/1026/plan.md:36` and the live allowlist, so the ticket is understood as "make this set authoritative", not "change this set". If the ticket author intends to add or remove a value, that is a one-line change to `provenance.ts` plus the APIM list, but it needs saying explicitly.
* The ticket's acceptance criteria are a menu — the body labels them "Possible solutions:" — and not all six must be delivered. This spec delivers the single-source-of-truth enum, backend validation derived from it, APIM gateway validation, and fail-on-unrecognised-value. It deliberately declines the Prisma enum; see below.
* "Validation similar to the validation in HMI" refers to HMI's APIM-level header allowlisting. No HMI policy source was available in this repository, so §6.6 follows the structure of this service's own `api-policy.xml` rather than copying HMI's.
* No publisher is currently sending a provenance outside the set. They cannot be succeeding if they are — `validation.ts:29` already rejects them — so adding the APIM gate cannot break a working integration. Worth confirming against App Insights `400` rates before deploy regardless.
* STG and local artefact rows all hold one of the five values. This is only assumed because the Prisma column is being left as `String`; it would have to be *proven* before any enum migration.

### Open questions

1. **Does the team want the Prisma enum after all?** §6.7 recommends against it in this ticket: the schema contains no Prisma enums at all, the three sibling columns (`type`, `sensitivity`, `language`) are `String` despite having TypeScript enums, and the migration fails outright on any pre-existing out-of-set value. `.claude/rules/backend.md` points the other way. If the answer is yes, it should be a separate ticket covering all four columns, beginning with a `SELECT DISTINCT` audit per environment. **Needs a decision before this ticket is closed**, since it is the ticket's first acceptance bullet.

2. **Should APIM permit `MANUAL_UPLOAD`?** §6.6 permits all five so the gateway list equals the enum. The alternative — rejecting `MANUAL_UPLOAD` at the gateway, since a supplier arguably should never claim it — is defensible but makes the two layers disagree by design, and would need its own distinct error message. Recommend keeping all five unless product confirms no APIM caller will ever legitimately publish as `MANUAL_UPLOAD`.

3. **How is the `location → publication` dependency direction resolved for §6.5?** This is a confirmed circularity, not a hypothetical: `@hmcts/publication` already depends on `@hmcts/location` (`libs/publication/src/repository/queries.ts:3`, `libs/api/src/blob-ingestion/validation.ts:2`), so pointing `LOCATION_REFERENCE_PROVENANCES` at `@hmcts/publication` would violate CLAUDE.md pitfall 7. Three options, in order of preference:
   - **(a)** Move `provenance.ts` into a leaf package both can depend on. `libs/list-types/common` already hosts the sibling `list-type-provenance.ts`, which makes it the natural home and would put the two easily-confused sets side by side with the existing warning comment between them. Costs a re-export from `@hmcts/publication` to avoid touching every import site.
   - **(b)** Leave `libs/location` as it is and accept one remaining four-value duplication, with a comment cross-referencing `provenance.ts`. Smallest diff; partially misses acceptance criterion 1.
   - **(c)** Invert the location dependency out of `@hmcts/publication`. Much larger blast radius; not justified by this ticket.

   Recommend (a), but it widens the diff beyond what the ticket implies, so flag it at review rather than deciding unilaterally.

4. **Is `/v1/publication` meant to stay unexposed through APIM?** `apps/api/src/routes/publication.ts:1-3` says `/v1/publication` is "kept until the gateway path question is settled", and `env-config.tf:66-69` exposes only `/publication`. The provenance gate therefore protects one of the two paths. That is acceptable because the backend check is authoritative, but if `/v1/publication` is ever added to `apim_operations` the policy file must be duplicated under the new `operationId`. Does the open gateway-path question have an owner?

5. **Should `PROVENANCE_LABELS` move to locale files?** It holds English-only display strings (`"Manual Upload"`, `"Common Platform"`, `"CP-CaTH"`) and is rendered to users through `getArtefactDetails` (`libs/publication/src/repository/queries.ts:279`). CLAUDE.md requires user-facing strings to live in `en.ts`/`cy.ts` with Welsh provided. This is a pre-existing gap, deliberately untouched here to keep the diff reviewable. Raise as a follow-up ticket — it is a genuine Welsh-language defect, not a tidy-up.

6. **One in-repo writer bypasses the gate — is that acceptable?** `apps/crons` contains no provenance references at all, so the scheduled jobs are clear. But `libs/test-support/src/routes/test-support/artefacts.ts:51` writes `provenance: input.provenance || "MANUAL_UPLOAD"` straight to Prisma, with no allowlist check, and `artefacts.ts:16` and `:101` filter on a raw query-string provenance. These routes exist to seed and tear down E2E fixtures, so an arbitrary value there is arguably a feature rather than a bug — but it means `artefact.provenance` can hold an out-of-set value on any environment where test-support is mounted, which is exactly what would break the migration in question 1. Recommend typing the test-support input as `Provenance` so fixtures stay inside the set, unless a test genuinely needs to seed an invalid one. Confirm whether test-support is mounted on STG before treating question 1's `SELECT DISTINCT` audit as conclusive.


### Comment by OgechiOkelu on 2026-10-23T09:39:19Z

@plan 
