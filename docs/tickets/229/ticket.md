# #229: [VIBE-142] CaTH Sign In - B2C

**State:** OPEN
**Assignees:** alao-daniel
**Author:** linusnorton
**Labels:** migrated-from-jira, priority:3-medium, type:story, jira:VIBE-142, status:test
**Created:** 2026-01-20T17:01:44Z
**Updated:** 2026-01-30T14:01:58Z

## Description

> **Migrated from [VIBE-142](https://tools.hmcts.net/jira/browse/VIBE-142)**

**PROBLEM STATEMENT**

All CaTH users, including members of the public, have access to hearing lists published in CaTH. Public users are however restricted from accessing private/classified information and would need to be authorised and verified before access is granted to restricted information in CaTH and would be expected to sign into CaTH before accessing their account.

**AS A** Verified User

**I WANT** to sign into CaTH

**SO THAT** I can have access to my account and to restricted hearing information published in CaTH

**Technical Criteria**
1. Utilise Non-Prod B2C instance for integration
2. Language selection should pass through to Azure B2C user flows so that the user remains in their chosen language

**ACCEPTANCE CRITERIA**
* Only verified users are allowed access to unrestricted published hearing information in CaTH
* When a verified user clicks on the sign in link, the user is directed to the 'How do you want to sign in?' page and is provided with various sign in account routes differentiated by individual radio buttons (HMCTS, Common Platform or CaTH account) and an account selection is made by clicking a radio button beside the specific account and clicking the continue button upon which the user is taken to the dashboard
* Where the User inputs the correct log in information into the data log in fields and clicks the 'sign in' button to complete the sign in process, then the user is logged in and taken to the appropriate dashboard
* Where the User inputs an incorrect log in information into the HMCTS account data log in fields and clicks the 'sign in' button to complete the sign in process, then the user is notified of the incorrect email or password
* Where the User inputs an incorrect log in information into the CaTH or Common platform account data log in fields and clicks the 'sign in' button to complete the sign in process, then the user is notified of the invalid username or password
* Where the verified user has forgotten their log in password, then the user can click on the forgotten password link and is re-directed to a page where the user is expected to input their email address in the data field provided to receive a verification code which is sent to their email when the user clicks the 'Send code' button. If the user inputs the correct verification code, then the user will be informed that the account has been verified and is given access to the verified account. If the user inputs an incorrect verification code then the user will be notified of the rejected log in and that the sign in failed
* Access CaTH is limited by a time-boxed duration of inactivity upon which the user's access is timed out. Where a User is logged into CaTH and the account remains inactive for the allocated timeframe, then a notice will be displayed stating 'You will soon be signed out, due to inactivity'. Where the notice has been displayed and the account still remains inactive for the additional allocated timeframe, then the user is signed out and a notice is displayed stating 'You have been signed out, due to inactivity'. In both scenarios, if the user re-activates the account by clicking the continue button, then the user is not signed out and the inactivity time calculator resets.

## User Story

**As a** Verified User
**I want to** sign into CaTH
**So that** I can access my account and view restricted hearing information published in CaTH

## Acceptance Criteria

1. **Access Restriction**
   - Only verified users can access unrestricted or restricted hearing information.
   - Public users cannot access restricted content.

2. **Sign-In Options Page**
   - When a verified user clicks "Sign in", they are directed to the 'How do you want to sign in?' page.
   - The page displays three radio button options for sign-in routes:
     - HMCTS account
     - Common Platform account
     - CaTH account
   - User selects a sign-in route and clicks Continue to proceed.
   - The system redirects to the relevant authentication page for the selected account type.

3. **Successful Login**
   - If the user enters correct credentials and clicks Sign in, they are authenticated and redirected to their dashboard.

4. **Login Errors**
   - If the user enters incorrect credentials:
     - For HMCTS route → display "Incorrect email or password".
     - For Common Platform or CaTH route → display "Invalid username or password".

5. **Forgotten Password**
   - On any login page, a 'Forgot your password?' link is visible.
   - Clicking the link redirects to a Reset Password page.
   - User enters their registered email address and clicks 'Send code'.
   - A verification code is sent to the user's email.
   - When the correct code is entered:
     - Display message: "Your account has been verified. You can now sign in."
   - When an incorrect code is entered:
     - Display message: "Verification failed. Please check the code and try again."

6. **Session Inactivity Management**
   - If a user remains inactive for the configured timeout period:
     - Display message: "You will soon be signed out, due to inactivity."
   - If the user continues to remain inactive after the warning period:
     - Display message: "You have been signed out, due to inactivity."
   - If the user interacts (clicks Continue) after the first warning:
     - The session remains active and the inactivity timer resets.

7. **Sign-Out**
   - Verified users can manually sign out using the 'Sign out' link displayed at the top-right corner of all pages.

8. **All CaTH accessibility and design specifications are maintained.**

## URL Structure

| Page | URL |
|------|-----|
| Sign-in options | `/sign-in` |
| HMCTS sign-in | `/sign-in/hmcts` |
| Common Platform sign-in | `/sign-in/common-platform` |
| CaTH sign-in | `/sign-in/cath` |
| Forgot password | `/sign-in/forgot-password` |
| Verification code | `/sign-in/verify-code` |
| Dashboard | `/dashboard` |
| Timeout warning | `/session/timeout-warning` |
| Session expired | `/session/expired` |

## Content

**EN:**
- **Title/H1:** "How do you want to sign in?"
- **Labels:** "Email address", "Username", "Password"
- **Buttons:** "Sign in", "Continue", "Send code", "Verify code", "Sign out"
- **Links:** "Forgot your password?"
- **Messages:**
  - "Incorrect email or password."
  - "Invalid username or password."
  - "You will soon be signed out, due to inactivity."
  - "You have been signed out, due to inactivity."
  - "Your account has been verified. You can now sign in."
  - "Verification failed. Please check the code and try again."

**CY:**
- **Title/H1:** "Sut ydych chi am fewngofnodi?"
- **Labels:** "Cyfeiriad e-bost", "Enw defnyddiwr", "Cyfrinair"
- **Buttons:** "Mewngofnodi", "Parhau", "Anfon cod", "Gwirio cod", "Allgofnodi"
- **Links:** "Wedi anghofio eich cyfrinair?"
- **Messages:**
  - "Ebost neu gyfrinair anghywir."
  - "Enw defnyddiwr neu gyfrinair annilys."
  - "Byddwch yn cael eich allgofnodi'n fuan, o ganlyniad i wneud dim."
  - "Rydych wedi cael eich allgofnodi oherwydd anweithgarwch."
  - "Mae eich cyfrif wedi cael ei wirio. Gallwch fewngofnodi nawr."
  - "Methwyd y dilysiad. Gwiriwch y cod a cheisiwch eto."

## Comments

### Comment by linusnorton on 2026-01-20T17:01:52Z
Technical planning has been completed for this ticket. The implementation integrates Azure B2C authentication for verified users with three sign-in providers (HMCTS, Common Platform, CaTH), Redis-based session management with configurable inactivity timeouts, client-side timeout tracking with warning modals, and full Welsh language support throughout the authentication flow including B2C user flows.

**Branch:** feature/VIBE-142-cath-sign-in-b2c

**Documentation:**
- Specification
- Implementation Plan
- Task List

### Comment by linusnorton on 2026-01-29T15:56:44Z
Technical planning has been completed for this ticket. The implementation integrates Azure B2C authentication for verified users with three sign-in providers (HMCTS, Common Platform, CaTH), Redis-based session management with configurable inactivity timeouts, client-side timeout tracking with warning modals, and full Welsh language support throughout the authentication flow including B2C user flows.

**Branch:** feature/VIBE-142-cath-sign-in-b2c

**Documentation:**
- Specification
- Implementation Plan
- Task List
