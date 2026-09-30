# #872: Mags Subscription emails updated with new Media Protocol

**State:** OPEN
**Assignees:** alexbottenberg
**Author:** OgechiOkelu
**Labels:** enhancement
**Created:** 2026-07-22T16:08:18Z
**Updated:** 2026-09-24T13:02:06Z

## Description

**PROBLEM STATEMENT**
Following the recent updates to the Third Party media protocol, the opening message for the subscription email on all Magistrates court hearing lists from Libra/Crime Portal and Common Platform need to be revised to reflect this change.
[Opening message for Magistrates court subscription email.docx](https://github.com/user-attachments/files/30275795/Opening.message.for.Magistrates.court.subscription.email.docx)
 



**AS A** Service

**I WANT** to update the opening message for Magistrates court subscription email

**SO THAT** it reflects the recent updates to the Third Party media protocol


 


**ACCEPTANCE CRITERIA**
**Current Opening message for Magistrates court subscription email:**

Note this email contains Special Category Data as defined by Data Protection Act 2018, formally known as Sensitive Personal Data, and should be handled appropriately.

This email contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used.

The subscription emails for all Mags lists need to be updated with the new media protocol.  This is to replace the existing wording.  Logic will be required so that this template is sent for Mags subscriptions only whilst all other lists types use existing wording. 

 

**Opening message for Magistrates court subscription email is updated to read as follows:**

This communication contains information, or links to information, intended to assist the accurate reporting of court proceedings by journalists.

You must comply with reporting restrictions and any other legal restrictions on the use of information. 

HMCTS will stop sharing the data if there is concern about how it will be used.

If your circumstances change and you no longer have legitimate reasons to receive court hearing lists and registers – for example, if you leave your employer – it is your responsibility to inform HMCTS of this so that your details are removed from the distribution list.


Contacting magistrates’ courts

Journalists should contact our Courts and Tribunals Service Centre for all requests for factual information related to criminal magistrates’ court cases and hearings.

Telephone: 0333 0419680 (select option 1 for criminal cases). This line is for journalists only and should not be promoted for public use.

Email: [mediaandpressenquires@justice.gov.uk,](mailto:mediaandpressenquires@justice.gov.uk,%20)

 

Journalists should use MEDIA ENQUIRY in the subject line of all correspondence.

You may be asked to provide details of your UK Press Card or relevant identification to verify your identity.

## Comments

### Comment by OgechiOkelu on 2026-07-22T16:09:53Z
@spec

### Comment by hmctsclaudecode on 2026-07-22T16:13:58Z
# Technical Specification — Issue #872: Mags Subscription emails updated with new Media Protocol

## 1. User Story
**As a** journalist or media user subscribed to Magistrates court hearing lists
**I want to** receive a subscription email whose opening message reflects the updated Third Party media protocol
**So that** the wording I see explains my obligations correctly and tells me how to contact the courts, without changing the opening message for any non-Magistrates list.

## 2. Background
Following updates to the Third Party media protocol, the opening message shown at the top of the subscription email for **all Magistrates court hearing lists** (sourced from Libra / Crime Portal and Common Platform) must be replaced. Non-Magistrates lists must keep the existing wording.

Supporting document from the issue: *"Opening message for Magistrates court subscription email.docx"* (attached to GitHub issue #872).

Relevant existing implementation:

- The subscription email opening message (the current "Special Category Data" warning) is held in the **GOV.UK Notify template body**, not in application code. The `SPECIAL_CATEGORY_DATA_WARNING` constant in `libs/list-types/common/src/email-summary/case-summary-formatter.ts` is currently re-exported and unit-tested by list-type packages but is **not** passed into any email as a personalisation parameter.
- Subscription emails are assembled in `libs/notifications/src/notification/notification-service.ts`. A per-list-type `EMAIL_BUILDER_REGISTRY` (keyed by the stable `listTypeName`) selects the case-summary extractor/formatter, and `buildEnhancedTemplateParameters` / `buildTemplateParameters` in `libs/notifications/src/govnotify/template-config.ts` build the personalisation object sent to GOV.UK Notify.
- Template IDs are resolved by `getSubscriptionTemplateIdForListType(listTypeId, hasPdf, pdfUnder2MB)` in `template-config.ts` from environment variables (`GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION`, `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_ONLY`).
- Magistrates list types (the `@unique` `list_types.name` values that must receive the new wording):
  - `MAGISTRATES_STANDARD_LIST`
  - `MAGISTRATES_PUBLIC_LIST`
  - `MAGISTRATES_ADULT_COURT_LIST_DAILY`
  - `MAGISTRATES_ADULT_COURT_LIST_FUTURE`
  - `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY`
  - `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE`

## 3. Acceptance Criteria

* **Scenario:** Magistrates subscription email uses the new opening message
    * **Given** a subscriber is subscribed to any Magistrates court hearing list (Standard, Public, Adult Court, Public Adult Court — daily or future)
    * **When** a publication for that list type triggers a subscription email
    * **Then** the email opening message is the new Third Party media protocol wording (see Section 7), replacing the current "Special Category Data" wording in its entirety.

* **Scenario:** Non-Magistrates subscription email is unchanged
    * **Given** a subscriber is subscribed to any non-Magistrates list type (e.g. Crown, Civil, Family, SSCS, tribunals)
    * **When** a publication for that list type triggers a subscription email
    * **Then** the email opening message is the existing "Special Category Data" wording, byte-for-byte unchanged.

* **Scenario:** Selection is by stable list type name, not numeric ID
    * **Given** the environments (local, STG, production) assign different autoincrement `list_types.id` values
    * **When** the service decides which opening message to use
    * **Then** the decision is driven by `artefact.listTypeName` / the stable `list_types.name`, never by a hardcoded numeric `listTypeId`.

* **Scenario:** New wording available in both languages
    * **Given** a subscriber's notification `language` is `cy` (Welsh)
    * **When** a Magistrates subscription email is sent
    * **Then** the new opening message is rendered in Welsh; when `language` is `en` it is rendered in English.

* **Scenario:** Contact details render as usable links
    * **Given** the new Magistrates opening message contains a phone number and an email address
    * **When** the email is delivered
    * **Then** the email address is a working `mailto:` link and the phone number is presented as plain readable text.

## 4. User Journey Flow

```
Publication uploaded (Magistrates list type, source: Libra / Crime Portal / Common Platform)
          │
          ▼
Publication processing completes ──► subscription notification triggered
          │
          ▼
notification-service resolves listTypeName from list_types.name (by listTypeId)
          │
          ├─ listTypeName ∈ MAGISTRATES_* set? ──► YES ──► use NEW opening message
          │                                                (English or Welsh per subscriber language)
          │
          └─ otherwise ──────────────────────────► NO ───► use EXISTING opening message
          │
          ▼
GOV.UK Notify email sent to each active subscriber
          │
          ▼
Subscriber reads email: new opening message + hearing list summary / PDF link
```

## 5. Low Fidelity Wireframe

Email layout (the "opening message" is the block that changes for Magistrates lists):

```
┌──────────────────────────────────────────────────────────────┐
│  Court and Tribunal Hearings — subscription email             │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  OPENING MESSAGE  (varies by list type)                 │  │
│  │                                                          │  │
│  │  Magistrates lists  → NEW Third Party media protocol    │  │
│  │  All other lists    → EXISTING Special Category wording │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  You are receiving this email because you subscribed to:      │
│    List type: {{ListType}}                                     │
│    Location:  {{locations}}        (if display_locations=yes)  │
│    Case:      {{case}}             (if display_case=yes)       │
│    For:       {{content_date}}                                 │
│                                                                │
│  Summary of cases:                 (if display_summary=yes)    │
│    {{summary_of_cases}}                                        │
│                                                                │
│  Download the hearing list: {{link_to_file}}  (if PDF ≤ 2MB)   │
│                                                                │
│  Manage your subscriptions: {{subscription_page_link}}         │
└──────────────────────────────────────────────────────────────┘
```

## 6. Page Specifications

This change affects the **subscription email**, not a web page. Layout and functional specs:

- **Opening message block**: Rendered at the top of the email body, before the subscription/list metadata and case summary. It is the only element whose content differs between Magistrates and non-Magistrates lists.
- **Selection mechanism**: The opening message must be selected from the stable `listTypeName`. Two viable approaches (see Section 14 — pick one at implementation planning):
  1. **Personalisation parameter (recommended)** — introduce an `opening_message` personalisation field on the GOV.UK Notify subscription template(s). `notification-service.ts` sets it to the new Magistrates text when `listTypeName` is in the Magistrates set, and to the existing text otherwise. Requires the Notify template body to render `{{opening_message}}` in place of the hardcoded warning.
  2. **Dedicated Notify template** — add a `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_MAGS` (plus PDF variant) and extend `getSubscriptionTemplateIdForListType` to return it for Magistrates list types. Higher template-maintenance cost (duplicated templates), so approach 1 is preferred.
- **Message source of truth**: The English and Welsh opening-message strings must live in application code (a shared constant module, alongside the existing `SPECIAL_CATEGORY_DATA_WARNING`), not be duplicated per list-type package. Add a `MAGISTRATES_MEDIA_PROTOCOL_OPENING_MESSAGE` (English) constant next to `SPECIAL_CATEGORY_DATA_WARNING`, with its Welsh counterpart.
- **Magistrates list-type set**: Define a single exported constant (e.g. `MAGISTRATES_LIST_TYPE_NAMES: ReadonlySet<string>`) enumerating the six names above, used by the selection logic. No numeric IDs.

## 7. Content

### New opening message — Magistrates lists (English)

> This communication contains information, or links to information, intended to assist the accurate reporting of court proceedings by journalists.
>
> You must comply with reporting restrictions and any other legal restrictions on the use of information.
>
> HMCTS will stop sharing the data if there is concern about how it will be used.
>
> If your circumstances change and you no longer have legitimate reasons to receive court hearing lists and registers – for example, if you leave your employer – it is your responsibility to inform HMCTS of this so that your details are removed from the distribution list.
>
> **Contacting magistrates' courts**
>
> Journalists should contact our Courts and Tribunals Service Centre for all requests for factual information related to criminal magistrates' court cases and hearings.
>
> Telephone: 0333 0419680 (select option 1 for criminal cases). This line is for journalists only and should not be promoted for public use.
>
> Email: mediaandpressenquires@justice.gov.uk
>
> Journalists should use MEDIA ENQUIRY in the subject line of all correspondence.
>
> You may be asked to provide details of your UK Press Card or relevant identification to verify your identity.

### New opening message — Magistrates lists (Welsh)

[WELSH TRANSLATION REQUIRED: "This communication contains information, or links to information, intended to assist the accurate reporting of court proceedings by journalists."]

[WELSH TRANSLATION REQUIRED: "You must comply with reporting restrictions and any other legal restrictions on the use of information."]

[WELSH TRANSLATION REQUIRED: "HMCTS will stop sharing the data if there is concern about how it will be used."]

[WELSH TRANSLATION REQUIRED: "If your circumstances change and you no longer have legitimate reasons to receive court hearing lists and registers – for example, if you leave your employer – it is your responsibility to inform HMCTS of this so that your details are removed from the distribution list."]

[WELSH TRANSLATION REQUIRED: "Contacting magistrates' courts"]

[WELSH TRANSLATION REQUIRED: "Journalists should contact our Courts and Tribunals Service Centre for all requests for factual information related to criminal magistrates' court cases and hearings."]

[WELSH TRANSLATION REQUIRED: "Telephone: 0333 0419680 (select option 1 for criminal cases). This line is for journalists only and should not be promoted for public use."]

[WELSH TRANSLATION REQUIRED: "Email: mediaandpressenquires@justice.gov.uk"]

[WELSH TRANSLATION REQUIRED: "Journalists should use MEDIA ENQUIRY in the subject line of all correspondence."]

[WELSH TRANSLATION REQUIRED: "You may be asked to provide details of your UK Press Card or relevant identification to verify your identity."]

### Existing opening message — all non-Magistrates lists (unchanged, retained verbatim)

> Note this email contains Special Category Data as defined by Data Protection Act 2018, formally known as Sensitive Personal Data, and should be handled appropriately.
>
> This email contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used.

## 8. URL

No web route is added or changed. Affected artefacts:

- `libs/notifications/src/notification/notification-service.ts` — list-type selection logic.
- `libs/notifications/src/govnotify/template-config.ts` — `buildTemplateParameters` / `buildEnhancedTemplateParameters` (add `opening_message`) and, if approach 2 is chosen, `getSubscriptionTemplateIdForListType`.
- `libs/list-types/common/src/email-summary/case-summary-formatter.ts` — home of the new message constants and the Magistrates list-type name set.
- GOV.UK Notify subscription template(s) — external configuration change to render `{{opening_message}}` (or add a Magistrates-specific template).

## 9. Validation

- The opening message selection must accept only the six known Magistrates `list_types.name` values; any other value falls through to the existing wording.
- No numeric `listTypeId` may appear in the selection logic (per CLAUDE.md list-type rules).
- The `opening_message` personalisation field must always be populated (never empty/undefined) so the Notify template never renders a blank block; the non-Magistrates default guarantees this.
- English and Welsh opening-message constants must both be present; a missing Welsh translation must not fall back silently to English for `language = cy` subscribers (surface via a test asserting non-empty Welsh content).

## 10. Error Messages

No user-facing form error messages — this is an email-content change. Operational handling:

- If email assembly fails (e.g. Notify rejects an unknown personalisation key), the existing behaviour in `buildEnhancedEmailData` logs and falls back to the standard template via `buildFallbackEmailData`. The `opening_message` field must be added to the fallback path too, so fallback emails for Magistrates lists still carry the correct wording.
- GOV.UK Notify send failures continue to be recorded through the existing notification audit log (`updateNotificationStatus(..., "Failed", ...)`) — no new error copy required.

## 11. Navigation

- The email retains its existing links: `subscription_page_link` (manage subscriptions), `start_page_link`, and `link_to_file` (PDF download when a PDF ≤ 2MB is attached).
- The `mailto:mediaandpressenquires@justice.gov.uk` link in the new Magistrates opening message must be a functioning email link.
- No redirect logic changes.

## 12. Accessibility

- Email content must remain plain-text/GOV.UK Notify-formatted; do not rely on colour or images to convey the opening message.
- The email address must be an actual `mailto:` link (not styled text) so screen-reader and keyboard users can action it.
- The phone number must be rendered as readable plain text (digits grouped as supplied) so it is announced correctly by assistive technology.
- Heading "Contacting magistrates' courts" must use GOV.UK Notify heading markup (`#`/`##`) so it is exposed as a heading, preserving document structure for screen readers.
- Welsh-language subscribers must receive the fully translated message (WCAG language-of-parts / correct language rendering).

## 13. Test Scenarios

* A Magistrates list-type publication (each of the six list-type names) produces an email whose `opening_message` equals the new Third Party media protocol wording.
* A non-Magistrates list-type publication produces an email whose opening message equals the existing "Special Category Data" wording, unchanged.
* The Magistrates-vs-non-Magistrates decision is proven ID-independent by using an arbitrary numeric `listTypeId` (e.g. 999) in fixtures while varying only `listTypeName`.
* Welsh-language subscribers to a Magistrates list receive the Welsh opening message; English subscribers receive the English version.
* The PDF-attachment path and the fallback (no-summary) path both include the correct `opening_message` for Magistrates lists.
* Locale-key parity: the English and Welsh opening-message constants both resolve to non-empty strings.
* Existing non-Magistrates subscription email tests continue to pass (regression guard on unchanged wording).

## 14. Assumptions & Open Questions

* **Scope of "all Mags lists"** — This spec assumes the six `MAGISTRATES_*` list types listed in Section 2. **Open question:** do the Single Justice Procedure lists (`SJP_PRESS_LIST`, `SJP_PUBLIC_LIST`, `SJP_DELTA_PRESS_LIST`, `SJP_DELTA_PUBLIC_LIST`) count as "Magistrates court hearing lists" for this protocol change? They are magistrates-jurisdiction lists but a distinct family; confirm with the business before including/excluding.
* **Implementation approach** — Recommend approach 1 (single `opening_message` personalisation parameter driven from code) over approach 2 (dedicated Notify template) to avoid duplicated template maintenance. Requires the GOV.UK Notify subscription template body to be edited to render `{{opening_message}}` in place of the current hardcoded opening text. **Open question:** who owns the Notify template edit, and can the placeholder be added without breaking in-flight sends?
* **Welsh translation** — The new opening message needs an approved Welsh translation (marked `[TRANSLATE: ...]` above). **Open question:** does the business have an approved Welsh version, or must it be produced? Note the source email address/phone number are not translated.
* **Email address trailing content** — The issue body renders the email as `mediaandpressenquires@justice.gov.uk,` with a trailing comma/space. Assumed to be a copy/paste artefact; the link target is `mediaandpressenquires@justice.gov.uk`. Confirm the address spelling ("enquires" vs "enquiries") is intentional as written in the protocol.
* **Existing constant reuse** — Assumes the new message and the Magistrates name-set live in `libs/list-types/common` alongside `SPECIAL_CATEGORY_DATA_WARNING`, keeping a single source of truth. Confirm this is the desired home rather than the `notifications` lib.


### Comment by OgechiOkelu on 2026-07-23T12:32:50Z
@plan

### Comment by hmctsclaudecode on 2026-07-23T12:38:21Z
## Technical plan ready — clarifications needed

Plan committed to `docs/tickets/872/` on branch `feature/872-mags-subscription-media-protocol`.

**Important finding:** the subscription email opening message ("Special Category Data" wording) does **not** live in application code — it's in the external **GOV.UK Notify template body**. The `SPECIAL_CATEGORY_DATA_WARNING` constant in the repo is unit-tested but never actually sent in an email. So this change **cannot be done in code alone**; a Notify template change is required regardless. The code work is limited to routing Magistrates lists (by stable `listTypeName`, never numeric id) to the right template.

Before implementation, please confirm:

1. **Approach.** I recommend a **dedicated Magistrates Notify template** (self-contained, zero regression risk to the other ~25 list types) over adding an `opening_message` personalisation parameter (which would require editing *every* existing subscription template to render a placeholder). Agree?

2. **Notify template ownership + IDs.** Who creates the new Magistrates subscription template(s) in GOV.UK Notify (with PDF / no-link variants to match the existing set), and can you provide the template IDs for the new env vars?

3. **Welsh delivery (blocker).** The notifications lib has **no bilingual email-content mechanism** — subscriber language is filtered at the DB level only, and email content is English-only in code. How is Welsh subscription-email content delivered today? An approved **Welsh translation** of the new wording was not supplied and will be needed if Welsh templates exist.

4. **SJP scope.** Do the Single Justice Procedure lists (`SJP_PRESS_LIST`, `SJP_PUBLIC_LIST`, `SJP_DELTA_PRESS_LIST`, `SJP_DELTA_PUBLIC_LIST`) count as "Magistrates court hearing lists" here? Assumed **out of scope** unless confirmed.

5. **Email address spelling.** Confirm `mediaandpressenquires@justice.gov.uk` ("enquires", not "enquiries") is intentional as written in the protocol.

For reference, the six Magistrates list types in scope: `MAGISTRATES_STANDARD_LIST`, `MAGISTRATES_PUBLIC_LIST`, `MAGISTRATES_ADULT_COURT_LIST_DAILY`, `MAGISTRATES_ADULT_COURT_LIST_FUTURE`, `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY`, `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE`.


