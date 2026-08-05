# #895: CaTH account verification requirement added in CaTH account creation T&C

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** None
**Created:** 2026-07-28T13:43:46Z
**Updated:** 2026-08-05T08:57:55Z

## Description

**PROBLEM STATEMENT**

During the annual verification process, CaTH account holders are sent an email to re-verify their accounts. Where a CaTH account is not verified within the allocated verification time, the account is deleted. This verification process needs to be indicated clearly in the CaTH  account creation form. 

 

**AS A** service

**I WANT** to add details of the annual verification process to the CaTH account creation form

**SO THAT** potential account holders are aware of the requirements 

 

 

**ACCEPTANCE CRITERIA**

- On the create a CaTH account form here https://cath-web.staging.platform.hmcts.net/create-media-account the form is updated to follow the same format as is presented here https://www.court-tribunal-hearings.service.gov.uk/create-media-account 
- 'Terms and conditions' is displayed boldly as a section header, underneath the 'Upload a clear photo of your UK Press Card or work ID' section and just above the 'A Court and tribunal hearing account is granted.....' section.
- A paragraph that clearly defines the annual verification requirements is added in the 'Terms and Conditions' section of the CaTH account creation form

- Current information on https://www.court-tribunal-hearings.service.gov.uk/create-media-account reads as follows;

**Terms and conditions**

A Court and tribunal hearing account is granted based on you having legitimate reasons to access information not open to the public e.g. you are a member of a media organisation and require extra information to report on hearings.

If your circumstances change and you no longer have legitimate reasons to hold a Court and tribunal hearings account e.g. you leave your employer entered above. It is your responsibility to inform HMCTS of this for your account to be deactivated.

- The above is updated to read as follows;

**Terms and conditions**

A Court and tribunal hearing account is granted based on you having legitimate reasons to access information not open to the public e.g. you are a member of a media organisation and require extra information to report on hearings.

As part of our annual verification process, you will be sent an email to verify you still have access to the email address that was used to create your account. If you do not verify your email address within the stipulated time, your account will be removed and you will need to apply for a new account if you still require access.

If your circumstances change and you no longer have legitimate reasons to hold a Court and tribunal hearings account e.g. you leave your employer entered above. It is your responsibility to inform HMCTS of this for your account to be deactivated.

 

**Welsh translation:**

As part of our annual verification process, you will be sent an email to verify you still have access to the email address that was used to create your account. If you do not verify your email address within the stipulated time, your account will be removed, and you will need to apply for a new account if you still require access.

Fel rhan o'n proses ddilysu flynyddol, fe anfonir e-bost atoch yn gofyn i chi gadarnhau bod gennych dal fynediad i'r cyfeiriad e-bost a ddefnyddiwyd i greu eich cyfrif. Os na fyddwch yn dilysu eich cyfeiriad e-bost o fewn yr amser a bennwyd, caiff eich cyfrif ei ddileu, a bydd rhaid i chi wneud cais am gyfrif newydd os bydd angen mynediad arnoch o hyd.

 
Terms and conditions - Telerau ac Amodau

A Court and tribunal hearing account is granted based on you having legitimate reasons to access information not open to the public e.g. you are a member of a media organisation and require extra information to report on hearings.

Caniateir ichi gael cyfrif ar gyfer gwrandawiadau Llys a thribiwnlys ar yr amod bod gennych resymau cyfreithiol dros gael mynediad at wybodaeth nad yw ar gael i’r cyhoedd e.e. rydych yn aelod o sefydliad cyfryngau ac angen gwybodaeth ychwanegol i riportio ar wrandawiadau.

If your circumstances change and you no longer have legitimate reasons to hold a Court and tribunal hearings account e.g. you leave your employer entered above. It is your responsibility to inform HMCTS of this for your account to be deactivated.

Os bydd eich amgylchiadau’n newid ac nid oes gennych mwyach resymau cyfreithiol dros gael cyfrif ar gyfer gwrandawiadau Llys a thribiwnlys e.e. rydych yn gadael eich cyflogwr a enwyd uchod, eich cyfrifoldeb chi yw hysbysu GLlTEF am hyn fel y gellir dadactifadu eich cyfrif.




## Comments

### Comment by OgechiOkelu on 2026-08-05T08:53:31Z

@spec 

### Comment by hmctsclaudecode on 2026-08-05T08:57:26Z

# Technical Specification — Issue #895: CaTH account verification requirement added in CaTH account creation T&C

## 1. User Story
**As a** service (HMCTS Court and Tribunal Hearings)
**I want to** add details of the annual account verification process to the Court and tribunal hearings account creation form, presented under a clearly signposted "Terms and conditions" section heading
**So that** potential account holders are aware before they apply that they must re-verify their email address annually or their account will be removed

## 2. Background

CaTH account holders are sent a re-verification email as part of an annual verification cycle. If the holder does not verify within the allocated window, the account is deleted. That obligation is currently invisible at the point of application: the staging form (`/create-media-account`) presents the terms as a single unbroken block of hint text attached to the consent checkbox, with no section heading and no mention of verification.

The live legacy service (`https://www.court-tribunal-hearings.service.gov.uk/create-media-account`) presents the terms as a bold **Terms and conditions** section header followed by discrete paragraphs. This ticket brings the new service's layout into line with that format and inserts the new verification paragraph.

**Current state in this codebase:**

| Concern | Location |
|---|---|
| Controller | `apps/web/src/pages/(public)/create-media-account/index.ts` |
| Template | `apps/web/src/pages/(public)/create-media-account/index.njk` |
| English content | `apps/web/src/pages/(public)/create-media-account/en.ts` |
| Welsh content | `apps/web/src/pages/(public)/create-media-account/cy.ts` |
| Validation | `libs/public-pages/src/validation.ts` |
| Template tests | `apps/web/src/pages/(public)/create-media-account/index.njk.test.ts` |
| Controller tests | `apps/web/src/pages/(public)/create-media-account/index.test.ts` |
| E2E tests | `e2e-tests/tests/create-media-account.spec.ts` |

Today `en.termsText` / `cy.termsText` hold the two existing terms sentences concatenated into one string, injected as the `hint.html` of `govukCheckboxes` at `index.njk:109-111`. There is no `<h2>` on the page at all.

**Scope:** content and presentation only. `termsText` is *not* part of the `MediaAccountContent` interface in `libs/public-pages/src/validation.ts` (only the `error*` keys are), so restructuring it has no effect on validation, on the `MediaApplication` model, or on any persisted data. No database, API, or business-logic change is required.

**Out of scope:** building the annual verification job itself, the verification email, and the account-deletion process. This ticket only describes that process to the applicant.

## 3. Acceptance Criteria

* **Scenario:** Terms and conditions section heading is displayed
    * **Given** a user is on `/create-media-account`
    * **When** the page renders
    * **Then** a bold "Terms and conditions" section heading (`<h2 class="govuk-heading-m">`) appears after the "Upload a photo of your ID proof" field and before the "A Court and tribunal hearing account is granted…" paragraph

* **Scenario:** Annual verification paragraph is displayed in English
    * **Given** a user is on `/create-media-account` with locale `en`
    * **When** the page renders
    * **Then** three separate paragraphs appear under the "Terms and conditions" heading, in this order: the "legitimate reasons" paragraph, the annual verification paragraph, and the "circumstances change" paragraph
    * **And** the annual verification paragraph reads exactly: "As part of our annual verification process, you will be sent an email to verify you still have access to the email address that was used to create your account. If you do not verify your email address within the stipulated time, your account will be removed and you will need to apply for a new account if you still require access."

* **Scenario:** Annual verification paragraph is displayed in Welsh
    * **Given** a user is on `/create-media-account?lng=cy`
    * **When** the page renders
    * **Then** the "Terms and conditions" heading and all three terms paragraphs render in Welsh
    * **And** no English text appears in the terms section

* **Scenario:** Consent checkbox still gates submission
    * **Given** a user has completed all fields and uploaded a valid ID file but has not ticked the consent checkbox
    * **When** they select "Continue"
    * **Then** the existing terms validation error is shown in the error summary and against the checkbox, linked to `#termsAccepted`
    * **And** the restructured terms content is still rendered above the checkbox

* **Scenario:** Successful application is unaffected
    * **Given** a user completes all fields, uploads a valid ID file and ticks the consent checkbox
    * **When** they select "Continue"
    * **Then** they are redirected to `/account-request-submitted` and a `PENDING` media application is created, exactly as before this change

* **Scenario:** Heading structure remains valid
    * **Given** a user is on `/create-media-account`
    * **When** the page is inspected with an accessibility tool
    * **Then** heading order is `h1` → `h2` with no skipped levels and no axe-core violations are reported

## 4. User Journey Flow

No change to the journey — only to the content of step 2.

```
┌─────────────────────┐
│  /sign-in           │
│  "Create an account"│
└──────────┬──────────┘
           │
           ▼
┌───────────────────────────────────────────────┐
│  /create-media-account                        │
│  ─────────────────────────────────────────    │
│  Full name / Email / Employer / ID upload     │
│                                               │
│  ★ Terms and conditions  (NEW h2)             │
│     • legitimate reasons paragraph            │
│     • annual verification paragraph  (NEW)    │
│     • circumstances change paragraph          │
│                                               │
│  [ ] Agree to terms and conditions            │
│  [ Continue ]                                 │
└──────────┬─────────────────────────┬──────────┘
           │ valid                   │ invalid
           ▼                         ▼
┌────────────────────────┐  ┌──────────────────────────┐
│ /account-request-      │  │ Redirect back to         │
│  submitted             │  │ /create-media-account    │
│ "Details submitted"    │  │ with error summary +     │
└────────────────────────┘  │ preserved form data      │
                            └──────────────────────────┘
```

## 5. Low Fidelity Wireframe

```
╔═══════════════════════════════════════════════════════════════════════╗
║ GOV.UK  Court and tribunal hearings                     English | Cymraeg ║
╠═══════════════════════════════════════════════════════════════════════╣
║  BETA  This is a new service – your feedback will help us improve it.  ║
╟───────────────────────────────────────────────────────────────────────╢
║                                                                       ║
║  Create a Court and tribunal hearings account                (h1, xl) ║
║                                                                       ║
║  A Court and tribunal hearings account is for professional users...   ║
║  An account holder, once signed in, will be able to choose...         ║
║  We will retain the personal information you enter here...            ║
║                                                                       ║
║  Full name                                                            ║
║  ┌─────────────────────────────────────────────────┐                  ║
║  │                                                 │                  ║
║  └─────────────────────────────────────────────────┘                  ║
║                                                                       ║
║  Email address                                                        ║
║  We'll only use this to contact you about your account...    (hint)   ║
║  ┌─────────────────────────────────────────────────┐                  ║
║  │                                                 │                  ║
║  └─────────────────────────────────────────────────┘                  ║
║                                                                       ║
║  Employer                                                             ║
║  ┌─────────────────────────────────────────────────┐                  ║
║  │                                                 │                  ║
║  └─────────────────────────────────────────────────┘                  ║
║                                                                       ║
║  Upload a photo of your ID proof                                      ║
║  Upload a clear photo of your UK Press Card or work ID. We    (hint)  ║
║  will only use this to confirm your identity for this service,        ║
║  and will delete upon approval or rejection of your request...        ║
║  [ Choose file ]  No file chosen                                      ║
║                                                                       ║
║ ┌───────────────────────────────────────────────────────────────────┐ ║
║ │  Terms and conditions                          ★ NEW (h2, bold)  │ ║
║ │                                                                   │ ║
║ │  A Court and tribunal hearing account is granted based on you     │ ║
║ │  having legitimate reasons to access information not open to      │ ║
║ │  the public e.g. you are a member of a media organisation and     │ ║
║ │  require extra information to report on hearings.                 │ ║
║ │                                                                   │ ║
║ │  As part of our annual verification process, you will be sent  ★  │ ║
║ │  an email to verify you still have access to the email          N  │ ║
║ │  address that was used to create your account. If you do not    E  │ ║
║ │  verify your email address within the stipulated time, your      W  │ ║
║ │  account will be removed and you will need to apply for a          │ ║
║ │  new account if you still require access.                          │ ║
║ │                                                                   │ ║
║ │  If your circumstances change and you no longer have legitimate   │ ║
║ │  reasons to hold a Court and tribunal hearings account e.g. you   │ ║
║ │  leave your employer entered above. It is your responsibility     │ ║
║ │  to inform HMCTS of this for your account to be deactivated.      │ ║
║ └───────────────────────────────────────────────────────────────────┘ ║
║                                                                       ║
║  ┌──┐                                                                 ║
║  │  │  Please tick this box to agree to the above terms and           ║
║  └──┘  conditions                                                     ║
║                                                                       ║
║  ┌────────────────┐                                                   ║
║  │   Continue     │                                                   ║
║  └────────────────┘                                                   ║
║                                                                       ║
║  Back to top                                                          ║
╚═══════════════════════════════════════════════════════════════════════╝
```

### Error state (terms not accepted)

```
╔═══════════════════════════════════════════════════════════════════════╗
║  ┌───────────────────────────────────────────────────────────────┐    ║
║  │ There is a problem                                            │    ║
║  │  • There is a problem - You must check the box to confirm      │    ║
║  │    you agree to the terms and conditions.        → #termsAccepted   ║
║  └───────────────────────────────────────────────────────────────┘    ║
║                                                                       ║
║  Create a Court and tribunal hearings account                         ║
║  ...                                                                  ║
║  Terms and conditions                                                 ║
║  (three paragraphs — unchanged in error state)                        ║
║                                                                       ║
║  ┃ Error: There is a problem - You must check the box to confirm      ║
║  ┃ you agree to the terms and conditions.                             ║
║  ┃ ┌──┐                                                               ║
║  ┃ │  │  Please tick this box to agree to the above terms and        ║
║  ┃ └──┘  conditions                                                   ║
╚═══════════════════════════════════════════════════════════════════════╝
```

## 6. Page Specifications

### 6.1 Content restructure — `en.ts` / `cy.ts`

Replace the single `termsText` key with four keys. Both locale files must keep identical key sets (asserted by an existing test).

| Removed key | New keys |
|---|---|
| `termsText` | `termsHeading`, `termsParagraph1`, `termsParagraph2`, `termsParagraph3` |

`termsParagraph1` and `termsParagraph3` are the two sentences currently concatenated in `termsText`, split apart verbatim. `termsParagraph2` is new.

Note: the existing `cy.termsText` contains the typo `GLlTEM`; the correct abbreviation used by the ticket and the live service is `GLlTEF`. Fix this when splitting the string.

### 6.2 Template restructure — `index.njk`

Move the terms copy out of the `govukCheckboxes` `hint` and render it as a proper document section between the file-upload form group and the checkbox.

Remove the `hint` option from the `govukCheckboxes` call at `index.njk:109-111`, and insert immediately before it:

```njk
<h2 class="govuk-heading-m">{{ termsHeading }}</h2>
<p class="govuk-body">{{ termsParagraph1 }}</p>
<p class="govuk-body">{{ termsParagraph2 }}</p>
<p class="govuk-body">{{ termsParagraph3 }}</p>
```

The heading and paragraphs sit **inside** the `<form>` element, after the `idProof` form group, so the visual order matches the AC exactly.

Rationale for moving out of `hint.html`:
- The AC requires a bold *section header*. A `govuk-hint` cannot carry a heading without producing invalid markup (a heading nested inside the checkbox fieldset's hint, announced as part of the field description).
- Three separate `<p>` elements are required by the AC ("A paragraph that clearly defines the annual verification requirements is added"). The current single-string hint cannot express paragraph breaks.
- The terms are page-level context, not a field-level hint; a 130-word hint read out in full every time the checkbox receives focus is poor screen-reader UX.

Consequence to be aware of: `#termsAccepted-hint` will no longer exist, and the checkbox's `aria-describedby` will no longer point at the terms text. This is the intended outcome — see §12.

### 6.3 Component usage

| Element | Component / class | Notes |
|---|---|---|
| Section header | `<h2 class="govuk-heading-m">` | First and only `h2` on the page; `h1` → `h2`, no skipped level |
| Terms paragraphs | `<p class="govuk-body">` | Three separate elements, no custom classes, no inline styles |
| Consent checkbox | `govukCheckboxes` (existing) | `hint` option removed; `name`, `items`, `errorMessage` unchanged |

No new components, no custom CSS, no JavaScript. Everything works without JS.

### 6.4 Controller

`apps/web/src/pages/(public)/create-media-account/index.ts` requires **no change**. It already spreads the whole locale object into the render context (`...content`), so the four new keys are available to the template automatically.

### 6.5 Files changed

| File | Change |
|---|---|
| `apps/web/src/pages/(public)/create-media-account/en.ts` | Replace `termsText` with 4 keys |
| `apps/web/src/pages/(public)/create-media-account/cy.ts` | Replace `termsText` with 4 keys (Welsh) |
| `apps/web/src/pages/(public)/create-media-account/index.njk` | Add `h2` + 3 `<p>`; remove checkbox `hint` |
| `apps/web/src/pages/(public)/create-media-account/index.njk.test.ts` | Update terms assertions and `requiredKeys` list |
| `e2e-tests/tests/create-media-account.spec.ts` | Add heading + verification-paragraph assertions to the journey test |

No change to `libs/public-pages`, Prisma schema, migrations, or API routes.

## 7. Content

### English — `en.ts`

```typescript
termsHeading: "Terms and conditions",
termsParagraph1:
  "A Court and tribunal hearing account is granted based on you having legitimate reasons to access information not open to the public e.g. you are a member of a media organisation and require extra information to report on hearings.",
termsParagraph2:
  "As part of our annual verification process, you will be sent an email to verify you still have access to the email address that was used to create your account. If you do not verify your email address within the stipulated time, your account will be removed and you will need to apply for a new account if you still require access.",
termsParagraph3:
  "If your circumstances change and you no longer have legitimate reasons to hold a Court and tribunal hearings account e.g. you leave your employer entered above. It is your responsibility to inform HMCTS of this for your account to be deactivated.",
termsCheckboxLabel: "Please tick this box to agree to the above terms and conditions",
```

### Welsh — `cy.ts`

The issue supplies signed-off Welsh for all three paragraphs and the heading. Use the translation markers below; the post-processing script resolves them against the supplied copy.

```typescript
termsHeading: "[TRANSLATE: \"Terms and conditions\"]",
termsParagraph1:
  "[TRANSLATE: \"A Court and tribunal hearing account is granted based on you having legitimate reasons to access information not open to the public e.g. you are a member of a media organisation and require extra information to report on hearings.\"]",
termsParagraph2:
  "[TRANSLATE: \"As part of our annual verification process, you will be sent an email to verify you still have access to the email address that was used to create your account. If you do not verify your email address within the stipulated time, your account will be removed and you will need to apply for a new account if you still require access.\"]",
termsParagraph3:
  "[TRANSLATE: \"If your circumstances change and you no longer have legitimate reasons to hold a Court and tribunal hearings account e.g. you leave your employer entered above. It is your responsibility to inform HMCTS of this for your account to be deactivated.\"]",
```

Welsh supplied in the issue, for reference by the translation script:

| Key | Welsh |
|---|---|
| `termsHeading` | Telerau ac Amodau |
| `termsParagraph1` | Caniateir ichi gael cyfrif ar gyfer gwrandawiadau Llys a thribiwnlys ar yr amod bod gennych resymau cyfreithiol dros gael mynediad at wybodaeth nad yw ar gael i'r cyhoedd e.e. rydych yn aelod o sefydliad cyfryngau ac angen gwybodaeth ychwanegol i riportio ar wrandawiadau. |
| `termsParagraph2` | Fel rhan o'n proses ddilysu flynyddol, fe anfonir e-bost atoch yn gofyn i chi gadarnhau bod gennych dal fynediad i'r cyfeiriad e-bost a ddefnyddiwyd i greu eich cyfrif. Os na fyddwch yn dilysu eich cyfeiriad e-bost o fewn yr amser a bennwyd, caiff eich cyfrif ei ddileu, a bydd rhaid i chi wneud cais am gyfrif newydd os bydd angen mynediad arnoch o hyd. |
| `termsParagraph3` | Os bydd eich amgylchiadau'n newid ac nid oes gennych mwyach resymau cyfreithiol dros gael cyfrif ar gyfer gwrandawiadau Llys a thribiwnlys e.e. rydych yn gadael eich cyflogwr a enwyd uchod, eich cyfrifoldeb chi yw hysbysu GLlTEF am hyn fel y gellir dadactifadu eich cyfrif. |

### Content notes

- Copy is reproduced **verbatim** from the issue, including the sentence fragment in `termsParagraph3` ("…e.g. you leave your employer entered above." followed by a new sentence). This matches the live service; do not "fix" it without content-design sign-off.
- The issue's Welsh block repeats the English `termsParagraph2` line before the Welsh; only the Welsh sentence is used.
- The existing `cy.termsText` abbreviation `GLlTEM` is corrected to `GLlTEF` per the issue and the live service.
- The word "stipulated" is above the target reading age of 9. Flagged as an open question (§14) — the copy is otherwise taken verbatim from the live service and the issue, so it ships as supplied unless content design directs otherwise.

## 8. URL

`/create-media-account` — unchanged.

- Route source: `apps/web/src/pages/(public)/create-media-account/index.ts` (auto-discovered; `(public)` is a route group and adds no URL prefix)
- Methods: `GET`, `POST`
- Welsh: `/create-media-account?lng=cy` (locale read from `req.query.lng`)
- No redirects, no new routes, no route deletions.

## 9. Validation

No validation changes. The existing rules in `libs/public-pages/src/validation.ts` (`validateForm`) are untouched:

| Field | Rules |
|---|---|
| `fullName` | Required; must not start with a space; must not contain double spaces; must contain a space (first + last name) |
| `email` | Required; must not start with a space; must not contain double spaces; must match the email format |
| `employer` | Required; must not start with a space; must not contain double spaces |
| `idProof` | Required; must be JPG, PDF or PNG; must be < 2 MB |
| `termsAccepted` | Required; must equal `"on"` |

Explicit confirmations for this ticket:
- Adding the verification paragraph does **not** add a field, so no new validation rule.
- The single consent checkbox continues to cover **all three** terms paragraphs. The applicant is not asked to consent to the verification requirement separately.
- Validation remains server-side only; the form keeps `novalidate`.
- `termsText` is not referenced by `MediaAccountContent`, so removing it cannot break `validateForm`'s content contract. Confirm with a type-check (`yarn lint` / `tsc`) that no other module imports it.

## 10. Error Messages

No new or changed error messages. The existing set is unchanged in both locales:

| Field | English |
|---|---|
| `#fullName` | There is a problem - Full name field must be populated |
| `#fullName` | There is a problem - Full name field must not start with a space |
| `#fullName` | There is a problem - Full name field must not contain double spaces |
| `#fullName` | There is a problem - Your full name will be needed to support your application for an account |
| `#email` | There is a problem - Email address field must be populated |
| `#email` | There is a problem - Email address field cannot start with a space |
| `#email` | There is a problem - Email address field cannot contain double spaces |
| `#email` | There is a problem - Enter an email address in the correct format, like name@example.com |
| `#employer` | There is a problem - Your employers name will be needed to support your application for an account |
| `#employer` | There is a problem - Employer field cannot start with a space |
| `#employer` | There is a problem - Employer field cannot contain double spaces |
| `#idProof` | There is a problem - We will need ID evidence to support your application for an account |
| `#idProof` | There is a problem - ID evidence needs to be less than 2Mbs |
| `#idProof` | There is a problem - ID evidence must be a JPG, PDF or PNG |
| `#termsAccepted` | There is a problem - You must check the box to confirm you agree to the terms and conditions. |

Error summary title: "There is a problem" / "Mae yna broblem".

The terms error message text is **not** amended to mention annual verification — the checkbox still confirms agreement to the terms as a whole.

## 11. Navigation

Unchanged.

| Trigger | Destination |
|---|---|
| `GET /create-media-account` | Renders the form; restores session-held form data and errors, then clears them |
| `POST` with validation errors | `302` → `/create-media-account?lng={locale}` with errors and form data in session (post-redirect-get, so a browser refresh does not resubmit) |
| `POST` valid | `302` → `/account-request-submitted?lng={locale}` |
| `POST` unhandled exception | `500` → `errors/500` |
| "Back to top" link | `#top` anchor at the head of the page content |
| Language toggle | Re-renders the same URL with `?lng=cy` / `?lng=en` |

Adding the `h2` and paragraphs does not affect the `#top` anchor or the language toggle.

## 12. Accessibility

Target: **WCAG 2.2 AA**.

### Introduced by this change

| Requirement | How it is met |
|---|---|
| 1.3.1 Info and Relationships | Terms are marked up as a real `<h2>` plus three `<p>` elements, not one run-on hint string. Screen-reader users can reach the section via heading navigation and read it paragraph by paragraph |
| 2.4.6 Headings and Labels | "Terms and conditions" describes the section it introduces |
| 2.4.10 Section Headings (AAA, met incidentally) | The terms block gains a heading it previously lacked |
| Heading order (axe `heading-order`) | `h1` (page title) → `h2` (Terms and conditions). No level skipped; this is the page's only `h2` |
| 1.4.3 Contrast | Uses `govuk-heading-m` and `govuk-body` only — GOV.UK default black on white |

### Deliberate change to the checkbox

Removing `hint` from `govukCheckboxes` removes `#termsAccepted-hint` and drops it from the checkbox's `aria-describedby`. This is intentional:

- The checkbox label ("Please tick this box to agree to the above terms and conditions") remains, and continues to be the accessible name — it is self-describing and refers to the content above.
- The `#termsAccepted-error` id remains in `aria-describedby` when validation fails, so errors are still announced.
- A 130-word hint re-read on every focus of the checkbox is worse for screen-reader and screen-magnifier users than a navigable heading + paragraphs immediately preceding the control.

Do **not** replace the hint with `aria-labelledby` pointing at the paragraphs — that would override the label.

### Unchanged and to be re-verified

- Page title matches `h1`
- All inputs have associated `<label for>`; `email` and `idProof` retain `aria-describedby` for their hints
- Error summary has `tabindex="-1"` and links to each field id
- Field-level errors include a visually hidden "Error:" prefix
- Full keyboard journey: tab to each field, `Space` to toggle the checkbox, `Enter` to submit
- Reflow at 320px / 400% zoom: paragraphs sit in `govuk-grid-column-two-thirds` and wrap; no horizontal scroll
- Welsh page carries the correct `lang` attribute so paragraphs are pronounced with Welsh phonetics

### Verification

- `axe-core` via Playwright with `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`, keeping the existing `target-size`, `link-name`, `region` disables (documented pre-existing site-wide footer issues — do not add new disables for this change)
- Manual screen-reader pass (NVDA or VoiceOver): confirm the "Terms and conditions" heading is listed in the headings rota and that each paragraph reads as a discrete block

## 13. Test Scenarios

(High-level scenario descriptions only)

### Template tests — `index.njk.test.ts`

* Renders an `h2` containing the English terms heading, positioned after the `idProof` form group and before the `termsAccepted` checkbox in document order.
* Renders exactly three terms paragraphs as separate `<p class="govuk-body">` elements, in the order paragraph 1 → paragraph 2 (annual verification) → paragraph 3.
* The annual verification paragraph text is present and matches the English content key exactly.
* No `#termsAccepted-hint` element exists, and the checkbox's `aria-describedby` does not reference a hint id in the no-error state.
* The consent checkbox and its label still render, and `aria-describedby` includes `termsAccepted-error` when a terms error is supplied.
* Welsh render: the `h2` and all three paragraphs use the `cy` values; the English verification sentence does not appear anywhere in the output.
* Locale parity: `Object.keys(en).sort()` equals `Object.keys(cy).sort()`; `requiredKeys` updated to drop `termsText` and add the four new keys; `termsText` is absent from both objects.
* Existing coverage retained unchanged: heading and opening text, all field labels and hints, error summary for every field message in both locales, value pre-fill, no-error state, continue button, back-to-top link.

### Controller tests — `index.test.ts`

* `GET` render context includes `termsHeading`, `termsParagraph1`, `termsParagraph2`, `termsParagraph3` for `en` and for `cy`.
* Existing `GET` and `POST` behaviour is unaffected: session restore-and-clear, redirect on validation failure with preserved data, redirect to `/account-request-submitted` on success, `500` render on service failure.

### Validation tests — `libs/public-pages/src/validation.test.ts`

* No new tests. Existing suite must still pass unchanged, proving the content restructure did not touch the validation contract.

### E2E — `e2e-tests/tests/create-media-account.spec.ts`

Extend the existing journey tests rather than adding new ones (project rule: minimum test count, one test per journey).

* Within the successful-submission journey test: assert the "Terms and conditions" heading is visible, assert the annual verification paragraph text is visible, then complete the form and confirm the redirect to the submitted page — so the new content is proven not to have broken submission.
* Within the Welsh journey test: assert the Welsh terms heading and the Welsh annual verification paragraph are visible on `/create-media-account?lng=cy`.
* Within the existing accessibility test: unchanged axe run must continue to report zero violations, covering the new heading-order and structure assertions.
* Within the terms-not-accepted validation test: confirm the terms error still appears and the terms paragraphs remain rendered on the re-displayed page.

### Manual / regression checks

* Visual comparison of `/create-media-account` against the live service page to confirm the section order and formatting now match.
* Repo-wide search confirms no remaining references to `termsText`; `yarn lint` and the type-check pass.

## 14. Assumptions & Open Questions

**Assumptions**

* The change is content and presentation only. No annual verification job, verification email, or deletion process is built by this ticket.
* The single existing consent checkbox covers all three terms paragraphs; no separate consent for the verification requirement is required.
* `h2` / `govuk-heading-m` is the correct interpretation of "displayed boldly as a section header" — GOV.UK does not use standalone bold text for section headings.
* The four content keys stay co-located in `apps/web/src/pages/(public)/create-media-account/`, per the project default. The terms copy is used by one page only, so it is not promoted to `libs/public-pages`.
* Copy is used verbatim from the issue, including the sentence fragment in paragraph 3, because it matches the live service.
* `cy.termsText`'s `GLlTEM` is a typo and is corrected to `GLlTEF` as part of the split; this is the abbreviation the issue and the live service use.
* Removing `termsText` is safe because it is referenced only by this page's template and tests, and is not part of the `MediaAccountContent` interface.
* The paragraph order given in the issue (verification paragraph second, between the two existing paragraphs) is deliberate and is followed exactly.

**Open questions**

* "within the stipulated time" is vague and above a reading age of 9. Should the copy state the actual window (e.g. "within 14 days")? Requires product and content-design sign-off; the verbatim wording ships until then.
* Existing account holders applied under terms that did not mention annual verification. Is any separate notification to them in scope, or is that a follow-up ticket?
* Does the confirmation page (`/account-request-submitted`) or the account-approval email also need the verification requirement restated? Not in the AC, so excluded.
* Should the terms section be given an `id` (e.g. `id="terms-and-conditions"`) so the error summary or future deep links can target it? Not required by the AC; recommend adding only if a linking need is identified.
* The `<h2>` is placed inside the `<form>`. Confirm content design is happy with that (it matches the AC's stated position) rather than lifting the terms above the form.


### Comment by OgechiOkelu on 2026-08-05T08:57:55Z

@plan 
