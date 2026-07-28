# #897: Descriptive text to be added to 'Send code' on forgot password page

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** None
**Created:** 2026-07-28T13:54:14Z
**Updated:** 2026-07-28T14:15:46Z

## Description

**PROBLEM STATEMENT**
Following the recent complaints from users regarding the password reset process, this ticket is raised to add descriptive text around the 'Send code' button on the CaTH password reset  page so users understand the password reset process.

 

**AS A** Service

**I WANT** to add descriptive text around the 'Send code' button on the CaTH password reset  page

**SO THAT** users understand the password reset process.

 

**ACCEPTANCE CRITERIA**

- The text to be added just above the send code button is 

'Please click “Send code” first.
We’ll send a verification code to your email, which is needed before you can reset your password'

 

**Welsh translation:**

Cliciwch ar “Anfon cod” yn gyntaf.
Byddwn yn anfon cod dilysu i'ch cyfeiriad e-bost, y bydd arnoch angen hwn i ailosod eich cyfrinair.

## Comments

### Comment by OgechiOkelu on 2026-07-28T14:09:20Z

@spec 

### Comment by hmctsclaudecode on 2026-07-28T14:15:17Z

# Technical Specification — Issue #897: Descriptive text to be added to 'Send code' on forgot password page

## 1. User Story

**As a** Service
**I want to** add descriptive text immediately above the 'Send code' button on the CaTH password reset page
**So that** users understand that they must request a verification code before they can reset their password

## 2. Background

Users have complained about the password reset journey. The failure is a comprehension problem, not a functional one: the reset page presents an email field, a **Send code** button and a **Continue** button at the same time. Users type their email and press **Continue**, which fails validation because the email has not been verified yet. Nothing on the page explains that **Send code** is a mandatory first step.

**Critical implementation constraint — the button is not rendered by this repository.**

The CaTH web app does not own this page. `apps/web/src/pages/(auth)/b2c-forgot-password/index.ts` builds an OAuth authorize URL and issues a 302 redirect:

```
GET /b2c-forgot-password
  → 302 https://sign-in.pip-frontend.staging.platform.hmcts.net/pip-frontend.staging.platform.hmcts.net
         /oauth2/v2.0/authorize
         ?p=B2C_1A_PASSWORD_RESET
         &client_id=…&redirect_uri=…/login/return
         &response_type=code&response_mode=query&scope=openid
         &ui_locales=en|cy-GB&state=…&nonce=…
```

Everything the user then sees — the email input, the **Send code** button, the verification-code input, the **Continue** button — is rendered by Azure AD B2C from the `B2C_1A_PASSWORD_RESET` custom policy on the shared PIP B2C tenant. There is no Nunjucks template, no `en.ts`/`cy.ts`, and no controller in this repository that produces that markup. A `grep` for `Send code` across the codebase returns only ticket documentation and the Welsh translation catalogue — no source file.

Relevant existing code:

| File | Role |
|---|---|
| `apps/web/src/pages/(auth)/b2c-forgot-password/index.ts` | Builds the reset authorize URL, stores `b2cLocale` + `b2cProvider="password_reset"` in session, redirects |
| `libs/auth/src/config/b2c-config.ts` | `policyResetCredentials` (default `B2C_1A_PASSWORD_RESET`), `getB2cBaseUrl()`, custom-domain handling |
| `apps/web/src/pages/(auth)/login/return/index.ts` | Handles the B2C callback; on `provider === "password_reset"` redirects to `/password-reset-success` |
| `apps/web/src/pages/(auth)/password-reset-success/` | Confirmation panel page (the only CaTH-owned page in this journey) |
| `apps/web/helm/values.yaml:27-28` | `B2C_CUSTOM_DOMAIN`, `B2C_CUSTOM_DOMAIN_PATH` — both point at the PIP staging tenant |

Therefore the deliverable is a **B2C custom policy localisation change**, made in the repository that owns the `B2C_1A_PASSWORD_RESET` policy XML, plus test and documentation changes in this repository. See §6 for the two implementation routes and the recommendation.

## 3. Acceptance Criteria

* **Scenario:** Descriptive text is shown above 'Send code' in English
    * **Given** a user with a CaTH account has selected "With a Court and tribunal hearings account" and clicked the forgotten-password link
    * **When** the B2C password reset page loads with `ui_locales=en`
    * **Then** the following text is displayed immediately above the 'Send code' button, as two lines:
      `Please click "Send code" first.`
      `We'll send a verification code to your email, which is needed before you can reset your password`

* **Scenario:** Descriptive text is shown above 'Send code' in Welsh
    * **Given** a user has switched the service to Welsh before starting password reset
    * **When** the B2C password reset page loads with `ui_locales=cy-GB`
    * **Then** the Welsh equivalent of the descriptive text is displayed in the same position, and no English text remains on the page

* **Scenario:** Text is positioned between the email field and the 'Send code' button
    * **Given** the reset page has rendered
    * **When** the user reads down the page
    * **Then** the reading order is: page heading → email input and its label → descriptive text → 'Send code' button
    * **And** the text is not rendered above the email input, and not below the 'Send code' button

* **Scenario:** Text does not persist after the code has been sent
    * **Given** the user has entered a valid email and clicked 'Send code'
    * **When** B2C re-renders the page in verification-code-entry state
    * **Then** the "click Send code first" instruction is no longer relevant and is either removed or replaced by B2C's own "we have sent a code" messaging
    * **And** the user is not told to click a button that is no longer labelled 'Send code'

* **Scenario:** Existing reset journey is unaffected
    * **Given** the descriptive text has been deployed
    * **When** a user completes the full journey — enter email, Send code, enter code, Continue, set new password
    * **Then** the user is returned to `/login/return`, the code is exchanged for tokens, and the user lands on `/password-reset-success`
    * **And** no change occurs to session handling, `b2cLocale`, or `b2cProvider`

* **Scenario:** Text meets accessibility requirements
    * **Given** the reset page has rendered
    * **When** the page is scanned with axe-core and navigated with a screen reader
    * **Then** there are no new WCAG 2.2 AA violations
    * **And** the descriptive text is announced as body text in the correct reading order (see §12 for the `aria-describedby` decision)

## 4. User Journey Flow

```
┌──────────────────────────┐
│ /sign-in                 │  CaTH-owned
│ "How do you want to      │  apps/web/src/pages/(public)/sign-in/
│  sign in?"               │
│  ( ) MyHMCTS             │
│  ( ) Common Platform     │
│  (•) Court and tribunal  │
│      hearings account    │
└────────────┬─────────────┘
             │ POST accountType=cath
             ▼
┌──────────────────────────┐
│ /b2c-login?lng=en|cy     │  CaTH-owned — 302 to B2C sign-in policy
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ B2C sign-in page         │  ◄── B2C-owned
│  [Forgot your password?] │
└────────────┬─────────────┘
             │ B2C returns error_description containing AADB2C90118
             ▼
┌──────────────────────────┐
│ /login/return            │  CaTH-owned
│  detects AADB2C90118     │  login/return/index.ts:37-40
│  → /b2c-forgot-password  │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ /b2c-forgot-password     │  CaTH-owned — 302 only, renders nothing
│  sets session.b2cLocale  │  b2c-forgot-password/index.ts
│  sets b2cProvider =      │
│    "password_reset"      │
└────────────┬─────────────┘
             │ 302 authorize?p=B2C_1A_PASSWORD_RESET&ui_locales=…
             ▼
╔══════════════════════════╗
║ B2C password reset page  ║  ◄══ B2C-owned. THIS IS THE PAGE TO CHANGE.
║  Email address [______]  ║
║  ►► NEW DESCRIPTIVE ◄◄   ║      New text inserted here
║  ►►      TEXT       ◄◄   ║
║  [ Send code ]           ║
║  [ Continue ]            ║
╚════════════┬═════════════╝
             │ Send code → email sent → enter code → Continue
             ▼
┌──────────────────────────┐
│ B2C new-password page    │  B2C-owned
└────────────┬─────────────┘
             │ 302 to redirect_uri with ?code=…&state=…
             ▼
┌──────────────────────────┐
│ /login/return            │  CaTH-owned — provider === "password_reset"
│  exchange code, clear    │  login/return/index.ts:79-86
│  b2c session keys        │
└────────────┬─────────────┘
             ▼
┌──────────────────────────┐
│ /password-reset-success  │  CaTH-owned
│  ✔ "Your password has    │
│    been reset"           │
└──────────────────────────┘
```

The change affects exactly one screen in this flow, and it is the one screen CaTH does not render.

## 5. Low Fidelity Wireframe

### Before — current B2C reset page (English)

```
┌────────────────────────────────────────────────────────────┐
│  ≡ GOV.UK  Court and tribunal hearings                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Reset your password                                       │
│  ═══════════════════                                       │
│                                                            │
│  Email address                                             │
│  ┌──────────────────────────────────────┐                  │
│  │                                      │                  │
│  └──────────────────────────────────────┘                  │
│                                                            │
│  ┌──────────────┐                                          │
│  │  Send code   │   ◄── user has no idea this is step 1     │
│  └──────────────┘                                          │
│                                                            │
│  ┌──────────────┐                                          │
│  │  Continue    │   ◄── users press this first, and fail    │
│  └──────────────┘                                          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### After — with descriptive text (English)

```
┌────────────────────────────────────────────────────────────┐
│  ≡ GOV.UK  Court and tribunal hearings                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Reset your password                                       │
│  ═══════════════════                                       │
│                                                            │
│  Email address                                             │
│  ┌──────────────────────────────────────┐                  │
│  │                                      │                  │
│  └──────────────────────────────────────┘                  │
│                                                            │
│  Please click "Send code" first.                           │
│  We'll send a verification code to your email, which is    │
│  needed before you can reset your password                 │
│                     ▲                                      │
│                     └── NEW: two lines of body text,       │
│                         between input and Send code        │
│  ┌──────────────┐                                          │
│  │  Send code   │                                          │
│  └──────────────┘                                          │
│                                                            │
│  ┌──────────────┐                                          │
│  │  Continue    │                                          │
│  └──────────────┘                                          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### After — Welsh (`ui_locales=cy-GB`)

```
┌────────────────────────────────────────────────────────────┐
│  ≡ GOV.UK  Gwrandawiadau Llys a Thribiwnlys                │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Ailosod eich cyfrinair                                    │
│  ══════════════════════                                    │
│                                                            │
│  Cyfeiriad e-bost                                          │
│  ┌──────────────────────────────────────┐                  │
│  │                                      │                  │
│  └──────────────────────────────────────┘                  │
│                                                            │
│  Cliciwch ar "Anfon cod" yn gyntaf.                        │
│  Byddwn yn anfon cod dilysu i'ch cyfeiriad e-bost, y       │
│  bydd arnoch angen hwn i ailosod eich cyfrinair.           │
│                                                            │
│  ┌──────────────┐                                          │
│  │  Anfon cod   │                                          │
│  └──────────────┘                                          │
│                                                            │
│  ┌──────────────┐                                          │
│  │  Parhau      │                                          │
│  └──────────────┘                                          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### After — code-sent state (text must not persist)

```
┌────────────────────────────────────────────────────────────┐
│  Reset your password                                       │
│  ═══════════════════                                       │
│                                                            │
│  Verification code has been sent to your inbox. Please     │
│  copy it to the input box below.                           │
│                                                            │
│  Email address                                             │
│  ┌──────────────────────────────────────┐                  │
│  │ user@example.com                     │  (read-only)     │
│  └──────────────────────────────────────┘                  │
│                                                            │
│  Verification code                                         │
│  ┌──────────────────────────────────────┐                  │
│  │                                      │                  │
│  └──────────────────────────────────────┘                  │
│                                                            │
│  (no "click Send code first" text — the button is now      │
│   labelled "Verify code" / "Send new code")                │
│                                                            │
│  ┌──────────────┐  ┌────────────────┐                      │
│  │ Verify code  │  │ Send new code  │                      │
│  └──────────────┘  └────────────────┘                      │
└────────────────────────────────────────────────────────────┘
```

## 6. Page Specifications

### 6.1 Ownership and the two implementation routes

| Route | Where the change is made | Effort | Risk | Recommendation |
|---|---|---|---|---|
| **A — B2C policy localisation** | `LocalizedResources` in the `B2C_1A_PASSWORD_RESET` policy XML, in the PIP B2C policy repository | ~20 lines of XML per locale, plus a B2C policy deploy | Low. No CaTH code change, no new hosting. Shared tenant means the change also affects any other consumer of the same policy. | **Recommended.** This is the correct and proportionate fix. |
| **B — CaTH-hosted custom page template** | Serve a CORS-enabled HTML page-layout template from `apps/web` and point the B2C `ContentDefinition` `LoadUri` at it | New route, new static template, CORS config, cache/CDN considerations, B2C policy change *as well* | High. Introduces a runtime dependency from B2C page rendering onto CaTH availability. Any CaTH outage or CORS misconfiguration breaks the sign-in and reset pages. | **Not recommended for a copy change.** Only justified if a broader B2C rebranding programme is already planned. |

Do **not** attempt to solve this with an interstitial CaTH page inserted before the redirect. The acceptance criteria specify the text sits "just above the send code button"; an interstitial places it on a different screen entirely, adds a click to an already-criticised journey, and leaves the confusing B2C page unchanged.

### 6.2 Route A — placement mechanism

The `Send code` button is generated by B2C's email verification **display control** on the self-asserted step of the reset flow. Two placement mechanisms are available; they differ in exactly where the text lands.

**Preferred: `intro` UX element on the display control's `LocalizedResources`.** Renders as a paragraph directly above the display control's action button, which is the position the AC requires.

```xml
<LocalizedResources Id="api.localaccountpasswordreset.en">
  <LocalizedStrings>
    <!-- existing strings unchanged -->
    <LocalizedString ElementType="DisplayControl"
                     ElementId="emailVerificationControl"
                     StringId="intro">Please click "Send code" first.&#xA;We'll send a verification code to your email, which is needed before you can reset your password</LocalizedString>
  </LocalizedStrings>
</LocalizedResources>
```

**Fallback: `UserHelpText` on the email claim.** Renders as hint text attached to the email input. Acceptable, and better for screen-reader association (see §12), but sits above the input's own position in some layouts rather than immediately above the button. Verify visually against §5 before choosing this.

```xml
<LocalizedString ElementType="ClaimType"
                 ElementId="email"
                 StringId="UserHelpText">Please click "Send code" first. We'll send a verification code to your email, which is needed before you can reset your password</LocalizedString>
```

The exact `ElementId` of the verification display control in `B2C_1A_PASSWORD_RESET` must be read from the live policy XML before implementation — it is not guessable and differs between HMCTS policy versions.

### 6.3 Locale binding

No CaTH code change is required for locale selection. `b2c-forgot-password/index.ts` already sets `ui_locales` correctly:

```ts
const locale = (req.query.lng as string) || res.locals.locale || "en";
const uiLocale = locale === "cy" ? "cy-GB" : locale;
resetUrl.searchParams.set("ui_locales", uiLocale);
```

The policy must therefore define the new string in the `en` **and** `cy-GB` localised resource sets. If `cy-GB` resources do not already exist on this policy, adding them is in scope for this ticket — otherwise Welsh users will silently fall back to English and the second acceptance criterion will fail.

### 6.4 Line break handling

The AC text is two sentences on two lines. In B2C localised strings, use `&#xA;` for the newline, or split into two separate localised strings if the display control renders each as its own paragraph. Do not embed raw HTML (`<br>`, `<p>`) — B2C HTML-escapes localised string content by default, and the tags will render as literal text.

### 6.5 No changes to CaTH runtime code

The following files are explicitly **not** modified:

- `apps/web/src/pages/(auth)/b2c-forgot-password/index.ts` — redirect logic already correct
- `libs/auth/src/config/b2c-config.ts` — no new config values
- `apps/web/src/pages/(auth)/login/return/index.ts` — callback handling unchanged
- `apps/web/helm/values.yaml` — no new environment variables

## 7. Content

### English (verbatim from the acceptance criteria)

```
Please click "Send code" first.
We'll send a verification code to your email, which is needed before you can reset your password
```

Character notes for the implementer:
- The AC uses curly quotation marks around Send code (`“Send code”`) and a curly apostrophe in `We’ll`. Reproduce these exactly; do not normalise to straight quotes.
- There is no full stop at the end of the second line in the AC. Reproduce as-is unless content design confirms otherwise — see §14.

### Welsh

```
[TRANSLATE: "Please click \"Send code\" first."]
[WELSH TRANSLATION REQUIRED: "We'll send a verification code to your email, which is needed before you can reset your password"]
```

The ticket supplies exact Welsh copy which has already been through translation and **takes precedence over any generated translation**:

```
Cliciwch ar “Anfon cod” yn gyntaf.
Byddwn yn anfon cod dilysu i'ch cyfeiriad e-bost, y bydd arnoch angen hwn i ailosod eich cyfrinair.
```

Note that the supplied Welsh **does** end with a full stop while the English does not. This is an inconsistency in the source ticket, flagged in §14.

The button labels themselves already have agreed translations in `templates/tech-spec-references/welsh-translations-catalogue.json`, which the new text must match exactly so the instruction names the button the user actually sees:

| English | Welsh | Catalogue line |
|---|---|---|
| Send code | Anfon cod | 510 |
| Send verification code | Anfon cod dilysu | 330 |
| Send new code | Anfon cod newydd | 329 |

**Consistency check required:** if the live B2C Welsh page labels the button `Anfon cod dilysu` rather than `Anfon cod`, the Welsh instruction text must be updated to quote the actual label. Text that tells a Welsh user to click a button that does not exist by that name is worse than no text at all.

### Content design observations

Per `.claude/rules/design.md`, the supplied English copy diverges from GOV.UK content standards in three ways. Raising these for the content designer, not blocking on them — the AC text is delivered as specified:

1. **"Please"** — GOV.UK style omits "please"; it adds words without adding meaning.
2. **"click"** — device-dependent. GOV.UK prefers "select", which works for touch, keyboard and voice input.
3. **Missing terminal full stop** on line two.

A GOV.UK-conformant alternative, should content design want it:

```
Select "Send code" first. We'll send a verification code to your email address.
You need this code before you can reset your password.
```

## 8. URL

No new or changed URLs.

| URL | Owner | Change |
|---|---|---|
| `/b2c-forgot-password` | CaTH (`apps/web`) | None — 302 redirect only |
| `https://sign-in.pip-frontend.staging.platform.hmcts.net/pip-frontend.staging.platform.hmcts.net/oauth2/v2.0/authorize?p=B2C_1A_PASSWORD_RESET&…` | Azure B2C | Rendered content changes |
| `/login/return` | CaTH (`apps/web`) | None |
| `/password-reset-success` | CaTH (`apps/web`) | None |

The B2C host is resolved at runtime by `getB2cBaseUrl()` from `B2C_CUSTOM_DOMAIN` / `B2C_CUSTOM_DOMAIN_PATH`, falling back to `{tenantName}.b2clogin.com`.

## 9. Validation

No validation changes. This is display-only copy with no associated input.

Existing B2C-owned validation on the page is unchanged:

| Field | Rule | Owner |
|---|---|---|
| Email address | Required; must be a valid email format | B2C policy |
| Email address | Must correspond to an existing B2C local account | B2C policy |
| Verification code | Required once a code has been sent | B2C display control |
| Verification code | Must match the issued code and be within its validity window | B2C display control |

The new text does not suppress, replace, or reorder any of these. In particular, the existing behaviour where **Continue** fails until the email is verified is unchanged — this ticket makes that requirement visible, it does not remove it.

## 10. Error Messages

No new error messages. No existing error message text is modified.

The change is intended to reduce the frequency with which users encounter B2C's existing "you must verify your email address" error by explaining the required order of actions up front. Success is measured by fewer users hitting that error, not by changing it.

If the descriptive text and the existing verification error are both visible simultaneously (user clicked Continue first, error rendered, instruction text still present), the page must not read as contradictory. Confirm this combined state visually during testing — it is the exact state the complaining users are in.

## 11. Navigation

No navigation changes.

- Entry to the reset page: `/login/return` detects `AADB2C90118` in `error_description` and redirects to `/b2c-forgot-password?lng={locale}` (`login/return/index.ts:37-40`)
- `/b2c-forgot-password` sets `req.session.b2cLocale` and `req.session.b2cProvider = "password_reset"`, then 302s to B2C
- On completion, B2C returns to `redirect_uri` = `{BASE_URL}/login/return`
- `/login/return` sees `provider === "password_reset"`, exchanges the code, deletes `b2cProvider` and `b2cLocale` from session, and redirects to `/password-reset-success` (or `?lng=cy`)
- No CaTH session is created by the reset flow — the user must sign in again afterwards

The new text introduces no links. Do not make "Send code" within the instruction text a link or a second button; it is a reference to the adjacent control.

## 12. Accessibility

Target: WCAG 2.2 AA.

### Requirements

| Criterion | Requirement |
|---|---|
| 1.3.1 Info and Relationships | Text must be a semantic paragraph or hint element, not a styled `div` used purely for appearance. If placed as `UserHelpText`, B2C associates it with the email input via `aria-describedby` — the preferred outcome. |
| 1.3.2 Meaningful Sequence | DOM order must match visual order: label → input → descriptive text → Send code button. Verify in the rendered B2C DOM, not just visually. |
| 1.4.3 Contrast (Minimum) | Body text ≥ 4.5:1 against its background. B2C's default hint styling is a mid-grey — measure it rather than assuming it passes. |
| 1.4.4 Resize Text | Must remain readable and not clip or overlap the button at 200% zoom and at 400% with reflow (1.4.10). |
| 2.4.6 Headings and Labels | The text is an instruction, not a heading. Must not be marked up as `<h1>`–`<h6>`. |
| 3.3.2 Labels or Instructions | This change directly serves this criterion — it supplies the missing instruction for a multi-step input. |
| 4.1.2 Name, Role, Value | The Send code button's accessible name must remain "Send code" and must not be altered by the adjacent text. |

### Screen reader behaviour

The critical requirement is that a screen-reader user learns the ordering constraint **before** reaching the Continue button, not after failing.

- **Best outcome:** text is exposed via `aria-describedby` on the email input, so it is announced when the input receives focus — before either button is reached. This is what the `UserHelpText` mechanism (§6.2 fallback) gives for free.
- **Acceptable outcome:** text is a plain paragraph in the correct DOM position, announced during linear reading.
- **Unacceptable:** text placed after the buttons in the DOM, or inside an `aria-hidden` container, or announced only as part of a live region on error.

This is a genuine trade-off between the two mechanisms in §6.2: `intro` gives better visual placement per the AC, `UserHelpText` gives better assistive-technology association. If both cannot be satisfied, prioritise the AC's visual placement and verify with a screen reader that the text is still announced before the buttons in reading order.

Do **not** add `role="alert"`, `aria-live`, or `tabindex` to this static text. It is not a status message and must not steal focus or interrupt.

### Keyboard

- Text is non-interactive and must not appear in the tab order.
- Tab order after the change: email input → Send code → Continue. Unchanged.

### Testing

- axe-core scan of the rendered B2C reset page in both locales — zero new violations.
- Manual screen reader pass (NVDA or VoiceOver) confirming announcement order.
- 200% zoom and 400%-with-reflow visual check in both locales. Welsh text is ~15% longer than English and is the more likely to wrap or clip.

## 13. Test Scenarios

Automated coverage in this repository is limited by design: CaTH does not render the page under test. Be explicit about that boundary rather than writing tests that appear to cover it and do not.

### Unit tests — `apps/web/src/pages/(auth)/b2c-forgot-password/index.test.ts`

The existing suite already asserts everything CaTH controls, and must continue to pass unchanged. No new unit tests are warranted — there is no new CaTH code path to cover.

* Existing assertions remain green: redirect to the reset policy URL, `ui_locales=en` and `ui_locales=cy-GB`, `b2cLocale` and `b2cProvider` written to session, 503 when B2C is unconfigured, all required OAuth parameters present.

### E2E tests — `e2e-tests/tests/`

The existing `sign-in.spec.ts` deliberately stops at the redirect boundary, asserting only `response.headers()["location"]` matches `/b2c-login` rather than following the OAuth round-trip. Extend that pattern; do not attempt to drive the hosted B2C page from CI.

* Verify that requesting `/b2c-forgot-password` returns a 302 whose `Location` targets the `B2C_1A_PASSWORD_RESET` policy with `ui_locales=en`, and that the Welsh entry point yields `ui_locales=cy-GB` — proving the locale contract the policy relies on to serve the correct translation.

### Manual verification against the deployed B2C tenant

These scenarios are the actual acceptance test for this ticket and must be executed by hand on staging before sign-off.

* Complete the English reset journey end to end and confirm the two-line descriptive text appears immediately above the 'Send code' button, in the DOM order specified in §12, with the exact wording and curly punctuation from §7.
* Complete the Welsh reset journey (`?lng=cy`) and confirm the Welsh text appears in the same position, that no English text remains anywhere on the page, and that the quoted button name in the text matches the button's actual Welsh label.
* Enter a valid email, click 'Send code', and confirm the page transitions to code-entry state without leaving a now-incorrect instruction to click a button that no longer exists by that name.
* Click 'Continue' before requesting a code and confirm the resulting B2C verification error and the new instruction text coexist without reading as contradictory — this is the exact state the complaining users reported.
* Complete the whole journey through to `/password-reset-success` and confirm the panel renders, no CaTH session was created, and the user must sign in again — proving the copy change did not disturb the callback handling in `login/return/index.ts`.
* Run an axe-core scan on the reset page in both locales and confirm zero new WCAG 2.2 AA violations.
* Navigate the page with a screen reader in both locales and confirm the instruction is announced before either button is reached.
* View the page at 200% zoom and at 400% with reflow in both locales, confirming the longer Welsh string neither clips nor overlaps the 'Send code' button.
* Confirm no other consumer of the shared `B2C_1A_PASSWORD_RESET` policy on the PIP tenant has regressed — the policy is not exclusive to CaTH.

## 14. Assumptions & Open Questions

### Blocking — must be answered before implementation can start

* **Which repository owns the `B2C_1A_PASSWORD_RESET` policy XML?** The tenant is `sign-in.pip-frontend.staging.platform.hmcts.net` (`apps/web/helm/values.yaml:27-28`), which is PIP's, not CaTH's. The policy XML is not in this repository. The owning repository, its deploy pipeline, and who has permission to merge and deploy a policy change all need identifying before an estimate is meaningful.
* **Do `cy-GB` localised resources already exist on this policy?** CaTH sends `ui_locales=cy-GB` today, but nothing in this repository proves B2C honours it. If the Welsh resource set is absent, adding it is in scope and materially larger than adding one string — every string on the page needs a Welsh value, not just the new one.
* **What is the actual `ElementId` of the email verification display control in this policy?** Required to write the `LocalizedResources` entry in §6.2. Must be read from the live policy XML.

### Non-blocking — assumptions made, confirm during implementation

* **Assumed:** the shared PIP tenant means this change is visible to PIP/CaTH users of the same policy, and that is acceptable. If PIP requires different copy, the policy must be forked or a CaTH-specific `ContentDefinition` introduced, which changes the shape of this work substantially.
* **Assumed:** the `intro` UX element renders directly above the Send code button in HMCTS's policy version. If it does not, fall back to `UserHelpText` per §6.2 and accept the slightly different visual placement.
* **Assumed:** there is no prod deployment of CaTH yet (per `CLAUDE.md`), so this ships to staging only and no prod B2C policy change is needed in this ticket.
* **Assumed:** B2C HTML-escapes localised string content, so `&#xA;` is the correct newline mechanism and raw `<br>` will render literally. Verify on first deploy.

### Content questions for the content designer

* **Should the English text end with a full stop?** The AC omits it on line two; the supplied Welsh includes one. They should be consistent. Recommend adding it to the English.
* **Should "Please" and "click" be retained?** Both diverge from GOV.UK content standards (§7). The AC text will be delivered verbatim as specified unless content design confirms the alternative wording.
* **Does the Welsh text quote the correct button label?** The supplied Welsh says `“Anfon cod”`. If the live Welsh B2C page labels the button `Anfon cod dilysu` (catalogue line 330) rather than `Anfon cod` (line 510), the instruction text must be corrected to match the visible label.

### Scope boundary

* This ticket does **not** address the underlying design problem, which is that a two-step verification is presented as two simultaneous buttons with no visible ordering. Explanatory copy mitigates a confusing interaction; it does not fix it. A follow-up ticket to disable or hide **Continue** until the email is verified, or to split the steps across two pages per the GOV.UK "one thing per page" pattern, would remove the confusion rather than describe it. Recommend raising that separately.


### Comment by OgechiOkelu on 2026-07-28T14:15:46Z

@plan 
