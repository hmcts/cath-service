# Technical Plan — Issue #897: Descriptive text above 'Send code' on the forgot password page

## Summary of the problem with this ticket

**The page named in the acceptance criteria is not rendered by this repository.** No amount of
work in `cath-service` can satisfy the AC as literally written. This has to be stated up front
because it changes who does the work, not just how it is done.

Verified in this codebase:

| Check | Result |
|---|---|
| `apps/web/src/pages/(auth)/b2c-forgot-password/` contents | `index.ts` and `index.test.ts` only — **no `index.njk`, no `en.ts`, no `cy.ts`** |
| What `index.ts` does | Builds an OAuth authorize URL and calls `res.redirect()`. It renders no markup at all. |
| `grep -r "Send code"` across the repo (excluding `node_modules`) | 3 hits: `templates/tech-spec-references/welsh-translations-catalogue.json`, `requirements/seed.sql`, `docs/tickets/229/ticket.md`. **Zero source files.** |
| B2C policy XML in this repo | None. No `.xml` policy files exist. |
| Tenant | `B2C_CUSTOM_DOMAIN: sign-in.pip-frontend.staging.platform.hmcts.net` (`apps/web/helm/values.yaml:27-28`) — the **PIP** tenant, not a CaTH-owned one. |

The email input, the **Send code** button, the verification-code input and the **Continue**
button are all rendered by Azure AD B2C from the `B2C_1A_PASSWORD_RESET` custom policy on the
shared PIP tenant. The deliverable is therefore a **B2C policy localisation change in the
repository that owns that policy XML**, plus the small amount of contract-proving test work
described in §5 here.

## 1. Technical Approach

### 1.1 Ownership boundary

```
┌────────────────────────┐
│ /sign-in               │  CaTH-owned
└───────────┬────────────┘
            ▼
┌────────────────────────┐
│ /b2c-login             │  CaTH-owned — 302 only
└───────────┬────────────┘
            ▼
┌────────────────────────┐
│ B2C sign-in page       │  B2C-owned
│ [Forgot your password?]│
└───────────┬────────────┘
            │ error_description contains AADB2C90118
            ▼
┌────────────────────────┐
│ /login/return          │  CaTH-owned — detects AADB2C90118
└───────────┬────────────┘
            ▼
┌────────────────────────┐
│ /b2c-forgot-password   │  CaTH-owned — 302 only, renders NOTHING
│ sets session.b2cLocale │  b2c-forgot-password/index.ts:19-20
│ sets b2cProvider =     │
│   "password_reset"     │
└───────────┬────────────┘
            │ 302 …/authorize?p=B2C_1A_PASSWORD_RESET&ui_locales=en|cy-GB
            ▼
╔════════════════════════╗
║ B2C password reset page║  ◄══ B2C-OWNED. THIS IS THE PAGE TO CHANGE.
║  Email address [_____] ║
║  ►► NEW TEXT HERE ◄◄   ║
║  [ Send code ]         ║
║  [ Continue ]          ║
╚═══════════╤════════════╝
            ▼
┌────────────────────────┐
│ /login/return          │  CaTH-owned — exchanges code
└───────────┬────────────┘
            ▼
┌────────────────────────┐
│ /password-reset-success│  CaTH-owned
└────────────────────────┘
```

The change affects exactly one screen, and it is the one screen CaTH does not render.

### 1.2 Route selection

| Route | Where | Risk | Verdict |
|---|---|---|---|
| **A — B2C policy localisation** | `LocalizedResources` in `B2C_1A_PASSWORD_RESET` policy XML, in the repo that owns it | Low. No CaTH runtime change. Shared tenant means other consumers of the policy see it too. | **Recommended** |
| **B — CaTH-hosted custom page template** | Serve a CORS-enabled HTML page layout from `apps/web`, point B2C `ContentDefinition.LoadUri` at it | High. Makes B2C page rendering depend on CaTH availability and CORS correctness — a CaTH outage would break sign-in *and* reset. | Rejected for a copy change |
| **C — interstitial CaTH page before the redirect** | New page at `/b2c-forgot-password` that renders the text then forwards | Fails the AC ("just above the send code button" — this puts it on a different screen), adds a click to an already-criticised journey, leaves the confusing page unchanged. | Rejected |

Take Route A.

### 1.3 Placement mechanism within Route A

The **Send code** button is produced by B2C's email verification *display control* on the
self-asserted step of the reset flow. Two mechanisms:

**Preferred — `intro` UX element on the display control's `LocalizedResources`.** Renders as a
paragraph directly above the display control's action button, which is exactly where the AC
wants it.

```xml
<LocalizedResources Id="api.localaccountpasswordreset.en">
  <LocalizedStrings>
    <!-- existing strings unchanged -->
    <LocalizedString ElementType="DisplayControl"
                     ElementId="<READ FROM LIVE POLICY>"
                     StringId="intro">Please click “Send code” first.&#xA;We’ll send a verification code to your email, which is needed before you can reset your password</LocalizedString>
  </LocalizedStrings>
</LocalizedResources>
```

**Fallback — `UserHelpText` on the email claim.** Renders as hint text bound to the email input.
Slightly different visual position, but B2C wires it up via `aria-describedby`, which is better
for screen readers (see §4).

```xml
<LocalizedString ElementType="ClaimType"
                 ElementId="email"
                 StringId="UserHelpText">Please click “Send code” first. We’ll send a verification code to your email, which is needed before you can reset your password</LocalizedString>
```

The real `ElementId` of the verification display control must be read from the live policy XML.
It is not guessable and differs between HMCTS policy versions. This is a blocker (§6).

### 1.4 Line breaks

The AC text is two sentences on two lines. Use `&#xA;` for the newline, or two separate
localised strings if the display control renders each as its own paragraph. Do **not** embed raw
`<br>` or `<p>` — B2C HTML-escapes localised string content, so tags render as literal text.

### 1.5 No CaTH runtime code changes

Explicitly **not** modified:

- `apps/web/src/pages/(auth)/b2c-forgot-password/index.ts` — redirect logic is already correct
- `libs/auth/src/config/b2c-config.ts` — no new config values
- `apps/web/src/pages/(auth)/login/return/index.ts` — callback handling unchanged
- `apps/web/helm/values.yaml` — no new environment variables

## 2. Content

### English (verbatim from the AC)

```
Please click “Send code” first.
We’ll send a verification code to your email, which is needed before you can reset your password
```

Character notes — reproduce exactly, do not normalise:
- Curly quotation marks around `“Send code”`
- Curly apostrophe in `We’ll`
- No terminal full stop on line two (as supplied; see §6 content questions)

### Welsh (verbatim from the AC — already translated, takes precedence)

```
Cliciwch ar “Anfon cod” yn gyntaf.
Byddwn yn anfon cod dilysu i'ch cyfeiriad e-bost, y bydd arnoch angen hwn i ailosod eich cyfrinair.
```

### Button-label consistency check — do this before shipping

`templates/tech-spec-references/welsh-translations-catalogue.json` holds three different agreed
Welsh renderings of the button:

| English | Welsh | Catalogue line |
|---|---|---|
| Send code | Anfon cod | 510 |
| Send verification code | Anfon cod dilysu | 330 |
| Send new code | Anfon cod newydd | 329 |

The supplied Welsh instruction quotes `“Anfon cod”`. **If the live Welsh B2C page labels the
button `Anfon cod dilysu`, the instruction text must be corrected to match the visible label.**
Telling a Welsh user to click a button that does not exist under that name is worse than showing
no text at all.

### Content design observations (raised, not blocking)

Per `.claude/rules/design.md`, the supplied English diverges from GOV.UK standards three ways:

1. **"Please"** — GOV.UK style omits it; adds words without meaning.
2. **"click"** — device-dependent. GOV.UK prefers "select" (works for touch, keyboard, voice).
3. **Missing terminal full stop** on line two, while the Welsh has one.

GOV.UK-conformant alternative if content design wants it:

```
Select “Send code” first. We’ll send a verification code to your email address.
You need this code before you can reset your password.
```

The AC text ships verbatim unless content design says otherwise.

## 3. Locale binding — already correct, no change needed

`b2c-forgot-password/index.ts:15-16,31` already sets `ui_locales`:

```ts
const locale = (req.query.lng as string) || res.locals.locale || "en";
const uiLocale = locale === "cy" ? "cy-GB" : locale;
resetUrl.searchParams.set("ui_locales", uiLocale);
```

The policy must define the new string in **both** the `en` and `cy-GB` localised resource sets.
If `cy-GB` resources do not already exist on this policy, adding them is in scope — otherwise
Welsh users silently fall back to English and AC 2 fails. That is materially more work than one
string: every string on the page needs a Welsh value. See §6.

## 4. Accessibility

Target WCAG 2.2 AA. This change directly serves **3.3.2 Labels or Instructions** — it supplies
the missing instruction for a multi-step input.

| Criterion | Requirement |
|---|---|
| 1.3.1 Info and Relationships | Semantic paragraph or hint element, not a styled `div`. |
| 1.3.2 Meaningful Sequence | DOM order must match visual order: label → input → text → Send code. Verify in the rendered DOM, not just visually. |
| 1.4.3 Contrast | ≥ 4.5:1. B2C's default hint styling is mid-grey — measure it, don't assume. |
| 1.4.4 / 1.4.10 Resize & Reflow | Readable at 200% zoom and 400% with reflow, without clipping or overlapping the button. Welsh is ~15% longer and more likely to wrap. |
| 2.4.6 Headings and Labels | It is an instruction, not a heading. Must not be `<h1>`–`<h6>`. |
| 4.1.2 Name, Role, Value | The Send code button's accessible name must stay "Send code". |

Screen-reader outcome, best to worst:
- **Best:** exposed via `aria-describedby` on the email input, so it is announced on focus — before either button is reached. `UserHelpText` gives this for free.
- **Acceptable:** plain paragraph in the correct DOM position, announced during linear reading.
- **Unacceptable:** after the buttons in the DOM, inside `aria-hidden`, or only in a live region on error.

There is a genuine trade-off here: `intro` gives the AC's visual placement, `UserHelpText` gives
better AT association. If both cannot be had, prioritise the AC placement and verify with a
screen reader that the text is still announced before the buttons.

Do **not** add `role="alert"`, `aria-live`, or `tabindex`. It is static text, not a status
message; it must not steal focus. It must not enter the tab order. Tab order stays: email input
→ Send code → Continue.

## 5. Testing

Automated coverage in *this* repository is limited by design, because CaTH does not render the
page under test. Be explicit about that boundary rather than writing tests that look like they
cover it and don't.

### Unit tests — `apps/web/src/pages/(auth)/b2c-forgot-password/index.test.ts`

No new unit tests. There is no new CaTH code path. The existing 9 tests must continue to pass
unchanged — they already assert everything CaTH controls: redirect to the reset policy URL,
`ui_locales=en` and `ui_locales=cy-GB`, `b2cLocale` and `b2cProvider` written to session, 503
when B2C is unconfigured, and all required OAuth parameters.

### E2E — `e2e-tests/tests/`

`sign-in.spec.ts` deliberately stops at the redirect boundary, asserting
`response.headers()["location"]` rather than following the OAuth round-trip. Extend that
pattern; do not try to drive the hosted B2C page from CI.

- Assert `/b2c-forgot-password` returns a 302 whose `Location` targets the
  `B2C_1A_PASSWORD_RESET` policy with `ui_locales=en`, and that the Welsh entry point yields
  `ui_locales=cy-GB`. This proves the locale contract the policy relies on to serve the right
  translation — the only part of the AC that is testable from here.

### Manual verification on staging — this is the real acceptance test

Must be executed by hand before sign-off:

1. English journey end to end: the two-line text appears immediately above **Send code**, in the
   DOM order from §4, with the exact curly punctuation from §2.
2. Welsh journey (`?lng=cy`): text appears in the same position, no English remains anywhere on
   the page, and the quoted button name matches the button's actual Welsh label.
3. Enter a valid email, click **Send code**: page transitions to code-entry state without
   leaving a now-incorrect instruction to click a button that no longer exists by that name.
4. Click **Continue** *before* requesting a code: the B2C verification error and the new
   instruction coexist without reading as contradictory. **This is the exact state the
   complaining users reported** — check it carefully.
5. Complete through to `/password-reset-success`: panel renders, no CaTH session created, user
   must sign in again — proving `login/return/index.ts` is undisturbed.
6. axe-core scan in both locales: zero new WCAG 2.2 AA violations.
7. Screen reader (NVDA or VoiceOver) in both locales: instruction announced before either button.
8. 200% zoom and 400% with reflow in both locales: the longer Welsh string neither clips nor
   overlaps **Send code**.
9. Confirm no other consumer of the shared `B2C_1A_PASSWORD_RESET` policy on the PIP tenant has
   regressed. The policy is not exclusive to CaTH.

## 6. Error handling, edge cases, and validation

No validation changes. This is display-only copy with no associated input. No new error
messages, and no existing error text is modified.

Existing B2C-owned validation is unchanged: email required and well-formed, email must match an
existing local account, verification code required once sent, code must match and be in date.
The behaviour where **Continue** fails until the email is verified is unchanged — **this ticket
makes that requirement visible, it does not remove it.**

Edge cases to handle:

| Edge case | Handling |
|---|---|
| Code-sent state | The "click Send code first" instruction becomes wrong once the button relabels. Confirm B2C removes or replaces it; if `intro` persists across both states, that is a defect and the `UserHelpText` fallback or a state-specific string is needed. |
| Instruction + verification error shown together | Must not read as contradictory. Verify visually (test 4 above). |
| `cy-GB` resources absent from the policy | Welsh silently falls back to English → AC 2 fails silently. Must be confirmed before estimating. |
| Welsh text length | ~15% longer than English; most likely to clip or wrap at high zoom. |
| Shared-tenant blast radius | PIP users of the same policy see this copy too. |
| No link in the text | Do not make "Send code" inside the instruction a link or second button. It refers to the adjacent control. |

## 7. Acceptance criteria mapping

| AC | Satisfied by | Verified by |
|---|---|---|
| Text appears just above **Send code**, English, exact wording | `intro` string on the verification display control in the `en` `LocalizedResources` (§1.3) | Manual test 1; §2 character notes |
| Welsh translation shown in the same position | Same string in the `cy-GB` `LocalizedResources`, using the AC's supplied Welsh (§2) | Manual test 2; locale contract asserted by the E2E test in §5 |
| Position is between email input and **Send code** | `intro` UX element placement; DOM order verified, not just visual | Manual tests 1–2; §4 criterion 1.3.2 |
| (implicit) Journey still works | No CaTH runtime change at all (§1.5) | Existing 9 unit tests stay green; manual test 5 |
| (implicit) Accessible | §4 requirements | Manual tests 6–8 |

## 8. Scope boundary

This ticket does **not** fix the underlying design problem: a two-step verification presented as
two simultaneous buttons with no visible ordering. Explanatory copy mitigates a confusing
interaction; it does not fix it. A follow-up to disable or hide **Continue** until the email is
verified, or to split the steps across two pages per the GOV.UK "one thing per page" pattern,
would remove the confusion rather than describe it. Recommend raising that separately.

## CLARIFICATIONS NEEDED

### Blocking — implementation cannot start without these

1. **Which repository owns the `B2C_1A_PASSWORD_RESET` policy XML, and who can deploy it?**
   The tenant is `sign-in.pip-frontend.staging.platform.hmcts.net`
   (`apps/web/helm/values.yaml:27-28`) — PIP's, not CaTH's. The XML is not in this repository.
   The owning repo, its deploy pipeline, and merge permissions all need identifying before an
   estimate means anything. **Until this is answered, this ticket cannot be delivered by the
   CaTH team alone.**

2. **Do `cy-GB` localised resources already exist on this policy?** CaTH sends
   `ui_locales=cy-GB` today, but nothing in this repository proves B2C honours it. If the Welsh
   resource set is absent, adding it is in scope and much larger than adding one string — every
   string on the page needs a Welsh value.

3. **What is the actual `ElementId` of the email verification display control in this policy?**
   Needed to write the `LocalizedResources` entry. Must be read from the live policy XML.

4. **Is a shared-tenant copy change acceptable to PIP?** If PIP needs different copy on the same
   policy, the policy must be forked or a CaTH-specific `ContentDefinition` introduced — which
   changes the shape and size of this work substantially.

### Content questions for the content designer

5. **Should the English text end with a full stop?** The AC omits it on line two; the supplied
   Welsh includes one. They should be consistent. Recommend adding it to the English.

6. **Should "Please" and "click" be retained?** Both diverge from GOV.UK content standards
   (§2). The AC text will ship verbatim unless content design confirms the alternative.

7. **Does the Welsh text quote the correct button label?** The supplied Welsh says
   `“Anfon cod”`. If the live Welsh page labels the button `Anfon cod dilysu`
   (catalogue line 330) rather than `Anfon cod` (line 510), the instruction must be corrected.

### Non-blocking assumptions — confirm during implementation

- Assumed the `intro` UX element renders directly above the Send code button in HMCTS's policy
  version. If not, fall back to `UserHelpText` (§1.3) and accept the different visual placement.
- Assumed there is no prod CaTH deployment yet (per `CLAUDE.md`), so this ships to staging only
  and no prod B2C policy change is needed in this ticket.
- Assumed B2C HTML-escapes localised string content, so `&#xA;` is the correct newline mechanism
  and raw `<br>` renders literally. Verify on first deploy.
