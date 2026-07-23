# Technical Plan: #872 — Mags Subscription emails updated with new Media Protocol

> **Note on the spec comment on the issue:** A detailed spec was posted as an issue
> comment. Its high-level intent is correct, but several concrete claims were
> **verified against the codebase and found stale**. This plan supersedes it. The
> corrections are called out inline and in §7.

## 1. Technical Approach

The subscription-email **opening message** (the current "Special Category Data"
warning) does **not** live in application code. It lives in the **GOV.UK Notify
template body** (external config), selected purely by template ID. The
`SPECIAL_CATEGORY_DATA_WARNING` constant in
`libs/list-types/common/src/email-summary/case-summary-formatter.ts` is exported
and unit-tested by ~25 list-type packages but is **never** passed into an outgoing
email as a personalisation parameter — it is effectively dead code with respect to
what subscribers actually receive.

This has a decisive consequence: **the wording change cannot be made in code alone.**
Whatever we do, a GOV.UK Notify template change is required. That reframes the
decision to "which mechanism minimises external template churn and risk", not "how
do we edit a string in the repo".

Two viable approaches:

**Approach A — Dedicated Magistrates Notify template (recommended).**
Create a new Notify subscription template (plus PDF/no-links variants to match the
existing set) containing the new opening message, add its template ID(s) as env
var(s), and route Magistrates list types to it inside `getSubscriptionTemplateId`
(driven by `listTypeName`). Existing templates and all non-Magistrates flows are
**untouched** — zero regression risk to other list types, and no risk to in-flight
sends. Cost: duplicated template bodies to maintain in Notify.

**Approach B — `opening_message` personalisation parameter.**
Add an `opening_message` field to `TemplateParameters`, populate it from code by
`listTypeName`, and edit **every** existing subscription Notify template to render
`{{ opening_message }}` in place of the hardcoded opening text. Keeps the wording in
code as a single source of truth, but requires editing all live templates
simultaneously and risks blank blocks / in-flight-send breakage if the code and
template deploys are not perfectly coordinated.

**Recommendation: Approach A.** The business framed the requirement as "this
*template* is sent for Mags subscriptions only" — a dedicated template matches that
intent, is self-contained, and carries no regression risk to the other ~25 list
types. Approach B's single-source-of-truth benefit is weakened by the fact that the
*other* templates already hold their opening text externally anyway, so we would not
achieve full in-code ownership without migrating every template. **This plan details
Approach A; §7 records the open question so the business/Notify owner can confirm.**

The Magistrates-vs-other decision is made on the stable `listTypeName`
(`list_types.name`), never a numeric `listTypeId`, per the CLAUDE.md list-type
rules. `notification-service.ts` already resolves `listTypeId → name` and already
keys `EMAIL_BUILDER_REGISTRY` by name, so the selection hook is a natural fit.

---

## 2. Implementation Details (Approach A)

### 2.1 Magistrates list-type name set — new shared constant

Add a single exported constant enumerating the six Magistrates `list_types.name`
values (verified in `libs/list-types/common/src/list-type-data.ts`):

```
MAGISTRATES_STANDARD_LIST
MAGISTRATES_PUBLIC_LIST
MAGISTRATES_ADULT_COURT_LIST_DAILY
MAGISTRATES_ADULT_COURT_LIST_FUTURE
MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY
MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE
```

Home it in `libs/notifications/src/govnotify/template-config.ts` next to the
existing `SJP_LIST_TYPE_NAMES` set (line ~9), mirroring that exact pattern:

```typescript
const MAGISTRATES_LIST_TYPE_NAMES: ReadonlySet<string> = new Set([
  "MAGISTRATES_STANDARD_LIST",
  "MAGISTRATES_PUBLIC_LIST",
  "MAGISTRATES_ADULT_COURT_LIST_DAILY",
  "MAGISTRATES_ADULT_COURT_LIST_FUTURE",
  "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY",
  "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE",
]);
```

Keeping it alongside `SJP_LIST_TYPE_NAMES` co-locates it with the template-routing
logic that consumes it and matches the established convention. No numeric IDs.

### 2.2 Template-ID routing — `getSubscriptionTemplateId`

**Correction to spec:** the function is `getSubscriptionTemplateId({ isSjp, hasPdf,
hasExcel, filesUnder2MB })` (lines ~15-44), **not** the spec's
`getSubscriptionTemplateIdForListType(listTypeId, hasPdf, pdfUnder2MB)`.

Extend the caller and this function to pass through an `isMagistrates` flag (derived
from `MAGISTRATES_LIST_TYPE_NAMES.has(listTypeName)`) and, when set, return the new
Magistrates template ID variant appropriate to the file situation:

- Magistrates + PDF ≤ 2MB → `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_MAGS_PDF`
- Magistrates + no usable file → `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_MAGS`

Follow the existing fallback pattern (the current non-SJP branch falls back
`GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF` → `..._SUBSCRIPTION_PDF_ONLY`, and
`GOVUK_NOTIFY_TEMPLATE_ID_NO_LINKS` → `..._SUBSCRIPTION`). Define the exact variant
matrix during implementation to match whatever Magistrates templates are actually
created in Notify (see §7 open question — the Magistrates set are all non-SJP, so
they currently take the non-SJP branch).

**SJP interaction:** SJP list types are a distinct family and are *not* in the
Magistrates set; `isSjp` continues to take precedence. Confirm SJP scope in §7.

### 2.3 Threading `listTypeName` to the template-ID selector

`notification-service.ts` resolves `listTypeName` (lines ~516 and ~610-612 via
`prisma.listType.findUnique`). It calls `buildEmailDataWithFiles` (lines ~426-458),
which invokes `getSubscriptionTemplateId`. Thread the already-known `listTypeName`
(or a precomputed `isMagistrates` boolean) down that call chain so the selector can
branch. Do not re-query Prisma — reuse the resolved name.

### 2.4 Personalisation parameters

For Approach A, the opening-message text lives in the **Notify template body**, so
`buildTemplateParameters` / `buildEnhancedTemplateParameters`
(`template-config.ts` lines ~84-132) need **no new personalisation field**. The
existing `TemplateParameters` object is unchanged. This is the key simplicity win of
Approach A over B.

*(If Approach B were chosen instead: add `opening_message` to `TemplateParameters`,
populate it in both `buildTemplateParameters` and `buildEnhancedTemplateParameters`,
and ensure the fallback path `buildFallbackEmailData` also sets it so fallback
Magistrates emails still carry the correct wording.)*

### 2.5 Message content as source of truth

Even under Approach A (text in Notify), record the approved English **and Welsh**
opening-message text in the repo for traceability and for any future migration to
Approach B. Store it as documentation in this ticket folder
(`docs/tickets/872/opening-message.md`) rather than as an unused code constant
(YAGNI — do not add a `MAGISTRATES_MEDIA_PROTOCOL_OPENING_MESSAGE` constant that
nothing sends). The single source of truth for what subscribers see remains the
Notify template.

### 2.6 Environment / config

Add new env vars for the Magistrates template ID(s) to the config schema and to
`.env` examples / Helm chart values / Key Vault wiring, mirroring how the existing
`GOVUK_NOTIFY_TEMPLATE_ID_*` vars are declared. Verify where these are validated
(the notifications lib reads them at `template-config.ts` top-of-file via
`process.env`).

### 2.7 Files touched

| File | Change |
|------|--------|
| `libs/notifications/src/govnotify/template-config.ts` | Add `MAGISTRATES_LIST_TYPE_NAMES`; extend `getSubscriptionTemplateId` to route Magistrates → new template ID(s); read new env var(s) |
| `libs/notifications/src/notification/notification-service.ts` | Thread resolved `listTypeName` / `isMagistrates` into `buildEmailDataWithFiles` → `getSubscriptionTemplateId` |
| `libs/notifications/src/govnotify/template-config.test.ts` | New cases for Magistrates routing (all six names) + ID-independence |
| `libs/notifications/src/notification/notification-service.test.ts` | Assert Magistrates lists select the Magistrates template; non-Mags unchanged |
| Env/config (schema, `.env` example, Helm values) | New `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_MAGS[_PDF]` |
| `docs/tickets/872/opening-message.md` | Approved EN/CY wording for traceability |
| **GOV.UK Notify (external)** | New Magistrates subscription template(s) with the new opening message |

---

## 3. Error Handling & Edge Cases

- **Missing env var:** if a Magistrates template ID is unset, follow the existing
  fallback convention (fall back to the standard subscription template) so a
  misconfiguration degrades to the old wording rather than crashing the send. Log a
  warning. Decide during implementation whether a hard failure is preferable — the
  existing code uses silent `||` fallbacks, so match that unless the business wants
  strictness.
- **Unknown list type name:** any name not in `MAGISTRATES_LIST_TYPE_NAMES` (and not
  SJP) falls through to the existing non-SJP branch → existing wording. This is the
  required default for all other list types.
- **`listTypeName` unresolved:** the id→name lookup is already `.catch(() => null)`
  guarded; a null name must not match the Magistrates set (Set `.has(undefined)`
  is `false`), so it safely falls back to existing behaviour.
- **In-flight sends (Approach A):** new templates are additive; no existing template
  is modified, so no in-flight risk. (Approach B would carry this risk.)
- **PDF vs no-file variants:** ensure the Magistrates branch honours the same
  `hasPdf` / `filesUnder2MB` logic as the non-SJP branch so the correct
  link/no-link Magistrates template is chosen.

---

## 4. Acceptance Criteria Mapping

| Acceptance criterion | How satisfied | Verification |
|---|---|---|
| Mags lists get new opening message | Magistrates names routed to new Notify template carrying the new wording | Unit test: each of six names → Magistrates template ID; manual Notify preview of the template body |
| All other lists keep existing wording | Non-Mags names untouched; existing templates unchanged | Unit test: sample non-Mags + SJP names → existing template IDs; regression on existing template-config tests |
| "Logic … Mags only" | `MAGISTRATES_LIST_TYPE_NAMES.has(listTypeName)` gate in `getSubscriptionTemplateId` | Unit tests both branches |
| Environment-stable selection | Decision keyed on `listTypeName`, never numeric id | Test uses arbitrary `listTypeId` (e.g. 999) while varying only the name |
| Welsh subscribers | See §7 open question — depends on how Welsh emails are delivered today | Blocked pending clarification |
| Working `mailto:` + readable phone | Rendered in the Notify template body using Notify markdown link syntax | Manual Notify preview / test send |

---

## 5. Testing

- `template-config.test.ts`: add a `describe("getSubscriptionTemplateId — Magistrates")`
  covering all six names → Magistrates template ID, PDF vs no-file variants, and a
  non-Mags/SJP name → existing IDs (regression). Prove ID-independence by fixing
  `listTypeId` to an arbitrary value and varying only the name.
- `notification-service.test.ts`: assert that a Magistrates `listTypeName` results in
  the Magistrates template ID being requested, and a non-Mags one does not; keep the
  existing enhanced-vs-fallback and language-query assertions green.
- No new list-type schema/validator work — this is not a new list type, so the
  `libs/list-types/common` guard test is not engaged.
- **E2E:** none warranted — this is email-template routing with no web page. Notify
  content is verified by preview/test-send, not Playwright.

---

## 6. Content

The approved English wording (from the issue AC) will be recorded in
`docs/tickets/872/opening-message.md`. The **Welsh** translation is **not yet
available** and is required before the Welsh Notify template can be authored (see
§7). Confirm the email address spelling as written in the protocol —
`mediaandpressenquires@justice.gov.uk` ("enquires", not "enquiries") — before it is
baked into a template.

---

## 7. CLARIFICATIONS NEEDED

1. **Approach A vs B.** This plan recommends a **dedicated Magistrates Notify
   template** (Approach A) over an `opening_message` personalisation parameter
   (Approach B), because the opening message currently lives in the Notify template
   body for *all* list types, so a code-only change is impossible either way, and a
   dedicated template carries no regression risk to the other ~25 list types. Do you
   agree, or do you want the wording owned in code (Approach B, requiring every
   existing subscription template to be edited to render `{{ opening_message }}`)?

2. **Who owns the GOV.UK Notify template change, and what are the new template IDs?**
   Approach A needs new Magistrates subscription template(s) created in Notify (with
   PDF / no-link variants to match the existing set) and their IDs provided for the
   new env vars. Who creates these and in which Notify service/workspace?

3. **Welsh delivery — this is a blocker.** The notifications lib has **no bilingual
   email-content mechanism**: subscriber language is handled purely at the DB query
   level (`listLanguage: { has: language }`), and email content is English-only in
   code. How is Welsh subscription-email content delivered *today* — separate Welsh
   Notify templates, or are all subscription emails currently English-only? The
   answer determines whether we need a Welsh Magistrates template and an approved
   Welsh translation of the new wording (not yet supplied).

4. **SJP scope.** Do the Single Justice Procedure lists (`SJP_PRESS_LIST`,
   `SJP_PUBLIC_LIST`, `SJP_DELTA_PRESS_LIST`, `SJP_DELTA_PUBLIC_LIST`) count as
   "Magistrates court hearing lists" for this protocol change? They are
   magistrates-jurisdiction but a distinct family with their own templates. Assumed
   **out of scope** unless confirmed.

5. **Email address spelling.** Confirm `mediaandpressenquires@justice.gov.uk`
   ("enquires") is intentional as written in the protocol, and that the trailing
   comma in the issue body is a copy/paste artefact.

6. **Fallback strictness.** If a Magistrates template ID env var is missing, should
   the send fall back to the existing template (degrade to old wording, matches
   current code style) or hard-fail? Current code uses silent `||` fallbacks.
