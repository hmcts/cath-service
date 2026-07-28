# Implementation Tasks — Issue #897

## Blocked — resolve before starting (see plan.md CLARIFICATIONS NEEDED)

- [ ] Identify the repository that owns the `B2C_1A_PASSWORD_RESET` policy XML, its deploy pipeline, and who can merge a change to it
- [ ] Confirm whether `cy-GB` localised resources already exist on that policy (if not, adding the full Welsh resource set is in scope and this ticket is much larger)
- [ ] Read the live policy XML and record the actual `ElementId` of the email verification display control
- [ ] Confirm with PIP that a copy change on the shared tenant policy is acceptable
- [ ] Confirm the live Welsh button label (`Anfon cod` vs `Anfon cod dilysu`) so the Welsh instruction quotes the label the user actually sees

## B2C policy change (in the owning repository, not this one)

- [ ] Add the English `intro` string to `LocalizedResources Id="api.localaccountpasswordreset.en"` on the verification display control, using `&#xA;` for the line break
- [ ] Add the Welsh `intro` string to the `cy-GB` `LocalizedResources`, using the AC's supplied Welsh verbatim
- [ ] Preserve the exact curly punctuation — `“Send code”`, `We’ll` — do not normalise to straight quotes
- [ ] If `intro` does not render directly above the Send code button, fall back to `UserHelpText` on the email claim and record the deviation
- [ ] Deploy the policy to staging

## This repository

- [ ] Add an E2E assertion in `e2e-tests/tests/` that `/b2c-forgot-password` 302s to the `B2C_1A_PASSWORD_RESET` policy with `ui_locales=en`, and that the Welsh entry point yields `ui_locales=cy-GB` — follow the redirect-boundary pattern in `sign-in.spec.ts`, do not drive the hosted B2C page
- [ ] Confirm the existing 9 tests in `apps/web/src/pages/(auth)/b2c-forgot-password/index.test.ts` still pass unchanged (no CaTH runtime code should change)
- [ ] Run `yarn lint:fix` and `yarn test`

## Manual verification on staging (the real acceptance test)

- [ ] English journey: two-line text appears immediately above **Send code**, exact wording and punctuation, correct DOM order (label → input → text → button)
- [ ] Welsh journey (`?lng=cy`): text in the same position, no English anywhere on the page, quoted button name matches the visible Welsh label
- [ ] Click **Send code**: instruction does not persist into the code-entry state telling users to click a button that no longer exists by that name
- [ ] Click **Continue** before requesting a code: verification error and new instruction coexist without reading as contradictory
- [ ] Complete through to `/password-reset-success`: panel renders, no CaTH session created, user must sign in again
- [ ] axe-core scan in both locales: zero new WCAG 2.2 AA violations
- [ ] Screen reader (NVDA or VoiceOver) in both locales: instruction announced before either button is reached
- [ ] 200% zoom and 400% with reflow in both locales: longer Welsh string neither clips nor overlaps the button
- [ ] Confirm no other consumer of the shared policy on the PIP tenant has regressed

## Follow-up

- [ ] Raise a separate ticket for the underlying design problem: hide or disable **Continue** until the email is verified, or split the steps across two pages per GOV.UK "one thing per page"
- [ ] Feed the content design observations (drop "Please", use "select" not "click", add the missing full stop) back to the content designer
