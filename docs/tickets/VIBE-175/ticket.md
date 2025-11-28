# VIBE-175 — Create a Verified Media Account in CaTH

> Owner: VIBE-175
> Updated: 13 Nov 2025

## Problem Statement

Users who meet the set criteria are able to apply to create a verified account in CaTH. This ticket covers the requirements for creating an account in CaTH so they can access restricted information.

## User Story

**As a** CaTH User
**I want to** create a verified account
**So that** I can access restricted information in CaTH

## Technical Acceptance Criteria (Build & Infrastructure)

1. **Page location & assets**
   - New page code resides at: `/libs/public-pages/src/pages/create-media-account`
   - Controller, Nunjucks templates and language resources live alongside this page using existing naming conventions.

2. **Routes**
   - Create Media Account (GET/POST): `/create-media-account`
   - Submitted/Thanks page (GET): `/account-request-submitted`

3. **File handling**
   - Uploaded image stored in: `/storage/temp/files`
   - Temp filename: `<media_application.id>.<original_extension>`

4. **Persistence (PostgreSQL)**
   - Table: `media_application`
   - Columns:
     - `id` (UUID, PK, generated for new record)
     - `fullName` (text)
     - `email` (text)
     - `status` (text; initial value *PENDING*)
     - `requestDate` (timestamp; set on create)
     - `statusDate` (timestamp; set on status change)
   - Store *metadata* only in DB; upload path/filename implied by `id`.

5. **Form behaviour**
   - On server-side validation error: *retain field values* and highlight invalid fields in red; show error summary with title *"There is a problem"*.
   - On *browser refresh*, clear field values.

6. **Non-functional**
   - Follow CaTH/GDS page spec, Nunjucks templating, i18n resource placement, CSRF, and standard logging.

## Acceptance Criteria (Functional)

1. From CaTH *sign-in page* the "create account" link routes to the form titled *Create a Court and tribunal hearings account*.
2. Opening wording appears as supplied (see *Content*).
3. The form includes inputs for *Full name*, *Email address*, *Employer*; an *ID proof* file upload; a *terms* checkbox; and a *Continue* button.
4. Email helper text is displayed under the email field.
5. Upload control text and constraints appear as supplied; valid types: *jpg, pdf, png*; *< 2MB*.
6. Terms and conditions content appears; user must tick the checkbox to proceed.
7. A "Back to top" arrow appears at page bottom.
8. Upon successful submission, user is redirected to *Details submitted* confirmation page with the supplied *What happens next* text.
9. Data is saved to *media_application* table; file saved in temp directory with the specified naming convention.
10. All CaTH page specifications are maintained.

## Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| fullName | Text | Yes | 1–100 chars; alphabetic + spaces + common punctuation |
| email | Email | Yes | RFC-compliant format |
| employer | Text | Yes | 1–120 chars |
| idProof | File upload | Yes | Single file; *.jpg/.jpeg, .pdf, .png; **≤ 2MB** |
| termsAccepted | Checkbox | Yes | Must be checked |

## Content (English)

### Page 1: Create Media Account

**Title:** Create a Court and tribunal hearings account

**Opening text:**
"A Court and tribunal hearings account is for professional users who require the ability to view HMCTS information such as hearing lists, but do not have the ability to create an account using MyHMCTS or Common Platform e.g. members of the media.

An account holder, once signed in, will be able choose what information they wish to receive via email and also view online information not available to the public, along with publicly available information.

We will retain the personal information you enter here to manage your user account and our service."

**Email helper:** "We'll only use this to contact you about your account and this service."

**Upload helper:** "Upload a clear photo of your UK Press Card or work ID. We will only use this to confirm your identity for this service, and will delete upon approval or rejection of your request. By uploading your document, you confirm that you consent to this processing of your data. Must be a jpg, pdf or png and less than 2mb in size"

**Terms text:** "A Court and tribunal hearing account is granted based on you having legitimate reasons to access information not open to the public e.g. you are a member of a media organisation and require extra information to report on hearings. If your circumstances change and you no longer have legitimate reasons to hold a Court and tribunal hearings account e.g. you leave your employer entered above. It is your responsibility to inform HMCTS of this for your account to be deactivated."

**Checkbox label:** "Please tick this box to agree to the above terms and conditions"

**Button:** "Continue"

**Link:** "Back to top"

### Page 2: Account Request Submitted

**Banner:** "Details submitted"

**Section title:** "What happens next"

**Body:**
"HMCTS will review your details.

We'll email you if we need more information or to confirm that your account has been created.

If you do not get an email from us within 5 working days, call our courts and tribunals service centre on 0300 303 0656."

## Validation Errors (English)

- "Enter your full name"
- "Enter an email address in the correct format, like name@example.com"
- "Enter your employer"
- "Select a file in .jpg, .pdf or .png format"
- "Your file must be smaller than 2MB"
- "Select the checkbox to agree to the terms and conditions"

## Content (Welsh)

### Page 1: Create Media Account

**Title:** Creu cyfrif gwrandawiadau Llys a Thribiwnlys

**Opening text:**
"Mae cyfrifon gwrandawiadau Llys a Thribiwnlys yn cael eu creu ar gyfer defnyddwyr proffesiynol sydd angen gallu gweld gwybodaeth GLlTEF fel rhestrau gwrandawiadau, ond nid oes ganddynt y gallu i greu cyfrif gan ddefnyddio MyHMCTS neu'r Platfform Cyffredin e.e. aelodau o'r cyfryngau

Byddwn yn cadw'r wybodaeth bersonol a roir gennych yma i reoli eich cyfrif defnyddiwr a'n gwasanaethau"

**Email helper:** "Dim ond i drafod eich cyfrif a'r gwasanaeth hwn y byddwn yn defnyddio hwn i gysylltu â chi"

**Upload control:** "Dewis ffeil"

**Upload helper:** "Dim ond i gadarnhau pwy ydych ar gyfer y gwasanaeth hwn y byddwn yn defnyddio hwn, a byddwn yn ei ddileu wedi i'ch cais gael ei gymeradwyo neu ei wrthod. Trwy uwchlwytho eich dogfen, rydych yn cadarnhau eich bod yn cydsynio i'r prosesu hwn o'ch data. Rhaid iddi fod yn ffeil jpg, pdf, png, neu tiff."

**Terms text:** "Caniateir ichi gael cyfrif ar gyfer gwrandawiadau llys a thribiwnlys ar yr amod bod gennych resymau cyfreithiol dros gael mynediad at wybodaeth nad yw ar gael i'r cyhoedd e.e. rydych yn aelod o sefydliad cyfryngau ac angen gwybodaeth ychwanegol i riportio ar wrandawiadau. Os bydd eich amgylchiadau'n newid ac nid oes gennych mwyach resymau cyfreithiol dros gael cyfrif ar gyfer gwrandawiadau llys a thribiwnlys e.e. rydych yn gadael eich cyflogwr a enwyd uchod, eich cyfrifoldeb chi yw hysbysu GLlTEM am hyn fel y gellir dadactifadu eich cyfrif."

**Checkbox label:** "Ticiwch y blwch hwn, os gwelwch yn dda i gytuno i'r telerau ac amodau uchod"

**Button:** "Parhau"

**Link:** "Yn ôl i'r brig"

### Page 2: Account Request Submitted

**Banner:** "Cyflwyno manylion"

**Section title:** "Beth sy'n digwydd nesaf"

**Body:**
"Bydd GLlTEM yn adolygu eich manylion.

Byddwn yn anfon e-bost atoch os bydd angen mwy o wybodaeth arnom neu i gadarnhau bod eich cyfrif wedi ei greu.

'Os na fyddwch yn cael e-bost gennym o fewn 5 diwrnod gwaith, ffoniwch ein canolfan gwasanaeth llysoedd a thribiwnlysoedd ar 0300 303 0656"

## Validation Errors (Welsh)

- "Nodwch eich enw llawn"
- "Nodwch gyfeiriad e-bost yn y fformat cywir, e.e. name@example.com"
- "Nodwch enw eich cyflogwr"
- "Dewiswch ffeil yn fformat .jpg, .pdf neu .png"
- "Rhaid i'ch ffeil fod yn llai na 2MB"
- "Dewiswch y blwch i gytuno i'r telerau ac amodau"

## Data Model & Storage

### Database Table: media_application

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key, generated on create |
| fullName | text | From form |
| email | text | From form, lower-cased |
| status | text | `PENDING` on create |
| requestDate | timestamp | UTC now on create |
| statusDate | timestamp | UTC; updated on status changes |

### File Storage

- **Directory:** `/storage/temp/files`
- **Filename:** `<id>.<ext>` (ext from original upload; allowed: jpg, jpeg, pdf, png)

## Server-Side Flow (POST `/create-media-account`)

1. Validate CSRF.
2. Parse multipart form: `fullName`, `email`, `employer`, `termsAccepted`, `idProof`.
3. **Validate:**
   - Required fields present.
   - Email format valid.
   - File present; type ∈ {jpg/jpeg/pdf/png}; size ≤ 2MB.
   - Terms checked.
4. **On validation error:**
   - Re-render form with:
     - Error summary titled "There is a problem"
     - Inline errors + red highlights
     - Retain field values (inputs)
5. **On success:**
   - Create DB row with `status=PENDING`, set `requestDate`.
   - Persist file to `/storage/temp/files/<id>.<ext>`.
   - Redirect 303 to `/account-request-submitted`.
6. **On page refresh:**
   - GET renders with cleared field values.

## Accessibility Requirements

- Conform to WCAG 2.2 AA and GOV.UK Design System
- Use `<fieldset>`/`<legend>` for terms section
- Associate labels/inputs with `for`/`id`
- Error summary uses `role="alert"` and focuses on load
- Inputs include `aria-describedby` linking to error/help text
- File input announces accepted types and size limit
- Keyboard-only navigation with visible focus rings
- Language toggle retains page context

## Test Scenarios

| ID | Scenario | Expected Result |
|----|----------|----------------|
| TS1 | Navigate to form | Form renders with correct title and opening text |
| TS2 | Submit empty | Error summary "There is a problem"; inline errors shown; values retained |
| TS3 | Invalid email | Email error; other values retained |
| TS4 | Missing file | File error; summary + inline |
| TS5 | Wrong type | Error: only jpg/pdf/png accepted |
| TS6 | Too large | Upload >2MB - Error: file must be smaller than 2MB |
| TS7 | Terms unchecked | Error demanding agreement |
| TS8 | Success path | Row created (PENDING), file saved to `/storage/temp/files/<id>.<ext>`, redirect to `/account-request-submitted` |
| TS9 | Refresh clears | Fields are cleared |
| TS10 | Error summary title | Title equals "There is a problem" |
| TS11 | i18n EN/CY | Toggle language - Content updates; layout intact |
| TS12 | Security | CSRF missing - Request rejected |

## Risks & Ambiguities

1. **File type mismatch:** Welsh helper mentions TIFF but accepted types are jpg/pdf/png only; this could confuse users.
2. **Refresh vs retain:** Requirement to retain values on error but clear on page refresh can surprise users.
3. **Employer field persistence:** If security policy blocks repopulating some fields, clarify exceptions.
