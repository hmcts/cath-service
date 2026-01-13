# VIBE-142: CaTH Sign In - B2C

## Problem Statement

All CaTH users, including members of the public, can access hearing lists published in CaTH. However, public users are restricted from accessing private or classified information. Only verified users are authorised to access restricted hearing information. These users must sign into CaTH using their verified credentials before gaining access to their accounts.

## User Story

**As a** verified user
**I want to** sign into CaTH
**So that** I can access my account and view restricted hearing information published in CaTH.

## Technical Requirements

### Azure B2C Integration

- **Environment**: Utilize Non-Prod B2C instance for integration
- **Language Support**: Language selection (English/Welsh) must pass through to Azure B2C user flows so users remain in their chosen language
- **Authentication Routes**: Three sign-in options via Azure B2C:
  - HMCTS account
  - Common Platform account
  - CaTH account

### User Journey Pages

#### 1. Sign-In Options Page
- **URL**: `/sign-in`
- **Purpose**: Allow user to select authentication provider
- **Content**:
  - H1: "How do you want to sign in?"
  - Radio buttons:
    - HMCTS account
    - Common Platform account
    - CaTH account
  - Continue button (green)
- **Validation**: Must select one option before continuing

#### 2. Sign-In Pages (per provider)
- **URLs**:
  - `/sign-in/hmcts`
  - `/sign-in/common-platform`
  - `/sign-in/cath`
- **Form Fields**:
  - Email/Username (text, required, valid email or username)
  - Password (password, required, minimum 8 characters, masked input)
- **Content**:
  - Sign in button (green)
  - "Forgot your password?" link
- **Error Messages**:
  - HMCTS route: "Incorrect email or password"
  - Common Platform/CaTH routes: "Invalid username or password"

#### 3. Forgot Password Page
- **URL**: `/sign-in/forgot-password`
- **Form Fields**:
  - Email address (text, required, valid email)
- **Content**:
  - H1: "Forgot your password"
  - Body: "Enter your email address"
  - Send code button (green)
- **Behaviour**: Sends verification code to user's email via Azure B2C

#### 4. Verification Code Page
- **URL**: `/sign-in/verify-code`
- **Form Fields**:
  - Verification code (text, required, 6-8 digits/alphanumeric)
- **Content**:
  - H1: "Enter your verification code"
  - Body: "We've sent a code to your email address"
  - Verify code button (green)
- **Success Message**: "Your account has been verified. You can now sign in."
- **Error Message**: "Verification failed. Please check the code and try again."

#### 5. Dashboard
- **URL**: `/dashboard`
- **Purpose**: Landing page after successful sign-in
- **Access**: Restricted to authenticated verified users only

#### 6. Session Timeout Warning
- **URL**: `/session/timeout-warning` (modal/overlay)
- **Content**:
  - Warning: "You will soon be signed out, due to inactivity."
  - Continue button
- **Behaviour**:
  - Display after configured inactivity period (e.g., 25 minutes)
  - If user clicks Continue, reset inactivity timer
  - If no action taken, proceed to auto sign-out

#### 7. Session Expired Page
- **URL**: `/session/expired`
- **Content**:
  - Message: "You have been signed out, due to inactivity."
  - Sign in again button
- **Behaviour**: Display after final timeout (e.g., 30 minutes)

### Session Management

**Inactivity Timeout:**
- Warning displayed after period of inactivity (configurable, e.g., 25 minutes)
- Auto sign-out after additional period (configurable, e.g., 5 more minutes = 30 total)
- User interaction resets the inactivity timer
- Timer resets on any user action (clicks, form input, etc.)

**Manual Sign Out:**
- "Sign out" link displayed at top-right corner of all authenticated pages
- Clicking sign out redirects to `/sign-in` with confirmation message

### Authentication Flow

1. User visits `/sign-in`
2. User selects authentication provider (HMCTS/Common Platform/CaTH)
3. User redirected to Azure B2C for selected provider
4. Azure B2C handles authentication
5. On success: User redirected to `/dashboard` with session token
6. On failure: User redirected back to sign-in page with error message

### Content Requirements

All content must be provided in both English and Welsh.

**Sign-In Options:**
- EN: Title "How do you want to sign in?"
- EN: Radio options "HMCTS account", "Common Platform account", "CaTH account"
- EN: Button "Continue"
- CY: Title "Sut ydych chi am fewngofnodi?"
- CY: Radio options "Cyfrif HMCTS", "Cyfrif Platfform Cyffredin", "Cyfrif CaTH"
- CY: Button "Parhau"

**Sign-In Pages:**
- EN: Labels "Email address", "Username", "Password"
- EN: Button "Sign in"
- EN: Link "Forgot your password?"
- CY: Labels "Cyfeiriad e-bost", "Enw defnyddiwr", "Cyfrinair"
- CY: Button "Mewngofnodi"
- CY: Link "Wedi anghofio eich cyfrinair?"

**Error Messages:**
- EN: "Incorrect email or password."
- EN: "Invalid username or password."
- EN: "Enter a valid email address."
- EN: "Select how you want to sign in."
- CY: "Ebost neu gyfrinair anghywir."
- CY: "Enw defnyddiwr neu gyfrinair annilys."
- CY: "Rhowch gyfeiriad e-bost dilys."
- CY: "Dewiswch sut rydych am fewngofnodi."

**Password Reset:**
- EN: "Forgot your password"
- EN: "Send code", "Verify code"
- EN: "Your account has been verified. You can now sign in."
- EN: "Verification failed. Please check the code and try again."
- CY: "Wedi anghofio eich cyfrinair?"
- CY: "Anfon cod", "Gwirio cod"
- CY: "Mae eich cyfrif wedi cael ei wirio. Gallwch fewngofnodi nawr."
- CY: "Methwyd y dilysiad. Gwiriwch y cod a cheisiwch eto."

**Session Timeout:**
- EN: "You will soon be signed out, due to inactivity."
- EN: "You have been signed out, due to inactivity."
- EN: Button "Continue", "Sign in again"
- CY: "Byddwch yn cael eich allgofnodi'n fuan, o ganlyniad i wneud dim."
- CY: "Rydych wedi cael eich allgofnodi oherwydd anweithgarwch."
- CY: Button "Parhau", "Mewngofnodi eto"

**Sign Out:**
- EN: "Sign out"
- CY: "Allgofnodi"

## Validation Rules

1. Sign-in options page: Radio button selection required before clicking Continue
2. Sign-in pages: All input fields must be populated before submitting
3. Email fields: Must be valid email format
4. Password fields: Minimum 8 characters (enforced by Azure B2C)
5. Verification code: Must match generated code (enforced by Azure B2C)
6. Session timeout: Warning displayed before forced logout
7. Clicking Continue on timeout warning resets inactivity timer

## Error Handling

- Display errors inline with the relevant field
- Display error summary at top of page
- Use `role="alert"` for error banners
- Screen readers must announce errors

## Accessibility Requirements

- WCAG 2.2 AA compliance
- GOV.UK Design System standards
- Screen readers must announce:
  - Page titles
  - Selected radio options
  - Error messages
- Error banners use `role="alert"`
- All buttons and links keyboard accessible with visible focus states
- Timeout warnings readable by assistive technology
- Input fields include proper `aria-labels`
- Language toggle support throughout authentication flow

## Test Scenarios

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS1 | Sign-in options visible | Visit `/sign-in` | Page shows three radio options |
| TS2 | No option selected | Click Continue without choosing | Error "Select how you want to sign in" |
| TS3 | Valid HMCTS credentials | Select HMCTS → Enter valid credentials → Sign in | Redirect to dashboard |
| TS4 | Invalid HMCTS credentials | Select HMCTS → Enter incorrect password | Error "Incorrect email or password" |
| TS5 | Invalid CaTH credentials | Select CaTH → Enter invalid password | Error "Invalid username or password" |
| TS6 | Forgot password | Click "Forgot your password?" | Redirect to `/sign-in/forgot-password` |
| TS7 | Valid verification code | Enter correct code → Verify | Message "Your account has been verified" |
| TS8 | Invalid verification code | Enter incorrect code → Verify | Message "Verification failed" |
| TS9 | Inactivity warning | Stay idle until timeout threshold | "You will soon be signed out…" displayed |
| TS10 | Auto sign-out | Stay idle after warning | "You have been signed out…" displayed |
| TS11 | Resume activity | Click Continue on warning | Session remains active, timer resets |
| TS12 | Sign out manually | Click "Sign out" | Redirect to `/sign-in` |
| TS13 | Welsh translation | Toggle to Welsh | All content updates correctly |
| TS14 | Language persistence | Select Welsh → Sign in | Azure B2C flow remains in Welsh |
| TS15 | Common Platform auth | Select Common Platform → Sign in | Redirect to Azure B2C Common Platform flow |

## Open Questions / Assumptions

1. **Confirm**: Do all three routes (HMCTS, Common Platform, CaTH) authenticate through Azure B2C?
2. **Confirm**: What are the exact timeout thresholds? (Suggested: 25 min warning, 30 min logout)
3. **Confirm**: Is verification code single-use or time-limited? (Suggested: 15 minutes)
4. **Confirm**: Should all sign-in error messages be logged for audit?
5. **Confirm**: Does "Forgot password" apply to all account types or only CaTH accounts?
6. **Confirm**: What user information is returned from Azure B2C after successful authentication?
7. **Confirm**: How are user roles (verified user, system admin) stored and validated?

## Dependencies

- Azure B2C Non-Prod instance configured
- Azure B2C user flows created for HMCTS, Common Platform, and CaTH
- Azure B2C configured for Welsh language support
- Session management infrastructure (e.g., Redis for session storage)
- GOV.UK Frontend and Design System

## Out of Scope

- User registration/account creation (separate ticket)
- User approval workflow (separate ticket)
- Multi-factor authentication (MFA)
- Social login providers (Google, Facebook, etc.)
- Account management features (change password, update profile)
- Role-based access control implementation (separate ticket)
