-- Initial requirements load, generated from GitHub issues that have moved
-- past the "Refined Tickets" status on the CaTH Kanban board (project 43).
--
-- 134 requirements, ref REQ-0001..REQ-0134 ordered by issue number.
-- Apply after schema.sql. See scripts/init_db.sh.
--
-- NOT hand-edited: regenerated from the board + issues. To change requirements
-- after this load, add a numbered migration in migrations/ rather than editing here.

BEGIN TRANSACTION;

INSERT INTO requirement
  (id, ref, title, statement, kind, status, priority, granularity,
   issue_number, issue_url, created_at, updated_at, created_by, updated_by)
VALUES
  (1, 'REQ-0001', 'Public User Journey', 'This ticket covers all the actions required to be undertaken by public users while navigating through CaTH and accessing general information and public hearing lists.', 'functional', 'verified', 'medium', 'epic', 211, 'https://github.com/hmcts/cath-service/issues/211', '2026-01-20T16:58:42Z', '2026-01-30T15:02:48Z', 'linusnorton', 'linusnorton'),
  (2, 'REQ-0002', 'CaTH Publication - Manual Publishing', 'This epic covers all the steps in the user journey, business and technical requirements involved in the manual process of publishing hearing lists in CaTH.', 'functional', 'verified', 'medium', 'epic', 213, 'https://github.com/hmcts/cath-service/issues/213', '2026-01-20T16:59:00Z', '2026-01-30T15:02:50Z', 'linusnorton', 'linusnorton'),
  (3, 'REQ-0003', 'Project Prep Tasks', '#### This epic is raised to capture preparatory tasks needed for the CaTH AI project.', 'functional', 'verified', 'lowest', 'epic', 222, 'https://github.com/hmcts/cath-service/issues/222', '2026-01-20T17:00:25Z', '2026-01-30T15:02:52Z', 'linusnorton', 'linusnorton'),
  (4, 'REQ-0004', 'TEST TICKET', '#### User story

**As a** *<type of user>,* **I want to** *<some goal>,* **so that** *<some reason>.*
#### Acceptance criteria
 # **Given that** *<some precondition>,* **when** *<some action is carried out>,* **then** *<I expect some result>.*', 'functional', 'verified', 'medium', 'story', 226, 'https://github.com/hmcts/cath-service/issues/226', '2026-01-20T17:01:02Z', '2026-01-30T15:02:55Z', 'linusnorton', 'linusnorton'),
  (5, 'REQ-0005', '‘How do you want to sign in’ Page', '**PROBLEM STATEMENT**

Verified users are required to sign into CaTH before accessing restricted information. This would require access to a ''sign in'' page.

 

**AS A** Verified User

**I WANT** to sign into CaTH

**SO THAT** I can have access to my account and to restricted hearing information published in CaTH

 

**ACCEPTANCE CRITERIA**
 * User can see the links to Gov.UK, Court and tribunal hearings and sign in at the top of the ‘How do you want to sign in?’ page
 * User is provided with various sign in account routes on the ‘How do you want to sign in?’ page (HMCTS, Common Platform or CaTH account)
 * User can make an account selection by clicking a radio button beside the specific account and clicking the continue button
 * Where the User does not have a CaTH account, the User is provided a link to create a CaTH account
 * User can see the general information links at the bottom of the page ( Help, privacy, cookies, accessibility statement, contact, terms and conditions, welsh, government digital service and open government licence)
 * User has the option of switching to the Welsh translated page', 'functional', 'verified', 'medium', 'story', 227, 'https://github.com/hmcts/cath-service/issues/227', '2026-01-20T17:01:14Z', '2026-01-30T15:02:58Z', 'linusnorton', 'linusnorton'),
  (6, 'REQ-0006', 'CaTH ‘Sign in’ - CFT IDAM', '**PROBLEM STATEMENT**

Verified users are required to sign into CaTH before accessing restricted information. This required the input of verified sign in details.

 

**AS A** Verified User

**I WANT** to sign into CaTH

**SO THAT** I can have access to my account and to restricted hearing information published in CaTH

 

**Technical Criteria**
 # User should be re~~directed to the CFT IDAM flow when selecting and submitting the CFT IDAM radio button on the /sign~~in page
 # When navigating to any verified route, user should be redirected to /sign-in page
 # Verified authenticated pages include: /account-home
 # All login and associated user screens are part of the CFT IDAM, and not to be added as part of this
 # When user has successfully authenticated with the CFT IDAM they should be redirected back to /account-home
 # When the user is redirected, a call to the CFT IDAM user endpoint to be made to retrieve user details including the role
 # All roles should be accepted, other than citizen and letter holder. Regex: ^citizen(~~.*)?$|^letter~~holder$
 # If user does not have the correct roles, they are redirect to the CFT Rejected login page (same as current CaTH)
 # Associated config for CFT IDAM read from KV (or env variables locally) and used for redirection and token processing. The processes uses oAuth
 # The users role is stored in the session and used to authenticate on each of the pages. The role is ''VERIFIED''
 # Sign Out and session expiry does not need to be handled. This will be done in a separate ticket ({**}To be raised){**}
 # After the user is signed in, all pages should display Sign out instead of Sign In in the banner at the top right
 # E2E tests should utilise the existing CFT IDAM Test Users for each role
 # Use passport as the authentication middleware, in a similar way to the SSO integration
 # If CFT IDAM user attempts to access admin pages, then user should be redirected back to /account~~home. Similarly, if an Admin user tries to access the verified pages, they should be redirect back to /admin~~dashboard or /system~~admin~~dashboard (depending on if they are a standard or system admin)

 

**ACCEPTANCE CRITERIA**
 * On the CaTH sign in page, the title provided in the header is ''How do you want to sign in''. The CFT IDAM User can see 3 radio buttons that lead to 3 different sign in routes. The User selects the myHMCTS sign in route and clicks continue
 * User inputs the verified log in information into the data log in fields and click the ‘sign in’ button to continue the sign in process
 * Where the User inputs the correct log in information into the data log in fields and clicks the ‘sign in’ button to complete the sign in process, then the user is logged in and taken to the appropriate dashboard with 3 tiles (Court and tribunal hearings, Single Justice Procedure cases and Email subscriptions)
 * Where the User inputs an incorrect log in information into the HMCTS account data log in fields and clicks the ‘sign in’ button to complete the sign in process, then the user is notified with the following message written in a red box under the header ''Incorrect email or password'' ''Please fix the following''. Underneath the message, user sees the following messages written boldly and underlined in red ''check your email address'' on the first line and ''check your password'' on the second line. The sign in fields are highlighted in red 
 * User is provided with a ‘forgotten password’ link on the sign in page which takes the user to a screen where the user can input email address and click the ''submit'' button to receive an email to reset password. After inputting email address and submitting, user sees the following message under the header ''{**}Check your email''{**} which states ''If you entered a valid email address, we will send you an email with details of how to reset your password.
If you have entered an email address that is not connected with an account, you will not receive an email. You will need to <contact us>(https://hmcts~~access.service.gov.uk/contact~~us) to create an account.''. Underneath the message, user sees another message user the header ''{**}Can''t see the email?''{**} ''

It can take a few minutes to arrive. Check your junk mail if you can''t see it in your inbox.

If the email doesn''t arrive, you can <request another password reset email>(https://idam~~web~~public.aat.platform.hmcts.net/reset/forgotpassword?redirectUri=https%3a%2f%2fpip~~frontend.staging.platform.hmcts.net%2fcft~~login%2freturn&client_id=app~~pip~~frontend&state=&nonce=&scope=).''
 * Where a User is logged into CaTH and the account remains inactive for the allocated timeframe, then a notice will be displayed stating ''You will soon be signed out due to inactivity''
 * Where the notice has been displayed and the account still remains inactive for the additional allocated timeframe, then the user is signed out and a notice is displayed stating ''You have been signed out due to inactivity''
 * In both scenarios above, if the user re-activates the account by clicking the continue button, then the user is not signed out and the inactivity time calculator resets.
 * Where the user signs in successfully, user can sign out by clicking the Sign out'' link at the top right of the screen

 

 

**Welsh translation:**

Check your email

If you entered a valid email address, we will send you an email with details of how to reset your password.

If you have entered an email address that is not connected with an account, you will not receive an email. You will need to <contact us>(https://hmcts~~access.service.gov.uk/contact~~us) to create an account.
## Can''t see the email?

It can take a few minutes to arrive. Check your junk mail if you can''t see it in your inbox.

If the email doesn''t arrive, you can <request another password reset email>(https://idam~~web~~public.aat.platform.hmcts.net/reset/forgotpassword?redirectUri=https%3a%2f%2fpip~~frontend.staging.platform.hmcts.net%2fcft~~login%2freturn&client_id=app~~pip~~frontend&state=&nonce=&scope=).
# Gwiriwch eich negeseuon e-bost

Os bu ichi roi cyfeiriad e~~bost dilys, byddwn yn anfon neges e~~bost atoch gyda manylion ynghylch sut i ailosod eich cyfrinair.

Os ydych wedi rhoi cyfeiriad e~~bost nas ddefnyddiwyd i greu cyfrif, ni fyddwch yn cael neges e~~bost. Bydd angen ichi <gysylltu â ni>(https://hmcts~~access.service.gov.uk/contact~~us) i greu cyfrif.
## Heb gael y neges e-bost?

Gall gymryd ychydig o funudau i gyrraedd. Gwiriwch eich blwch negeseuon ‘junk’ os na allwch ei weld yn eich mewnflwch.

Os na fydd yr e~~bost yn cyrraedd, gallwch <ofyn am e~~bost arall ar gyfer ailosod cyfrinair>(https://idam~~web~~public.aat.platform.hmcts.net/reset/forgotpassword?redirectUri=https%3a%2f%2fpip~~frontend.staging.platform.hmcts.net%2fcft~~login%2freturn&client_id=app~~pip~~frontend&state=&nonce=&scope=).

 

You will soon be signed out, due to inactivity - Byddwch yn cael eich allgofnodi’n fuan, o ganlyniad i wneud dim

You have been signed out, due to inactivity - Rydych wedi cael eich allgofnodi oherwydd anweithgarwch

 “Sign in”  - “Mewngofnodi”

“Email address”, “Password”  - “cyfeiriad ebost”, “Cyfrinair”

 “Sign in”  - “Mewngofnodi”

 “Forgot your password?”  - “Wedi anghofio eich cyfrinair?”

 “Court and tribunal hearings”  - “Gwrandawiadau llys a thribiwnlys”

 

 

 
 # VIBE~~140 Verified User Sign~~In Specification

> Owner: {**}`**`VIBE-140`**`{**} · Updated: {**}`**`24 Oct 2025`**`{**}

—
 # 
 ## Problem Statement

Verified users are required to sign into CaTH before accessing restricted hearing information.  
This requires verified credentials input through the CaTH sign-in process and validated authentication to ensure only authorised users can access restricted data.

—
 # 
 ## User Story

{**}`**`As a`**`{**} **Verified User**  
{**}`**`I want to`**`{**} **sign into CaTH**  
{**}`**`So that`**`{**} **I can have access to my account and to restricted hearing information published in CaTH**

—
 # 
 ## Acceptance Criteria

1. On the CaTH sign-in page, the {**}`**`header title`**`{**} is:  
   > “How do you want to sign in?”  
2. The CFT IDAM user sees {**}`**`three radio button options`**`{**}, each leading to a different sign-in route:  
   - myHMCTS  
   - Judicial Office  
   - Professional user (for example)  
3. The user selects {**}`**`myHMCTS`**`{**} and clicks the {**}`**`Continue`**`{**} button.  
4. The user is directed to the myHMCTS {**}`**`Sign In page`**`{**} containing two fields:  
   - {**}`**`Email address`**`{**}  
   - {**}`**`Password`**`{**}  
   and a {**}`**`‘Sign in’`**`{**} button.  
5. If the user enters correct credentials and clicks {**}`**`Sign in{**}`**`, the system authenticates successfully and redirects the user to their dashboard displaying {**}`**`three tiles`**`{**}:  
   - Court and tribunal hearings  
   - Single Justice Procedure cases  
   - Email subscriptions  
6. If the user enters incorrect credentials, a red error box is displayed with:  
   - Header: {**}`**`“Incorrect email or password”`**`{**}  
   - Subheader: {**}`**`“Please fix the following”`**`{**}  
   - Bold red underlined messages:  
     - “Check your email address”  
     - “Check your password”  
   - The input fields are highlighted in red.  
7. The user is provided with a {**}`**`‘Forgot your password?’`**`{**} link below the sign-in button.  
8. Clicking {**}`**`‘Forgot your password?’`**`{**} takes the user to the {**}`**`Reset Password page{**}`**`, where they can input their email address and click {**}`**`‘Submit’`**`{**} to receive a reset email.  
9. After submitting their email address, the user sees a confirmation screen titled {**}`**`‘Check your email’`**`{**} with the following message:  
   > “If you entered a valid email address, we will send you an email with details of how to reset your password.  
   >  
   > If you have entered an email address that is not connected with an account, you will not receive an email. You will need to contact us to create an account.”  
10. Underneath the confirmation, a section titled {**}`**`“Can’t see the email?”`**`{**} appears with the text:  
    > “It can take a few minutes to arrive. Check your junk mail if you can''t see it in your inbox.  
    >  
    > If the email doesn''t arrive, you can request another password reset email.”  
11. If the user remains inactive while signed in, a notice banner appears:  
    - “You will soon be signed out due to inactivity.”  
12. If inactivity continues for the defined time period, the system automatically signs the user out and displays:  
    - “You have been signed out due to inactivity.”  
13. If the user interacts (clicks Continue) after the inactivity notice, the timer resets, and the session remains active.  
14. Once signed in, users can sign out by clicking {**}`**`‘Sign out’`**`{**} in the top-right corner of any page.

—
 # 
 ## User Journey Flow

1. User navigates to CaTH homepage → clicks {**}`**`Continue`**`{**} → selects {**}`**`Sign in`**`{**} route.  
2. The system presents the {**}`**`Sign In options page`**`{**} (“How do you want to sign in?”).  
3. User selects {**}`**`myHMCTS`**`{**} and clicks {**}`**`Continue`**`{**}.  
4. User enters credentials on the myHMCTS sign-in screen.  
5. System validates credentials:  
   - On success → redirect to Dashboard.  
   - On failure → show error box.  
6. User can click {**}`**`‘Forgot your password?’`**`{**} to initiate reset process.  
7. If password reset request is successful, user sees the {**}`**`Check your email`**`{**} page.  
8. Once authenticated, user session is active until sign-out or timeout.

—
 # 
 ## Wireframes

 # 
 ## 
 ### A. Sign-In Options Page

┌──────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK <Language> │
├──────────────────────────────────────────────────────────────────────────────┤
│ HMCTS – Courts and Tribunals Hearings (CaTH) │
├──────────────────────────────────────────────────────────────────────────────┤
│ < Back │
│ How do you want to sign in? │
│ │
│ ○ myHMCTS │
│ ○ Judicial Office │
│ ○ Professional user │
│ │
│ <Continue> (Green Button) │
└──────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## 
 ### B. myHMCTS Sign-In Page

┌──────────────────────────────────────────────────────────────────────────────┐
│ myHMCTS Sign-In │
│ │
│ Email address: <\\\{**}>(file://\{%2A}/) │\{**}
{**}│ Password: <\\\{**}>(file://\{%2A}/) │
│ │
│ <Sign in> (Green Button) │
│ │
│ Forgot your password? (Link) │
│ │
│ (Error State Example) │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ 🔴 Incorrect email or password │ │
│ │ Please fix the following │ │
│ │ - Check your email address │ │
│ │ - Check your password │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## 
 ### C. Check Your Email Page (Password Reset Confirmation)

┌──────────────────────────────────────────────────────────────────────────────┐
│ Check your email │
│ │
│ If you entered a valid email address, we will send you an email with details │
│ of how to reset your password. │
│ │
│ If you have entered an email address that is not connected with an account, │
│ you will not receive an email. You will need to contact us to create an │
│ account. │
│ │
│ Can''t see the email? │
│ It can take a few minutes to arrive. Check your junk mail if you can''t see │
│ it in your inbox. │
│ If the email doesn''t arrive, you can request another password reset email. │
└──────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## 
 ### D. Inactivity and Sign-Out Messages

┌──────────────────────────────────────────────────────────────────────────────┐
│ ⚠️ You will soon be signed out due to inactivity. │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ ⚠️ You have been signed out due to inactivity. │
└──────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## Form Fields

|Field|Type|Required|Validation|Behaviour|
|~~--~~~~--~~|~~--~~~~-|~~~~--~~~~--~~~~-|~~~~--~~~~--~~~~--~~|~~--~~~~--~~~~--~~-|
|Email address|Text|Yes|Must be valid email format|Highlighted red on invalid entry|
|Password|Password|Yes|Minimum 8 characters|Hidden characters by default|
|Radio buttons|Select|Yes|One option must be selected|Required before Continue|
|Forgot password email|Text|Yes|Must be valid email address|Sends reset request|

—
 # 
 ## Content

{**}`**`EN:`**`{**}  
 - {**}`**`Page title:`**`{**} “How do you want to sign in?”  
 - {**}`**`Sign-in page labels:`**`{**} “Email address”, “Password”, “Sign in”  
 - {**}`**`Error messages:`**`{**}  
  - “Incorrect email or password”  
  - “Please fix the following”  
  - “Check your email address”  
  - “Check your password”  
 - {**}`**`Forgot password:`**`{**} “Forgot your password?”  
 - {**}`**`Inactivity notices:`**`{**}  
  - “You will soon be signed out due to inactivity”  
  - “You have been signed out due to inactivity”  
 - {**}`**`Dashboard tiles:`**`{**} “Court and tribunal hearings”, “Single Justice Procedure cases”, “Email subscriptions”

{**}`**`CY:`**`{**}  
 - {**}`**`Page title:`**`{**} “Sut ydych chi am fewngofnodi?”  
 - {**}`**`Sign-in page labels:`**`{**} “cyfeiriad ebost”, “Cyfrinair”, “Mewngofnodi”  
 - {**}`**`Error messages:`**`{**}  
  - “Ebost neu gyfrinair anghywir”  
  - “Trwsiwch y canlynol”  
  - “Gwiriwch eich cyfeiriad ebost”  
  - “Gwiriwch eich cyfrinair”  
 - {**}`**`Forgot password:`**`{**} “Wedi anghofio eich cyfrinair?”  
 - {**}`**`Inactivity notices:`**`{**}  
  - “Byddwch yn cael eich allgofnodi’n fuan, o ganlyniad i wneud dim”  
  - “Rydych wedi cael eich allgofnodi oherwydd anweithgarwch”  
 - {**}`**`Dashboard tiles:`**`{**} “Gwrandawiadau llys a thribiwnlys”, “Achosion Gweithdrefn Un Ynad”, “Tanysgrifiadau e-bost”

—
 # 
 ## URL Structure

|Page|URL|
|~~--~~~~-|~~---|
|Sign~~in options|`/sign~~in`|
|myHMCTS sign~~in|`/sign~~in/myhmcts`|
|Forgot password|`/sign~~in/forgot~~password`|
|Check your email|`/sign~~in/forgot~~password/check-email`|
|Dashboard|`/dashboard`|
|Session timeout notice|`/timeout-warning`|
|Session expired|`/session-expired`|

—
 # 
 ## Validation Rules

 - {**}`**`Email address`**`{**} must be a valid format (e.g., `user@example.com`).  
 - {**}`**`Password`**`{**} must not be empty.  
 - {**}`**`Radio button`**`{**} selection required before proceeding from the sign-in options page.  
 - {**}`**`Inactivity warning`**`{**} triggers after predefined timeout period (e.g., 25 mins).  
 - {**}`**`Session expiry`**`{**} triggers after extended inactivity (e.g., 30 mins).  
 - All input errors must display inline and in an accessible error summary at the top of the page.

—
 # 
 ## Error Messages

{**}`**`EN:`**`{**}  
 - “Incorrect email or password.”  
 - “Court or tribunal name must be 3 characters or more.”  
 - “Please fix the following.”  
 - “Check your email address.”  
 - “Check your password.”  

{**}`**`CY:`**`{**}  
 - “Ebost neu gyfrinair anghywir.”  
 - “Rhaid i enw’r llys neu’r tribiwnlys gynnwys 3 llythyren neu fwy.”  
 - “Trwsiwch y canlynol.”  
 - “Gwiriwch eich cyfeiriad ebost.”  
 - “Gwiriwch eich cyfrinair.”

—
 # 
 ## Navigation

 - {**}`**`Sign in options → myHMCTS sign-in page`**`{**}  
 - {**}`**`myHMCTS sign-in page → Dashboard (on success)`**`{**}  
 - {**}`**`myHMCTS sign-in page → Error (on failure)`**`{**}  
 - {**}`**`Forgot password → Check your email page`**`{**}  
 - {**}`**`Dashboard → Sign out`**`{**} (link top-right)  
 - {**}`**`Session timeout warning → Stay signed in or auto sign-out`**`{**}  

—
 # 
 ## Accessibility

 - Comply with {**}`**`WCAG 2.2 AA`**`{**} and {**}`**`GOV.UK Design System`**`{**}.  
 - Use ARIA roles (`role="alert"`) for all error and timeout notifications.  
 - Keyboard navigation must be supported for all inputs, links, and buttons.  
 - Focus states must be visible and logical.  
 - Error summaries must include anchor links to problematic fields.  
 - Language toggle must update text dynamically without clearing input.  
 - Timeout warnings must be screen-reader accessible and allow for user interaction to stay signed in.

—
 # 
 ## Test Scenarios

|ID|Scenario|Steps|Expected Result|
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
|TS1|Load sign~~in options|Visit `/sign~~in`|Three radio buttons displayed|
|TS2|Select myHMCTS|Choose myHMCTS and click Continue|Redirect to myHMCTS sign-in page|
|TS3|Valid credentials|Enter correct email/password|Redirect to Dashboard|
|TS4|Invalid credentials|Enter incorrect credentials|Error box displayed with messages|
|TS5|Forgot password|Click Forgot password link|Redirect to `/sign~~in/forgot~~password`|
|TS6|Submit reset email|Enter email, click Submit|Redirect to Check your email page|
|TS7|Inactivity warning|Stay idle for threshold|Warning banner displayed|
|TS8|Auto sign-out|Stay idle after warning|Session expired page displayed|
|TS9|Resume session|Click Continue after warning|Session remains active|
|TS10|Sign out|Click Sign out|User returned to sign-in page|
|TS11|Welsh translation|Toggle to Welsh|Page updates to Welsh content|
|TS12|Accessibility test|Use screen reader|All messages read correctly|
|TS13|Error recovery|Fix invalid email, re-submit|Redirect to Dashboard on success|

—
 # 
 ## Assumptions / Open Questions

 - Confirm timeout and warning duration (e.g., 25 min warning, 30 min sign-out).  
 - Confirm whether IDAM authentication occurs within CaTH or via external redirect.  
 - Confirm if multi-factor authentication (MFA) is required for verified media users.  
 - Confirm if error tracking should be logged for failed sign-in attempts.  
 - Confirm if password reset emails use existing HMCTS templates or custom CaTH branding.

—', 'functional', 'verified', 'medium', 'story', 228, 'https://github.com/hmcts/cath-service/issues/228', '2026-01-20T17:01:28Z', '2026-01-30T15:03:00Z', 'linusnorton', 'linusnorton'),
  (7, 'REQ-0007', 'CaTH Sign In - B2C', '**PROBLEM STATEMENT**

All CaTH users, including members of the public, have access to hearing lists published in CaTH. Public users are however restricted from accessing private/classified information and would need to be authorised and verified before access is granted to restricted information in CaTH and would be expected to sign into CaTH before accessing their account. 

 

**AS A** Verified User

**I WANT** to sign into CaTH

**SO THAT** I can have access to my account and to restricted hearing information published in CaTH

 

+**Technical Criteria**+
 # Utilise Non-Prod B2C instance for integration
 # Language selection should pass through to Azure B2C user flows so that the user remains in their chosen language

 

**ACCEPTANCE CRITERIA**
 * Only  verified users are allowed access to unrestricted published hearing information in CaTH
 * When a verified user clicks on the sign in link, the user is directed to the ‘How do you want to sign in?’ page and is provided with various sign in account routes differentiated by individual radio buttons (HMCTS, Common Platform or CaTH account) and  an account selection is made by clicking a radio button beside the specific account and clicking the continue button upon which the user is taken to the dashboard
 * Where the User inputs the correct log in information into the data log in fields and clicks the ‘sign in’ button to complete the sign in process, then the user is logged in and taken to the appropriate dashboard
 * Where the User inputs an incorrect log in information into the HMCTS account data log in fields and clicks the ‘sign in’ button to complete the sign in process, then the user is notified of the incorrect email or password
 * Where the User inputs an incorrect log in information into the CaTH or Common platform account data log in fields and clicks the ‘sign in’ button to complete the sign in process, then the user is notified of the invalid username or password
 * Where the verified user has forgotten their log in password, then the user can click on the forgotten password link and is re-directed to a page where the user is expected to input their email address in the data field provided to receive a verification code which is sent to their email when the user clicks the ''Send code'' button. If the user inputs the correct verification code, then the user will be informed that the account has been verified and is given access to the verified account. If the user inputs an incorrect verification code then the user will be notified of the rejected log in and that the sign in failed
 * Access CaTH is limited by a time~~boxed duration of inactivity upon which the user’s access is timed out. Where a User is logged into CaTH and the account remains inactive for the allocated timeframe, then a notice will be displayed stating ''You will soon be signed out, due to inactivity''. Where the notice has been displayed and the account still remains inactive for the additional allocated timeframe, then the user is signed out and a notice is displayed stating ''You have been signed out, due to inactivity''. In both scenarios, if the user re~~activates the account by clicking the continue button, then the user is not signed out and the inactivity time calculator resets.

 

 

 
 # VIBE~~142 Verified User Sign~~In Access Specification

> Owner: **{*}VIBE-142{**}* · Updated: **{*}05 Nov 2025{**}*

—
 # 
 ## Problem Statement

All CaTH users, including members of the public, can access hearing lists published in CaTH.  
However, **{*}public users are restricted{**}* from accessing private or classified information.  
Only **{*}verified users{**}* are authorised and verified to access restricted hearing information.  
These users must sign into CaTH using their verified credentials before gaining access to their accounts.

—
 # 
 ## User Story

**{*}As a{**}* **Verified User**  
**{*}I want to{**}* **sign into CaTH**  
**{*}So that{**}* **I can access my account and view restricted hearing information published in CaTH**

—
 # 
 ## Acceptance Criteria

1. **{*}Access Restriction{**}*  
   - Only verified users can access unrestricted or restricted hearing information.  
   - Public users cannot access restricted content.

2. **{*}Sign-In Options Page{**}*  
   - When a verified user clicks **{*}“Sign in”{**}{**}, they are directed to the ***‘How do you want to sign in?’{*}* page.  
   - The page displays three radio button options for sign-in routes:  
     - **{*}HMCTS{**}* account  
     - **{*}Common Platform{**}* account  
     - **{*}CaTH account{**}*  
   - User selects a sign-in route and clicks **{*}Continue{**}* to proceed.  
   - The system redirects to the relevant authentication page for the selected account type.

3. **{*}Successful Login{**}*  
   - If the user enters **{*}correct credentials{**}* and clicks **{*}Sign in{**}{**}, they are authenticated and redirected to their ***dashboard{*}*.

4. **{*}Login Errors{**}*  
   - If the user enters **{*}incorrect credentials{**}*:  
     - For **{*}HMCTS{**}* route → display **{*}“Incorrect email or password”{**}*.  
     - For **{*}Common Platform{**}* or **{*}CaTH{**}* route → display **{*}“Invalid username or password”{**}*.

5. **{*}Forgotten Password{**}*  
   - On any login page, a **{*}‘Forgot your password?’{**}* link is visible.  
   - Clicking the link redirects to a **{*}Reset Password page{**}*.  
   - User enters their registered email address and clicks **{*}‘Send code’{**}*.  
   - A verification code is sent to the user’s email.  
   - When the correct code is entered:  
     - Display message: **{*}“Your account has been verified. You can now sign in.”{**}*  
   - When an incorrect code is entered:  
     - Display message: **{*}“Verification failed. Please check the code and try again.”{**}*

6. **{*}Session Inactivity Management{**}*  
   - If a user remains inactive for the configured timeout period:  
     - Display message: **{*}“You will soon be signed out, due to inactivity.”{**}*  
   - If the user continues to remain inactive after the warning period:  
     - Display message: **{*}“You have been signed out, due to inactivity.”{**}*  
   - If the user interacts (clicks **{*}Continue{**}*) after the first warning:  
     - The session remains active and the inactivity timer resets.

7. **{*}Sign-Out{**}*  
   - Verified users can manually sign out using the **{*}‘Sign out’{**}* link displayed at the top-right corner of all pages.  

8. **{*}All CaTH accessibility and design specifications are maintained.{**}*

—
 # 
 ## User Journey Flow

1. Verified user navigates to the CaTH home page.  
2. Clicks **{*}‘Sign in’{**}* → directed to **{*}‘How do you want to sign in?’{**}* page.  
3. Selects one of the account types (HMCTS, Common Platform, or CaTH).  
4. Clicks **{*}Continue{**}* → redirected to respective login page.  
5. Enters login details → clicks **{*}Sign in{**}*.  
6. System validates credentials:  
   - Success → Redirect to Dashboard.  
   - Failure → Show appropriate error message.  
7. If user forgot password → clicks **{*}Forgot password{**}* → enters email → receives verification code → verifies code → can reset or re-access account.  
8. System tracks inactivity and automatically signs out inactive users after threshold.

—
 # 
 ## Wireframes

 # 
 ## 
 ### A. Sign-In Options Page

┌──────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK <Language> │
├──────────────────────────────────────────────────────────────────────────────┤
│ HMCTS – Courts and Tribunals Hearings (CaTH) │
├──────────────────────────────────────────────────────────────────────────────┤
│ < Back │
│ How do you want to sign in? │
│ │
│ ○ HMCTS account │
│ ○ Common Platform account │
│ ○ CaTH account │
│ │
│ <Continue> (Green Button) │
└──────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## 
 ### B. Sign-In Page (Generic Layout)

┌──────────────────────────────────────────────────────────────────────────────┐
│ <Header: HMCTS / Common Platform / CaTH> │
│ │
│ Email / Username │
│ <\{**}> │\{**}
**│ │**
**│ Password │**
{**}│ <\{**}> │
│ │
│ <Sign in> (Green Button) │
│ Forgot your password? (Link) │
│ │
│ (Error example) │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ 🔴 Incorrect email or password │ │
│ │ Please check your credentials and try again. │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘

 

 

—
 # 
 ## 
 ### C. Forgot Password & Verification Page

 

┌──────────────────────────────────────────────────────────────────────────────┐
│ Forgot your password │
│ │
│ Enter your email address │
│ <*__**__**__**__**__**__**__*__\{**}> │\{**}
**│ │**
**│ <Send code> (Green Button) │**
**│ │**
**│ Once received, enter your code: │**
{**}│ <\{**}> │
│ <Verify code> (Green Button) │
│ │
│ Messages: │
│ ✅ Your account has been verified. You can now sign in. │
│ ❌ Verification failed. Please check the code and try again. │
└──────────────────────────────────────────────────────────────────────────────┘
 

—
 # 
 ## 
 ### D. Session Timeout Messages

┌──────────────────────────────────────────────────────────────────────────────┐
│ ⚠️ You will soon be signed out, due to inactivity. │
│ <Continue> │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ ⚠️ You have been signed out, due to inactivity. │
│ <Sign in again> │
└──────────────────────────────────────────────────────────────────────────────┘

 

 

—
 # 
 ## Form Fields

|Field|Type|Required|Validation|Behaviour|
|~~--~~~~--~~|~~--~~~~-|~~~~--~~~~--~~~~-|~~~~--~~~~--~~~~--~~|~~--~~~~--~~~~--~~-|
|Sign~~in option|Radio|Yes|One option must be selected|Determines sign~~in route|
|Email / Username|Text|Yes|Valid email or username|Highlight red on error|
|Password|Password|Yes|Minimum 8 characters|Masked input|
|Verification code|Text|Yes|Numeric or alphanumeric|6–8 digits; must match system value|

—
 # 
 ## Content

**{*}EN:{**}*  
 - **{*}Title/H1:{**}* “How do you want to sign in?”  
 - **{*}Labels:{**}* “Email address”, “Username”, “Password”  
 - **{*}Buttons:{**}* “Sign in”, “Continue”, “Send code”, “Verify code”, “Sign out”  
 - **{*}Links:{**}* “Forgot your password?”  
 - **{*}Messages:{**}*  
  - “Incorrect email or password.”  
  - “Invalid username or password.”  
  - “You will soon be signed out, due to inactivity.”  
  - “You have been signed out, due to inactivity.”  
  - “Your account has been verified. You can now sign in.”  
  - “Verification failed. Please check the code and try again.”

**{*}CY:{**}*  
 - **{*}Title/H1:{**}* “Sut ydych chi am fewngofnodi?”  
 - **{*}Labels:{**}* “Cyfeiriad e-bost”, “Enw defnyddiwr”, “Cyfrinair”  
 - **{*}Buttons:{**}* “Mewngofnodi”, “Parhau”, “Anfon cod”, “Gwirio cod”, “Allgofnodi”  
 - **{*}Links:{**}* “Wedi anghofio eich cyfrinair?”  
 - **{*}Messages:{**}*  
  - “Ebost neu gyfrinair anghywir.”  
  - “Enw defnyddiwr neu gyfrinair annilys.”  
  - “Byddwch yn cael eich allgofnodi’n fuan, o ganlyniad i wneud dim.”  
  - “Rydych wedi cael eich allgofnodi oherwydd anweithgarwch.”  
  - “Mae eich cyfrif wedi cael ei wirio. Gallwch fewngofnodi nawr.”  
  - “Methwyd y dilysiad. Gwiriwch y cod a cheisiwch eto.”

—
 # 
 ## URL Structure

|Page|URL|
|~~--~~~~-|~~---|
|Sign~~in options|`/sign~~in`|
|HMCTS sign~~in|`/sign~~in/hmcts`|
|Common Platform sign~~in|`/sign~~in/common-platform`|
|CaTH sign~~in|`/sign~~in/cath`|
|Forgot password|`/sign~~in/forgot~~password`|
|Verification code|`/sign~~in/verify~~code`|
|Dashboard|`/dashboard`|
|Timeout warning|`/session/timeout-warning`|
|Session expired|`/session/expired`|

—
 # 
 ## Validation Rules

 - Radio button selection required before clicking **{*}Continue{**}*.  
 - All input fields must be populated before **{*}Sign in{**}*.  
 - Incorrect credentials → Show error message inline and in summary.  
 - Verification code input must match generated code before granting access.  
 - Session timeout warning displayed before forced logout.  
 - Clicking **{*}Continue{**}* on timeout warning resets inactivity timer.  

—
 # 
 ## Error Messages

**{*}EN:{**}*  
 - “Incorrect email or password.”  
 - “Invalid username or password.”  
 - “Verification failed. Please check the code and try again.”  
 - “Enter a valid email address.”  
 - “Select how you want to sign in.”

**{*}CY:{**}*  
 - “Ebost neu gyfrinair anghywir.”  
 - “Enw defnyddiwr neu gyfrinair annilys.”  
 - “Methwyd y dilysiad. Gwiriwch y cod a cheisiwch eto.”  
 - “Rhowch gyfeiriad e-bost dilys.”  
 - “Dewiswch sut rydych am fewngofnodi.”

—
 # 
 ## Navigation

 - **{*}Sign in options → Login page → Dashboard{**}*  
 - **{*}Forgot password → Send code → Verify code → Login{**}*  
 - **{*}Dashboard → Sign out{**}*  
 - **{*}Inactivity → Timeout warning → Auto sign-out{**}*  

—
 # 
 ## Accessibility

 - Must comply with **{*}WCAG 2.2 AA{**}* and **{*}GOV.UK Design System{**}* standards.  
 - Screen readers must announce:  
  - “How do you want to sign in?”  
  - Selected radio options and error messages.  
 - Error banners use `role="alert"`.  
 - Buttons and links must be reachable by keyboard and have visible focus states.  
 - Timeout warnings must be readable by assistive technology.  
 - Input fields must include proper `aria-labels` and language toggle support.

—
 # 
 ## Test Scenarios

|ID|Scenario|Steps|Expected Result|
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
|TS1|Sign~~in options visible|Visit `/sign~~in`|Page shows three radio options|
|TS2|No option selected|Click Continue without choosing|Error “Select how you want to sign in” displayed|
|TS3|Valid HMCTS credentials|Select HMCTS → Sign in|Redirect to dashboard|
|TS4|Invalid HMCTS credentials|Enter incorrect password|Error “Incorrect email or password”|
|TS5|Invalid CaTH credentials|Enter invalid password|Error “Invalid username or password”|
|TS6|Forgot password|Click “Forgot your password?”|Redirect to `/sign~~in/forgot~~password`|
|TS7|Valid verification code|Enter correct code|Message “Your account has been verified”|
|TS8|Invalid verification code|Enter incorrect code|Message “Verification failed”|
|TS9|Inactivity warning|Stay idle until timeout threshold|“You will soon be signed out…” displayed|
|TS10|Auto sign-out|Stay idle after warning|“You have been signed out…” displayed|
|TS11|Resume activity|Click Continue on warning|Session remains active|
|TS12|Sign out manually|Click “Sign out”|Redirect to `/sign-in`|
|TS13|Welsh translation|Toggle to Welsh|All content updates correctly|

—
 # 
 ## Assumptions / Open Questions

 - Confirm if all three routes (HMCTS, Common Platform, CaTH) authenticate through CFT IDAM.  
 - Confirm timeout threshold (e.g., 25 min warning, 30 min logout).  
 - Confirm if verification code is single~~use or time~~limited (e.g., 15 minutes).  
 - Confirm whether all sign-in error messages are logged for audit.  
 - Confirm if “Forgot password” applies to all account types or only CaTH accounts.

—', 'functional', 'verified', 'medium', 'story', 229, 'https://github.com/hmcts/cath-service/issues/229', '2026-01-20T17:01:44Z', '2026-04-15T10:34:17Z', 'linusnorton', 'linusnorton'),
  (8, 'REQ-0008', 'User table creation in database', '**PROBLEM STATEMENT**

The details of users who sign into CaTH needs to be stored in the database. This ticket is raised to create a user table to be used to store user details.

 

**AS A** Service

**I WANT** to create a user table in the database

**SO THAT** I can store the details of users who access CaTH

 

**ACCEPTANCE CRITERIA**
 * A User table is created at the back end in the database to capture and store the details of all users in CaTH including users who sign in through the SSO, B2C (Media), CFT IDAM and Crime IDAM routes

 

**Technical Acceptance Criteria:**
 # Update SSO integration
 ## When a user signs in and a user record does not exist based on the provenance ID, a record is created in the table below
 ## When a user signs in and the record does exist, a check is performed if the role matches. If it does, the user continues to sign in. If not, the role is updated in the table below
 # Update CFT Integration
 ## When a user signs in and a user record does not exist based on the provenance ID, a record is created in the table below
 ## The role is always ''VERIFIED''
 # last*signed*in_date is updated for all users when they sign in
 # created_date is set when the user is first created

 
|Column Name|Type|Required|Description|
|~~--~~~~--~~~~--~~~~-|~~~~--~~~~|-~~~~--~~~~--~~~~|-~~~~--~~~~--~~~~--~~|
|user_id|UUID|Yes|Unique primary key for user|
|email|VARCHAR(255)|Yes|User email address (unique constraint)|
|first*name|VARCHAR(255)|No|Only stored for CFT*IDAM and CRIME_IDAM|
|surname|VARCHAR(255)|No|Only stored for CFT*IDAM and CRIME*IDAM|
|user*provenance|VARCHAR(20)|Yes|SSO, CFT*IDAM, CRIME*IDAM, B2C*IDAM|
|user*provenance*id|UUID|Yes| |
|role|VARCHAR(20)|Yes|VERIFIED, LOCAL*ADMIN, CTSC*ADMIN, SYSTEM_ADMIN|
|created_date|TIMESTAMP|Yes|Date/Time (to seconds)|
|last*signed*in_date|TIMESTAMP|No|Date/Time (to seconds). Can be blank when user is first created and has not signed in yet|

 

 

# VIBE-143 — Create User Table for CaTH Database (Specification)

> Owner: VIBE-143  
> Updated: 15 Nov 2025  

---

## Problem Statement
The details of all users who sign into CaTH must be stored securely in the ***CaTH database***.  
This table will serve as the central data source for user authentication, authorization, and audit tracking across all sign-in routes — ***SSO****, ***B2C (Media)***, ***CFT IDAM***, and ***Crime IDAM**.

---

## User Story
***As a*** Service  
***I want to*** create a user table in the database  
***So that*** I can store the details of all users who access CaTH through any sign-in route

---

## Acceptance Criteria
1. A ***User table*** is created at the CaTH back end to capture and store details of all users across multiple authentication routes.  
2. Supported authentication providers include:
   - ***SSO*** (Single Sign-On)
   - ***B2C (Media)*** (Azure AD B2C for verified media users)
   - ***CFT IDAM*** (Civil, Family, Tribunals)
   - ***Crime IDAM***
3. The table records and updates user identity, provenance, and role information as users log in.  
4. Each user record is uniquely identifiable by `user_id` (UUID).  
5. When a user signs in:
   - If no record exists for their provenance ID, a ***new record is created***.  
   - If a record exists:
     - The ***role*** is verified — if changed, it is updated.  
     - The `last*signed*in_date` field is updated.
6. `created_date` is set when the record is created and never changes.  
7. Integration logic must be updated for both ***SSO*** and ***CFT*** login routes to handle user creation and updates.  
8. Data storage and updates must comply with ***HMCTS data security*** and ***GDPR standards***.  

---

## Technical Acceptance Criteria

### 1. ***SSO Integration***
- When a user signs in via SSO:
  - The system checks if a record exists by ***`user*provenance*id`***.
  - If ***no record exists***, create a new entry with:
    - `user_provenance = SSO`
    - `created_date = current timestamp`
    - `last*signed*in_date = current timestamp`
  - If a record ***does exist***:
    - Validate that the stored `role` matches the SSO role.
    - If different, update the record with the new role.
    - Update `last*signed*in_date` to the current timestamp.

### 2. ***CFT Integration***
- When a user signs in via CFT IDAM:
  - If no record exists by `user*provenance*id`, create a new record with:
    - `user*provenance = CFT*IDAM`
    - `role = VERIFIED`
    - `created_date = current timestamp`
  - When an existing user logs in, update:
    - `last*signed*in_date = current timestamp`
  - `first_name` and `surname` fields are populated for CFT users.

### 3. ***Crime IDAM Integration***
- Same logic as CFT integration applies.  
  - Populate `first_name`, `surname`, `role = VERIFIED`.

### 4. ***B2C (Media) Integration***
- For verified media users authenticated via Azure AD B2C:
  - If no existing record:
    - Create user record with `user*provenance = B2C*IDAM`.
  - Role assignment based on verification workflow (`VERIFIED` or `PENDING`).
  - `last*signed*in_date` updated each successful sign-in.

---

## Table Definition

| Column Name | Type | Required | Description |
|~~--~~~~--~~~~--~~~~-|~~~~--~~~~|-~~~~--~~~~--~~~~|-~~~~--~~~~--~~~~--~~|
| ***user_id*** | UUID | Yes | Unique primary key for each user record |
| ***email*** | VARCHAR(255) | Yes | User email address; must be unique |
| ***first*name*** | VARCHAR(255) | No | First name (only populated for CFT*IDAM and CRIME_IDAM) |
| ***surname*** | VARCHAR(255) | No | Surname (only populated for CFT*IDAM and CRIME*IDAM) |
| ***user*provenance*** | VARCHAR(20) | Yes | Authentication source: SSO, CFT*IDAM, CRIME*IDAM, B2C*IDAM |
| ***user*provenance*id*** | UUID | Yes | Unique ID from authentication provider |
| ***role*** | VARCHAR(20) | Yes | User role: VERIFIED, LOCAL*ADMIN, CTSC*ADMIN, SYSTEM_ADMIN |
| ***created_date*** | TIMESTAMP | Yes | Timestamp of record creation (to seconds) |
| ***last*signed*in_date*** | TIMESTAMP | No | Timestamp of last login; can be null until first sign-in |

### Constraints
- ***Primary Key:*** `user_id`
- ***Unique Constraint:*** `email` and `user*provenance*id`
- ***Default Values:***
  - `role = VERIFIED` for CFT/Crime users
  - `created*date = CURRENT*TIMESTAMP`
- ***Timestamps*** recorded in UTC.

---

## Business Logic Flow

### User Sign-in (General)
1. User authenticates via one of the supported identity providers (SSO, CFT IDAM, Crime IDAM, B2C).
2. System retrieves the user’s ***provenance ID*** from the provider.
3. System checks if a record exists in the ***User table***:
   - ***No record found:***
     - Create a new record with all available data.
     - Assign default role (based on provider type).
     - Set `created*date` and `last*signed*in*date`.
   - ***Record found:***
     - Validate and update `role` (if changed).
     - Update `last*signed*in_date`.
4. Record creation/update is logged in the audit trail.

---

## Audit Logging
Each operation on the User table must be logged in the ***Audit Log*** for traceability.

| Field | Description |
|~~--~~~~--~~|~~--~~~~--~~~~--~~-|
| ***audit_id*** | Unique ID for each audit entry |
| ***user_id*** | User associated with the change |
| ***operation*** | INSERT / UPDATE |
| ***timestamp_utc*** | UTC timestamp of operation |
| ***performed_by*** | System user or process name |
| ***changes*** | JSON object detailing field changes |

---

## Data Retention & Security
- Data stored in accordance with ***HMCTS data management policies***.
- All PII data encrypted at rest and transmitted over secure TLS 1.2+.
- User data retained for 7 years for audit purposes.
- Anonymization of inactive user data after 12 months of inactivity.

---

## API Endpoints (Internal)
| Method | Endpoint | Description |
|~~--~~~~--~~~~|-~~~~--~~~~--~~~~|-~~~~--~~~~--~~---|
| ***POST*** | `/api/users` | Create new user record |
| ***PATCH*** | `/api/users/\{user_id}` | Update existing record (role or timestamps) |
| ***GET*** | `/api/users/\{user_id}` | Retrieve specific user data |
| ***GET*** | `/api/users` | Retrieve paginated list of users |
| ***DELETE*** | `/api/users/\{user_id}` | Soft-delete user (if required by policy) |

---

## Validation Rules
- `email` must follow standard RFC 5322 format.
- `role` must be one of the following:  
  `VERIFIED`, `LOCAL*ADMIN`, `CTSC*ADMIN`, `SYSTEM_ADMIN`.
- `user_provenance` must be one of:  
  `SSO`, `CFT*IDAM`, `CRIME*IDAM`, `B2C_IDAM`.
- `created_date` must be immutable.
- `last*signed*in_date` must be updated on each login.
- Duplicate records (same provenance ID) must not be created.

---

## Example Records

### SSO User
| user*id | email | first*name | surname | user*provenance | user*provenance*id | role | created*date | last*signed*in_date |
|~~--~~~~--~~~~-|~~~~--~~~~--|~~~~--~~~~--~~~~--~~|~~--~~~~--~~~~|-~~~~--~~~~--~~~~--~~~~--~~|~~--~~~~--~~~~--~~~~--~~~~--~~|~~--~~~~-|~~~~--~~~~--~~~~--~~~~-|~~~~--~~~~--~~~~--~~~~--~~~~--~~|
| 1b12f... | jane.doe@gov.uk | NULL | NULL | SSO | 6b2e3... | LOCAL_ADMIN | 2025~~11~~15T10:30:00Z | 2025~~11~~15T11:00:00Z |

### CFT IDAM User
| user*id | email | first*name | surname | user*provenance | user*provenance*id | role | created*date | last*signed*in_date |
|~~--~~~~--~~~~-|~~~~--~~~~--|~~~~--~~~~--~~~~--~~|~~--~~~~--~~~~|-~~~~--~~~~--~~~~--~~~~--~~|~~--~~~~--~~~~--~~~~--~~~~--~~|~~--~~~~-|~~~~--~~~~--~~~~--~~~~-|~~~~--~~~~--~~~~--~~~~--~~~~--~~|
| 8c45a... | tom.smith@bbc.co.uk | Tom | Smith | CFT_IDAM | a1b2c... | VERIFIED | 2025~~11~~14T09:00:00Z | 2025~~11~~14T09:05:00Z |

---

## Test Scenarios
| ID | Scenario | Steps | Expected Result |
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
| TS1 | Create user (SSO) | Sign in via SSO for first time | Record created with correct fields populated |
| TS2 | Create user (CFT IDAM) | Sign in via CFT for first time | Record created; role set to VERIFIED |
| TS3 | Create user (Crime IDAM) | Sign in via Crime IDAM | Record created with first/last name |
| TS4 | Create user (B2C Media) | Media user signs in | Record created with provenance B2C_IDAM |
| TS5 | Update existing user | Existing user signs in again | last*signed*in_date updated |
| TS6 | Update role change | Role changed at provider side | Role updated in database |
| TS7 | No duplicate records | Same provenance ID signs in twice | Only one record exists |
| TS8 | Invalid email | Email missing or malformed | Validation fails; record not created |
| TS9 | Audit log | User signs in | Corresponding audit entry created |
| TS10 | Field persistence | created*date immutable | created*date unchanged on updates |

---

## Risks & Clarifications
- Confirm which service owns role synchronisation logic (SSO or CaTH API).  
- Confirm retention and anonymization timelines are aligned with GDPR.  
- Confirm whether users can exist under multiple provenance sources (e.g., dual accounts).  
- Confirm if local admin roles are created manually or dynamically via provider data.  
- Confirm database: PostgreSQL or equivalent relational DB.', 'functional', 'verified', 'high', 'story', 230, 'https://github.com/hmcts/cath-service/issues/230', '2026-01-20T17:01:58Z', '2026-01-30T15:03:03Z', 'linusnorton', 'linusnorton'),
  (9, 'REQ-0009', 'Forgotten password', '**PROBLEM STATEMENT**

Verified users are required to sign into CaTH before accessing restricted information. Sometimes users forget the password required to access their verified account.

 

**AS A** Verified User

**I WANT** to sign into CaTH

**SO THAT** I can have access to my account and to restricted hearing information published in CaTH

 

**ACCEPTANCE CRITERIA**
 * Where a User attempts to sign into their verified account and has forgotten their log in password, then the user can click the forgotten password link
 * When the user clicks the forgotten password link, then the user is re-directed to a page where the user inputs their email address in the data field provided
 * When the user inputs their email address and clicks the send code button, then the user receives a verification code sent to the inputted email address
 * Where the user inputs the correct verification code within 10minutes, then the user can continue the password recovery process and is informed upon completing the process that the password was changed successfully
 * Where the user does not input the code withing 10 minutes, then the user is informed that the verification code has expired and is prompted to request a new code by clicking the send new code’ link
 * The expired code can no longer be used in resetting the account password
 * Where the user no longer wants to continue with the password recovery process and clicks the cancel button, then the process is terminated, and the user is informed that the password is unchanged and can still sign-in using the button below and your existing credentials.', 'functional', 'verified', 'medium', 'story', 231, 'https://github.com/hmcts/cath-service/issues/231', '2026-01-20T17:02:16Z', '2026-01-30T15:03:05Z', 'linusnorton', 'linusnorton'),
  (10, 'REQ-0010', 'Landing Page - Header & Footer', '**PROBLEM STATEMENT**

All CaTH users, including members of the public, have access to hearing lists published in CaTH. This would require users to undergo a few steps to navigate through the different pages in CaTH.

 

**AS A** CaTH User

**I WANT** to view published court and tribunal hearing lists

**SO THAT** I can get information about upcoming hearings

 

**ACCEPTANCE CRITERIA**
 * All CaTH users have access to unrestricted published hearing information in CaTH
 * All users begin the journey to accessing this information from the landing page
 * All CaTH pages specifications are maintained
 * Users can see a summary of the information provided by the service with bullet points highlighting hearings from most civil and family courts in the South East and South West regions, hearings in First Tier and Upper Tribunals (excluding Employment Tribunals), hearings in the Royal Courts of Justice and the Rolls Building and single justice procedure cases, including TV licensing and minor traffic offences such as speeding
 * Users are also informed that More courts and tribunals will become available over time.
 * Legal and media professionals can see a sign in link just after the highlighted service information
 * Users are informed that the service is also available in Welsh language and provided a link to switch to Welsh
 * Users can see a ‘continue’ button to continues the process to viewing the hearing lists', 'functional', 'verified', 'high', 'story', 232, 'https://github.com/hmcts/cath-service/issues/232', '2026-01-20T17:02:27Z', '2026-01-30T15:03:07Z', 'linusnorton', 'linusnorton'),
  (11, 'REQ-0011', 'Public user – Restricted access', '**PROBLEM STATEMENT**

All CaTH users, including members of the public, have access to hearing lists published in CaTH. Public users are however restricted from accessing private/classified information and would need to be authorised and verified before access is granted to restricted information in CaTH. As such, public users are not required to sign in to access general information in CaTH.

 

**AS A** CaTH User

**I WANT** to view restricted published court and tribunal hearing lists

**SO THAT** I can get information about upcoming hearings

 

**ACCEPTANCE CRITERIA**
 * All CaTH users have access to unrestricted published hearing information in CaTH

 * Public users can see the links to Gov.UK and Court and tribunal hearings at the top left of the page
 * Public users are informed that this is a new service in the sentence ‘This is a new service – your feedback will help us to improve it.’
 * Link to a feedback form is provided in the text ‘feedback’
 * Public users can see the link to sign in to verified accounts in CaTH at the top right of the page
 * When a public user clicks on the sign in link, the public user is directed to the ‘How do you want to sign in?’ page and is provided with various sign in account routes differentiated by individual radio buttons (HMCTS, Common Platform or CaTH account)
 * The public user can make an account selection by clicking a radio button beside the specific account and clicking the continue button
 * The public user is informed that a CaTH account, needed to sign in through the CaTH account route, can be created and is provided a link to create a CaTH account

 * Where the public user inputs an incorrect log in information into the HMCTS account data log in fields and clicks the ‘sign in’ button to complete the sign in process, then the user is notified of the incorrect email or password
 * Where the public user inputs an incorrect log in information into the CaTH or Common platform account data log in fields and clicks the ‘sign in’ button to complete the sign in process, then the user is notified of the invalid username or password
 * Where a verification code is required during the sign in process, then the user is sent a verification code
 * Where the required verification code has been sent to the user and the user inputs the correct verification code, then the user will be informed that the account has been verified and is given access to the verified account
 * Where a User attempts to sign into their verified account and has forgotten their log in password, then the user can click the forgotten password link
 * Where the public user clicks the forgotten password link, then the user is re-directed to a page where the user is expected to input their email address in the data field provided to receive a verification code.
 * When the public user inputs their email address and clicks the send code button, since the public user does not have a verified account, then the public user does not receive a verification code in the inputted email address
 * Where the public user inputs an incorrect verification code then the user will be notified of the rejected log in and that the sign in failed
 * Where the public user no longer wants to continue with the password recovery process and clicks the cancel button, then the process is terminated', 'functional', 'verified', 'high', 'story', 233, 'https://github.com/hmcts/cath-service/issues/233', '2026-01-20T17:02:44Z', '2026-01-30T15:03:10Z', 'linusnorton', 'linusnorton'),
  (12, 'REQ-0012', 'Requirements for content displayed on all pages in CaTH', '**PROBLEM STATEMENT**

All CaTH pages are expected to have specific content displayed at the top and bottom of each page.

 

**AS A** System

**I WANT** to display specific content on each page in CaTH

**SO THAT** all pages in CaTH display the required general user information

 

**ACCEPTANCE CRITERIA**
 * Each page should have the links to Gov.UK at the top banner in the approved blue colour
 * A link to ‘Court and tribunal hearings’ is provided just below, at the top left of the page, in a different banner, in the approved lighter shade of blue colour
 * A link to sign in to verified accounts in CaTH at the top right of the page, on the same level as the ‘Court and tribunal hearings’ link
 * A beta notification is displayed under the above acceptance criteria, informing users that this is a new service in the sentence ‘This is a new service – your feedback will help us to improve it.’
 * Link to a feedback from is provided in the text ‘feedback’
 * A link to switch to the Welsh translated page at the top right of the landing page, underneath the sign in link and on the same level as the beta notification
 * A separate section at the bottom, demarcated by a dark blue narrow banner similar to the above criteria for the ‘Gov.UK’, displays the Crown logo followed by various appropriate links provided beneath the Crown, at the bottom of the page and embedded in the following texts; Help, privacy, cookies, accessibility statement, contact, terms and conditions, Welsh, government digital service and open government licence)
 * This section is displayed in a light blue colour similar to the above criteria for the ‘sign in’ and ‘court and tribunal hearings’.

 * A link to the Crown copy right is embedded in the royal coat of arms logo at the bottom right of the page, with the crown copyright text written beneath it.', 'functional', 'verified', 'high', 'story', 234, 'https://github.com/hmcts/cath-service/issues/234', '2026-01-20T17:02:54Z', '2026-01-30T15:03:13Z', 'linusnorton', 'linusnorton'),
  (13, 'REQ-0013', '‘What do you want to do?’ Page', '**PROBLEM STATEMENT**

All CaTH users, including members of the public, have access to hearing lists published in CaTH. This would require users to undergo a few steps to navigate through the different pages in CaTH including selection what they want to view.

 

**AS A** CaTH User

**I WANT** to select a court/tribunal

**SO THAT** I can view specific hearing lists

 

**ACCEPTANCE CRITERIA**
 * All CaTH users have access to unrestricted published hearing information in CaTH
 * All users access the ‘What do you want to do?’ Page by clicking the ‘continue’ button on the landing page
 * All users can see 2 radio buttons to select either to ‘find a court or tribunal’ or ‘find a single justice procedure case’
 * Under the ‘find a court or tribunal’, the descriptive text in the bracket is provided (View time, location, type of hearings and more)
 * Under the ‘find a single justice procedure case’ option, the descriptive text in the bracket is provided (TV licensing, minor traffic offences such as speeding and more)
 * Users can continue the process by clicking the ‘continue’ button
 * All CaTH pages specifications are maintained', 'functional', 'verified', 'high', 'story', 235, 'https://github.com/hmcts/cath-service/issues/235', '2026-01-20T17:03:12Z', '2026-01-30T15:03:15Z', 'linusnorton', 'linusnorton'),
  (14, 'REQ-0014', 'Find a single justice procedure case', '**PROBLEM STATEMENT**

All CaTH users, including members of the public, have access to hearing lists published in CaTH including single justice procedure (SJP) cases.

 

**AS A** CaTH User

**I WANT** to access a SJP hearing list

**SO THAT** I can view specific SJP hearing information

**Technical Specification:**
 * Schema for Single Justice Procedure – Public List: <http://github.com/hmcts/pip~~data~~management/blob/master/src/main/resources/schemas/single*justice*procedure_public.json>
 * Schema for Single Justice Procedure – Press List: <https://github.com/hmcts/pip~~data~~management/blob/master/src/main/resources/schemas/single*justice*procedure_press.json>

 

**ACCEPTANCE CRITERIA**
 * There are 2 types of SJP lists; the public list and the press list
 * The system should be able to handle up to 30,000 SJP case load 
 * validation schema: <SJP Press List - Court and Tribunal Hearings (CATH) - HMCTS Confluence>(https://tools.hmcts.net/confluence/spaces/PUBH/pages/1558261966/SJP+Press+List)  <SJP Public List - Court and Tribunal Hearings (CATH) - HMCTS Confluence>(https://tools.hmcts.net/confluence/spaces/PUBH/pages/1558261961/SJP+Public+List) 
 * style guide: attached document 

**Single Justice Procedure – Public List**
 * All CaTH users have access to unrestricted published hearing information in CaTH
 * On the ‘What do you want to view from single justice procedure?’ page, users can see links to published SJP lists
 * Users can click on any of the SJP list links to view the hearing details of all SJP cases that are published within each SJP list
 * Each list displays the list title followed by the following text that states the number of cases in the list and the date and time the list was generated; ''List containing 10220 case(s) generated on 28 November 2025 at 9am''. underneath this is a green button with the text ''Download a copy'' that allows the user download the list 
 * The SJP cases are published in a table with the following data fields; Name, Postcode, Offence and Prosecutor
 * Users can click on the pages numbers to view the SJP cases published across different pages
 * Users can click on the ‘show filters’ button to access the SJP filter
 * Users can search for specific case details using the search bar
 * Users can use the filter options to search for specific cases using the postcode or prosecutor
 * Users can close each filter option by clicking on the collapsible accordion
 * Users can clear the selected filter options by clicking the ‘clear filter’ link provided at the top of the filter
 * Users can go back to the top of the page by clicking the ‘back to top’ arrow/text provided at the bottom of the page
 * All CaTH pages specifications are maintained

 

**Single Justice Procedure – Press List**
 * Only verified CaTH users have access to the SJP Press List
 * under the list title is an accordion titled ''What are Single Justice Procedure Cases?'' which is open by default with the following text displayed ''Cases ready to be decided by a magistrate without a hearing. Includes TV licensing and minor traffic offences such as speeding.''
 * This is followed by the publication date and the date the list was published, displayed in the following format; List for 28 November 2025

Published 28 November 2025 at 9:05am
 * A second accordion titled ''Important Information'' follows with the following text displayed ''In accordance with the media protocol, additional documents from these cases are available to the members of the media on request. The link below takes you to the full protocol and further information in relation to what documentation can be obtained <Protocol on sharing court lists, registers and documents with the media>(https://www.gov.uk/government/publications/guidance~~to~~staff~~on~~supporting~~media~~access~~to~~courts~~and~~tribunals/protocol~~on~~sharing~~court~~lists~~registers~~and~~documents~~with~~the~~media~~accessible~~version) '' (the linked masked in this text is <Protocol on sharing court lists, registers and documents with the media (accessible version) - GOV.UK>(https://www.gov.uk/government/publications/guidance~~to~~staff~~on~~supporting~~media~~access~~to~~courts~~and~~tribunals/protocol~~on~~sharing~~court~~lists~~registers~~and~~documents~~with~~the~~media~~accessible~~version))
 * underneath this is a green button with the text ''Download a copy'' that allows the user download the list 
 * Users can click on the ‘show filters’ button to access the SJP filter
 * Users can click on the ‘show filters’ button to access the SJP filter
 * Users can search for specific case details using the search bar
 * Users can use the filter options to search for specific cases using the postcode or prosecutor
 * Users can close each filter option by clicking on the collapsible accordion
 * Users can clear the selected filter options by clicking the ‘clear filter’ link provided at the top of the filter
 * Users can click on the pages numbers to view the SJP cases published across different pages
 * The cases are displayed in sections that contain a table with the following titles in rows under column 1; Name, Date of Birth, Reference, Address, Prosecutor. This is followed by the ''Reporting Restriction'' which can be either true or false
 * Users can go back to the top of the page by clicking the ‘back to top’ arrow/text provided at the bottom of the page
 * All CaTH pages specifications are maintained

 

 

**VIBE-151 specification**

This specification includes {**}three pages{**}:
 # *What do you want to view from Single Justice Procedure?*

 # *SJP Public List page*

 # *SJP Press List page*

 

VIBE-151 – Single Justice Procedure (SJP) Hearing Lists
# **User Story**

**As a** CaTH User
**I want to** access a Single Justice Procedure (SJP) hearing list
**So that** I can view specific SJP hearing information

 
# **PAGE 1 — What do you want to view from Single Justice Procedure?**
## **Form fields**
|Field|Input type|Required|Validation|
|None|N/A|N/A|Page is navigational only|

 
## **Content**
### **EN:**
 * Title/H1: “What do you want to view from Single Justice Procedure?”

 * SJP list links — “SJP Public List – <date>”, “SJP Press List – <date>”

 * Button/link: “Back”

### **CY:**
 * Title/H1: “Welsh placeholder”

 * SJP list links — “Welsh placeholder”

 * Back — “Welsh placeholder”

 
## **Errors**

No errors on this page.

 
## **Back navigation**
 * Back returns user to previous page (likely main hearings selection page).

 

 

 

 

**PAGE 2 — SJP PUBLIC LIST PAGE**

 
## **Form fields**
|Field name|Input type|Required|Validation|
|Search SJP cases|Text|No|Max 200 chars|
|Postcode filter|Text|No|Must match UK postcode regex format|
|Prosecutor filter|Dropdown|No|Options supplied by SJP list metadata|
|Filter accordions|Toggle|No|GOV.UK accordion pattern|
|Clear filters|Link|No|Resets all applied filters|
|Pagination|Number link|No|Must be a valid page index|

 
## **Content**
### **EN:**
 * Title/H1: “Single Justice Procedure – Public List”

 * Text under title:

 * 
 *** “List containing *<X>** case(s) generated on **<Date>** at {**}<Time>{**}.”

 * Green button: “Download a copy”

 * Case table headers:

 * 
 ** Name

 * 
 ** Postcode

 * 
 ** Offence

 * 
 ** Prosecutor

 * Search bar: “Search SJP cases”

 * Show filters button: “Show filters”

 * Filter accordion titles:

 * 
 ** “Postcode”

 * 
 ** “Prosecutor”

 * Filter links:

 * 
 ** “Clear filter”

 * Pagination controls: “Previous”, page numbers, “Next”

 * Bottom of page:

 * 
 ** “Back to Top” (+ arrow icon)

### **CY:**
 * Title/H1: “Welsh placeholder”

 * Descriptive text: “Welsh placeholder”

 * Button: “Welsh placeholder”

 * Table headers: Welsh placeholders

 * Search bar: Welsh placeholder

 * Show filters: Welsh placeholder

 * Filter titles: Welsh placeholders

 * Clear filter: Welsh placeholder

 * Pagination: Welsh placeholders

 * Back to Top: “Yn ôl i frig y dudalen”

 
## **Errors**
### **EN:**
 * Invalid postcode: “Enter a valid postcode”

### **CY:**
 * “Welsh placeholder”

 
## **Back navigation**
 * Back returns to “What do you want to view from single justice procedure?”

 * Back to Top scrolls to page header.

 

 

**PAGE 3 — SJP PRESS LIST PAGE**

 
## **Form fields**
|Field name|Input type|Required|Validation|
|Search SJP cases|Text|No|Max 200 chars|
|Postcode filter|Text|No|UK postcode format|
|Prosecutor filter|Dropdown|No|Populated from list data|
|Filter accordions|Toggle|No|Must expand/collapse|
|Clear filter|Link|No|Clears all filters|
|Pagination|Number link|No|Must be valid page index|

 
## **Content**
### **EN:**
 * Title/H1: “Single Justice Procedure – Press List”

 * Accordion (open by default): “What are Single Justice Procedure Cases?”

 * 
 ** Text:
“Cases ready to be decided by a magistrate without a hearing. Includes TV licensing and minor traffic offences such as speeding.”

 * Publication text block:

 * 
 *** “List for {**}28 November 2025{*}”

 * 
 *** “Published {**}28 November 2025 at 9:05am{*}”

 * Accordion: “Important Information”

 * 
 ** Text:
“In accordance with the media protocol, additional documents from these cases are available to the members of the media on request.
The link below takes you to the full protocol and further information in relation to what documentation can be obtained.”

 * 
 ** Masked link text:
**“Protocol on sharing court lists, registers and documents with the media”**
(links to GOV.UK)

 * Green button: “Download a copy”

 * Search bar: “Search SJP cases”

 * Filter button: “Show filters”

 * Filter accordions:

 * 
 ** “Postcode”

 * 
 ** “Prosecutor”

 * Clear filter link

 * Pagination: “Previous”, page numbers, “Next”

 * Table-like **sectioned case layout** (not simple rows) with the following row titles under column 1:

 * 
 ** Name

 * 
 ** Date of Birth

 * 
 ** Reference

 * 
 ** Address

 * 
 ** Prosecutor

 * 
 ** Reporting Restriction (true/false)

 * Back to Top link and arrow at bottom

### **CY:**

All text above uses {**}Welsh placeholders{**}, e.g.:
 * Title/H1: “Welsh placeholder”

 * Accordion titles: Welsh placeholders

 * Buttons, links, table row titles: Welsh placeholders

 
## **Errors**
### **EN:**
 * Invalid postcode: “Enter a valid postcode”

### **CY:**
 * “Welsh placeholder”

## **Back navigation**
 * Back returns to “What do you want to view from single justice procedure?”

 * Back to Top scrolls up to the page header.

 
# **Accessibility (Applies to All Pages)**
 * Must comply with **WCAG 2.2 AA** and {**}GOV.UK Design System guidance{**}.

 * Accordion behaviour must include:

 * 
 ** `aria~~expanded` and `aria~~controls`

 * 
 ** Keyboard toggling with Space/Enter

 * Tab order must follow a logical reading sequence.

 * Pagination must expose:

 * 
 ** Current page to screen readers

 * 
 ** Clear link labels (“Page 2”, “Next page”, etc.)

 * Filter controls must:

 * 
 ** Be reachable by keyboard

 * 
 ** Announce opening/closing of accordions

 * Search input must have a visible label, not placeholder-only

 * Back to Top must be operable via keyboard and announce scrolling change

 * Download button must include accessible name (“Download SJP list”)

 
# **Test Scenarios**
|ID|Scenario|Steps|Expected Result|
|TS1|Access SJP selection page|Navigate to SJP landing|List links visible|
|TS2|Open Public List|Click SJP Public List|Public list page loads|
|TS3|Open Press List (verified only)|Sign in as verified → click Press List|Press list page loads|
|TS4|Public list header|Open list|Case count + generation timestamp displayed|
|TS5|Press list header|Open list|Publication date + time displayed|
|TS6|Download list|Click “Download a copy”|File downloads|
|TS7|Pagination|Click page numbers|Moves through case pages|
|TS8|Search|Enter query → apply|Results filtered|
|TS9|Postcode filter|Enter valid postcode|Correct results displayed|
|TS10|Invalid postcode|Enter invalid format|Validation message shown|
|TS11|Prosecutor filter|Select prosecutor|Table updates|
|TS12|Clear filters|Apply filters → click Clear|Filters reset|
|TS13|Accordion toggle|Click accordions|Sections open/close|
|TS14|Reporting restriction|View press list|True/false value displayed|
|TS15|Back to Top|Scroll down → click|Scroll returns to page header|
|TS16|Accessibility: keyboard|Use Tab/Enter/Space|All links/filters/buttons accessible|
|TS17|Language toggle|Switch to Welsh|Page displays Welsh placeholders|', 'functional', 'verified', 'high', 'story', 236, 'https://github.com/hmcts/cath-service/issues/236', '2026-01-20T17:03:32Z', '2026-05-26T09:57:53Z', 'linusnorton', 'linusnorton'),
  (15, 'REQ-0015', 'View SJP cases that are ready for hearing', '**PROBLEM STATEMENT**

All CaTH users, including members of the public, have access to hearing lists published in CaTH including single justice procedure (SJP) cases.

 

**AS A** CaTH User

**I WANT** to view SJP cases that are ready for hearing

**SO THAT** I can access information about these cases

 

**ACCEPTANCE CRITERIA**
 * All CaTH users have access to unrestricted published hearing information in CaTH
 * Users can view hearing details of all SJP cases that are published within each SJP list
 * Users can click on the pages numbers to view the SJP cases published across different pages
 * Users can click on the ‘show filters’ button to access the SJP filter
 * Users can search for specific case details using the search bar
 * Users can use the filter options to search for specific cases using the postcode or prosecutor
 * Users can close each filter option by clicking on the collapsible accordion
 * Users can clear the selected filter options by clicking the ‘clear filter’ link provided at the top of the filter
 * Users can go back to the top of the page by clicking the ‘back to top’ arrow/text provided at the bottom of the page
 * All CaTH pages specifications are maintained', 'functional', 'verified', 'high', 'story', 237, 'https://github.com/hmcts/cath-service/issues/237', '2026-01-20T17:03:46Z', '2026-01-30T15:03:18Z', 'linusnorton', 'linusnorton'),
  (16, 'REQ-0016', 'Select a court or tribunal', '**PROBLEM STATEMENT**

All CaTH users, including members of the public, have access to unrestricted court and tribunal hearing lists. This would require users going through several steps to achieve this.

 

**AS A** CaTH User

**I WANT** to select a court or tribunal

**SO THAT** I can view hearing information from specific venues

 

**ACCEPTANCE CRITERIA**
 * All CaTH users have access to unrestricted published hearing information in CaTH
 * On the ‘What court or tribunal are you interested in?’ users can see a search bar
 * Users are able to type in the name of a preferred court or tribunal
 * When a user types in the search bar, the system will display likely options that correspond with the user’s input
 * The user can make a selection from the displayed options by clicking on it
 * The user can continue the process by clicking the ‘continue’ button
 * The user can choose to click the ‘select from an A-Z list of courts and tribunals’ link to view all available venues
 * All CaTH pages specifications are maintained', 'functional', 'verified', 'high', 'story', 238, 'https://github.com/hmcts/cath-service/issues/238', '2026-01-20T17:03:56Z', '2026-01-30T15:03:20Z', 'linusnorton', 'linusnorton'),
  (17, 'REQ-0017', 'Find a court or tribunal', '**PROBLEM STATEMENT**

All CaTH users, including members of the public, have access to unrestricted court and tribunal hearing lists. This would require users going through several steps to achieve this.

 

**AS A** CaTH User

**I WANT** to find a court or tribunal on the A-Z page

**SO THAT** I can view hearing information from specific venues

 

**ACCEPTANCE CRITERIA**
 * All CaTH users have access to unrestricted published hearing information in CaTH
 * On the ‘Find a court or tribunal’ users can see a list of all the venues available in CaTH
 * Users can access the filter on the left side of the page to use the filter options to search for specific cases using the jurisdiction or region
 * When the use clicks on the jurisdiction filter option, a sub-filter with the ‘type of civil court’ is displayed for the user to filter further
 * Users can close each filter option by clicking on the collapsible accordion
 * User can click the ‘apply filter’ button to apply selected filter options
 * User can click on a venue link to view the hearing lists published at that venue
 * User can click on the alphabets at the top of the page to view only venues beginning with that alphabet
 * Users can clear the selected filter options by clicking the ‘clear filter’ link provided at the top of the filter
 * Users can go back to the top of the page by clicking the ‘back to top’ arrow/text provided at the bottom of the page
 * All CaTH pages specifications are maintained', 'functional', 'verified', 'high', 'story', 239, 'https://github.com/hmcts/cath-service/issues/239', '2026-01-20T17:04:19Z', '2026-01-30T15:03:23Z', 'linusnorton', 'linusnorton'),
  (18, 'REQ-0018', '‘What do you want to view?’ Page', '**PROBLEM STATEMENT**

All CaTH users, including members of the public, have access to unrestricted court and tribunal hearing lists. This would require users going through several steps to achieve this.

 

**AS A** CaTH User

**I WANT** to view cases that are published against a specific venue

**SO THAT** I can access information about these cases

 

**ACCEPTANCE CRITERIA**
 * All CaTH users have access to unrestricted published hearing information in CaTH
 * On the ‘What do you want to view?’ Page for each venue, the user is able t see all the hearing lists published at this venue
 * User can click o the hearing list link to view the cases published in the list
 * All CaTH pages specifications are maintained', 'functional', 'verified', 'high', 'story', 240, 'https://github.com/hmcts/cath-service/issues/240', '2026-01-20T17:04:34Z', '2026-01-30T15:03:25Z', 'linusnorton', 'linusnorton'),
  (19, 'REQ-0019', 'Manual publishing – Your Dashboard', '**PROBLEM STATEMENT**

Local admins (court clerks) can publish hearing lists manually in CaTH by uploading a flat file. This process involves several steps.

 

**AS A** Local Admin

**I WANT** to upload a flat file in CaTH

**SO THAT** I can publish a hearing list in CaTH

 

**ACCEPTANCE CRITERIA**
 * A local admin is able to access a verified account by signing in through the sign in page with their approved log in details
 * The local admin can see a dashboard that displays the upload, upload excel file and remove tabs
 * All CaTH pages specifications are maintained', 'functional', 'verified', 'medium', 'story', 241, 'https://github.com/hmcts/cath-service/issues/241', '2026-01-20T17:04:48Z', '2026-01-30T15:03:27Z', 'linusnorton', 'linusnorton'),
  (20, 'REQ-0020', 'Manual publishing – Manual upload form', '**PROBLEM STATEMENT**

Local admins (court clerks) can publish hearing lists manually in CaTH by uploading a flat file. This process involves several steps.

 

**AS A** Local Admin

**I WANT** to upload a flat file in CaTH

**SO THAT** I can publish a hearing list in CaTH

 

**ACCEPTANCE CRITERIA**
 * A local admin is able to access a verified account by signing in through the sign in page with their approved log in details
 * When the local admin clicks the upload tab on the dashboard, the user is taken to a manual upload form
 * The top of the form displays a ‘warning’ with a warning caution sign and the boldly written message ‘{**}Prior to upload you must ensure the file is suitable for publication e.g. redaction of personal data has been done during the production of this file.’{**}
 * The manual upload form displays various data fields on the left side of the page
 * Firstly is the file upload tab labelled ‘chose file’ where the local admin can upload the flat file
 * The following descriptive sentence is provided above the file upload tab; ‘Manually upload a csv, doc, docx, htm, html, json, or pdf file, max size 2MB
 * Below the file upload tab is a search tab labelled ‘Court name or Tribunal name’ that displays likely venue names as the local admin searches a venue name to publish against
 * The list type’ field which follows below displays the descriptive sentence within ‘Please choose a list type’ and contains a list of all list types available in CaTH for manual uploads in a drop down
 * Next Is the ‘Hearing start date’ that displays the descriptive text above it ‘For example, 16 01 2022’ and contains 3 free typing text boxes labelled ‘Day’, ‘Month’ and ‘Year’.
 * The sensitivity fields follows next with 3 options (public, Private – all verified users and classified) in a dropdown which the local admin can choose from
 * Next field is the language field which provides 3 language options in a drop down (English, welsh and bilingual English/welsh)
 * Next field is the ‘Display file from’ which has the descriptive text ‘For example, 27 01 2022’ and contains 3 free typing text boxes labelled ‘Day’, ‘Month’ and ‘Year’.
 * Then ‘the Display file to’ which has the descriptive text ‘For example, 18 02 2022’ and contains 3 free typing text boxes labelled ‘Day’, ‘Month’ and ‘Year’.
 * Lastly is the ‘continue’ button which the local admin can click to continue the manual upload process and a ‘back to top’ message and arrow.
 * On the right side of the form, various terms on the form are explained in sequential order under the heading ‘Page Help’ below;
 * **Lists**
 * You must ensure that you only upload one file that contains all hearings for the Court or Tribunal name and List type. This should include all judges and court rooms in one document.
 * Sensitivity
 * You need to indicate which user group your document should be available to:
 * **Public**
 * Publication available to all users.
 * **Private**
 * Publication available to all verified users e.g. Legal professionals and media.
 * **Classified**
 * Publication only available to verified users who are in a group eligible to view that list e.g. SJP press list available to Media
 * **Display from**
 * This will be the date the publication is available from, if today''s date is used it will be displayed immediately. If a date in the future is used, it will display from 00:01 of that date.
 * **Display to**
 * This will be the last date the publication is available. It will be displayed until 23:59 of that date.
 * All CaTH pages specifications are maintained', 'functional', 'verified', 'medium', 'story', 242, 'https://github.com/hmcts/cath-service/issues/242', '2026-01-20T17:05:02Z', '2026-01-30T15:03:30Z', 'linusnorton', 'linusnorton'),
  (21, 'REQ-0021', 'Manual publishing – Confirm upload details', '**PROBLEM STATEMENT**

Local admins (court clerks) can publish hearing lists manually in CaTH by uploading a flat file. This process involves several steps.

 

**AS A** Local Admin

**I WANT** to check the details of the manually uploaded flat file

**SO THAT** I can confirm before publishing the hearing list in CaTH

 

**ACCEPTANCE CRITERIA**
 * A local admin is able to access a verified account by signing in through the sign in page with their approved log in details
 * When the local admin clicks the continue button on the manual upload form, the user sees a summary page that displays the high level details of the uploaded file (Court name, File, List type, hearing start date, sensitivity, language and display file dates) in a table
 * Each detail row shows the selected data and a link titled ‘change’ beside it that allows the user update the selected detail
 * The local admin can click the continue button below to complete the manual upload process
 * All CaTH pages specifications are maintained

 
 # VIBE-159 Manual Upload File Summary Specification

> Owner: **{*}VIBE-159{**}* · Updated: **{*}22 Oct 2025{**}*

—
 # 
 ## Problem Statement

Local admins (court clerks) can publish hearing lists manually in CaTH by uploading a flat file. This process involves several steps.  
After uploading a file, the local admin needs to check the details before publishing to ensure accuracy.

—
 # 
 ## User Story

**{*}As a{**}* **Local Admin**  
**{*}I want to{**}* **check the details of the manually uploaded flat file**  
**{*}So that{**}* **I can confirm before publishing the hearing list in CaTH**

—
 # 
 ## Acceptance Criteria

1. A local admin is able to access a verified account by signing in through the sign-in page with approved login details.  
2. When the local admin clicks the **{*}Continue{**}* button on the manual upload form, the system displays a **{*}summary page{**}* that shows the high-level details of the uploaded file.  
3. The summary page displays details in a table format with the following fields:  
   - Court name  
   - File  
   - List type  
   - Hearing start date  
   - Sensitivity  
   - Language  
   - Display file dates  
4. Each detail row includes a **{*}‘Change’{**}* link beside it, allowing the user to update the selected data before final submission.  
5. The local admin can click the **{*}Continue{**}* button at the bottom of the page to complete the manual upload process.  
6. All CaTH pages must follow the existing design, layout, and accessibility standards.

—
 # 
 ## User Journey Flow

1. The local admin signs into CaTH using approved credentials.  
2. The user navigates to the **{*}Manual Upload{**}* page and uploads a flat file.  
3. After filling in details and clicking **{*}Continue{**}{**}, the system redirects the user to a ***File Summary{*}* page.  
4. The summary page displays uploaded file details in a table.  
5. The user can review, update (via Change links), and confirm details.  
6. Clicking **{*}Continue{**}* completes the upload confirmation process.

—
 # 
 ## Wireframe

┌───────────────────────────────────────────────────────────────────────┐
│ GOV.UK Court and tribunal hearings │
├───────────────────────────────────────────────────────────────────────┤
│ HMCTS – Courts and Tribunals Hearings (CaTH) │
├───────────────────────────────────────────────────────────────────────┤
│ < Back │
│ │
│ Check upload details │
│ │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Court name: │ Southwark Crown Court │Change│
│ │ File: │ hearings*list*22092025.csv │Change│
│ │ List type: │ Crown Hearing List │Change│
│ │ Hearing start date: │ 22/09/2025 │Change│
│ │ Sensitivity: │ Restricted │Change│
│ │ Language: │ English │Change│
│ │ Display file dates: │ 22/09/2025 – 25/09/2025 │Change│
│ └─────────────────────────────────────────────────────────────────┘ │
│ │
│ <Continue> │
│ │
└───────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## Form Fields (Displayed Summary Data)

|Field|Description|Editable|Validation|
|~~--~~~~--~~|~~--~~~~--~~~~--~~~~|-~~~~--~~~~--~~~~|-~~~~--~~~~--~~---|
|Court name|Name of the court that owns the hearing list|Yes (via “Change” link)|Must match registered court list|
|File|Filename uploaded|Yes (via “Change” link)|Must be valid file format (CSV or TXT)|
|List type|The category of the uploaded hearing list|Yes|Must match predefined list types|
|Hearing start date|Date hearings commence|Yes|Must be valid date in DD/MM/YYYY format|
|Sensitivity|Hearing list classification (Public/Restricted)|Yes|Must match available sensitivity levels|
|Language|Selected language for publication|Yes|Must be English or Welsh|
|Display file dates|Publication display range|Yes|Start date cannot be later than end date|

—
 # 
 ## Content

**{*}EN:{**}* Title/H1 — “Check upload details”  
**{*}CY:{**}* Title/H1 — “Gwirio manylion uwchlwytho”

**{*}EN:{**}* Table labels — “Court name”, “File”, “List type”, “Hearing start date”, “Sensitivity”, “Language”, “Display file dates”  
**{*}CY:{**}* Table labels — “Yn ôl enw’r llys”, “ffeil”, “Math o restr”, “ Dyddiad Cychwyn y gwrandawiad”, “Welsh placeholder”, “Iaith”, “Welsh placeholder”

**{*}EN:{**}* Action link — “Change”  
**{*}CY:{**}* Action link — “Welsh placeholder”

**{*}EN:{**}* Button — “Continue”  
**{*}CY:{**}* Button — “Parhau”

**{*}EN:{**}* Back link — “Back”  
**{*}CY:{**}* Back link — “Yn ôl”

—
 # 
 ## URL

`/manual-upload/summary`

—
 # 
 ## Validation Rules

 - All details displayed must match the data entered on the previous upload form.  
 - Each “Change” link must route the user to the corresponding field’s edit page.  
 - If any mandatory information is missing or corrupted, display an error message and prevent continuation.  

—
 # 
 ## Error Messages

**{*}EN:{**}*  
 - “Some details are missing. Please review the uploaded file.”  
 - “The file format is not supported. Please upload a valid CSV or TXT file.”  
 - “You must confirm all details before continuing.”  

**{*}CY:{**}*  
 - “Welsh placeholder”  
 - “Welsh placeholder”  
 - “Welsh placeholder”

—
 # 
 ## Navigation

 - **{*}Back:{**}* Returns to the Manual Upload form (`/manual-upload/form`).  
 - **{*}Change:{**}* Opens the respective field’s edit page for correction.  
 - **{*}Continue:{**}* Confirms and proceeds to the final confirmation or success page (`/manual-upload/confirmation`).  

—
 # 
 ## Accessibility

 - Must comply with **{*}WCAG 2.2 AA{**}* and **{*}GOV.UK Design System{**}* standards.  
 - Table elements must use semantic HTML `<table>` structure with `<th>` and `<td>` for accessibility.  
 - All “Change” links must have descriptive `aria-labels` (e.g., “Change court name”).  
 - The page must support keyboard-only navigation and visible focus states.  
 - Error summaries must be announced to assistive technologies.  
 - Screen readers must correctly identify page heading “Check details of uploaded file.”

—
 # 
 ## Test Scenarios

|ID|Scenario|Steps|Expected Result|
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
|TS1|View file summary|Upload file and click Continue|Summary page displays all file details|
|TS2|Edit details|Click a “Change” link|Redirected to corresponding field edit page|
|TS3|Missing field|Omit a required field in upload|Error message displayed|
|TS4|Continue process|Review and click Continue|Redirected to confirmation page|
|TS5|Invalid file|Upload unsupported file format|Error message displayed|
|TS6|Accessibility|Navigate using keyboard only|All controls accessible and focus visible|
|TS7|Back link|Click Back|Returns to Manual Upload form|
|TS8|Page reload|Refresh page after upload|Summary details persist from upload session|

—
 # 
 ## Assumptions / Open Questions

 - Confirm whether the summary table must include a timestamp for upload.  
 - Confirm if “List type” options are predefined by court or central system configuration.  
 - Confirm whether admins can download a copy of the uploaded file from this page.  
 - Confirm if any “Change” action triggers validation checks before returning to summary.  
 - Confirm whether Welsh translations are to be dynamically loaded or static.  

—', 'functional', 'verified', 'medium', 'story', 243, 'https://github.com/hmcts/cath-service/issues/243', '2026-01-20T17:05:15Z', '2026-01-30T15:03:32Z', 'linusnorton', 'linusnorton'),
  (22, 'REQ-0022', 'Manual publishing – Manual upload successful', '**PROBLEM STATEMENT**

Local admins (court clerks) can publish hearing lists manually in CaTH by uploading a flat file. This process involves several steps.

 

**AS A** Local Admin

**I WANT** to confirm that the Manual Upload was successful  

**SO THAT** I can confirm that the file has been published in CaTH

 

**Technical Acceptance Criteria**
 # This ticket is to include the processing of the metadata  and payload submitted as part of VIBE-159
 # Metadata should be stored in a postgres table with the following:
 ## location id (based on mock data)
 ## list type id (based on mock data)
 ## content date (Date)
 ## sensitivity
 ## language
 ## display from date (Date / Time)
 ## display to date (Date / Time)
 ## auto generated artefact ID (UUID). This is the primary key
 # The payload should be stored in a temp location locally ({**}Blob storage integration to be raised as a separate ticket){**}
 # On success, user redirect to success page
 # On failure, user kept on the confirm upload details page with an error
 # All session details for manual upload cleared on successful submission. On failure, session info for manual upload should be kept including the file

 

**ACCEPTANCE CRITERIA**
 * A local admin is able to access a verified account by signing in through the sign in page with their approved log in details
 * When the local admin clicks the continue button to complete the manual upload process, a confirmation of successful upload is displayed by the system
 * The system displays ‘File upload successful’ boldly in a green banner
 * In the same banner is a descriptive text ''Your file has been uploaded''
 * Beneath the green banner, the user can see another section titled ''What do you want to do next?'' this is followed by several links that directs them to ‘upload another file’, ‘Remove file’ or ‘Home’.
 * All CaTH pages specifications are maintained

 

**Welsh translations:**

File upload successful - Wedi llwyddo i uwchlwytho ffeiliau

Your file has been uploaded - Mae eich ffeil wedi’i huwchlwytho

What do you want to do next? - Beth yr ydych eisiau ei wneud nesaf?

upload another file - uwchlwytho ffeil arall

Remove file - Dileu ffeil 

Home - Tudalen hafan

 
 # VIBE-160 Manual Upload Success Confirmation Specification

> Owner: {**}`**`VIBE-160`**`{**} · Updated: {**}`**`24 Oct 2025`**`{**}

—
 # 
 ## Problem Statement

Local admins (court clerks) can publish hearing lists manually in CaTH by uploading a flat file.  
This process involves several steps, and at the end of the process, the user must receive confirmation that the upload was successful.

—
 # 
 ## User Story

{**}`**`As a`**`{**} **Local Admin**  
{**}`**`I want to`**`{**} **confirm that the Manual Upload was successful**  
{**}`**`So that`**`{**} **I can confirm that the file has been published in CaTH**

—
 # 
 ## Acceptance Criteria

1. A local admin is able to access a verified account by signing in through the sign-in page with their approved login details.  
2. When the local admin clicks the {**}`**`Continue`**`{**} button to complete the manual upload process, a confirmation of successful upload is displayed by the system.  
3. The page must display {**}`**`‘File upload successful’`**`{**} in bold within a {**}`**`green success banner`**`{**}.  
4. In the same banner, a descriptive message appears: {**}`**`‘Your file has been uploaded.’`**`{**}  
5. Beneath the banner, a new section titled {**}`**`‘What do you want to do next?’`**`{**} is displayed.  
6. This section includes links to:  
   - {**}`**`Upload another file`**`{**}  
   - {**}`**`Remove file`**`{**}  
   - {**}`**`Home`**`{**}  
7. All CaTH page design, layout, and accessibility specifications are maintained.  
8. Welsh translations are provided for all content elements (see below).

—
 # 
 ## User Journey Flow

1. Local admin signs in using verified credentials.  
2. The admin completes the manual upload process by clicking {**}`**`Continue`**`{**} on the previous summary page.  
3. The system validates and processes the uploaded flat file.  
4. On success, the {**}`**`Manual Upload Success page`**`{**} is displayed.  
5. The admin views a green success banner confirming the upload.  
6. The admin can then choose what to do next:  
   - Upload another file.  
   - Remove a file.  
   - Return to the Home (Dashboard) page.

—
 # 
 ## Wireframe

┌──────────────────────────────────────────────────────────────────────────┐
│ GOV.UK <Language Toggle>│
├──────────────────────────────────────────────────────────────────────────┤
│ HMCTS – Courts and Tribunals Hearings (CaTH) │
├──────────────────────────────────────────────────────────────────────────┤
│ < Back │
│ │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ ✅ File upload successful │ │
│ │ Your file has been uploaded. │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ │
│ What do you want to do next? │
│ │
│ • Upload another file │
│ • Remove file │
│ • Home │
│ │
└──────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## Form Fields

There are {**}`**`no input fields`**`{**} on this page.  
The page is purely informational and provides navigation options.

—
 # 
 ## Content

{**}`**`EN:`**`{**}  
 - Title/H1 — “File upload successful”  
 - Banner message — “Your file has been uploaded”  
 - Section title — “What do you want to do next?”  
 - Links — “Upload another file”, “Remove file”, “Home”  

{**}`**`CY:`**`{**}  
 - Title/H1 — “Wedi llwyddo i uwchlwytho ffeiliau”  
 - Banner message — “Mae eich ffeil wedi’i huwchlwytho”  
 - Section title — “Beth yr ydych eisiau ei wneud nesaf?”  
 - Links — “uwchlwytho ffeil arall”, “Dileu ffeil”, “Tudalen hafan”

—
 # 
 ## URL

`/manual-upload/success`

—
 # 
 ## Validation Rules

 - Only authenticated {**}`**`local admin`**`{**} users can access this page.  
 - If the page is accessed directly without a completed upload session, redirect the user to the manual upload form (`/manual-upload/form`).  
 - Banner must be styled using GOV.UK {**}`**`success notification pattern`**`{**} (`govuk~~notification~~banner--success`).  
 - Links must follow GOV.UK link conventions and open internal pages in the same tab.  

—
 # 
 ## Error Messages

{**}`**`EN:`**`{**}  
 - “You must complete the upload process before viewing this page.”  
 - “We could not confirm your upload status. Please try again later.”  

{**}`**`CY:`**`{**}  
 - “Rhaid i chi gwblhau''r broses uwchlwytho cyn gweld y dudalen hon.”  
 - “Nid oedd modd cadarnhau statws eich uwchlwytho. Rhowch gynnig arall arni yn nes ymlaen.”

—
 # 
 ## Navigation

 - ***Upload another <file:****>(file:///***) → `/manual-upload/form`  
 - ***Remove <file:****>(file:///***) → `/manual-upload/remove`  
 - {**}`**`Home:`**`{**} → `/dashboard`  
 - {**}`**`Back:`**`{**} Returns to the manual upload summary page (`/manual-upload/summary`)  

—
 # 
 ## Accessibility

 - Page must comply with {**}`**`WCAG 2.2 AA`**`{**} and {**}`**`GOV.UK Design System`**`{**} standards.  
 - Green banner must include `role="status"` for screen readers to announce success messages automatically.  
 - All links must be accessible via keyboard navigation and have visible focus states.  
 - Ensure bilingual toggle functionality works correctly with Welsh translations.  
 - Text contrast must meet GOV.UK colour accessibility standards.  
 - Page must not automatically redirect or time out to ensure all users can read the success message.  

—
 # 
 ## Test Scenarios

|ID|Scenario|Steps|Expected Result|
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
|TS1|Successful upload|Complete manual upload, click Continue|“File upload successful” page displays with green banner|
|TS2|Banner content|View success banner|Displays “File upload successful” and “Your file has been uploaded”|
|TS3|Navigation – Upload another file|Click “Upload another file”|Redirects to `/manual-upload/form`|
|TS4|Navigation – Remove file|Click “Remove file”|Redirects to `/manual-upload/remove`|
|TS5|Navigation – Home|Click “Home”|Redirects to `/dashboard`|
|TS6|Access control|Access `/manual~~upload/success` without prior upload|Redirects to `/manual~~upload/form`|
|TS7|Accessibility – Screen reader|Use screen reader on success page|Success banner announced correctly|
|TS8|Accessibility – Keyboard navigation|Use Tab to navigate|All links accessible and clearly focused|
|TS9|Welsh toggle|Switch to Welsh|Page content updates to Welsh translations|
|TS10|Responsive design|View on mobile|Page content and banner remain readable and accessible|

—
 # 
 ## Assumptions / Open Questions

 - Confirm whether {**}`**`timestamp or filename`**`{**} should be included in the success banner (e.g., “File upload successful – hearinglist*2025*10.csv”).  
 - Confirm if an {**}`**`email confirmation`**`{**} is also sent upon successful upload.  
 - Confirm if {**}`**`‘Remove file’`**`{**} should link to a confirmation screen before deletion.  
 - Confirm if the {**}`**`Home`**`{**} link directs to the admin dashboard or CaTH home page for all roles.  
 - Confirm whether the {**}`**`Continue`**`{**} button on the summary page triggers automatic backend confirmation before redirecting here.

—', 'functional', 'verified', 'medium', 'story', 244, 'https://github.com/hmcts/cath-service/issues/244', '2026-01-20T17:05:29Z', '2026-01-30T15:03:35Z', 'linusnorton', 'linusnorton'),
  (23, 'REQ-0023', 'Excel Upload – Upload Excel File', '**PROBLEM STATEMENT**

The non-strategic publishing route requires the upload of an excel file in CaTH which is then transformed at the back end to a Json file before publishing. The upload process is completed over a number of steps.

 

**AS A** Local Admin

**I WANT** to upload an excel file in CaTH

**SO THAT** I can publish a hearing list in CaTH

  

**ACCEPTANCE CRITERIA**
 * A local admin is able to access a verified account by signing in through the sign in page with their approved log in details
 * The local admin is able to see the ‘Upload excel file’ tab on the dashboard and is taken to the excel file upload form when the tab is clicked
 * The ‘Upload excel file’ tab displays the descriptive message ‘Upload an excel file to be converted and displayed on the external facing service on GOV.UK.’
 * The top of the excel file upload form displays a ‘warning’ with a warning caution sign and the boldly written message ‘{**}Prior to upload you must ensure the file is suitable for publication e.g. redaction of personal data has been done during the production of this file.’{**}
 * The excel file upload form displays various data fields on the left side of the page
 * Firstly is the file upload tab labelled ‘chose file’ where the local admin can upload the flat file
 * The following descriptive sentence is provided above the file upload tab; ‘Manually upload a csv, doc, docx, htm, html, json, or pdf file, max size 2MB
 * Below the file upload tab is a search tab labelled ‘Court name or Tribunal name’ that displays likely venue names as the local admin searches a venue name to publish against
 * The list type’ field which follows below displays the descriptive sentence within ‘Please choose a list type’ and contains a list of all list types available in CaTH for manual uploads in a drop down
 * Next Is the ‘Hearing start date’ that displays the descriptive text above it ‘For example, 16 01 2022’ and contains 3 free typing text boxes labelled ‘Day’, ‘Month’ and ‘Year’.
 * The sensitivity fields follows next with 3 options (public, Private – all verified users and classified) in a dropdown which the local admin can choose from
 * Next field is the language field which provides 3 language options in a drop down (English, welsh and bilingual English/welsh)
 * Next field is the ‘Display file from’ which has the descriptive text ‘For example, 27 01 2022’ and contains 3 free typing text boxes labelled ‘Day’, ‘Month’ and ‘Year’.
 * Then ‘the Display file to’ which has the descriptive text ‘For example, 18 02 2022’ and contains 3 free typing text boxes labelled ‘Day’, ‘Month’ and ‘Year’.
 * Lastly is the ‘continue’ button which the local admin can click to continue the manual upload process and a ‘back to top’ message and arrow.
 * On the right side of the form, various terms on the form are explained in sequential order under the heading ‘Page Help’ below;
 * Lists
 * You must ensure that you only upload one file that contains all hearings for the Court or Tribunal name and List type. This should include all judges and court rooms in one document.
 * Sensitivity
 * You need to indicate which user group your document should be available to:
 * Public
 * Publication available to all users.
 * Private
 * Publication available to all verified users e.g. Legal professionals and media.
 * Classified
 * Publication only available to verified users who are in a group eligible to view that list e.g. SJP press list available to Media
 * Display from
 * This will be the date the publication is available from, if today''s date is used it will be displayed immediately. If a date in the future is used, it will display from 00:01 of that date.
 * Display to
 * This will be the last date the publication is available. It will be displayed until 23:59 of that date.
 * All CaTH pages specifications are maintained

 

 

**Technical specification**

**As a** Local Admin
**I want** to upload an excel file in CaTH
**So that** I can publish a hearing list in CaTH

 

**Page: Upload Excel File Form**

**Form fields**
 * **File upload**

 ** Input type: file

 ** Required: Yes

 ** Accepted formats: {{{}.csv{}}}, {{{}.doc{}}}, {{{}.docx{}}}, {{{}.htm{}}}, {{{}.html{}}}, {{{}.json{}}}, `.pdf`

 ** Validation rules:

 *** Maximum file size: 2MB

 *** Must be one of the permitted formats

 *** Must contain a single consolidated document containing all hearings for the selected Court/Tribunal and list type

 * **Court name or Tribunal name**

 ** Input type: text with autocomplete/search

 ** Required: Yes

 ** Validation rules:

 *** Must match an existing court/tribunal entity in CaTH

 *** Minimum 2 characters before autocomplete triggers

 * **List type**

 ** Input type: select (dropdown)

 ** Required: Yes

 ** Validation rules:

 *** Must choose one value from list types available for manual upload in CaTH

 * **Hearing start date**

 ** Input type: three text inputs: Day / Month / Year

 ** Required: Yes

 ** Validation rules:

 *** Day: 1–31, numeric, max 2 characters

 *** Month: 1–12, numeric, max 2 characters

 *** Year: 4-digit year, numeric

 *** Must form a valid date

 * **Sensitivity**

 ** Input type: select (dropdown)

 ** Required: Yes

 ** Options:

 *** Public

 *** Private – all verified users

 *** Classified

 ** Validation:

 *** Must select one option

 * **Language**

 ** Input type: select (dropdown)

 ** Required: Yes

 ** Options:

 *** English

 *** Welsh

 *** Bilingual English/Welsh

 ** Validation:

 *** Must select one option

 * **Display file from**

 ** Input type: three text inputs: Day / Month / Year

 ** Required: Yes

 ** Validation rules:

 *** Same validation as Hearing start date

 *** Must be today’s date or a future date

 * **Display file to**

 ** Input type: three text inputs: Day / Month / Year

 ** Required: Yes

 ** Validation rules:

 *** Same validation as Display file from

 *** Must be the same or later than Display file from

 * **Continue button**

 ** Input type: button

 ** Required: N/A

 ** Validation rules: Triggers validation on all mandatory fields

 

**Content**
 * **EN: Title/H1** “Upload excel file”

 * **CY: Title/H1** “Welsh placeholder”

 
### **Introductory warning**
 * **EN:** “Prior to upload you must ensure the file is suitable for publication e.g. redaction of personal data has been done during the production of this file.”

 * **CY:** “Welsh placeholder”

 
### **File upload descriptive text**
 * **EN:** “Manually upload a csv, doc, docx, htm, html, json, or pdf file, max size 2MB”

 * **CY:** “Welsh placeholder”

 
### **Page Help (right-hand column)**
#### Lists
 * **EN:** “You must ensure that you only upload one file that contains all hearings for the Court or Tribunal name and List type. This should include all judges and court rooms in one document.”

 * **CY:** “Welsh placeholder”

#### Sensitivity
 * **EN:**

 ** “You need to indicate which user group your document should be available to:”

 ** “Public: Publication available to all users.”

 ** “Private: Publication available to all verified users e.g. Legal professionals and media.”

 ** “Classified: Publication only available to verified users who are in a group eligible to view that list e.g. SJP press list available to Media.”

 * **CY:** “Welsh placeholder”

#### Display from
 * **EN:** “This will be the date the publication is available from … displayed immediately if today’s date is used.”

 * **CY:** “Welsh placeholder”

#### Display to
 * **EN:** “This will be the last date the publication is available. It will be displayed until 23:59 of that date.”

 * **CY:** “Welsh placeholder”

 
### **Buttons**
 * **EN: Button** “Continue”

 * **CY: Button** “Welsh placeholder”

 

**Errors**

**File upload**
 * **EN:** “Select a file to upload”

 * **CY:** “Welsh placeholder”

 * **EN:** “The selected file must be smaller than 2MB”

 * **CY:** “Welsh placeholder”

 * **EN:** “The selected file type is not supported”

 * **CY:** “Welsh placeholder”

### **Court/Tribunal name**
 * **EN:** “Enter a court or tribunal name”

 * **CY:** “Welsh placeholder”

### **List type**
 * **EN:** “Select a list type”

 * **CY:** “Welsh placeholder”

### **Hearing start date**
 * **EN:** “Enter a valid hearing start date”

 * **CY:** “Welsh placeholder”

### **Sensitivity**
 * **EN:** “Select a sensitivity level”

 * **CY:** “Welsh placeholder”

### **Language**
 * **EN:** “Select a language option”

 * **CY:** “Welsh placeholder”

### **Display file from**
 * **EN:** “Enter a valid ‘Display from’ date”

 * **CY:** “Welsh placeholder”

### **Display file to**
 * **EN:** “Enter a valid ‘Display to’ date”

 * **CY:** “Welsh placeholder”

 * **EN:** “‘Display to’ date must be the same as or later than ‘Display from’ date”

 * **CY:** “Welsh placeholder”

 

**Back navigation**
 * Back link returns to the CaTH dashboard without losing entered values.

 * “Back to top” link scrolls to page header.

 

**Accessibility**
 * Page must comply with **WCAG 2.2 AA** and **GOV.UK Design System** standards.

 * All form fields must have associated labels and accessible descriptions.

 * Error summary must list all errors and link to the first instance of each.

 * Keyboard-only navigation must be fully supported.

 * Warning component must use correct ARIA roles.

 

**Test Scenarios**
 * Submitting with no file presents the file-upload error.

 * Uploading a file above 2MB triggers size validation.

 * Uploading an invalid format (.xlsx, .zip, etc.) shows file format error.

 * Court/tribunal name autocomplete returns matching entities after 2+ characters.

 * List type dropdown lists all valid CaTH manual upload list types.

 * Sensitivity and language options behave as dropdowns with required selection.

 * Invalid or impossible dates (e.g., 32/01/2024) show date errors.

 * “Display to” earlier than “Display from” produces chronological validation error.

 * Successful submission with all fields valid progresses to the next step in publishing workflow.

 * Language toggle switches all English text to Welsh placeholders.

 * Back link returns user to dashboard without clearing form data.', 'functional', 'verified', 'medium', 'story', 245, 'https://github.com/hmcts/cath-service/issues/245', '2026-01-20T17:05:45Z', '2026-01-30T15:03:37Z', 'linusnorton', 'linusnorton'),
  (24, 'REQ-0024', 'Preparation for Sprint 2- Cadence', '#### User story

**As a** user I Want all project governance planning sessions are setup in time for cath rewirte commencement{*}].{*}
#### Acceptance criteria
 # **Given that** *<some precondition>,* **when** *<some action is carried out>,* **then** *<I expect some result>.*', 'functional', 'verified', 'medium', 'story', 246, 'https://github.com/hmcts/cath-service/issues/246', '2026-01-20T17:05:59Z', '2026-01-30T15:03:39Z', 'linusnorton', 'linusnorton'),
  (25, 'REQ-0025', 'Create Backlog Items for cath rewrite commencement', '#### User story

**As a** *<type of user>,* **I want to** *<some goal>,* **so that** *<some reason>.*
#### Acceptance criteria
 # **Given that** *<some precondition>,* **when** *<some action is carried out>,* **then** *<I expect some result>.*', 'functional', 'verified', 'medium', 'story', 247, 'https://github.com/hmcts/cath-service/issues/247', '2026-01-20T17:06:10Z', '2026-01-30T15:03:41Z', 'linusnorton', 'linusnorton'),
  (26, 'REQ-0026', 'Prepare licences for Cath rewrite', '#### User story

**As a** *<type of user>,* **I want to** *<some goal>,* **so that** *<some reason>.*
#### Acceptance criteria
 # **Given that** *<some precondition>,* **when** *<some action is carried out>,* **then** *<I expect some result>.*', 'functional', 'verified', 'medium', 'story', 248, 'https://github.com/hmcts/cath-service/issues/248', '2026-01-20T17:06:20Z', '2026-01-30T15:03:45Z', 'linusnorton', 'linusnorton'),
  (27, 'REQ-0027', 'Excel Upload – Complete excel upload process /  Care Standards Tribunal Weekly Hearing List', '**PROBLEM STATEMENT**

The non-strategic publishing route requires the upload of an excel file in CaTH which is then transformed at the back end to a Json file before publishing. The upload process is completed over a number of steps.

 

**AS A** Local Admin

**I WANT** to complete the excel file upload process

**SO THAT** I can publish a hearing list in CaTH

 

**ACCEPTANCE CRITERIA**
 * A local admin is able to access a verified account by signing in through the sign in page with their approved log in details
 * When the local admin clicks the continue button on the excel file upload form, the user sees a summary page that displays the high level details of the uploaded file (Court name, File, List type, hearing start date, sensitivity, language and display file dates) in a table
 * Each detail row shows the selected data and a link titled ‘change’ beside it that allows the user update the selected detail
 * The local admin can click the continue button below to complete the excel file upload process
 * When the local admin clicks the continue button to complete the excel file upload process, a confirmation of successful upload is displayed by the system
 * The system displays ‘success’ boldly in a green banner
 * In the same banner, a descriptive text is displayed and reads ‘Your file has been uploaded’
 * Beneath the green banner, the user can see several links that directs them to ‘upload another file’, ‘remove file’ or ‘home’.
 * when the list is uploaded, at the back end, the excel file is converted to a JSon file and validated using the approved validation schema displayed in the front end with the attached style guide 
 * The first list type to be created through the excel upload is for the Care Standards Tribunal 
 * at the front end, the list name will be displayed with the date of publication and language version. i.e. **Care Standards Tribunal Weekly Hearing List for week commencing 24 November 2025 - English (Saesneg)**
 * The list will display the list title ''Care Standards Tribunal Weekly Hearing List'' at the top of the list followed by the duration covered in the list written in the format ''List for week commencing 24 November 2025'' and then the date the list was last updated which is displayed as ''Last updated 24 November 2025 at 9:55am''

 * this is followed by a collapsible accordion beside the words ''Important Information'' which when opened, displays the following sentence ''Please contact the Care Standards Office at cst@justice.gov.uk for details of how to access video hearings.'' and then the link <Observe a court or tribunal hearing - GOV.UK>(https://www.gov.uk/guidance/observe~~a-court~~or~~tribunal~~hearing) which is masked in the text ''Observe a court or tribunal hearing as a journalist, researcher or member of the public''. 
 * This will be followed by a search field with the title ''Search Cases'' and then a table with the following data fields / columns; Date, Case name, Hearing length, Hearing type, Venue and Additional information
 * At the bottom of the page, the ''Data Source: '' is listed followed by the ''Back to top'' arrow 
 * All CaTH pages specifications are maintained

 
|**Excel field name**|**Schema field name**|**Mandatory**|**Comments**|
|Date|date|Yes|Must be in format dd/MM/yyyy. E.g. 01/01/2025. This will be transformed into 1 January 2025 when displaying on the style guide.|
|Case name|caseName|Yes| |
|Hearing length|hearingLength|Yes| |
|Hearing type|hearingType|Yes| |
|Venue|venue|Yes| |
|Additional information|additionalInformation|Yes| |

 

 
# **VIBE-166 — Excel File Upload & Care Standards Tribunal List Display Specification**

*(Non-strategic publishing route)*

 
## **1. User Story**

**As a** Local Admin
**I want to** complete the Excel file upload process
**So that** I can publish a hearing list in CaTH

 
## **2. Form Fields**

*(Summary page uses read-only values; upload form fields are out of scope for this story. Only summary fields are listed here.)*
|Field name|Input type|Required|Validation / Notes|
|Court name|Display|Yes|Must match existing CaTH venue reference data|
|File name|Display|Yes|Must be a valid Excel file previously uploaded|
|List type|Display|Yes|First list type implemented: **Care Standards Tribunal Weekly Hearing List**|
|Hearing start date|Display|Yes|Must be a valid date|
|Sensitivity|Display|Yes|Public or Restricted|
|Language|Display|Yes|EN / CY|
|Display file dates|Display|Yes|Date range (e.g., “List for week commencing…”)|

Each display row includes a **Change** link pointing back to the upload form to modify the selected attribute.

 
## **3. Content Requirements**
### **3.1 Summary Page (Step Before Submission)**

**EN Content**
 * Title/H1: **“Check your upload details”**

 * Table row labels:

 * 
 ** Court name

 * 
 ** File

 * 
 ** List type

 * 
 ** Hearing start date

 * 
 ** Sensitivity

 * 
 ** Language

 * 
 ** Display file dates

 * Link: **“Change”** (one per row)

 * Button: **“Continue”**

**CY Content (placeholders)**
 * Title/H1: “Welsh placeholder”

 * Labels: “Welsh placeholder”

 * Button: “Welsh placeholder”

 * Link: “Welsh placeholder”

 
### **3.2 Success Page After Submission**

**EN**
 * Success banner header: **“Success”**

 * Success banner text: **“Your file has been uploaded”**

 * Links below banner:

 * 
 *** *Upload another file**

 * 
 *** *Remove file**

 * 
 *** *Home**

**CY**
 * “Welsh placeholder” for banner and links.

 
### **3.3 Front-End Display — Care Standards Tribunal Weekly Hearing List**

The first list type to be supported is the {**}Care Standards Tribunal Weekly Hearing List{**}.
After Excel → JSON conversion and validation, the published list appears on the CaTH front end as follows.
#### **Header Format**
 * **List title:**
**“Care Standards Tribunal Weekly Hearing List”**

 * **Duration:**
**“List for week commencing 24 November 2025”**

 * **Last updated:**
**“Last updated 24 November 2025 at 9:55am”**

#### **Important Information Accordion**
 * Label: **“Important information”** (accordion closed by default)

 * When opened, show:

 * 
 ** Sentence:
**“Please contact the Care Standards Office at cst@justice.gov.uk for details of how to access video hearings.”**

 * 
 ** Link masked in text:
**“Observe a court or tribunal hearing as a journalist, researcher or member of the public”**
(links to {*}Observe a court or tribunal hearing – GOV.UK{*})

#### **Search Section**
 * Title/H2: **“Search Cases”**

 * Search input: Free text (case name, date, venue, etc.)

#### **Cases Table**

Column headers:
 # **Date**

 # **Case name**

 # **Hearing length**

 # **Hearing type**

 # **Venue**

 # **Additional information**

Rows are populated from the validated JSON derived from the Excel upload.
#### **Footer Content**
 * “{**}Data source:{**} Care Standards Tribunal”

 * “{**}Back to top{**}” arrow/text

 
## **4. Errors**
### **Summary Page**

This page never triggers field-level validation (all values originate from the upload form).
Errors are only triggered if:
 * Mandatory data is missing (redirect back to upload form)

 * Session expired (redirect to sign-in)

### **Upload Success**

No error messages appear on the success page.

 
## **5. Back Navigation**
 * **Summary page Back link:** Returns to Excel upload form with pre-populated values.

 * **Success page Back link:** Returns to summary page (non-editable).

 * **Front-end list Back to Top:** Scrolls user back to H1.

 
## **6. Accessibility**

All pages must comply with {**}WCAG 2.2 AA{**}, {**}GOV.UK Design System{**}, and {**}CaTH page specifications{**}, including:
 * Success banner must use `role="status"`

 * Summary table must use:

 * 
 ** `<th scope="row">` for row labels

 * 
 ** `<th scope="col">` for header cells

 * Accordion must implement:

 * 
 ** `aria-expanded`

 * 
 ** `aria-controls`

 * 
 ** Standard GOV.UK accordion pattern

 * Links must have visible focus states

 * Search input must have:

 * 
 ** Associated `<label>`

 * 
 ** Keyboard accessibility

 * Cases table must announce column headers to screen readers

 * “Back to top” must be a keyboard focusable button or link

 
## **7. Test Scenarios**
|ID|Scenario|Steps|Expected Result|
|TS1|Signed-in access|Sign in as Local Admin|Access granted to upload journey|
|TS2|Summary page display|Upload Excel → Continue|Summary table displays all metadata|
|TS3|Change row|Click “Change” next to row|Returns to upload form with editable fields|
|TS4|Complete upload|Summary → Continue|Success page shown|
|TS5|Success banner|After upload|Banner displays “Success – Your file has been uploaded”|
|TS6|Navigation links|Click “Upload another file”|Returns to upload start|
|TS7|Navigation links|Click “Remove file”|Goes to remove file flow|
|TS8|JSON conversion|Upload completed|Excel transforms to JSON successfully|
|TS9|Validation schema|JSON schema validation|Invalid files reject at back end (logged; out of scope for UI)|
|TS10|Front-end list header|Open published list|H1 matches: “Care Standards Tribunal Weekly Hearing List”|
|TS11|Duration display|View list|Shows “List for week commencing…”|
|TS12|Last updated|View list|Shows correct timestamp|
|TS13|Important information|Open accordion|Text + GOV.UK link displayed|
|TS14|Search cases|Enter query|Table filters based on search|
|TS15|Table columns|View table|All required columns present|
|TS16|Data Source footer|Scroll bottom|“Data source” text appears|
|TS17|Back to top|Click link|Scrolls to page header|
|TS18|Accessibility|Keyboard-only navigation|All controls operable|
|TS19|Welsh toggle|Switch language|All page text replaces with Welsh equivalents|

 
## **8. Additional Behaviour & Processing Requirements**
### **Excel → JSON Transformation**
 * Triggered immediately after final Continue click.

 * Must follow the **approved validation schema** and **style guide** for Care Standards Tribunal lists.

 * Invalid JSON or schema mismatch should:

 * 
 ** Prevent publication

 * 
 ** Be logged for Local Admin review (outside UI scope)

### **List Naming Convention**

Displayed name format on CaTH front end:
> **Care Standards Tribunal Weekly Hearing List for week commencing 24 November 2025 – English (Saesneg)**
> 
Future Welsh versions:
**“… – Welsh (Cymraeg)”**

 
## **9. Assumptions & Open Questions**
 * Should the “Data source” label always show “Care Standards Tribunal”, or be dynamic per venue?

 * Should “Search Cases” filter the table client-side only, or make a server request?

 * Is the “Last updated” timestamp sourced from upload timestamp or publication timestamp?

 
## Front-End Wireframes (Detailed)
### 1. Excel Upload — Summary Page

 

< CaTH Header / Navigation >

< Back

Check your upload details

~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~
|Court name          |Care Standards Tribunal  |Change|

~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~
|File                |cst~~weekly~~24~~11~~2025.xlsx|Change|

~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~
|List type            |Care Standards Tribunal  |Change|
|                     |Weekly Hearing List      |       |

~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~
|Hearing start date  |24 November 2025          |Change|

~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~
|Sensitivity          |Public                    |Change|

~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~
|Language            |English                  |Change|

~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~
|Display file dates  |24–30 November 2025      |Change|

~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~

< Continue >  (primary / green button)

 

 
### 2. Excel Upload — Success Page

 

< CaTH Header / Navigation >

< Back

┌───────────────────────────────────────────────┐
│  ✓ Success                                   │
│  Your file has been uploaded                 │
└───────────────────────────────────────────────┘

What do you want to do next?

• Upload another file
• Remove file
• Home

 

Each bullet is a standard GOV.UK link, spaced as a vertical list.

 
### 3. Care Standards Tribunal List Display Page

 

< CaTH Header / Navigation >

< Back

Care Standards Tribunal Weekly Hearing List
List for week commencing 24 November 2025
Last updated 24 November 2025 at 9:55am

<▼> Important information  (accordion closed initially)
    When expanded:
    Please contact the Care Standards Office at cst@justice.gov.uk
    for details of how to access video hearings.
    Observe a court or tribunal hearing as a journalist, researcher
    or member of the public (link to GOV.UK guidance)

Search Cases
<*__**__**__**__**__**__**__**__**__*>  (Search input)

+~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~--+
|Date      |Case name|Hearing length|Hearing type      |
|           |         |               |                   |
|Venue      |Additional information                          |

+~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~--+
|24 Nov 25  |CST/001...|Half day      |Substantive hearing|
|Care ...  |Remote; video access details via CST office    |

+~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~--+
|25 Nov 25  |...                                              
+~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~--+|

Data source: Care Standards Tribunal

↑ Back to top

 
 * Table can be standard single row per case with 6 columns, or 2-line responsive rows; spec allows either as long as all 6 data items are visible.

 * “Back to top” is a clickable link or button with arrow icon.', 'functional', 'verified', 'medium', 'story', 249, 'https://github.com/hmcts/cath-service/issues/249', '2026-01-20T17:06:30Z', '2026-01-30T15:03:47Z', 'linusnorton', 'linusnorton'),
  (28, 'REQ-0028', 'Excel Upload – Excel upload successful', '**PROBLEM STATEMENT**

The non-strategic publishing route requires the upload of an excel file in CaTH which is then transformed at the back end to a Json file before publishing. The upload process is completed over a number of steps.

 

**AS A** Local Admin

**I WANT** to confirm that the excel file Upload was successful  

**SO THAT** I can confirm that the hearing list has been published in CaTH

 

**ACCEPTANCE CRITERIA**
 * A local admin is able to access a verified account by signing in through the sign in page with their approved log in details
 * When the local admin clicks the continue button to complete the excel file upload process, a confirmation of successful upload is displayed by the system
 * The system displays ‘success’ boldly in a green banner
 * In the same banner, a descriptive text is displayed and reads ‘Your file has been uploaded’
 * Beneath the green banner, the user can see several links that directs them to ‘upload another file’, ‘remove file’ or ‘home’.
 * All CaTH pages specifications are maintained', 'functional', 'verified', 'medium', 'story', 250, 'https://github.com/hmcts/cath-service/issues/250', '2026-01-20T17:06:48Z', '2026-01-30T15:03:50Z', 'linusnorton', 'linusnorton'),
  (29, 'REQ-0029', 'Remove publication', '**PROBLEM STATEMENT**

Admins who can upload files and publish hearing lists in CaTH are also given permission to remove these publications if needed. This process is carried out in several steps.

 

**AS AN** Admin

**I WANT** to remove a publication in CaTH

**SO THAT** the publication is no longer available to CaTH Users

 

**ACCEPTANCE CRITERIA**
 * An admin is able to access a verified account by signing in through the sign in page with their approved log in details
 * The admin is able to see the ‘Remove’ tab on the dashboard
 * The ‘Remove’ tab displays the descriptive message ‘Search by court or tribunal and remove a publication from the external facing service on GOV.UK.’
 * When the admin clicks on the ‘Remove’ tab on the dashboard, the system directs the local admin to the ‘Find content to remove’ page
 * The admin is able to search for content to remove by typing in the ‘Search by court or tribunal name’ search tab which displays the sample descriptive text {**}‘{**}For example, Blackburn Crown Court’
 * where the admin does not input any selection into the search bar and clicks the continue button, then the system will display the following descriptive message to prompt the user; '' There is a problem''. it will also state ''court or tribunal name must be 3 characters or more'' and highlight the search bar so the admin knows where to input the information
 * When a user types in the search bar, the system will display likely options that correspond with the user’s input. This should be pulled from the Court Master Reference Data
 * When the admin finds the content to be removed and clicks the continue button, the local admin is taken to the ‘Select content to remove’ page which displays all the published content in the specific venue selected and a total of all the results found with the display text ‘Showing --result(s)’
 * The admin can see a table displaying the list type, court or tribunal name, content date, display dates, language and sensitivity of each content that’s available in the venue selected
 * The admin can see a check box at the end of the row with each content’s details in the table that allows the selection of all the content to be deleted
 * The admin continues the process by clicking the continue button and  is taken to a confirmation page titled ‘Are you sure you want to remove this content?’ which displays the details of all the selected content to be removed and two radio buttons to select yes to complete the removal or no to cancel the removal of the content
 * Where the admin selects no, the removal process is terminated, and the admin is taken back to the ‘select content to remove page’
 * Where the admin selects yes, the removal process is completed and a confirmation of ''Successful file removal'' is displayed by the system boldly in a green banner
 * In the same banner, a descriptive text is displayed underneath and reads ‘Your file has been removed’
 * Beneath the green banner, the user can see several links that directs them to ‘remove another file’ or ‘home’.
 * All CaTH pages specifications are maintained

**Technical Criteria**
 * For court search box, use the autocomplete functionality which has been built already 
 * On confirmation, artefact must be removed from artefact table.

 

 
 # VIBE-169 Remove Publication Specification

> Owner: {**}`**`VIBE-169`**`{**} · Updated: {**}`**`24 Oct 2025`**`{**}

—
 # 
 ## Problem Statement

Admins who are authorised to upload and publish hearing lists in CaTH must also have the ability to {**}`**`remove publications`**`{**} when necessary.  
This process allows for the secure and auditable removal of published content from the CaTH external-facing service on GOV.UK, ensuring that outdated or incorrect information is not publicly accessible.

—
 # 
 ## User Story

{**}`**`As an`**`{**} **Admin**  
{**}`**`I want to`**`{**} **remove a publication in CaTH**  
{**}`**`So that`**`{**} **the publication is no longer available to CaTH users**

—
 # 
 ## Acceptance Criteria

1. Admin can access a verified account by signing in through the {**}`**`Sign In`**`{**} page with approved credentials.  
2. The Admin sees a {**}`**`‘Remove’ tab`**`{**} on the Dashboard.  
3. The {**}`**`‘Remove’ tab`**`{**} displays the message:  
   > “Search by court or tribunal and remove a publication from the external-facing service on GOV.UK.”  
4. When clicked, the Admin is directed to the {**}`**`‘Find content to remove’`**`{**} page.  
5. The page displays a search bar titled {**}`**`‘Search by court or tribunal name’`**`{**} with placeholder text:  
   > “For example, Blackburn Crown Court.”  
6. If the Admin clicks {**}`**`Continue`**`{**} without entering a search term, the system displays:  
   - Header: “There is a problem.”  
   - Inline message: “Court or tribunal name must be 3 characters or more.”  
   - The search bar is highlighted in red.  
7. When the Admin types in the search bar, the system displays suggested courts/tribunals based on {**}`**`Court Master Reference Data`**`{**}.  
8. After selecting a venue and clicking {**}`**`Continue{**}`**`, the Admin is taken to the **{*}‘Select content to remove’{**}* page.  
9. The system displays:  
   - A total result count with text “Showing — result(s).”  
   - A table listing each published file for that venue.  
10. Each row in the table shows:  
    - List Type  
    - Court or Tribunal Name  
    - Content Date  
    - Display Dates  
    - Language  
    - Sensitivity  
    - Checkbox (to select content for removal)  
11. Admin can select one or more checkboxes.  
12. On clicking {**}`**`Continue{**}`**`, the system navigates to a **{*}confirmation page{**}* titled {**}`**`‘Are you sure you want to remove this content?’`**`{**}  
13. The confirmation page lists the selected content with two radio buttons:  
    - {**}`**`Yes`**`{**} – confirms the removal  
    - {**}`**`No`**`{**} – cancels the removal  
14. If {**}`**`No`**`{**} is selected, the Admin returns to the “Select content to remove” page.  
15. If {**}`**`Yes`**`{**} is selected:  
    - The removal is completed.  
    - The system displays a {**}`**`green success banner`**`{**} with:  
      - Header: {**}`**`“Successful file removal.”`**`{**}  
      - Subheader: {**}`**`“Your file has been removed.”`**`{**}  
16. Beneath the banner, the Admin sees links to:  
    - {**}`**`Remove another file`**`{**}  
    - {**}`**`Home`**`{**}  
17. All CaTH design and accessibility standards are maintained.

—
 # 
 ## User Journey Flow

1. Admin logs into CaTH with verified credentials.  
2. Admin clicks the {**}`**`Remove`**`{**} tab on the Dashboard.  
3. System displays the {**}`**`Find content to remove`**`{**} page.  
4. Admin searches for a court or tribunal name.  
5. If input is valid (≥ 3 characters), system shows search suggestions.  
6. Admin selects venue and clicks {**}`**`Continue`**`{**}.  
7. System displays {**}`**`Select content to remove`**`{**} page with results table.  
8. Admin selects file(s) and clicks {**}`**`Continue`**`{**}.  
9. System displays {**}`**`Confirmation page`**`{**}.  
10. Admin confirms by selecting {**}`**`Yes`**`{**} → removal completed and confirmation banner displayed.  
11. Admin can then remove another file or return to the Dashboard.

—
 # 
 ## Wireframes

 # 
 ## 
 ### A. Dashboard

 

┌──────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK <Language Toggle> │
├──────────────────────────────────────────────────────────────────────────────┤
│ HMCTS – Courts and Tribunals Hearings (CaTH) │
├──────────────────────────────────────────────────────────────────────────────┤
│ Dashboard │
│ │
│ <Upload Reference Data> <Manual Upload> <Remove> <Audit Viewer> │
│ │
│ Remove │
│ Search by court or tribunal and remove a publication from the external │
│ facing service on GOV.UK. │
└──────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## 
 ### B. Find Content to Remove

┌──────────────────────────────────────────────────────────────────────────────┐
│ Find content to remove │
│ │
│ Search by court or tribunal name │
│ < For example, Blackburn Crown Court > │
│ │
│ <Continue> (Green Button) │
│ │
│ (Error State) │
│ There is a problem. │
│ Court or tribunal name must be 3 characters or more. │
└──────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## 
 ### C. Select Content to Remove

┌──────────────────────────────────────────────────────────────────────────────┐
│ Select content to remove │
│ Showing 3 result(s) │
│ │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ List Type | Court Name | Content Date | Display Dates | Language | Sensitivity │
│ │────────────────────────────────────────────────────────────────────────│
│ │ Daily List | Blackburn Crown Court | 22 Oct 2025 | 22–25 Oct 2025 | EN | Restricted | < > │
│ │ Weekly List| Blackburn Crown Court | 19 Oct 2025 | 19–25 Oct 2025 | EN | Public | < > │
│ └────────────────────────────────────────────────────────────────────────┘ │
│ │
│ <Continue> (Green Button) │
└──────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## 
 ### D. Confirmation Page

┌──────────────────────────────────────────────────────────────────────────────┐
│ Are you sure you want to remove this content? │
│ │
│ You are about to remove the following publication(s): │
│ - Daily List, Blackburn Crown Court, 22 Oct 2025 │
│ - Weekly List, Blackburn Crown Court, 19 Oct 2025 │
│ │
│ ○ Yes, remove this content │
│ ○ No, cancel and go back │
│ │
│ <Continue> (Green Button) │
└──────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## 
 ### E. Success Page

┌──────────────────────────────────────────────────────────────────────────────┐
│ ✅ Successful file removal │
│ Your file has been removed. │
│ │
│ <Remove another file> <Home> │
└──────────────────────────────────────────────────────────────────────────────┘

 

 

—
 # 
 ## Form Fields

|Field|Type|Required|Validation|Behaviour|
|~~--~~~~--~~|~~--~~~~-|~~~~--~~~~--~~~~-|~~~~--~~~~--~~~~--~~|~~--~~~~--~~~~--~~-|
|Court or tribunal name|Text (search)|Yes|Minimum 3 characters|Displays suggestions from Court Master Reference Data|
|File selection|Checkbox|Yes|At least one item must be selected|Selects content to be removed|
|Confirmation|Radio buttons|Yes|Must choose Yes or No|Determines whether removal proceeds|

—
 # 
 ## Content

{**}`**`EN:`**`{**}  
 - {**}`**`Page Titles:`**`{**} “Find content to remove”, “Select content to remove”, “Are you sure you want to remove this content?”, “Successful file removal”  
 - {**}`**`Messages:`**`{**}  
  - “Search by court or tribunal and remove a publication from the external-facing service on GOV.UK.”  
  - “Court or tribunal name must be 3 characters or more.”  
  - “Your file has been removed.”  
 - {**}`**`Buttons:`**`{**} “Continue”, “Remove another file”, “Home”

{**}`**`CY:`**`{**}  
 - {**}`**`Page Titles:`**`{**} “Canfod cynnwys i’w dynnu”, “Dewis cynnwys i’w dynnu”, “A ydych yn siŵr eich bod am dynnu’r cynnwys hwn?”, “Tynnu ffeil yn llwyddiannus”  
 - {**}`**`Messages:`**`{**}  
  - “Chwiliwch yn ôl llys neu dribiwnlys a thynnwch gyhoeddiad o’r gwasanaeth allanol ar GOV.UK.”  
  - “Rhaid i enw’r llys neu’r tribiwnlys gynnwys 3 llythyren neu fwy.”  
  - “Mae eich ffeil wedi’i thynnu.”  
 - {**}`**`Buttons:`**`{**} “Parhau”, “Tynnu ffeil arall”, “Hafan”

—
 # 
 ## URL Structure

|Page|URL|
|~~--~~~~-|~~---|
|Dashboard (Remove tab)|`/admin/remove`|
|Find content to remove|`/admin/remove/find`|
|Select content to remove|`/admin/remove/select`|
|Confirmation page|`/admin/remove/confirm`|
|Success page|`/admin/remove/success`|

—
 # 
 ## Validation Rules

 - Minimum input length for search field: {**}`**`3 characters`**`{**}.  
 - Search must return matching venues from Court Master Reference Data.  
 - At least one publication must be selected before proceeding.  
 - Confirmation radio must be selected before continuing.  
 - Successful removal triggers update in CaTH database and unpublishes the file from GOV.UK.  

—
 # 
 ## Error Messages

{**}`**`EN:`**`{**}  
 - “There is a problem.”  
 - “Court or tribunal name must be 3 characters or more.”  
 - “Select at least one publication to remove.”  
 - “An error occurred while removing content. Please try again later.”  

{**}`**`CY:`**`{**}  
 - “Mae problem wedi codi.”  
 - “Rhaid i enw’r llys neu’r tribiwnlys gynnwys 3 llythyren neu fwy.”  
 - “Dewiswch o leiaf un gyhoeddiad i’w dynnu.”  
 - “Digwyddodd gwall wrth dynnu’r cynnwys. Ceisiwch eto’n hwyrach.”  

—
 # 
 ## Navigation

 - {**}`**`Remove tab:`**`{**} → `/admin/remove`  
 - {**}`**`Find content to remove:`**`{**} → `/admin/remove/find`  
 - {**}`**`Select content to remove:`**`{**} → `/admin/remove/select`  
 - {**}`**`Confirmation page:`**`{**} → `/admin/remove/confirm`  
 - {**}`**`Success page:`**`{**} → `/admin/remove/success`  
 - {**}`**`Back link:`**`{**} Returns to previous page, preserving search and selection states.  

—
 # 
 ## Accessibility

 - Comply with {**}`**`WCAG 2.2 AA`**`{**} and {**}`**`GOV.UK Design System`**`{**} standards.  
 - Use semantic HTML for tables, inputs, and buttons.  
 - Ensure all error messages are announced by screen readers using `aria-live="assertive"`.  
 - Focus states visible on all interactive elements.  
 - Checkbox and radio groups labelled with fieldset and legend.  
 - All text readable in both English and Welsh, toggleable via language switch.  

—
 # 
 ## Test Scenarios

|ID|Scenario|Steps|Expected Result|
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
|TS1|Valid search|Enter “Blackburn”, click Continue|Results list displayed|
|TS2|Invalid search|Leave blank and click Continue|“Court or tribunal name must be 3 characters or more.” shown|
|TS3|Select content|Choose one publication, click Continue|Confirmation page displayed|
|TS4|Cancel removal|Select “No”, click Continue|Redirected back to Select Content page|
|TS5|Confirm removal|Select “Yes”, click Continue|Success banner displayed|
|TS6|Remove multiple|Select multiple items, click Continue|All removed, confirmation banner shown|
|TS7|Accessibility test|Navigate using keyboard|All elements reachable, focus visible|
|TS8|Error handling|Simulate backend failure|Error message displayed, system stable|
|TS9|Language toggle|Switch to Welsh|Page displays Welsh translations|
|TS10|Audit log verification|Complete a removal|Action recorded in system audit log|

—
 # 
 ## Assumptions / Open Questions

 - Confirm whether removed publications should be {**}`**`soft-deleted`**`{**} (archived) or permanently deleted.  
 - Confirm if {**}`**`audit logging`**`{**} should capture user ID, timestamp, and publication ID for all removals.  
 - Confirm whether the {**}`**`success page`**`{**} should include a link to download a removal log.  
 - Confirm if multi-language content (Welsh/English) should display both versions in the results table.  
 - Confirm if removal should automatically trigger GOV.UK unpublishing via API or require manual sync.

—', 'functional', 'verified', 'high', 'story', 251, 'https://github.com/hmcts/cath-service/issues/251', '2026-01-20T17:07:00Z', '2026-01-30T15:03:52Z', 'linusnorton', 'linusnorton'),
  (30, 'REQ-0030', 'Find content to remove', '**PROBLEM STATEMENT**

Local admins who can upload files and publish hearing lists in CaTH are also given permission to remove these publications if needed. This process is carried out in several steps.

 

**AS A** Local Admin

**I WANT** to remove a publication in CaTH

**SO THAT** the publication is no longer available to CaTH Users

 

**ACCEPTANCE CRITERIA**
 * A local admin is able to access a verified account by signing in through the sign in page with their approved log in details
 * When the local admin clicks on the ‘Remove’ tab on the dashboard, the system directs the local admin to the ‘Find content to remove’ page
 * The local admin is able to search for content to remove by typing in the ‘Search by court or tribunal name’ search tab which displays the sample descriptive text {**}‘{**}For example, Blackburn Crown Court’
 * where the local admin does not input any selection into the search bar and clicks the continue button, then the system will display the following descriptive message to prompt the user; '' There is a problem''. it will also state ''court or tribunal name must be 3 characters or more'' and highlight the search bar so the user knows where to input the information 
 
 * When a user types in the search bar, the system will display likely options that correspond with the user’s input
 * All CaTH pages specifications are maintained', 'functional', 'verified', 'medium', 'story', 252, 'https://github.com/hmcts/cath-service/issues/252', '2026-01-20T17:07:15Z', '2026-01-30T15:03:55Z', 'linusnorton', 'linusnorton'),
  (31, 'REQ-0031', 'Select content to remove', '**PROBLEM STATEMENT**

Local admins who can upload files and publish hearing lists in CaTH are also given permission to remove these publications if needed. This process is carried out in several steps.

 

**AS A** Local Admin

**I WANT** to select a publication in CaTH to remove

**SO THAT** the publication is no longer available to CaTH Users

 

**ACCEPTANCE CRITERIA**
 * A local admin is able to access a verified account by signing in through the sign in page with their approved log in details
 * When the local admin finds the content to be removed and clicks the continue button, the local admin is taken to the ‘Select content to remove’ page which displays all the published content in the specific venue selected
 * The page displays a total of all the results found with the display text ‘Showing --result(s)’
 * The local admin can see a table displaying the list type, court or tribunal name, content date, display dates, language and sensitivity of each content that’s available in the venue selected
 * The local admin can see a check box at the end of the row with each content’s details in the table that allows the selection of all the content to be deleted
 * The local admin continues the process by clicking the continue button
 * All CaTH pages specifications are maintained', 'functional', 'verified', 'medium', 'story', 253, 'https://github.com/hmcts/cath-service/issues/253', '2026-01-20T17:07:27Z', '2026-01-30T15:03:58Z', 'linusnorton', 'linusnorton'),
  (32, 'REQ-0032', 'Are you sure you want to remove this content?', '**PROBLEM STATEMENT**

Local admins who can upload files and publish hearing lists in CaTH are also given permission to remove these publications if needed. This process is carried out in several steps.

 

**AS A** Local Admin

**I WANT** to confirm the selected publication for removal

**SO THAT** i am sure i selected the right content

 

**ACCEPTANCE CRITERIA**
 * A local admin is able to access a verified account by signing in through the sign in page with their approved log in details
 * When the local admin selects the content to remove, the system re-directs to a confirmation page titled ‘Are you sure you want to remove this content?’
 * Local admin can see the details of all the selected content to be removed
 * Local admin sees two radio buttons to select yes to complete the removal or no to cancel the removal of the content
 * Where the local admin selects yes, the removal process is completed
 * Where the local admin selects no, the removal process is terminated, and the local admin is taken back to the ‘select content to remove page’
 * All CaTH pages specifications are maintained', 'functional', 'verified', 'medium', 'story', 254, 'https://github.com/hmcts/cath-service/issues/254', '2026-01-20T17:07:40Z', '2026-01-30T15:04:02Z', 'linusnorton', 'linusnorton'),
  (33, 'REQ-0033', 'File Removal Successful', '**PROBLEM STATEMENT**

Local admins who can upload files and publish hearing lists in CaTH are also given permission to remove these publications if needed. This process is carried out in several steps.

 

**AS A** Local Admin

**I WANT** to confirm that the content removal was successful  

**SO THAT** I am sure that the hearing list has been removed in CaTH

 

**ACCEPTANCE CRITERIA**
 * A local admin is able to access a verified account by signing in through the sign in page with their approved log in details
 * When the local admin clicks the continue button to complete the content removal process, a confirmation of successful file removal is displayed by the system boldly in a green banner
 * In the same banner, a descriptive text is displayed and reads ‘Your file has been removed’
 * Beneath the green banner, the user can see several links that directs them to ‘remove another file’ or ‘home’.
 * All CaTH pages specifications are maintained', 'functional', 'verified', 'medium', 'story', 255, 'https://github.com/hmcts/cath-service/issues/255', '2026-01-20T17:07:52Z', '2026-01-30T15:04:04Z', 'linusnorton', 'linusnorton'),
  (34, 'REQ-0034', 'Verified user- Account creation', '**PROBLEM STATEMENT**

Users who meet the set criteria are able to apply to create a verified account in CaTH. This ticket covers the requirements for creating an account in CaTH.

 

**AS A** CaTH User

**I WANT** to create a verified account

**SO THAT** I can access restricted information in CaTH

 

**TECHNICAL ACCEPTANCE CRITERIA**
 * The new page for create~~media~~account should sit in ''/libs/public~~pages/src/pages/create~~media~~account''. Keep the controller, nunjucks and language resources in the same place and follow the naming standard similar to other pages within public~~pages
 * The URL for the create media account page should be /create~~media~~account
 * The URL for the media account submitted page should be /account~~request~~submitted
 * When submitting media application, the image file should be stored in the temp directory in /storage/temp/files
 * The metadata for the media application should be stored in the media_application postgres table
 * The name of the image file stored un the temp directory should be the value of the id field in the media_application table plus the file extension
 * The media_application table should have the following fields:
 ** id - Unique UUID generated for a new record
 ** fullName - Full name from the form data
 ** email - Email from the form data
 ** status - Set as PENDING when the record first created
 ** requestDate - Set to the date the record first created
 ** statusDate - Set to the date the status field is updated
 * If there is an error when submitting application, the field values should remain on screen and the error highlighted in red
 * The error title on the error summary should be ''There is a problem''
 * When refreshing the page, the field values should be cleared

 

**ACCEPTANCE CRITERIA**
 * When the user clicks the account creation link on the CaTH sign in page, the user is taken to the account creation form titled ‘Create a Court and tribunal hearings account’
 * The opening wording on the form states the following;

A Court and tribunal hearings account is for professional users who require the ability to view HMCTS information such as hearing lists, but do not have the ability to create an account using MyHMCTS or Common Platform e.g. members of the media.

An account holder, once signed in, will be able choose what information they wish to receive via email and also view online information not available to the public, along with publicly available information.

We will retain the personal information you enter here to manage your user account and our service.
 * The form provides 3 text bars respectively for the user to input their full name, email address and employer
 * The following descriptive text is displayed in the email address field ‘We''ll only use this to contact you about your account and this service.’
 * A tab titled ‘choose file’ that allows the user upload their proof of identification is provided with the descriptive text ‘Upload a clear photo of your UK Press Card or work ID. ‘We will only use this to confirm your identity for this service, and will delete upon approval or rejection of your request. By uploading your document, you confirm that you consent to this processing of your data. Must be a jpg, pdf or png and less than 2mb in size’
 * The terms and conditions section is provided afterwards with the following descriptive text ‘A Court and tribunal hearing account is granted based on you having legitimate reasons to access information not open to the public e.g. you are a member of a media organisation and require extra information to report on hearings. If your circumstances change and you no longer have legitimate reasons to hold a Court and tribunal hearings account e.g. you leave your employer entered above. It is your responsibility to inform HMCTS of this for your account to be deactivated.’
 * This is followed by a check box where the ser can tick to agree to the terms and conditions. The following text is provided beside the check box ‘Please tick this box to agree to the above terms and conditions’.
 * The continue button allows the user to continue the process
 * The user can return to the top by clicking the ‘back to top’ arrow at the bottom of the page
 * When the user completes and submits the account creation form, the user sees a confirmation page titled ‘Details submitted’ in a green banner
 * The following message is displayed beneath the banner under the title ‘What happens next’ .''HMCTS will review your details.

We''ll email you if we need more information or to confirm that your account has been created.

If you do not get an email from us within 5 working days, call our courts and tribunals service centre on 0300 303 0656.''
 * All CaTH pages specifications are maintained
 * A media application table is created in the database to store the account details for each account application created

 

**Welsh translations:**

Create a Court and tribunal hearings account - Creu cyfrif gwrandawiadau Llys a Thribiwnlys

A Court and tribunal hearings account is for professional users who require the ability to view HMCTS information such as hearing lists, but do not have the ability to create an account using MyHMCTS or Common Platform e.g. members of the media.

An account holder, once signed in, will be able choose what information they wish to receive via email and also view online information not available to the public, along with publicly available information.

Mae cyfrifon gwrandawiadau Llys a Thribiwnlys yn cael eu creu ar gyfer defnyddwyr proffesiynol sydd angen gallu gweld gwybodaeth GLlTEF fel rhestrau gwrandawiadau, ond nid oes ganddynt y gallu i greu cyfrif gan ddefnyddio MyHMCTS neu’r Platfform Cyffredin e.e. aelodau o''r cyfryngau 

 

We will retain the personal information you enter here to manage your user account and our service. - Byddwn yn cadw''r wybodaeth bersonol a roir gennych yma i reoli eich cyfrif defnyddiwr a''n gwasanaethau

We''ll only use this to contact you about your account and this service - Dim ond i drafod eich cyfrif a''r gwasanaeth hwn y byddwn yn defnyddio hwn i gysylltu â chi

choose file - Dewis ffeil

We will only use this to confirm your identity for this service, and will delete upon approval or rejection of your request. By uploading your document, you confirm that you consent to this processing of your data. - Dim ond i gadarnhau pwy ydych ar gyfer y gwasanaeth hwn y byddwn yn defnyddio hwn, a byddwn yn ei ddileu wedi i''ch cais gael ei gymeradwyo neu ei wrthod.

Must be a jpg, pdf or png and less than 2mb in size - Rhaid iddi fod yn ffeil jpg, pdf, png, neu tiff.

A Court and tribunal hearing account is granted based on you having legitimate reasons to access information not open to the public e.g. you are a member of a media organisation and require extra information to report on hearings. - Caniateir ichi gael cyfrif ar gyfer gwrandawiadau llys a thribiwnlys ar yr amod bod gennych resymau cyfreithiol dros gael mynediad at wybodaeth nad yw ar gael i’r cyhoedd e.e. rydych yn aelod o sefydliad cyfryngau ac angen gwybodaeth ychwanegol i riportio ar wrandawiadau.

If your circumstances change and you no longer have legitimate reasons to hold a Court and tribunal hearings account e.g. you leave your employer entered above. - Os bydd eich amgylchiadau’n newid ac nid oes gennych mwyach resymau cyfreithiol dros gael cyfrif ar gyfer gwrandawiadau llys a thribiwnlys e.e. rydych yn gadael eich cyflogwr a enwyd uchod, eich cyfrifoldeb chi yw hysbysu GLlTEM am hyn fel y gellir dadactifadu eich cyfrif.
 
It is your responsibility to inform HMCTS of this for your account to be deactivated - Ticiwch y blwch hwn, os gwelwch yn dda i gytuno i’r telerau ac amodau uchod
 
‘Please tick this box to agree to the above terms and conditions’. - Ticiwch y blwch hwn, os gwelwch yn dda i gytuno i’r telerau ac amodau uchod

Details submitted - Cyflwyno manylion

What happens next - Beth sy''n digwydd nesaf

HMCTS will review your details. - Bydd GLlTEM yn adolygu eich manylion.

We''ll email you if we need more information or to confirm that your account has been created. - Byddwn yn anfon e-bost atoch os bydd angen mwy o wybodaeth arnom neu i gadarnhau bod eich cyfrif wedi ei greu.

If you do not get an email from us within 5 working days, call our courts and tribunals service centre on 0300 303 0656. - ''Os na fyddwch yn cael e-bost gennym o fewn 5 diwrnod gwaith, ffoniwch ein canolfan gwasanaeth llysoedd a thribiwnlysoedd ar 0300 303 0656

 

 

# VIBE-175 — Create a Verified Media Account in CaTH (Specification)

> Owner: VIBE-175  
> Updated: 13 Nov 2025

---

## Problem Statement
Users who meet the set criteria are able to apply to create a verified account in CaTH. This ticket covers the requirements for creating an account in CaTH so they can access restricted information.

## User Story
***As a*** CaTH User  
***I want to*** create a verified account  
***So that*** I can access restricted information in CaTH

---

## Technical Acceptance Criteria (Build & Infrastructure)
1. ***Page location & assets***
   - New page code resides at: `/libs/public~~pages/src/pages/create~~media-account`
   - Controller, Nunjucks templates and language resources live alongside this page using existing naming conventions.
2. ***Routes***
   - Create Media Account (GET/POST): `/create~~media~~account`
   - Submitted/Thanks page (GET): `/account~~request~~submitted`
3. ***File handling***
   - Uploaded image stored in: `/storage/temp/files`
   - Temp filename: `<media*application.id>.<original*extension>`
4. ***Persistence (PostgreSQL)***
   - Table: `media_application`
   - Columns:
     - `id` (UUID, PK, generated for new record)
     - `fullName` (text)
     - `email` (text)
     - `status` (text; initial value ***PENDING***)
     - `requestDate` (timestamp; set on create)
     - `statusDate` (timestamp; set on status change)
   - Store ***metadata*** only in DB; upload path/filename implied by `id`.
5. ***Form behaviour***
   - On server-side validation error: ***retain field values*** and highlight invalid fields in red; show error summary with title ***“There is a problem”***.
   - On ***browser refresh***, clear field values.
6. ***Non-functional***
   - Follow CaTH/GDS page spec, Nunjucks templating, i18n resource placement, CSRF, and standard logging.

---

## Acceptance Criteria (Functional)
1. From CaTH ***sign-in page*** the “create account” link routes to the form titled ***Create a Court and tribunal hearings account***.
2. Opening wording appears as supplied (see ***Content***).
3. The form includes inputs for ***Full name****, ***Email address***, ***Employer***; an ***ID proof*** file upload; a ***terms*** checkbox; and a ***Continue** button.
4. Email helper text is displayed under the email field.
5. Upload control text and constraints appear as supplied; valid types: ***jpg, pdf, png****; ***< 2MB**.
6. Terms and conditions content appears; user must tick the checkbox to proceed.
7. A “Back to top” arrow appears at page bottom.
8. Upon successful submission, user is redirected to ***Details submitted*** confirmation page with the supplied ***What happens next*** text.
9. Data is saved to ***media_application*** table; file saved in temp directory with the specified naming convention.
10. All CaTH page specifications are maintained.

---

# Pages

## Page 1 — Create Media Account (Form)

### Wireframe

┌──────────────────────────────────────────────────────────────────────────┐
│ < Back │
│ Create a Court and tribunal hearings account │
│ │
│ <Opening wording paragraphs> │
│ │
│ Full name <{**}> │{**}
{**}│ Email address <{**}> │
│ Helper: We''ll only use this to contact you about your account │
│ and this service. │
│ Employer <*__**__**__**__**__**__**__*> │
│ │
│ Proof of identification │
│ <Choose file> (jpg/pdf/png, <2MB) │
│ Helper: Upload a clear photo of your UK Press Card or work ID... │
│ │
│ Terms and conditions │
│ < > Please tick this box to agree to the above terms and conditions │
│ │
│ <Continue> (primary) │
│ │
│ ↑ Back to top │
└──────────────────────────────────────────────────────────────────────────┘

 


### Form fields
| Field             | Type        | Required | Validation                                                                 |
|~~--~~~~--~~~~--~~~~--~~~~--|~~~~--~~~~--~~~~--~~|~~--~~~~--~~~~-|~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~|
| fullName          | Text        | Yes      | 1–100 chars; alphabetic + spaces + common punctuation                      |
| email             | Email       | Yes      | RFC-compliant format                                                        |
| employer          | Text        | Yes      | 1–120 chars                                                                 |
| idProof           | File upload | Yes      | Single file; ***.jpg/.jpeg, .pdf, .png****; ***≤ 2MB**                          |
| termsAccepted     | Checkbox    | Yes      | Must be checked                                                             |

### Content (bilingual per element)
***EN:*** Title/H1 — “Create a Court and tribunal hearings account”  
***CY:*** Title/H1 — “Creu cyfrif gwrandawiadau Llys a Thribiwnlys”

***EN:*** Opening text —  
“A Court and tribunal hearings account is for professional users who require the ability to view HMCTS information such as hearing lists, but do not have the ability to create an account using MyHMCTS or Common Platform e.g. members of the media.

An account holder, once signed in, will be able choose what information they wish to receive via email and also view online information not available to the public, along with publicly available information.

We will retain the personal information you enter here to manage your user account and our service.”  
***CY:*** Opening text —  
“Mae cyfrifon gwrandawiadau Llys a Thribiwnlys yn cael eu creu ar gyfer defnyddwyr proffesiynol sydd angen gallu gweld gwybodaeth GLlTEF fel rhestrau gwrandawiadau, ond nid oes ganddynt y gallu i greu cyfrif gan ddefnyddio MyHMCTS neu’r Platfform Cyffredin e.e. aelodau o''r cyfryngau

Byddwn yn cadw''r wybodaeth bersonol a roir gennych yma i reoli eich cyfrif defnyddiwr a''n gwasanaethau”

***EN:*** Email helper — “We''ll only use this to contact you about your account and this service.”  
***CY:*** Email helper — “Dim ond i drafod eich cyfrif a''r gwasanaeth hwn y byddwn yn defnyddio hwn i gysylltu â chi”

***EN:*** Upload control — “choose file”  
***CY:*** Upload control — “Dewis ffeil”

***EN:*** Upload helper — “Upload a clear photo of your UK Press Card or work ID. We will only use this to confirm your identity for this service, and will delete upon approval or rejection of your request. By uploading your document, you confirm that you consent to this processing of your data. Must be a jpg, pdf or png and less than 2mb in size”  
***CY:*** Upload helper — “Dim ond i gadarnhau pwy ydych ar gyfer y gwasanaeth hwn y byddwn yn defnyddio hwn, a byddwn yn ei ddileu wedi i''ch cais gael ei gymeradwyo neu ei wrthod. Trwy uwchlwytho eich dogfen, rydych yn cadarnhau eich bod yn cydsynio i’r prosesu hwn o’ch data. Rhaid iddi fod yn ffeil jpg, pdf, png, neu tiff.”

***EN:*** Terms text — “A Court and tribunal hearing account is granted based on you having legitimate reasons to access information not open to the public e.g. you are a member of a media organisation and require extra information to report on hearings. If your circumstances change and you no longer have legitimate reasons to hold a Court and tribunal hearings account e.g. you leave your employer entered above. It is your responsibility to inform HMCTS of this for your account to be deactivated.”  
***CY:*** Terms text — “Caniateir ichi gael cyfrif ar gyfer gwrandawiadau llys a thribiwnlys ar yr amod bod gennych resymau cyfreithiol dros gael mynediad at wybodaeth nad yw ar gael i’r cyhoedd e.e. rydych yn aelod o sefydliad cyfryngau ac angen gwybodaeth ychwanegol i riportio ar wrandawiadau. Os bydd eich amgylchiadau’n newid ac nid oes gennych mwyach resymau cyfreithiol dros gael cyfrif ar gyfer gwrandawiadau llys a thribiwnlys e.e. rydych yn gadael eich cyflogwr a enwyd uchod, eich cyfrifoldeb chi yw hysbysu GLlTEM am hyn fel y gellir dadactifadu eich cyfrif.”

***EN:*** Checkbox label — “Please tick this box to agree to the above terms and conditions”  
***CY:*** Checkbox label — “Ticiwch y blwch hwn, os gwelwch yn dda i gytuno i’r telerau ac amodau uchod”

***EN:*** Button — “Continue”  
***CY:*** Button — “Parhau”

***EN:*** Link — “Back to top”  
***CY:*** Link — “Yn ôl i’r brig”

### Errors (inline + error summary titled “There is a problem”)
***EN:***  
- “Enter your full name”  
- “Enter an email address in the correct format, like name@example.com”  
- “Enter your employer”  
- “Select a file in .jpg, .pdf or .png format”  
- “Your file must be smaller than 2MB”  
- “Select the checkbox to agree to the terms and conditions”  
***CY:***  
- “Nodwch eich enw llawn”  
- “Nodwch gyfeiriad e-bost yn y fformat cywir, e.e. name@example.com”  
- “Nodwch enw eich cyflogwr”  
- “Dewiswch ffeil yn fformat .jpg, .pdf neu .png”  
- “Rhaid i’ch ffeil fod yn llai na 2MB”  
- “Dewiswch y blwch i gytuno i’r telerau ac amodau”

### Back navigation
- ***Back*** to previous page; ***Back to top*** scrolls to H1.

---

## Page 2 — Account Request Submitted (Confirmation)

### Wireframe

┌──────────────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ ✓ Details submitted │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ │
│ What happens next │
│ HMCTS will review your details. │
│ We''ll email you if we need more information or to confirm that your │
│ account has been created. │
│ If you do not get an email from us within 5 working days, call our │
│ courts and tribunals service centre on 0300 303 0656. │
└──────────────────────────────────────────────────────────────────────────┘

 


### Content (bilingual per element)
***EN:*** Banner — “Details submitted”  
***CY:*** Banner — “Cyflwyno manylion”

***EN:*** Section title — “What happens next”  
***CY:*** Section title — “Beth sy''n digwydd nesaf”

***EN:*** Body —  
“HMCTS will review your details.

We''ll email you if we need more information or to confirm that your account has been created.

If you do not get an email from us within 5 working days, call our courts and tribunals service centre on 0300 303 0656.”  
***CY:*** Body —  
“Bydd GLlTEM yn adolygu eich manylion.

Byddwn yn anfon e-bost atoch os bydd angen mwy o wybodaeth arnom neu i gadarnhau bod eich cyfrif wedi ei greu.

''Os na fyddwch yn cael e-bost gennym o fewn 5 diwrnod gwaith, ffoniwch ein canolfan gwasanaeth llysoedd a thribiwnlysoedd ar 0300 303 0656”

### Errors
- None (success page).

### Back navigation
- ***Back*** to form (optional) or to landing per standard pattern.

---

## Data Model & Storage

### Database
- ***Table:*** `media_application`
- ***Columns:***
  - `id` UUID ***PK*** (generated on create)
  - `fullName` text (from form)
  - `email` text (from form; lower-cased)
  - `status` text (`PENDING` on create)
  - `requestDate` timestamp (UTC now on create)
  - `statusDate` timestamp (UTC; updated on status changes)

### File storage
- ***Directory:*** `/storage/temp/files`
- ***Filename:*** `<id>.<ext>` (ext from original upload; allowed: jpg, jpeg, pdf, png)

---

## Server~~Side Flow (POST `/create~~media-account`)
1. Validate CSRF.
2. Parse multipart form:
   - `fullName`, `email`, `employer`, `termsAccepted`, `idProof`.
3. ***Validate***:
   - Required fields present.
   - Email format valid.
   - File present; type ∈ \{jpg/jpeg/pdf/png}; size ≤ 2MB.
   - Terms checked.
4. ***On validation error***:
   - Re-render form with:
     - ***Error summary*** titled ***“There is a problem”***
     - Inline errors + red highlights
     - ***Retain field values*** (inputs); re-prompt for file if security policy requires.
5. ***On success***:
   - Create DB row with `status=PENDING`, set `requestDate`.
   - Persist file to `/storage/temp/files/<id>.<ext>`.
   - Redirect ***303*** to `/account~~request~~submitted`.
6. ***On page refresh***:
   - GET renders with ***cleared*** field values.

---

## Validation Rules
- ***Field-level***
  - `fullName`: 1–100 chars.
  - `email`: valid RFC email.
  - `employer`: 1–120 chars.
  - `idProof`: type and size as above.
  - `termsAccepted`: must be `true`.
- ***Error handling***
  - Display error summary + anchor links to fields.
  - Inputs with errors get aria attributes and error messages.

---

## URLs & Templates
- GET `/create~~media~~account` → render `create~~media~~account.njk`
- POST `/create~~media~~account` → controller `create~~media~~account.controller.ts`
- GET `/account~~request~~submitted` → render `account~~request~~submitted.njk`
- Localised strings: `/libs/public~~pages/src/pages/create~~media-account/locales/\{en,cy}.json`

---

## Accessibility
- Conform to ***WCAG 2.2 AA*** and ***GOV.UK Design System***.
- Use `<fieldset>`/`<legend>` for terms section; associate labels/inputs with `for`/`id`.
- Error summary uses `role="alert"` and focuses on load.
- Inputs include `aria-describedby` linking to error/help text.
- File input announces accepted types and size limit.
- Keyboard-only navigation with visible focus rings.
- Language toggle retains page context; does ***not*** auto-clear values except on refresh.

---

## Test Scenarios
| ID | Scenario | Steps | Expected Result |
|~~--~~|~~--~~~~--~~~~|-~~~~--~~~~|-~~~~--~~~~--~~~~--~~---|
| TS1 | Navigate to form | GET `/create~~media~~account` | Form renders with correct title and opening text |
| TS2 | Submit empty | POST with no fields | Error summary “There is a problem”; inline errors shown; values retained |
| TS3 | Invalid email | Enter bad email → submit | Email error; other values retained |
| TS4 | Missing file | Omit file → submit | File error; summary + inline |
| TS5 | Wrong type | Upload `.tiff` | Error: only jpg/pdf/png accepted |
| TS6 | Too large | Upload >2MB | Error: file must be smaller than 2MB |
| TS7 | Terms unchecked | Leave checkbox off → submit | Error demanding agreement |
| TS8 | Success path | Valid inputs + file → submit | Row created (PENDING), file saved to `/storage/temp/files/<id>.<ext>`, redirect to `/account~~request~~submitted` |
| TS9 | Refresh clears | Refresh form page | Fields are cleared |
| TS10 | Error summary title | Trigger any error | Title equals ***“There is a problem”*** |
| TS11 | i18n EN/CY | Toggle language | Content updates; layout intact |
| TS12 | Security | CSRF missing | Request rejected (standard pattern) |

---

## Risks & Ambiguities (for review)
- ***File type mismatch:*** Welsh helper mentions ***TIFF*** but accepted types are ***jpg/pdf/png*** only; this could confuse users. **(Flagging to confirm single source of truth.)**
- ***Refresh vs retain:*** Requirement to ***retain values on error*** but ***clear on page refresh*** can surprise users; ensure explicit refresh behaviour and avoid caching causing unintended persistence. **(Flagging to confirm desired UX.)**
- ***Employer field persistence on error when file fails:*** If security policy blocks repopulating some fields, clarify exceptions. **(Flagging to confirm.)**

---', 'functional', 'verified', 'high', 'story', 256, 'https://github.com/hmcts/cath-service/issues/256', '2026-01-20T17:08:04Z', '2026-01-30T15:04:07Z', 'linusnorton', 'linusnorton'),
  (35, 'REQ-0035', 'Verified user- Account creation Confirmation', '**PROBLEM STATEMENT**

Users who meet the set criteria are able to apply to create a verified account in CaTH. This ticket covers the requirements for creating an account in CaTH.

 

**AS A** CaTH User

**I WANT** to confirm my account creation form has been submitted

**SO THAT** I can access restricted information in CaTH

 

**ACCEPTANCE CRITERIA**
 * When the user completes and submits the account creation form, the user sees a confirmation page titled ‘Details submitted’ in a green banner
 * The following message is displayed beneath the banner under the title ‘What happens next’

HMCTS will review your details.

We''ll email you if we need more information or to confirm that your account has been created.

If you do not get an email from us within 5 working days, call our courts and tribunals service centre on 0300 303 0656.
 * All CaTH pages specifications are maintained', 'functional', 'verified', 'high', 'story', 257, 'https://github.com/hmcts/cath-service/issues/257', '2026-01-20T17:08:25Z', '2026-01-30T15:04:09Z', 'linusnorton', 'linusnorton'),
  (36, 'REQ-0036', 'Upload Reference Data', '**PROBLEM STATEMENT**

This ticket is raised to upload the reference data needed to publish hearing lists in CaTH.

 

**AS A** System Admin

**I WANT** to upload reference data in CaTH

**SO THAT** the reference data needed for publishing hearing lists is available in CaTH

 

**Technical Criteria**
 * Tables created for Location, Jurisdiction, Sub-Jurisdiction and Region based on mock data
 * Pre~~loading of jurisdiction, Sub~~jurisdiction and region tables with ref data
 * If location ID already exists, overwrite else create new
 * If Sub jurisdiction and region lookups fail, error to be displayed
 * If any row fails validation, no locations are updated and user error is displayed
 * If text contains HTML tags, upload should fail. Regex: <<^>>+>
 * If location name or welsh location name already exists within the DB or a duplicate within the file itself, upload should fail. Add constraint to table for this.

 

**ACCEPTANCE CRITERIA**
 * A master Court reference data will be created as a CSV file to store all required court reference data for upload in CaTH
 * The csv file contains columns titled as follows; LOCATION*ID (PK - Integer), LOCATION*NAME, WELSH*LOCATION*NAME, SUB*JURISDICTION*NAME (Lookup only - ID is stored in DB), REGION_NAME (Lookup only - ID is stored in DB)
 * The Court master reference data CSV file is uploaded in CaTH through the ''Upload Reference Data'' tile on the system admin dashboard in CaTH
 * The CSV file should be max size 2MB and must be in the right format for it to be manually uploaded in CaTH
 * System admin begins the upload process by clicking on the ‘Upload reference data'' tile on the system admin dashboard 
 * The system admin is taken to the page titled ‘Manually upload a csv file’ 
 * Above the title, a ''warning'' is displayed in a grey banner with the warning logo and the descriptive message ''Prior to upload you must ensure the file is suitable for location data upload e.g. file should be in correct formats.''
 * Underneath the page title is a link to ''Download current reference data''
 * This is followed by a descriptive message that states ''Manually upload a csv file (saved as Comma-separated Values .csv), max size 2MB'' and a ''choose file'' tab
 * The system admin clicks on the ‘choose file’ tab to upload the csv file and clicks the green ''Continue'' button to continue the upload process

 * The system admin is taken to the next page titled ''Check upload details'' which displays row with ''File'' in the first column of the row and the uploaded file name in the 2nd column and then in the 3rd column a link to make changed to the uploaded file is masked in the text ''change'' followed by a green ''confirm'' button
 * The system admin clicks the confirm button after checking the uploaded file details to complete the upload process or clicks the ‘change link to change the uploaded file
 * Where there is an error with the uploaded file, then the following message is displayed in a red box ''There is a problem'' followed by the following text in red colour Unable to upload reference data file, please verify that provided fields are correct'' 

 * Upon successful upload, a confirmation screen with green coloured banner displays ''File Upload Successful'' as the header and a sub-header in the same banner displays the descriptive message ''Your file has been uploaded''.  Underneath the banner is another section titled '' What do you want to do next?'' and beneath that are 2 action links ''Upload another file'' and ''Home'' which take the user back to the upload page and to the system admin dashboard respectively.

 * All CaTH page specifications are maintained. 

 
 # VIBE-180 Upload Reference Data Specification

> Owner: {**}`**`VIBE-180`**`{**} · Updated: {**}`**`24 Oct 2025`**`{**}

—
 # 
 ## Problem Statement

This ticket is raised to upload the reference data needed to publish hearing lists in CaTH.  
The system must allow a System Admin to manually upload a reference data CSV file through the CaTH System Admin Dashboard.

—
 # 
 ## User Story

{**}`**`As a`**`{**} **System Admin**  
{**}`**`I want to`**`{**} **upload reference data in CaTH**  
{**}`**`So that`**`{**} **the reference data needed for publishing hearing lists is available in CaTH**

—
 # 
 ## Acceptance Criteria

1. A {**}`**`master Court reference data file`**`{**} is created as a CSV to store all required court reference data for upload into CaTH.  
2. The CSV file contains the following columns:  
   - CONTACT  
   - COURT DESC  
   - EMAIL  
   - JURISDICTION  
   - JURISDICTION TYPE  
   - P&I ID  
   - PROVENANCE  
   - PROVENANCE LOCATION ID  
   - PROVENANCE LOCATION TYPE  
   - REGION  
   - WELSH COURT DESC  
   - WELSH JURISDICTION  
   - WELSH JURISDICTION TYPE  
   - WELSH REGION  
3. The Court master reference data CSV file is uploaded via the {**}`**`‘Upload Reference Data’`**`{**} tile on the System Admin Dashboard.  
4. The CSV file must:  
   - Be a valid `.csv` format (Comma-Separated Values)  
   - Have a {**}`**`maximum file size of 2MB`**`{**}  
5. The System Admin initiates the process by clicking the {**}`**`‘Upload Reference Data’`**`{**} tile.  
6. The admin is taken to a page titled {**}`**`‘Manually upload a csv file’`**`{**}.  
7. A grey {**}`**`warning banner`**`{**} is displayed at the top with a warning icon and the message:  
   > “Prior to upload you must ensure the file is suitable for location data upload e.g. file should be in correct formats.”  
8. Below the title, a {**}`**`‘Download current reference data’`**`{**} link is displayed.  
9. Beneath this, a descriptive text reads:  
   > “Manually upload a csv file (saved as Comma-separated Values .csv), max size 2MB”  
10. A {**}`**`‘Choose file’`**`{**} tab allows the admin to select the file, and a {**}`**`green ‘Continue’`**`{**} button proceeds with the upload.  
11. On clicking Continue, the system navigates to the {**}`**`‘Check upload details’`**`{**} page.  
12. The page displays:  
    - A row with {**}`**`File`**`{**} in the first column, the uploaded filename in the second, and a {**}`**`‘change’`**`{**} link in the third.  
    - A {**}`**`green ‘Confirm’`**`{**} button beneath to confirm the upload.  
13. The admin can click {**}`**`‘Change’`**`{**} to reselect a file, or {**}`**`‘Confirm’`**`{**} to complete the upload.  
14. If there is an error with the file, a red box appears with:  
    - Header: {**}`**`“There is a problem”`**`{**}  
    - Message: {**}`**`“Unable to upload reference data file, please verify that provided fields are correct.”`**`{**}  
15. Upon successful upload, a green confirmation banner displays:  
    - Header: {**}`**`“File upload successful”`**`{**}  
    - Sub-header: {**}`**`“Your file has been uploaded.”`**`{**}  
16. Beneath the banner, a section titled {**}`**`“What do you want to do next?”`**`{**} displays two action links:  
    - {**}`**`Upload another file`**`{**} → returns to the upload page  
    - {**}`**`Home`**`{**} → returns to the System Admin Dashboard  
17. All CaTH page and accessibility standards are maintained.

—
 # 
 ## User Journey Flow

1. System Admin signs in using SSO credentials.  
2. Admin clicks {**}`**`Upload Reference Data`**`{**} on the Dashboard.  
3. The {**}`**`Upload CSV page`**`{**} loads with a warning and file selection area.  
4. Admin selects a `.csv` file and clicks {**}`**`Continue`**`{**}.  
5. The {**}`**`Check upload details`**`{**} page loads, showing the filename and options to {**}`**`Change`**`{**} or {**}`**`Confirm`**`{**}.  
6. If confirmed, the system validates the file:  
   - On success → Success page displays.  
   - On error → Error message displayed.  
7. On success, admin can either upload another file or return home.

—
 # 
 ## Wireframes

 # 
 ## 
 ### A. Upload Reference Data Page

┌──────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK <Language Toggle> │
├──────────────────────────────────────────────────────────────────────────────┤
│ HMCTS – Courts and Tribunals Hearings (CaTH) │
├──────────────────────────────────────────────────────────────────────────────┤
│ ⚠️ Prior to upload you must ensure the file is suitable for location data │
│ upload e.g. file should be in correct formats. │
│ │
│ Manually upload a csv file │
│ <Download current reference data> │
│ │
│ Manually upload a csv file (saved as Comma-separated Values .csv), │
│ max size 2MB │
│ <Choose file> │
│ <Continue> (Green Button) │
└──────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## 
 ### B. Check Upload Details Page

┌──────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK <Language Toggle> │
├──────────────────────────────────────────────────────────────────────────────┤
│ HMCTS – Courts and Tribunals Hearings (CaTH) │
├──────────────────────────────────────────────────────────────────────────────┤
│ Check upload details │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ File | reference*data*2025.csv | change │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ <Confirm> (Green Button) │
└──────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## 
 ### C. Error Page

┌──────────────────────────────────────────────────────────────────────────────┐
│ ❌ There is a problem │
│ Unable to upload reference data file, please verify that provided fields │
│ are correct. │
└──────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## 
 ### D. Upload Success Page

┌──────────────────────────────────────────────────────────────────────────────┐
│ ✅ File upload successful │
│ Your file has been uploaded. │
│ │
│ What do you want to do next? │
│ • Upload another file │
│ • Home │
└──────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## Form Fields

|Field|Type|Required|Description|Validation|
|~~--~~~~--~~|~~--~~~~-|~~~~--~~~~--~~~~-|~~~~--~~~~--~~~~--~~~~|-~~~~--~~~~--~~---|
|Choose file|File upload|Yes|Accepts .csv files only|Must be .csv format and ≤ 2MB|
|Confirm|Button|Yes|Submits the upload for validation|Enabled after file selection|

—
 # 
 ## Content

{**}`**`EN:`**`{**}  
 - Warning Banner — “Prior to upload you must ensure the file is suitable for location data upload e.g. file should be in correct formats.”  
 - Page Title — “Manually upload a csv file”  
 - Description — “Manually upload a csv file (saved as Comma-separated Values .csv), max size 2MB”  
 - Link — “Download current reference data”  
 - Buttons — “Continue”, “Confirm”, “Change”  
 - Success Banner — “File upload successful”, “Your file has been uploaded.”  
 - Section Title — “What do you want to do next?”  
 - Links — “Upload another file”, “Home”  
 - Error Message — “Unable to upload reference data file, please verify that provided fields are correct.”  

{**}`**`CY:`**`{**}  
 - Warning Banner — “Welsh placeholder”  
 - Page Title — “Welsh placeholder”  
 - Description — “Welsh placeholder”  
 - Link — “Welsh placeholder”  
 - Buttons — “Welsh placeholder”, “Welsh placeholder”, “Welsh placeholder”  
 - Success Banner — “Welsh placeholder”, “Welsh placeholder”  
 - Section Title — “Welsh placeholder”  
 - Links — “Welsh placeholder”, “Welsh placeholder”  
 - Error Message — “Welsh placeholder”

—
 # 
 ## URL Structure

|Page|URL|
|~~--~~~~-|~~---|
|Upload reference data|`/admin/upload~~reference~~data`|
|Check upload details|`/admin/upload~~reference~~data/check`|
|Success page|`/admin/upload~~reference~~data/success`|
|Error page|`/admin/upload~~reference~~data/error`|

—
 # 
 ## Validation Rules

 - Only authenticated {**}`**`System Admins`**`{**} can access upload functionality.  
 - File must be a `.csv` and ≤ 2MB; otherwise, show an error message.  
 - The file name must not contain special characters.  
 - System validates file headers against required column names.  
 - Successful upload triggers success confirmation; invalid headers trigger the error message.  

—
 # 
 ## Error Messages

{**}`**`EN:`**`{**}  
 - “Unable to upload reference data file, please verify that provided fields are correct.”  
 - “There is a problem.”  
 - “File exceeds the maximum size limit (2MB).”  
 - “Unsupported file type. Please upload a .csv file.”  

{**}`**`CY:`**`{**}  
 - “Welsh placeholder”  
 - “Welsh placeholder”  
 - “Welsh placeholder”  
 - “Welsh placeholder”

—
 # 
 ## Navigation

 - {**}`**`Upload Reference Data Tile`**`{**} → `/admin/upload~~reference~~data`  
 - {**}`**`Continue`**`{**} → `/admin/upload~~reference~~data/check`  
 - {**}`**`Confirm`**`{**} → `/admin/upload~~reference~~data/success`  
 - {**}`**`Change`**`{**} → Returns to Upload Reference Data page  
 - {**}`**`Upload another file`**`{**} → `/admin/upload~~reference~~data`  
 - {**}`**`Home`**`{**} → `/admin/dashboard`  

—
 # 
 ## Accessibility

 - Must comply with {**}`**`WCAG 2.2 AA`**`{**} and {**}`**`GOV.UK Design System`**`{**} standards.  
 - Warning and success banners must have ARIA roles (`role="alert"` and `role="status"`) to ensure accessibility.  
 - File input element must be operable by keyboard.  
 - Focus must shift to the success or error banner after submission.  
 - Ensure all buttons and links have visible focus states.  
 - Provide text alternatives for icons (e.g., warning, checkmark).  

—
 # 
 ## Test Scenarios

|ID|Scenario|Steps|Expected Result|
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
|TS1|Valid upload|Select valid `.csv` file ≤ 2MB, click Continue → Confirm|File uploaded successfully|
|TS2|Invalid file format|Upload `.xls` or `.txt`|Error: “Unsupported file type.”|
|TS3|Invalid column headers|Upload `.csv` missing columns|Error message displayed|
|TS4|Exceed size limit|Upload > 2MB file|Error message displayed|
|TS5|Confirm upload|Click Confirm|Success page appears|
|TS6|Change file|Click Change|Returns to upload page|
|TS7|Success navigation|Click “Upload another file”|Returns to upload page|
|TS8|Success navigation|Click “Home”|Redirects to admin dashboard|
|TS9|Accessibility test|Use keyboard navigation only|All elements reachable and labelled|
|TS10|Screen reader test|Use assistive technology|Banner and messages announced correctly|

—
 # 
 ## Assumptions / Open Questions

 - Confirm if multiple reference data types (e.g., location, jurisdiction) will share this same upload flow.  
 - Confirm if file uploads trigger automatic database refresh or require manual review.  
 - Confirm if a log entry should be generated for each upload (e.g., timestamp, admin ID).  
 - Confirm if an email confirmation should be sent after a successful upload.  
 - Confirm if Welsh translation will be hard-coded or managed by a translation service.

—', 'functional', 'verified', 'high', 'story', 258, 'https://github.com/hmcts/cath-service/issues/258', '2026-01-20T17:08:38Z', '2026-01-30T15:04:11Z', 'linusnorton', 'linusnorton'),
  (37, 'REQ-0037', 'API connection in CaTH', '**PROBLEM STATEMENT**

To publish hearing lists in CaTH, an API connection is needed to receive data from validated data sources.

 

**AS A** System Admin

**I WANT** to set up an API connection

**SO THAT** CaTH can receive hearing data needed to publish court hearing lists

 

**ACCEPTANCE CRITERIA**
 * An API is set up from CaTH to common platform to receive hearing data
 * Data sources are validated prior to API connection
 * The API is tested to ensure the data is received correctly 

 

# VIBE-182 API Connection Setup Specification

> Owner: ***VIBE-182*** · Updated: ***24 Oct 2025***

---

## Problem Statement

To publish hearing lists in CaTH, an ***API connection*** is required to receive validated hearing data from authorized source systems (e.g., Common Platform).  
This connection must ensure secure, accurate, and consistent data transfer between the source systems and CaTH.

---

## User Story

***As a*** **System Admin**  
***I want to*** **set up an API connection**  
***So that*** **CaTH can receive hearing data needed to publish court hearing lists**

---

## Acceptance Criteria

1. An ***API connection*** is successfully established between ***CaTH*** and the ***Common Platform*** (or other authorized data sources).  
2. All data sources are ***validated and approved*** prior to connection setup.  
3. The API is ***tested*** to confirm that hearing data is successfully received, structured, and stored in the CaTH system according to the validation schema.  
4. Data received through the API must conform to CaTH’s ***data integrity and security protocols***.  
5. Any failed API connection or data validation issue must be ***logged and reported*** to the System Admin for resolution.  
6. All setup and connection processes must comply with ***GOV.UK security and accessibility standards***.

---

## Preconditions

- The ***Common Platform API*** endpoints are active, authenticated, and tested externally.  
- CaTH has the ***necessary credentials*** (e.g., API keys, OAuth tokens, or certificates) to authenticate requests.  
- The ***validation schema*** for hearing data ingestion has been defined and documented.  
- CaTH infrastructure (application and database) is ready to receive and process hearing data.  

---

## User Journey Flow

1. System Admin logs into the CaTH Admin Portal.  
2. The Admin navigates to ***System Configuration → API Connections***.  
3. The Admin selects ***“Set up new API connection”***.  
4. The Admin inputs required API configuration details:  
   - Source System Name (e.g., Common Platform)  
   - Base URL / Endpoint  
   - Authentication Type (API Key, OAuth, Certificate)  
   - Credentials or Token  
   - Connection Type (Inbound / Outbound)  
   - Description  
5. The Admin clicks ***“Test Connection”***.  
6. The system sends a test request to verify:  
   - Successful authentication.  
   - Data is received in the correct structure.  
7. If the test passes, the Admin saves the configuration by clicking ***“Activate Connection.”***  
8. CaTH confirms the connection with a success message.  
9. If validation fails, the Admin is shown an error message and prompted to recheck configuration details.  

---

## Wireframe

 

┌──────────────────────────────────────────────────────────────────────────┐
│ GOV.UK <Language Toggle>│
├──────────────────────────────────────────────────────────────────────────┤
│ HMCTS – Courts and Tribunals Hearings (CaTH) │
├──────────────────────────────────────────────────────────────────────────┤
│ < Back │
│ │
│ Set up API Connection │
│ │
│ Source system name <{*}**> │**{*}
{*}**│ API endpoint (Base URL) <**{*}> │
│ Authentication type <Dropdown: API Key / OAuth / Certificate>│
│ Authentication token/credential <*__**__**__**__**__**__*_{**}> │{**}
**│ Connection type <Dropdown: Inbound / Outbound> │**
{**}│ Description <{**}*__**__**__**__**__**__**__**__*___> │
│ │
│ <Test Connection> (Grey Button) │
│ <Activate Connection> (Green Button) │
│ │
│ Connection Status: ✓ Successfully connected to Common Platform API │
└──────────────────────────────────────────────────────────────────────────┘

 


---

## Form Fields

| Field | Type | Required | Description | Validation |
|~~--~~~~--~~|~~--~~~~-|~~~~--~~~~--~~~~-|~~~~--~~~~--~~~~--~~~~|-~~~~--~~~~--~~---|
| Source system name | Text | Yes | Name of data source (e.g., Common Platform) | Must not be empty |
| API endpoint (Base URL) | Text (URL) | Yes | Full endpoint of API | Must be a valid HTTPS URL |
| Authentication type | Dropdown | Yes | Type of authentication used | Must select one |
| Authentication token / credential | Text (secured) | Yes | Token, key, or certificate reference | Must meet encryption standards |
| Connection type | Dropdown | Yes | Defines direction of communication | Inbound (data received) or Outbound (data sent) |
| Description | Text | Optional | Notes or remarks for internal tracking | Up to 250 characters |

---

## Content

***EN:***  
- Page Title — “Set up API Connection”  
- Buttons — “Test Connection”, “Activate Connection”  
- Success Message — “Successfully connected to Common Platform API.”  
- Error Message — “Unable to establish API connection. Please verify endpoint and credentials.”  

***CY:***  
- Page Title — “Sefydlu Cysylltiad API”  
- Buttons — “Profi Cysylltiad”, “Gweithredu Cysylltiad”  
- Success Message — “Wedi cysylltu’n llwyddiannus â’r API Llwyfan Cyffredin.”  
- Error Message — “Methu sefydlu cysylltiad API. Gwiriwch bwynt diwedd a manylion dilysu.”  

---

## URL Structure

| Page | URL |
|~~--~~~~-|~~~~--~~|
| API Connection Setup | `/admin/api-connection` |
| API Test Endpoint | `/admin/api-connection/test` |
| API Activation Confirmation | `/admin/api-connection/confirm` |

---

## Validation Rules

- All required fields must be completed before testing the connection.  
- Connection test must validate both network reachability and authentication success.  
- Only ***HTTPS*** endpoints are permitted (no HTTP).  
- API tokens must be encrypted before storage.  
- Validation schema for received data must be applied during test request.  
- Error responses from API must include status codes and descriptions for debugging.  

---

## Error Messages

***EN:***  
- “Unable to establish API connection. Please check your network settings.”  
- “Authentication failed. Invalid credentials or expired token.”  
- “Endpoint not found. Verify the base URL.”  
- “Test failed: data format invalid against validation schema.”  

***CY:***  
- “Methu sefydlu cysylltiad API. Gwiriwch eich gosodiadau rhwydwaith.”  
- “Methwyd dilysu. Tocyn neu fanylion anghywir.”  
- “Heb ganfod pwynt diwedd. Gwiriwch yr URL sylfaenol.”  
- “Methwyd y prawf: fformat data’n annilys yn erbyn y cynllun dilysu.”  

---

## Navigation

- ***Dashboard → API Connection Setup***  
- ***Test Connection*** → Initiates live connection test to selected source system.  
- ***Activate Connection*** → Saves configuration and enables automatic data ingestion.  
- ***Back*** → Returns to Dashboard.  

---

## Accessibility

- Must comply with ***WCAG 2.2 AA*** and ***GOV.UK Design System*** standards.  
- All form fields must have clear and descriptive labels.  
- Buttons must have visible focus outlines for keyboard navigation.  
- Success and error banners must include appropriate ARIA roles (`role="status"` or `role="alert"`).  
- Form errors must be announced to assistive technologies.  
- Inputs must support keyboard-only interaction.  

---

## Test Scenarios

| ID | Scenario | Steps | Expected Result |
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
| TS1 | Valid connection test | Enter valid API endpoint and credentials, click “Test Connection” | Connection success message displayed |
| TS2 | Invalid credentials | Enter wrong token, click “Test Connection” | Authentication failed error displayed |
| TS3 | Invalid endpoint | Enter incorrect URL | “Endpoint not found” error displayed |
| TS4 | Data validation failure | Connect to endpoint returning invalid data | “Test failed: data format invalid” message displayed |
| TS5 | Activate connection | After successful test, click “Activate Connection” | Connection saved and activated |
| TS6 | Missing required fields | Leave one or more fields blank | Inline validation errors displayed |
| TS7 | Accessibility | Navigate form using keyboard only | All fields and buttons reachable |
| TS8 | Security validation | Attempt to enter non-HTTPS URL | Error message “HTTPS required” displayed |
| TS9 | Welsh translation | Switch to Welsh | Page displays Welsh text equivalents |
| TS10 | Logging verification | Complete API setup successfully | Audit log entry created with timestamp and admin ID |

---

## Assumptions / Open Questions

- Confirm if CaTH supports multiple simultaneous API connections (e.g., XHIBIT, LIBRA, Common Platform).  
- Confirm whether automatic token refresh should be implemented for OAuth connections.  
- Confirm if data schema validation should occur in real time during test connection or post-ingestion.  
- Confirm the frequency of scheduled health checks on API connections.  
- Confirm if CaTH should notify admins automatically if a connection fails or becomes inactive.

---', 'functional', 'verified', 'high', 'story', 259, 'https://github.com/hmcts/cath-service/issues/259', '2026-01-20T17:08:53Z', '2026-01-30T15:04:14Z', 'linusnorton', 'linusnorton'),
  (38, 'REQ-0038', 'Create Database schema for Location Details (Location, Jurisdiction, Sub-Jurisdictions, Region)', '**PROBLEM STATEMENT**

This ticket is raised to create the database schema to store the location details.

 

**AS A** Service

**I WANT** to create a new table in the database schema

**SO THAT** I can store the publication details

 

**JURISDICTIONS TABLE**
 * A new table is created in the database to store the location details
 * The table will contain the following data fields, Location, Jurisdiction, Sub-Jurisdictions, Region
 * See sample table below;

 
|**Location**|**Jurisdiction**|**Sub-Jurisdiction**|**Region**|
|Birmingham Social Security and Child Support|Tribunal|Social Security and Child Support|West Midlands|
|Slough County Court and Family Court|Civil; Family|Civil Court; Family Court|South East|
|Single Justice Procedure|Crime|Magistrates Court|London; North East; North West; Yorkshire; Midlands; South East; East of England; South West; Wales|
|Basildon Combined Court|Civil; Family; Crime|Civil Court; Family Court; Crown Court|South East|

 

 

 

**WELSH TRANSLATION**
 * Location - Lleoliad
 * Jurisdiction - Awdurdodaeth
 * Sub-Jurisdictions -
 * Region - Rhanbarth', 'functional', 'verified', 'medium', 'story', 260, 'https://github.com/hmcts/cath-service/issues/260', '2026-01-20T17:09:05Z', '2026-01-30T15:04:17Z', 'linusnorton', 'linusnorton'),
  (39, 'REQ-0039', 'Verified User – Dashboard', '**PROBLEM STATEMENT**

Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH. The landing page in CaTH for a media verified user is the dashboard.

 

**AS A** Verified Media User

**I WANT** to access the dashboard in CaTH

**SO THAT** I can view restricted hearing information and subscribe to email notifications

 

**ACCEPTANCE CRITERIA**
 * A verified user is a member of the media who has been verified and has an approved account in CaTH.
 * A verified user can sign into CaTH to view restricted hearing information and subscribe to email notifications.
 * The verified user can see the Dashboard as soon as the user signs in
 * At the top of the page user can see a clickable link to see 3 pages provided in these texts <Court and tribunal hearings>(https://www.court~~tribunal~~hearings.service.gov.uk/) , <Dashboard>(https://www.court~~tribunal~~hearings.service.gov.uk/account~~home) and <**Email subscriptions**>(https://www.court~~tribunal~~hearings.service.gov.uk/subscription~~management)
 * The verified user can see 3 tabs in the dashboard titled ‘Court and tribunal hearings’, ‘Single Justice Procedure cases’ and ‘Email subscriptions’, under a header title labelled ‘Your account’
 * In the ''Court and tribunal hearings'' tile, the following descriptive text is displayed ''View time, location, type of hearings and more.''
 * In the ''Single Justice Procedure cases'' tile, the following descriptive text is displayed ''Cases ready to be decided by a magistrate without a hearing. Includes TV licensing, minor traffic offences such as speeding and more.''
 * In the ''Email subscriptions'' tile, the following descriptive text is displayed ''Get emails about hearings from different courts and tribunals and manage your subscriptions.''
 * The verified user can navigate to the previous page using the ‘back’ link provided at the top left of the page
 * All CaTH pages specifications are maintained

 

VIBE-191 Dashboard Access Specification

> Owner: **{*}VIBE-191{**}* · Updated: **{*}22 Oct 2025{**}*

—
 # 
 ## Problem Statement

Verified users are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH.  
The landing page in CaTH for a verified media user is the **{*}Dashboard{**}*.

—
 # 
 ## User Story

**{*}As a{**}* **Verified Media User**  
**{*}I want to{**}* **access the dashboard in CaTH**  
**{*}So that{**}* **I can view restricted hearing information and subscribe to email notifications**

—
 # 
 ## Acceptance Criteria

1. A verified user is a member of the media who has been verified and has an approved account in CaTH.  
2. A verified user can sign into CaTH to view restricted hearing information and subscribe to email notifications.  
3. The verified user can see the **{*}Dashboard{**}* immediately after signing in.  
4. At the top of the page, the user can see clickable links to three pages:  
   - **{*}Court and tribunal hearings{**}*  
   - **{*}Dashboard{**}*  
   - **{*}Email subscriptions{**}*  
5. The verified user can see three tiles (tabs) under a header titled **{*}‘Your account’{**}*:  
   - **{*}Court and tribunal hearings{**}*  
   - **{*}Single Justice Procedure cases{**}*  
   - **{*}Email subscriptions{**}*  
6. The descriptive text displayed within each tile is as follows:  
   - **{*}Court and tribunal hearings:{**}* “View time, location, type of hearings and more.”  
   - **{*}Single Justice Procedure cases:{**}* “Cases ready to be decided by a magistrate without a hearing. Includes TV licensing, minor traffic offences such as speeding and more.”  
   - **{*}Email subscriptions:{**}* “Get emails about hearings from different courts and tribunals and manage your subscriptions.”  
7. The verified user can navigate to the previous page using the **{*}‘Back’{**}* link at the top left of the page.  
8. All CaTH pages must maintain standard design, layout, and accessibility specifications.

—
 # 
 ## User Journey Flow

1. Verified user signs in through the CaTH sign-in page.  
2. Upon successful authentication, the system redirects the user to the **{*}Dashboard{**}* page (`/dashboard`).  
3. The user views the dashboard containing the “Your account” header and the three tiles described above.  
4. The user may navigate between the Dashboard, Court and tribunal hearings, and Email subscriptions using the top navigation links.  
5. The user can click the **{*}‘Back’{**}* link to return to the previous page.

—
 # 
 ## Wireframe

┌──────────────────────────────────────────────────────────────────────┐
│ GOV.UK Court and tribunal hearings │
├──────────────────────────────────────────────────────────────────────┤
│ < Back │
│ │
│ HMCTS – Courts and Tribunals Hearings (CaTH) │
├──────────────────────────────────────────────────────────────────────┤
│ Your account │
│ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Court and tribunal hearings │ │
│ │ View time, location, type of hearings and more. │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Single Justice Procedure cases │ │
│ │ Cases ready to be decided by a magistrate without a hearing. │ │
│ │ Includes TV licensing, minor traffic offences such as │ │
│ │ speeding and more. │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Email subscriptions │ │
│ │ Get emails about hearings from different courts and tribunals │ │
│ │ and manage your subscriptions. │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ │
└──────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## Form Fields

No input fields are required on this page. The dashboard only displays information and navigation options for verified media users.

—
 # 
 ## Content

**{*}EN:{**}* Title/H1 — “Your account”  
**{*}CY:{**}* Title/H1 — “eich cyfrif”

**{*}EN:{**}* Tabs/Tiles — “Court and tribunal hearings”, “Single Justice Procedure cases”, “Email subscriptions”  
**{*}CY:{**}* Tabs/Tiles — “Gwrandawiadau llys a thribiwnlys”, “Gweithdrefn Un Ynad”, “tanysgrifiadau e-bost”

**{*}EN:{**}* Descriptive text for tiles —  
 - Court and tribunal hearings: “View time, location, type of hearings and more.”  
 - Single Justice Procedure cases: “Cases ready to be decided by a magistrate without a hearing. Includes TV licensing, minor traffic offences such as speeding and more.”  
 - Email subscriptions: “Get emails about hearings from different courts and tribunals and manage your subscriptions.”  

**{*}CY:{**}* Descriptive text for tiles —  
 - “Gweld amser, lleoliad. Math o wrandawiad a mwy.”  
 - “Achosion sy’n barod i’w penderfynu gan ynad heb gynnal gwrandawiad. Mae’n cynnwys troseddau trwyddedu teledu a mân droseddau traffig fel goryrru.”  
 - “Cael e-byst am wrandawiadau gan wahanol lysoedd a thribiwnlysoedd a rheoli eich tanysgrifiadau.”  

**{*}EN:{**}* Header navigation links — “Court and tribunal hearings”, “Dashboard”, “Email subscriptions”  
**{*}CY:{**}* Header navigation links — “Gwrandawiadau llys a thribiwnlys”, “Dangosfwrdd”, “tanysgrifiadau e-bost”

**{*}EN:{**}* Back link — “Back”  
**{*}CY:{**}* Back link — “Yn ôl”

—
 # 
 ## URL

`/dashboard`

—
 # 
 ## Validation Rules

 - Only authenticated and verified users can access this page.  
 - If an unauthenticated user attempts to access `/dashboard`, the system must redirect to the **{*}sign~~in page{**}* (`/sign~~in`).  
 - Content should display dynamically based on user permissions and verification status.  

—
 # 
 ## Error Messages

**{*}EN:{**}*  
 - “You must be signed in as a verified user to view this page.”  
 - “We could not load your account information. Please try again later.”  

**{*}CY:{**}*  
 - “Welsh placeholder”  
 - “Welsh placeholder ”

—
 # 
 ## Navigation

 - **{*}Forward:{**}* Clicking any tile redirects to the corresponding section:  
  - “Court and tribunal hearings” → `/hearings`  
  - “Single Justice Procedure cases” → `/sjp-cases`  
  - “Email subscriptions” → `/subscriptions`  
 - **{*}Back:{**}* “Back” link navigates to the previous page or referring URL.  
 - **{*}Header links:{**}*  
  - “Court and tribunal hearings” → `/hearings`  
  - “Dashboard” → `/dashboard` (active state highlighted)  
  - “Email subscriptions” → `/subscriptions`  

—
 # 
 ## Accessibility

 - Page must comply with **{*}WCAG 2.2 AA{**}* and **{*}GOV.UK Design System{**}* standards.  
 - All navigation and tile links must be accessible via keyboard navigation.  
 - Tiles must have visible focus states when selected or tabbed through.  
 - “Your account” heading must be programmatically identifiable as the page’s main title.  
 - Error summaries must be announced to assistive technologies and link to the relevant sections.  
 - Colour contrast and focus outlines must meet GOV.UK accessibility requirements.  

—
 # 
 ## Test Scenarios

|ID|Scenario|Steps|Expected Result|
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
|TS1|Verified user sign-in|Sign in with valid verified account|Redirected to Dashboard|
|TS2|Dashboard visibility|View after sign-in|Dashboard displays with three tiles|
|TS3|Navigation links|Click “Court and tribunal hearings”|Redirected to `/hearings`|
|TS4|Navigation links|Click “Email subscriptions”|Redirected to `/subscriptions`|
|TS5|Back link|Click “Back”|Returns to previous page|
|TS6|Access control|Access `/dashboard` while unauthenticated|Redirected to `/sign-in`|
|TS7|Accessibility|Navigate via keyboard only|All interactive elements are reachable and highlighted|
|TS8|Language toggle|Switch to Welsh|All text updates to Welsh equivalents (if available)|

—
 # 
 ## Assumptions / Open Questions

 - Confirm whether the “Back” link should always return to `/sign-in` or the user’s previous route.  
 - Confirm if dashboard tiles require hover states or icons for additional clarity.  
 - Confirm if the tile descriptions are static or dynamically loaded.  
 - Confirm if a loading state is needed while fetching user data.  
 - Confirm if email subscription count or hearing summary stats should be displayed on tiles.

—', 'functional', 'verified', 'medium', 'story', 261, 'https://github.com/hmcts/cath-service/issues/261', '2026-01-20T17:09:18Z', '2026-01-30T15:04:19Z', 'linusnorton', 'linusnorton'),
  (40, 'REQ-0040', 'Verified User – Email subscriptions', '**PROBLEM STATEMENT**

Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH and subscribe to email notifications from CaTH.

 

**AS A** Verified Media User

**I WANT** to subscribe to hearing lists in CaTH

**SO THAT** I can receive email notifications whenever a new list I subscribed to is published

 

**ACCEPTANCE CRITERIA**
 * A verified user is a member of the media who has been verified and has an approved account in CaTH
 * A verified user can sign into CaTH to view restricted hearing information and subscribe to email notifications.
 * The verified user can see the Dashboard as soon as the user signs in
 * At the top of the page user can see a clickable link to see 3 pages provided in these texts <Court and tribunal hearings>(https://www.court~~tribunal~~hearings.service.gov.uk/) , <Dashboard>(https://www.court~~tribunal~~hearings.service.gov.uk/account~~home) and <**Email subscriptions**>(https://www.court~~tribunal~~hearings.service.gov.uk/subscription~~management)
 * The verified user can click on the ‘Email subscriptions’ tab to subscribe to hearing lists from specific venues.
 * When the user clicks on the ''Email subscriptions'' tab,  the user is taken to a page with a header title ‘Your email subscriptions’ and can see the green ‘Add email subscription’ button under the header
 * Where the user does not have any existing subscriptions, then the following message is displayed under the ''Add email subscription'' tab; ''You do not have any active subscriptions'' and the user can click the green ''Add email subscription'' tab to begin the subscription process
 * Where the user has an existing subscription, then a table with columns titled ‘Court or tribunal name’, ‘Date added’ and ‘Actions’ is displayed under the green  ''Add email subscription'' tab with details of all the existing subscriptions
 * When the user clicks on the  ''Add email subscription'' tab, the user is taken to the ''Subscribe by court or tribunal name'' page where the user can make selections of the venues to be subscribed to and then clicks the green ''Continue'' button to progress to the next page titled Confirm your email subscriptions''. The user sees a link to ''Remove'' each selected subscription beside each selection and also sees a link below the selections to ''Add another subscription'' which takes the user to the ''Subscribe by court or tribunal name'' page. Where the user had made only one selection and then clicks on the ''Remove'' link, then the following message is boldly displayed ''There is a problem'' followed by ''At lease one subscription is needed'' boldly written in red and a green button titled ''Add subscription'' is provided underneath which takes the user back to the ''Subscribe by court or tribunal name'' page. If the user clicks the green ''Continue'' button then the user is taken to the confirmation page
 * The ''confirmation page displays a green banner with a header titled ''Subscription confirmation''. Underneath the green banner, it states that ''To continue, you can go to ''your account'' <linked to user''s dashboard> in order to: and then the following options are displayed as links in bullet points ''add a new email subscription'' which takes user to the ''Subscribe by court or tribunal name'' page, ''manage your current email subscriptions'' which takes the user to the ''Your email subscriptions'' and ''find a court or tribunal'' which takes the user to the ''What court or tribunal are you interested in?'' page
 * The user can navigate to the previous page using the ‘back’ link provided at the top left of the page
 * A Subscriptions table is created in CaTH back end postgres database to store the linkage between user information and details of the court/tribunal venue and hearing lists subscribed to.  
 * Subscriptions to be saved only against a previously verified user in the API database  
 * The subscription table should include the Subscription ID (a unique ID created as as the primary key), the User ID, the Court ID and the Channel (how the subscription is returned to the user i.e. User email for media users or API URL for third party subscribers like Courtel)
 * A subscribed user should be able to modify their subscription selection (update or deleted) and this should be updated in the subscription table accordingly
 * All CaTH pages specifications are maintained

 

 
 # VIBE-192 — Subscribe to Email Notifications (Specification)

> Owner: VIBE-192  
> Updated: 14 Nov 2025

—
 # 
 ## Problem Statement
Verified users (media) can create accounts in CaTH to access restricted hearing information.  
Once approved, they can subscribe to receive {**}`**`email notifications`**`{**} when new hearing lists are published for specific venues.

—
 # 
 ## User Story
{**}`**`As a`**`{**} Verified Media User  
{**}`**`I want to`**`{**} subscribe to hearing lists in CaTH  
{**}`**`So that`**`{**} I can receive email notifications whenever a new list I subscribed to is published

—
 # 
 ## Acceptance Criteria
1. Verified media users have approved CaTH accounts.
2. Verified users can sign in, access the {**}`**`Dashboard`**`{**}, and view restricted information.
3. Dashboard top navigation displays three links:
   - {**}`**`Court and tribunal hearings`**`{**}
   - {**}`**`Dashboard`**`{**}
   - {**}`**`Email subscriptions`**`{**}
4. Clicking {**}`**`Email subscriptions`**`{**} opens a page titled {**}`**`Your email subscriptions`**`{**}, showing:
   - Green {**}`**`Add email subscription`**`{**} button.
   - Either a “no subscriptions” message or a table of existing subscriptions:
     - {**}`**`Court or tribunal name`**`{**}
     - {**}`**`Date added`**`{**}
     - {**}`**`Actions`**`{**}
5. If the user has {**}`**`no existing subscriptions`**`{**}, the message under the button reads:
   > “You do not have any active subscriptions.”
6. If subscriptions exist, the table displays all current subscriptions.
7. Clicking {**}`**`Add email subscription`**`{**} opens {**}`**`Subscribe by court or tribunal name`**`{**}.
 ##    - The location selection page should look the same as the alphabetical search page
   - User selects one or more venues.
   - User clicks {**}`**`Continue`**`{**} → navigates to {**}`**`Confirm your email subscriptions`**`{**}.
8. {**}`**`Confirm your email subscriptions`**`{**}:
   - Lists selected subscriptions.
   - Each selection has a {**}`**`Remove`**`{**} link.
   - Below the list:
     - {**}`**`Add another subscription`**`{**} link (returns to “Subscribe by court or tribunal name”).
     - {**}`**`Continue`**`{**} button.
   - If the user removes their last subscription:
     - Error message:  
       {**}`**`There is a problem`**`{**}  
       {**}`**`At least one subscription is needed`**`{**}
     - Green {**}`**`Add subscription`**`{**} button below (returns to subscription selection).
9. Clicking {**}`**`Continue`**`{**} navigates to {**}`**`Subscription confirmation`**`{**}, displaying:
   - Green banner: {**}`**`Subscription confirmation`**`{**}
   - Subtext:
     > “To continue, you can go to your account in order to:”
     - {**}`**`add a new email subscription`**`{**} → `/subscriptions/add`
     - {**}`**`manage your current email subscriptions`**`{**} → `/subscriptions`
     - {**}`**`find a court or tribunal`**`{**} → `/hearing~~lists/find~~court`
10. Every page includes a {**}`**`Back`**`{**} link (top left).
11. The system creates a {**}`**`Subscriptions table`**`{**} in the database linking user details with subscribed venues.
12. Only verified users (in API database) can create subscriptions.
13. Subscriptions table fields:
    - `subscription_id` (UUID; primary key)
    - `user_id` (verified user’s ID)
    - `location_id` (linked venue ID)
 ##     - ''date_added''
  
14. Users can delete or add subscriptions; changes persist in the Subscriptions table.
15. All CaTH accessibility and page specifications are maintained.

—
 # 
 ## User Journey Flow
1. {**}`**`Sign in`**`{**} → Verified user lands on Dashboard.
2. Click {**}`**`Email subscriptions`**`{**} → opens Your email subscriptions.
3. If no subscriptions, message shown; otherwise, table appears.
4. Click {**}`**`Add email subscription`**`{**} → opens Subscribe by court or tribunal name.
5. Select one or more venues → click {**}`**`Continue`**`{**} → opens Confirm your email subscriptions.
6. Optional: Remove selections or add another.
7. Click {**}`**`Continue`**`{**} → opens Subscription confirmation.
8. Use provided links to navigate to other areas or add new subscriptions.

—
 # Page 1 — Your email subscriptions

 # 
 ## Wireframe

┌──────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK <Language Toggle> │
├──────────────────────────────────────────────────────────────────────────────┤
│ HMCTS – Courts and Tribunals Hearings (CaTH) │
├──────────────────────────────────────────────────────────────────────────────┤
│ < Back │
│ Your email subscriptions │
│ <Add email subscription> (Green Button) │
│ │
│ (If none) You do not have any active subscriptions. │
│ │
│ (If existing) │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Court or tribunal name | Date added | Actions │ │
│ │ Oxford Crown Court | 12 Nov 2025 | Remove │ │
│ │ Manchester Magistrates | 10 Nov 2025 | Remove │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘

 
 # 
 ## Content
{**}`**`EN:`**`{**} Title — “Your email subscriptions”  
{**}`**`CY:`**`{**} Title — “Eich tanysgrifiadau e-bost”

{**}`**`EN:`**`{**} Button — “Add email subscription”  
{**}`**`CY:`**`{**} Button — “Ychwanegu tanysgrifiad e-bost”

{**}`**`EN:`**`{**} Message (none) — “You do not have any active subscriptions.”  
{**}`**`CY:`**`{**} Message (none) — “Nid oes gennych unrhyw danysgrifiadau gweithredol.”

{**}`**`EN:`**`{**} Table headers — “Court or tribunal name”, “Date added”, “Actions”  
{**}`**`CY:`**`{**} Table headers — “Enw’r llys neu’r tribiwnlys”, “Dyddiad ychwanegu”, “Camau gweithredu”

—
 # Page 2 — Subscribe by court or tribunal name

 # 
 ## Wireframe

┌──────────────────────────────────────────────────────────────────────────────┐
│ < Back │
│ Subscribe by court or tribunal name │
│ │
│ Search for a court or tribunal: │
│ <*__**__**__**__**__**__**__**__**__**__*_> │
│ │
│ <Continue> (Green Button) │
└──────────────────────────────────────────────────────────────────────────────┘

 
 # 
 ## Content
{**}`**`EN:`**`{**} Title — “Subscribe by court or tribunal name”  
{**}`**`CY:`**`{**} Title — “Tanysgrifio yn ôl enw llys neu dribiwnlys”

{**}`**`EN:`**`{**} Button — “Continue”  
{**}`**`CY:`**`{**} Button — “Parhau”

—
 # Page 3 — Confirm your email subscriptions

 # 
 ## Wireframe

┌──────────────────────────────────────────────────────────────────────────────┐
│ < Back │
│ Confirm your email subscriptions │
│ │
│ Oxford Combined Court Centre <Remove> │
│ Manchester Magistrates’ Court <Remove> │
│ │
│ <Add another subscription> (Link) │
│ │
│ <Continue> (Green Button) │
│ │
│ (Error state if last removed) │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ ⚠️ There is a problem │ │
│ │ At least one subscription is needed. │ │
│ │ <Add subscription> (Green Button) │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘

 
 # 
 ## Content
{**}`**`EN:`**`{**} Title — “Confirm your email subscriptions”  
{**}`**`CY:`**`{**} Title — “Cadarnhewch eich tanysgrifiadau e-bost”

{**}`**`EN:`**`{**} Error — “There is a problem. At least one subscription is needed.”  
{**}`**`CY:`**`{**} Error — “Mae problem. Mae angen o leiaf un tanysgrifiad.”

{**}`**`EN:`**`{**} Button — “Continue”  
{**}`**`CY:`**`{**} Button — “Parhau”

—
 # Page 4 — Subscription confirmation

 # 
 ## Wireframe

┌──────────────────────────────────────────────────────────────────────────────┐
│ ✅ Subscription confirmation │
│ │
│ To continue, you can go to your account in order to: │
│ • add a new email subscription │
│ • manage your current email subscriptions │
│ • find a court or tribunal │
└──────────────────────────────────────────────────────────────────────────────┘

 
 # 
 ## Content
{**}`**`EN:`**`{**} Header — “Subscription confirmation”  
{**}`**`CY:`**`{**} Header — “Cadarnhad tanysgrifiad”

{**}`**`EN:`**`{**} Message —  
“To continue, you can go to your account in order to:”  
 - “add a new email subscription”  
 - “manage your current email subscriptions”  
 - “find a court or tribunal”  
{**}`**`CY:`**`{**} Message —  
“I barhau, gallwch fynd i’ch cyfrif er mwyn:”  
 - “Ychwanegu tanysgrifiad e-bost newydd”  
 - “Rheoli eich tanysgrifiadau e-bost cyfredol”  
 - “Dod o hyd i lys neu dribiwnlys”

—
 # 
 ## URL Structure
|Page|URL|
|~~--~~~~-|~~---|
|Dashboard|`/account-home`|
|Your email subscriptions|`/subscriptions`|
|Subscribe by court or tribunal name|`/location~~name~~search`|
|Subscribe by court or tribunal name Preview|`/subscription~~confirmation~~preview`|
|Subscription confirmation|`/subscription-confirmed`|

—
 # 
 ## Data Model — Subscriptions Table
{**}`**`Storage:`**`{**} CaTH back-end blob storage.

|Field|Type|Required|Description|
|~~--~~~~--~~|~~--~~~~-|~~~~--~~~~--~~~~-|~~~~--~~~~--~~~~--~~-|
|subscription_id|UUID|Yes|Unique primary key|
|user_id|String|Yes|ID of verified user|
|location_id|String|Yes|Court/tribunal venue identifier|
|date_added|DateTime|Yes|Timestamp for when the subscription was created|

{**}`**`Business logic:`**`{**}
 - Subscriptions can only be created for {**}`**`verified users`**`{**}.
 - Users can manage (add, update, delete) subscriptions.
 - Subscriptions deleted immediately when user unsubscribes.
 - Future email notifications must reflect subscription updates.

—
 # 
 ## Validation Rules

 - At least one venue must be selected before continuing from “Subscribe” page.
 - Removing all subscriptions triggers error (“At least one subscription is needed.”).
 - Buttons and links must only act when valid states exist.
 - All navigation preserves the user’s session and language selection.

—
 # 
 ## Error Messages
{**}`**`EN:`**`{**}  

 - “There is a problem.”  
 - “At least one subscription is needed.”  
 - “Please select a valid court or tribunal.”  

{**}`**`CY:`**`{**}  
 - “Mae problem wedi codi.”  
 - “Mae angen o leiaf un tanysgrifiad.”  
 - “Dewiswch lys neu dribiwnlys dilys.”  

—
 # 
 ## Accessibility

 - Comply with {**}`**`WCAG 2.2 AA`**`{**} and {**}`**`GOV.UK Design System`**`{**}.  
 - Tables use `<th scope="col">` for headers.  
 - Error summaries use `role="alert"`.  
 - All buttons, links, and checkboxes are keyboard accessible with visible focus states.  
 - Language toggle persists context.  
 - “Add another subscription” link and back navigation must be reachable via keyboard navigation.

—
 # 
 ## Test Scenarios
|ID|Scenario|Steps|Expected Result|
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
|TS1|Navigate to subscriptions|Log in → click “Email subscriptions”|Page shows Add button and either message or table|
|TS2|No subscriptions|User has none|“You do not have any active subscriptions.” displayed|
|TS3|Existing subscriptions|User has some|Table displays all with “Remove” actions|
|TS4|Add subscription|Click Add email subscription|“Subscribe by court or tribunal name” opens|
|TS5|Confirm selections|Add venues → Continue|“Confirm your email subscriptions” opens|
|TS6|Remove all|Remove last subscription|Error displayed: “There is a problem. At least one subscription is needed.”|
|TS7|Confirmation|Click Continue|Subscription confirmation page displayed|
|TS8|Manage links|Click links on confirmation page|Each redirects correctly|
|TS9|Data persistence|Add subscription|Row saved in Subscriptions table|
|TS10|Modify/delete|Update or remove subscription|Table updates accordingly|
|TS11|Accessibility test|Keyboard + screen reader|All controls and errors announced correctly|
|TS12|Welsh toggle|Switch to Welsh|All text updates to Welsh version|

—
 # 
 ## Risks / Clarifications

 - Confirm whether duplicate subscriptions for the same venue should be prevented - Yes, duplicate subscriptions should be prevent 
 - Confirm subscription table storage lifetime and retention - No retention for now
 - Confirm if users can bulk-select multiple venues at once - Yes  
 - Confirm if email notifications are immediate (real-time) or scheduled batch triggers - Not applicable yet in this ticket 
 - Confirm error logging location for invalid subscription updates - Yes

—', 'functional', 'verified', 'medium', 'story', 262, 'https://github.com/hmcts/cath-service/issues/262', '2026-01-20T17:09:36Z', '2026-01-30T15:04:22Z', 'linusnorton', 'linusnorton'),
  (41, 'REQ-0041', 'Verified User – How do you want to add an email subscription', '**PROBLEM STATEMENT**

Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH and subscribe to email notifications from CaTH.

 

**AS A** Verified Media User

**I WANT** to subscribe to hearing lists in CaTH

**SO THAT** I can receive email notifications whenever a new list I subscribed to is published

 

 

**ACCEPTANCE CRITERIA**
 * A verified user is a member of the media who has been verified and has an approved account in CaTH
 * A verified user can sign into CaTH to view restricted hearing information and subscribe to email notifications.
 * The verified user can see the Dashboard as soon as the user signs in

 * At the top of the page user can see a clickable link to see 3 pages provided in these texts <Court and tribunal hearings>(https://www.court~~tribunal~~hearings.service.gov.uk/) , <Dashboard>(https://www.court~~tribunal~~hearings.service.gov.uk/account~~home) and <Email subscriptions>(https://www.court~~tribunal~~hearings.service.gov.uk/subscription~~management)

 * The verified user can click on the ‘Email subscriptions’ tab to subscribe to hearing lists and sees a page with a header title ‘Your email subscriptions’
 * The verified user can see the ‘Add email subscription’ button
 * When the user clicks the ‘Add email subscription’ button, the user is taken to a page with header title ‘How do you want to add an email subscription’
 * On the ‘How do you want to add an email subscription’ page, sees the following message under the header ‘You can only search for information that is currently published’
 * The user can see 3 radio buttons with 3 buttons ‘By court or tribunal name’, ‘By case name’ and ‘By case reference number, case ID or unique reference number (URN)’
 * User can see a ‘continue’ button that allows the user progress to the next stage of the subscription process
 * The verified user can navigate to the previous page using the ‘back’ link provided at the top left of the page
 * All CaTH pages specifications are maintained', 'functional', 'verified', 'medium', 'story', 263, 'https://github.com/hmcts/cath-service/issues/263', '2026-01-20T17:10:16Z', '2026-01-30T15:04:24Z', 'linusnorton', 'linusnorton'),
  (42, 'REQ-0042', 'Verified User – How do you want to add an email subscription', '**PROBLEM STATEMENT**

Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH and subscribe to email notifications from CaTH.

 

**AS A** Verified Media User

**I WANT** to subscribe to hearing lists in CaTH

**SO THAT** I can receive email notifications whenever a new list I subscribed to is published

 

 

**ACCEPTANCE CRITERIA**
 * A verified user is a member of the media who has been verified and has an approved account in CaTH
 * A verified user can sign into CaTH to view restricted hearing information and subscribe to email notifications.
 * The verified user can see the Dashboard as soon as the user signs in

 * At the top of the page user can see a clickable link to see 3 pages provided in these texts ‘Court and tribunal hearings’, ‘Dashboard’, and ‘Email subscriptions’
 * The verified user can click on the ‘Email subscriptions’ tab to subscribe to hearing lists

 * On the ‘How do you want to add an email subscription’ page, sees the following message under the header ‘You can only search for information that is currently published’
 * The user can see 3 radio buttons with 3 buttons ‘By court or tribunal name’, ‘By case name’ and ‘By case reference number, case ID or unique reference number (URN)’
 * Where the user selects ‘By court or tribunal name’ radio button, then the user is taken to a page with title header ‘Subscribe by court or tribunal name’ and the descriptive message beneath the header ‘Subscribe to receive hearings list by court or tribunal’. The page also displays all the available venues in CaTH and a filter on the left side that displays ‘Jurisdiction’ and ‘Region’ filter options and a sub-filter option ‘Type of civil court’ which pops up when a jurisdiction option is selected. A total selected field is displayed at the bottom of the list of venues.
 * Where the user selects ‘By case name’ radio button the user is taken to a page that displays a free text search bar with an example of the input for the user provided on top as follows ‘For example, Smith.’. where the user inputs a case name that does not exist, then the user is informed, and the following message is displayed at the header ‘There is a problem. There is nothing matching your criteria’. Above the search bar, the following message is also displayed ‘Please provide a correct case name’. at the bottom of the page, the following messages are displayed ‘There are no matching results. You can: (the following are written in bullet points) ‘Double check your spelling’ and ‘Add subscription by an alternative type’
 * Where the user selects ‘By case reference number, case ID or unique reference number (URN)’, then the user is taken to a page titled ‘What is the reference number?’ and the following descriptive message is displayed under the header ‘Please enter either a case reference number, case ID or unique reference number (URN). You must enter an exact match.’ where the user inputs a case name that does not exist, then the user is informed, and the same error message as above is displayed with the only change being ‘Enter a valid case reference number’
 * User can see a ‘continue’ button that allows the user progress to the next stage of the subscription process
 * The verified user can navigate to the previous page using the ‘back’ link provided at the top left of the page
 * All CaTH pages specifications are maintained', 'functional', 'verified', 'medium', 'story', 264, 'https://github.com/hmcts/cath-service/issues/264', '2026-01-20T17:10:31Z', '2026-01-30T15:04:26Z', 'linusnorton', 'linusnorton'),
  (43, 'REQ-0043', 'Verified User – Unsubscribe', '**PROBLEM STATEMENT**

Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information which they can subscribe to receive email notifications from CaTH and also unsubscribe from.

 

**AS A** Verified Media User

**I WANT** to unsubscribe from my subscriptions in CaTH

**SO THAT** I can stop receiving notifications from publications i am no longer interested in. 

 

**Pre-condition:**
 * The verified user already has some active subscriptions in CaTH

 

**ACCEPTANCE CRITERIA**
 * A verified user is a member of the media who has been verified and has an approved account in CaTH
 * A verified user can sign into CaTH to view restricted hearing information subscribe to email notifications and also unsubscribe from the afore mentioned
 * When the verified signs into CaTH, the user can see the following tabs; Dashboard and 3 tabs ‘Court and tribunal hearings’, ‘Dashboard’, and ‘Email subscriptions’

 * When the verified user clicks on the ‘Email subscriptions’ tab, the user is taken to a page with a header title ‘Your email subscriptions’ and can see the  ''Add email subscription'' tab under the header. Underneath the tab is a table with columns titled ‘Court or tribunal name’, ‘Date added’ and ‘Actions’ which displays all the details of all the existing subscriptions

 * The user can see a link to ''Unsubscribe'' from each existing subscription displayed in the rows of the table and if the user clicks the ''Unsubscribe'' link in the ''Actions'' column, then the user is taken to the ''Are you sure you want to remove this subscription?'' page where the user sees 2 radio buttons that allows the user click ''Yes'' or ''No'' and a green ''Continue'' button. if the user selects ''No'', then the user is taken back to the ''Your email subscriptions'' page but if the user selects ''Yes'', then the user is taken to a confirmation page titled ''Subscriptions removed'' which is displayed in a green banner and the following message is displayed underneath in the same banner ''Your subscription has been removed''. Underneath the green banner, it states that ''To continue, you can go to ''your account'' <linked to user''s dashboard> in order to: and then the following options are displayed as links in bullet points ''add a new email subscription'' which takes user to the ''Subscribe by court or tribunal name'' page, ''manage your current email subscriptions'' which takes the user to the ''Your email subscriptions'' and ''find a court or tribunal'' which takes the user to the ''What court or tribunal are you interested in?'' page
 * The user can navigate to the previous page using the ‘back’ link provided at the top left of the page
 * Where a user unsubscribes from a court or tribunal, then the subscription should be deleted from the "Subscriptions" table as soon as the user clicks the "Unsubscribe" button if no other subscription is available for the user or the subscription details should be updated to reflect the modifications to their subscriptions and the email notifications sent going forward should reflect the revised changes
 * All CaTH pages specifications are maintained

 

 
 # VIBE-196 — Unsubscribe from Email Subscriptions (Specification)

> Owner: VIBE-196  
> Updated: 14 Nov 2025

—
 # 
 ## Problem Statement
Verified users (media) create accounts in CaTH to access restricted hearing information. They can subscribe to email notifications for publications and must also be able to {**}`**`unsubscribe`**`{**} when no longer interested.

 # 
 ## User Story
{**}`**`As a`**`{**} Verified Media User  
{**}`**`I want to`**`{**} unsubscribe from my subscriptions in CaTH  
{**}`**`So that`**`{**} I can stop receiving notifications for publications I’m no longer interested in

 # 
 ## Pre-condition

 - The verified user has one or more {**}`**`active`**`{**} subscriptions in CaTH.
 - User is signed in to a verified account.

—
 # 
 ## Acceptance Criteria (Functional)
1. Verified media user with an approved account can sign into CaTH and access:
   - {**}`**`Top links:`**`{**} Court and tribunal hearings, Dashboard, Email subscriptions.
2. Selecting {**}`**`Email subscriptions`**`{**} opens {**}`**`Your email subscriptions`**`{**} page showing:
   - Header, a green {**}`**`Add email subscription`**`{**} button.
   - A table of existing subscriptions with columns: {**}`**`Court or tribunal name{**}`**`, **{*}Date added{**}{**}, ***Actions{*}*.
   - Each row contains an {**}`**`Unsubscribe`**`{**} link.
3. Clicking {**}`**`Unsubscribe`**`{**} opens {**}`**`Are you sure you want to remove this subscription?`**`{**} with radio options {**}`**`Yes/No`**`{**} and a green {**}`**`Continue`**`{**} button.
   - {**}`**`No →`**`{**} return to {**}`**`Your email subscriptions`**`{**}.
   - {**}`**`Yes →`**`{**} show {**}`**`Subscriptions removed`**`{**} confirmation (green banner) with subtext {**}`**`Your subscription has been removed`**`{**} and links to:
     - {**}`**`add a new email subscription`**`{**} (Subscribe by court or tribunal name),
     - {**}`**`manage your current email subscriptions`**`{**} (Your email subscriptions),
     - {**}`**`find a court or tribunal`**`{**} (What court or tribunal are you interested in?).
4. A {**}`**`Back`**`{**} link is available at the top left of each page.
5. {**}`**`Subscriptions table updates:`**`{**}
   - If, after unsubscribe, the user has {**}`**`no other`**`{**} subscriptions → delete the user’s record for that venue (and user entirely if model stores one row per user with set empty).
   - If other subscriptions remain → update the table to remove only the selected venue and ensure future notifications reflect the change.
6. All CaTH page specifications are maintained.

—
 # Page 1 — Your email subscriptions

 # 
 ## Wireframe

┌─────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK Court & tribunal hearings │
│ < Back Dashboard | Email subscriptions │
├─────────────────────────────────────────────────────────────────────────────┤
│ Your email subscriptions │
│ <Add email subscription> (green) │
│ │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Court or tribunal name | Date added | Actions │ │
│ │ Oxford Combined Court | 02 Nov 2025 | Unsubscribe │ │
│ │ Manchester Magistrates | 28 Oct 2025 | Unsubscribe │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

 
 # 
 ## Form fields

 - None (table actions only).

 # 
 ## Content
{**}`**`EN:`**`{**} Title/H1 — “Your email subscriptions”  
{**}`**`CY:`**`{**} Title/H1 — “Welsh placeholder”

{**}`**`EN:`**`{**} Button — “Add email subscription”  
{**}`**`CY:`**`{**} Button — “Welsh placeholder”

{**}`**`EN:`**`{**} Table headers — “Court or tribunal name”, “Date added”, “Actions”  
{**}`**`CY:`**`{**} Table headers — “Welsh placeholder”, “Welsh placeholder”, “Welsh placeholder”

{**}`**`EN:`**`{**} Link — “Unsubscribe”  
{**}`**`CY:`**`{**} Link — “Welsh placeholder”
 # 
 ## Errors

 - None on this page.

 # 
 ## Back navigation

 - {**}`**`Back`**`{**} returns to previous page (typically Dashboard).

—
 # Page 2 — Are you sure you want to remove this subscription?

 # 
 ## Wireframe

┌─────────────────────────────────────────────────────────────────────────────┐
│ < Back │
│ Are you sure you want to remove this subscription? │
│ │
│ ( ) Yes │
│ ( ) No │
│ │
│ <Continue> (green) │
└─────────────────────────────────────────────────────────────────────────────┘
 
 
 
 # 
 ## Form fields
|Field        |Type  |Required|Validation                        |
|~~--~~~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~|-~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~---|
|confirmation  |Radio  |Yes      |Must be {**}`**`Yes`**`{**} or {**}`**`No`**`{**} selected|

 # 
 ## Content
{**}`**`EN:`**`{**} Title/H1 — “Are you sure you want to remove this subscription?”  
{**}`**`CY:`**`{**} Title/H1 — “Welsh placeholder”

{**}`**`EN:`**`{**} Radio options — “Yes”, “No”  
{**}`**`CY:`**`{**} Radio options — “Welsh placeholder”, “Welsh placeholder”

{**}`**`EN:`**`{**} Button — “Continue”  
{**}`**`CY:`**`{**} Button — “Welsh placeholder”
 # 
 ## Errors
{**}`**`EN:`**`{**} “Select yes or no.”  
{**}`**`CY:`**`{**} “Welsh placeholder”

 # 
 ## Back navigation

 - {**}`**`Back`**`{**} returns to {**}`**`Your email subscriptions`**`{**}.

—
 # Page 3 — Subscriptions removed (confirmation)

 # 
 ## Wireframe

┌─────────────────────────────────────────────────────────────────────────────┐
│ ✅ Subscriptions removed (green banner) │
│ Your subscription has been removed │
│ │
│ To continue, you can go to your account in order to: │
│ • add a new email subscription │
│ • manage your current email subscriptions │
│ • find a court or tribunal │
└─────────────────────────────────────────────────────────────────────────────┘

 
 # 
 ## Form fields

 - None.

 # 
 ## Content
{**}`**`EN:`**`{**} Banner title — “Subscriptions removed”  
{**}`**`CY:`**`{**} Banner title — “Welsh placeholder”

{**}`**`EN:`**`{**} Banner subtext — “Your subscription has been removed”  
{**}`**`CY:`**`{**} Banner subtext — “Welsh placeholder”

{**}`**`EN:`**`{**} Body intro — “To continue, you can go to your account in order to:”  
{**}`**`CY:`**`{**} Body intro — “Welsh placeholder”

{**}`**`EN:`**`{**} Links (bulleted) —  
 - “add a new email subscription”  
 - “manage your current email subscriptions”  
 - “find a court or tribunal”  
{**}`**`CY:`**`{**} Links (bulleted) —  
 - “Welsh placeholder”  
 - “Welsh placeholder”  
 - “Welsh placeholder”

 # 
 ## Errors

 - None (success state).

 # 
 ## Back navigation

 - {**}`**`Back`**`{**} returns to the confirmation question page.

—
 # 
 ## URL Structure
|Page                                  |URL                                |
|~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--|~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~|
|Your email subscriptions              |`/subscriptions`                    |
|Remove subscription (confirm Yes/No)  |`/subscriptions/unsubscribe/\{id}`  |
|Subscriptions removed (success)      |`/subscriptions/removed`            |

—
 # 
 ## Behaviour & Data Updates

 - Clicking {**}`**`Unsubscribe`**`{**} from Page 1 navigates to Page 2 with the selected subscription `\{id}` in the route.
 - On Page 2:
  - {**}`**`No`**`{**} → redirect back to `/subscriptions` (no change).
  - {**}`**`Yes`**`{**} → remove selected subscription server-side:
    - If this was the {**}`**`only`**`{**} subscription for the user, delete the user’s record from {**}`**`Subscriptions`**`{**} (or leave user row but empty set per model).  
    - Otherwise, delete only the row for `\{user*id, court*id}`.
  - Redirect to `/subscriptions/removed`.
 - Future email notifications must {**}`**`exclude`**`{**} the removed subscription immediately after successful update.

—
 # 
 ## Validation Rules

 - Page 2 requires a selection of {**}`**`Yes`**`{**} or {**}`**`No`**`{**} before submitting.
 - Subscription id in route must belong to the {**}`**`signed-in user`**`{**}; otherwise return to `/subscriptions` with an error summary.
 - All navigation links must preserve language preference.

—
 # 
 ## Error Messages (system)
{**}`**`EN:`**`{**}  

 - “Select yes or no.”  
 - “We could not find that subscription.”  
 - “You are not authorised to update this subscription.”  
{**}`**`CY:`**`{**}  
 - “Welsh placeholder.”  
 - “Welsh placeholder.”  
 - “Welsh placeholder.”

—
 # 
 ## Accessibility (applies across all pages)

 - Comply with {**}`**`WCAG 2.2 AA`**`{**} and {**}`**`GOV.UK Design System`**`{**}.
 - Ensure {**}`**`Back`**`{**} link is programmatically associated and first in tab order after H1.
 - Use `<fieldset>` and `<legend>` for the Yes/No radios; include error summary with `role="alert"` and focus on load.
 - Table headers use `<th scope="col">`.
 - All focus states visible; links/buttons accessible via keyboard.
 - Language toggle preserves context and values where applicable.

—
 # 
 ## Test Scenarios
|ID  |Scenario                                  |Steps                                                                |Expected Result                                                                    |
|~~--~~|~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--|~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~-|~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~|
|TS1|List subscriptions                        |Sign in → open `/subscriptions`                                      |Header, Add button, and table with existing subscriptions & Unsubscribe links      |
|TS2|Start unsubscribe                        |Click {**}`**`Unsubscribe`**`{**} on a row                                        |Navigate to confirmation page for that subscription                                |
|TS3|Confirm = No                              |Select {**}`**`No`**`{**} → Continue                                              |Return to `/subscriptions`; no data change                                          |
|TS4|Confirm = Yes                            |Select {**}`**`Yes`**`{**} → Continue                                            |See {**}`**`Subscriptions removed`**`{**} page; banner + links displayed                        |
|TS5|Data update (single remaining)            |Unsubscribe with only one active subscription                        |Subscriptions table updated to remove final row; future emails not sent            |
|TS6|Data update (multiple)                    |Unsubscribe one of several                                            |Only selected row removed; others remain                                            |
|TS7|Validation                                |Click {**}`**`Continue`**`{**} with no radio selected                            |Error summary “Select yes or no.” and inline error on radios                        |
|TS8|Authorisation                            |Manipulate URL `\{id}` for another user                                |Error + redirect back to `/subscriptions`                                          |
|TS9|Welsh toggle                              |Switch to Welsh on each page                                          |CY strings appear per {**}`**`Content`**`{**}; layout unchanged                                |
|TS10|Accessibility                              |Navigate with keyboard and screen reader                              |Proper focus order; error readouts; table headers announced                          |

—
 # 
 ## Risks & Ambiguities (to confirm)

 - {**}`**`Data model shape:`**`{**} whether “delete user from Subscriptions table” means removing all rows for that user or only the selected `\{user*id, court*id}` row when others exist.  
 - {**}`**`Link destinations:`**`{**} exact URLs for “Subscribe by court or tribunal name” and “What court or tribunal are you interested in?” should match the implemented routes used elsewhere.

—', 'functional', 'verified', 'medium', 'story', 265, 'https://github.com/hmcts/cath-service/issues/265', '2026-01-20T17:10:43Z', '2026-01-30T15:04:28Z', 'linusnorton', 'linusnorton'),
  (44, 'REQ-0044', 'Verified User – Select list type', '**PROBLEM STATEMENT**

Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH and subscribe to email notifications from CaTH.

 

**AS A** Verified Media User

**I WANT** to select the list types I want to subscribe to in CaTH

**SO THAT** I only receive notifications from the lists i''m interested in

**ACCEPTANCE CRITERIA**
 * A verified user is a member of the media who has been verified and has an approved account in CaTH
 * A verified user can sign into CaTH to view restricted hearing information and subscribe to email notifications.
 * The verified user can see the Dashboard as soon as the user signs in
 * At the top of the page user can see a clickable link to see 3 pages provided in these texts ‘Court and tribunal hearings’, ‘Dashboard’, and ‘Email subscriptions’
 * The verified user can click on the ‘Email subscriptions’ tab to subscribe to hearing lists
 * After the user selects a court/case to subscribe to and confirms the selection on the summary page, the user is taken to the ''Select list type'' page and can see all the list types linked to the selection
 * The user can use the checkbox beside each list type to select the lists to subscribe to
 * the total number selected is displayed undeath the available list types
 * The user sees a continue button below that allows the user continue the subscription process
 * The verified user can navigate to the previous page using the ‘back’ link provided at the top left of the page
 * All CaTH pages specifications are maintained', 'functional', 'verified', 'medium', 'story', 266, 'https://github.com/hmcts/cath-service/issues/266', '2026-01-20T17:11:30Z', '2026-01-30T15:04:31Z', 'linusnorton', 'linusnorton'),
  (45, 'REQ-0045', 'Verified User – What version of the list do you want to receive?', '**PROBLEM STATEMENT**

Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH and subscribe to email notifications from CaTH.

 

**AS A** Verified Media User

**I WANT** to select the version of hearing lists to subscribe to in CaTH

**SO THAT** I can receive the lists in the right language

 

**ACCEPTANCE CRITERIA**
 * A verified user is a member of the media who has been verified and has an approved account in CaTH
 * A verified user can sign into CaTH to view restricted hearing information and subscribe to email notifications.
 * The verified user can see the Dashboard as soon as the user signs in

 * At the top of the page user can see a clickable link to see 3 pages provided in these texts ‘Court and tribunal hearings’, ‘Dashboard’, and ‘Email subscriptions’
 * The verified user can click on the ‘Email subscriptions’ tab to subscribe to hearing lists
 * After the user selects the list types to subscribe to, the user is taken to another page titled ''What version of the list do you want to receive?''
 * the user sees 3 radio buttons with the options ''English'', ''Welsh'' and ''English and Welsh'' which allows the user make a single selection of the language version of the list type to be subscribed to
 * Beneath, the user sees the continue button
 * The user can only proceed after a selection is made and if a selection is not made then the following error message is displayed There is a problem. Please select version of the list type to continue''
 *  
 * The verified user can navigate to the previous page using the ‘back’ link provided at the top left of the page

 * All CaTH pages specifications are maintained', 'functional', 'verified', 'medium', 'story', 267, 'https://github.com/hmcts/cath-service/issues/267', '2026-01-20T17:11:42Z', '2026-01-30T15:04:34Z', 'linusnorton', 'linusnorton'),
  (46, 'REQ-0046', 'Single Sign On - System Admin User', '**PROBLEM STATEMENT**

A system admin user in CaTH is given access to system functionality by another system admin user. This allows the system admin to upload reference data, manage third-party users, explore the blobs (Json files) uploaded in CaTH, view the audit log, delete courts, manage CaTH users, bulk create media accounts and manage location metadata. The system admin user would need to sign in using the single sign on information to access their account which then takes them to the dashboard as the landing page.

 

**AS A** System Admin User

**I WANT** to sign into CaTH

**SO THAT** I can view the system admin dashboard

 

**Technical Acceptance Criteria**
 # When navigating to any admin authenticated route, user should be redirected through SSO process for sign in
 # Admin authenticated pages include: /admin~~dashboard and /system~~admin-dashboard
 # All login and associated user screens are part of the SSO / Microsoft implementation, and not to be added as part of this
 # When user has successfully authenticated with SSO they should be redirected back to the associated dashboard (/admin~~dashboard or /system~~admin-dashboard)
 # System admins should have access to both /admin~~dashboard and /system~~admin~~dashboard, but should redirect to /system~~admin-dashboard on return)
 # When the user is redirected, a call to the Microsoft graph endpoint to be made to retrieve user details including the role
 # The user role returned from this call determines which dashboard the user is redirected to ({**}Group names to be added from SSO{**})
 # If user does not have the correct roles, they are redirect to the SSO Rejected login page (same as current CaTH)
 # Associated config for SSO read from KV (or env variables locally) and used for redirection and token processing. The processes uses oAuth
 # The users role is stored in the session (using the three internal role names) and used to authenticate on each of the pages (separate ticket to create internal user model for DB - {**}To be raised{**})
 # Sign Out and session expiry does not need to be handled. This will be done in a separate ticket ({**}To be raised){**}
 # Verified pages are to remain public at present until verified sign on process implement. Ticket to be raised to cover the appropriate redirect if admin user tries to sign in via the verified process
 # After the user is signed in, all pages should display Sign out instead of Sign In in the banner at the top right
 # E2E tests should utilise the existing SSO Test Users for each role
 # Use passport as the authentication middleware

 

**ACCEPTANCE CRITERIA**
 * The system admin user is given access to system functionality by another system admin user
 * The system admin user is able to sign in using their approved ministry of justice single sign on (SSO) information
 * The SSO sign in page should be blue in colour (approved GDS blue colour)
 * At the centre of the page should be a white square display section which displays the Ministry of Justice logo with the words ‘Ministry of Justice’ written beside it at the top
 * The next is a header titled ‘Pick an account’ that has 2 icons beneath. First is a name tag icon in a grey circle that shows the users full name, justice email address and a message ‘Connected to Windows’ followed by a plus sign in a grey circle with the instructive words ‘Use another account’. if the user clicks the first option, the user is automatically signed in to their account. If the user clicks the 2nd option, then the user is a taken to a 2{^}nd{^} ‘Sign in’ page
 * The 2{^}nd{^} sign in page which follows the same specifications and is titled ‘Sign in’ boldly written as a page header. Next is a free text line that allows the system admin user input their SSO information. This should contain a descriptive message that states ‘Email, phone, or Skype''. Underneath the free text line is the link masked in the words ‘Can’t access your account?’ which takes the user to the <Sign in to your account>(https://login.microsoftonline.com/c6874728~~71e6~~41fe~~a9e1~~2e8c36776ad8/oauth2/v2.0/authorize?redirect*uri=https%3A%2F%2Fpip~~frontend.demo.platform.hmcts.net%2Fsso%2Freturn&response*type=code&response*mode=query&client*id=f01b53bb~~a3d1~~4965~~b66c~~50848a118cf6&state=9cTotcagH44pHt2mz3qXfrsPipV20TuW&nonce=8NPglMBUrH55QX36_g7ZzjstlQYN6erV&scope=openid%20profile%20email%20openid&x~~client~~SKU=passport~~azure~~ad&x~~client-Ver=4.3.2) page with the tile ‘Which type of account do you need help with?’ . 
 * The ''Sign in to your account'' page has 2 icons; a name tag icon in grey circle with the descriptive text ‘Work or school account’ followed by ‘Created by your IT department. The 2{^}nd{^} icon with a person in a grey circle and the descriptive text ‘Personal account followed by ‘Created by you’. Lastly a grey ‘Back’ button. Next are two buttons on the right; a ‘Back’ button in grey tab and a ‘Next’ button in the approved GDS blue colour. Beneath is a grey section that states the descriptive text ‘This is a private system, only use this system if you have specific authority to do so. Otherwise you are liable to prosecution under the Computer Misuse Act 1990. If you do not have the express permission of the operator or owner of this system switch off’. In another section undeath is a white rectangular display box that has a key logo and the words ‘Sign-in options’ written in it
 * If the system admin user clicks on the ''Sign ~~in options'', then the user is taken to another page similar to the above mentions with the same logo and ‘Ministry of Justice’ clearly written at the top and a header titled ‘Sign~~in options’ followed by 2 icons; first is a black person icon with a key beside it and the descriptive message written ‘Face, fingerprint, PIN or security key’ on the first line and ‘Use your device to sign in with a passkey.’ On the right side of the message is a ‘question mark in a circle’ icon that the user can click on which display the following message ‘It''s easier and safer to sign in with passkeys. You can sign in using your face, fingerprint, PIN, or use another device like a phone or security key. No passwords, apps, or codes needed. To use this option, you must have previously set this up on your account. <Learn how to set this up>(https://go.microsoft.com/fwlink/?linkid=2013738)’
 * if the system admin user clicks the ‘learn how to set this up’ link, then the user is taken to the Microsoft page with more information on this link <Signing in with a passkey - Microsoft Support >(https://support.microsoft.com/en~~gb/account~~billing/signing~~in~~with~~a-passkey~~09a49a86~~ca47~~406c~~8acc~~ed0e3c852c6d) and beneath the display message is a ‘Close’ button in the GDS blue colour
 * Back on the ‘Sign~~in options’ page, the next icon under the ‘black person icon with a key’ is the GitHub icon with the instructive message written beside it ‘Sign in with GitHub’ which takes the user to the <Sign in to GitHub · GitHub>(https://github.com/login?allow*signup=false&client*id=e37ffdec11c0245cb2e0&return*to=%2Flogin%2Foauth%2Fauthorize%3Fclient*id%3De37ffdec11c0245cb2e0%26redirect*uri%3Dhttps%253A%252F%252Flogin.live.com%252FHandleGithubResponse.srf%26response*type%3Dcode%26scope%3Dread%253Auser%2B%2Buser%253Aemail%26state%3D6A40538C3C4BF002) page. Underneath the two icons on the ‘Sign~~in options’ page is the ‘Back’ button in grey.
 * At the bottom right of the SSO sign in page is the ‘Terms of use’ and the ‘Privacy & cookies’ which takes the user to <Microsoft Services Agreement>(https://www.microsoft.com/en~~GB/servicesagreement/) and <Microsoft Privacy Statement – Microsoft privacy>(https://www.microsoft.com/en~~GB/privacy/privacystatement) respectively
 * Following on the same line are 3 dots which when clicked displays a white pop~~up display box with the ‘Troubleshooting details’ that displays the following descriptive message ‘Troubleshooting details. *** If you contact your administrator, send this info to them. <Copy info to clipboard>(https://login.microsoftonline.com/c6874728~~71e6~~41fe~~a9e1~~2e8c36776ad8/oauth2/v2.0/authorize?redirect*uri=https%3a%2f%2fpip~~frontend.demo.platform.hmcts.net%2fsso%2freturn&response*type=code&response*mode=query&client*id=f01b53bb~~a3d1~~4965~~b66c~~50848a118cf6&state=GpO4qganmbKb~~Bl2YJ0RNkMiEQsMH6wG&nonce=ahkjkgn699HvgUnTPtOD9TA0Ma8dcu~~U&scope=openid+profile+email+openid&x~~client~~SKU=passport~~azure~~ad&x~~client~~Ver=4.3.2&sso*nonce=AwABEgEAAAADAOz*BQD0*4fZ0YvGAGy9106cUg*9mB6XHw8eSGDjIR2bIUTtZsxWgrIFekWrssrsf2nKGxpx67pcp1S8~~XxC~~wCpKAeEJt8gAA&client~~request~~id=4d0cb32e~~1f0d~~47fb~~af0c~~90090088e889&mscrid=4d0cb32e~~1f0d~~47fb~~af0c~~90090088e889) . *Error Code:**  **Request Id:** 5e6c40b5~~38f5~~4c0c~~a437~~eef492a54a00. **Correlation Id:** 4d0cb32e~~1f0d~~47fb~~af0c~~90090088e889. **Timestamp:** 2025~~10~~24T10:47:28.573Z. **Flag sign-in errors for review:** <Enable flagging>(https://login.microsoftonline.com/common/debugmode). If you plan on getting help for this problem, enable flagging and try to reproduce the error within 20 minutes. Flagged events make diagnostics available and are raised to admin attention.
 * Where the user does not input the SSO information before attempting to sign in, then the following error message is displayed ''Enter a valid email address, phone number, or Skype name.''
 * Where inputs an unidentified email address, then the user is taken to another screen and prompted to verify their SSO details. The page displays the header ''Verify your email'' with the following message beneath ''We''ll send a code to jh*******@gh.se. To verify this is your email, enter it here.''
 * A free text box that allows the user type in their email address is provided
 * A ''send code'' button in the blue GDS colour is provided beneath which authorises a validation code to be sent to the user when the user inputs their emails and taps the button
 * 2 lines with links masked in the texts ''Already received a code?'' and ''Use your password'' are provided which allows the user input the received code on another page or input their password respectively.
 * All CaTH pages specifications are maintained’.

 

 
 # VIBE~~201 System Admin SSO Sign~~In Specification

> Owner: {**}`**`VIBE-201`**`{**} · Updated: {**}`**`24 Oct 2025`**`{**}

—
 # 
 ## Problem Statement

A system admin user in CaTH is given access to system functionality by another system admin user. This access allows the system admin to:  
 - Upload reference data  
 - Manage third-party users  
 - Explore blobs (JSON files) uploaded in CaTH  
 - View the audit log  
 - Delete courts  
 - Manage CaTH users  
 - Bulk create media accounts  
 - Manage location metadata  

The system admin must sign in using their approved {**}`**`Ministry of Justice Single Sign-On (SSO)`**`{**} credentials to access their account.  
Upon successful sign-in, they are taken to the {**}`**`System Admin Dashboard`**`{**} as their landing page.

—
 # 
 ## User Story

{**}`**`As a`**`{**} **System Admin User**  
{**}`**`I want to`**`{**} **sign into CaTH**  
{**}`**`So that`**`{**} **I can view the System Admin Dashboard**

—
 # 
 ## Acceptance Criteria

1. The system admin user is granted access by another system admin user.  
2. The system admin can sign in using their {**}`**`Ministry of Justice SSO credentials`**`{**}.  
3. The {**}`**`SSO sign-in page`**`{**}:  
   - Has a {**}`**`blue background`**`{**} (approved GDS blue).  
   - Contains a {**}`**`white square centre panel`**`{**} displaying the {**}`**`Ministry of Justice logo`**`{**} and the text “Ministry of Justice”.  
4. The {**}`**`first SSO page`**`{**} (Pick an account):  
   - Header: {**}`**`“Pick an account”`**`{**}  
   - Two icons displayed vertically:  
     1. Grey circle with a {**}`**`name tag icon`**`{**} showing:  
        - Full name  
        - Justice email address  
        - Message: “Connected to Windows”  
     2. Grey circle with a {**}`**`plus (+) icon`**`{**} and text: “Use another account”  
   - Selecting the first option signs the user in automatically.  
   - Selecting the second option leads to the {**}`**`Sign in`**`{**} page.  
5. The {**}`**`Sign in page`**`{**}:  
   - Header: {**}`**`“Sign in”`**`{**}  
   - Input field with placeholder: “Email, phone, or Skype”  
   - Link below field: {**}`**`“Can’t access your account?”`**`{**}  
     - Redirects to {**}`**`Sign in to your account`**`{**} page.  
6. The {**}`**`Sign in to your account`**`{**} page:  
   - Header: {**}`**`“Which type of account do you need help with?”`**`{**}  
   - Two icons:  
     1. Grey name tag icon — “Work or school account” followed by “Created by your IT department.”  
     2. Grey person icon — “Personal account” followed by “Created by you.”  
   - Two buttons (bottom right):  
     - {**}`**`Back`**`{**} (grey tab)  
     - {**}`**`Next`**`{**} (GDS blue tab)  
   - A grey information section displays:  
     “This is a private system... liable to prosecution under the Computer Misuse Act 1990.”  
   - Beneath that is a {**}`**`white rectangular box`**`{**} with a {**}`**`key icon`**`{**} and label {**}`**`“Sign-in options”`**`{**}.  
7. The {**}`**`Sign-in options`**`{**} page:  
   - Header: {**}`**`“Sign-in options”`**`{**}  
   - Displays:  
     1. Black person + key icon — “Face, fingerprint, PIN or security key”  
        - Tooltip (? icon):  
          “It’s easier and safer to sign in with passkeys… Learn how to set this up.”  
          - Link opens {**}`**`Microsoft Support: Signing in with a passkey`**`{**} page.  
          - Includes {**}`**`Close`**`{**} button (GDS blue).  
     2. GitHub icon — “Sign in with GitHub” → Redirects to {**}`**`GitHub sign-in`**`{**} page.  
   - Bottom: {**}`**`Back`**`{**} button (grey).  
8. The {**}`**`bottom right of all SSO pages`**`{**} displays:  
   - {**}`**`Terms of use`**`{**} → Microsoft Services Agreement  
   - {**}`**`Privacy & cookies`**`{**} → Microsoft Privacy Statement  
   - {**}`**`Three dots (⋯)`**`{**} → Opens pop-up box showing {**}`**`Troubleshooting details`**`{**}.  
9. If the user does not input SSO information before attempting sign-in, show the error:  
   {**}`**`“Enter a valid email address, phone number, or Skype name.”`**`{**}  
10. If the user enters an unrecognised email, display the {**}`**`Verify your email`**`{**} page:  
    - Header: “Verify your email”  
    - Message: “We’ll send a code to jh*******@gh.se. To verify this is your email, enter it here.”  
    - Free text field for email input.  
    - Blue {**}`**`Send code`**`{**} button.  
    - Links beneath: “Already received a code?” and “Use your password.”  
11. All pages must comply with CaTH and GOV.UK design system standards.

—
 # 
 ## User Journey Flow

1. System admin navigates to the CaTH SSO sign-in page.  
2. The {**}`**`Pick an account`**`{**} page loads.  
3. If the user selects their Windows account → Automatic sign-in → Redirect to Dashboard.  
4. If the user selects “Use another account” → Redirect to {**}`**`Sign in`**`{**} page.  
5. User enters email/phone/Skype and clicks {**}`**`Next`**`{**}.  
6. If credentials valid → Redirect to Dashboard.  
7. If invalid → Redirect to {**}`**`Verify your email`**`{**} page to confirm identity via code.  
8. Alternatively, user can access {**}`**`Sign-in options`**`{**} → choose {**}`**`Passkey`**`{**} or {**}`**`GitHub`**`{**} methods.  

—
 # 
 ## Wireframes

 # 
 ## 
 ### A. Pick an Account Page

 

┌──────────────────────────────────────────────────────────────────────┐
│ <Blue Background> │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ <Ministry of Justice Logo> Ministry of Justice │ │
│ │ │ │
│ │ Pick an account │ │
│ │ ┌────────────────────────────────────────────────────────────┐ │ │
│ │ │ 👤 John Doe │ │ │
│ │ │ john.doe@justice.gov.uk │ │ │
│ │ │ Connected to Windows │ │ │
│ │ └────────────────────────────────────────────────────────────┘ │ │
│ │ < + > Use another account │ │
│ └────────────────────────────────────────────────────────────────┘ │
│ Terms of use | Privacy & cookies | ⋯ Troubleshooting details │
└──────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## 
 ### B. Sign In Page

┌──────────────────────────────────────────────────────────────────────┐
│ <Blue Background> │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ <Ministry of Justice Logo> Ministry of Justice │ │
│ │ │ │
│ │ Sign in │ │
│ │ < Email, phone, or Skype > │ │
│ │ Can''t access your account? │ │
│ │ │ │
│ │ <Back> <Next> │ │
│ └────────────────────────────────────────────────────────────────┘ │
│ Terms of use | Privacy & cookies | ⋯ Troubleshooting details │
└──────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## 
 ### C. Sign-in Options Page

┌──────────────────────────────────────────────────────────────────────┐
│ <Blue Background> │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ <Ministry of Justice Logo> Ministry of Justice │ │
│ │ │ │
│ │ Sign-in options │ │
│ │ 👤🔑 Face, fingerprint, PIN or security key │ │
│ │ Use your device to sign in with a passkey. (?) │ │
│ │ <Learn how to set this up> <Close> │ │
│ │ <GitHub icon> Sign in with GitHub │ │
│ │ │ │
│ │ <Back> │ │
│ └────────────────────────────────────────────────────────────────┘ │
│ Terms of use | Privacy & cookies | ⋯ Troubleshooting details │
└──────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## Form Fields

|Field|Type|Required|Placeholder|Validation|
|~~--~~~~--~~|~~--~~~~-|~~~~--~~~~--~~~~-|~~~~--~~~~--~~~~--~~~~|-~~~~--~~~~--~~---|
|Email/Phone/Skype|Text|Yes|“Email, phone, or Skype”|Must be a valid email or phone format|
|Verify Email|Text|Yes|“Enter verification code”|Must match code sent to user|
|Passkey/Face ID|Biometric input|Optional|—|Only available if previously set up|

—
 # 
 ## Content

{**}`**`EN:`**`{**} Title/H1 — “Sign in”  
{**}`**`CY:`**`{**} Title/H1 — “Welsh placeholder”

{**}`**`EN:`**`{**} Banner text — “Pick an account”, “Sign in”, “Verify your email”, “Sign-in options”  
{**}`**`CY:`**`{**} Banner text — “Welsh placeholder”, “Welsh placeholder”, “Welsh placeholder”, “Welsh placeholder”

{**}`**`EN:`**`{**} Buttons — “Next”, “Back”, “Send code”, “Close”  
{**}`**`CY:`**`{**} Buttons — “Welsh placeholder”, “Welsh placeholder”, “Welsh placeholder”, “Welsh placeholder”

{**}`**`EN:`**`{**} Links — “Can’t access your account?”, “Learn how to set this up”, “Already received a code?”, “Use your password”  
{**}`**`CY:`**`{**} Links — “Welsh placeholder”, “Welsh placeholder”, “Welsh placeholder”, “Welsh placeholder”

—
 # 
 ## URL Structure

|Page|URL|
|~~--~~~~-|~~---|
|Pick an account|`/admin/sso/pick-account`|
|Sign in|`/admin/sso/sign-in`|
|Verify email|`/admin/sso/verify-email`|
|Sign~~in options|`/admin/sso/sign~~in-options`|
|Dashboard|`/admin/dashboard`|

—
 # 
 ## Validation Rules

 - Required fields must not be empty.  
 - Empty input triggers error message: {**}`**`“Enter a valid email address, phone number, or Skype name.”`**`{**}  
 - Unrecognised credentials trigger the {**}`**`Verify your email`**`{**} workflow.  
 - Code verification must match system-sent code for authentication.  
 - Only authorised SSO accounts can access the System Admin Dashboard.  

—
 # 
 ## Error Messages

{**}`**`EN:`**`{**}  
 - “Enter a valid email address, phone number, or Skype name.”  
 - “We couldn’t verify your details. Please try again.”  
 - “This account is not authorised for CaTH access.”  

{**}`**`CY:`**`{**}  
 - “Welsh placeholder”  
 - “Welsh placeholder”  
 - “Welsh placeholder”

—
 # 
 ## Navigation

 - {**}`**`Pick an account → Sign in`**`{**} (if “Use another account” clicked)  
 - {**}`**`Sign in → Verify email`**`{**} (if unknown credentials entered)  
 - {**}`**`Sign in → Dashboard`**`{**} (if valid credentials entered)  
 - {**}`**`Verify email → Send code`**`{**} → Verify → Dashboard  
 - {**}`**`Sign-in options → Microsoft Support / GitHub pages`**`{**}  
 - {**}`**`Back → Previous step`**`{**}  
 - {**}`**`⋯ → Troubleshooting details pop-up`**`{**}

—
 # 
 ## Accessibility

 - All pages must comply with {**}`**`WCAG 2.2 AA`**`{**} and {**}`**`GOV.UK Design System`**`{**} standards.  
 - Contrast ratio for GDS blue background must meet accessibility standards (minimum 4.5:1).  
 - Ensure ARIA labels for icons (“Face”, “GitHub”, “Question help icon”).  
 - Screen readers must announce the purpose of each icon and message banner.  
 - Focus order must follow logical sequence: logo → title → input → links → buttons.  
 - Error messages must be announced automatically to assistive technologies.  

—
 # 
 ## Test Scenarios

|ID|Scenario|Steps|Expected Result|
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
|TS1|Valid sign-in|Enter correct SSO details|Redirects to Dashboard|
|TS2|Empty credentials|Leave field blank, click Next|Error message “Enter a valid email address…”|
|TS3|Invalid credentials|Enter unrecognised email|Redirected to Verify your email page|
|TS4|Verify via code|Enter email → click Send code → enter valid code|Redirect to Dashboard|
|TS5|Sign~~in options|Click “Sign~~in options”|Page displays Passkey and GitHub options|
|TS6|Learn how to set this up|Click “Learn how to set this up”|Redirect to Microsoft Support page|
|TS7|Accessibility test|Use keyboard-only navigation|All elements are reachable and labelled|
|TS8|Troubleshooting details|Click ⋯|Pop-up box displays diagnostic information|
|TS9|Invalid code|Enter incorrect verification code|Error displayed “We couldn’t verify your details.”|

—
 # 
 ## Assumptions / Open Questions

 - Confirm if the {**}`**`Dashboard URL`**`{**} for system admin differs from media users.  
 - Confirm if {**}`**`multi-factor authentication (MFA)`**`{**} is required beyond SSO.  
 - Confirm whether {**}`**`troubleshooting details`**`{**} should be available for all users or admin only.  
 - Confirm if {**}`**`error codes`**`{**} displayed in troubleshooting can be logged automatically.  
 - Confirm if {**}`**`GitHub sign-in`**`{**} is for developers or administrative debugging purposes only.

—', 'functional', 'verified', 'high', 'story', 268, 'https://github.com/hmcts/cath-service/issues/268', '2026-01-20T17:11:55Z', '2026-01-30T15:04:37Z', 'linusnorton', 'linusnorton'),
  (47, 'REQ-0047', 'Single Sign On - Admin User', '**Covered by VIBE-201**

 

**PROBLEM STATEMENT**

An admin user in CaTH is given access to the admin functionality by signing in using the single sign on information to access their account which then takes them to the dashboard as the landing page.

 

**AS AN** Admin User

**I WANT** to sign into CaTH

**SO THAT** I can view the admin dashboard

 

**ACCEPTANCE CRITERIA**
 * The admin user is given access to CaTH admin functionality by a system admin user
 * The admin user is able to sign in using their approved ministry of justice single sign on (SSO) information
 * The SSO sign in page should be blue in colour (approved GDS blue colour)
 * At the centre of the page should be a white square display section which displays the Ministry of Justice logo with the words ‘Ministry of Justice’ written beside it at the top
 * The next is a header titled ‘Pick an account’ that has 2 icons beneath. First is a name tag icon in a grey circle that shows the users full name, justice email address and a message ‘Connected to Windows’ followed by a plus sign in a grey circle with the instructive words ‘Use another account’. if the user clicks the first option, the user is automatically signed in to their account. If the user clicks the 2nd option, then the user is a taken to a 2{^}nd{^} ‘Sign in’ page
 * The 2{^}nd{^} sign in page which follows the same specifications and is titled ‘Sign in’ boldly written as a page header. Next is a free text line that allows the admin user input their SSO information. This should contain a descriptive message that states ‘Email, phone, or Skype''. Underneath the free text line is the link masked in the words ‘Can’t access your account?’ which takes the user to the <Sign in to your account>(https://login.microsoftonline.com/c6874728~~71e6~~41fe~~a9e1~~2e8c36776ad8/oauth2/v2.0/authorize?redirect*uri=https%3A%2F%2Fpip~~frontend.demo.platform.hmcts.net%2Fsso%2Freturn&response*type=code&response*mode=query&client*id=f01b53bb~~a3d1~~4965~~b66c~~50848a118cf6&state=9cTotcagH44pHt2mz3qXfrsPipV20TuW&nonce=8NPglMBUrH55QX36_g7ZzjstlQYN6erV&scope=openid%20profile%20email%20openid&x~~client~~SKU=passport~~azure~~ad&x~~client-Ver=4.3.2) page with the tile ‘Which type of account do you need help with?’ . 
 * The ''Sign in to your account'' page has 2 icons; a name tag icon in grey circle with the descriptive text ‘Work or school account’ followed by ‘Created by your IT department. The 2{^}nd{^} icon with a person in a grey circle and the descriptive text ‘Personal account followed by ‘Created by you’. Lastly a grey ‘Back’ button. Next are two buttons on the right; a ‘Back’ button in grey tab and a ‘Next’ button in the approved GDS blue colour. Beneath is a grey section that states the descriptive text ‘This is a private system, only use this system if you have specific authority to do so. Otherwise you are liable to prosecution under the Computer Misuse Act 1990. If you do not have the express permission of the operator or owner of this system switch off’. In another section undeath is a white rectangular display box that has a key logo and the words ‘Sign-in options’ written in it
 * If the admin user clicks on the ''Sign ~~in options'', then the user is taken to another page similar to the above mentions with the same logo and ‘Ministry of Justice’ clearly written at the top and a header titled ‘Sign~~in options’ followed by 2 icons; first is a black person icon with a key beside it and the descriptive message written ‘Face, fingerprint, PIN or security key’ on the first line and ‘Use your device to sign in with a passkey.’ On the right side of the message is a ‘question mark in a circle’ icon that the user can click on which display the following message ‘It''s easier and safer to sign in with passkeys. You can sign in using your face, fingerprint, PIN, or use another device like a phone or security key. No passwords, apps, or codes needed. To use this option, you must have previously set this up on your account. <Learn how to set this up>(https://go.microsoft.com/fwlink/?linkid=2013738)’
 * if the admin user clicks the ‘learn how to set this up’ link, then the user is taken to the Microsoft page with more information on this link <Signing in with a passkey - Microsoft Support >(https://support.microsoft.com/en~~gb/account~~billing/signing~~in~~with~~a-passkey~~09a49a86~~ca47~~406c~~8acc~~ed0e3c852c6d) and beneath the display message is a ‘Close’ button in the GDS blue colour
 * Back on the ‘Sign~~in options’ page, the next icon under the ‘black person icon with a key’ is the GitHub icon with the instructive message written beside it ‘Sign in with GitHub’ which takes the user to the <Sign in to GitHub · GitHub>(https://github.com/login?allow*signup=false&client*id=e37ffdec11c0245cb2e0&return*to=%2Flogin%2Foauth%2Fauthorize%3Fclient*id%3De37ffdec11c0245cb2e0%26redirect*uri%3Dhttps%253A%252F%252Flogin.live.com%252FHandleGithubResponse.srf%26response*type%3Dcode%26scope%3Dread%253Auser%2B%2Buser%253Aemail%26state%3D6A40538C3C4BF002) page. Underneath the two icons on the ‘Sign~~in options’ page is the ‘Back’ button in grey.
 * At the bottom right of the SSO sign in page is the ‘Terms of use’ and the ‘Privacy & cookies’ which takes the user to <Microsoft Services Agreement>(https://www.microsoft.com/en~~GB/servicesagreement/) and <Microsoft Privacy Statement – Microsoft privacy>(https://www.microsoft.com/en~~GB/privacy/privacystatement) respectively
 * Following on the same line are 3 dots which when clicked displays a white pop~~up display box with the ‘Troubleshooting details’ that displays the following descriptive message ‘Troubleshooting details. *** If you contact your administrator, send this info to them. <Copy info to clipboard>(https://login.microsoftonline.com/c6874728~~71e6~~41fe~~a9e1~~2e8c36776ad8/oauth2/v2.0/authorize?redirect*uri=https%3a%2f%2fpip~~frontend.demo.platform.hmcts.net%2fsso%2freturn&response*type=code&response*mode=query&client*id=f01b53bb~~a3d1~~4965~~b66c~~50848a118cf6&state=GpO4qganmbKb~~Bl2YJ0RNkMiEQsMH6wG&nonce=ahkjkgn699HvgUnTPtOD9TA0Ma8dcu~~U&scope=openid+profile+email+openid&x~~client~~SKU=passport~~azure~~ad&x~~client~~Ver=4.3.2&sso*nonce=AwABEgEAAAADAOz*BQD0*4fZ0YvGAGy9106cUg*9mB6XHw8eSGDjIR2bIUTtZsxWgrIFekWrssrsf2nKGxpx67pcp1S8~~XxC~~wCpKAeEJt8gAA&client~~request~~id=4d0cb32e~~1f0d~~47fb~~af0c~~90090088e889&mscrid=4d0cb32e~~1f0d~~47fb~~af0c~~90090088e889) . *Error Code:**  **Request Id:** 5e6c40b5~~38f5~~4c0c~~a437~~eef492a54a00. **Correlation Id:** 4d0cb32e~~1f0d~~47fb~~af0c~~90090088e889. **Timestamp:** 2025~~10~~24T10:47:28.573Z. **Flag sign-in errors for review:** <Enable flagging>(https://login.microsoftonline.com/common/debugmode). If you plan on getting help for this problem, enable flagging and try to reproduce the error within 20 minutes. Flagged events make diagnostics available and are raised to admin attention.
 * Where the user does not input the SSO information before attempting to sign in, then the following error message is displayed ''Enter a valid email address, phone number, or Skype name.''
 * Where inputs an unidentified email address, then the user is taken to another screen and prompted to verify their SSO details. The page displays the header ''Verify your email'' with the following message beneath ''We''ll send a code to jh*******@gh.se. To verify this is your email, enter it here.''
 * A free text box that allows the user type in their email address is provided
 * A ''send code'' button in the blue GDS colour is provided beneath which authorises a validation code to be sent to the user when the user inputs their emails and taps the button
 * 2 lines with links masked in the texts ''Already received a code?'' and ''Use your password'' are provided which allows the user input the received code on another page or input their password respectively.
 * All CaTH pages specifications are maintained’.

 

 
 # VIBE~~202 Admin SSO Sign~~In Specification

> Owner: **{*}VIBE-202{**}* · Updated: **{*}22 Oct 2025{**}*

—
 # 
 ## Problem Statement

An admin user in CaTH is given access to admin functionality after being approved by a system admin user.  
The admin must sign in using **{*}Ministry of Justice Single Sign-On (SSO){**}* credentials to access their account.  
Upon successful authentication, they are redirected to the **{*}Admin Dashboard{**}*, which serves as their landing page.

—
 # 
 ## User Story

**{*}As an{**}* **Admin User**  
**{*}I want to{**}* **sign into CaTH using my Ministry of Justice SSO credentials**  
**{*}So that{**}* **I can access the Admin Dashboard and manage administrative tasks securely**

—
 # 
 ## Acceptance Criteria

1. The admin user is given access to CaTH admin functionality by a system admin user.  
2. The admin user can sign in using their approved **{*}Ministry of Justice SSO credentials{**}*.  
3. The SSO sign-in page must have an **{*}approved GDS blue{**}* background.  
4. At the centre of the page, a **{*}white square panel{**}* displays:  
   - **{*}Ministry of Justice logo{**}*  
   - The text **{*}“Ministry of Justice”{**}* beside the logo  
   - A header titled **{*}“Pick an account”{**}*  
5. Beneath the header, two selectable icons appear:  
   - **{*}Option 1:{**}* Grey circle with a name tag icon showing:  
     - User’s full name  
     - Justice email address  
     - Text: **“Connected to Windows”**  
   - **{*}Option 2:{**}* Grey circle with a plus sign icon and text: **“Use another account”**  
6. Selecting the first option automatically signs the user in.  
7. Selecting **{*}“Use another account”{**}* directs the user to a **{*}“Sign in”{**}* page.  
8. The **{*}Sign-in{**}* page includes:  
   - Header: **“Sign in”**  
   - Input field: **“Email, phone, or Skype”**  
   - Link: **“Can’t access your account?”** → navigates to the **{*}“Sign in to your account”{**}* page  
9. The **{*}“Sign in to your account”{**}* page includes:  
   - Two icons:  
     - Name tag icon – “Work or school account – Created by your IT department”  
     - Person icon – “Personal account – Created by you”  
   - Two buttons:  
     - **{*}Back (grey){**}*  
     - **{*}Next (GDS blue){**}*  
   - Grey section containing a disclaimer:  
     “This is a private system, only use this system if you have specific authority to do so…”  
   - White box with key icon: **“Sign-in options”**  
10. Clicking **{*}“Sign~~in options”{**}* opens a new page titled {**}“Sign~~in options”{**}, which includes:  
    - Black person icon with key and descriptive text:  
      - “Face, fingerprint, PIN or security key”  
      - “Use your device to sign in with a passkey.”  
    - **{*}Question mark icon{**}* opens a tooltip:  
      “It’s easier and safer to sign in with passkeys… Learn how to set this up.”  
      - The **{*}‘Learn how to set this up’{**}* link opens Microsoft’s **Signing in with a passkey** support page.  
    - Second icon: **{*}GitHub logo{**}* with text “Sign in with GitHub” → redirects to GitHub login.  
    - **{*}Back{**}* button (grey).  
11. At the bottom right of all SSO pages:  
    - Links: **{*}“Terms of use”{**}* and **{*}“Privacy & cookies”{**}* → Microsoft Services Agreement and Microsoft Privacy Statement.  
    - **{*}Three dots (⋯){**}* menu opens a popup with **{*}Troubleshooting details{**}* message and metadata (Request ID, Correlation ID, Timestamp, etc.).  
12. If the admin attempts to sign in without entering details, display:  
    - “Enter a valid email address, phone number, or Skype name.”  
13. If an unrecognised email is entered, display a **{*}“Verify your email”{**}* page containing:  
    - Header: **“Verify your email”**  
    - Message: {**}“We’ll send a code to jh{**}****{**}@gh.se. To verify this is your email, enter it here.”{*}  
    - Text box for email input  
    - **{*}Send code{**}* button (GDS blue)  
    - Two links:  
      - **“Already received a code?”** → opens page for code input  
      - **“Use your password”** → opens password input page  
14. All CaTH pages must maintain GOV.UK and accessibility specifications.

—
 # 
 ## User Journey Flow

1. Admin navigates to CaTH admin login (`/admin/login`).  
2. SSO sign-in page appears with blue background.  
3. Admin selects existing account or clicks {**}“Use another account”{**}.  
4. If **“Use another account”** is selected, the admin is directed to the **{*}Sign in{**}* page.  
5. Admin enters valid credentials and signs in successfully.  
6. If credentials are invalid or unrecognised, a **{*}Verify your email{**}* page is displayed.  
7. Upon successful verification or login, the admin is redirected to the **{*}Admin Dashboard{**}* (`/admin/dashboard`).

—
 # 
 ## Wireframes

 # 
 ## 
 ### 1️⃣ Pick an Account (Main SSO Page)

 

┌──────────────────────────────────────────────────────────────────────────┐
│ Background: GDS Blue │
│ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ <Ministry of Justice Logo> Ministry of Justice │ │
│ │~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~~~--~~--│ │
│ │ Pick an account │ │
│ │ │ │
│ │ ○ <Name tag icon> John Doe │ │
│ │ john.doe@justice.gov.uk │ │
│ │ Connected to Windows │ │
│ │ │ │
│ │ ○ <+> Use another account │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ │
│ Terms of use | Privacy & cookies | ⋯ │
└──────────────────────────────────────────────────────────────────────────

 

—
 # 
 ## 
 ### 2️⃣ Sign-In Page

 

┌──────────────────────────────────────────────────────────────────────────┐
│ <Ministry of Justice Logo> Ministry of Justice │
│──────────────────────────────────────────────────────────────────────────│
│ Sign in │
│ │
│ Email, phone, or Skype <*__**__**__**__**__**__**__*_> │
│ │
│ Can’t access your account? │
│ │
│ <Back> <Next> │
│ │
│ Terms of use | Privacy & cookies | ⋯ │
└──────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## 
 ### 3️⃣ Sign in to Your Account Page

 

┌──────────────────────────────────────────────────────────────────────────┐
│ Work or school account – Created by your IT department │
│ Personal account – Created by you │
│──────────────────────────────────────────────────────────────────────────│
│ <Back> <Next> │
│──────────────────────────────────────────────────────────────────────────│
│ ⚠ This is a private system... Computer Misuse Act 1990 notice │
│──────────────────────────────────────────────────────────────────────────│
│ <Key icon> Sign-in options │
│──────────────────────────────────────────────────────────────────────────│
│ Terms of use | Privacy & cookies | ⋯ │
└──────────────────────────────────────────────────────────────────────────┘

 

 

—
 # 
 ## 
 ### 4️⃣ Sign-In Options Page

 

┌──────────────────────────────────────────────────────────────────────────┐
│ Sign-in options │
│──────────────────────────────────────────────────────────────────────────│
│ <👤🔑> Face, fingerprint, PIN or security key │
│ Use your device to sign in with a passkey. (?) │
│──────────────────────────────────────────────────────────────────────────│
│ <GitHub icon> Sign in with GitHub │
│──────────────────────────────────────────────────────────────────────────│
│ <Back> │
│──────────────────────────────────────────────────────────────────────────│
│ Terms of use | Privacy & cookies | ⋯ │
└──────────────────────────────────────────────────────────────────────────┘

 

 

—
 # 
 ## 
 ### 5️⃣ Verify Your Email Page

 

┌──────────────────────────────────────────────────────────────────────────┐
│ Verify your email │
│──────────────────────────────────────────────────────────────────────────│
│ We’ll send a code to jh*******@gh.se. To verify this is your email, │
│ enter it here. │
│ │
│ <*__**__**__**__**__**__*___> │
│ │
│ <Send code> │
│ │
│ Already received a code? | Use your password │
│ │
│ Terms of use | Privacy & cookies | ⋯ │
└──────────────────────────────────────────────────────────────────────────┘

 

 

—
 # 
 ## Content

**{*}EN:{**}* Titles/H1 — “Pick an account”, “Sign in”, “Verify your email”, “Sign-in options”  
**{*}CY:{**}* Titles/H1 — “Welsh placeholder”

**{*}EN:{**}* Labels and messages —  
 - “Email, phone, or Skype”  
 - “Can’t access your account?”  
 - “Connected to Windows”  
 - “Enter a valid email address, phone number, or Skype name.”  
 - “We’ll send a code to jh*******@gh.se. To verify this is your email, enter it here.”  
**{*}CY:{**}* Labels and messages — “Welsh placeholder” for each item.  

**{*}EN:{**}* Buttons — “Back”, “Next”, “Send code”, “Close”  
**{*}CY:{**}* Buttons — “Welsh placeholder”, “Welsh placeholder”, “Welsh placeholder”, “Welsh placeholder”

**{*}EN:{**}* Links — “Terms of use”, “Privacy & cookies”, “Learn how to set this up”, “Already received a code?”, “Use your password”  
**{*}CY:{**}* Links — “Welsh placeholder” for each.

—
 # 
 ## URL Structure

 - `/admin/login` → SSO entry page (Pick an account)  
 - `/admin/login/signin` → Sign-in form page  
 - `/admin/login/account-help` → Sign in to your account page  
 - `/admin/login/signin-options` → Passkey and GitHub options  
 - `/admin/login/verify` → Verify your email page  
 - `/admin/dashboard` → Post-login landing page  

—
 # 
 ## Validation Rules

 - All input fields are required before submission.  
 - If no credentials entered → show “Enter a valid email address, phone number, or Skype name.”  
 - Invalid or unrecognised credentials → trigger “Verify your email” flow.  
 - Only authenticated and authorised admin users are allowed beyond `/admin/login`.  

—
 # 
 ## Error Messages

**{*}EN:{**}*  
 - “Enter a valid email address, phone number, or Skype name.”  
 - “We couldn’t verify your account. Try again.”  
 - “You do not have access to this account.”  
**{*}CY:{**}*  
 - “Welsh placeholder” for each message.

—
 # 
 ## Navigation

 - **{*}Pick an account:{**}* → `/admin/login/signin` or automatic login  
 - **{*}Can’t access your account:{**}* → `/admin/login/account-help`  
 - **{*}Sign~~in options:{**}* → `/admin/login/signin~~options`  
 - **{*}Verify your email:{**}* → `/admin/login/verify`  
 - **{*}Back:{**}* Returns to the previous page  
 - **{*}Next / Send code:{**}* Advances to next step  
 - **{*}Terms of use:{**}* → Microsoft Services Agreement  
 - **{*}Privacy & cookies:{**}* → Microsoft Privacy Statement  

—
 # 
 ## Accessibility

 - Must comply with **{*}WCAG 2.2 AA{**}* and **{*}GOV.UK Design System{**}* standards.  
 - Use ARIA roles for interactive icons (question mark, info icons).  
 - Ensure all interactive components (links, buttons, tooltip) are keyboard navigable.  
 - Ensure sufficient colour contrast between blue background and white content panel.  
 - Screen readers must announce page headers and input field labels.  
 - Tooltips and error messages must be accessible using `aria-describedby`.  

—
 # 
 ## Test Scenarios

|ID|Scenario|Steps|Expected Result|
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
|TS1|Access SSO login|Navigate to `/admin/login`|Page loads with blue background and Ministry of Justice logo|
|TS2|Pick existing account|Select existing account|User automatically signed in|
|TS3|Use another account|Click “Use another account”|Redirected to Sign-in page|
|TS4|Invalid credentials|Leave email blank and click Next|Error message “Enter a valid email address…” displayed|
|TS5|Unrecognised email|Enter unregistered email|Redirected to Verify your email page|
|TS6|Send code|Enter email and click Send code|Code sent confirmation displayed|
|TS7|Use password|Click “Use your password”|Redirected to password entry page|
|TS8|Learn more link|Click “Learn how to set this up”|Opens Microsoft Support page|
|TS9|Accessibility - Keyboard navigation|Tab through all links and buttons|Focus visible and accessible|
|TS10|Troubleshooting details|Click ⋯ menu|Popup appears showing Request ID, Correlation ID, Timestamp|

—
 # 
 ## Assumptions / Open Questions

 - Confirm if MFA (multi-factor authentication) applies for admin users.  
 - Confirm if “Verify your email” feature should include SMS verification as an alternative.  
 - Confirm if session timeout duration matches MoJ default.  
 - Confirm if GitHub sign-in option is mandatory or configurable.  
 - Confirm if unsuccessful verification attempts trigger lockout.  

—', 'functional', 'verified', 'high', 'story', 269, 'https://github.com/hmcts/cath-service/issues/269', '2026-01-20T17:12:10Z', '2026-01-30T15:04:39Z', 'linusnorton', 'linusnorton'),
  (48, 'REQ-0048', 'System Admin User – Dashboard', '**PROBLEM STATEMENT**

System admin users in CaTH require a centralised dashboard that allows access to all key administrative functions.  
This dashboard acts as the main control panel for managing reference data, user accounts, media accounts, audit logs, and other administrative operations.

 

**AS A** System Admin User

**I WANT** to access the System Admin Dashboard in CaTH

**SO THAT** I can manage CaTH efficiently

 

**ACCEPTANCE CRITERIA**
 * The System Admin Dashboard is accessible only to users with **system admin privileges

 *  The dashboard serves as the landing page following a successful SSO sign-in

 * The dashboard must include the usual navigation links in the header; GOV.UK, Court and tribunal hearings, Dashboard, Admin Dashboard and Sign out  

 * The page header displays ***System Admin Dashboard*** as the main title.  

 * Below the title, tiles (cards) provide access to key administrative features with each tile displaying a title and supporting descriptive text in a 2-column grid layout

 * First is the ''Upload Reference Data'' that displays the descriptive message ''Upload CSV location reference data''

 * Underneath is the ''Manage Third~~Party Users'' tile with the descriptive message ''View, create, update and remove third~~party users and subscriptions''   

 * Beside the ''Upload Reference data'' tile is the ''Delete Court'' tile with the descriptive message ''Delete court from reference data''

 * Beside the ''Manage third party users'' is the ''User Management'' tile with the descriptive message ''Search, update and delete users''

 * Underneath the ''Manage third party users'' is the ''Blob Explorer'' tile with the descriptive message ''Discover content uploaded to all locations.'' 
 * Underneath the the ''Upload Reference data'' tile is the ''Audit Log Viewer'' with the descriptive message ''View audit logs on system admin actions''
 * Beside the ''Blob explorer'' tile is the ''Bulk Create Media Accounts'' with the descriptive message ''Upload a CSV file for bulk creation of media accounts''
 * Beside the ''Upload Reference data'' is the ''Manage Location Metadata'' with the descriptive message ''View, update and remove location metadata'' 
 * The dashboard includes a ***Back*** link that returns to the previous page.  
 * The dashboard layout must conform to GOV.UK Design System and CaTH style standards.  
 * All links and content must meet accessibility and navigation requirements.
 * All CaTH page specifications are maintained 

 

 

 

# VIBE-203 System Admin Dashboard Specification

> Owner: ***VIBE-203*** · Updated: ***22 Oct 2025***

---

## Problem Statement

System admin users in CaTH require a centralised dashboard that allows access to all key administrative functions.  
This dashboard acts as the main control panel for managing reference data, user accounts, media accounts, audit logs, and other administrative operations.

---

## User Story

***As a*** **System Admin User**  
***I want to*** **access the System Admin Dashboard in CaTH**  
***So that*** **I can manage CaTH efficiently**

---

## Acceptance Criteria

1. The System Admin Dashboard is accessible only to users with ***system admin privileges***.  
2. The dashboard serves as the landing page following a successful SSO sign-in.  
3. The dashboard must include ***navigation links*** in the header:  
   - GOV.UK  
   - Court and tribunal hearings  
   - Dashboard  
   - Admin Dashboard  
   - Sign out  
4. The page header displays ***System Admin Dashboard*** as the main title.  
5. Below the title, tiles (cards) provide access to key administrative features.  
6. Each tile must display a ***title (link)*** and ***supporting descriptive text***.  
7. The following tiles must appear in a 2-column grid layout:

   | Tile Title | Description | Target URL |
   |~~--~~~~--~~~~--~~~~|-~~~~--~~~~--~~~~--~~|~~--~~~~--~~~~--~~-|
   | Upload Reference Data | Upload CSV location reference data | `/admin/upload~~reference~~data` |
   | Delete Court | Delete court from reference data | `/admin/delete-court` |
   | Manage Third~~Party Users | View, create, update and remove third~~party users and subscriptions | `/admin/third~~party~~users` |
   | User Management | Search, update and delete users | `/admin/user-management` |
   | Blob Explorer | Discover content uploaded to all locations | `/admin/blob-explorer` |
   | Bulk Create Media Accounts | Upload a CSV file for bulk creation of media accounts | `/admin/bulk~~media~~accounts` |
   | Audit Log Viewer | View audit logs on system admin actions | `/admin/audit~~log~~viewer` |
   | Manage Location Metadata | View, update and remove location metadata | `/admin/location-metadata` |

8. The dashboard includes a ***Back*** link that returns to the previous page.  
9. The dashboard layout must conform to GOV.UK Design System and CaTH style standards.  
10. All links and content must meet accessibility and navigation requirements.

11. All  CaTH page specifications are maintained 

---

## User Journey Flow

1. System admin signs in using SSO credentials.  
2. Upon successful sign-in, the system redirects to `/admin/dashboard`.  
3. The user sees a dashboard displaying all administrative tiles.  
4. The user can click any tile to open the corresponding admin function page.  
5. The user can click ***Sign out*** in the header to securely log out.  

---

## Wireframe

 

┌──────────────────────────────────────────────────────────────────────────┐
│ GOV.UK Court and tribunal hearings │
│──────────────────────────────────────────────────────────────────────────│
│ Dashboard | Admin Dashboard | Sign out │
├──────────────────────────────────────────────────────────────────────────┤
│ < Back │
│ │
│ System Admin Dashboard │
│ │
│ ┌───────────────────────────┐ ┌───────────────────────────┐ │
│ │ Upload Reference Data │ │ Delete Court │ │
│ │ Upload CSV location │ │ Delete court from │ │
│ │ reference data │ │ reference data │ │
│ └───────────────────────────┘ └───────────────────────────┘ │
│ │
│ ┌───────────────────────────┐ ┌───────────────────────────┐ │
│ │ Manage Third-Party Users │ │ User Management │ │
│ │ View, create, update and │ │ Search, update and delete │ │
│ │ remove third-party users │ │ users │ │
│ └───────────────────────────┘ └───────────────────────────┘ │
│ │
│ ┌───────────────────────────┐ ┌───────────────────────────┐ │
│ │ Blob Explorer │ │ Bulk Create Media Accounts│ │
│ │ Discover content uploaded │ │ Upload CSV file for bulk │ │
│ │ to all locations │ │ creation of media accounts│ │
│ └───────────────────────────┘ └───────────────────────────┘ │
│ │
│ ┌───────────────────────────┐ ┌───────────────────────────┐ │
│ │ Audit Log Viewer │ │ Manage Location Metadata │ │
│ │ View audit logs on system │ │ View, update and remove │ │
│ │ admin actions │ │ location metadata │ │
│ └───────────────────────────┘ └───────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘

 


---

## Content

***EN:*** Title/H1 — “System Admin Dashboard”  
***CY:*** Title/H1 — “Welsh placeholder”

***EN:*** Tile titles and descriptions —  
- Upload Reference Data — “Upload CSV location reference data”  
- Delete Court — “Delete court from reference data”  
- Manage Third~~Party Users — “View, create, update and remove third~~party users and subscriptions”  
- User Management — “Search, update and delete users”  
- Blob Explorer — “Discover content uploaded to all locations”  
- Bulk Create Media Accounts — “Upload a CSV file for bulk creation of media accounts”  
- Audit Log Viewer — “View audit logs on system admin actions”  
- Manage Location Metadata — “View, update and remove location metadata”

***CY:*** Tile titles and descriptions —  
“Welsh placeholder” for each title and line above.

***EN:*** Navigation links — “Court and tribunal hearings”, “Dashboard”, “Admin Dashboard”, “Sign out”  
***CY:*** Navigation links — “Welsh placeholder”, “Welsh placeholder”, “Welsh placeholder”, “Welsh placeholder”

***EN:*** Back link — “Back”  
***CY:*** Back link — “Welsh placeholder”

---

## URL

`/admin/dashboard`

---

## Validation Rules

- Only authenticated ***system admin*** users may access this page.  
- If a non~~admin attempts to access `/admin/dashboard`, they must be redirected to the sign~~in page.  
- Links must correctly route to the defined URLs and open in the same window.  
- The ***Sign out*** button must terminate the SSO session and clear authentication tokens.  

---

## Error Messages

***EN:***  
- “You do not have permission to access this page.”  
- “An error occurred while loading dashboard data.”  

***CY:***  
- “Welsh placeholder”  
- “Welsh placeholder”

---

## Navigation

- ***Back:*** Returns to previous page.  
- ***Upload Reference Data:*** `/admin/upload~~reference~~data`  
- ***Delete Court:*** `/admin/delete-court`  
- ***Manage Third~~Party Users:*** `/admin/third~~party-users`  
- ***User Management:*** `/admin/user-management`  
- ***Blob Explorer:*** `/admin/blob-explorer`  
- ***Bulk Create Media Accounts:*** `/admin/bulk~~media~~accounts`  
- ***Audit Log Viewer:*** `/admin/audit~~log~~viewer`  
- ***Manage Location Metadata:*** `/admin/location-metadata`  
- ***Sign out:*** Logs out and redirects to SSO login page.  

---

## Accessibility

- Must comply with ***WCAG 2.2 AA*** and ***GOV.UK Design System*** guidelines.  
- All tiles must be keyboard navigable and include visible focus outlines.  
- Each tile link must use ARIA labels describing both the title and description text.  
- Ensure colour contrast between tile borders, text, and background meets GOV.UK standards.  
- Page heading must be an `<h1>` element with correct semantic structure.  
- Screen reader users must be able to understand tile hierarchy and navigation structure.  

---

## Test Scenarios

| ID | Scenario | Steps | Expected Result |
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
| TS1 | Admin dashboard load | Sign in as system admin | Dashboard displays with all tiles visible |
| TS2 | Non~~admin access | Try accessing `/admin/dashboard` without permissions | Redirected to sign~~in page |
| TS3 | Navigation - Upload Reference Data | Click tile | Redirected to `/admin/upload~~reference~~data` |
| TS4 | Navigation - Delete Court | Click tile | Redirected to `/admin/delete-court` |
| TS5 | Navigation - User Management | Click tile | Redirected to `/admin/user-management` |
| TS6 | Navigation - Blob Explorer | Click tile | Redirected to `/admin/blob-explorer` |
| TS7 | Navigation - Manage Location Metadata | Click tile | Redirected to `/admin/location-metadata` |
| TS8 | Accessibility - Keyboard navigation | Tab through tiles | All tiles reachable with visible focus |
| TS9 | Accessibility - Screen reader | Use screen reader | All tile titles and descriptions announced clearly |
| TS10 | Sign out | Click “Sign out” | Session cleared, redirected to SSO login |

---

## Assumptions / Open Questions

- Confirm whether tile layout adjusts responsively (e.g., 1 column on mobile).  
- Confirm if admin dashboard should include activity or status metrics.  
- Confirm if “Admin Dashboard” link remains highlighted when on this page.  
- Confirm if role-based access applies to each tile individually.  
- Confirm caching or refresh interval for audit data display.  

---', 'functional', 'verified', 'high', 'story', 270, 'https://github.com/hmcts/cath-service/issues/270', '2026-01-20T17:12:26Z', '2026-01-30T15:04:41Z', 'linusnorton', 'linusnorton'),
  (49, 'REQ-0049', 'Landing Page - Part 2', '**PROBLEM STATEMENT**

All CaTH users, including members of the public, have access to hearing lists published in CaTH. This would require users to undergo a few steps to navigate through the different pages in CaTH.

 

**AS A** CaTH User

**I WANT** to view published court and tribunal hearing lists

**SO THAT** I can get information about upcoming hearings

 

**ACCEPTANCE CRITERIA**
 * There is a ‘continue’ button on the landing page and underneath the button, Users can see a section with a header titled ''Find a court or tribunal''
 * The following text is provided underneath the header ''Find contact details and other information about courts and tribunals in England and Wales, and some non-devolved tribunals in Scotland''
 * A link to FaCT is masked within the text ''Find contact details and other information about courts and tribunals'' 
 * The link to be masked is <Find a Court or Tribunal - GOV.UK>(https://www.find~~court~~tribunal.service.gov.uk/)
 * Another section is provided underneath the ''Find a court or tribunal'' section and this is titled ''Before you start''
 * A sub-header is provided after the above titled ''If you''re in Scotland or Northern Ireland''
 * Underneath the following information is provided in the following format;

 

Contact the:
 * <Scottish Courts website>(https://www.scotcourts.gov.uk/) for courts and some tribunals in Scotland
 * <Northern Ireland Courts and Tribunals Service>(https://www.justice~~ni.gov.uk/topics/courts~~and-tribunals) for courts and tribunals in Northern Ireland 

 
 * <Home >( Scottish Courts and Tribunals Service|https://www.scotcourts.gov.uk/)  is masked in the ''Scottish Courts website'' text above
 * <Courts and Tribunals >( Department of Justice|https://www.justice~~ni.gov.uk/topics/courts~~and-tribunals) is masked in the ''Northern Ireland Courts and Tribunals Service'' text above
 * All CaTH page specifications are maintained 

 

**Welsh translations:**

Find a court or tribunal - dod o hyd i lys neu dribiwnlys

Find contact details and other information about courts and tribunals in England and Wales, and some non-devolved tribunals in Scotland - Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd yng Nghymru a Lloegr, a rhai tribiwnlysoedd heb eu datganoli yn yr Alban

Before you start - Cyn i chi ddechrau

If you''re in Scotland or Northern Ireland - Os ydych yn byw yn Yr Alban neu Gogledd Iwerddon

Contact the - Cysylltwch â

Scottish Courts website for courts and some tribunals in Scotland - gwefan Llysoedd Yr Alban ar gyfer rhai Llysoedd a Thribiwnlysoedd yn Yr Alban

Northern Ireland Courts and Tribunals Service for courts and tribunals in Northern Ireland - Gwasanaeth Llysoedd a Thribiwnlysoedd Gogledd Iwerddon ar gyfer llysoedd a thribiwnlysoedd yng Ngogledd Iwerddon  

 

 
# VIBE-205 View Published Court and Tribunal Hearing Lists Specification
 
> Owner: ***VIBE-205*** · Updated: ***24 Oct 2025***
 
---
 
## Problem Statement
 
All CaTH users, including members of the public, have access to hearing lists published in CaTH.  
This requires users to navigate through a few pages to view the published court and tribunal hearing information.
 
---
 
## User Story
 
***As a*** **CaTH User**  
***I want to*** **view published court and tribunal hearing lists**  
***So that*** **I can get information about upcoming hearings**
 
---
 
## Acceptance Criteria
 
1. There is a ***‘Continue’*** button on the CaTH landing page.  
2. Underneath the button, a section titled ***‘Find a court or tribunal’*** is displayed.  
3. The following text appears below this header:  
   > “Find contact details and other information about courts and tribunals in England and Wales, and some non-devolved tribunals in Scotland.”  
4. A hyperlink is masked within the words ***‘Find contact details and other information about courts and tribunals’***, linking to the GOV.UK page:  
   - <Find a Court or Tribunal - GOV.UK>(https://www.find~~court~~tribunal.service.gov.uk/)  
5. Another section appears below, titled ***‘Before you start’***.  
6. A sub-header titled ***‘If you''re in Scotland or Northern Ireland’*** is displayed.  
7. The following information appears beneath the sub-header, in two separate paragraphs:  
 
   ***EN:***  
   Contact the:  
   - <Scottish Courts website>(https://www.scotcourts.gov.uk/) for courts and some tribunals in Scotland.  
   - <Northern Ireland Courts and Tribunals Service>(https://www.justice~~ni.gov.uk/topics/courts~~and-tribunals) for courts and tribunals in Northern Ireland.  
 
8. All CaTH page specifications and GOV.UK accessibility standards are maintained.  
9. Welsh translations are provided for bilingual content as listed below.
 
---
 
## User Journey Flow
 
1. The user lands on the ***CaTH homepage***.  
2. The user sees a ***‘Continue’*** button to proceed to published hearing lists.  
3. Below the button, the user sees the ***‘Find a court or tribunal’*** section with explanatory text and a masked hyperlink to the GOV.UK site.  
4. Beneath that, the ***‘Before you start’*** and ***‘If you’re in Scotland or Northern Ireland’*** sections are displayed.  
5. The user can click the links to external websites for Scottish and Northern Ireland courts and tribunals.
 
---
 
## Wireframe
┌──────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK <Language> │
├──────────────────────────────────────────────────────────────────────────────┤
│ HMCTS – Courts and Tribunals Hearings (CaTH) │
├──────────────────────────────────────────────────────────────────────────────┤
│ │
│ <Continue> │
│ │
│ Find a court or tribunal │
│ Find contact details and other information about courts and tribunals in │
│ England and Wales, and some non-devolved tribunals in Scotland. │
│ (Link masked in text → Find a Court or Tribunal - GOV.UK) │
│ │
│ Before you start │
│ If you''re in Scotland or Northern Ireland │
│ Contact the: │
│ - Scottish Courts website for courts and some tribunals in Scotland │
│ (Link: <https://www.scotcourts.gov.uk/>) │
│ - Northern Ireland Courts and Tribunals Service for courts and tribunals in │
│ Northern Ireland │
│ (Link: <https://www.justice~~ni.gov.uk/topics/courts~~and-tribunals>) │
│ │
└────────────────
 
 
 
---
 
## Form Fields
 
No input fields are required on this page.  
This page serves as a static informational and navigation page.
 
---
 
## Content
 
### English (EN)
 
- ***Title/H1:*** “Find a court or tribunal”  
- ***Introductory text:***  
  “Find contact details and other information about courts and tribunals in England and Wales, and some non-devolved tribunals in Scotland.”  
- ***Link (masked in text):*** <Find a Court or Tribunal - GOV.UK>(https://www.find~~court~~tribunal.service.gov.uk/)  
- ***Sub-section title:*** “Before you start”  
- ***Sub-header:*** “If you''re in Scotland or Northern Ireland”  
- ***Contact information:***  
  Contact the:  
  - <Scottish Courts website>(https://www.scotcourts.gov.uk/) for courts and some tribunals in Scotland.  
  - <Northern Ireland Courts and Tribunals Service>(https://www.justice~~ni.gov.uk/topics/courts~~and-tribunals) for courts and tribunals in Northern Ireland.  
- ***Button:*** “Continue”
 
### Welsh (CY)
 
- ***Title/H1:*** “dod o hyd i lys neu dribiwnlys”  
- ***Introductory text:***  
  “Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd yng Nghymru a Lloegr, a rhai tribiwnlysoedd heb eu datganoli yn yr Alban.”  
- ***Sub-section title:*** “Cyn i chi ddechrau”  
- ***Sub-header:*** “Os ydych yn byw yn Yr Alban neu Gogledd Iwerddon”  
- ***Contact information:***  
  Cysylltwch â:  
  - gwefan Llysoedd Yr Alban ar gyfer rhai Llysoedd a Thribiwnlysoedd yn Yr Alban.  
  - Gwasanaeth Llysoedd a Thribiwnlysoedd Gogledd Iwerddon ar gyfer llysoedd a thribiwnlysoedd yng Ngogledd Iwerddon.  
- ***Button:*** “Parhau”
 
---
 
## URL
 
`/hearing-lists`
 
---
 
## Validation Rules
 
- This is a static information page; no input validation required.  
- External links must open in a new browser tab with the GOV.UK standard external link indicator.  
- Ensure bilingual content toggle works correctly.  
- Page must display correctly in both English and Welsh language modes.
 
---
 
## Error Messages
 
None applicable — this page contains only static informational content and links.
 
---
 
## Navigation
 
- ***Continue:*** Proceeds to the next step in the CaTH journey (e.g., viewing available hearing lists).  
- ***External links:***  
  - “Find a Court or Tribunal” → <https://www.find~~court~~tribunal.service.gov.uk/>(https://www.find~~court~~tribunal.service.gov.uk/)  
  - “Scottish Courts website” → <https://www.scotcourts.gov.uk/>(https://www.scotcourts.gov.uk/)  
  - “Northern Ireland Courts and Tribunals Service” → <https://www.justice~~ni.gov.uk/topics/courts~~and~~tribunals>(https://www.justice~~ni.gov.uk/topics/courts~~and~~tribunals)  
- ***Language toggle:*** Switches between English and Welsh content.  
 
---
 
## Accessibility
 
- Page must comply with ***WCAG 2.2 AA*** and ***GOV.UK Design System*** standards.  
- Ensure all links have descriptive text and `aria-labels`.  
- Headings must use a logical hierarchical structure (`<h1>`, `<h2>`, `<h3>`).  
- All external links must open in new tabs and include screen reader warnings (e.g., “opens in a new tab”).  
- Support keyboard navigation and visible focus states.  
- Welsh translations must be fully available and toggleable through the language switch.
 
---
 
## Test Scenarios
 
| ID | Scenario | Steps | Expected Result |
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
| TS1 | Page load | Open CaTH landing page | Page displays correctly with Continue button and two sections |
| TS2 | Continue button | Click “Continue” | User proceeds to next step (hearing list view) |
| TS3 | External link (England/Wales) | Click masked “Find contact details…” text | Redirects to GOV.UK Find a Court or Tribunal page |
| TS4 | External link (Scotland) | Click “Scottish Courts website” | Opens Scottish Courts site in new tab |
| TS5 | External link (Northern Ireland) | Click “Northern Ireland Courts and Tribunals Service” | Opens NI Courts site in new tab |
| TS6 | Language toggle | Switch to Welsh | All text updates to Welsh equivalents |
| TS7 | Accessibility | Use screen reader | All sections, links, and buttons are announced correctly |
| TS8 | Responsive display | View on mobile | Layout adjusts and remains readable |
| TS9 | Focus navigation | Navigate with keyboard only | All links and button are reachable and focus-visible |
 
---
 
## Assumptions / Open Questions
 
- Confirm if the “Continue” button should redirect users to a specific hearing list page (e.g., `/hearing-lists/view`) or a filter page.  
- Confirm if bilingual translations should apply to all linked content (or just internal pages).  
- Confirm if the ***language toggle*** persists user preference across subsequent pages.  
- Confirm if analytics tracking should record outbound link clicks to external sites.  
- Confirm if additional regional tribunal links (e.g., for devolved tribunals) will be included later.
 
---', 'functional', 'verified', 'high', 'story', 271, 'https://github.com/hmcts/cath-service/issues/271', '2026-01-20T17:12:41Z', '2026-01-30T15:04:44Z', 'linusnorton', 'linusnorton'),
  (50, 'REQ-0050', 'Create Court in CaTH', '**PROBLEM STATEMENT**

Court venues need to be created in CaTH so that hearing lists can be published against theses venues. 

 

**AS A** System Admin User

**I WANT** to create a court in CaTH

**SO THAT** I can publish a hearing list against the court in CaTH

 

**ACCEPTANCE CRITERIA**
 * The System Admin user has permissions to create a court as a venue in CaTH
 * Details of each court to be created as a venue in CaTH is first captured within the Court master reference data 
 * The court details to be captured CONTACT, COURT DESC, EMAIL, JURISDICTION, JURISDICTION TYPE, P&I ID, PROVENANCE, PROVENANCE LOCATION ID, PROVENANCE LOCATION TYPE, REGION, WELSH COURT DESC, WELSH JURISDICTION, WELSH JURISDICTION TYPE and WELSH REGION.
 * Each court name created in CaTH should be added to the list of available venues in the upload form to be published against and the list of available courts in CaTH front end
 * All courts must be created as venues in CaTH and mapped to same court names in List assist and Common Platform. The unique ID of the court from source is captured in the Court master reference data as the Provenance ID and the location is captured as the location ID
 * CaTH unique Court ID should be created for each court for easy tracking and identification and documented in the Court master reference data

 

# VIBE-207 Create Court in CaTH Specification

> Owner: ***VIBE-207*** · Updated: ***24 Oct 2025***

---

## Problem Statement

Court venues need to be created in CaTH so that hearing lists can be published against these venues.  
The system must allow a ***System Admin User*** to create and manage courts as venues in CaTH.  
Each court’s details must be properly recorded within the Court Master Reference Data for tracking, identification, and data integrity.

---

## User Story

***As a*** **System Admin User**  
***I want to*** **create a court in CaTH**  
***So that*** **I can publish a hearing list against the court in CaTH**

---

## Acceptance Criteria

1. The ***System Admin user*** has permission to create a court as a venue in CaTH.  
2. All details of each court to be created in CaTH are first captured within the ***Court Master Reference Data***.  
3. The following fields must be captured for every court:  
   - CONTACT  
   - COURT DESC  
   - EMAIL  
   - JURISDICTION  
   - JURISDICTION TYPE  
   - P&I ID  
   - PROVENANCE  
   - PROVENANCE LOCATION ID  
   - PROVENANCE LOCATION TYPE  
   - REGION  
   - WELSH COURT DESC  
   - WELSH JURISDICTION  
   - WELSH JURISDICTION TYPE  
   - WELSH REGION  
4. Each court name created in CaTH should automatically appear:  
   - In the ***list of available venues*** on the manual upload form.  
   - In the ***list of available courts*** on the CaTH front end (public interface).  
5. All courts created in CaTH must be mapped to the same court names in the ***source system****, with the ***Court ID*** from the source system recorded as the ***Provenance Location ID** in the Court Master Reference Data.  
6. A ***unique CaTH Court ID (P&I ID)*** must be generated automatically for every new court created to support tracking and auditing within CaTH.  

---

## User Journey Flow

1. System Admin logs in using approved credentials.  
2. From the System Admin Dashboard, the user selects the ***“Manage Courts”*** or ***“Create New Court”*** option.  
3. The user is taken to the ***Create Court*** form page.  
4. The user fills in required court information, including contact, jurisdiction, and provenance details.  
5. The user submits the form by clicking ***“Create Court”***.  
6. The system validates input and:  
   - Generates a new ***CaTH Court ID (P&I ID)***.  
   - Adds the new court to the ***Court Master Reference Data*** table.  
   - Confirms that the court is now visible in the upload form and front-end venue lists.  
7. A confirmation message displays once the court creation is successful.

---

## Wireframe

 

┌───────────────────────────────────────────────────────────────────────────┐
│ GOV.UK <Language Toggle>│
├───────────────────────────────────────────────────────────────────────────┤
│ HMCTS – Courts and Tribunals Hearings (CaTH) │
├───────────────────────────────────────────────────────────────────────────┤
│ < Back │
│ │
│ Create a Court │
│ │
│ CONTACT <{*}**> │**{*}
{*}**│ COURT DESC <**{*}> │
│ EMAIL <{*}**> │**{*}
{*}**│ JURISDICTION <**{*}> │
│ JURISDICTION TYPE <{*}**> │**{*}
{*}**│ PROVENANCE <**{*}> │
│ PROVENANCE LOCATION ID <{*}**> │**{*}
{*}**│ PROVENANCE LOCATION TYPE <**{*}> │
│ REGION <{*}**> │**{*}
{*}**│ WELSH COURT DESC <**{*}> │
│ WELSH JURISDICTION <{*}**> │**{*}
{*}**│ WELSH JURISDICTION TYPE <**{*}> │
│ WELSH REGION <*__**__**__**__**__**__**__*_> │
│ │
│ <Create Court> (Green Button) │
│ │
└───────────────────────────────────────────────────────────────────────────┘


---

## Form Fields

| Field | Type | Required | Description | Validation |
|~~--~~~~--~~|~~--~~~~-|~~~~--~~~~--~~~~-|~~~~--~~~~--~~~~--~~~~|-~~~~--~~~~--~~---|
| CONTACT | Text | Yes | Contact details for the court | Must not exceed 100 characters |
| COURT DESC | Text | Yes | Court name/description | Must not exceed 100 characters |
| EMAIL | Email | Yes | Court email address | Must be valid email format |
| JURISDICTION | Text | Yes | Jurisdiction the court covers | Must not be empty |
| JURISDICTION TYPE | Text | Yes | Defines if jurisdiction is civil, criminal, etc. | Must not be empty |
| P&I ID | Auto~~generated | Yes | Unique CaTH Court ID | System~~generated UUID |
| PROVENANCE | Text | Yes | Source system name | Predefined list (e.g., XHIBIT, LIBRA, SJP) |
| PROVENANCE LOCATION ID | Text | Yes | Court ID from the source system | Must be unique |
| PROVENANCE LOCATION TYPE | Text | Yes | Court type in the source system | Must match source type |
| REGION | Text | Yes | Region where the court is located | Drop-down from predefined list |
| WELSH COURT DESC | Text | Optional | Welsh name for the court | Optional field |
| WELSH JURISDICTION | Text | Optional | Welsh translation of jurisdiction | Optional |
| WELSH JURISDICTION TYPE | Text | Optional | Welsh translation of jurisdiction type | Optional |
| WELSH REGION | Text | Optional | Welsh translation of region | Optional |

---

## Content

***EN:***  
- Page Title — “Create a Court”  
- Button — “Create Court”  
- Banner (Success) — “Court created successfully”  
- Banner (Error) — “There was a problem creating this court. Please verify all required fields.”  

***CY:***  
- Page Title — “Creu Llys”  
- Button — “Creu Llys”  
- Banner (Success) — “Crëwyd y llys yn llwyddiannus”  
- Banner (Error) — “Roedd problem wrth greu’r llys. Gwiriwch yr holl feysydd gofynnol.”  

---

## URL Structure

| Page | URL |
|~~--~~~~-|~~~~--~~|
| Create Court | `/admin/courts/create` |
| Court List | `/admin/courts` |
| Court Details | `/admin/courts/\{id}` |

---

## Validation Rules

- All required fields must be completed.  
- Duplicate court names or Provenance Location IDs must not be allowed.  
- Email addresses must pass standard validation.  
- Upon submission, a ***CaTH Court ID (P&I ID)*** is automatically generated and stored.  
- Court creation must update the Court Master Reference Data in real-time.  

---

## Error Messages

***EN:***  
- “There was a problem creating this court. Please verify all required fields.”  
- “Court name already exists.”  
- “Invalid email format.”  
- “Provenance Location ID must be unique.”  

***CY:***  
- “Roedd problem wrth greu’r llys. Gwiriwch yr holl feysydd gofynnol.”  
- “Mae enw’r llys eisoes yn bodoli.”  
- “Fformat e-bost annilys.”  
- “Rhaid i’r Dynodwr Lleoliad Tarddiad fod yn unigryw.”  

---

## Navigation

- ***Create Court:*** Saves court data and generates P&I ID → Redirects to confirmation page.  
- ***Back:*** Returns to Court List page.  
- ***Cancel:*** Optional — cancels creation and returns to dashboard.  
- ***Court List Update:*** New court automatically appears in the venue dropdown on upload forms and in the public court list.

---

## Accessibility

- Must comply with ***WCAG 2.2 AA*** and ***GOV.UK Design System*** standards.  
- Labels must be programmatically associated with inputs.  
- Use ARIA roles for banners (`role="status"` for success and `role="alert"` for errors).  
- Field errors must appear inline and be summarised at the top of the page.  
- Support keyboard-only navigation and visible focus states.  
- Welsh translations must toggle properly when language is switched.  

---

## Test Scenarios

| ID | Scenario | Steps | Expected Result |
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
| TS1 | Create valid court | Fill in all fields, click Create Court | Court successfully created, success banner shown |
| TS2 | Missing required field | Leave a required field blank, click Create Court | Inline error displayed for that field |
| TS3 | Duplicate court | Enter an existing Court Desc or Provenance ID | Error message displayed “Court name already exists.” |
| TS4 | Invalid email | Enter invalid email format | Error message “Invalid email format.” |
| TS5 | Verify Court List update | Create court successfully, return to court list | New court appears in list |
| TS6 | Venue dropdown update | Create new court, open manual upload form | Court appears in “Available Venues” dropdown |
| TS7 | Accessibility test | Use keyboard and screen reader | All fields accessible, labels announced correctly |
| TS8 | Welsh toggle | Switch to Welsh | All text updates correctly to Welsh |
| TS9 | System ID generation | Create court | Unique CaTH Court ID (P&I ID) auto-generated and stored |
| TS10 | Provenance mapping | Check Court Master Reference Data | Provenance and Provenance Location ID correctly linked |

---

## Assumptions / Open Questions

- Confirm if ***Create Court*** functionality should support bulk import as well as manual entry.  
- Confirm if ***audit logging*** is required for every court creation (e.g., date, user ID).  
- Confirm if ***court deletion*** or editing will be supported on the same interface.  
- Confirm if ***notifications*** or email confirmations are sent when new courts are added.  
- Confirm whether ***validation of Welsh fields*** is mandatory for bilingual courts.', 'functional', 'verified', 'high', 'story', 272, 'https://github.com/hmcts/cath-service/issues/272', '2026-01-20T17:12:53Z', '2026-01-30T15:04:46Z', 'linusnorton', 'linusnorton'),
  (51, 'REQ-0051', 'Blob Ingestion in CaTH', '**PROBLEM STATEMENT**

To auto-publish a hearing list in CaTH, a blob (Json file) would have to be ingested and validated from a source system through an API.

 

**AS A** System

**I WANT** to ingest a blob from a source system

**SO THAT** I can display publish a hearing list

 

**Pre-condition:**
 * A validation schema should be set up such that when a blob is received from a source system API to CaTH, it is assessed via the documented Validation schema
 * A Style guide has been created
 * Venues for Blob to be published against have been created in CaTH   

 

**Technical Criteria**
 # New column ''no_match'' created in artefact table. Boolean type, mandatory.
 # New API endpoint created to support the ingestion of publications. This should use the same logic / behaviour as the manual upload processing
 # <Header information to be added here>
 # Authentication on the endpoint should use oAuth, utilising the existing app registrations for CaTH''s lower env''s. The app role the endpoint should be protected on is ''api.publisher.user''

 

**ACCEPTANCE CRITERIA**
 * Where a blob is received in CaTH, it must be validated against a pre-established validated schema
 * Where a blob is received, it is expected to be published against a location that has been created in CaTH
 * Only blobs for courts that have been created and added to the location master reference data in CaTH and translated to a validation schema should be ingested. 
 * Where a new blob is received and the location to be published against is not created in CaTH, then the publication should still be ingested and the ''no_match'' column set to ''true''

 
 # VIBE-209 Blob Ingestion and Validation Specification

> Owner: {**}`**`VIBE-209`**`{**} · Updated: {**}`**`24 Oct 2025`**`{**}

—
 # 
 ## Problem Statement

To auto-publish a hearing list in CaTH, a {**}`**`blob (JSON file)`**`{**} must be ingested and validated from a source system via an established API connection.  
The system should validate, process, and publish the blob against the appropriate court venue in CaTH.

—
 # 
 ## User Story

{**}`**`As a`**`{**} **System**  
{**}`**`I want to`**`{**} **ingest a blob from a source system**  
{**}`**`So that`**`{**} **I can display and publish a hearing list in CaTH**

—
 # 
 ## Pre-Conditions

1. {**}`**`API connections`**`{**} between the source system and CaTH have been successfully established and tested.  
2. A {**}`**`validation schema`**`{**} has been implemented to assess incoming blobs.  
3. A {**}`**`Style Guide`**`{**} defining the JSON format, data structure, and field requirements has been documented.  
4. {**}`**`Venues`**`{**} (courts) for publishing hearing lists have already been created and stored in the {**}`**`Court Master Reference Data`**`{**} within CaTH.

—
 # 
 ## Acceptance Criteria

1. When a blob (JSON file) is received in CaTH, it must be {**}`**`validated against the pre-established validation schema`**`{**}.  
2. Each blob must include valid metadata that associates it with a {**}`**`location venue`**`{**} created in CaTH.  
3. Only blobs referencing {**}`**`existing location`**`{**} (as defined in the {**}`**`Location Master Reference Data`**`{**}) should be ingested and processed.  
6. Once validation passes, the blob is successfully processed and {**}`**`automatically published`**`{**} to CaTH.  
7. All ingestion and validation actions must be {**}`**`auditable`**`{**} and stored in system logs for traceability.

—
 # 
 ## User Journey Flow

1. A source system sends a blob (JSON file) through a secure API endpoint to CaTH.  
2. The CaTH API receives the blob and triggers the validation process.  
3. The blob’s structure and data are compared against the {**}`**`Validation Schema`**`{**}:  
   - If valid → Proceed to publication.  
   - If invalid → Log the error and block ingestion.  
4. The system verifies that the {**}`**`Court ID`**`{**} or {**}`**`Provenance Location ID`**`{**} exists in the Court Master Reference Data.  
5. If a match is found, the blob is published to the corresponding court’s hearing list.  
7. The source system is notified to review the incident.  
8. After correction and court creation by the System Admin, ingestion can be retried successfully.

—
 # 
 ## Data Validation and Mapping Rules

To be updated prior to starting work on the ticket, with header info

 
|Field|Description|Validation Rule|Required|Source|
|~~--~~~~--~~|~~--~~~~--~~~~--~~~~-|~~~~--~~~~--~~~~--~~~~--~~~~|-~~~~--~~~~--~~~~|-~~~~--~~---|
|Court ID / Provenance Location ID|Unique ID linking blob to CaTH court|Must match entry in Court Master Reference Data|Yes|Source System|
|Blob Metadata|Includes publication timestamp, source, and hearing type|Must match schema format|Yes|Source System|
|Hearing Details|Core content of the blob (cases, times, judges, etc.)|Must match schema structure|Yes|Source System|
|JSON Format|Blob must be valid JSON format|JSON schema validation|Yes|Source System|
|Provenance|Identifies source system (e.g., XHIBIT, LIBRA, SJP)|Must match authorized provenance list|Yes|Source System|

—
 # 
 ## Validation Schema (Summary Example)

Each incoming blob is validated using a JSON schema that ensures:
 - Required fields are present (`court*id`, `hearing*list`, `publication_date`).  
 - Data types match expectations (strings, arrays, timestamps).  
 - Court ID exists within CaTH reference data.  
 - The blob does not exceed size limits or contain malformed JSON.  

{**}`**`Example Schema Snippet:`**`{**}
```json
{
  "type": "object",
  "required": <"court*id", "publication*date", "hearing_list">,
  "properties":

{     "court_id":

{ "type": "string" }

,
    "publication_date": \{ "type": "string", "format": "date-time" },
    "hearing_list": \{ "type": "array" }
  }
}

 

<Source System>
       │
       ▼
┌───────────────────────┐
│ Send Blob (JSON)      │
└───────────────────────┘
       │
       ▼
┌────────────────────────────────────────────────┐
│ CaTH Ingestion API                             │
│  - Receives blob                               │
│  - Runs validation schema                      │
│  - Checks court reference in master data       │
└────────────────────────────────────────────────┘
       │
       ├──► <Blob Valid> → Publish to CaTH court venue
       │
       └──► <Blob Invalid>
             │
             ▼
     ┌──────────────────────────────┐
     │ Log incident in Validation   │
     │ Report & notify source       │
     └──────────────────────────────┘
             │
             ▼
   ┌─────────────────────────────────────┐
   │ System Admin adds missing court in  │
   │ Court Master Reference Data         │
   └─────────────────────────────────────┘

 
## API Requirements
 * **Endpoint:** `/api/v1/ingest-blob`

 * **Method:** `POST`

 * **Authentication:** Secure token (OAuth 2.0 / API key)

 * **Request Type:** JSON

 * **Response Codes:**

 * 
 ** `201 CREATED` – Blob ingested and published successfully

 * 
 ** `400 Bad Request` – Invalid JSON or missing required fields

 * 
 ** `404 Not Found` – Court ID not found in CaTH reference data

 * 
 ** `500 Internal Server Error` – Validation or system failure

 

Example API Response (Success):

{   "status": "success",   "message": "Blob ingested and published successfully",   "court_id": "CATH-00123" }

 

Example API Response (Failure – Court Not Found):

{   "status": "error",   "message": "Court not found in CaTH reference data",   "court_id": "EXT-98765",   "action": "Incident logged and reported to source system" }

 

 
## Validation Report Fields
|Field|Description|
|Timestamp|Date and time blob was received|
|Source System|Identifier of sending system|
|Court ID|ID referenced in blob|
|Validation Result|Pass / Fail|
|Error Message|Detailed validation failure|
|Action Taken|Logged, notified, blocked, or retried|

 

 
## Content

**EN:**
 * Success Message — “Blob ingested and published successfully.”

 * Error Message — “Unable to ingest blob. Please verify schema or court reference data.”

 * Report Label — “Validation Report”

**CY:**
 * Success Message — “Wedi mewnforio a chyhoeddi’r blob yn llwyddiannus.”

 * Error Message — “Methu mewnforio’r blob. Gwiriwch y cynllun neu’r data cyfeirnod llys.”
 * Report Label — “Adroddiad Dilysu”

## URL Structure
|Component|URL|
|Ingestion Endpoint|`/api/v1/publication`|

 
## Error Handling and Logging
 * All ingestion attempts must be logged with timestamp and source system ID.

 * Validation errors trigger:

 * 
 ** Error response to the source API.

 * 
 *** Creation of a {**}Validation Report entry{*}.

 * Serious ingestion errors (schema corruption, unhandled exceptions) must raise system alerts to admins.

 * Logs should retain data for a minimum of **90 days** for auditing.

## Navigation (System Flow)
 * **Successful Ingestion:** → Publishes blob data to CaTH and stores confirmation.

 * **Invalid Blob:** → Block ingestion → Generate report → Notify source system.

 * **Unknown Court:** → Block ingestion → Validation report entry → Await System Admin action.

 * **Post Admin Update:** → Blob ingestion retried successfully.

## Accessibility

(Not user-facing interface — applies to System Admin monitoring screens only.)
 * All admin-facing validation reports must comply with **WCAG 2.2 AA** and GOV.UK table accessibility standards.

 * Reports should use descriptive column headers and support keyboard navigation.

 * Validation messages must be readable and distinguishable by colour and label.

 
## Test Scenarios
|ID|Scenario|Steps|Expected Result|
|TS1|Valid blob ingestion|Send valid JSON via API with existing Court ID|Blob ingested, validated, and published|
|TS2|Invalid schema|Send malformed JSON|Error 400, ingestion blocked|
|TS3|Unknown court|Send blob with unrecognised Court ID|Publication still created, no_match set to true|
|TS4|Missing required field|Omit required field from JSON|Validation failure, error logged|
|TS5|Provenance mismatch|Send blob with invalid provenance type|Validation blocked, incident logged|
|TS6|Logging verification|Check validation report|Record includes timestamp, error, and source system|
|TS7|Retry after admin fix|Add missing court and resend blob|Ingestion succeeds|
|TS8|Large blob|Send JSON exceeding limits|Rejected with “Payload too large” message|
|TS9|API security|Attempt unauthorized request|Request denied with 401 error|
|TS10|System alerting|Trigger repeated ingestion errors|System sends alert to admin|

 
## Assumptions / Open Questions
 * Confirm if ingestion retry should be **manual** or **automated** after admin correction.

 * Confirm maximum file size limit for blob ingestion (e.g., 10MB).

 * Confirm how often validation reports are generated (real-time or daily batch).

 * Confirm if versioning is needed for schema validation (v1, v2).

 * Confirm if notification to the source system should be via email or API response callback.', 'functional', 'verified', 'medium', 'story', 273, 'https://github.com/hmcts/cath-service/issues/273', '2026-01-20T17:13:05Z', '2026-01-30T15:04:49Z', 'linusnorton', 'linusnorton'),
  (52, 'REQ-0052', 'Display of Pubs - What do you want to do?', '**PROBLEM STATEMENT**

This ticket is raised to cover the display screens needed in CaTH to allow users view uploaded publications files as hearing lists in CaTH front end.

 

**AS A** System

**I WANT** to display an uploaded publication file 

**SO THAT** users can view this file as a hearing list published in CaTH

 

**Pre-condition:**
 * A publication file has been uploaded in CaTH by a local admin 
 * The date user is viewing the publication is within the set display dates and hence the file is still available for display in CaTH

 

**ACCEPTANCE CRITERIA**
 * User begins journey by clicking the ''continue'' button on the landing page in CaTH
 * User is taken to screen 1 with a header tilted ''What do you want to do?''
 * User sees 2 radio buttons. first radio button is titled ''Find a court or tribunal'' and underneath, displays the following message ''View time, location, type of hearings and more''. second radio button is titled ''Find a single Justice procedure case'' and displays the following message underneath ''TV licensing, minor traffic offences such as speeding and more''.
 * underneath the radio buttons is a green ''Continue'' button
 * all CaTH page specifications are maintained.

 

**Welsh translations:**

What do you want to do? - Beth yr ydych eisiau ei wneud?

Find a court or tribunal - dod o hyd i lys neu dribiwnlys

View time, location, type of hearings and more - Gweld amser, lleoliad. Math o wrandawiad a mwy.

Find a single Justice procedure case - Dod o hyd i achos gweithdrefn un ynad 

TV licensing, minor traffic offences such as speeding and more -  troseddau trwyddedu teledu a mân droseddau traffig fel goryrru.

continue - Parhau

 

 

# VIBE-211 Display Uploaded Publications as Hearing Lists Specification

> Owner: ***VIBE-211*** · Updated: ***24 Oct 2025***

---

## Problem Statement

This ticket covers the ***display screens*** required in CaTH to allow users to view uploaded publication files as hearing lists in the CaTH front end.  
The system must render these files appropriately for public or verified users to browse hearing details based on their selections.

---

## User Story

***As a*** **System**  
***I want to*** **display an uploaded publication file**  
***So that*** **users can view this file as a hearing list published in CaTH**

---

## Pre-conditions

1. A publication file has been successfully uploaded into CaTH by a Local Admin.  
2. The user’s view date is within the ***set display period*** for the publication file, meaning the file remains valid and visible in CaTH.  
3. The hearing lists and Single Justice Procedure (SJP) cases have been indexed and are retrievable for display.  

---

## Acceptance Criteria

1. User begins the journey by clicking the ***‘Continue’*** button on the CaTH landing page.  
2. The system directs the user to ***Screen 1*** with a header titled ***‘What do you want to do?’***  
3. User is presented with ***two radio button options***:  
   - ***Option 1:***  
     - ***Title:*** **Find a court or tribunal**  
     - ***Message:*** **View time, location, type of hearings and more.**  
   - ***Option 2:***  
     - ***Title:*** **Find a single Justice procedure case**  
     - ***Message:*** **TV licensing, minor traffic offences such as speeding and more.**  
4. Below the radio buttons is a ***green ‘Continue’ button*** to progress to the next page.  
5. Page layout, styling, and accessibility must align with the CaTH and ***GOV.UK Design System*** standards.  
6. Welsh translations must be displayed when the language toggle is switched.  

---

## User Journey Flow

1. User visits the CaTH landing page.  
2. User clicks ***‘Continue’***.  
3. System navigates to the ***‘What do you want to do?’*** selection page.  
4. User selects either:  
   - ***Find a court or tribunal*** → navigates to the hearing list page.  
   - ***Find a single Justice procedure case*** → navigates to SJP case search results.  
5. User clicks ***Continue*** to confirm the selection and proceed.  

---

## Wireframe

┌──────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK <Language> │
├──────────────────────────────────────────────────────────────────────────────┤
│ HMCTS – Courts and Tribunals Hearings (CaTH) │
├──────────────────────────────────────────────────────────────────────────────┤
│ < Back │
│ │
│ What do you want to do? │
│ │
│ ○ Find a court or tribunal │
│ View time, location, type of hearings and more. │
│ │
│ ○ Find a single Justice procedure case │
│ TV licensing, minor traffic offences such as speeding and more. │
│ │
│ <Continue> (Green Button) │
│ │
└──────────────────────────────────────────────────────────────────────────────┘

 


---

## Form Fields

| Field | Type | Required | Description | Validation |
|~~--~~~~--~~|~~--~~~~-|~~~~--~~~~--~~~~-|~~~~--~~~~--~~~~--~~~~|-~~~~--~~~~--~~---|
| What do you want to do? | Radio group | Yes | User must choose one of two available options | Must select one option before continuing |

---

## Content

***EN:***  
- ***Title/H1:*** “What do you want to do?”  
- ***Radio option 1:*** “Find a court or tribunal”  
- ***Supporting text 1:*** “View time, location, type of hearings and more.”  
- ***Radio option 2:*** “Find a single Justice procedure case”  
- ***Supporting text 2:*** “TV licensing, minor traffic offences such as speeding and more.”  
- ***Button:*** “Continue”

***CY:***  
- ***Title/H1:*** “Beth yr ydych eisiau ei wneud?”  
- ***Radio option 1:*** “dod o hyd i lys neu dribiwnlys”  
- ***Supporting text 1:*** “Gweld amser, lleoliad. Math o wrandawiad a mwy.”  
- ***Radio option 2:*** “Dod o hyd i achos gweithdrefn un ynad”  
- ***Supporting text 2:*** “troseddau trwyddedu teledu a mân droseddau traffig fel goryrru.”  
- ***Button:*** “Parhau”

---

## URL

`/hearing~~lists/select~~action`

---

## Validation Rules

- User must select one radio option before clicking ***Continue***.  
- If no option is selected and Continue is clicked, display an inline error message above the radio buttons:  
  - ***EN:*** “Select what you want to do.”  
  - ***CY:*** “Dewiswch beth yr ydych eisiau ei wneud.”  
- Upon valid selection:  
  - If ***‘Find a court or tribunal’*** is selected → redirect to `/hearing~~lists/find~~court`.  
  - If ***‘Find a single Justice procedure case’*** is selected → redirect to `/hearing~~lists/find~~sjp`.  

---

## Error Messages

***EN:***  
- “Select what you want to do.”  
***CY:***  
- “Dewiswch beth yr ydych eisiau ei wneud.”

---

## Navigation

- ***Back:*** Returns to CaTH landing page (`/home`).  
- ***Continue:***  
  - Option 1 → `/hearing~~lists/find~~court`  
  - Option 2 → `/hearing~~lists/find~~sjp`  
- ***Language toggle:*** Switches between English and Welsh content.  

---

## Accessibility

- Must comply with ***WCAG 2.2 AA*** and ***GOV.UK Design System*** standards.  
- Radio buttons must have accessible labels associated with their descriptive text.  
- Focus must move logically through elements (top to bottom, left to right).  
- Screen readers must announce selected radio button and associated supporting text.  
- “Continue” button must have a visible focus indicator and be reachable by keyboard.  
- Error summary must link to the first radio button field if user submits without selection.  
- Bilingual toggle must not reset user selections when switching language.

---

## Test Scenarios

| ID | Scenario | Steps | Expected Result |
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
| TS1 | Load selection page | Navigate to `/hearing~~lists/select~~action` | Page displays two radio options and Continue button |
| TS2 | No selection | Click Continue without selecting an option | Inline error displayed: “Select what you want to do.” |
| TS3 | Select court option | Select “Find a court or tribunal”, click Continue | Redirected to `/hearing~~lists/find~~court` |
| TS4 | Select SJP option | Select “Find a single Justice procedure case”, click Continue | Redirected to `/hearing~~lists/find~~sjp` |
| TS5 | Language toggle | Switch to Welsh | Page updates to Welsh translations |
| TS6 | Accessibility (keyboard) | Navigate via Tab and Space keys | All elements accessible and focus visible |
| TS7 | Accessibility (screen reader) | Use screen reader | Radio options and button labels correctly announced |
| TS8 | Responsive display | Open on mobile | Layout adjusts correctly and remains legible |
| TS9 | Error recovery | Submit without selection, then select and continue | Error clears and navigation proceeds correctly |
| TS10 | Cross-browser test | Test on multiple browsers | Layout and functionality remain consistent |

---

## Assumptions / Open Questions

- Confirm whether the “Find a court or tribunal” and “Find a single Justice procedure case” pages (VIBE~~212 and VIBE~~213) follow this page directly.  
- Confirm whether the user session should persist the selected option if they return to this page.  
- Confirm whether non~~logged~~in public users access this page or only authenticated users.  
- Confirm whether the radio button layout should display vertically (default GOV.UK layout) or side~~by~~side on wider screens.  
- Confirm if analytics tracking (e.g., Google Tag Manager) is required to capture selection events.', 'functional', 'verified', 'high', 'story', 274, 'https://github.com/hmcts/cath-service/issues/274', '2026-01-20T17:13:51Z', '2026-01-30T15:04:51Z', 'linusnorton', 'linusnorton'),
  (53, 'REQ-0053', 'Display of Pubs -  What court or tribunal are you interested in?', '**PROBLEM STATEMENT**

This ticket is raised to cover the display screens needed in CaTH to allow users view uploaded publications files as hearing lists in CaTH front end.

 

**AS A** System

**I WANT** to display an uploaded publication file 

**SO THAT** users can view this file as a hearing list published in CaTH

 

**Pre-condition:**
 * A publication file has been uploaded in CaTH by a local admin 
 * The date user is viewing the publication is within the set display dates and hence the file is still available for display in CaTH

 

**ACCEPTANCE CRITERIA**
 * User begins journey by clicking the ''continue'' button on the landing page in CaTH and completes  screen 1
 * User is taken to screen 2 with a header tilted ''What court or tribunal are you interested in?'' and the descriptive message beneath ''For example, Oxford Combined Court Centre''. 
 * Underneath is a free text box that brings up suggested venues names as the user starts typing which is sourced from the reference data table.
 * This is followed by a green ''Continue'' button and a link to ''Select from an A-Z list of courts and tribunals''

 

**Welsh translations:**

What court or tribunal are you interested in? - Ym mha lys neu dribiwnlys y mae gennych ddiddordeb

For example, Oxford Combined Court Centre - Er enghraifft, Oxford Combined Court Centre

Select from an A~~Z list of courts and tribunals - Dewis o restr A~~Y o lysoedd a thribiwnlysoedd

continue -  Parhau

 

 

# VIBE-212 Find a Court or Tribunal Page Specification

> Owner: ***VIBE-212*** · Updated: ***24 Oct 2025***

---

## Problem Statement

This ticket is raised to define the display screens required in CaTH to allow users to view uploaded publication files as hearing lists on the CaTH front end.  
This screen allows users to select a specific court or tribunal to view available hearing lists.

---

## User Story

***As a*** **System**  
***I want to*** **display an uploaded publication file**  
***So that*** **users can view this file as a hearing list published in CaTH**

---

## Pre-conditions

1. A publication file has been uploaded in CaTH by a Local Admin.  
2. The current date is within the ***set display date range***, ensuring the file remains visible in CaTH.  
3. Venue names have been added and stored within the ***Court Master Reference Data table***.  
4. The user has completed ***Screen 1 (What do you want to do?)*** and selected ***“Find a court or tribunal.”***

---

## Acceptance Criteria

1. After completing ***Screen 1****, the user is directed to ***Screen 2*** titled ***“What court or tribunal are you interested in?”**  
2. A descriptive message appears beneath the header:  
   > “For example, Oxford Combined Court Centre.”  
3. Below the description is a ***free text input field*** that supports ***type~~ahead search*** (auto~~suggest) using venue names stored in the Court Master Reference Data table.  
4. As the user types, suggested court or tribunal names are displayed in a dropdown list.  
5. Beneath the input box, a ***green ‘Continue’*** button allows the user to proceed.  
6. A ***link*** labelled ***“Select from an A–Z list of courts and tribunals”*** appears below the Continue button.  
7. Clicking the A–Z list link navigates the user to the court directory page.  
8. All CaTH pages and accessibility standards must be maintained.  
9. Welsh translations must be displayed when language toggle is switched.

---

## User Journey Flow

1. User selects “Find a court or tribunal” on Screen 1 (VIBE-211).  
2. System navigates to Screen 2 – ***“What court or tribunal are you interested in?”***  
3. User begins typing the name of a court or tribunal.  
4. System displays suggested names from the Court Master Reference Data as type-ahead results.  
5. User selects a venue and clicks ***Continue***.  
6. System validates the selection and redirects to the selected court’s hearing list page.  
7. If no venue is selected, user is shown an error message prompting them to select a court.  
8. Alternatively, user can click ***“Select from an A–Z list of courts and tribunals”*** to view all available venues.

---

## Wireframe

┌──────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK <Language> │
├──────────────────────────────────────────────────────────────────────────────┤
│ HMCTS – Courts and Tribunals Hearings (CaTH) │
├──────────────────────────────────────────────────────────────────────────────┤
│ < Back │
│ │
│ What court or tribunal are you interested in? │
│ For example, Oxford Combined Court Centre. │
│ │
│ <*__**__**__**__**__**__**__**__**__**__**__*__> │
│ (Type a court or tribunal name – suggestions appear below) │
│ │
│ <Continue> (Green Button) │
│ │
│ Select from an A–Z list of courts and tribunals │
│ │
└──────────────────────────────────────────────────────────────────────────────┘

 

 


---

## Form Fields

| Field | Type | Required | Description | Validation |
|~~--~~~~--~~|~~--~~~~-|~~~~--~~~~--~~~~-|~~~~--~~~~--~~~~--~~~~|-~~~~--~~~~--~~---|
| Court or Tribunal name | Text input with auto-suggest | Yes | Allows user to search for a court or tribunal from reference data | Must match existing venue from Court Master Reference Data |

---

## Content

***EN:***  
- ***Title/H1:*** “What court or tribunal are you interested in?”  
- ***Description:*** “For example, Oxford Combined Court Centre.”  
- ***Button:*** “Continue”  
- ***Link:*** “Select from an A–Z list of courts and tribunals”  

***CY:***  
- ***Title/H1:*** “Ym mha lys neu dribiwnlys y mae gennych ddiddordeb”  
- ***Description:*** “Er enghraifft, Oxford Combined Court Centre.”  
- ***Button:*** “Parhau”  
- ***Link:*** “Dewis o restr A–Y o lysoedd a thribiwnlysoedd”  

---

## URL

`/hearing~~lists/find~~court`

---

## Validation Rules

- User must enter or select a valid court name before continuing.  
- If the input does not match any known venue in the Court Master Reference Data, an inline error message is displayed.  
- Input field must support dynamic search (auto-suggest).  
- Search should be case-insensitive and match partial strings.  
- Clicking “Select from an A–Z list of courts and tribunals” redirects to `/hearing~~lists/court~~directory`.  

---

## Error Messages

***EN:***  
- “Enter a court or tribunal name.”  
- “Select a valid court or tribunal from the list.”  

***CY:***  
- “Nodwch enw llys neu dribiwnlys.”  
- “Dewiswch lys neu dribiwnlys dilys o’r rhestr.”  

---

## Navigation

- ***Back:*** Returns to previous screen `/hearing~~lists/select~~action`.  
- ***Continue:***  
  - On valid input → navigates to `/hearing~~lists/view/\{court~~id}`.  
- ***A–Z list link:*** → `/hearing~~lists/court~~directory`.  

---

## Accessibility

- Must comply with ***WCAG 2.2 AA*** and ***GOV.UK Design System*** standards.  
- Input field must have ARIA attributes for autocomplete (`aria-autocomplete="list"`).  
- Each suggestion must be keyboard-navigable and selectable using arrow keys and Enter.  
- Focus indicator must be clearly visible on all interactive elements.  
- Error messages must appear in an error summary and link back to the input field.  
- Language toggle must correctly display bilingual text without clearing entered input.  
- Screen readers must announce:  
  - Page title.  
  - Descriptive text.  
  - Suggestions as they appear.

---

## Test Scenarios

| ID | Scenario | Steps | Expected Result |
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
| TS1 | Load page | Navigate to `/hearing~~lists/find~~court` | Page loads with input, Continue button, and A–Z link |
| TS2 | No input | Click Continue without entering data | Inline error displayed: “Enter a court or tribunal name.” |
| TS3 | Invalid court | Enter text not in reference data | Error message displayed: “Select a valid court or tribunal from the list.” |
| TS4 | Valid court | Enter valid court name, click Continue | Redirects to `/hearing~~lists/view/\{court~~id}` |
| TS5 | Auto-suggest | Type partial court name | Dropdown displays matching venues |
| TS6 | A–Z link | Click “Select from an A–Z list of courts and tribunals” | Redirects to `/hearing~~lists/court~~directory` |
| TS7 | Language toggle | Switch to Welsh | All text updates to Welsh translations |
| TS8 | Accessibility – keyboard | Navigate with keyboard only | All controls accessible and focus visible |
| TS9 | Accessibility – screen reader | Use screen reader | Input label and suggestions announced correctly |
| TS10 | Responsive view | Open on mobile | Page layout adjusts and remains functional |

---

## Assumptions / Open Questions

- Confirm if the ***auto-suggest*** should start after the first character or after three characters.  
- Confirm whether ***court names*** in Welsh should appear alongside English names in suggestions.  
- Confirm whether ***A–Z list*** is a separate static page or dynamically generated from reference data.  
- Confirm if analytics tracking should record user selection (court name and timestamp).  
- Confirm if the input field should accept free text (for unlisted courts) or restrict to validated suggestions only.', 'functional', 'verified', 'high', 'story', 275, 'https://github.com/hmcts/cath-service/issues/275', '2026-01-20T17:14:05Z', '2026-01-30T15:04:53Z', 'linusnorton', 'linusnorton'),
  (54, 'REQ-0054', 'Display of Pubs - Find a court or tribunal', '**PROBLEM STATEMENT**

This ticket is raised to cover the display screens needed in CaTH to allow users view uploaded publications files as hearing lists in CaTH front end.

 

**AS A** System

**I WANT** to display an uploaded publication file 

**SO THAT** users can view this file as a hearing list published in CaTH

 

**Pre-condition:**
 * A publication file has been uploaded in CaTH by a local admin 
 * The date user is viewing the publication is within the set display dates and hence the file is still available for display in CaTH

 

**ACCEPTANCE CRITERIA**
 * User begins journey by clicking the ''continue'' button on the landing page in CaTH and completing screen 1 and 2.
 * Where a user clicks on the link to ''Select from an A-Z list of courts and tribunals'', the user is taken to screen 3 with a header titled ''Find a court or tribunal''
 * user can see a filter section on the left titled ''Filter'' in a grey banner and a sub~~header in a lighter grey banner ''Selected filter''. In the sub~~header banner, user can see a ''Clear filters'' link that can be clicked to remove all selected filter options
 * underneath the sub-header is a green ''Apply filters'' button
 * 2 filters are provided with drop down arrows; ''Jurisdiction'' which displays all the available jurisdictions in CaTH and ''Region'' which displays all the regions available in CaTH 
 * where user clicks the ''Jurisdiction'' filter, a sub~~filter titled ''Type of court'' pops~~up and displays all the types of court in the selected jurisdiction
 * beside the filter panel are alphabets A-Z filter which the user can click on to view only lists starting with that letter
 * underneath the A-Z filter is the list of all hearing lists available in CaTH, listed alphabetically, with the alphabets listed on the left to indicate where lists starting with that alphabet begin
 * at the end of the page is an arrow pointing up with the works ''Back to top'' which user can click to go back to the top of the list.
 * ''Jurisdiction'', ''Region'' and ''type of court'' filter options are to be sourced from reference data table
 * List of Courts are to be sourced from reference data table
 * all CaTH page specifications are maintained 

 

**Welsh translations:**

Find a court or tribunal - dod o hyd i lys neu dribiwnlys

''Filter - Ffiltro

Selected filter - Ffiltyr a ddewiswyd

Clear filters - Clirio’r ffiltrau

''Apply filters - Cadarnhau hidlwyr

Jurisdiction - awdurdodaeth

Region - ranbarth

Type of court - Math o lys

Back to top - Yn ôl i frig y dudalen

 

 

# VIBE-213 A–Z List of Courts and Tribunals Page Specification

> Owner: ***VIBE-213*** · Updated: ***24 Oct 2025***

---

## Problem Statement

This ticket defines the display screens needed in CaTH to allow users to view uploaded publication files as hearing lists in the CaTH front end.  
This page enables users to browse and filter all available courts and tribunals alphabetically and by key attributes (jurisdiction, region, and type of court).

---

## User Story

***As a*** **System**  
***I want to*** **display an uploaded publication file**  
***So that*** **users can view this file as a hearing list published in CaTH**

---

## Pre-conditions

1. A publication file has already been uploaded in CaTH by a Local Admin.  
2. The date the user is viewing the publication falls within the publication’s ***display period***.  
3. Court and tribunal data (including jurisdiction, region, and type of court) are available in the ***reference data tables***.  

---

## Acceptance Criteria

1. The user begins the journey by clicking ***‘Continue’*** on the landing page and completing ***Screen 1*** (“What do you want to do?”) and ***Screen 2*** (“What court or tribunal are you interested in?”).  
2. When the user clicks the ***‘Select from an A–Z list of courts and tribunals’*** link on Screen 2, they are taken to ***Screen 3*** with a header titled ***‘Find a court or tribunal’***.  
3. A ***filter section*** is displayed on the left side of the page within a ***grey banner*** titled ***‘Filter’***.  
4. Inside the filter panel, a lighter grey sub-header titled ***‘Selected filter’*** is shown, with a clickable ***‘Clear filters’*** link to remove all selected options.  
5. Beneath the sub-header, a ***green ‘Apply filters’*** button is displayed.  
6. Two main filters are provided, each with dropdown arrows:  
   - ***Jurisdiction:*** Displays all available jurisdictions in CaTH.  
   - ***Region:*** Displays all regions available in CaTH.  
7. When the user selects a jurisdiction, a ***sub-filter titled ‘Type of court’*** is displayed, showing all court types within that jurisdiction.  
8. To the right of the filter panel, an ***A–Z alphabetical navigation bar*** is displayed, allowing users to jump to courts beginning with that letter.  
9. Beneath the alphabet navigation, a ***list of all hearing lists*** in CaTH is shown, grouped alphabetically by the first letter of the court name.  
10. Each alphabet group is labeled with the corresponding letter on the left margin.  
11. At the bottom of the page, an ***‘Up arrow’ icon*** and text link ***‘Back to top’*** are displayed, allowing the user to scroll back to the top of the list.  
12. Filter data (Jurisdiction, Region, Type of court) and list data (Courts) are to be ***sourced from reference data tables***.  
13. All CaTH page design, interaction, and accessibility standards must be maintained.  

---

## User Journey Flow

1. User completes Screens 1 and 2.  
2. User clicks ***‘Select from an A–Z list of courts and tribunals’***.  
3. The system loads the ***A–Z List page (Screen 3)***.  
4. The user can:  
   - Browse the full list of courts and tribunals alphabetically.  
   - Use ***filters*** (Jurisdiction, Region, Type of Court) to refine the list.  
   - Use ***alphabet letters (A–Z)*** to jump to a specific section.  
5. The user clicks ***‘Apply filters’*** to update the displayed list.  
6. The user may click ***‘Clear filters’*** to reset all selections.  
7. The user can click ***‘Back to top’*** to return to the page header.

---

## Wireframe

┌──────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK <Language> │
├──────────────────────────────────────────────────────────────────────────────┤
│ HMCTS – Courts and Tribunals Hearings (CaTH) │
├──────────────────────────────────────────────────────────────────────────────┤
│ < Back │
│ │
│ Find a court or tribunal │
│ │
│ ┌──────────────────────┐ ┌───────────────────────────────────────────────┐ │
│ │ Filter │ │ A B C D E F G H I J K L M N O P Q R S T U V │ │
│ │──────────────────────│ │ W X Y Z │ │
│ │ Selected filter │ ├──────────────────────────────────────────────┤ │
│ │ <Clear filters> │ │ A │ │
│ │ <Apply filters> (Btn) │ │ Aberdeen Tribunal │ │
│ │ ▼ Jurisdiction │ │ Aldershot Magistrates Court │ │
│ │ ▼ Region │ │ B │ │
│ │ └─ Type of court │ │ Birmingham Crown Court │ │
│ └──────────────────────┘ │ Bristol Civil and Family Justice Centre │ │
│ │ ... │ │
│ │ <↑ Back to top> │ │
└──────────────────────────────────────────────────────────────────────────────┘

 


---

## Form Fields / Interactive Elements

| Field / Element | Type | Required | Description | Source / Validation |
|~~--~~~~--~~~~--~~~~--~~~~|-~~~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--~~~~--~~~~|-~~~~--~~~~--~~~~--~~~~--~~~~--~~|
| Jurisdiction | Dropdown | No | Lists all available jurisdictions | Reference data table |
| Region | Dropdown | No | Lists all available regions | Reference data table |
| Type of court | Sub-filter dropdown | No | Displays when jurisdiction is selected | Reference data table |
| Apply filters | Button | No | Applies the selected filter(s) | Updates filtered list |
| Clear filters | Link | No | Clears all selected filters | Resets to default view |
| A–Z navigation | Button group | No | Jumps to list of courts starting with selected letter | Dynamic anchor links |
| Back to top | Link | No | Scrolls user to top of page | UI anchor |
| Court list | Dynamic display | No | Shows all available courts in alphabetical order | Reference data table |

---

## Content

***EN:***  
- ***Title/H1:*** “Find a court or tribunal”  
- ***Filter header:*** “Filter”  
- ***Filter sub-header:*** “Selected filter”  
- ***Link (under sub-header):*** “Clear filters”  
- ***Button:*** “Apply filters”  
- ***Filter labels:*** “Jurisdiction”, “Region”, “Type of court”  
- ***A–Z navigation:*** “A–Z”  
- ***Link (footer):*** “Back to top”

***CY:***  
- ***Title/H1:*** “dod o hyd i lys neu dribiwnlys”  
- ***Filter header:*** “Ffiltro”  
- ***Filter sub-header:*** “Ffiltyr a ddewiswyd”  
- ***Link (under sub-header):*** “Clirio’r ffiltrau”  
- ***Button:*** “Cadarnhau hidlwyr”  
- ***Filter labels:*** “awdurdodaeth”, “ranbarth”, “Math o lys”  
- ***A–Z navigation:*** “A–Y”  
- ***Link (footer):*** “Yn ôl i frig y dudalen”

---

## URL

`/hearing~~lists/court~~list`

---

## Validation Rules

- Filters must dynamically update available courts when ***Apply filters*** is clicked.  
- The ***A–Z navigation*** must jump to the correct section of the list.  
- Filters and results must reset when ***Clear filters*** is clicked.  
- Data for ***Jurisdiction****, ***Region***, ***Type of court***, and ***Court names** must be pulled from the reference data tables in real time.  
- Empty filter states must display all courts by default.  
- If no results match the filter selection, display:  
  - ***EN:*** “No courts or tribunals found.”  
  - ***CY:*** “Heb ganfod unrhyw lysoedd na thribiwnlysoedd.”  

---

## Error Messages

***EN:***  
- “No courts or tribunals found.”  

***CY:***  
- “Heb ganfod unrhyw lysoedd na thribiwnlysoedd.”

---

## Navigation

- ***Back:*** Returns to “What court or tribunal are you interested in?” (`/hearing~~lists/find~~court`).  
- ***A–Z navigation:*** Scrolls or jumps to selected alphabet section.  
- ***Clear filters:*** Resets all selected filters.  
- ***Apply filters:*** Refreshes court list view with applied filters.  
- ***Back to top:*** Returns to top of list.  
- ***Language toggle:*** Switches between English and Welsh content.  

---

## Accessibility

- Must comply with ***WCAG 2.2 AA*** and ***GOV.UK Design System*** standards.  
- Filter panel must be navigable by keyboard and screen reader.  
- A–Z navigation letters must have accessible labels (e.g., “Show courts starting with A”).  
- Focus order must follow top~~to~~bottom logic through filter controls, results, and footer.  
- Use `role="status"` for “No results” messages and `aria-live="polite"` for dynamically updated content.  
- Ensure colour contrast compliance for grey banners and buttons.  
- “Back to top” link must be focusable and clearly visible.

---

## Test Scenarios

| ID | Scenario | Steps | Expected Result |
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
| TS1 | Page load | Navigate to `/hearing~~lists/court~~list` | Page loads with filters and A–Z court list |
| TS2 | Apply filters | Select a jurisdiction and region, click Apply filters | List updates to show matching courts |
| TS3 | Clear filters | Apply filters, then click Clear filters | All filters reset, full list shown |
| TS4 | Jurisdiction sub-filter | Select jurisdiction → Type of court appears | Court type dropdown visible |
| TS5 | A–Z navigation | Click “B” in alphabet | Page scrolls to courts starting with B |
| TS6 | Back to top | Scroll to bottom, click Back to top | Page scrolls to top |
| TS7 | No results | Apply filters with no matching data | “No courts or tribunals found” message displayed |
| TS8 | Language toggle | Switch to Welsh | Page updates to Welsh translations |
| TS9 | Accessibility (keyboard) | Navigate using Tab | All elements accessible and focus visible |
| TS10 | Responsive layout | View on mobile | Filters collapse into accessible expandable panels |

---

## Assumptions / Open Questions

- Confirm whether filters should support ***multi-selection*** (e.g., selecting multiple regions).  
- Confirm if courts and tribunals should be shown in the same list or on separate tabs.  
- Confirm if ***A–Z navigation*** should remain fixed during scroll.  
- Confirm if ***pagination or infinite scroll*** is needed for long lists.  
- Confirm whether users can combine ***A–Z navigation*** and ***filters*** simultaneously.  
- Confirm if analytics tracking should capture filter selections for reporting.

---', 'functional', 'verified', 'high', 'story', 276, 'https://github.com/hmcts/cath-service/issues/276', '2026-01-20T17:14:19Z', '2026-01-30T15:04:56Z', 'linusnorton', 'linusnorton'),
  (55, 'REQ-0055', 'Display of Pubs - Summary of Pubs page', '**PROBLEM STATEMENT**

This ticket is raised to cover the display screens needed in CaTH to allow users view uploaded publications files as hearing lists in CaTH front end.

 

**AS A** System

**I WANT** to display an uploaded publication file

**SO THAT** users can view this file as a hearing list published in CaTH

 

**Pre-condition:**
 * A publication file has been uploaded in CaTH by a local admin
 * The date user is viewing the publication is within the set display dates and hence the file is still available for display in CaTH

 

**ACCEPTANCE CRITERIA**
 * User begins journey by clicking the ''continue'' button on the landing page in CaTH and completing screen 1, 2 and 3.
 * User arrives at screen 4 with header titled ''What do you want to view from ..(court/tribunal name)? (e.g. What do you want to view from Oxford Combined Court Centre?) by either searching for the name of the court/tribunal on screen 2 and clicking continue button or by clicking the name of the court/tribunal on screen 3. 
 * underneath the header is a link to FaCT maxed in the text in apostrophe in the following sentence ''Find contact details and other information about courts and tribunals'' in England and Wales, and some non-devolved tribunals in Scotland.
 * Next is the descriptive text ''These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives.'' and this is followed by another descriptive message boldly written as follows ''{**}If you do not see a list published for the court you are looking for, it means there are no hearings scheduled.'' This section is to be implemented only where specified as part of the requirements for a specific venue.{**}
 * Next is the following text instructing the user on what to do on this page ''Select the list you want to view from the link(s) below:'' and this is followed by the list of all available published lists at that venue. Each list is displayed as a link and in the format ''list name, date - language version'' e.g. Civil and Family Daily Cause List 31 October 2025 - English (Saesneg)
 * All CaTH page specifications are maintained

 

**Welsh translations:**

What do you want to view from Oxford Combined Court Centre? - 

Beth ydych chi eisiau edrych arno gan Canolfan Llysoedd Cyfun Rhydychen?

Select the list you want to view from the link(s) below - dewiswch y rhestr rydych chi eisiau ei gweld o''r dolenni isod

These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives - Mae’r rhestrau hyn yn destun newid tan 4:30pm. Os bydd unrhyw newidiadau ar ôl yr amser hwn, byddwn yn ffonio’r partïon neu yn anfon e-bost yn uniongyrchol at y partïon neu eu cynrychiolwyr cyfreithiol.

**If you do not see a list published for the court you are looking for, it means there are no hearings scheduled -** {**}Os nad ydych chi’n gweld rhestr wedi’i chyhoeddi ar gyfer y llys rydych chi’n chwilio amdano, mae’n golygu nad oes unrhyw wrandawiadau wedi’u trefnu{**}{**}`**`

 

 

 
 #  

# VIBE-214 View Published Lists by Court or Tribunal Specification

> Owner: ***VIBE-214*** · Updated: ***24 Oct 2025***

---

## Problem Statement

This ticket defines the display screen required in CaTH for users to view uploaded publication files as hearing lists on the CaTH front end.  
It enables users to select a court or tribunal and view the list(s) of hearings published for that venue.

---

## User Story

***As a*** **System**  
***I want to*** **display an uploaded publication file**  
***So that*** **users can view this file as a hearing list published in CaTH**

---

## Pre-Conditions

1. A publication file has been uploaded in CaTH by a Local Admin.  
2. The date the user is viewing the publication is within the ***set display date range***, meaning the file remains available for display.  
3. The venue (court or tribunal) has been created and exists in the ***Court Master Reference Data***.  
4. The user has already completed ***Screen 1, Screen 2, and Screen 3*** in the CaTH hearing list journey.  

---

## Acceptance Criteria

1. User begins their journey by clicking the ***‘Continue’*** button on the landing page and completing ***Screens 1–3***.  
2. The user arrives at ***Screen 4*** with a header dynamically titled:  
   > “What do you want to view from <Court/Tribunal Name>?”  
   Example: **“What do you want to view from Oxford Combined Court Centre?”**  
3. Beneath the header, a sentence is displayed with a ***masked FaCT (Find a Court or Tribunal)*** link within the text:  
   > “Find contact details and other information about courts and tribunals in England and Wales, and some non-devolved tribunals in Scotland.”  
   - The link masked in the phrase **“Find contact details and other information about courts and tribunals”** redirects to the GOV.UK FaCT service.  
4. Below this, a descriptive message is displayed:  
   > “These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives.”  
5. Beneath this text, a bold message is displayed (only where specified as part of venue requirements):  
   > “If you do not see a list published for the court you are looking for, it means there are no hearings scheduled.”  
6. Following the above, the page displays the instruction text:  
   > “Select the list you want to view from the link(s) below:”  
7. Below this message, a list of all available published lists for the selected venue is displayed.  
8. Each list appears as a clickable link in the following format:  
   - `<List Name>, <Date> – <Language version>`  
   - Example: **Civil and Family Daily Cause List 31 October 2025 – English (Saesneg)**  
9. All CaTH page specifications, accessibility standards, and bilingual requirements are maintained.  

---

## User Journey Flow

1. User completes the first three screens in the CaTH public journey.  
   - Screen 1 – What do you want to do?  
   - Screen 2 – What court or tribunal are you interested in?  
   - Screen 3 – Select from an A–Z list (if applicable).  
2. On selecting a court and clicking ***Continue****, the system loads ***Screen 4** (this page).  
3. The page displays the selected court/tribunal name dynamically in the header.  
4. The user reads the introductory and informational text about court hearing list changes.  
5. The user selects a specific published list link to open it for viewing.  
6. If no published list exists for that venue, the “no hearings scheduled” message is displayed.  

---

## Wireframe

┌──────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK <Language> │
├──────────────────────────────────────────────────────────────────────────────┤
│ HMCTS – Courts and Tribunals Hearings (CaTH) │
├──────────────────────────────────────────────────────────────────────────────┤
│ < Back │
│ │
│ What do you want to view from Oxford Combined Court Centre? │
│ │
│ Find contact details and other information about courts and tribunals │
│ in England and Wales, and some non-devolved tribunals in Scotland. │
│ (Link masked to FaCT service) │
│ │
│ These lists are subject to change until 4:30pm. Any alterations after this │
│ time will be telephoned or emailed direct to the parties or their legal │
│ representatives. │
│ │
│ **If you do not see a list published for the court you are looking for, it │**
**│ means there are no hearings scheduled.** │
│ │
│ Select the list you want to view from the link(s) below: │
│ │
│ • Civil and Family Daily Cause List 31 October 2025 – English (Saesneg) │
│ • Magistrates Daily List 31 October 2025 – English (Saesneg) │
│ • Crown Court List 31 October 2025 – Welsh (Cymraeg) │
│ │
└──────────────────────────────────────────────────────────────────────────────┘

 

 


---

## Form Fields

No form fields are required on this page.  
The page consists entirely of text and links for display and navigation purposes.

---

## Content

***EN:***  
- ***Title/H1:*** “What do you want to view from <Court/Tribunal Name>?”  
- ***Descriptive text (1):*** “Find contact details and other information about courts and tribunals in England and Wales, and some non-devolved tribunals in Scotland.”  
- ***Descriptive text (2):*** “These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives.”  
- ***Bold message:*** “If you do not see a list published for the court you are looking for, it means there are no hearings scheduled.”  
- ***Instruction text:*** “Select the list you want to view from the link(s) below:”  

***CY:***  
- ***Title/H1:*** “Beth ydych chi eisiau edrych arno gan <Canolfan Llysoedd Cyfun Rhydychen>?”  
- ***Descriptive text (1):*** “Dewch o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd yng Nghymru a Lloegr, a rhai tribiwnlysoedd heb eu datganoli yn yr Alban.”  
- ***Descriptive text (2):*** “Mae’r rhestrau hyn yn destun newid tan 4:30pm. Os bydd unrhyw newidiadau ar ôl yr amser hwn, byddwn yn ffonio’r partïon neu yn anfon e-bost yn uniongyrchol at y partïon neu eu cynrychiolwyr cyfreithiol.”  
- ***Bold message:*** “Os nad ydych chi’n gweld rhestr wedi’i chyhoeddi ar gyfer y llys rydych chi’n chwilio amdano, mae’n golygu nad oes unrhyw wrandawiadau wedi’u trefnu.”  
- ***Instruction text:*** “Dewiswch y rhestr rydych chi eisiau ei gweld o’r dolenni isod.”  

---

## URL

`/hearing~~lists/view/\{court~~id}`

---

## Validation Rules

- This is a ***display-only page***; no input validation required.  
- The system must dynamically insert the ***court or tribunal name*** based on the user’s previous selection.  
- The list of published files must be fetched from the CaTH publication data store using the selected venue ID.  
- Where no lists are available, the “no hearings scheduled” message must be shown instead of links.  
- FaCT link must open in a new browser tab and follow GOV.UK external link standards.  
- All displayed links must be accessible via keyboard navigation and screen readers.  

---

## Error Messages

***EN:***  
- “There are currently no published lists available for this court.”  

***CY:***  
- “Ar hyn o bryd nid oes unrhyw restrau wedi’u cyhoeddi ar gyfer y llys hwn.”  

---

## Navigation

- ***Back:*** Returns to Screen 3 (`/hearing~~lists/court~~directory`) or Screen 2 (`/hearing~~lists/find~~court`) depending on navigation path.  
- ***List link:*** Opens the selected publication file (PDF or web-rendered list) in a new browser tab.  
- ***Language toggle:*** Switches between English and Welsh versions of the text while preserving context.  

---

## Accessibility

- Must comply with ***WCAG 2.2 AA*** and ***GOV.UK Design System*** standards.  
- Links must use descriptive text and open in new tabs only for external destinations (e.g., FaCT).  
- Heading hierarchy must be logical (`<h1>` for title, `<h2>` for section headers).  
- Screen readers must announce link text and context clearly.  
- Page must be navigable using a keyboard with visible focus outlines.  
- Ensure sufficient contrast between normal and bold text elements.  
- Welsh translations must be fully toggleable without reloading or losing context.  

---

## Test Scenarios

| ID | Scenario | Steps | Expected Result |
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
| TS1 | Load page | Navigate to `/hearing~~lists/view/\{court~~id}` | Page loads with correct court name in header |
| TS2 | No lists available | Court has no published lists | “No hearings scheduled” message displayed |
| TS3 | Valid published lists | Court has active lists | List links displayed in correct format |
| TS4 | Link click | Click a list link | Publication file opens in new tab |
| TS5 | FaCT link | Click “Find contact details…” link | Redirects to GOV.UK FaCT site in new tab |
| TS6 | Language toggle | Switch to Welsh | Page updates to Welsh translations |
| TS7 | Accessibility | Navigate via keyboard | All elements reachable and focus visible |
| TS8 | Screen reader test | Use screen reader | All text and links announced correctly |
| TS9 | Responsive layout | View on mobile device | Layout remains accessible and readable |
| TS10 | Dynamic title | Select another court on previous screen | Header updates to reflect selected court name |

---

## Assumptions / Open Questions

- Confirm whether the “no hearings scheduled” message should appear for all courts or only specific venues as defined by requirements.  
- Confirm whether the list links should open as downloadable PDFs or as HTML-rendered pages.  
- Confirm whether archived lists (past display dates) should remain visible for admin users only.  
- Confirm if analytics tracking is required for link clicks and list views.  
- Confirm whether sorting or filtering options (e.g., by date or hearing type) are required for venues with multiple lists.', 'functional', 'verified', 'high', 'story', 277, 'https://github.com/hmcts/cath-service/issues/277', '2026-01-20T17:14:32Z', '2026-01-30T15:04:58Z', 'linusnorton', 'linusnorton'),
  (56, 'REQ-0056', 'Display of Pubs - View flat file', '**PROBLEM STATEMENT**

This ticket is raised to cover the display screens needed in CaTH to allow users view uploaded publications (flat files) as hearing lists in CaTH front end.

 

**AS A** User

**I WANT** to view a hearing list published as a flat file in CaTH

**SO THAT** i can view the cases published in the hearing list 

 

**Pre-condition:**
 * A publication file has been uploaded in CaTH by a local admin
 * The date user is viewing the publication is within the set display dates and hence the file is still available for display in CaTH

**Technical Criteria**
 * Get the artefact ID from artefact table which will be the file name followed by extension.
 * Click on link if file is PDF, open in new tab otherwise save file on your disk.

 

**ACCEPTANCE CRITERIA**
 * User begins journey by clicking the ''continue'' button on the landing page in CaTH and completing screen 1, 2, 3 and 4.
 * on screen 4, user clicks on the link to the published hearing list of interest
 * the list opens in another tab and user is able to view the cases displayed on the flat file

 

 
 # VIBE-215 View Detailed Hearing List Specification

> Owner: {**}`**`VIBE-215`**`{**} · Updated: {**}`**`24 Oct 2025`**`{**}

—
 # 
 ## Problem Statement

This ticket covers the display screens required in CaTH to allow users to view uploaded publication flat files as hearing lists in the CaTH front end.  
This functionality enables users to open and read detailed case information contained in a published hearing list.

—
 # 
 ## User Story

{**}`**`As a`**`{**} **User**  
{**}`**`I want to`**`{**} **view a hearing list published as a flat file in CaTH**  
{**}`**`So that`**`{**} **I can view the cases published in the hearing list**

—
 # 
 ## Pre-conditions

1. A hearing list publication file has been uploaded by a Local Admin in CaTH.  
2. The viewing date is within the {**}`**`set display period`**`{**}, meaning the file remains available for display.  
3. The user has completed Screens 1–4 of the CaTH user journey:  
   - Screen 1 – “What do you want to do?”  
   - Screen 2 – “What court or tribunal are you interested in?”  
   - Screen 3 – “A–Z List of Courts and Tribunals” (if applicable).  
   - Screen 4 – “What do you want to view from <Court/Tribunal Name>?”  
4. The user has clicked the link to a published hearing list from Screen 4.  
5. The system retrieves the flat file from CaTH’s publication storage repository.

—
 # 
 ## Acceptance Criteria

1. When the user clicks the link to a published hearing list on Screen 4, the file opens in a {**}`**`new browser tab`**`{**}.  
2. The hearing list file displays all the cases published in that list.  
3. The file content is presented in the same layout and format as uploaded (e.g., PDF, HTML, CSV, or plain text).  
4. Users can {**}`**`scroll through, zoom, or download`**`{**} the file (depending on the file type).  
5. The opened file tab includes the {**}`**`court or tribunal name`**`{**} and {**}`**`list title`**`{**} in the browser header.  
6. If the publication file is unavailable, expired, or cannot be loaded, the user must see an error message.  
7. Page design and navigation must comply with {**}`**`GOV.UK Design System`**`{**} and {**}`**`CaTH accessibility standards`**`{**}.

—
 # 
 ## User Journey Flow

1. User navigates through CaTH and selects a hearing list from Screen 4.  
2. The system retrieves the associated publication file from CaTH’s file repository.  
3. The publication opens in a {**}`**`new tab`**`{**} for viewing.  
4. User reviews the hearing list content.  
5. User may close the tab to return to the previous page (Screen 4).  

—
 # 
 ## Wireframe

(Main Tab – Screen 4)
┌─────────────────────────────────────────────────────────────────────────────┐
│ What do you want to view from Oxford Combined Court Centre? │
│ Select the list you want to view from the link(s) below: │
│ │
│ • Civil and Family Daily Cause List, 31 October 2025 – English (Saesneg) │
│ │
│ <User clicks link above → File opens in new tab> │
└─────────────────────────────────────────────────────────────────────────────┘

(New Tab – Hearing List File)
┌─────────────────────────────────────────────────────────────────────────────┐
│ Oxford Combined Court Centre – Civil and Family Daily Cause List │
│ Published: 31 October 2025 │
│ │
│ ┌───────────────────────────────────────────────────────────────────────┐ │
│ │ Case No: 24CF00012 | Smith v Jones | Hearing Room 3 | 10:00 AM │ │
│ │ Case No: 24CF00013 | Brown v Green | Hearing Room 5 | 11:30 AM │ │
│ │ ... (continued) │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│ │
│ <Download PDF> <Print> │
└─────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## Display Requirements

|Element|Description|
|~~--~~~~--~~~~-|~~~~--~~~~--~~~~--~~-|
|Browser tab title|“<Court/Tribunal Name> – <List Name>” (e.g., “Oxford Combined Court Centre – Civil and Family Daily Cause List”)|
|File container|Displays the uploaded publication in native format (PDF viewer, HTML render, or plain text).|
|Metadata|Show publication date and language version where available.|
|Controls|File viewer may provide “Download” or “Print” options depending on file type.|
|Scroll/zoom|Enabled by default for PDF or long-format lists.|

—
 # 
 ## Content

{**}`**`EN:`**`{**}  
 - {**}`**`Page Title (browser tab):`**`{**} “<Court Name> – <List Name>”  
 - {**}`**`Header:`**`{**} “<Court Name> Hearing List”  
 - {**}`**`Message (if no file available):`**`{**} “The selected hearing list is not available or has expired. Please return to the previous page.”  

{**}`**`CY:`**`{**}  
 - {**}`**`Page Title (browser tab):`**`{**} “<Enw’r Llys> – <Enw’r Rhestr>”  
 - {**}`**`Header:`**`{**} “Rhestr Wrando <Enw’r Llys>”  
 - {**}`**`Message (if no file available):`**`{**} “Nid yw’r rhestr wrando a ddewiswyd ar gael neu mae wedi dod i ben. Ewch yn ôl i’r dudalen flaenorol.”  

—
 # 
 ## URL

`/hearing~~lists/\{court~~id}/\{list-id}`  
**(Opens in a new browser tab)**

—
 # 
 ## Validation Rules

 - The file must only be displayed if:  
  - Publication status = “Active.”  
  - Display date range includes current date.  
 - File metadata (court name, title, date, and language) must match the publication details stored in CaTH.  
 - Links must point to the correct file location (e.g., `/files/publications/\{court-id}/\{filename}`).  
 - If the file link is broken or missing, show an error message on a simple fallback page.  

—
 # 
 ## Error Messages

{**}`**`EN:`**`{**}  
 - “The selected hearing list is not available or has expired. Please return to the previous page.”  
 - “We could not load the hearing list file. Please try again later.”  

{**}`**`CY:`**`{**}  
 - “Nid yw’r rhestr wrando a ddewiswyd ar gael neu mae wedi dod i ben. Ewch yn ôl i’r dudalen flaenorol.”  
 - “Ni allwn lwytho ffeil y rhestr wrando. Ceisiwch eto yn nes ymlaen.”  

—
 # 
 ## Navigation

 - {**}`**`Back (previous tab):`**`{**} Returns to Screen 4 – “What do you want to view from <Court/Tribunal Name>?”  
 - {**}`**`Close tab:`**`{**} Closes the current file view and returns user to CaTH.  
 - {**}`**`Language toggle:`**`{**} Switches translated versions of the file (if both English and Welsh versions are available).  
 - {**}`**`Download/Print controls:`**`{**} Available for supported file types (e.g., PDFs).  

—
 # 
 ## Accessibility

 - Must comply with {**}`**`WCAG 2.2 AA`**`{**} and {**}`**`GOV.UK Design System`**`{**} standards.  
 - Publication files must be accessible (text-based PDFs or HTML files).  
 - Files must be readable by screen readers (avoid scanned images without OCR).  
 - “Back to previous page” message should include accessible link text.  
 - File viewers must provide zoom functionality and keyboard shortcuts for navigation.  
 - Language versions (English/Welsh) must be labelled clearly.  
 - Tab focus must open on the file container when new tab is launched.

—
 # 
 ## Test Scenarios

|ID|Scenario|Steps|Expected Result|
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
|TS1|Open hearing list|Click a published list link on Screen 4|File opens in a new tab|
|TS2|File available|Verify file loads correctly|Hearing list displays with correct details|
|TS3|File unavailable|Open expired or missing file|Error message displayed|
|TS4|Browser tab title|Open a valid file|Tab title shows “<Court Name> – <List Name>”|
|TS5|Language toggle|Switch to Welsh|File reloads with Welsh version if available|
|TS6|Accessibility – Screen reader|Open list using assistive tech|File content readable and properly labelled|
|TS7|Accessibility – Keyboard nav|Navigate via Tab and Enter|File viewer controls reachable|
|TS8|File format test|Upload and view PDF, CSV, HTML|File renders correctly in new tab|
|TS9|Expired publication|Attempt to access expired list|“File not available or expired” message displayed|
|TS10|Download/Print|Open PDF file|Download or print options available and functional|

—
 # 
 ## Assumptions / Open Questions

 - Confirm whether all hearing list files will open in a {**}`**`new tab`**`{**} or inline on the same page.  
 - Confirm if publication files can be downloaded or only viewed.  
 - Confirm if there will be a {**}`**`consistent format (PDF/HTML)`**`{**} across all courts.  
 - Confirm if language toggle dynamically switches the file or requires reloading from storage.  
 - Confirm retention period for published files after display expiry date.  

—', 'functional', 'verified', 'high', 'story', 278, 'https://github.com/hmcts/cath-service/issues/278', '2026-01-20T17:14:45Z', '2026-01-30T14:02:26Z', 'linusnorton', 'linusnorton'),
  (57, 'REQ-0057', 'Civil & Family Daily Cause list', '**PROBLEM STATEMENT**

This ticket is raised to cover the creation of the validation schema and style guide needed to publish, display and view the civil and family daily cause list in CaTH front end. To ensure hearing list publications uploaded as JSON files are correctly formatted, validated, and displayed consistently in CaTH, a validation schema and style guide integration process must be implemented. 

Validation schema details are in attached document but possible fields in the civil & family daily cause list include document, version, publication date, document name, venue, venue name, venue contact, venue telephone, venue email, venue address, line, town, post code, county, court list, court house, court house name, court house address, line, town, county, postcode, courtroom, courtroom name, session, session channel, judiciary, joh known as, is presiding, sittings, sitting start, sitting end, hearing, hearing type, case, case name, case number, case Sequence Indicator, case type, reporting Restriction Detail, party party role, friendly Role Name, individual details, individual forename, individual Middle Name, individual surname, title, organisation Details, organisation Name and channel.

A sample style guide is attached.

 

**AS A** User

**I WANT** to view a civil and family daily cause list in CaTH

**SO THAT** i can view the cases published in the hearing list 

 

**Pre-condition:**
 * A publication file (Json files) has been uploaded in CaTH by a local admin
 * The date user is viewing the publication is within the set display dates and hence the file is still available for display in CaTH

 

**Technical Criteria**
 # On Manual Upload screen (manual-upload), we need to add new list type in drop down named "Civil And Family Daily Cause List"
 # On Manual Upload confirmation screen, validate the json file uploaded for "Civil And Family Daily Cause List" against schema at <https://github.com/hmcts/pip~~data~~management/blob/master/src/main/resources/schemas/civil*and*family*daily*cause_list.json>. Download and Save this schema in app.
 # This schema is specific to "Civil And Family Daily Cause List". No other list use this schema for it validation.
 # Master schema not to be used - only validation schema. Ignore "Validation Schema Overview" in this ticket below.
 # After passing validation, store JSON file to a temp location. Do not store the JSON in database table.
 # Add new column isFlatFile in artefact table. If it is json file, set column to false otherwise true, and store rest of metadata in artefact table 
 # Once lists is saved, on summary of publication page, you need to get the information about this list from artefact table and showed on the page as link i.e. Civil and Family Daily Cause List 13 November 2025 - English (Saesneg) where as 13 November 2025 is content date selected while manual upload page. This will be link.
 # When user click on link in point 7, it should take user to Civil And Family Daily Cause List style guide page.
 # On style guide view page, you need to get the JSON file which was uploaded and saved in step 5.

 

**ACCEPTANCE CRITERIA**
 * User begins journey by clicking the ''continue'' button on the landing page in CaTH and completing screen 1, 2, 3 and 4.
 * On screen 4, user clicks on the link to the published hearing list of interest
 * When the JSON file is uploaded into CaTH, it must be automatically validated against the Validation Schema for the civil and family daily cause list
 * The JSON publication data must follow the defined structure (schema) and must be rendered in a consistent, accessible format that aligns with the agreed style guide and CaTH’s presentation standards when converted at the back end. ( Page layout, typography, Case section headers, Colour, spacing, and accessibility standards)
 * Courts, regions, and jurisdictions referenced in the Json file must have been created in CaTH using the Court Master Reference Data  
 * The validated and styled output is rendered as HTML for front-end display in same tab
 * Error handling is implemented for the civil and family daily cause list. If validation fails the ingestion is stopped, the failure is logged in the Validation Report, the error is surfaced to the System Admin for correction and the system must maintain a version-controlled record of both the validation schema and style guide used at the time of rendering and the system must {**}`**`not crash`**`{**}. The user must be shown a {**}`**`clear and consistent error page`**`{**} within the CaTH front end which states that the publication cannot be viewed and advise the user to check again later instead of a blank or broken page. The standard error page layout should follow the GOV.UK and CaTH design style.
 * The validation report should contain details of the failure, including  the File name and ID, Court or tribunal name, Timestamp, Error type (e.g., schema validation, missing fields, parse error, rendering error) and a Description of the issue 
 * The System Admin users must be able to view error details via the Audit Viewer
 * All CaTH page specifications are maintained
 * Within the list, the following format is displayed in the style guide:
 * Header displays list name e.g. Civil and Family Daily Cause List for Oxford Combined Court Centre. This is followed by the venue address, publication date and last updated date.
 * Next is the open justice section which is followed by the search box and details of the hearings. The open justice section would display the following message: Open justice is a fundamental principle of our justice system. You can attend a public hearing in person or you can apply for permission to observe remotely.

Requests to observe remotely a hearing that is taking place at Oxford Combined Court Centre should be made in good time direct to: enquiries.oxford.countycourt@justice.gov.uk or by calling 01865 264 200. You may be asked to provide further details.

The judge hearing the case will decide if it is appropriate for you to observe remotely. They will have regard to the interests of justice, the technical capacity for remote observation and what is necessary to secure the proper administration of justice.

Sometimes it is necessary for hearings to be held in private and you will not be able to observe remotely or in person. Members of the press are able to attend some private hearings.

For more information, please visit <https://www.gov.uk/guidance/observe~~a-court~~or~~tribunal~~hearing>.

 

 
 # VIBE-216 Civil and Family Daily Cause List Specification (Validation Schema & Style Guide Integration)

> Owner: {**}`**`VIBE-216`**`{**} · Updated: {**}`**`24 Oct 2025`**`{**}

—
 # 
 ## Problem Statement

This ticket defines the creation and integration of the {**}`**`Validation Schema`**`{**} and {**}`**`Style Guide`**`{**} required for publishing, displaying, and viewing the {**}`**`Civil and Family Daily Cause List`**`{**} in the CaTH front end.  

The process ensures all JSON publication files uploaded are correctly formatted, validated, and displayed consistently across CaTH, maintaining data integrity and accessibility standards.

—
 # 
 ## User Story

{**}`**`As a`**`{**} **User**  
{**}`**`I want to`**`{**} **view a civil and family daily cause list in CaTH**  
{**}`**`So that`**`{**} **I can view the cases published in the hearing list**

—
 # 
 ## Pre-conditions

1. A valid {**}`**`publication file (JSON)`**`{**} has been uploaded by a Local Admin.  
2. The publication date is within the file’s {**}`**`set display range`**`{**} so that it is available for public view in CaTH.  
3. The {**}`**`Validation Schema`**`{**} for Civil and Family Daily Cause Lists has been implemented and active in CaTH.  
4. The {**}`**`Style Guide`**`{**} for rendering validated JSON data has been defined and integrated into the front-end rendering engine.  
5. All referenced {**}`**`courts, regions, and jurisdictions`**`{**} exist within the {**}`**`Court Master Reference Data`**`{**}.

—
 # 
 ## Acceptance Criteria

1. {**}`**`User Journey:`**`{**}  
   - User begins by clicking the {**}`**`‘Continue’`**`{**} button on the landing page and completes {**}`**`Screens 1–4`**`{**}.  
   - On Screen 4, the user selects a published list link for the court or tribunal of interest.  
   - The selected list opens and is displayed as {**}`**`HTML`**`{**} in the same browser tab.  

2. {**}`**`Validation Schema Integration:`**`{**}  
   - Each uploaded Civil and Family Daily Cause List JSON file is automatically validated against the {**}`**`Civil and Family Validation Schema`**`{**} before being ingested.  
   - Validation ensures required fields exist, data types are correct, and all nested structures align with schema rules.  

3. {**}`**`Style Guide Rendering:`**`{**}  
   - Once validated, the JSON content must be {**}`**`transformed and displayed`**`{**} following the Civil and Family Style Guide (layout, typography, case hierarchy, and color standards).  
   - The rendered page must comply with {**}`**`CaTH and GOV.UK accessibility standards`**`{**}.  

4. {**}`**`Data Relationships:`**`{**}  
   - Courts, regions, and jurisdictions in the JSON file must correspond to entries in the Court Master Reference Data.  
   - Provenance identifiers (e.g., `venue`, `venue name`, `court house`) must map accurately to internal CaTH data.  

5. {**}`**`Error Handling:`**`{**}  
   - If validation fails, ingestion is stopped, and an error is logged in the {**}`**`Validation Report`**`{**}.  
   - A {**}`**`standard CaTH error page`**`{**} (styled per GOV.UK guidance) must display to users with the message:  
     > “This publication cannot be viewed at the moment. Please check again later.”  
   - The system must {**}`**`not crash`**`{**} under any error condition.  
   - A {**}`**`version-controlled record`**`{**} of both the Validation Schema and Style Guide used during processing is stored.  

6. {**}`**`Validation Report Logging:`**`{**}  
   Each failure entry includes:  
   - File Name and ID  
   - Court/Tribunal Name  
   - Timestamp  
   - Error Type (schema validation, missing field, parse error, rendering error)  
   - Description of the issue  

7. {**}`**`Audit and System Admin Access:`**`{**}  
   - System Admins can view all validation and rendering errors through the {**}`**`Audit Viewer`**`{**}.  

8. {**}`**`List Display Layout:`**`{**}  
   The front-end display must follow the Style Guide format for Civil and Family Daily Cause Lists (detailed below).  

—
 # 
 ## Validation Schema Overview

The JSON {**}`**`Validation Schema`**`{**} defines the structure of Civil and Family Daily Cause Lists.  
Key fields include (but are not limited to):
|Field|Description|Required|
|~~--~~~~--~~|~~--~~~~--~~~~--~~~~-|~~~~--~~~~--~~--|
|document|Root object containing metadata|Yes|
|version|Schema version identifier|Yes|
|publication_date|Date of publication (ISO 8601)|Yes|
|document_name|Name of the cause list|Yes|
|venue|Object containing court/tribunal details|Yes|
|venue_name|Court or tribunal name|Yes|
|venue_contact|Contact name (if available)|No|
|venue_telephone|Contact telephone number|No|
|venue_email|Email contact for venue|No|
|venue_address|Object with address details (line, town, postcode, county)|Yes|
|court_list|List of courts included|Yes|
|courtroom|Courtroom identifier|Yes|
|session|Session metadata (start, end, channel)|Yes|
|judiciary|List of judges assigned|Yes|
|hearing|Details of individual hearings|Yes|
|case|Case details within hearing (name, number, type, etc.)|Yes|
|reporting*restriction*detail|Notes on publication restrictions|Optional|
|parties|Object containing party details and roles|Optional|
|individual_details|Forename, middle name, surname, title|Optional|
|organisation_details|Organisation name|Optional|
|channel|Mode of hearing (in-person, remote)|Optional|

Each field must match data types defined in the schema (string, array, object, boolean, etc.).  

—
 # 
 ## Style Guide Overview

The {**}`**`Style Guide`**`{**} ensures the published Civil and Family Daily Cause List is displayed with consistent layout and formatting in CaTH.  
 # 
 ## 
 ### Layout and Design Standards

 - {**}`**`Header section`**`{**} includes:  
  - List Name (e.g., {**}Civil and Family Daily Cause List for Oxford Combined Court Centre{**})  
  - Venue Address  
  - Publication Date and “Last Updated” timestamp.  
 - {**}`**`Typography:`**`{**}  
  - GOV.UK Design System font hierarchy (`govuk~~heading~~xl`, `govuk-body`, etc.)  
  - Clear spacing between sections for readability.  
 - {**}`**`Color and Spacing:`**`{**}  
  - Neutral background (white) with black text.  
  - Use GOV.UK blue for links and green for success banners (if applicable).  
 - {**}`**`Section Hierarchy:`**`{**}  
  - **Open Justice Section**  
  - **Search Box (for case filtering)**  
  - **Hearing List Section**  
  - **Footer (CaTH standard)**  

—
 # 
 ## Open Justice Section (Mandatory)

Displayed beneath the header as a descriptive text block:

> {**}`**`Open justice is a fundamental principle of our justice system.`**`{**}  
> You can attend a public hearing in person or you can apply for permission to observe remotely.  
>
> Requests to observe remotely a hearing that is taking place at Oxford Combined Court Centre should be made in good time direct to:  
> {**}`**`enquiries.oxford.countycourt@justice.gov.uk`**`{**} or by calling {**}`**`01865 264 200.`**`{**}  
> You may be asked to provide further details.  
>
> The judge hearing the case will decide if it is appropriate for you to observe remotely. They will have regard to the interests of justice, the technical capacity for remote observation and what is necessary to secure the proper administration of justice.  
>
> Sometimes it is necessary for hearings to be held in private and you will not be able to observe remotely or in person. Members of the press are able to attend some private hearings.  
>
> For more information, please visit <https://www.gov.uk/guidance/observe~~a-court~~or~~tribunal~~hearing>(<https://www.gov.uk/guidance/observe~~a-court~~or~~tribunal~~hearing>).

—
 # 
 ## Example Page Layout (Wireframe)

┌─────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK <Language> │
├─────────────────────────────────────────────────────────────────────────────┤
│ HMCTS – Courts and Tribunals Hearings (CaTH) │
├─────────────────────────────────────────────────────────────────────────────┤
│ Civil and Family Daily Cause List for Oxford Combined Court Centre │
│ Address: St Aldate’s, Oxford OX1 1TL │
│ Publication date: 30 October 2025 | Last updated: 31 October 2025 │
│────────────────────────────────────────────────────────────────────────────│
│ **Open Justice** │
│ (Open justice informational text as shown above) │
│────────────────────────────────────────────────────────────────────────────│
│ <Search for a case> <*__**__*___> <Search Button> │
│────────────────────────────────────────────────────────────────────────────│
│ **Courtroom 1 – Family Cases** │
│ 10:00 AM | Judge A Smith | Case No: CF~~2025~~001 | Brown v Brown │
│ 11:00 AM | Judge B Taylor | Case No: CF~~2025~~002 | Johnson v Johnson │
│────────────────────────────────────────────────────────────────────────────│
│ **Courtroom 2 – Civil Cases** │
│ 10:30 AM | Judge R Khan | Case No: CV~~2025~~011 | Jones v Lewis │
│────────────────────────────────────────────────────────────────────────────│
│ End of list │
└─────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## Error Handling Specification

{**}`**`Front~~end error message (user~~facing):`**`{**}

> {**}`**`This publication cannot be viewed at the moment. Please check again later.`**`{**}  
> If the problem persists, contact the court directly for assistance.  

{**}`**`System Logging (back-end):`**`{**}
 - Errors are written to the {**}`**`Validation Report`**`{**} and classified as one of:  
  - Schema validation failure  
  - Missing field(s)  
  - JSON parse error  
  - Rendering error  
 - Error log structure:

|Field|Description|
|~~--~~~~--~~|~~--~~~~--~~~~--~~-|
|File Name|Name of the uploaded JSON file|
|File ID|Unique CaTH file identifier|
|Court Name|Venue associated with file|
|Timestamp|Date and time of failure|
|Error Type|Schema / Parse / Rendering|
|Description|Human-readable explanation|
|Admin User|(if applicable)|

—
 # 
 ## URL Structure

|Page|URL|
|~~--~~~~-|~~---|
|Civil and Family List Display|`/hearing~~lists/civil~~and~~family/\{court~~id}`|
|Error Page|`/hearing-lists/error`|
|Validation Report (System Admin)|`/admin/validation-report`|
|Audit Viewer (System Admin)|`/admin/audit-viewer`|

—
 # 
 ## Accessibility

 - Must comply with {**}`**`WCAG 2.2 AA`**`{**} and {**}`**`GOV.UK Design System`**`{**}.  
 - Text alternatives provided for all non-text elements.  
 - Keyboard navigation must reach all interactive elements.  
 - Screen readers must announce all section headers and case listings in logical order.  
 - Use `role="alert"` for error notifications.  
 - Tables or lists must use semantic HTML (`<table>`, `<ul>`, `<li>`) for structured data.  
 - The rendered output must remain accessible on both desktop and mobile devices.

—
 # 
 ## Test Scenarios

|ID|Scenario|Steps|Expected Result|
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
|TS1|Valid JSON upload|Upload valid Civil & Family JSON file|File ingested and validated successfully|
|TS2|Invalid JSON schema|Upload malformed file|Ingestion stops, error logged, user sees error page|
|TS3|Missing required field|Remove “court_list” from JSON|Validation fails, logged in Validation Report|
|TS4|Successful render|View valid list in browser|HTML page displays following Style Guide|
|TS5|Mapping validation|JSON references unknown court ID|Ingestion blocked and logged|
|TS6|Error page display|View failed publication|User sees friendly error page|
|TS7|Version control|Review system log|Schema and style guide version recorded|
|TS8|Accessibility|Navigate with keyboard and screen reader|All content reachable and announced correctly|
|TS9|Welsh toggle|Switch to Welsh|Page translations load correctly|
|TS10|Search function|Use search box to find case|Search results highlight relevant case entry|

—
 # 
 ## Assumptions / Open Questions

 - Confirm if schema versioning (e.g., `v1`, `v2`) should be stored within each publication record.  
 - Confirm if style guide updates require separate version control tracking.  
 - Confirm if JSON file ingestion triggers an automated validation report generation for every upload.  
 - Confirm whether the error page should offer a “Back to court selection” link.  
 - Confirm whether future iterations will include pagination or filtering for lengthy lists.  

—', 'functional', 'verified', 'high', 'story', 279, 'https://github.com/hmcts/cath-service/issues/279', '2026-01-20T17:15:01Z', '2026-01-30T15:05:01Z', 'linusnorton', 'linusnorton'),
  (58, 'REQ-0058', 'Error handling for Json-HTML Conversion (Suggested by AI)', '**PROBLEM STATEMENT**

This ticket covers the error handling and fallback process for when a JSON publication file uploaded to CaTH fails during the ingestion, conversion, or rendering process.  
CaTH must ensure users receive clear, consistent feedback when a JSON hearing list cannot be displayed due to technical or data validation issues, without causing a full system failure.

 

**AS A** System

**I WANT** to handle errors that occur during JSON file conversion and rendering

**SO THAT** users receive a clear message if a hearing list cannot be viewed, and administrators can track and resolve issues efficiently

 

**Pre-conditions:**
 * A JSON publication file has been uploaded into CaTH by a Local Admin.  
 * The publication file exists in the repository but may contain validation, formatting, or structural issues.  
 * The display attempt triggers the JSON~~to~~HTML conversion process, which fails due to one or more errors.  
 * System Admins have access to a validation or error log that records the failed conversion details. 

 

**ACCEPTANCE CRITERIA**
 * When a JSON file fails validation or cannot be rendered, the system must ***not crash***.  
 * The user must be shown a ***clear and consistent error page*** within the CaTH front end.  
 * The error message displayed must state that the publication cannot be viewed and advise the user to check again later.  
 * The system must log detailed error information including:  
   - File name and ID  
   - Court or tribunal name  
   - Timestamp  
   - Error type (e.g., schema validation, missing fields, parse error, rendering error)  
   - Description of the issue  
 * A fallback mechanism must be provided to:  
   - Prevent rendering of invalid JSON data.  
   - Display an error banner instead of a blank or broken page.  
 * If the failure is temporary (e.g., file loading timeout), the system should retry once before displaying the error.  
 * Admin users must be able to view error details via the Validation Report Viewer (refer to VIBE-210).  
 * The system must provide a standard error page layout that follows the GOV.UK and CaTH design style.  
 * Welsh translation for all messages must be available.  

 

 

 

# VIBE-217 Error Handling and Fallback for JSON Conversion Failures Specification

> Owner: ***VIBE-217*** · Updated: ***25 Oct 2025***

---

## Problem Statement

This ticket covers the ***error handling and fallback process*** for when a JSON publication file uploaded to CaTH fails during the ingestion, conversion, or rendering process.  
CaTH must ensure users receive clear, consistent feedback when a JSON hearing list cannot be displayed due to technical or data validation issues, without causing a full system failure.

---

## User Story

***As a*** **System**  
***I want to*** **handle errors that occur during JSON file conversion and rendering**  
***So that*** **users receive a clear message if a hearing list cannot be viewed, and administrators can track and resolve issues efficiently**

---

## Pre-conditions

1. A JSON publication file has been uploaded into CaTH by a Local Admin.  
2. The publication file exists in the repository but may contain validation, formatting, or structural issues.  
3. The display attempt triggers the JSON~~to~~HTML conversion process, which fails due to one or more errors.  
4. System Admins have access to a validation or error log that records the failed conversion details.  

---

## Acceptance Criteria

1. When a JSON file fails validation or cannot be rendered, the system must ***not crash***.  
2. The user must be shown a ***clear and consistent error page*** within the CaTH front end.  
3. The error message displayed must state that the publication cannot be viewed and advise the user to check again later.  
4. The system must log detailed error information including:  
   - File name and ID  
   - Court or tribunal name  
   - Timestamp  
   - Error type (e.g., schema validation, missing fields, parse error, rendering error)  
   - Description of the issue  
5. A ***fallback mechanism*** must be provided to:  
   - Prevent rendering of invalid JSON data.  
   - Display an error banner instead of a blank or broken page.  
6. If the failure is temporary (e.g., file loading timeout), the system should ***retry once*** before displaying the error.  
7. Admin users must be able to view error details via the ***Validation Report Viewer*** (refer to VIBE-210).  
8. The system must provide a ***standard error page layout*** that follows the GOV.UK and CaTH design style.  
9. Welsh translation for all messages must be available.  

---

## User Journey Flow

1. User completes Screens 1–4 and clicks a JSON-based hearing list link.  
2. CaTH backend attempts to convert the JSON file into HTML using the style guide.  
3. Conversion fails due to invalid schema or data structure.  
4. System checks for recoverable errors:  
   - If recoverable → retries once.  
   - If not recoverable → triggers fallback.  
5. The system logs the error in the validation report and displays the ***Error Page*** to the user.  
6. User may click “Back to previous page” or “Return to home” from the error screen.  

---

## Wireframe – Error Page

┌──────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK <Language> │
├──────────────────────────────────────────────────────────────────────────────┤
│ HMCTS – Courts and Tribunals Hearings (CaTH) │
├──────────────────────────────────────────────────────────────────────────────┤
│ < Back │
│ │
│ ⚠️ We’re sorry, we can’t show this hearing list right now. │
│ │
│ The publication file could not be loaded or is temporarily unavailable. │
│ Please try again later. │
│ │
│ <Back to previous page> <Home> │
└──────────────────────────────────────────────────────────────────────────────┘

 


---

## Error Types and System Behaviour

| Error Type | Description | System Action |
|~~--~~~~--~~~~--~~~~|-~~~~--~~~~--~~~~--~~|~~--~~~~--~~~~--~~~~--~~|
| Schema validation error | JSON structure does not match schema | Log error; show fallback message |
| Missing field | Required fields (e.g., hearing date, case number) missing | Log error; prevent partial display |
| Corrupt file | File cannot be parsed as JSON | Log error; block rendering |
| File not found | Missing or deleted file from repository | Display error message “File unavailable.” |
| Timeout | File retrieval or render exceeds time limit | Retry once, then display error message |
| Rendering failure | Style guide template fails to process data | Log error; display fallback screen |

---

## Display Elements (Error Page)

| Element | Description |
|~~--~~~~--~~~~-|~~~~--~~~~--~~~~--~~-|
| Banner | Prominent red or grey banner with warning icon |
| Header | “We’re sorry, we can’t show this hearing list right now.” |
| Body text | “The publication file could not be loaded or is temporarily unavailable. Please try again later.” |
| Back link | Returns to previous page |
| Home link | Redirects user to CaTH landing page |
| Language toggle | Switches all text between English and Welsh |

---

## Content

***EN:***  
- ***Title/H1:*** “We’re sorry, we can’t show this hearing list right now.”  
- ***Description:*** “The publication file could not be loaded or is temporarily unavailable. Please try again later.”  
- ***Back link:*** “Back to previous page”  
- ***Home link:*** “Home”  

***CY:***  
- ***Title/H1:*** “Ymddiheurwn, ni allwn ddangos y rhestr wrando ar hyn o bryd.”  
- ***Description:*** “Nid oedd modd llwytho’r ffeil gyhoeddi neu nid yw ar gael dros dro. Ceisiwch eto yn nes ymlaen.”  
- ***Back link:*** “Yn ôl i’r dudalen flaenorol”  
- ***Home link:*** “Tudalen gartref”  

---

## URL

`/hearing-lists/error`

---

## Technical Implementation

- When the JSON~~to~~HTML rendering service encounters an error:  
  - The system sends an event log entry to the ***CaTH Validation Report*** database.  
  - A JSON response (error object) is generated and served to the front end with relevant details.  
- Backend response structure example:

```json
{
  "status": "error",
  "code": "RENDER_FAIL",
  "message": "JSON file failed schema validation.",
  "file_id": "CATH-002345",
  "court": "Oxford Combined Court Centre",
  "timestamp": "2025~~10~~25T10:42:00Z"
}

 
 * The front-end component reads this error response and renders the **standard error page** template.

## h2. Logging and Reporting

Each error event must record the following metadata:
|Field|Description|
|Timestamp|Date/time error occurred|
|File name|Original uploaded file name|
|Court or tribunal|Associated venue|
|Error type|Classification (schema, missing field, etc.)|
|Error message|Detailed description|
|Admin resolution status|Pending / Resolved|
|System ID|Unique internal record ID|
## h2. Validation Rules
 * If the JSON file is missing or corrupt, no raw data should be displayed.

 * Retry once on recoverable network or load errors (e.g., timeout).

 * Log all events with a unique identifier and timestamp.

 * Front-end must **never display partial or raw JSON** to end users.

 * Welsh translations must appear when language toggle is active.

 * Error messages must be accessible and clearly visible to assistive technologies.

## h2. Error Messages

**EN:**
 * “We’re sorry, we can’t show this hearing list right now.”

 * “The publication file could not be loaded or is temporarily unavailable. Please try again later.”

 * “Please contact the court or tribunal if you believe this is an error.”

**CY:**
 * “Ymddiheurwn, ni allwn ddangos y rhestr wrando ar hyn o bryd.”

 * “Nid oedd modd llwytho’r ffeil gyhoeddi neu nid yw ar gael dros dro. Ceisiwch eto yn nes ymlaen.”

 * “Cysylltwch â’r llys neu’r tribiwnlys os ydych yn credu bod hyn yn wall.”

## h2. Navigation
 * **Back to previous page:** Returns user to the court’s hearing list view (Screen 4).

 * **Home:** Returns to CaTH landing page.

 * **Language toggle:** Switches error page text between English and Welsh.

## h2. Accessibility
 * Must comply with **WCAG 2.2 AA** and **GOV.UK Design System** standards.

 * Error banner must have `role="alert"` and visible focus states.

 * Page title must reflect the error condition (e.g., “Error – Hearing List Unavailable”).

 * Screen readers must announce the error immediately on page load.

 * Navigation links must have descriptive text and clear focus indicators.

 * Colour contrast and iconography must meet GOV.UK accessibility standards.

 * Keyboard navigation must allow users to return to the previous page easily.

 

 

Test Scenarios
|ID|Scenario|Steps|Expected Result|
|TS1|JSON conversion error|Upload invalid JSON file and view|Error page displayed|
|TS2|File not found|Delete file and attempt to view|Error message “File unavailable” displayed|
|TS3|Schema validation failure|Upload JSON with missing fields|Conversion fails; fallback page shown|
|TS4|Rendering error|Introduce style guide mapping issue|Error page displayed and logged|
|TS5|Retry mechanism|Simulate timeout on first attempt|System retries once; if fail, show error|
|TS6|Log creation|Cause JSON failure|Error logged with timestamp and details|
|TS7|View error in validation report|Admin opens validation report (VIBE-210)|Entry visible with failure reason|
|TS8|Accessibility|Use screen reader|Error text read aloud automatically|
|TS9|Welsh translation|Switch to Welsh|Page re-renders in Welsh|
|TS10|Back navigation|Click “Back to previous page”|Returns to court list screen (Screen 4)|

 
## Assumptions / Open Questions
 * Confirm if **email alerts** should be sent to admins when conversion errors occur.

 * Confirm if **automated retry** should attempt to reprocess the JSON after admin correction.

 * Confirm how long **error logs** are retained in the validation report (e.g., 90 days).

 * Confirm if **partial rendering** is acceptable for minor issues (e.g., missing optional fields).

 * Confirm whether **user-facing error page** should display a contact link for the court or admin.', 'non_functional', 'verified', 'medium', 'story', 280, 'https://github.com/hmcts/cath-service/issues/280', '2026-01-20T17:15:17Z', '2026-01-30T15:05:03Z', 'linusnorton', 'linusnorton'),
  (59, 'REQ-0059', 'JSON Validation Schema and Style Guide Integration Specification (Suggested by AI)', '**PROBLEM STATEMENT**

To ensure hearing list publications uploaded as JSON files are correctly formatted, validated, and displayed consistently in CaTH, a validation schema and style guide integration process must be implemented.  This ticket ensures that JSON publication data follows a defined structure (schema) and is rendered in a consistent, accessible format aligned with CaTH’s design and presentation standards.

 

**AS A** System

**I WANT** to validate and format uploaded JSON files using an approved schema and style guide

**SO THAT** hearing list publications display consistently and reliably in the CaTH front end

 

**Pre-conditions**
 * A JSON hearing list file has been uploaded into CaTH by a Local Admin.  
 * The file’s content includes structured case data that matches CaTH’s publication schema format.  
 * The CaTH JSON Validation Schema and Style Guide are defined and approved.  
 * The ingestion and rendering services are configured to read the schema and apply the style guide dynamically.  
 * Courts, regions, and jurisdictions referenced in the file exist within the Court Master Reference Data  

 

**ACCEPTANCE CRITERIA**
 *  When a JSON file is uploaded into CaTH, it is automatically validated against the CaTH JSON Validation Schema
 * Validation must ensure that:  
   - All mandatory fields are present and correctly formatted.  
   - All enumerations (e.g., jurisdiction types, hearing types, regions) match expected values.  
   - Date/time formats comply with ISO 8601.  
   - All IDs (e.g., Court ID, Provenance ID) exist in the Court Master Reference Data.
 * Once validated, the JSON file is mapped to a Style Guide template appropriate to its list type (e.g., Civil, Family, Crown, Tribunal).  
 * The Style Guide defines:  
   - Page layout  
   - Typography  
   - Case section headers  
   - Colour, spacing, and accessibility standards  
 * The validated and styled output is rendered as HTML for front~~end display (per VIBE~~216).  
 * If validation fails:  
   - The ingestion is stopped.  
   - The failure is logged in the Validation Report (VIBE-210).  
   - The error is surfaced to the System Admin for correction.  
 * If styling cannot be applied, the fallback rendering mechanism displays the publication in plain text (per VIBE-217).  
 * The system must maintain a version-controlled record of both the validation schema and style guide used at the time of rendering. 

 

 

# VIBE-218 JSON Validation Schema and Style Guide Integration Specification

> Owner: ***VIBE-218*** · Updated: ***25 Oct 2025***

---

## Problem Statement

To ensure hearing list publications uploaded as JSON files are correctly formatted, validated, and displayed consistently in CaTH, a ***validation schema*** and ***style guide integration process*** must be implemented.  
This ticket ensures that JSON publication data follows a defined structure (schema) and is rendered in a consistent, accessible format aligned with CaTH’s design and presentation standards.

---

## User Story

***As a*** **System**  
***I want to*** **validate and format uploaded JSON files using an approved schema and style guide**  
***So that*** **hearing list publications display consistently and reliably in the CaTH front end**

---

## Pre-conditions

1. A JSON hearing list file has been uploaded into CaTH by a Local Admin.  
2. The file’s content includes structured case data that matches CaTH’s publication schema format.  
3. The ***CaTH JSON Validation Schema*** and ***Style Guide*** are defined and approved.  
4. The ingestion and rendering services are configured to read the schema and apply the style guide dynamically.  
5. Courts, regions, and jurisdictions referenced in the file exist within the ***Court Master Reference Data***.  

---

## Acceptance Criteria

1. When a JSON file is uploaded into CaTH, it is automatically validated against the ***CaTH JSON Validation Schema***.  
2. Validation must ensure that:  
   - All ***mandatory fields*** are present and correctly formatted.  
   - All ***enumerations*** (e.g., jurisdiction types, hearing types, regions) match expected values.  
   - Date/time formats comply with ISO 8601.  
   - All IDs (e.g., Court ID, Provenance ID) exist in the ***Court Master Reference Data***.  
3. Once validated, the JSON file is mapped to a ***Style Guide template*** appropriate to its list type (e.g., Civil, Family, Crown, Tribunal).  
4. The Style Guide defines:  
   - Page layout  
   - Typography  
   - Case section headers  
   - Colour, spacing, and accessibility standards  
5. The validated and styled output is rendered as ***HTML*** for front~~end display (per VIBE~~216).  
6. If validation fails:  
   - The ingestion is stopped.  
   - The failure is logged in the ***Validation Report*** (VIBE-210).  
   - The error is surfaced to the System Admin for correction.  
7. If styling cannot be applied, the fallback rendering mechanism displays the publication in plain text (per VIBE-217).  
8. The system must maintain a ***version-controlled record*** of both the validation schema and style guide used at the time of rendering.  

---

## User Journey Flow

1. System Admin uploads a JSON publication file.  
2. The ***ingestion service*** triggers validation against the JSON schema.  
3. The system validates field names, data types, and required attributes.  
4. If valid → File passes to the ***Styling Engine***, which applies the correct HTML structure using the defined template.  
5. If invalid → File is rejected, error logged, and Admin notified through the Validation Report Viewer.  
6. The successfully validated and styled hearing list is made available for user viewing in the front end.  

---

## Wireframe (Conceptual Process Flow)

┌───────────────────────────┐
│ JSON File Upload (Admin) │
└─────────────┬─────────────┘
│
▼
┌───────────────────────────┐
│ JSON Validation Service │
│ - Schema compliance check│
│ - Field verification │
│ - Data type validation │
└─────────────┬─────────────┘
│
<Valid> │ <Invalid>
▼
┌────────────────────────────┐ ┌────────────────────────────┐
│ Apply Style Guide Template │ │ Log in Validation Report │
│ - Layout │ │ - File name │
│ - Case formatting │ │ - Court ID │
│ - Accessibility settings │ │ - Error details │
└─────────────┬──────────────┘ └─────────────┬──────────────┘
│ │
▼ ▼
Render to Front End Notify System Admin

 


---

## JSON Validation Schema Structure (Summary)

Each JSON file must conform to the official CaTH Hearing List Schema.  
Mandatory fields and data types are defined below.

| Field | Type | Required | Description |
|~~--~~~~--~~|~~--~~~~-|~~~~--~~~~--~~~~-|~~~~--~~~~--~~~~--~~-|
| court_id | string | Yes | Unique ID of the court or tribunal |
| court_name | string | Yes | Official court name |
| jurisdiction | string | Yes | Jurisdiction name (e.g., Civil, Family) |
| list_type | string | Yes | Publication list type |
| publication_date | string (ISO 8601) | Yes | Date and time the list is published |
| hearing_date | string (ISO 8601) | Yes | Date of the hearing |
| language | string | Yes | Language version (English/Welsh) |
| cases | array | Yes | Array containing hearing case data |
| case_reference | string | Yes | Unique case reference number |
| parties | array | Yes | Parties involved in the case |
| hearing_type | string | Yes | Type of hearing |
| hearing_room | string | Optional | Courtroom number or location |
| time | string | Yes | Scheduled time of hearing (HH:MM format) |

---

## Example JSON Schema Snippet

```json
{
  "$schema": "https://json~~schema.org/draft/2020~~12/schema",
  "type": "object",
  "required": <"court*id", "court*name", "jurisdiction", "cases">,
  "properties": {
    "court_id": \{ "type": "string" },
    "court_name": \{ "type": "string" },
    "jurisdiction": \{ "type": "string" },
    "cases": {
      "type": "array",
      "items": {
        "type": "object",
        "required": <"case*reference", "parties", "hearing*type", "time">,
        "properties": {
          "case_reference": \{ "type": "string" },
          "parties": \{ "type": "array", "items": { "type": "string" } },
          "hearing_type": \{ "type": "string" },
          "time": \{ "type": "string", "pattern": "^<0~~9>{2}:<0~~9>\{2}$" }
        }
      }
    }
  }
}

 

Style guide integration rules
|Element|Rule|
|Header|Uses court name and list title in H1 with GOV.UK typeface|
|Case card|Bordered box with case number and parties|
|Font|GOV.UK font, minimum 16px|
|Colour|Neutral tones, accessible contrast ratio (4.5:1)|
|Date/time|Displayed in UK date format (e.g., 25 October 2025, 10:00 AM)|
|Language toggle|Switches between English/Welsh JSON versions|
|Pagination|Automatically inserted for large lists (>50 cases)|
|Accessibility|ARIA roles and screen reader-friendly headings applied|
|Links|Blue underlined hyperlinks for downloadable files or related documents|

 
## Content

**EN:**
 * **Error message (invalid JSON):** “The publication file failed validation. Please contact your system administrator.”

 * **Error message (style failure):** “The hearing list could not be formatted for display.”

**CY:**
 * **Error message (invalid JSON):** “Methwyd dilysu’r ffeil gyhoeddi. Cysylltwch â’ch gweinyddwr system.”

 * **Error message (style failure):** “Methu fformatio’r rhestr wrando ar gyfer arddangos.”

 
## URL
 * Schema repository (internal): `/schemas/publication~~schema~~v1.json`

 * Style guide reference: `/style~~guides/hearing~~list~~style~~v1.css`

 * API endpoint for validation: `/api/v1/validate-json`

 
 *  

## Validation Rules
 * JSON must be valid per schema structure.

 * Date/time fields must conform to ISO 8601.

 * Strings must not contain special characters that break HTML rendering.

 * Case references must be unique within a single file.

 * Language field must equal `English` or {{{}Welsh{}}}.

 * All errors must be logged to the validation report (VIBE-210).

 * The validation process must complete within 3 seconds for a standard file (<2MB).

 
## Error Messages

**EN:**
 * “The publication file failed validation.”

 * “A required field is missing or incorrectly formatted.”

 * “The hearing list could not be formatted for display.”

**CY:**
 * “Methwyd dilysu’r ffeil gyhoeddi.”

 * “Mae maes gofynnol ar goll neu wedi’i fformatio’n anghywir.”

 * “Methu fformatio’r rhestr wrando ar gyfer arddangos.”

 
## Navigation
 * **Admin Dashboard → Upload Reference Data → Validation**

 * **Upload File → JSON Validation → Style Rendering → Display Front End**

 * **Error → Validation Report Viewer (VIBE-210)**

 
## Accessibility
 * Must comply with **WCAG 2.2 AA** standards.

 * Style Guide ensures accessible layout and structure.

 * JSON~~rendered output must be fully screen~~reader compatible.

 * All visual styles must maintain appropriate colour contrast.

 * Error and validation summaries must be clearly announced via assistive technologies.

 * Schema and templates must not rely on colour alone for distinction.

 

Test Scenarios
|ID|Scenario|Steps|Expected Result|
|TS1|Valid JSON upload|Upload JSON conforming to schema|File passes validation and renders|
|TS2|Missing required field|Remove “court_name” from file|Validation fails; error logged|
|TS3|Invalid field type|Enter string instead of array for “cases”|Validation fails|
|TS4|Incorrect time format|Enter “10 AM” instead of “10:00”|Validation fails|
|TS5|Schema mismatch|Add unexpected property|Error logged but file ignored|
|TS6|Style applied|Upload valid JSON for Civil List|Rendered output matches style guide|
|TS7|Large file performance|Upload 2MB JSON file|Validation and render complete within 3 seconds|
|TS8|Error logging|Upload invalid JSON|Entry visible in Validation Report Viewer|
|TS9|Welsh version display|Upload Welsh JSON file|Rendered output shows in Welsh|
|TS10|Fallback render|Style template fails|Plain text fallback displayed|

 

 
## Assumptions / Open Questions
 * Confirm if **multiple schemas** are needed for different list types (e.g., Civil, Crown, Family).

 * Confirm how **schema versioning** will be managed (e.g., {{{}v1{}}}, {{{}v2{}}}).

 * Confirm whether **JSON validation** occurs pre~~upload or post~~upload.

 * Confirm if admins should receive **email alerts** for failed validations.

 * Confirm whether the **style guide** should support embedded media (e.g., downloadable attachments).

 * Confirm whether **schema updates** will trigger revalidation of existing JSON publications.', 'functional', 'verified', 'medium', 'story', 281, 'https://github.com/hmcts/cath-service/issues/281', '2026-01-20T17:15:32Z', '2026-01-30T15:05:06Z', 'linusnorton', 'linusnorton'),
  (60, 'REQ-0060', 'Backend - Subscription Fulfilment (Email notifications)', '**PROBLEM STATEMENT**

Verified user are users can subscribe to email notifications from CaTH. This would require the triggering of email notifications to be sent to users from CaTH back end.

 

**AS A** System

**I WANT** to send out email notifications to users who are subscribed to receive publication notifications from CaTH

**SO THAT** these users can be informed whenever a new list subscribed to is published

 

**Pre-condition:**

User has subscribed to receive notifications from CaTH for specific court publications

**Technical Specifications:**
 * Email will be sent using Gov notifier. API key needs to be saved an environment variable
 * Email template Id which will be used to send email will be 6daf0fb2~~058a~~47e3~~96d2~~7e4026cfed7f which needs to be saved an environment variable
 * You need to pass ListType to this template to make sure user can see that which list has been received by the application

 

**ACCEPTANCE CRITERIA**
 * When a new hearing list is published in CaTH, it should raise a trigger at CaTH back end to send out an email notification to all users who have subscribed to receive email notifications on the specific location the publication is for
 * The system is able to retrieve the subscription information from the subscriptions table and send the appropriate notification to the right user ID once a publication is made against the venue the user is subscribed to and the User should successfully receive an email notification
 * Subscription email notification should be sent from GovNotify to the subscribed user
 * Validation should be put in place to validate the channel details. i.e. that the email address is a viable address and the API connection is established and to ensure that a trigger can accomplish the sending of the email notification to the subscribed user to confirm their account has been created 
 * Error handling should be put in place to manage scenarios where Gov.Notify did not send the email, where an Invalid ID is retrieved and the channel logged against the user ID is ‘Email’, where there is no email retrieval for a valid ID since the channel is ‘API’, however the notification is not sent and in the event were multiple triggers are sent against a single subscription, only one email notification should be sent to the user ID
 *  
 * This ticket only covers the basic email notifications requirements covered above and does not include the PDF or email summary in this MVP
 * The email notification displays the GOV.UK banner at the top followed by an opening section that displays the following text;
 * 
|Note this email contains Special Category Data as defined by Data Protection Act 2018, formally known as Sensitive Personal Data, and should be handled appropriately.
This email contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used.|

 * The second section should display the following text;''Your subscription to get updates about the below has been triggered based on a <Hearing List name> being published for the <date>
 * The link back to CaTH service <[Court and tribunal hearings - Court and Tribunal Hearings - GOV.UK>(https://www.court~~tribunal~~hearings.service.gov.uk/)] should be masked in the following highlighted text in the sentence that follows in the next section of the email notification; <Manage your subscriptions, view lists and additional case information>(https://www.court~~tribunal~~hearings.service.gov.uk/) within the Court and tribunal hearings service.

 

 
 # VIBE-221 — Email Notification Trigger for Subscribed Users (Specification)

> Owner: VIBE-221  
> Updated: 14 Nov 2025

—
 # 
 ## Problem Statement
Verified users in CaTH can subscribe to receive email notifications about newly published hearing lists.  
This functionality requires a {**}`**`trigger-based mechanism`**`{**} in the CaTH back end to automatically send email notifications to subscribed users through Gov.Notify when a hearing list relevant to their subscriptions is published.

—
 # 
 ## User Story
{**}`**`As a`**`{**} System  
{**}`**`I want to`**`{**} send out email notifications to users who are subscribed to receive publication notifications from CaTH  
{**}`**`So that`**`{**} they can be informed whenever a new list they subscribed to is published

—
 # 
 ## Pre-condition

 - User has an approved and verified CaTH account.
 - User has subscribed to receive notifications for one or more specific venues.
 - A valid {**}`**`Subscriptions table`**`{**} exists linking user IDs to court or tribunal venues.
 - A new hearing list publication event occurs for a venue with active subscribers.

—
 # 
 ## Acceptance Criteria
1. When a new hearing list is published in CaTH, a {**}`**`trigger`**`{**} is raised automatically in the CaTH back end.  
2. The trigger retrieves all active subscriptions from the {**}`**`Subscriptions table`**`{**} that match the publication’s venue (court ID).  
4. Only one email notification should be sent to each user ID per publication, even if multiple triggers are raised simultaneously.
5. All subscription channel details are validated before sending:
   - Email addresses are validated for format and existence.
6. Error handling is implemented to manage:
   - Gov.Notify delivery failures.
   - Invalid or missing user IDs.
7. If multiple triggers are raised for the same publication, deduplication ensures {**}`**`only one notification per user`**`{**}.
8. Gov.Notify is used to send email notifications, following HMCTS branding and accessibility standards.
9. This story covers only the {**}`**`basic notification functionality`**`{**} — it does {**}`**`not`**`{**} include PDF attachments or email summaries (to be implemented in later iterations).

—
 # 
 ## Technical Overview

 # 
 ## 
 ### 1. Trigger Flow

 - {**}`**`Event source:`**`{**} Hearing list publication in CaTH.
 - {**}`**`Trigger action:`**`{**} Emits a message (e.g. via message queue or direct event call) to the {**}`**`Notification Service`**`{**}.
 - {**}`**`Notification Service:`**`{**}
  - Retrieves subscription data from blob storage (or API DB).
  - Validates channel type and details.
  - Sends notifications (via Gov.Notify or API call).
  - Writes audit log entry to track status and errors.

 # 
 ## 
 ### 2. Subscriptions Data Retrieval

 - The trigger queries {**}`**`Subscriptions table`**`{**} where `location_id'' = <publication location ID>` and `status = active`.
 - The result set provides `user_id`, `channel`, and corresponding destination (email or API endpoint).

 # 
 ## 
 ### 3. Email Sending (via Gov.Notify)

 - CaTH integrates with {**}`**`Gov.Notify`**`{**} service using a defined template.
 - Dynamic template parameters:
  - `\{user_name}`
  - `\{hearing*list*name}`
  - `\{publication_date}`
  - `\{location_name}`
  - `\{manage_link}` (link to CaTH service)
 - Gov.Notify responses logged for each send (success or failure).

—
 # 
 ## Data Model — Subscriptions Table
|Field|Type|Required|Description|
|~~--~~~~--~~|~~--~~~~-|~~~~--~~~~--~~~~-|~~~~--~~~~--~~~~--~~-|
|`subscription_id`|UUID|Yes|Unique identifier for each subscription|
|`user_id`|String|Yes|ID of the verified user|
|`location_id`|String|Yes|Linked venue ID|
|`date_added`|DateTime|Yes|Subscription creation date|

—
 # 
 ## Notification Email Template (Gov.Notify)

 # 
 ## 
 ### Email structure (mandatory for MVP)
1. {**}`**`Header:`**`{**} GOV.UK banner  
2. {**}`**`Section 1 — Opening notice:`**`{**}  

 

Note this email contains Special Category Data as defined by the Data Protection Act 2018,
formerly known as Sensitive Personal Data, and should be handled appropriately.

This email contains information intended to assist the accurate reporting of court proceedings.
It is vital you ensure that you safeguard the Special Category Data included and abide by reporting
restrictions (for example on victims and children). HMCTS will stop sending the data if there is
concern about how it will be used.

 

3. {**}`**`Section 2 — Notification message:`**`{**}  

Your subscription to get updates about the below has been triggered based on a
<Hearing List name> being published for the <date>.

 

4. {**}`**`Section 3 — Service link:`**`{**}  

Manage your subscriptions, view lists and additional case information
within the Court and tribunal hearings service.

 

—
 # 
 ## Validation Rules

 - {**}`**`Email channel:`**`{**}  
 - Must pass format validation (`regex` for RFC2822).  
 - Must exist in user profile table.  
 - Gov.Notify template ID must exist in configuration.  
 - {**}`**`Deduplication:`**`{**}  
 - Trigger must not send duplicate emails for the same `user*id` + `publication*id`.

—
 # 
 ## Error Handling
|Scenario|Description|System Behaviour|
|~~--~~~~--~~~~--|~~~~--~~~~--~~~~--~~|~~--~~~~--~~~~--~~~~--~~--|
|Gov.Notify send fails|Network issue, invalid template, or rejection|Retry once → log error → mark status as “Failed to send”|
|Invalid user ID|Missing or invalid user record|Log error, skip notification|
|Invalid email|Malformed or inactive email address|Mark record “Invalid channel”|
|API endpoint unreachable|API fails health check or returns 500|Log warning; no retry|
|Duplicate triggers|Multiple publication triggers|Deduplicate by `publication*id + user*id`|
|Blob or DB write failure|Cannot update audit record|Retry write once, then log failure|
|Partial success|Some sends fail|Log per-user success/failure result|

—
 # 
 ## Notification Audit Log
{**}`**`Purpose:`**`{**} Track notifications sent and manage delivery outcomes.

|Field|Type|Description|
|~~--~~~~--~~|~~--~~~~-|~~~~--~~~~--~~~~--~~|
|`notification_id`|UUID|Unique ID for notification event|
|`subscription_id`|UUID|Link to Subscriptions table|
|`user_id`|String|User identifier|
|`publication_id`|String|Identifier of published hearing list|
|`status`|String|“Sent”, “Failed”, “Skipped”, “Duplicate filtered”|
|`error_message`|String|Error reason if applicable|
|`created_at`|DateTime|Notification created timestamp|
|`sent_at`|DateTime|When message successfully sent|

—
 #  

 # 
 ## Accessibility & Compliance

 - {**}`**`Emails:`**`{**} Must follow GOV.UK Notify branding and layout guidelines.
 - {**}`**`Data security:`**`{**} All notifications comply with GDPR and DPA 2018.  
 - {**}`**`Storage:`**`{**} Audit and subscription data stored in encrypted blob storage.  
 - {**}`**`Accessibility:`**`{**} Text-only version provided by Gov.Notify (no HTML formatting reliance).  
 - {**}`**`Logging:`**`{**} All sends and failures recorded for review by HMCTS technical admins.

—
 # 
 ## Test Scenarios
|ID|Scenario|Steps|Expected Result|
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
|TS1|Trigger notification on publication|Publish new hearing list|Email trigger raised, all subscribed users receive notification|
|TS2|Multiple triggers same publication|Publish same list twice|One email per user (deduplicated)|
|TS7|Gov.Notify fails once|Temporary issue|Retry once; success logged|
|TS8|Gov.Notify fails persistently|Second attempt fails|Logged as “Failed to send”|
|TS9|Partial success|Some users valid, others not|Success/failure logged per user|
|TS10|Audit log|Query audit endpoint|Shows all sends with timestamps and statuses|

—
 # 
 ## Risks & Clarifications

 - Confirm how deduplication is implemented (DB flag or in-memory cache).  
 - Confirm Gov.Notify template ID and configuration location.  
 - Confirm retry policy (number and interval of retries).  
 - Confirm if bilingual templates (EN/CY) are required for notifications.  
 - Confirm if the trigger runs synchronously or via queue (recommended: async queue processing).

—', 'functional', 'verified', 'medium', 'story', 283, 'https://github.com/hmcts/cath-service/issues/283', '2026-01-20T17:15:58Z', '2026-01-30T14:02:28Z', 'linusnorton', 'linusnorton'),
  (61, 'REQ-0061', 'Setting up a flux config / k8s namespace for CaTH Service', 'Set up a flux config / k8s namespace for {{{}CaTH Service{}}}? It will also need a postgres flux db like this: <https://github.com/hmcts/cnp~~flux~~config/pull/41784>', 'constraint', 'verified', 'medium', 'story', 284, 'https://github.com/hmcts/cath-service/issues/284', '2026-01-20T17:16:41Z', '2026-01-30T15:05:09Z', 'linusnorton', 'linusnorton'),
  (62, 'REQ-0062', 'Manage media account requests - Approve application', '**PROBLEM STATEMENT**

Media users are expected to create accounts in CaTH by filling and when submitting the account creation form. When this happens, the CTSC Admin user is expected to verify the applicant and approve before the account is created. Where there are any concerns, the application can be rejected.

 

**AS A** CTSC Admin

**I WANT** to review CaTH media account requests

**SO THAT** I can manage the account requests

 

**Pre-condition:** 

CaTH Account creation form has been filled and submitted by a CaTH user

CTSC Admin has been given access to media admin functionality in CaTH

**Technical Specifications:**
 * Get media application from media_application database table
 * Get the Press ID file (uploaded during create media application) from temp folder
 * Once application review process has been rejected, delete Press ID file from temp folder and update record in media_application database table as APPROVED.

 

**ACCEPTANCE CRITERIA**
 * CTSC Admin is able to log into CaTH and access CaTH Dashboard which is similar to the admin dashboard with 3 tiles (Upload, Upload Excel file and Remove tiles) but has an additional tile titled ''Manage media account requests'' and the following descriptive text in the tile, ''CTSC assess new media account applications.'' 
 * CTSC Admin sees a notification for pending account applications in a text box titled ''Important'' which is under the page header title ''Your Dashboard''. within the box is the following descriptive text ''There are ..x.. outstanding media requests. Manage media account requests.''
 * When CTSC Admin clicks the ''Manage media account requests'' tile, a new page with all the pending applications opens. Page title is ''Select application to assess'' and underneath title is a table with columns ''Name'', Employer'', Dates applied'' and a last untitled column. within each column are rows with details of each pending applications
 *  The last untitled column has ''view'' in each row with a clickable link that takes the CTSC admin to another page titled ''Applicant''s details'' which displays more details of each application
 * On this page, there is a table with several rows that have the following row titles in the first column ''Name'', ''Email'', ''Employer'', ''Date applied'' and ''Proof of ID'' and in the next column on each row are the details of the applicant. The proof of ID row indicates in bracket beside the attached ID that the attachment ''opens in a new window''. in the 3rd column on the proof of ID row is a link to ''View'' the attached ID
 * underneath the table are 2 buttons; green ''Approve application'' button on the left and red ''Reject application'' on the right which takes the CTSC admin to different pages to approve or reject application respectively
 * when ''Approve application'' button is clicked, CTSC admin is taken to another page titled ''Are you sure you want to approve this application?''. underneath header is a sub-header titled ''Applicant''s details'' and beneath is the same table as previous page. underneath the table are 2 radio buttons with ''Yes'' beside the left button and ''No'' beside the right button. this is followed by a green ''Continue'' button which takes the CTSC admin to a confirmation page
 * On the confirmation page, a green banner is displayed with the header titled ''Application has been approved'' in it. Underneath is a table with the following row titles in the first column ''Name'', ''Email'', ''Employer'' and ''Date applied'' wile the 2nd column displays the applicant''s details
 * underneath the table is a section titled ''What happens next'' and the following message underneath the title ''This account has been created and the applicant will be notified to confirm their details. If an account already exists the applicant will be asked to sign in, or choose forgot password. 
 * all CaTH page specifications are maintained

 

 

 
 # VIBE-228 Manage Media Account Requests (CTSC Admin) Specification

> Owner: {**}`**`VIBE-228`**`{**} · Updated: {**}`**`06 Nov 2025`**`{**}

—
 # 
 ## Problem Statement

Media users are expected to create accounts in CaTH by completing and submitting the {**}`**`account creation form`**`{**}.  
When a new application is submitted, a {**}`**`CTSC Admin user`**`{**} is responsible for reviewing the request, verifying the applicant’s details, and {**}`**`approving or rejecting`**`{**} the application as appropriate.

—
 # 
 ## User Story

{**}`**`As a`**`{**} **CTSC Admin**  
{**}`**`I want to`**`{**} **review CaTH media account requests**  
{**}`**`So that`**`{**} **I can manage the account requests efficiently and approve or reject new applications**

—
 # 
 ## Pre-conditions

1. A CaTH media account creation form has been submitted by a media applicant.  
2. CTSC Admin has verified access to {**}`**`Media Admin functionality`**`{**} in CaTH.  
3. Pending account requests are stored and retrievable via the CaTH Admin API.

—
 # 
 ## Acceptance Criteria

1. {**}`**`CTSC Admin Dashboard Access`**`{**}
   - CTSC Admin logs into CaTH and accesses their {**}`**`Dashboard`**`{**}.
   - Dashboard layout mirrors the Admin Dashboard (with existing tiles: {**}`**`Upload{**}`**`, **{*}Upload Excel file{**}{**}, ***Remove{*}*).
   - An additional tile is visible:  
     - {**}`**`Title:`**`{**} “Manage media account requests”  
     - {**}`**`Description:`**`{**} “CTSC assess new media account applications.”

2. {**}`**`Pending Requests Notification`**`{**}
   - Below the header {**}`**`‘Your Dashboard’{**}`**`, an **{*}Important{**}* notification box is displayed.  
   - Text inside the box:  
     > “There are {**}`**`x`**`{**} outstanding media requests. Manage media account requests.”

3. {**}`**`Manage Media Account Requests Page`**`{**}
   - Clicking the “Manage media account requests” tile takes the admin to a new page titled {**}`**`“Select application to assess.”`**`{**}
   - A table displays all {**}`**`pending applications`**`{**} with the following columns:  
     - {**}`**`Name`**`{**}  
     - {**}`**`Employer`**`{**}  
     - {**}`**`Date applied`**`{**}  
     - **(Untitled column)** containing a {**}`**`‘View’`**`{**} link for each row.
   - Clicking {**}`**`‘View’`**`{**} opens the {**}`**`Applicant’s details`**`{**} page.

4. {**}`**`Applicant’s Details Page`**`{**}
   - Title: {**}`**`“Applicant’s details”`**`{**}  
   - Displays a table with the following rows:  
     | Field | Example | Notes |
     |~~--~~~~-{~~}`~~`|`~~`{~~}-~~~~--~~{~~}`~~`|`~~`{~~}~~--~~-|
     | Name | Jane Doe | |
     | Email | jane.doe@example.com | |
     | Employer | BBC News | |
     | Date applied | 02 Nov 2025 | |
     | Proof of ID | presscard_janedoe.pdf (opens in a new window) | “View” link opens the file in new tab |
   - Under the table:  
     - {**}`**`Green button:`**`{**} “Approve application”  
     - {**}`**`Red button:`**`{**} “Reject application”

5. {**}`**`Approve Application Flow`**`{**}
   - Clicking “Approve application” takes admin to page titled:  
     {**}`**`“Are you sure you want to approve this application?”`**`{**}
   - Beneath the title: subheading {**}`**`“Applicant’s details”`**`{**}, followed by same details table.
   - Two radio buttons displayed:  
     - “Yes”  
     - “No”  
   - {**}`**`Green ‘Continue’`**`{**} button beneath the options.

6. {**}`**`Approval Confirmation`**`{**}
   - If {**}`**`Yes`**`{**} selected → Clicking {**}`**`Continue`**`{**} navigates to confirmation page.  
   - Title: {**}`**`“Application has been approved”`**`{**} (displayed inside a green success banner).  
   - Table displayed below banner with the applicant’s key details:  
     - Name  
     - Email  
     - Employer  
     - Date applied  
   - Below the table:  
     - Section titled {**}`**`“What happens next”`**`{**} with message:  
       > “This account has been created and the applicant will be notified using Gov notifier (already exists) to confirm their details.  
       > If an account already exists, the applicant will be asked to sign in, or choose forgot password.”  

7. {**}`**`Reject Application Flow`**`{**}
   - Clicking {**}`**`Reject application`**`{**} (future iteration placeholder) will take CTSC Admin to a rejection workflow (not covered in this user story).

8. {**}`**`Navigation`**`{**}
   - Every page includes a {**}`**`Back`**`{**} link at the top left corner.  
   - All CaTH accessibility and page specifications are maintained.

—
 # 
 ## User Journey Flow

1. CTSC Admin signs into CaTH.  
2. Admin sees Dashboard with “Manage media account requests” tile and pending request notification.  
3. Admin clicks the tile → “Select application to assess” page opens.  
4. Admin clicks “View” → navigates to “Applicant’s details” page.  
5. Admin reviews applicant details and either:  
   - Clicks {**}`**`Approve application`**`{**} → proceeds through confirmation pages.  
   - Clicks {**}`**`Reject application`**`{**} → placeholder for rejection flow.  
6. Upon approval, system displays confirmation banner and account creation message.

—
 # Page Specifications

—
 # 
 ## Page 1 — CTSC Admin Dashboard

 # 
 ## 
 ### Wireframe

 

┌────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK <Language> │
├────────────────────────────────────────────────────────────────────────────┤
│ HMCTS – Courts and Tribunals Hearings (CaTH) │
├────────────────────────────────────────────────────────────────────────────┤
│ Your Dashboard │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ Important: There are 3 outstanding media requests. │ │
│ │ Manage media account requests. │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ <Upload> <Upload Excel file> <Remove> <Manage media account requests>│ │
│ └──────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘

 
 # 
 ## 
 ### Content
{**}`**`EN:`**`{**}  

 - Header: “Your Dashboard”  
 - Tile: “Manage media account requests”  
 - Description: “CTSC assess new media account applications.”  
 - Important box: “There are x outstanding media requests. Manage media account requests.”

{**}`**`CY:`**`{**}  
 - Header: “Eich Dangosfwrdd”  
 - Tile: “Rheoli ceisiadau cyfrif cyfryngau”  
 - Description: “Mae CTSC yn asesu ceisiadau newydd ar gyfer cyfrifon cyfryngau.”  
 - Important box: “Mae x cais cyfryngau heb eu hasesu. Rheoli ceisiadau cyfrif cyfryngau.”

—
 # 
 ## Page 2 — Select Application to Assess

 # 
 ## 
 ### Wireframe

┌────────────────────────────────────────────────────────────────────────────┐
│ < Back │
│ Select application to assess │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ Name | Employer | Date applied | ( ) View │ │
│ │ John Smith | Reuters | 02 Nov 2025 | <View> │ │
│ │ Jane Doe | BBC News | 03 Nov 2025 | <View> │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘

 
 # 
 ## 
 ### Content
{**}`**`EN:`**`{**}  

 - Title: “Select application to assess”  
 - Table headers: “Name”, “Employer”, “Date applied”, “View”  

{**}`**`CY:`**`{**}  
 - Title: “Dewiswch gais i’w asesu”  
 - Table headers: “Enw”, “Cyflogwr”, “Dyddiad gwneud cais”, “Gweld”

—
 # 
 ## Page 3 — Applicant’s Details

 # 
 ## 
 ### Wireframe

┌────────────────────────────────────────────────────────────────────────────┐
│ < Back │
│ Applicant’s details │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ Name | Jane Doe │ │
│ │ Email | jane.doe@example.com │ │
│ │ Employer | BBC News │ │
│ │ Date applied | 02 Nov 2025 │ │
│ │ Proof of ID | presscard_janedoe.pdf (opens in a new window) <View> │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ <Approve application> (Green) <Reject application> (Red) │
└────────────────────────────────────────────────────────────────────────────┘

 
 # 
 ## 
 ### Content
{**}`**`EN:`**`{**}  

 - Title: “Applicant’s details”  
 - Button 1: “Approve application”  
 - Button 2: “Reject application”  
 - Proof of ID text: “(opens in a new window)”  

{**}`**`CY:`**`{**}  
 - Title: “Manylion yr ymgeisydd”  
 - Button 1: “Cymeradwyo cais”  
 - Button 2: “Gwrthod cais”  
 - Proof of ID text: “(yn agor mewn ffenestr newydd)”

—
 # 
 ## Page 4 — Approve Application Confirmation

 # 
 ## 
 ### Wireframe

┌────────────────────────────────────────────────────────────────────────────┐
│ < Back │
│ Are you sure you want to approve this application? │
│ Applicant’s details │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ Name | Jane Doe │ │
│ │ Email | jane.doe@example.com │ │
│ │ Employer | BBC News │ │
│ │ Date applied | 02 Nov 2025 │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ ○ Yes ○ No │
│ <Continue> (Green Button) │
└────────────────────────────────────────────────────────────────────────────┘

 
 # 
 ## 
 ### Content
{**}`**`EN:`**`{**}  

 - Title: “Are you sure you want to approve this application?”  
 - Subheader: “Applicant’s details”  
 - Options: “Yes” / “No”  
 - Button: “Continue”  

{**}`**`CY:`**`{**}  
 - Title: “A ydych yn siŵr eich bod am gymeradwyo’r cais hwn?”  
 - Subheader: “Manylion yr ymgeisydd”  
 - Options: “Ie” / “Na”  
 - Button: “Parhau”

—
 # 
 ## Page 5 — Application Approved (Confirmation Page)

 # 
 ## 
 ### Wireframe

┌────────────────────────────────────────────────────────────────────────────┐
│ ✅ Application has been approved │
│ │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ Name | Jane Doe │ │
│ │ Email | jane.doe@example.com │ │
│ │ Employer | BBC News │ │
│ │ Date applied | 02 Nov 2025 │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ │
│ What happens next │
│ This account has been created and the applicant will be notified to │
│ confirm their details. │
│ If an account already exists the applicant will be asked to sign in, │
│ or choose forgot password. │
└────────────────────────────────────────────────────────────────────────────┘

 
 # 
 ## 
 ### Content
{**}`**`EN:`**`{**}  

 - Banner: “Application has been approved”  
 - Message: “This account has been created and the applicant will be notified to confirm their details.  
  If an account already exists, the applicant will be asked to sign in, or choose forgot password.”  

{**}`**`CY:`**`{**}  
 - Banner: “Mae’r cais wedi’i gymeradwyo”  
 - Message: “Mae’r cyfrif wedi’i greu ac fe fydd yr ymgeisydd yn cael gwybod i gadarnhau ei fanylion.  
  Os oes cyfrif eisoes yn bodoli, fe ofynnir i’r ymgeisydd fewngofnodi, neu ddewis ‘wedi anghofio cyfrinair’.”

—
 # 
 ## URL Structure

|Page|URL|
|~~--~~~~-|~~---|
|Dashboard|`/admin/dashboard`|
|Manage media account requests|`/admin/media-requests`|
|Applicant details|`/admin/media-requests/\{id}`|
|Approve confirmation|`/admin/media-requests/\{id}/approve`|
|Approved confirmation|`/admin/media-requests/\{id}/approved`|

—
 # 
 ## Validation Rules

 - CTSC Admin must have a valid authenticated session.  
 - Only pending applications are visible in the “Select application to assess” table.  
 - Clicking {**}`**`Approve`**`{**} updates the application status to {**}`**`Approved`**`{**} in blob storage.  
 - Clicking {**}`**`Reject`**`{**} (future feature) will update the application status to {**}`**`Rejected`**`{**}.  
 - “Yes” or “No” radio button selection is mandatory before proceeding from confirmation screen.  
 - All proof of ID file links must open in a new tab/window.  

—
 # 
 ## Error Messages

{**}`**`EN:`**`{**}  
 - “Select yes or no before continuing.”  
 - “Unable to load applicant details. Please try again later.”  

{**}`**`CY:`**`{**}  
 - “Dewiswch ie neu na cyn parhau.”  
 - “Methu llwytho manylion yr ymgeisydd. Ceisiwch eto’n hwyrach.”

—
 # 
 ## Navigation

 - {**}`**`Back`**`{**} link present on every page.  
 - {**}`**`Dashboard tiles:`**`{**} Upload | Upload Excel file | Remove | Manage media account requests.  
 - {**}`**`Continue`**`{**} buttons proceed to next step (confirmations).  
 - On completion, Admin can navigate back to Dashboard via breadcrumb or navigation link.

—
 # 
 ## Accessibility

 - Must comply with {**}`**`WCAG 2.2 AA`**`{**} and {**}`**`GOV.UK Design System`**`{**} standards.  
 - Tables must include `<th scope="col">` headers for all columns.  
 - Proof of ID link must include `aria-label="Opens in new window"`.  
 - Success banners use `role="status"`.  
 - Radio buttons must have clear labels and logical tab order.  
 - All links and buttons must be keyboard accessible with visible focus outlines.  

—
 # 
 ## Test Scenarios

|ID|Scenario|Steps|Expected Result|
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
|TS1|Dashboard view|Log in as CTSC Admin|Dashboard displays “Manage media account requests” tile|
|TS2|Pending requests notice|Dashboard loaded|“There are X outstanding media requests” banner displayed|
|TS3|Manage media requests navigation|Click tile|Redirects to “Select application to assess”|
|TS4|Applicant detail view|Click “View” on table row|Applicant’s details page opens|
|TS5|Approve flow|Click “Approve application”|Loads confirmation prompt|
|TS6|Confirm approval|Select “Yes” and click Continue|Displays “Application has been approved” banner|
|TS7|Cancel approval|Select “No” and click Continue|Returns to Applicant’s details page|
|TS8|Proof of ID|Click “View” link|Opens ID document in new window|
|TS9|Mandatory selection validation|Click Continue with no radio selected|Error “Select yes or no” displayed|
|TS10|Accessibility test|Use keyboard navigation|All controls operable and focus visible|
|TS11|Welsh translation|Switch to Welsh|All text updates correctly|
|TS12|Data update verification|Approve application|Application record updated to “Approved” in storage|

—
 # 
 ## Assumptions / Open Questions

 - Confirm if email notification to applicant is triggered immediately after approval.  
 - Confirm whether CTSC Admin can filter or search pending requests by name or employer.  
 - Confirm if rejected applications are archived or deleted.  
 - Confirm if an audit log entry must be created when an Admin approves or rejects.  
 - Confirm if rejected applicants receive an automated notification.  

—', 'functional', 'verified', 'medium', 'story', 285, 'https://github.com/hmcts/cath-service/issues/285', '2026-01-20T17:16:52Z', '2026-01-30T14:02:26Z', 'linusnorton', 'linusnorton'),
  (63, 'REQ-0063', 'Manage media account requests - Reject application', '**PROBLEM STATEMENT**

Media users are expected to create accounts in CaTH by filling and when submitting the account creation form. When this happens, the CTSC Admin user is expected to verify the applicant and approve before the account is created. Where there are any concerns, the application can be rejected.

 

**AS A** CTSC Admin

**I WANT** to review CaTH media account requests

**SO THAT** I can manage the account requests

 

**Pre-condition:** 

CaTH Account creation form has been filled and submitted by a CaTH user

CTSC Admin has been given access to media admin functionality in CaTH

 

**ACCEPTANCE CRITERIA**
 * CTSC Admin is able to log into CaTH and access CaTH Dashboard which is similar to the admin dashboard with 3 tiles (Upload, Upload Excel file and Remove tiles) but has an additional tile titled ''Manage media account requests'' and the following descriptive text in the tile, ''CTSC assess new media account applications.'' 
 * CTSC Admin sees a notification for pending account applications in a text box titled ''Important'' which is under the page header title ''Your Dashboard''. within the box is the following descriptive text ''There are ..x.. outstanding media requests. Manage media account requests.''
 * When CTSC Admin clicks the ''Manage media account requests'' tile, a new page with all the pending applications opens. Page title is ''Select application to assess'' and underneath title is a table with columns ''Name'', Employer'', Dates applied'' and a last untitled column. within each column are rows with details of each pending applications
 *  The last untitled column has ''view'' in each row with a clickable link that takes the CTSC admin to another page titled ''Applicant''s details'' which displays more details of each application
 * On this page, there is a table with several rows that have the following row titles in the first column ''Name'', ''Email'', ''Employer'', ''Date applied'' and ''Proof of ID'' and in the next column on each row are the details of the applicant. The proof of ID row indicates in bracket beside the attached ID that the attachment ''opens in a new window''. in the 3rd column on the proof of ID row is a link to ''View'' the attached ID
 * underneath the table are 2 buttons; green ''Approve application'' button on the left and red ''Reject application'' on the right which takes the CTSC admin to different pages to approve or reject application respectively
 * when  ''Reject application''  button is clicked, CTSC admin is taken to another page titled ''Why are you rejecting this application?''. ''Select all that apply.'' is displayed under the title. this is followed by 3 check boxes and the following text beside if check box; ''The applicant is not an accredited member of the media'', ''ID provided has expired or is not a Press ID.'' and ''Details provided do not match.'' This is followed by a green ''Continue'' button
 * CTSC admin is taken to another page titled ''Are you sure you want to reject this application?'' when the green continue button is clicked and under the page title is a sub-title ''Applicant''s details'' followed by a table
 * In the table, the first column displays the row titles ''''Name'', ''Email'', ''Employer'', ''Date applied'', ''Rejection Reasons'' and ''Proof of ID'' 
 * underneath table is a closed accordion that states ''Preview email to applicant'' and this is followed by 2 radio buttons ''Yes'' and ''No'' and the green ''continue'' button
 * when continue button is clicked, CTSC admin is taken to final confirmation page titled ''Account has been rejected'' in a green banner and the table with user details ''Name'', ''Email'', ''Employer'', ''Date applied'' and ''Rejection Reasons''
 * underneath the table is a section titled ''What happens next'' and the following message underneath the title ''The applicant <applicant''s email> will now be emailed to notify them why their application cannot be progressed and invited to reapply once the issue(s) are rectified.'' 
 * rejection notification email will follow the attached template
 * all CaTH page specifications are maintained

**Technical Specifications:**
 * Get media application from media_application database table
 * Get the Press ID file (uploaded during create media application) from temp folder
 * Once application review process has been rejected, delete Press ID file from temp folder and update record in media_application database table as REJECTED.

 
 # VIBE-229 Reject Media Account Requests (CTSC Admin) Specification

> Owner: **{*}VIBE-229{**}* · Updated: **{*}13 Nov 2025{**}*

—
 # 
 ## Problem Statement

Media users create accounts in CaTH by completing and submitting the account creation form.  
When submitted, a CTSC Admin user reviews the application, verifies the applicant’s details, and either **{*}approves{**}* or **{*}rejects{**}* the request based on provided evidence.  
Where an application raises concerns, CTSC Admin must be able to **{*}reject the application{**}*, record reasons, and send a notification email to the applicant.

—
 # 
 ## User Story

**{*}As a{**}* **CTSC Admin**  
**{*}I want to{**}* **review and reject CaTH media account requests**  
**{*}So that{**}* **I can manage requests that do not meet verification requirements**

—
 # 
 ## Pre-conditions

 - The CaTH account creation form has been filled and submitted by a CaTH user.  
 - CTSC Admin has authenticated access to **{*}Media Admin functionality{**}* within CaTH.  
 - Pending media account applications are available for review.

—
 # 
 ## Acceptance Criteria

1. **{*}Dashboard Access{**}*  
   - CTSC Admin logs into CaTH and accesses their **{*}Dashboard{**}*.  
   - Dashboard mirrors the existing Admin dashboard with three standard tiles:  
     - Upload  
     - Upload Excel file  
     - Remove  
   - A fourth tile is added:  
     - **{*}Title:{**}* “Manage media account requests”  
     - **{*}Description:{**}* “CTSC assess new media account applications.”  

2. **{*}Important Notification Box{**}*  
   - Below the header “Your Dashboard” is a text box titled **{*}Important{**}*.  
   - Inside the box:  
     > “There are ..x.. outstanding media requests. Manage media account requests.”  

3. **{*}Manage Media Account Requests Page{**}*  
   - Clicking the tile opens a new page titled **{*}“Select application to assess.”{**}*  
   - A table lists all pending applications with columns:  
     - **{*}Name{**}*  
     - **{*}Employer{**}*  
     - **{*}Date applied{**}*  
     - **{*}View{**}* (clickable link).  
   - Clicking **{*}View{**}* opens **{*}Applicant’s details{**}* page.

4. **{*}Applicant’s Details Page{**}*  
   - Page title: **{*}“Applicant’s details.”{**}*  
   - Table displays the following rows:  
     | Field | Example | Notes |
     |~~--~~~~--{~~}|{~~}-~~~~--~~~~-{~~}|{~~}-~~~~--~~|
     | Name | Jane Doe | — |
     | Email | jane.doe@example.com | — |
     | Employer | BBC News | — |
     | Date applied | 10 Nov 2025 | — |
     | Proof of ID | presscard_janedoe.pdf (opens in a new window) | Link <View> in 3rd column |
   - Below table:  
     - **{*}Green button:{**}* “Approve application”  
     - **{*}Red button:{**}* “Reject application”

5. **{*}Reject Application Flow — Step 1 (Reasons Page){**}*  
   - Clicking **{*}Reject application{**}* takes the CTSC Admin to a new page titled:  
     **{*}“Why are you rejecting this application?”{**}*  
   - Subheader: “Select all that apply.”  
   - Admin sees **{*}three checkboxes{**}*:  
     - “The applicant is not an accredited member of the media.”  
     - “ID provided has expired or is not a Press ID.”  
     - “Details provided do not match.”  
   - Below checkboxes: **{*}Green “Continue”{**}* button.  

6. **{*}Reject Application Flow — Step 2 (Confirmation Page){**}*  
   - On clicking **{*}Continue{**}*, the Admin navigates to:  
     **{*}“Are you sure you want to reject this application?”{**}*  
   - Subheader: **{*}“Applicant’s details.”{**}*  
   - Table displays:  
     | Field | Example |
     |~~--~~~~--{~~}|{~~}-~~~~--~~---|
     | Name | Jane Doe |
     | Email | jane.doe@example.com |
     | Employer | BBC News |
     | Date applied | 10 Nov 2025 |
     | Rejection Reasons | ID provided has expired |
     | Proof of ID | presscard_janedoe.pdf (opens in new window) <View> |
   - Below table:  
     - Closed accordion titled **{*}“Preview email to applicant.”{**}*  
     - Two radio buttons:  
       - **{*}Yes{**}*  
       - **{*}No{**}*  
     - **{*}Green “Continue”{**}* button.

7. **{*}Reject Application Flow — Step 3 (Final Confirmation Page){**}*  
   - Title: **{*}“Account has been rejected.”{**}* (displayed in a green banner).  
   - Table underneath banner shows:  
     | Field | Example |
     |~~--~~~~--{~~}|{~~}-~~~~--~~---|
     | Name | Jane Doe |
     | Email | jane.doe@example.com |
     | Employer | BBC News |
     | Date applied | 10 Nov 2025 |
     | Rejection Reasons | ID provided has expired |
   - Below the table, a section titled **{*}“What happens next”{**}* displays:  
     > “The applicant (jane.doe@example.com) will now be emailed to notify them why their application cannot be progressed and invited to reapply once the issue(s) are rectified.”  
   - A **{*}rejection notification email{**}* is sent via Gov.Notify using the approved template.  

8. **{*}Navigation and Accessibility{**}*
   - Every page has a **{*}Back{**}* link in the top-left corner.  
   - All page layouts, navigation, and accessibility features conform to GOV.UK and CaTH design standards.  
   - All actions are logged for audit.

—
 # 
 ## User Journey Flow

1. CTSC Admin logs into CaTH → sees **{*}Dashboard{**}*.  
2. Clicks **{*}Manage media account requests{**}* → opens “Select application to assess.”  
3. Selects **{*}View{**}* on a pending application → views applicant’s details.  
4. Clicks **{*}Reject application{**}* → proceeds to “Why are you rejecting this application?” page.  
5. Selects applicable rejection reasons → clicks **{*}Continue{**}*.  
6. Reviews applicant details and reasons → selects “Yes” → clicks **{*}Continue{**}*.  
7. “Account has been rejected” banner appears → confirmation email is sent to applicant.

—
 # Page Specifications

—
 # 
 ## Page 1 — Dashboard (CTSC Admin)

 # 
 ## 
 ### Wireframe

┌──────────────────────────────────────────────────────────────────────────────┐
│ Your Dashboard │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Important: There are 3 outstanding media requests. │ │
│ │ Manage media account requests. │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│ <Upload> <Upload Excel file> <Remove> <Manage media account requests> │
└──────────────────────────────────────────────────────────────────────────────┘

 
 # 
 ## 
 ### Content
**{*}EN:{**}*  

 - Tile — “Manage media account requests.”  
 - Description — “CTSC assess new media account applications.”  
 - Important box — “There are ..x.. outstanding media requests. Manage media account requests.”  

**{*}CY:{**}*  
 - Tile — “Rheoli ceisiadau cyfrif cyfryngau.”  
 - Description — “Mae CTSC yn asesu ceisiadau newydd ar gyfer cyfrifon cyfryngau.”  
 - Box — “Mae ..x.. cais cyfryngau heb eu hasesu. Rheoli ceisiadau cyfrif cyfryngau.”  

—
 # 
 ## Page 2 — Applicant’s Details

 # 
 ## 
 ### Wireframe

┌──────────────────────────────────────────────────────────────────────────────┐
│ < Back │
│ Applicant’s details │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Name | Jane Doe │ │
│ │ Email | jane.doe@example.com │ │
│ │ Employer | BBC News │ │
│ │ Date applied | 10 Nov 2025 │ │
│ │ Proof of ID | presscard_janedoe.pdf (opens in new window) <View> │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│ <Approve application> (Green) <Reject application> (Red) │
└──────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## Page 3 — Why Are You Rejecting This Application?

 # 
 ## 
 ### Wireframe

┌──────────────────────────────────────────────────────────────────────────────┐
│ < Back │
│ Why are you rejecting this application? │
│ Select all that apply. │
│ < > The applicant is not an accredited member of the media. │
│ < > ID provided has expired or is not a Press ID. │
│ < > Details provided do not match. │
│ <Continue> (Green Button) │
└──────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## Page 4 — Are You Sure You Want to Reject This Application?

 # 
 ## 
 ### Wireframe

┌──────────────────────────────────────────────────────────────────────────────┐
│ < Back │
│ Are you sure you want to reject this application? │
│ Applicant’s details │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Name | Jane Doe │ │
│ │ Email | jane.doe@example.com │ │
│ │ Employer | BBC News │ │
│ │ Date applied | 10 Nov 2025 │ │
│ │ Rejection Reasons | ID provided has expired │ │
│ │ Proof of ID | presscard_janedoe.pdf (opens in a new window) <View> │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│ ▶ Preview email to applicant (accordion – closed by default) │
│ ○ Yes ○ No │
│ <Continue> (Green Button) │
└──────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## Page 5 — Account Has Been Rejected (Final Confirmation)

 # 
 ## 
 ### Wireframe

┌──────────────────────────────────────────────────────────────────────────────┐
│ ✅ Account has been rejected │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Name | Jane Doe │ │
│ │ Email | jane.doe@example.com │ │
│ │ Employer | BBC News │ │
│ │ Date applied | 10 Nov 2025 │ │
│ │ Rejection Reasons | ID provided has expired │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│ │
│ What happens next │
│ The applicant (jane.doe@example.com) will now be emailed to notify them why │
│ their application cannot be progressed and invited to reapply once the │
│ issue(s) are rectified. │
└──────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## URL Structure

|Page|URL|
|~~--~~~~-|~~---|
|Dashboard|`/admin/dashboard`|
|Manage media requests|`/admin/media-requests`|
|Applicant details|`/admin/media-requests/\{id}`|
|Reject application|`/admin/media-requests/\{id}/reject`|
|Confirm rejection|`/admin/media-requests/\{id}/reject/confirm`|
|Rejection complete|`/admin/media-requests/\{id}/reject/complete`|

—
 # 
 ## Validation Rules

 - At least one **{*}checkbox{**}* must be selected before clicking **{*}Continue{**}*.  
 - One **{*}radio button (Yes/No){**}* must be selected before final confirmation.  
 - CTSC Admin must have a valid, authenticated session.  
 - Proof of ID links open in new window (`target="_blank"`).  
 - Once rejection is confirmed:
  - Applicant record status updated to **{*}REJECTED{**}* in database.  
  - Date/time of rejection stored in status history.  
  - Notification email sent automatically to applicant.  
  - Rejection reason(s) recorded for audit trail.

—
 # 
 ## Error Messages

**{*}EN:{**}*  
 - “Select at least one reason for rejection.”  
 - “Select yes or no before continuing.”  
 - “Unable to load applicant details. Please try again later.”  

**{*}CY:{**}*  
 - “Dewiswch o leiaf un rheswm dros wrthod.”  
 - “Dewiswch ie neu na cyn parhau.”  
 - “Methu llwytho manylion yr ymgeisydd. Ceisiwch eto’n hwyrach.”  

—
 # 
 ## Navigation

 - **{*}Back{**}* link present on all pages.  
 - **{*}Continue{**}* moves to the next page.  
 - **{*}Accordion (‘Preview email to applicant’){**}* toggles open/close for email preview.  
 - **{*}Green banner{**}* on success pages must include ARIA role="status".

—
 # 
 ## Accessibility

 - Must comply with **{*}WCAG 2.2 AA{**}* and **{*}GOV.UK Design System{**}*.  
 - Use `<fieldset>` and `<legend>` for checkbox groups and radio buttons.  
 - Screen readers must announce form labels, error summaries, and banner alerts.  
 - Focus management: on each error, focus moves to first invalid field.  
 - All proof of ID links to include `aria-label="Opens in new window"`.  
 - Keyboard and screen reader navigation must be fully supported.

—
 # 
 ## Test Scenarios

|ID|Scenario|Steps|Expected Result|
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
|TS1|Dashboard view|Log in as CTSC Admin|Tile “Manage media account requests” visible|
|TS2|Pending requests count|Dashboard loads|Important box shows outstanding requests|
|TS3|Navigate to applicant details|Click “View”|Applicant’s details displayed|
|TS4|Start rejection flow|Click “Reject application”|“Why are you rejecting this application?” page displayed|
|TS5|Validation — no reasons|Click Continue with no selection|Error message shown|
|TS6|Confirm rejection|Select reason → Continue|“Are you sure you want to reject…” page displayed|
|TS7|Validation — no radio option|Click Continue with none selected|Error message shown|
|TS8|Final confirmation|Select Yes → Continue|“Account has been rejected” banner displayed|
|TS9|Audit logging|Reject successfully|Application marked REJECTED, timestamp recorded|
|TS10|Notification email|Reject successfully|Applicant receives Gov.Notify email|
|TS11|Accessibility test|Navigate via keyboard|All inputs focusable and labelled|
|TS12|Welsh language toggle|Switch to Welsh|Page text updated per translation|

—
 # 
 ## Rejection Notification Email Template

**{*}Subject:{**}* Court and Tribunal Hearings (CaTH) – Your media account request  
**{*}Body:{**}*  
> Dear <Applicant Name>,  
>  
> Your request for a CaTH media account has been reviewed. Unfortunately, we cannot progress your application at this time for the following reason(s):  
>  
> <Rejection Reasons>  
>  
> You may reapply when the issues are rectified.  
>  
> Kind regards,  
> Courts and Tribunals Service Centre (CTSC)

—
 # 
 ## Assumptions / Open Questions

 - Confirm if rejection reasons should be appended in the Gov.Notify email template.  
 - Confirm if rejected applications should appear in a separate “Rejected” tab for audit.  
 - Confirm if multiple Admins can assess the same pending application.  
 - Confirm if a rejected applicant can reapply immediately.  
 - Confirm retention period for rejected applications.

—', 'functional', 'verified', 'medium', 'story', 286, 'https://github.com/hmcts/cath-service/issues/286', '2026-01-20T17:17:09Z', '2026-01-30T14:03:11Z', 'linusnorton', 'linusnorton'),
  (64, 'REQ-0064', 'CaTH General Information - Accessibility statement', '**PROBLEM STATEMENT**

Every page in CaTH has a section displays links to various general information at the bottom of the page. This ticket captures the accessibility statement requirements.

 

**AS A** System

{**}I WAN{**}T to display a link to the accessibility statement in CaTH

**SO THAT** CaTH Users are able to access the accessibility statement

 

**ACCEPTANCE CRITERIA**
 * A link to the accessibility statement page (<Accessibility statement - Court and Tribunal Hearings - GOV.UK>(https://www.court~~tribunal~~hearings.service.gov.uk/accessibility-statement)) is masked in the text ''Accessibility statement'' at the bottom of every page in CaTH
 * When a user clicks on the link, the user is taken to the accessibility statement page which opens in a different window
 * The accessibility statement page displays the information in the attached document and provides the option for users to switch to the Welsh translation
 * At the bottom of the page, user can see an arow pointing upwards with the text ''Back to Top'' which takes the user back to the top of the page when clicked

 

**Welsh translation:**

Accessibility statement - Datganiad hygyrchedd

Back to Top - Yn ôl i frig y dudalen

 
 # VIBE-236 — Accessibility Statement (Link and Page Specification)

> Owner: VIBE-236  
> Updated: 14 Nov 2025

—
 # 
 ## Problem Statement
Every page in CaTH includes a footer section that displays links to general information.  
This ticket defines the requirements for implementing a **{*}link to the Accessibility Statement{**}* to comply with GOV.UK and HMCTS accessibility regulations and ensure users can easily find accessibility-related information.

—
 # 
 ## User Story
**{*}As a{**}* System  
**{*}I want to{**}* display a link to the Accessibility Statement on every page in CaTH  
**{*}So that{**}* users can access the Accessibility Statement at any time

—
 # 
 ## Acceptance Criteria
1. **{*}Footer Link Placement{**}*
   - A link labelled **{*}“Accessibility statement”{**}* is displayed at the bottom (footer) of every CaTH page.
   - The text must be **{*}masked in the phrase “Accessibility statement”{**}*.
   - The link must open the Accessibility Statement in a **{*}new browser window{**}* or tab.

2. **{*}Accessibility Statement Page{**}*
   - Clicking the link opens the **{*}Accessibility Statement{**}* page.
   - The page content is as defined in the provided Accessibility Statement document:contentReference<oaicite:0>{index=0}.
   - The page must provide a **{*}language toggle{**}* (English/Welsh).
   - The Welsh version displays the translated Accessibility Statement text (see attached Welsh translation:contentReference<oaicite:1>{index=1}).

3. **{*}Back to Top{**}*
   - At the bottom of the Accessibility Statement page, display:
     - An upward arrow icon.
     - The text **{*}“Back to Top”{**}*.
     - Clicking either returns the user to the top of the page.

4. **{*}Design and Accessibility{**}*
   - The link and page follow GOV.UK and CaTH design system standards.
   - Page text must be fully readable with assistive technologies.
   - The link must have descriptive `aria-label` attributes, e.g.,  
     `aria-label="Accessibility statement (opens in a new window)"`.
   - All content and structure meet **{*}WCAG 2.2 AA{**}* compliance.

5. **{*}Welsh Translation{**}*
   - **{*}EN:{**}* Accessibility statement → **{*}CY:{**}* Datganiad hygyrchedd  
   - **{*}EN:{**}* Back to Top → **{*}CY:{**}* Yn ôl i frig y dudalen

—
 # 
 ## Page Location & Technical Details
|Element|Description|
|~~--~~~~--~~~~-|~~~~--~~~~--~~~~--~~|
|**{*}Footer link text{**}*|“Accessibility statement”|
|**{*}Footer placement{**}*|Bottom section of all CaTH pages (alongside Privacy, Cookies, Contact, etc.)|
|**{*}URL (EN){**}*|`/accessibility-statement`|
|**{*}URL (CY){**}*|`/datganiad-hygyrchedd`|
|**{*}Page title (EN){**}*|“Accessibility statement”|
|**{*}Page title (CY){**}*|“Datganiad hygyrchedd”|
|**{*}Open behaviour{**}*|Opens in new browser tab/window|
|**{*}Language toggle{**}*|Switch between English and Welsh text versions|

—
 # 
 ## Accessibility Statement Page — Content Overview
 ### English Version (full text)
The content must include all sections as detailed in the Accessibility Statement document:contentReference<oaicite:2>{index=2}:

1. **{*}Accessibility statement header{**}*
   - “This accessibility statement applies to content published on court~~tribunal~~hearings.service.gov.uk.”
   - Overview of the CaTH service, its purpose, and accessibility principles.

2. **{*}How accessible this website is{**}*
   - Lists accessible features (zoom, contrast, screen reader support).
   - Describes inaccessible content (flat file PDFs, untitled pages).

3. **{*}Feedback and contact information{**}*
   - Text relay and BSL interpreter availability.
   - Contact details:  
     - **{*}Telephone:{**}* 0300 303 0656  
     - **{*}Email:{**}* publicationsinformation@justice.gov.uk  
     - **{*}Hours:{**}* Monday–Friday, 8am–5pm

4. **{*}Reporting accessibility problems{**}*
   - Guidance on contacting HMCTS if accessibility issues are found.

5. **{*}Enforcement procedure{**}*
   - Details of the Equality and Human Rights Commission’s enforcement role.

6. **{*}Technical information{**}*
   - Compliance commitment with Public Sector Bodies (Websites and Mobile Applications) Regulations 2018.

7. **{*}Compliance status{**}*
   - States partial compliance with WCAG 2.2.

8. **{*}Non-accessible content{**}*
   - Lists current non-compliances (PDFs, missing page titles).

9. **{*}What we’re doing to improve accessibility{**}*
   - Ongoing improvements and testing details.

10. **{*}Preparation of this accessibility statement{**}*
    - Prepared: 8 September 2023  
    - Reviewed: 6 March 2025  
    - Last audited: 18 November 2024.

—
 # 
 ## 
 ### Welsh Version (full text)
The Welsh translation mirrors the English structure and content, titled **{*}“Datganiad hygyrchedd”{**}*, as supplied in the accessibility statement document:contentReference<oaicite:3>{index=3}.  
All references (contact details, phone, email, audit dates) remain the same.

—
 # 
 ## Back to Top Element
|Element|Description|
|~~--~~~~--~~~~-|~~~~--~~~~--~~~~--~~|
|**{*}Position{**}*|Bottom of Accessibility Statement page|
|**{*}Appearance{**}*|Upward arrow icon (↑) followed by “Back to Top” text|
|**{*}Action{**}*|Scrolls smoothly to top of the page|
|**{*}ARIA label{**}*|`aria-label="Back to top of page"`|
|**{*}Text (EN){**}*|“Back to Top”|
|**{*}Text (CY){**}*|“Yn ôl i frig y dudalen”|

—
 # 
 ## Example Page Layout (English)

┌──────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK <Language> │
├──────────────────────────────────────────────────────────────────────────────┤
│ Accessibility statement │
│ │
│ <Full content from document, sections 1–10 as defined above> │
│ │
│ ↑ Back to Top │
└──────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## Validation Rules

 - **{*}Footer link{**}* appears on all CaTH pages.
 - **{*}Link accessibility:{**}*
  - Must open `/accessibility-statement` in a new window (`target="_blank"`).
  - Must have `rel="noopener noreferrer"`.
 - **{*}Language toggle:{**}*
  - English and Welsh pages linked by `<link rel="alternate" hreflang="cy">` metadata.
  - Toggle persists on refresh.
 - **{*}ARIA and keyboard navigation:{**}*
  - Footer link and Back to Top must be reachable via keyboard (Tab navigation).
 - **{*}Compliance check:{**}*
  - Page passes WAVE or Axe automated accessibility testing.

—
 # 
 ## Test Scenarios
|ID|Scenario|Steps|Expected Result|
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
|TS1|Footer link visible|Scroll to bottom of any CaTH page|“Accessibility statement” link displayed|
|TS2|Link click|Click “Accessibility statement”|Opens new tab/window with accessibility statement|
|TS3|Page load|Open `/accessibility-statement`|Full statement content displays correctly|
|TS4|Language toggle|Switch to Welsh|Displays Welsh translation|
|TS5|Back to Top|Scroll down → click Back to Top|Smooth scroll returns to top of page|
|TS6|Link behaviour|Open footer link with keyboard (Enter key)|Opens in new tab, focus moves to new page|
|TS7|Accessibility compliance|Run automated test|Page meets WCAG 2.2 AA standards|
|TS8|Mobile responsiveness|View page on mobile|Layout responsive and Back to Top visible|
|TS9|SEO/meta|Inspect metadata|`<title>` and `<meta description>` correctly set|

—
 # 
 ## Accessibility & Compliance

 - Page must comply with:
  - **{*}WCAG 2.2 AA{**}*
  - **{*}Public Sector Bodies (Websites and Mobile Applications) Regulations 2018{**}*
  - **{*}HMCTS Design System accessibility principles{**}*
 - Accessibility link and Back to Top must:
  - Be focusable via keyboard.
  - Provide descriptive labels.
  - Work with screen readers (JAWS, NVDA, VoiceOver).
 - Welsh translation must maintain semantic structure and content parity.

—
 # 
 ## Risks / Clarifications

 - Confirm whether Accessibility Statement should load **{*}within CaTH domain{**}* or open HMCTS-hosted external URL.
 - Confirm maintenance owner for the accessibility content updates (e.g., CTSC team or platform team).
 - Confirm if audit dates and compliance sections should be dynamically updated on future releases.

—', 'functional', 'verified', 'medium', 'story', 287, 'https://github.com/hmcts/cath-service/issues/287', '2026-01-20T17:17:26Z', '2026-01-30T13:39:48Z', 'linusnorton', 'linusnorton'),
  (65, 'REQ-0065', 'CaTH General Information - Cookie Policy', '**PROBLEM STATEMENT**

Every page in CaTH has a section displays links to various general information at the bottom of the page. This ticket captures the Cookie Policy requirements.

 

**AS A** System

{**}I WAN{**}T to display a link to the Cookie Policy in CaTH

**SO THAT** CaTH Users are able to access the Cookies Policy

 

**ACCEPTANCE CRITERIA**
 * A link to the Cookie Policy page (<Cookie Policy - Court and Tribunal Hearings - GOV.UK>(https://www.court~~tribunal~~hearings.service.gov.uk/cookie-policy)) is masked in the text ''Cookies'' at the bottom of every page in CaTH
 * When a user clicks on the link, the user is taken to the Cookie Policy page which opens in a different window
 * The Cookie Policy page displays the information in the attached document and provides the option for users to switch to the Welsh translation

 
 * At the end of the cookie policy page, user can see a section titled ''Change your cookie settings'' with 2 sub~~headings with 2 options under each sub~~heading accompanied with radio buttons that allows the user make a selection.

 * First sub~~heading is ‘Allow cookies that measure website use?’ with ‘Use cookies that measure my website use’ and ‘Do not use cookies that measure my website use’ as options and the second sub~~heading is ‘Allow cookies that measure website application performance monitoring?’ with ‘Use cookies that measure website application performance monitoring’ and ‘Do not cookies that measure website application performance monitoring’ as options
 * use can see a green ''Save'' button afterwards followed by a collapsible accordion titled ''Contact us for help'' which displays the following message when opened **Telephone**
0300 303 0656
Monday to Friday 8am to 5pm
 * Where the user opts out of the use of measurement cookies for either website use or website application performance monitoring or both, then these cookies are not implemented for the user and vice versa
 * At the bottom of the page, user can see an arow pointing upwards with the text ''Back to Top'' which takes the user back to the top of the page when clicked

 

**Welsh translation:**

Cookie Policy - Polisi Cwcis

Back to Top - Yn ôl i frig y dudalen

Change your cookie settings - Newid eich gosodiadau cwcis

Allow cookies that measure website use - Caniatáu cwcis sy’n mesur defnydd o''r wefan?

Use cookies that measure my website use - Defnyddio cwcis sy’n mesur fy nefnydd o''r wefan

Do not use cookies that measure my website use - Peidio â defnyddio cwcis sy''n mesur fy nefnydd o''r wefan

Allow cookies that measure website application performance monitoring - Caniatáu cwcis sy''n mesur y broses o fonitro perfformiad gwefannau?

Use cookies that measure website application performance monitoring - Defnyddio cwcis sy’n mesur y broses o fonitro perfformiad gwefannau

Do not cookies that measure website application performance monitoring - Peidio â defnyddio cwcis sy’n mesur y broses o fonitro perfformiad gwefannau

Save - Cadw

Contact us for help - Cysylltwch â ni am help

Telephone - Ffon

Monday to Friday 8am to 5pm - Dydd Llun i ddydd Gwener 8am i 5pm

 

 

 
 # VIBE-241 — Cookie Policy (Link and Page Specification)

> Owner: **{*}VIBE-241{**}*  
> Updated: **{*}15 Nov 2025{**}*

—
 # 
 ## Problem Statement
Every page in CaTH includes a footer section with links to general information.  
This ticket defines the requirements for displaying and implementing a **{*}Cookie Policy link and page{**}*, in accordance with GOV.UK and HMCTS accessibility and compliance standards.

—
 # 
 ## User Story
**{*}As a{**}* System  
**{*}I want to{**}* display a link to the Cookie Policy on every page in CaTH  
**{*}So that{**}* users can access the Cookie Policy and manage their cookie preferences.

—

 

Acceptance Criteria
### Footer Link
 # A **footer link** labelled **“Cookies”** is displayed on {**}every CaTH page{**}.

 # The text “Cookies” is a **masked link** pointing to the Cookie Policy page.

 # Clicking the link must open the Cookie Policy page in a {**}new browser window/tab{**}.

### Cookie Policy Page
 # The Cookie Policy page displays **the full cookie policy content** exactly as provided in the uploaded document (see source) .

 # The page provides a {**}Welsh translation option{**}, switching the full text to the Welsh content included in the uploaded file.

 # At the bottom of the Cookie Policy page, there is:

 *** An *upward arrow icon**

 *** The text *“Back to Top”**
Both scroll the page back to the top.

### Cookie Settings Controls
 # At the end of the Cookie Policy page, a dedicated section titled **“Change your cookie settings”** is displayed.

 # The section contains {**}two sub~~headings{**}, each with two radio~~button options:

#### A. Allow cookies that measure website use?
 * **Use cookies that measure my website use**

 * **Do not use cookies that measure my website use**

#### B. Allow cookies that measure website application performance monitoring?
 * **Use cookies that measure website application performance monitoring**

 * **Do not use cookies that measure website application performance monitoring**

*(Both sets of cookie-settings options come directly from the uploaded document)*
 # Below the options, a **green ‘Save’ button** is displayed.

 # Saving settings must:

 ** Disable measurement cookies when “Do not use…” is selected.

 ** Enable measurement cookies when “Use cookies…” is selected.

 ** Apply settings immediately for the current user/browser.

 ** Persist the selection using a user~~specific cookie (non~~measurement).

 # After the Save button, a **collapsible accordion** titled **“Contact us for help”** is displayed.

 # When expanded, it shows:

 * **Telephone:** 0300 303 0656

 * **Hours:** Monday to Friday 8am to 5pm
(From the uploaded file)

### Behaviour Requirements
 # Measurement cookies must not be set or loaded if the user opts out.

 # Performance-monitoring cookies must not be set if the user opts out.

 # Both choices must operate independently:

 * User may opt in to one and out of the other.

 # All CaTH design, accessibility, and page-specification standards must be maintained.

 
## URL Structure
|Element|URL|
|Cookie Policy page (EN)|`/cookies-policy`|
|Cookie Policy page (CY)|`/polisi-cwcis`|
|Link on footer|Opens `/cookies-policy` in a new window|

 
# h1. Page Specifications

 
## Page 1 — Footer Section (All CaTH Pages)
### Requirements
 * Display a **Cookies** link at the bottom of every page.

 * Link text:
**EN:** “Cookies”
**CY:** “Cwcis”

 * Opens Cookie Policy page in a **new tab/window** with security attributes:
`target="_blank" rel="noopener noreferrer"`

 

 
## Page 2 — Cookie Policy Page
### Wireframe

┌──────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK                                                       <Language Toggle> │
├──────────────────────────────────────────────────────────────────────────────┤
│ Cookie Policy (Polisi Cwcis)                                                 │
│                                                                              │
│ <Main content of the Cookies Policy – full text from uploaded document>      │
│                                                                              │
│ Change your cookie settings                                                  │
│  Allow cookies that measure website use?                                     │
│   ( ) Use cookies that measure my website use                                │
│   ( ) Do not use cookies that measure my website use                         │
│                                                                              │
│  Allow cookies that measure website application performance monitoring?      │
│   ( ) Use cookies that measure website application performance monitoring     │
│   ( ) Do not use cookies that measure website application performance         │
│                                                                              │
│ <Save> (Green Button)                                                        │
│                                                                              │
│ ▶ Contact us for help (accordion)                                            │
│   Telephone: 0300 303 0656                                                   │
│   Monday to Friday 8am to 5pm                                                │
│                                                                              │
│ ↑ Back to Top                                                                 │
└──────────────────────────────────────────────────────────────────────────────┘

 
## Content Requirements
### 1. Page Title

**EN:** Cookie Policy
**CY:** Polisi Cwcis
### 2. Cookie Policy Text

The page must fully display all sections from the uploaded cookie policy document, including:
 * What cookies are

 * How CaTH uses cookies

 * Google Analytics cookies and purposes

 * Session cookies

 * Authentication cookies

 * Security cookies

 * Performance-monitoring cookies (Dynatrace)

 * Lists of cookie names, purposes, and expiry periods
(All content cited from the attached document)

### 3. Change Your Cookie Settings (Dynamic Controls)

**EN:** Change your cookie settings
**CY:** Newid eich gosodiadau cwcis

All radio options must appear as defined in the requirements section above.
### 4. Action Buttons
 * **Save** / **Cadw**

### 5. Accordion

**Title:**
 * **EN:** Contact us for help

 * **CY:** Cysylltwch â ni am help

**Content:**
 * Telephone / Ffon

 * 0300 303 0656

 * Monday to Friday 8am to 5pm / Dydd Llun i ddydd Gwener 8am i 5pm

### 6. Back to Top

**EN:** Back to Top
**CY:** Yn ôl i frig y dudalen

Scrolls smoothly to page top.

 
## Functional Requirements
### Cookie Settings Logic
|Setting|Result|
|“Use cookies that measure my website use”|Enable Google Analytics cookies|
|“Do not use…”|Disable and prevent measuring cookies|
|“Use cookies that measure performance monitoring”|Enable Dynatrace cookies|
|“Do not use…”|Disable and prevent performance monitoring cookies|
 * Choices must be persisted in a {**}strictly necessary cookie{**}.

 * Saved settings must immediately take effect:

 ** If user opts OUT → remove/disable GA or Dynatrace scripts.

 ** If user opts IN → allow scripts to load normally.

 

 
## Validation Rules
 * User must select a radio for each cookie-category group.

 * If Save is clicked with missing selections → show error summary:

 ** “Select cookie settings for each option.”

 * Cookie preferences persist for up to 1 year unless cleared.

 

 
## Accessibility Requirements
 * All text must comply with WCAG 2.2 AA.

 * Radio groups must use `<fieldset>` and {{{}<legend>{}}}.

 * Accordion must use {{{}aria~~expanded{}}}, {{{}aria~~controls{}}}.

 * Back to Top must be keyboard accessible with visible focus.

 * Language toggle must switch content but keep scroll position where possible.

 

 
## Test Scenarios
|ID|Scenario|Steps|Expected Result|
|TS1|Footer link visible|Open any CaTH page|“Cookies” link shown in footer|
|TS2|Footer link opens new window|Click Cookies|Cookie Policy page opens in new tab|
|TS3|Content loads|Visit `/cookies-policy`|Full content from uploaded policy displayed|
|TS4|Welsh toggle|Switch language|Welsh policy displayed|
|TS5|Cookie settings validation|Click Save without selecting|Error summary displayed|
|TS6|Disable measurement cookies|Select “Do not use…”|GA cookies not loaded|
|TS7|Enable measurement cookies|Select “Use…”|GA cookies load|
|TS8|Disable performance cookies|Select “Do not use…”|Dynatrace cookies not loaded|
|TS9|Save settings persistence|Refresh browser|Saved settings retained|
|TS10|Accordion expands|Click “Contact us for help”|Contact details displayed|
|TS11|Back to Top|Scroll down → click Back to Top|Returns to top|
|TS12|Accessibility|Keyboard navigation|All controls accessible and screen-reader friendly|

 

 
## Risks / Clarifications
 * Confirm whether the cookie preferences should apply **across all CaTH services** or only within the Court and Tribunal Hearings service domain.

 * Confirm GA and Dynatrace scripts are conditionally loaded using **server~~side gating** versus {**}client~~side script suppression{**}.

 * Confirm Welsh cookie policy text will be formally approved by HMCTS Welsh Translation Unit.

 

 

 

 

 

 

 

 

 

 

 

 

 
 #', 'functional', 'verified', 'medium', 'story', 288, 'https://github.com/hmcts/cath-service/issues/288', '2026-01-20T17:18:09Z', '2026-01-30T14:03:06Z', 'linusnorton', 'linusnorton'),
  (66, 'REQ-0066', 'Authentication on classified publications', '**PROBLEM STATEMENT**

Every list published in CaTH is assigned a sensitivity level which indicates which user group the publication should be made available to. This ticket covers the authentication of publications based on the sensitivity level. 

 

 

**AS A** System

{**}I WAN{**}T to Authenticate publications assigned the ''Classified'' sensitivity level in CaTH

**SO THAT** these publication files are only available to CaTH Users with the required clearance levels 

 

 

**ACCEPTANCE CRITERIA**
 * Each uploaded publication file in CaTH must have an indicated sensitivity level indication during the uploading process such that each list type is linked to a specific sensitivity level 
 * Where a Publication file is assigned the ''Public'' sensitivity level, then the Publication file will be available to all users. Where a Publication file is assigned the ''Private'' sensitivity level, then the Publication file will be available to only all verified users e.g. Legal professionals and media. Where a Publication file is assigned the ''Classified'' sensitivity level, then the Publication file will be available to only verified users who are in a group eligible to view that list e.g. SJP press list available to Media. 
 * The validation logic for each sensitivity level will be inferred by using the user provenance stored against each user in the database to determine the accessibility of user groups when any file is published in CaTH.
 * The data classification level should be configured in the user table using a ''Parent Child relationship'' as the Rule Hierarchy. This should follow the User Provenance - User Role - Sensitivity levelling 
 * System admin can see Public, Private, Classified
 * If it is a verified user and list is classified , user provenance of the user will be compare with list type provenance.
 * For Local and CTSC admin, they should be able to delete and view meta data for private and classified publication but not able see the actual list data (only can access list meta data for the classified list)
 * Pubic users can only access Public Lists. They must not allow to view private and classified lists.

 

**PERMISSIONS TABLE**

 
|User Provenance|User Role|Sensitivity Level|
|B2C|Verified|Public, Private, Classified|
|SSO|System Admin|Public, Private, Classified|
|SSO|Local Admin, CTSC Admin|Public|
|CFT IdAM|Verified|Public, Private, Classified|
|Crime IdAM|Verified|Public, Private, Classified|
|Public|Public|Public|', 'functional', 'verified', 'medium', 'story', 289, 'https://github.com/hmcts/cath-service/issues/289', '2026-01-20T17:18:50Z', '2026-01-30T14:03:10Z', 'linusnorton', 'linusnorton'),
  (67, 'REQ-0067', 'Create hook for lint style check and any typescript errors', '#### User story

**As a** developer{*},{*} I want to integrate lint and TypeScript validation into our pre-merge checks, so that we can identify and fix issues before they trigger a PR build failure.

We are currently doing it for existing CaTH.
#### Acceptance criteria
 # Make sure there is not lint and typescript error in code before pushing to Github', 'non_functional', 'verified', 'medium', 'story', 290, 'https://github.com/hmcts/cath-service/issues/290', '2026-01-20T17:19:04Z', '2026-04-29T14:33:02Z', 'linusnorton', 'linusnorton'),
  (68, 'REQ-0068', 'Refactor values.dev.yaml files', 'In CaTH AI, we have values.dev.yaml file which is being used only for local development. But values.dev.yaml file should only be use when we want to override values on values.yaml file. So, we need to refactor the code to make sure values.dev.yaml file should be used to override the values.yaml when needed.

**Acceptance criteria:**
 * End to end tests are passing on local
 * Github pipeline is passing', 'constraint', 'verified', 'medium', 'story', 291, 'https://github.com/hmcts/cath-service/issues/291', '2026-01-20T17:19:15Z', '2026-04-29T14:32:45Z', 'linusnorton', 'linusnorton'),
  (69, 'REQ-0069', 'Language toggle link is not consistent across different pages', '---

## Original JIRA Metadata

- **Status**: New
- **Priority**: 3-Medium
- **Issue Type**: Story
- **Assignee**: Unassigned
- **Created**: 12/1/2025
- **Updated**: 12/1/2025
- **Original Labels**: cath', 'functional', 'verified', 'medium', 'story', 292, 'https://github.com/hmcts/cath-service/issues/292', '2026-01-20T17:19:25Z', '2026-05-08T09:19:01Z', 'linusnorton', 'linusnorton'),
  (70, 'REQ-0070', 'Configure Nightly Pipeline and Add Test Guidance to CLAUDE.md', 'We need to enhance our CI/CD process by configuring a nightly pipeline and improving contributor documentation. This includes two main tasks:
~~--~~
### **1️⃣ Configure Nightly Pipeline**
 * Set up a nightly CI pipeline to run automatically at a scheduled time.

~~--~~
### **2️⃣ Update `CLAUDE.md` with Test Guidance**

Add clear instructions on how to:
 * Write e-2-e tests with new guidance

 * Handle test data

 * Expectations for test coverage', 'non_functional', 'verified', 'medium', 'story', 293, 'https://github.com/hmcts/cath-service/issues/293', '2026-01-20T17:19:35Z', '2026-01-30T15:05:12Z', 'linusnorton', 'linusnorton'),
  (71, 'REQ-0071', 'Subscribe by case name, case reference number, case ID or unique reference number (URN)', '**PROBLEM STATEMENT**

Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH and subscribe to email notifications from CaTH.

 

**AS A** Verified Media User

**I WANT** to subscribe to hearing lists in CaTH

**SO THAT** I can receive email notifications whenever a new list I subscribed to is published

**Technical Specification:**
 * This ticket should branch off ''feature/VIBE~~316~~refactor~~artefact~~search~~extraction~~subscription''
 * Add Case*number and case*name fields to the subscription table so they can be retrieved for display on subscription pages.
 * When user search by a case number or case name, use the artefact_search tableto get the results.
 * If user is subscriber by case number, Store value for search*type column on the subscription table as CASE*NUMBER and store the case number in the search_value column.
 * If user is subscriber by case name, Store value for search*type column on the subscription table as CASE*NAME and store the case name in the search_value column.
 * Subscriptions should be fulfilled for the new search type / value combination. If an artefact is ingested that matches the CASE_NUMBER, then subscription should be fulfilled using the existing subscriptions process / logic.
 * The code for subscription pages should sit under libs/verified-pages/src/pages.
 * The code for manipulating subscription information should sit under libs/subscription

 

**Pre-conditions:**
 * The user has valid credentials and is already approved as a verified media user.
 * Only published information is available for searching, per system restriction.
 * Email notifications are implemented in Gov Notify

 

**ACCEPTANCE CRITERIA**
 * A verified user is a member of the media who has been verified and has an approved account in CaTH
 * A verified user can sign into CaTH to view restricted hearing information and subscribe to email notifications.
 * The verified user can see the Dashboard as soon as the user signs in
 * At the top of the page user can see a clickable link to see 3 pages provided in these texts <Court and tribunal hearings>(https://www.court~~tribunal~~hearings.service.gov.uk/) , <Dashboard>(https://www.court~~tribunal~~hearings.service.gov.uk/account~~home) and <**Email subscriptions**>(https://www.court~~tribunal~~hearings.service.gov.uk/subscription~~management)
 * The verified user can click on the ‘Email subscriptions’ tab to subscribe to hearing lists from specific venues.
 * When the user clicks on the ''Email subscriptions'' tab,  the user is taken to a page with a header title ‘Your email subscriptions’ and can see the green ‘Add email subscription’ button under the header. Underneath the button is a table with multiple display options available to the user to select. These display options are titled ‘All subscriptions’, ‘Subscriptions by case’ and ‘Subscription by court or tribunal’. Each option displays the total number of active subscriptions in a bracket beside the title.
 * The content of each displayed table is dependent on the availability of active subscriptions the user has and the selected option.
 * Each table displays details of the available active subscriptions in the user’s account
 * Where the user has subscribed by case name or /and case reference number and clicks on the ‘Subscriptions by case’ option, then the column titles displayed will be ‘Case name’,''Reference number’ and ‘date added’.
 * Where the user has subscribed by court or tribunal name and clicks on the ‘Subscription by court or tribunal’ option, then the table will display ‘Court or tribunal name’ and ‘Date added'' in the columns
 * Where the user has subscribed by both case name or /and case reference number and court or tribunal name and selects the ‘All subscriptions’ option, then 2 tables will be displayed with the Subscription by case table coming first before the subscription by court or tribunal table following
 * Where the user does not have any existing subscriptions, then the following message is displayed under the ''Add email subscription'' tab; ''You do not have any active subscriptions'' and the user can click the green ''Add email subscription'' tab to begin the subscription process
 * When the user clicks on the ''Add email subscription'' tab, the user is taken to the page with path ''/subscription-add'' titled ‘{**}How do you want to add an email subscription?’{**} and underneath the page title, user can see the following message ‘You can only search for information that is currently published.’
 * User can see 3 radio button options; ‘By court or tribunal name'', ‘By case name’ and ‘By case reference number, case ID or unique reference number (URN)’
 *  The user can make one selection and then click the continue button to progress to the next page
 * Clicking Continue without selecting an option must trigger a validation error.
 * When the user clicks to subscribe ''By court or tribunal name'' it should go to the existing path for ''location~~name~~search''.
 * where the user clicks to subscribe ''By case name'' then the following steps completes the subscription process
 * After selecting {*}By case name{*}, the user must be shown a page requesting a case name input.
 * Submitting an empty form must trigger a mandatory field validation message.
 * If no results match the case name entered, an error message must be displayed (per Screen 3).
 * If matching cases exist, the system must display a search results page (Screen 4).
 * The user must be able to select one case from the results list.
 * After selection, the user must be brought to a **Confirm email subscription** page (Screen 5).
 * After confirming, the user must be shown a subscription confirmation page (Screen 6).
 * The subscription must be added to the user’s active subscription table immediately.
 * where the user clicks to subscribe ''By case reference number, case ID or unique reference number (URN)'' then the following steps completes the subscription process
 * After selecting {*}By case reference number, case ID or URN{*}, show an input page requesting the reference.
 * Submitting an empty value must trigger validation requiring a reference number.
 * Submitting an invalid or non-matching reference must show an error message (Screen 3).
 * If a matching case is found, display the results page (Screen 4).
 * The user must select a case to subscribe to.
 * Display a confirmation page for the selected case (Screen 5).
 * Upon confirmation, show a subscription success page (Screen 6).
 * The subscription must be added to the user’s subscription table.
 * The newly added subscription must updated in the database and be visible immediately in the subscription table in the user''s account
 * All CaTH page specifications are maintained.

 

 
# **VIBE-300 — Verified User Email Subscriptions**
## **User Story**

As a verified media user, I want to subscribe to hearing lists in CaTH so that I can receive email notifications whenever a list I subscribed to is published.
~~--~~
 

**Page: Verified User Dashboard**

**Form fields**
 * None

**Content**
 * EN: Title/H1 “Dashboard”

 * CY: Title/H1 “Dangosfwrdd”

 * EN: Navigation links — “Court and tribunal hearings”, “Dashboard”, “Email subscriptions”

 * CY: Navigation links — “Gwrandawiadau llys a thribiwnlys”, “Dangosfwrdd”, “tanysgrifiadau e-bost”

**Errors**
 * None

**Back navigation**
 * Not applicable (entry point after sign-in).

 

**Page: Your Email Subscriptions**

**Form fields**
 * None (tables and actions only)

**Content**
 * EN: Title/H1 “Your email subscriptions”

 * CY: Title/H1 “Eich tanysgrifiadau e-bost”

 * EN: Button — “Add email subscription”

 * CY: Button — “Ychwanegu tanysgrifiad e-bost”

 * EN: Tab options — “All subscriptions”, “Subscriptions by case”, “Subscription by court or tribunal”

 * CY: Tab options — “Pob tanysgrifiad”, “Tanysgrifio yn ôl achos”, “Tanysgrifio yn ôl llys neu dribiwnlys”

 * EN: Empty state message — “You do not have any active subscriptions”

 * CY: Empty state message — “Nid oes gennych unrhyw danysgrifiadau gweithredol”

**Errors**
 * None

**Back navigation**
 * Back link returns to Dashboard.

 

**Page: How Do You Want to Add an Email Subscription?**

**Form fields**
 * Subscription method

 * 
 ** Input type: radio

 * 
 ** Required: Yes

 * 
 ** Options:

 * 
 ** 
 *** By court or tribunal name

 * 
 ** 
 *** By case name

 * 
 ** 
 *** By case reference number, case ID or unique reference number (URN)

 * 
 ** Validation rules:

 * 
 ** 
 *** One option must be selected

**Content**
 * EN: Title/H1 “How do you want to add an email subscription?”

 * CY: Title/H1 “Sut ydych chi eisiau ychwanegu tanysgrifiad e-bost?”

 * EN: Body text — “You can only search for information that is currently published.”

 * CY: Body text — “Gallwch ond chwilio am wybodaeth sydd eisoes wedi’i chyhoeddi”

 * EN: Button — “Continue”

 * CY: Button — “Dewiswch opsiwn”

**Errors**
 * EN: “Select how you want to add an email subscription.”

 * CY: “Dewiswch Sut ydych chi eisiau ychwanegu tanysgrifiad e-bost?”

**Back navigation**
 * Back link returns to Your Email Subscriptions.

 

**Page: Enter Case Name**

**Form fields**
 * Case name

 * 
 ** Input type: text

 * 
 ** Required: Yes

 * 
 ** Validation rules:

 * 
 ** 
 *** Maximum length: 255 characters

 * 
 ** 
 *** Must not be empty

**Content**
 * EN: Title/H1 “By case name”

 * CY: Title/H1 “Yn ôl enw’r achos”

 * EN: Label — “Case name”

 * CY: Label — “Enw''r Achos”

 * EN: Button — “Continue”

 * CY: Button — “Dewiswch opsiwn”

**Errors**
 * EN: “Enter a case name”

 * CY: “Welsh placeholder”

 * EN: “No results found”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back link returns to subscription method page.

 

**Page: Enter Case Reference Number / URN**

**Form fields**
 * Reference number

 * 
 ** Input type: text

 * 
 ** Required: Yes

 * 
 ** Validation rules:

 * 
 ** 
 *** Must not be empty

 * 
 ** 
 *** Alphanumeric and symbols allowed

**Content**
 * EN: Title/H1 “By case reference number, case ID or unique reference number (URN)”

 * CY: Title/H1 “Yn ôl enw’r achos, Yn ôl cyfeirnod yr achos, ID yr achos neu gyfeirnod unigryw (URN)”

 * EN: Label — “Reference number”

 * CY: Label — “Cyfeirnod”

 * EN: Button — “Continue”

 * CY: Button — “Dewiswch opsiwn”

**Errors**
 * EN: “Enter reference number”

 * CY: “Rhowch gyfeirnod achos dilys”

 * EN: “No matching case found”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back link returns to subscription method page.

 

**Page: Case Search Results**

**Form fields**
 * Case selection

 * 
 ** Input type: radio

 * 
 ** Required: Yes

 * 
 ** Validation rules:

 * 
 ** 
 *** One case must be selected

**Content**
 * EN: Title/H1 “Select a case”

 * CY: Title/H1 “Dewiswch yr achos”

 * EN: Table column headers — “Case name”, “Party name”, “Reference number”

 * CY: Table column headers — “Enw''r Achos”, “Enw’r parti”, “Cyfeirnod yr Achos”

 * EN: Button — “Continue”

 * CY: Button — “Dewiswch opsiwn”

**Errors**
 * EN: “Select a case to continue”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back link returns to search input page.

 

**Page: Confirm Email Subscription**

**Form fields**
 * None (read-only confirmation)

**Content**
 * EN: Title/H1 “Confirm email subscription”

 * CY: Title/H1 “Cadarnhewch tanysgrifiadau e-bost”

 * EN: Button — “Confirm”

 * CY: Button — “Cadarnhewch”

**Errors**
 * None

**Back navigation**
 * Back link returns to Case Search Results.

 

**Page: Subscription Added**

**Form fields**
 * None

**Content**
 * EN: Title/H1 “Subscription added”

 * CY: Title/H1 “tanysgrifiadau wedi’i ychwanegu”

 * EN: Body text — “Your email subscription has been added.”

 * CY: Body text — “Eich tanysgrifiadau e-bost wedi’i ychwanegu”

 * EN: Link — “Email subscriptions”

 * CY: Link — “Welsh placeholder”

**Errors**
 * None

**Back navigation**
 * Link returns to Your Email Subscriptions.

 

**Data and Processing Rules (Applies to all pages)**
 * Case-based searches use the `artefact_search` table.

 * Subscriptions created by case name, case number, case ID or URN must:

 * 
 ** Store `search*type` as `CASE*NUMBER`

 * 
 ** Store `search_value` as the case number

 * A new column `case_name` is added to the subscription table:

 * 
 ** When subscribing by case name, the resolved case number is stored in `search_value`

 * 
 ** The entered/displayed case name is stored in `case_name`

 * Subscriptions are persisted immediately and visible in the user’s subscription tables.

 * Notification emails are sent via existing Gov Notify integration.

 

**Accessibility**
 * All pages must comply with WCAG 2.2 AA standards.

 * Radio buttons and tables must be fully keyboard accessible.

 * Error messages must be announced to assistive technologies.

 * Page headings must be unique and descriptive.

 

**Test Scenarios**
 * Verified media user can access Email Subscriptions from the dashboard.

 * User with no subscriptions sees the empty state message.

 * Validation errors appear when required inputs are missing.

 * Case search returns results based on published information only.

 * Selecting and confirming a case adds a subscription immediately.

 * Subscriptions by case appear correctly under “Subscriptions by case”.

 * Data is stored with `search*type = CASE*NUMBER` for all case-based subscriptions.

 * Subscription confirmation page displays correct success messaging.

 * Welsh translations display correctly for specified labels and messages.', 'functional', 'verified', 'medium', 'story', 294, 'https://github.com/hmcts/cath-service/issues/294', '2026-01-20T17:19:46Z', '2026-02-25T10:29:34Z', 'linusnorton', 'linusnorton'),
  (72, 'REQ-0072', 'Verified user - Bulk unsubscribe process', '**PROBLEM STATEMENT**

Verified users are users who have applied to create accounts in CaTH to have access to restricted hearing information which they can subscribe to receive email notifications from CaTH and also unsubscribe from.

 

**AS A** Verified Media User

**I WANT** to bulk unsubscribe from my subscriptions in CaTH

**SO THAT** I can stop receiving notifications from publications i am no longer interested in. 

 

**Pre-condition:**
 * The user has a verified account
 * The verified user already has some active subscriptions in CaTH
 * Subscription by case name and case reference number have been implemented (VIBE-300)
 * Verified user dashboard has already been created

**Technical Specification:**
 * On confirmation, all the selected subscription must be deleted from subscription database table for given user.

 

**ACCEPTANCE CRITERIA**
 * When the verified user signs into CaTH, the user can see the following tabs; Dashboard and 3 tabs ‘Court and tribunal hearings’, ‘Dashboard’, and ‘Email subscriptions’

 * When the verified user clicks on the ‘Email subscriptions’ tab, the user is taken to a page with a header title ‘Your email subscriptions’ and can see the ‘Bulk unsubscribe'' tab under the header and beside the ‘Add email subscription’ tab.
 * The user can tick the check box at the table header to select all the items in the table
 * Underneath the table, the user sees a green ‘Bulk unsubscribe button which when clicked, takes the user to the page titled ‘Are you sure you want to remove these subscriptions?’ which displays all selected options in a table with similar column titles to afore mentioned
 * Undeath the table, 2 radio buttons are available with the options ‘Yes’ and ‘No’
 * If the user selects ‘No’, then the user is taken back to the ‘Your email subscriptions’ page
 * If the user selects ‘Yes’, then the user is taken to the confirmation page which displays the page title ‘Email subscriptions updated’ in a green banner. Underneath the banner, user the following options in bullet points after the text ‘To continue, you can go to <your account>(https://www.court~~tribunal~~hearings.service.gov.uk/account-home) in order to:’

 * <add a new email subscription>(https://www.court~~tribunal~~hearings.service.gov.uk/subscription-add)
 * <manage your current email subscriptions>(https://www.court~~tribunal~~hearings.service.gov.uk/subscription-management)
 * <find a court or tribunal>(https://www.court~~tribunal~~hearings.service.gov.uk/search)

 * The user can navigate to the previous page on each page using the ‘back’ link provided at the top left of the page
 * All CaTH pages specifications are maintained

 

 

 
# **VIBE-306 — Bulk Unsubscribe (Verified Users)**
## **User Story**

As a verified media user, I want to bulk unsubscribe from my subscriptions in CaTH so that I can stop receiving notifications from publications I am no longer interested in.
# **Page 1 — Your Email Subscriptions (with Bulk Unsubscribe option)**
## **Form fields**
 * **Bulk unsubscribe tab**

 ** Input type: tab/button

 ** Required: No

 ** Validation rules:

 *** Selecting the tab enables bulk selection mode.

 * **Select-all checkbox**

 ** Input type: checkbox (header-level)

 ** Required: No

 ** Validation rules:

 *** Ticking selects all subscriptions displayed in the table.

 *** Unticking deselects all.

 * **Subscription item checkboxes**

 ** Input type: checkbox (one per subscription)

 ** Required: No

 ** Validation rules:

 *** User may select one, many, or all subscriptions.

 * **Bulk unsubscribe button**

 ** Input type: button (green)

 ** Required: No

 ** Validation rules:

 *** Enabled only when at least one subscription is selected.

 *** Navigates to “Are you sure you want to remove these subscriptions?” page.

## **Content**
 * EN: Title/H1 — “Your email subscriptions”

 * CY: Title/H1 — “Eich tanysgrifiadau e-bost”

 * EN: Tab — “Bulk unsubscribe”

 * CY: Tab — “Datdanysgrifio Swmp”

 * EN: Tab — “Add email subscription”

 * CY: Tab — “Welsh placeholder”

 * EN: Table header checkbox label — “Select all”

 * CY: Table header checkbox label — “Welsh placeholder”

 * EN: Table columns (as applicable for active subscriptions):
• “Case name”
• “Party name”
• “Reference number”
• “Court or tribunal name”
• “Date added”
• “Actions”

 * CY: Table columns — “Welsh placeholder” × 6

 * EN: Button — “Bulk unsubscribe”

 * CY: Button — “Welsh placeholder”

## **Errors**
 * If the subscription list fails to load:

 ** EN: “We could not load your subscriptions. Try again later.”

 ** CY: “Welsh placeholder”

## **Back navigation**
 * Back returns to Dashboard.

~~--~~
# **Page 2 — Are you sure you want to remove these subscriptions?**
## **Form fields**
 * **Confirmation radio group**

 ** Input type: radio buttons

 ** Required: Yes

 ** Options:
• Yes
• No

 ** Validation rules:

 *** User must select one option.

 * **Continue**

 ** Input type: button

## **Content**
 * EN: Title/H1 — “Are you sure you want to remove these subscriptions?”

 * CY: Title/H1 — “Ydych chi’n siŵr eich bod eisiau dileu’r tanysgrifiadau hyn?”

 * EN: Table showing selected subscriptions

 ** Column headings (based on subscription type):
• “Case name”
• “Party name”
• “Reference number”
• “Court or tribunal name”
• “Date added”

 * CY: Table headings — “Welsh placeholder” × 5

 * EN: Radio options — “Yes”, “No”

 * CY: Radio options — “Welsh placeholder”, “Welsh placeholder”

 * EN: Button — “Continue”

 * CY: Button — “Dewiswch opsiwnv”

## **Errors**
 * EN: “Select whether you want to remove these subscriptions.”

 * CY: “Welsh placeholder”

## **Back navigation**
 * Back returns to Your Email Subscriptions page with selections retained.

~~--~~
# **Page 3 — Email Subscriptions Updated (Success Page)**
## **Form fields**
 * **Navigation links**

 ** Input type: links

 ** Required: No

 ** Options:
• Add a new email subscription
• Manage your current email subscriptions
• Find a court or tribunal

## **Content**
 * EN: Title/H1 — “Email subscriptions updated” (displayed inside a green success banner)

 * CY: Title/H1 — “Tanysgrifiadau e-bost wedi’u diweddaru”

 * EN: Body text — “To continue, you can go to your account in order to:”

 * CY: Body text — “I barhau, gallwch fynd i’ch eich cyfrif Er mwyn”

 * EN: Bullet list items:
• “add a new email subscription”
• “Manage your current email subscription”
• “find a court or tribunal”

 * CY: Bullet list items — “ychwanegu tanysgrifiadau newydd”, “Rheoli eich tanysgrifiadau e-bost cyfredol”, “dod o hyd i lys neu dribiwnlys”

## **Errors**
 * None for this page.

## **Back navigation**
 * Back link returns to the previous confirmation page (no resubmission occurs).

~~--~~
# **Accessibility**
 * All pages comply with WCAG 2.2 AA standards.

 * All links, buttons, radio buttons, checkboxes, tables, and banners must be fully accessible via keyboard.

 * Screen readers announce:

 ** Page titles

 ** Table headers

 ** Selected/unselected states of checkboxes and radio buttons

 ** Error messages when they appear

 ** Success banner content

 * Focus order must follow a logical top~~to~~bottom, left~~to~~right reading sequence.

 * Radio groups must include semantic grouping and ARIA attributes.

 * Bulk selection checkbox must correctly announce “checked”, “unchecked”, and “selects all items”.

 * Bilingual content must switch fully when Welsh is chosen, including headings, labels, button text, error messages, table headings and links.

~~--~~
# **Test Scenarios**
### **Dashboard & Navigation**
 * Verified user signs in and sees “Court and tribunal hearings”, “Dashboard”, and “Email subscriptions” tabs.

 * User clicks “Email subscriptions” → Your Email Subscriptions page loads.

### **Bulk Mode Activation**
 * “Bulk unsubscribe” tab is visible beside “Add email subscription”.

 * Clicking “Bulk unsubscribe” displays checkbox column.

### **Selecting Items**
 * Ticking header checkbox selects all subscription rows.

 * Unticking header deselects all.

 * Selecting individual checkboxes works correctly.

### **Bulk Unsubscribe Button**
 * When no items selected → button disabled.

 * When at least one item selected → button enabled.

 * Clicking button navigates to confirmation page.

### **Confirmation Page**
 * Table displays only selected items.

 * Selecting no radio → error.

 * Selecting “No” → user returned to “Your email subscriptions”.

 * Selecting “Yes” → subscriptions removed and user navigated to success page.

### **Success Page**
 * Displays green banner with “Email subscriptions updated”.

 * Three bullet options appear.

 * Links navigate to correct locations.

### **Database Updates**
 * When “Yes” is selected, all chosen subscriptions are deleted from the user’s subscription table.

 * After deletion, those subscriptions no longer appear in “Your email subscriptions”.

### **Accessibility**
 * Keyboard navigation reaches all controls.

 * Screen reader correctly announces checkboxes, radio buttons, tables, and success messages.', 'functional', 'verified', 'medium', 'story', 295, 'https://github.com/hmcts/cath-service/issues/295', '2026-01-20T17:19:59Z', '2026-01-30T14:03:08Z', 'linusnorton', 'linusnorton'),
  (73, 'REQ-0073', 'Verified user - Select & Edit List Type (List Type Subscription Only)', '**PROBLEM STATEMENT**

Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH and subscribe to email notifications from CaTH and also select specific list types of interest.

 

**AS A** Verified Media User

**I WANT** to select specific list types when subscribing to hearing lists in CaTH

**SO THAT** I can only receive email notifications for the selected list types

 

**Pre-conditions:**
 * The user has valid credentials and is already approved as a verified media user.
 * Only published information is available for searching, per system restriction.
 * Email notifications are implemented in Gov Notify
 * VIBE-309 have been implemented

 

**Technical Specification:**
 * On Page 5: Select list types, you need to check sub~~jurisdiction of the location and find all the lists which have matching sub~~jurisdiction.
 * Create a new database table for list type subscription.
 * To trigger subscription notification email for list type, when publication is received, all the subscribers who are subscribe to that list type and language will get notification email.
 * List type subscription is not linked with location. 
 * On Edit list type page, you show all the list types which are matching with the sub-jurisdiction of the selected list type. Display all the lists and tick only those ones which are subscriber the user.

 

**ACCEPTANCE CRITERIA**
 * When a verified media user signs into CaTH, the verified user can see the green ‘Add email subscription’ button when the user clicks on the ‘Email subscriptions’ tab to subscribe to hearing lists and sees a page with a header title ‘Your email subscriptions’
 * The verified user must be able to add a new subscription via the **“Add email subscription”** link on ''{*}Your email subscriptions'' page{*}.
 * When the user clicks the ‘Add email subscription’ button, the user is taken to a page with header title ‘How do you want to add an email subscription’
 * Where the user does not have any existing subscriptions, then the following message is displayed under the ''Add email subscription'' tab; ''You do not have any active subscriptions'' 
 * Where the user has an existing subscription, then a table with columns titled ‘Court or tribunal name’, ‘Date added’ and ‘Actions’ is displayed under the green  ''Add email subscription'' tab with details of all the existing subscriptions
 * When the user clicks on the ''Add email subscription'' tab, the user is taken to the page titled ‘{**}How do you want to add an email subscription?’{**} and underneath the page title, user can see the following message ‘You can only search for information that is currently published.’
 * User can see 3 radio button options; ‘By court or tribunal name'', ‘By case name’ and ‘By case reference number, case ID or unique reference number (URN)’
 *  The user can make one selection and then click the green continue button to progress to the next page
 * Clicking Continue without selecting an option must trigger a validation error.
 * where the user clicks the ‘By court or tribunal name'', the user is taken to ''Subscribe ‘By court or tribunal name'' page where the user sees all the available venues in CaTH. underneath the page title, the following message is displayed ; ''Subscribe to receive hearings list by court or tribunal'' 
 * In the filter tab on the left side of the page, the user sees 2 filter accordions open by default with the options ''Jurisdiction'' and ''Region''
 * if a jurisdiction is selected, then a pop-up filter for type of court'' comes up.
 * The jurisdiction filter selection can result in multiple valid court types, and in this case, all relevant pop-ups for each selection must appear.
 ** When subscribing by court or tribunal name, the user must be able to:
 *** Search for a court or tribunal.
 *** Select one or more jurisdictions.
 **** See a pop~~up map of corresponding *court types** for each jurisdiction selected (multiple pop~~ups may appear).
 * the user clicks the green ''Continue'' button to be taken to the ''Your email subscriptions'' page which displays the selected court or tribunal name and actions in the table columns and the selected venues in rows with ''Remove'' link under actions in each row.

 * 
 ** User must be able to:
 **** Confirm by selecting *Continue**
 *** Remove a list type from this screen without leaving the page
 *** Change the version (returns user to the List Version screen)
 *** Add another subscription (returns to Add subscription screen)
 * when user clicks the ''continue button, user is taken to the ''Select list types'' page where the user must be presented with an option to select **list types** relevant to the court or tribunal they selected.
 * under the page title, the following text is written '' Choose the lists you will receive for your selected courts and tribunals. This will not affect any specific cases you may have subscribed to. Also don''t forget to come back regularly to see new list types as we add more.''

 * the user selects from the list types displayed by ticking the check boxes on the left just before each list provided in the rows
 * list types are arranged alphabetically, with the alphabet first on the row to indicate list types starting with that alphabet. the checkbox comes after the letter and before the list type
 * user must be able to select one or more list types.
 * No error should be shown if the user selects *no court type* — the flow must still proceed to {*}Your email subscriptions{*}.
 * If the user selects **“Edit list type”** from ''{*}Your email subscriptions'' page{*}, then the user must be taken directly to the list-type selection screen (Screen 5a).

 * If the user clicks **Continue** without selecting any list type, an error message must be displayed:

 * 
 *** *There is a problem. Please select a list type to continue”**

 * Upon selecting valid list types and clicking continue, the user is taken to the next page titled ''What version of the list type do you want to receive?'' page.

 * The user must choose one **list version** from the 3 radio button options (English, Welsh, English and Welsh) before clicking the green ''Continue'' button to proceed to the confirmation page

 * If no version is selected, an error is shown:

 * 
 *** *“There is a problem. Please select version of the list type to continue”**

 * on the **Confirmation** page, under the page title ''Confirm your email subscriptions'', user can see the selected options

 * 3 tables are displayed with headers

 * 
 ** Court or tribunal name
 ** List type

 * 
 ** Version 

 *  Beside the table name, under the ''Actions'' column, user can see link to ''Remove'' the court or tribunal name and list type and to change the version
 * A link to ''Add another email subscription'' is provided under the tables, followed by a green ''Confirm subscriptions'' button which takes user to the final confirmation page
 ** User must be able to:
 **** Confirm by selecting *Continue**
 *** Remove a list type from this screen without leaving the page
 *** Change the version (returns user to the List Version screen)
 *** Add another subscription (returns to Add subscription screen)

 * On confirmation:

 * 
 ** The subscription is updated to include the list types selected.
 ** The confirmation page displays the page header ''Subscription confirmation'' in a green banner.
 * The user can navigate back to manage subscriptions, ''add another subscription'', ''manage your current email subscriptions'', ''find a court or tribunal'' or ''select which list type to receive'' by using the links under the green banner
 * Back link must be available on every page and must return the user to the **previous step** without losing state.
 * The system must prevent or avoid creating duplicate subscriptions for the same:

 * 
 ** Court or tribunal

 * 
 ** List type(s)

 * 
 ** List versions

 * All CaTH page specifications are maintained 

 

 

Page 1 – Your email subscriptions
## **Form fields**
 * **Add email subscription (button)**

 * 
 ** Input type: button

 * 
 ** Required: No

 * 
 ** Validation: None

 * **Remove subscription (per row)**

 * 
 ** Input type: link

 * 
 ** Required: No

 * 
 ** Validation: None

*Table fields are system-generated.*
## **Content**
 * EN: Title/H1 “Your email subscriptions”

 * CY: Title/H1 “Eich tanysgrifiadau e-bost”

 * EN: Button — “Add email subscription” (green)

 * CY: Button — “Ychwanegu Tanysgrifiadau e-bost”

 * EN (empty state): “You do not have any active subscriptions”

 * CY (empty state): “Nid oes gennych unrhyw danysgrifiadau gweithredol”

 * EN: Table columns — “Court or tribunal name”, “Date added”, “Actions”

 * CY: Table columns — “Enw’r llys neu’r tribiwnlys”, “Dyddiad wedi’i ychwanegu”, “Camau gweithredu”

## **Errors**
 * None on this page.

## **Back navigation**
 * Back link returns user to previous signed-in landing page (Verified user dashboard).

 

Page 2 – How do you want to add an email subscription?
## **Form fields**
 * **Subscription method**

 * 
 ** Input type: radio

 * 
 ** Required: Yes

 * 
 ** Options:

 * 
 ** 
 *** By court or tribunal name

 * 
 ** 
 *** By case name

 * 
 ** 
 *** By case reference number, case ID or URN

 * 
 ** Validation:

 * 
 ** 
 *** If no option selected → error “Select how you want to add an email subscription.”

 * **Continue button**

 * 
 ** Input type: button

 * 
 ** Required: No

## **Content**
 * EN: Title/H1 “How do you want to add an email subscription?”

 * CY: Title/H1 “Sut ydych chi eisiau ychwanegu tanysgrifiad e-bost?”

 * EN: Hint text — “You can only search for information that is currently published.”

 * CY: Hint text — “Gallwch ond chwilio am wybodaeth sydd eisoes wedi’i chyhoeddi.”

 * EN: Radio options — “By court or tribunal name”, “By case name”, “By case reference number, case ID or unique reference number (URN)”

 * CY: Radio options — “Yn ôl enw’r llys neu dribiwnlys”, “Yn ôl enw’r achos”, “Yn ôl cyfeirnod yr achos, ID yr achos neu gyfeirnod unigryw (URN)”

 * EN: Button — “Continue”

 * CY: Button — “Parhau”

## **Errors**
 * EN: Summary title — “There is a problem”

 * EN: Message — “Select how you want to add an email subscription.”

 * CY: “Mae yna broblem”, “Welsh placeholder”

## **Back navigation**
 * Back returns to {**}Your email subscriptions{**}.

 

Page 3 – Subscribe by court or tribunal name
## **Form fields**
 * **Search input**

 * 
 ** Input type: text

 * 
 ** Required: No

 * 
 ** Validation: None

 * **Jurisdiction filters**

 * 
 ** Input type: checkbox

 * 
 ** Required: No

 * 
 ** Validation: Each selection triggers corresponding court~~type pop~~up

 * **Region filters**

 * 
 ** Input type: checkbox

 * 
 ** Required: No

 * 
 ** Validation: None

 * **Court~~type selections (pop~~up filters)**

 * 
 ** Input type: checkbox

 * 
 ** Required: No

 * 
 ** Validation: None

 * **Continue button**

 * 
 ** Input type: button

 * 
 ** Required: No

 * 
 ** Validation: No error if the user selects nothing

## **Content**
 * EN: Title/H1 “By court or tribunal name”

 * CY: Title/H1 “Yn ôl enw’r llys neu dribiwnlys”

 * EN: Hint text — “Subscribe to receive hearings list by court or tribunal”

 * CY: Hint text — “Tanysgrifio i dderbyn rhestr wrandawiadau yn ôl llys neu dribiwnlys”

 * EN: Filter headings — “Jurisdiction”, “Region”

 * CY: Filter headings — “Awdurdodaeth”, “Rhanbarth”

 * EN: Pop-up filter heading — “Type of court”

 * CY: Pop-up filter heading — “Math o lys”

 * EN: Button — “Continue”

 * CY: Button — “Parhau”

## **Errors**
 * None — user is allowed to continue without choosing any court.

## **Back navigation**
 * Back returns to **How do you want to add an email subscription?**

 

**Page 4 – Your email subscriptions (Selected venues)**
## **Form fields**
 * **Remove (per row)**

 * 
 ** Input type: link

 * 
 ** Required: No

 * **Continue button**

 * 
 ** Input type: button

 * 
 ** Required: No

 * **Add another subscription**

 * 
 ** Input type: link

 * 
 ** Required: No

## **Content**
 * EN: Title/H1 “Your email subscriptions”

 * CY: Title/H1 “Eich tanysgrifiadau e-bost”

 * EN: Table headings — “Court or tribunal name”, “Actions”

 * CY: “Enw’r llys neu’r tribiwnlys”, “Camau gweithredu”

 * EN: Links — “Remove”, “Add another email subscription”

 * CY: “Dileu”, “Ychwanegu tanysgrifiad e-bost arall“

 * EN: Button — “Continue”,  

 * CY: Button — “Parhau”

## **Errors**
 * None.

## **Back navigation**
 * Back returns to {**}Subscribe by court or tribunal name{**}, preserving previous selections.

 

Page 5 – Select list types
## **Form fields**
 * **List type selection**

 * 
 ** Input type: checkbox

 * 
 ** Required: No (but required to proceed)

 * 
 ** Validation:

 * 
 ** 
 *** If none selected → “Please select a list type to continue.”

 * **Continue button**

 * 
 ** Input type: button

 * 
 ** Required: No

## **Content**
 * EN: Title/H1 “Select list types”

 * CY: “Dewis Mathau o Restri”

 * EN: Description—
“Choose the lists you will receive for your selected courts and tribunals.
This will not affect any specific cases you may have subscribed to.
Also don''t forget to come back regularly to see new list types as we add more.”

 * CY: “Dewiswch y rhestrau y byddwch yn eu derbyn ar gyfer y llysoedd a''r tribiwnlysoedd a ddewiswyd gennych. Ni fydd hyn yn effeithio ar unrhyw achosion penodol yr ydych efallai wedi tanysgrifio iddynt. Hefyd, peidiwch ag anghofio dychwelyd yn rheolaidd i weld mathau newydd o restri wrth i ni ychwanegu mwy.”

 * EN: List type table headings — alphabetical group, checkbox, list name

 * CY: “Welsh placeholder”

 * EN: Button — “Continue”

 * CY: “Parhau”

## **Errors**
 * EN: Summary title — “There is a problem”

 * EN: Message — “Please select a list type to continue”

 * CY: “Mae yna broblem”, “Dewiswch opsiwn math o restr”

## **Back navigation**
 * Back returns to {**}Your email subscriptions (selected venues){**}.

 

Page 6 – Select list version
## **Form fields**
 * **Version**

 * 
 ** Input type: radio

 * 
 ** Required: Yes

 * 
 ** Options: English, Welsh, English and Welsh

 * 
 ** Validation: If not selected → “Please select version of the list type to continue”

 * **Continue button**

 * 
 ** Input type: button

 * 
 ** Required: No

## **Content**
 * EN: Title/H1 “What version of the list type do you want to receive?”

 * CY: “Pa fersiwn o''r rhestr ydych chi am ei derbyn?”

 * EN: Radio options — “English”, “Welsh”, “English and Welsh”

 * CY: “Saesneg”, “Cymraeg”, “Cymraeg a Saesneg”

 * EN: Button — “Continue”

 * CY: “Parhau”

## **Errors**
 * EN: Summary — “There is a problem”

 * EN: Message — “Please select version of the list type to continue”

 * CY: “Dewiswch fersiwn o''r math o restr Dewiswch opsiwn”

## **Back navigation**
 * Back returns to {**}Select list types{**}, retaining selections.

 

Page 7 – Confirm your email subscriptions
## **Form fields**
 * **Remove list type**

 * 
 ** Input type: link

 * 
 ** Required: No

 * **Change version**

 * 
 ** Input type: link

 * 
 ** Required: No

 * **Add another email subscription**

 * 
 ** Input type: link

 * 
 ** Required: No

 * **Confirm subscriptions**

 * 
 ** Input type: button

 * 
 ** Required: No

## **Content**
 * EN: Title/H1 “Confirm your email subscriptions”

 * CY: “Cadarnhewch eich tanysgrifiadau e-bost”

 * EN: Three tables with headings:

 * 
 ** Court or tribunal name

 * 
 ** List type

 * 
 ** Version

 * CY: “Enw’r llys neu’r tribiwnlys”, “math o restr”, “Fersiwn”

 * EN links: “Remove”, “Change version”, “Add another email subscription”

 * CY: Dileu, placeholder, Ychwanegu tanysgrifiad e-bost arall

 * EN button: “Confirm subscriptions”

 * CY: Cadarnhau tanysgrifiadau

## **Errors**
 * None.

## **Back navigation**
 * Back returns to {**}Select list version{**}.

 

Page 8 – Subscription confirmation
## **Form fields**
 * None.

## **Content**
 * EN: Title/H1 (green banner) — “Subscription confirmation”

 * CY: “Cadarnhau tanysgrifiad”

 * EN: Options displayed as links:

 * 
 ** Add another subscription

 * 
 ** Manage your current email subscriptions

 * 
 ** Find a court or tribunal

 * 
 ** Select which list type to receive

 * CY: Ychwanegu tanysgrifiad e-bost arall, Rheoli eich tanysgrifiadau presennol, dod o hyd i lys neu dribiwnlys, Dewiswch pa fath o restri yr hoffech gael

## **Errors**
 * None.

## **Back navigation**
 * Back returns to {**}Confirm your email subscriptions{**}.

 
# **Accessibility**
 * Must comply with WCAG 2.2 AA and GOV.UK Design System.

 * All radio, checkbox, link, and button elements must be keyboard operable.

 * Error summaries must be announced and include anchor links.

 * Filters and pop-ups must be accessible via keyboard and screen readers.

 * Table structures must use semantic markup.

 * Back link must be the first interactive element on each page.

 
# **Test Scenarios**
 * Verified media user can access “Your email subscriptions”.

 * Add email subscription shows correct radio choices.

 * Attempting to continue without choosing radio option shows error.

 * Court/tribunal filters behave as expected (multiple pop-ups).

 * Continue without selecting any venue proceeds without error.

 * Selected venues appear with Remove option.

 * List type page enforces mandatory selection.

 * Version page enforces mandatory selection.

 * Confirmation page reflects all selections.

 * Remove and change version links function without leaving state.

 * Final confirmation page displays correct banner text.

 * Back links always restore previous state.

 * Duplicate subscription combinations are not allowed.

 

 
 # JIRA~~FORMATTED SPECIFICATION (VIBE~~307)

# VIBE-307 – Select List Types When Subscribing (Technical Specification)
## User Story

As a verified media user, I want to select specific list types when subscribing to hearing lists in CaTH so that I can only receive email notifications for the list types I am interested in.

—
## Page 1 – Your email subscriptions

**System-generated table values.**
### Form fields
 * Add email subscription (button)
 ** Type: button
 ** Required: No

 * Remove (link, per row)
 ** Type: link
 ** Required: No

### Content
 * H1: "Your email subscriptions"
 * Button: "Add email subscription"
 * Empty state: "You do not have any active subscriptions"
 * Table headings: Court or tribunal name | Date added | Actions

### Errors
 * None.

### Back navigation

Returns to verified user dashboard.

—
## Page 2 – How do you want to add an email subscription?
### Form fields
 * Subscription method (radio)
 ** Options: By court or tribunal name; By case name; By case reference number, case ID or URN
 ** Required: Yes
 ** Error: "Select how you want to add an email subscription."

 * Continue (button)

### Content
 * H1: "How do you want to add an email subscription?"
 * Hint: "You can only search for information that is currently published."
 * Radio list displayed as per AC.

### Back navigation

Returns to Your email subscriptions.

—
## Page 3 – Subscribe by court or tribunal name
### Form fields
 * Search (text field)
 ** Required: No

 * Jurisdiction filter (checkbox)
 ** Required: No
 ** Selecting one triggers a “Type of court" pop-up.

 * Region filter (checkbox)
 ** Required: No

 * Type of court (checkbox)
 ** Required: No

 * Continue (button)
 ** No error if nothing selected.

### Content
 * H1: "By court or tribunal name"
 * Helper: "Subscribe to receive hearings list by court or tribunal"
 * Filter accordions: Jurisdiction, Region (open by default)
 * Pop-up filters appear dynamically for selected jurisdictions.

### Back navigation

Returns to “How do you want to add an email subscription?”

—
## Page 4 – Your email subscriptions (Selected Venues)
### Form fields
 * Remove (link, per row)
 * Add another subscription (link)
 * Continue (button)

### Content
 * H1: "Your email subscriptions"
 * Selected venues shown in table
 * Links: Remove; Add another email subscription
 * Button: Continue

### Back navigation

Returns to Subscribe by court or tribunal name.

—
## Page 5 – Select list types
### Form fields
 * List type selection (checkbox)
 ** Required to proceed
 ** Error: "Please select a list type to continue"

 * Continue (button)

### Content
 * H1: "Select list types"
 * Descriptive paragraph from AC
 * Alphabetically grouped list types with letter → checkbox → list name

### Back navigation

Returns to Your email subscriptions (selected venues).

—
## Page 6 – Select list version
### Form fields
 * Version (radio)
 ** Options: English; Welsh; English and Welsh
 ** Required: Yes
 ** Error: "Please select version of the list type to continue"

 * Continue (button)

### Content
 * H1: "What version of the list type do you want to receive?"
 * Radio list shown.

### Back navigation

Returns to Select list types.

—
## Page 7 – Confirm your email subscriptions
### Form fields
 * Remove (link)
 * Change version (link)
 * Add another email subscription (link)
 * Confirm subscriptions (button)

### Content
 * H1: "Confirm your email subscriptions"
 * Three tables shown:
 ** Court or tribunal name
 ** List type
 ** Version
 * Links under Actions: Remove, Change version, Add another email subscription
 * Button: Confirm subscriptions

### Back navigation

Returns to Select list version.

—
## Page 8 – Subscription confirmation
### Content
 * H1 (green banner): "Subscription confirmation"
 * Links:
 ** Add another subscription
 ** Manage your current email subscriptions
 ** Find a court or tribunal
 ** Select which list type to receive

### Back navigation

Returns to confirmation page.

—
## Accessibility
 * Must meet WCAG 2.2 AA and GOV.UK Design System.
 * Errors shown in GOV.UK error summary with anchor links.
 * All filters, pop-ups, tables must be accessible via keyboard and assistive tech.
 * Back link must always retain user input/state.

—
## Test Scenarios
 * See detailed test pack attached in section below.

 

2. FLOW DIAGRAM (TEXT-BASED + OPTIONAL MERMAID)

START
 |
 v
Your email subscriptions (Page 1)
 |
 |-- If no subscriptions → show empty message
 |-- Else → show table + Add email subscription button
 |
 v
Click "Add email subscription"
 |
 v
Page 2: How do you want to add a subscription?
 |
 |-- If no radio selected → error
 |
 v
Select "By court or tribunal name"
 |
 v
Page 3: Court/Tribunal search + filters
 |
 |-- User may select:
 |       - Jurisdiction(s)
 |       - Region(s)
 |       - Court types (pop-ups)
 |-- No selection still allowed
 |
 v
Continue
 |
 v
Page 4: Your email subscriptions (Selected venues)
 |
 |-- User may:
 |       - Remove a venue
 |       - Add another subscription
 |
 v
Continue
 |
 v
Page 5: Select list types
 |
 |-- If no list type selected → error
 |
 v
Continue
 |
 v
Page 6: Select list version
 |
 |-- If no version selected → error
 |
 v
Continue
 |
 v
Page 7: Confirm your email subscriptions
 |
 |-- User may:
 |       - Remove list type
 |       - Change version
 |       - Add another subscription
 |
 v
Confirm subscriptions
 |
 v
Page 8: Subscription confirmation
 |
END

 

Mermaid Diagram (for Confluence / Markdown environments)

flowchart TD

A<Your email subscriptions> --> B<Add email subscription>
B --> C<How do you want to add an email subscription?>

C -->|By court or tribunal name| D<Subscribe by court or tribunal name>
C -->|No selection| C_ERR<Error: Must select an option>

D --> E<Your email subscriptions - selected venues>
E -->|Continue| F<Select list types>
E -->|Remove venue| E
E -->|Add another subscription| B

F -->|No list selected| F_ERR<Error: Select a list type>
F --> G<Select list version>

G -->|No version selected| G_ERR<Error: Select version>
G --> H<Confirm your email subscriptions>

H -->|Remove list type| H
H -->|Change version| G
H -->|Add another subscription| B
H --> I<Subscription confirmation>

I --> END

 

3. DEVELOPER GHERKIN ACCEPTANCE TEST PACK (VIBE-307)

Feature: Subscribing to hearing lists with list~~type selection (VIBE~~307)

  Background:
    Given the user is a verified media user
    And the user is signed in
    And published hearing data is available

  Scenario: User views their email subscriptions
    When the user navigates to the "Your email subscriptions" page
    Then they should see the "Add email subscription" button
    And if they have no subscriptions they should see "You do not have any active subscriptions"
    And if they have subscriptions they should see a table with "Court or tribunal name", "Date added", "Actions"

  Scenario: User attempts to continue without selecting subscription method
    When the user clicks "Add email subscription"
    And the user does not select any radio option
    And the user clicks Continue
    Then an error is shown: "Select how you want to add an email subscription."

  Scenario: User selects "By court or tribunal name"
    When the user selects "By court or tribunal name"
    And the user clicks Continue
    Then the user is taken to the subscription~~by~~court screen
    And filter accordions for Jurisdiction and Region are open by default

  Scenario: Jurisdiction selection triggers type~~of~~court pop-ups
    Given the user is on the subscribe~~by~~court page
    When the user selects a jurisdiction
    Then the corresponding "Type of court" pop-up appears

  Scenario: Multiple pop-ups appear for multiple jurisdiction selections
    Given multiple jurisdictions are selected
    Then pop-ups for each jurisdiction appear simultaneously

  Scenario: User continues with no court selected
    When the user clicks Continue without selecting any court
    Then the system proceeds without error
    And the selected court list on the next page may be empty

  Scenario: User reviews selected venues
    Given the user selected one or more courts
    When the user clicks Continue
    Then the selected venues appear in a table
    And each row contains a "Remove" link

  Scenario: Removing a selected venue
    Given the user is on the selected venues page
    When the user clicks "Remove"
    Then the venue is removed from the table

  Scenario: User proceeds to selecting list types
    When the user clicks Continue
    Then the user is taken to the "Select list types" page

  Scenario: Error when no list type selected
    When the user clicks Continue on the list types page without selecting a type
    Then an error appears: "Please select a list type to continue"

  Scenario: User selects one or more list types
    When the user selects list types
    And clicks Continue
    Then the user is taken to the list version selection page

  Scenario: Error when no version selected
    When the user clicks Continue without selecting a version
    Then an error appears: "Please select version of the list type to continue"

  Scenario: User confirms subscription details
    When the user selects a version
    And clicks Continue
    Then the confirmation page displays tables of:
      | Court or tribunal name |
      | List type |
      | Version |

  Scenario: User removes a list type on confirmation page
    When the user clicks Remove
    Then the list type is removed without navigating away

  Scenario: User changes version on confirmation page
    When the user clicks Change version
    Then the system returns to the list version page with previous data retained

  Scenario: User submits final confirmation
    When the user clicks "Confirm subscriptions"
    Then the subscription is created/updated
    And the user is taken to the "Subscription confirmation" page

  Scenario: Confirmation page options
    Given the user is on the confirmation page
    Then they should see options to:
      | Add another subscription |
      | Manage your current email subscriptions |
      | Find a court or tribunal |
      | Select which list type to receive |', 'functional', 'verified', 'medium', 'story', 296, 'https://github.com/hmcts/cath-service/issues/296', '2026-01-20T17:20:13Z', '2026-05-15T09:36:09Z', 'linusnorton', 'linusnorton'),
  (74, 'REQ-0074', 'Configure List Type and Get List information from database', '**PROBLEM STATEMENT**

In CaTH AI, we are getting list type information from mock file libs/list~~types/common/src/mock~~list-types.ts. Now we have implemented Admin functionality and Location information is storing into database, so we need to store list information into database to make it more flexible. Below will be the list database fields:

 
CREATE TABLE list_types (
    id INTEGER PRIMARY KEY,
    name VARCHAR(1000) NOT NULL,
    friendly_name VARCHAR(1000),
    welsh*friendly*name VARCHAR(255),
    shortened*friendly*name VARCHAR(255),
    url VARCHAR(255),
    default_sensitivity VARCHAR(50),
    allowed_provenance VARCHAR(50) NOT NULL,
    is*non*strategic BOOLEAN DEFAULT false
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

We also need to link list with sub~~jurisdictions. sub~~jurisdictions table has been created already. So you just need to create a table which can link list types with sub-jurisdictions table.

Once tables has been created, You need do implement following functionality:
 * Create a new tile in System admin dashboard named "Configure List Type:
 * Create a screen where you can input all the related information about the list type.
 ** 
name, friendly*name, welsh*friendly*name, shortened*friendly_name and url. These will be text boxes
 ** default_sensitivity will be dropdown with option Public, private and classified
 ** allowed*provenance will be checkbox with values CFT*IDAM, B2C, COMMON_PLATFORM
 ** is*non*strategic will be radio button with Yes or No option
 ** Validation needs to be implemented on all the field. All fields are mandatory
 * Next page will display sub~~jurisdictions as a checkbox and user can select more than one sub~~jurisdictions
 * Preview screen will display all the information which user enter
 * Success screen will display success message aligned with other pages.
 * Update manual and non-strategic upload page to use shortened*friendly*name to populate list type dropdown
 * Create a branch from vibe~~166~~cst~~excel~~list

Once all system admin screen implemented, entered all the information about lists using libs/list~~types/common/src/mock~~list-types.ts. 

Final step is to get all the list type information from database on all the pages where it was using libs/list~~types/common/src/mock~~list~~types.ts. Once this functionality is implemented, delete libs/list~~types/common/src/mock~~list~~types.ts file.
#### Acceptance criteria
 # Move list type information to database tables
 # All System Admin screens have been implemented
 # All the code getting list information from database (not from libs/list~~types/common/src/mock~~list-types.ts)

 

 
# **VIBE-309 — Configure List Types**
## **User Story**

As a System Admin User, I want to configure list types through the System Admin dashboard so that list type information is stored in the database rather than in mock files and can be managed flexibly.
~~--~~
# **Page 1 — System Admin Dashboard (Configure List Type tile)**
## **Form fields**
 * **Configure List Type tile**

 * 
 ** Input type: button (tile)

 * 
 ** Required: N/A (navigation only)

 * 
 ** Validation rules:

 * 
 ** 
 *** Visible only to users with System Admin permissions.

 * 
 ** 
 *** On click, navigates to “Configure List Type – Enter details” page.

## **Content**
 * EN: Title/H1 — “System Admin dashboard”

 * CY: Title/H1 — “Welsh placeholder”

 * EN: Tile label — “Configure List Type”

 * CY: Tile label — “Welsh placeholder”

## **Errors**
 * No field-level errors (no form submission).

 * Page-level error only if the dashboard fails to load.

 * 
 ** EN: “We could not load your system admin tools. Try again later.”

 * 
 ** CY: “Welsh placeholder”

## **Back navigation**
 * Back link not required.

 * Browser back returns to previous page.

~~--~~
# **Page 2 — Configure List Type: Enter Details**
## **Form fields**
 * **name**

 * 
 ** Input type: text

 * 
 ** Required: Yes

 * 
 ** Validation rules:

 * 
 ** 
 *** Maximum length: 1000 characters

 * 
 ** 
 *** Format: free text, no line breaks

 * 
 ** 
 *** Cannot be empty

 * **friendly_name**

 * 
 ** Input type: text

 * 
 ** Required: Yes

 * 
 ** Validation rules:

 * 
 ** 
 *** Maximum length: 1000

 * 
 ** 
 *** Cannot be empty

 * **welsh*friendly*name**

 * 
 ** Input type: text

 * 
 ** Required: Yes

 * 
 ** Validation rules:

 * 
 ** 
 *** Maximum length: 255

 * 
 ** 
 *** Cannot be empty

 * **shortened*friendly*name**

 * 
 ** Input type: text

 * 
 ** Required: Yes

 * 
 ** Validation rules:

 * 
 ** 
 *** Maximum length: 255

 * 
 ** 
 *** Cannot be empty

 * **url**

 * 
 ** Input type: text

 * 
 ** Required: Yes

 * 
 ** Validation rules:

 * 
 ** 
 *** Maximum length: 255

 * 
 ** 
 *** Must be valid relative or absolute path format

 * **default_sensitivity**

 * 
 ** Input type: dropdown

 * 
 ** Required: Yes

 * 
 ** Options:

 * 
 ** 
 *** Public

 * 
 ** 
 *** Private

 * 
 ** 
 *** Classified

 * 
 ** Validation rules:

 * 
 ** 
 *** Option must be selected

 * **allowed_provenance**

 * 
 ** Input type: checkbox group

 * 
 ** Required: Yes

 * 
 ** Options:

 * 
 ** 
 *** CFT_IDAM

 * 
 ** 
 *** B2C

 * 
 ** 
 *** COMMON_PLATFORM

 * 
 ** Validation rules:

 * 
 ** 
 *** At least one option must be selected

 * **is*non*strategic**

 * 
 ** Input type: radio group

 * 
 ** Required: Yes

 * 
 ** Options: Yes / No

 * 
 ** Validation rules:

 * 
 ** 
 *** Exactly one radio option must be selected

 * **Continue**

 * 
 ** Input type: button

 * 
 ** Required: N/A

 * 
 ** Validation rules:

 * 
 ** 
 *** Disabled unless all mandatory fields are complete and valid

## **Content**
 * EN: Title/H1 — “Enter list type details”

 * CY: Title/H1 — “Welsh placeholder”

 * EN: Label — “Name”

 * CY: Label — “Welsh placeholder”

 * EN: Label — “Friendly name”

 * CY: Label — “Welsh placeholder”

 * EN: Label — “Welsh friendly name”

 * CY: Label — “Welsh placeholder”

 * EN: Label — “Shortened friendly name”

 * CY: Label — “Welsh placeholder”

 * EN: Label — “URL”

 * CY: Label — “Welsh placeholder”

 * EN: Dropdown label — “Default sensitivity”

 * CY: Dropdown label — “Welsh placeholder”

 * EN: Dropdown options — “Public”, “Private”, “Classified”

 * CY: Dropdown options — “Welsh placeholder”, “Welsh placeholder”, “Welsh placeholder”

 * EN: Checkbox label — “Allowed provenance”

 * CY: Checkbox label — “Welsh placeholder”

 * EN: Checkbox options — “CFT*IDAM”, “B2C”, “COMMON*PLATFORM”

 * CY: Checkbox options — “Welsh placeholder”, “Welsh placeholder”, “Welsh placeholder”

 * EN: Radio label — “Is non-strategic?”

 * CY: Radio label — “Welsh placeholder”

 * EN: Radio options — “Yes”, “No”

 * CY: Radio options — “Welsh placeholder”, “Welsh placeholder”

 * EN: Button — “Continue”

 * CY: Button — “Welsh placeholder”

## **Errors**
 * For each text field:

 * 
 ** EN: “Enter a value for <field name>.”

 * 
 ** CY: “Welsh placeholder”

 * For sensitivity/select field:

 * 
 ** EN: “Select a default sensitivity.”

 * 
 ** CY: “Welsh placeholder”

 * For provenance:

 * 
 ** EN: “Select at least one allowed provenance.”

 * 
 ** CY: “Welsh placeholder”

 * For non-strategic:

 * 
 ** EN: “Select whether this list type is non-strategic.”

 * 
 ** CY: “Welsh placeholder”

## **Back navigation**
 * EN: “Back” returns to System Admin Dashboard.

 * CY: “Welsh placeholder”

~~--~~
# **Page 3 — Configure List Type: Select Sub-jurisdictions**
## **Form fields**
 * **sub-jurisdictions**

 * 
 ** Input type: checkbox group

 * 
 ** Required: Yes

 * 
 ** Validation rules:

 * 
 ** 
 *** At least one checkbox must be selected

 * 
 ** 
 *** Values must match existing sub-jurisdiction IDs

 * **Continue**

 * 
 ** Input type: button

 * 
 ** Required: N/A

## **Content**
 * EN: Title/H1 — “Select sub-jurisdictions”

 * CY: Title/H1 — “Welsh placeholder”

 * EN: Body text — “Select all sub-jurisdictions that apply to this list type.”

 * CY: Body text — “Welsh placeholder”

 * EN: Checkbox options — dynamically generated from database

 * CY: Checkbox options — “Welsh placeholder”

 * EN: Button — “Continue”

 * CY: Button — “Welsh placeholder”

## **Errors**
 * EN: “Select at least one sub-jurisdiction.”

 * CY: “Welsh placeholder”

## **Back navigation**
 * EN: “Back” returns to the Enter Details page with previously entered values retained.

 * CY: “Welsh placeholder”

~~--~~
# **Page 4 — Configure List Type: Preview**
## **Form fields**
 * No editable form fields; preview only.

 * **Confirm**

 * 
 ** Input type: button

 * 
 ** Required: N/A

 * **Back**

 * 
 ** Input type: link

 * 
 ** Required: No

 * 
 ** Returns to sub-jurisdictions page

## **Content**
 * EN: Title/H1 — “Check list type details”

 * CY: Title/H1 — “Welsh placeholder”

 * EN: Body text — “Review the details before saving.”

 * CY: Body text — “Welsh placeholder”

 * EN: Table headings (all values read-only):

 * 
 ** “Name”

 * 
 ** “Friendly name”

 * 
 ** “Welsh friendly name”

 * 
 ** “Shortened friendly name”

 * 
 ** “URL”

 * 
 ** “Default sensitivity”

 * 
 ** “Allowed provenance”

 * 
 ** “Is non-strategic”

 * 
 ** “Sub-jurisdictions”

 * CY: Table headings — “Welsh placeholder” (one placeholder per heading)

 * EN: Button — “Confirm”

 * CY: Button — “Welsh placeholder”

## **Errors**
 * If preview data cannot be loaded:

 * 
 ** EN: “We could not load the list type details. Try again.”

 * 
 ** CY: “Welsh placeholder”

## **Back navigation**
 * EN: “Back” returns to Select Sub-jurisdictions page.

 * CY: “Welsh placeholder”

~~--~~
# **Page 5 — Configure List Type: Success**
## **Form fields**
 * **Return to System Admin dashboard**

 * 
 ** Input type: link

 * 
 ** Required: No

## **Content**
 * EN: Title/H1 — “List type saved”

 * CY: Title/H1 — “Welsh placeholder”

 * EN: Success banner — “List type saved successfully.”

 * CY: Success banner — “Welsh placeholder”

 * EN: Body text — “What do you want to do next?”

 * CY: Body text — “Welsh placeholder”

 * EN: Link — “Return to System Admin dashboard”

 * CY: Link — “Welsh placeholder”

## **Errors**
 * No field-level errors.

 * If navigation fails:

 * 
 ** EN: “We could not return to the dashboard. Use your browser back button.”

 * 
 ** CY: “Welsh placeholder”

## **Back navigation**
 * Back link not shown (success screen).

 * Browser back returns to Preview but must not re-submit.

~~--~~
# **Accessibility**
 * Complies with WCAG 2.2 AA and GOV.UK Design System patterns.

 * All interactive elements accessible via keyboard and have visible focus.

 * Screen readers correctly announce:

 * 
 ** All form labels

 * 
 ** Error messages

 * 
 ** Success banner using appropriate ARIA role

 * Tables use semantic markup with correct `scope` attributes.

 * Language toggle switches all EN/CY content and updates the HTML `lang` attribute.

 * Accordions, checkboxes, radios, and dropdowns announce their state to assistive technologies.

~~--~~
# **Test Scenarios**
### **Admin Dashboard**
 * When the System Admin dashboard loads, the “Configure List Type” tile is visible to authorised users.

 * When the user selects the tile, they navigate to Enter Details.

### **Enter Details page**
 * When all required fields are empty and Continue is clicked, all relevant errors appear.

 * When valid values are entered for all fields, Continue navigates to Sub-jurisdictions.

### **Sub-jurisdictions page**
 * When no checkbox is selected and Continue is clicked, an error appears.

 * When one or more sub-jurisdictions are selected, Continue navigates to Preview.

### **Preview page**
 * All previously entered values are displayed correctly.

 * Back returns to Sub-jurisdictions with all selections retained.

 * Confirm saves the list type and navigates to Success.

### **Success page**
 * Displays success banner and standard success layout.

 * Link returns to the System Admin dashboard.

### **Database usage**
 * All list type screens retrieve list type and sub-jurisdiction data from the database.

 * No page reads data from the legacy mock~~list~~types.ts file.

### **Accessibility**
 * All pages can be fully navigated by keyboard.

 * Screen reader announces all labels, errors, banners, and headings correctly.

~~--~~
# **Database Specification (Option 2)**
## **Table: list_types**

Fields:
 * id — INTEGER PRIMARY KEY

 * name — VARCHAR(1000) NOT NULL

 * friendly_name — VARCHAR(1000)

 * welsh*friendly*name — VARCHAR(255)

 * shortened*friendly*name — VARCHAR(255)

 * url — VARCHAR(255)

 * default_sensitivity — VARCHAR(50)

 * allowed_provenance — VARCHAR(50) NOT NULL

 * is*non*strategic — BOOLEAN DEFAULT false

 * created_at — TIMESTAMP

 * updated_at — TIMESTAMP

## **Table: list*types*sub_jurisdictions**

Links each list type to one or more sub-jurisdictions.

Fields:
 * id — INTEGER PRIMARY KEY

 * list*type*id — INTEGER (FK → list_types.id)

 * sub*jurisdiction*id — INTEGER (FK → sub_jurisdictions.id)

Constraints:
 * list*type*id and sub*jurisdiction*id must pair uniquely (no duplicates).

 * Deleting a list type removes its linking rows (cascade delete).', 'functional', 'verified', 'medium', 'story', 297, 'https://github.com/hmcts/cath-service/issues/297', '2026-01-20T17:20:28Z', '2026-04-15T09:46:00Z', 'linusnorton', 'linusnorton'),
  (75, 'REQ-0075', 'Blob explorer and manual re-submission trigger functionality.', '**PROBLEM STATEMENT**

System admin users in CaTH access several system functionalities through the System Admin dashboard which allows them to perform administrative tasks.  The dashboard acts as the main control panel for managing reference data, user accounts, media accounts, audit logs, and other administrative operations. This ticket covers the Blob explorer and manual re-submission trigger functionality.

 

 

**AS A** System Admin User

**I WANT** to access the Blob explorer functionality in CaTH

**SO THAT** I can manually re-submit a publication

 

**Technical Specification:**
 * If a user clicks on re-submit for a specific publication, it should trigger subscription notification to all the subscriber for that publication.

 

**ACCEPTANCE CRITERIA**
 * The System Admin Dashboard has several functionality tiles, including the blob explorer tile.
 * Clicking the Blob Explorer tile navigates the user to the **Blob Explorer – Locations** page with page title **“Blob Explorer Locations.”**
 * The page shows the descriptive text: **“Choose a location to see all publications associated with it.”** **and a** table of all venues and how many publications each contains is displayed with the following fields:

 * **Location**
 * **Number of publications per venue**

 
 * Selecting a location opens the ‘{**}Blob Explorer Publications{**}{**}’{**} page with the descriptive text **“Choose a publication from the list.”** under the title and a publication table is shown with:
 *** *Artefact ID** **(clickable link to view blob)**
 *** *List Type**
 *** *Display From / Display To**

 
 * Clicking an Artefact ID opens the **Blob Explorer – JSON file** page **(where the publication is a JSON file)** which allows the system admin to view its metadata, rendered template, and raw JSON content. 
 * The **Blob Explorer – JSON file** page displays a **green “Re-submit subscription” button** *** under the page title and a *Metadata** section in a table with the following fields:
 ** Artefact ID
 ** Location ID
 ** Location Name
 ** Publication Type
 ** List Type
 ** Provenance
 ** Language
 ** Sensitivity
 ** Content Date
 ** Display From / Display To

 
 * A **“Link to rendered template”** is displayed below the table, allowing users to view the rendered publication when clicked.
 * A closed accordion titled **“View Raw JSON Content”** is available; when opened, it displays the raw JSON data.
 * Clicking an Artefact ID opens the **Blob Explorer – Flat file** page **(where the publication is a flat file)** which allows the system admin to view its metadata and file
 * A **“Link to file”** is displayed below the table, allowing users to view the flat file publication when clicked, on a pop-out page if the flat file is a PDF or to a downloaded file if it’s a word document.
 * Where there is a need to manually trigger a re~~submission of the published file, the system admin clicks the **Re~~submit subscription** **button** and the system navigates to a confirmation page which displays a summary table with the following fields:
 ** Location Name
 ** Publication Type
 ** List Type
 ** Provenance
 ** Language
 ** Sensitivity
 ** Content Date
 ** Display From / Display To

 
 * The page includes a **green “Confirm” button** and a {**}“Cancel” link{**}. Selecting **Cancel** returns the user to the **Blob Explorer – Locations** page while selecting **Confirm** proceeds to the submission confirmation page with the header “Submission re-submitted.” in a green banner and the descriptive text: **“What do you want to do next?”** is written under the banner and a link to the **“Blob explorer – Locations”** is provided afterwards and returns the user to the Locations screen.

 

 
# **VIBE~~310 — Blob Explorer & Manual Re~~submission Trigger**
## **User Story**

As a System Admin User, I want to access the Blob Explorer functionality in CaTH so that I can manually re-submit a publication.
~~--~~
# **Page 1 — System Admin Dashboard**
## **Form fields**
 * **Blob Explorer tile**

 * 
 ** Input type: button/tile

 * 
 ** Required: N/A

 * 
 ** Validation rules:

 * 
 ** 
 *** Tile must be visible to System Admin users only.

 * 
 ** 
 *** Clicking the tile navigates to “Blob Explorer – Locations”.

## **Content**
 * EN: Title/H1 — “System Admin dashboard”

 * CY: Title/H1 — “Welsh placeholder”

 * EN: Tile — “Blob explorer”

 * CY: Tile — “Welsh placeholder”

 
## **Errors**
 * If dashboard cannot load:

 * 
 ** EN: “We could not load your system admin tools. Try again later.”

 * 
 ** CY: “Welsh placeholder”

## **Back navigation**
 * Browser back only.

~~--~~
# **Page 2 — Blob Explorer Locations**
## **Form fields**
 * **Location selection**

 * 
 ** Input type: clickable table row

 * 
 ** Required: Yes

 * 
 ** Validation rules:

 * 
 ** 
 *** Selecting a location navigates to “Blob Explorer Publications”.

 * **Locations table (read-only)**

 * 
 ** Columns:
• Location
• Number of publications per venue

 * 
 ** Required: N/A

 * 
 ** Validation rules:

 * 
 ** 
 *** Table populates with all venues in CaTH.

 * 
 ** 
 *** Publication count must be ≥ 0.

## **Content**
 * EN: Title/H1 — “Blob Explorer Locations”

 * CY: Title/H1 — “Welsh placeholder”

 * EN: Body text — “Choose a location to see all publications associated with it.”

 * CY: Body text — “Welsh placeholder”

 * EN: Column headings — “Location”, “Number of publications per venue”

 * CY: Column headings — “Welsh placeholder”, “Welsh placeholder”

## **Errors**
 * EN: “We could not load locations. Try again later.”

 * CY: “Welsh placeholder”

## **Back navigation**
 * Back returns to System Admin dashboard.

~~--~~
# **Page 3 — Blob Explorer Publications**
## **Form fields**
 * **Artefact selection**

 * 
 ** Input type: link (Artefact ID)

 * 
 ** Required: Yes

 * 
 ** Validation rules:

 * 
 ** 
 *** Clicking an Artefact ID opens either JSON file page or Flat file page depending on publication type.

 * **Publications table (read-only)**

 * 
 ** Columns:
• Artefact ID (clickable)
• List Type
• Display From
• Display To

 * 
 ** Required: N/A

 * 
 ** Validation rules:

 * 
 ** 
 *** Must list all publications for the selected location.

## **Content**
 * EN: Title/H1 — “Blob Explorer Publications”

 * CY: Title/H1 — “Welsh placeholder”

 * EN: Body text — “Choose a publication from the list.”

 * CY: Body text — “Welsh placeholder”

 * EN: Column headings — “Artefact ID”, “List type”, “Display from”, “Display to”

 * CY: Column headings — “Welsh placeholder” × 4

## **Errors**
 * EN: “We could not load publications for this location.”

 * CY: “Welsh placeholder”

## **Back navigation**
 * Back returns to Blob Explorer Locations.

~~--~~
# **Page 4A — Blob Explorer – JSON File**
## **Form fields**
 * **Re-submit subscription**

 * 
 ** Input type: button (green)

 * 
 ** Required: No

 * 
 ** Validation rules:

 * 
 ** 
 *** Clicking navigates to confirmation page.

 * **Metadata table (read-only)**

 * 
 ** Fields:
• Artefact ID
• Location ID
• Location Name
• Publication Type
• List Type
• Provenance
• Language
• Sensitivity
• Content Date
• Display From
• Display To

 * 
 ** Required: N/A

 * **View Raw JSON Content accordion**

 * 
 ** Input type: accordion

 * 
 ** Required: No

 * 
 ** Validation rules:

 * 
 ** 
 *** Closed by default; expands to display raw JSON.

 * **Link to rendered template**

 * 
 ** Input type: link

 * 
 ** Required: No

## **Content**
 * EN: Title/H1 — “Blob Explorer – JSON file”

 * CY: Title/H1 — “Welsh placeholder”

 * EN: Button — “Re-submit subscription”

 * CY: Button — “Welsh placeholder”

 * EN: Section heading — “Metadata”

 * CY: Section heading — “Welsh placeholder”

 * EN: Accordion title — “View Raw JSON Content”

 * CY: Accordion title — “Welsh placeholder”

 * EN: Link — “Link to rendered template”

 * CY: Link — “Welsh placeholder”

## **Errors**
 * EN: “We could not load the JSON publication.”

 * CY: “Welsh placeholder”

## **Back navigation**
 * Back returns to Blob Explorer Publications.

~~--~~
# **Page 4B — Blob Explorer – Flat File**
## **Form fields**
 * **Re-submit subscription**

 * 
 ** Input type: button (green)

 * **Metadata table (read-only)**

 * 
 ** Same fields as JSON file page.

 * **Link to file**

 * 
 ** Input type: link

 * 
 ** Required: No

 * 
 ** Validation rules:

 * 
 ** 
 *** If PDF → opens in pop-out view.

 * 
 ** 
 *** If Word doc → triggers file download.

## **Content**
 * EN: Title/H1 — “Blob Explorer – Flat file”

 * CY: Title/H1 — “Welsh placeholder”

 * EN: Button — “Re-submit subscription”

 * CY: Button — “Welsh placeholder”

 * EN: Section heading — “Metadata”

 * CY: Section heading — “Welsh placeholder”

 * EN: Link — “Link to file”

 * CY: Link — “Welsh placeholder”

## **Errors**
 * EN: “We could not load the file publication.”

 * CY: “Welsh placeholder”

## **Back navigation**
 * Back returns to Blob Explorer Publications.

~~--~~
# **Page 5 — Confirm Subscription Re-submission**
## **Form fields**
 * **Confirm**

 * 
 ** Input type: button (green)

 * 
 ** Required: No

 * 
 ** Validation rules:

 * 
 ** 
 *** Confirms re-submission and navigates to success page.

 * **Cancel**

 * 
 ** Input type: link

 * 
 ** Required: No

 * 
 ** Validation rules:

 * 
 ** 
 *** Returns user to Blob Explorer Locations.

 * **Summary table (read-only)**

 * 
 ** Fields:
• Location Name
• Publication Type
• List Type
• Provenance
• Language
• Sensitivity
• Content Date
• Display From
• Display To

## **Content**
 * EN: Title/H1 — “Confirm subscription re-submission”

 * CY: Title/H1 — “Welsh placeholder”

 * EN: Table headings — as listed above

 * CY: Table headings — “Welsh placeholder” × 9

 * EN: Button — “Confirm”

 * CY: Button — “Welsh placeholder”

 * EN: Link — “Cancel”

 * CY: Link — “Welsh placeholder”

## **Errors**
 * EN: “We could not re-submit this publication. Try again later.”

 * CY: “Welsh placeholder”

## **Back navigation**
 * Back returns to JSON/Flat File page.

~~--~~
# **Page 6 — Submission Re-submitted**
## **Form fields**
 * **Link to Blob Explorer Locations**

 * 
 ** Input type: link

 * 
 ** Required: No

## **Content**
 * EN: Title/H1 — “Submission re-submitted”

 * CY: Title/H1 — “Welsh placeholder”

 * EN: Success banner text — “Submission re-submitted.”

 * CY: Success banner text — “Welsh placeholder”

 * EN: Body text — “What do you want to do next?”

 * CY: Body text — “Welsh placeholder”

 * EN: Link — “Blob explorer – Locations”

 * CY: Link — “Welsh placeholder”

## **Errors**
 * None

## **Back navigation**
 * Browser back returns to confirmation page but must not re-submit.

~~--~~
# **Accessibility**
 * All screens must comply with WCAG 2.2 AA.

 * Buttons, links, tiles, tables, and accordions support keyboard navigation.

 * Focus order follows a logical sequence.

 * Success banners and errors use appropriate ARIA roles.

 * Accordion includes `aria~~expanded` and {{{}aria~~controls{}}}.

 * Tables use semantic {{{}<table>{}}}, {{{}<thead>{}}}, {{{}<tbody>{}}}, and correct header scope.

 * Screen reader users can:

 * 
 ** Identify page titles

 * 
 ** Understand metadata tables

 * 
 ** Detect expanded/collapsed accordion states

 * 
 ** Receive announcements for errors and success messages

 * Bilingual content rendered correctly when language switches.

~~--~~
# **Test Scenarios**
### **Dashboard**
 * Admin user sees Blob Explorer tile.

 * Clicking the tile → Blob Explorer Locations.

### **Locations page**
 * Locations table loads with correct venue counts.

 * Clicking a location → Publications page.

### **Publications page**
 * Publications list loads for selected venue.

 * Clicking an Artefact ID → loads correct JSON or Flat File page.

### **JSON File page**
 * Metadata table displays all required fields.

 * “Link to rendered template” opens rendered publication.

 * Accordion displays raw JSON when opened.

 * Clicking Re-submit subscription → Confirmation page.

### **Flat File page**
 * Metadata table displays all fields.

 * “Link to file” opens or downloads appropriate file.

 * Clicking Re-submit subscription → Confirmation page.

### **Confirmation page**
 * Summary values match metadata.

 * Cancel → Locations page.

 * Confirm → Success page.

### **Success page**
 * Success banner shown.

 * “Blob explorer – Locations” link returns to Locations.

### **Accessibility**
 * All interactive elements reachable by keyboard.

 * Screen readers announce all metadata, errors, and success states.', 'functional', 'verified', 'medium', 'story', 298, 'https://github.com/hmcts/cath-service/issues/298', '2026-01-20T17:20:45Z', '2026-01-30T14:03:57Z', 'linusnorton', 'linusnorton'),
  (76, 'REQ-0076', 'Audit Log View', '### **PROBLEM STATEMENT**

System admin users in CaTH access several system functionalities through the System Admin dashboard which allows them to perform administrative tasks.  The dashboard acts as the main control panel for managing reference data, user accounts, media accounts, audit logs, and other administrative operations. This ticket covers the  the end~~to~~end navigation of the Audit Log View process which is covered across three screens; Dashboard, Audit Log List View and Individual Audit Log Detail View.

 

**AS A** system Admin  
**I WANT** to view the full list and individual audit log entries
**So that** I can monitor and review system activity

 

+**Technical Criteria**+
 # New audit*log table is created with ID (PK), timestamp, action, details, user*id, user*email, user*role, user_provenance
 # The audit log table captures all admin actions and is populated immediately a new action is performed by the admin.

### **ACCEPTANCE CRITERIA** 
 * System Admin Users can access the Audit Log Viewer tab from the system admin dashboard.

 * When the system admin user clicks on the “Audit Log Viewer” tab, then the user is taken to the Audit log list view screen which displays all available audit log entries in a table with 3 columns; Timestamp, Email and Action

 * The date and time are displayed in the timestamp column, followed by the user''s email address n the email column and the action carried out by the user in the action column. This is followed by another column with a ''view'' link beside each entry row

 * The date and time are displayed in the following format;

 * 
 ** Date (dd/mm/yyyy)

 * 
 ** Timestamp (hr:min:sec)

 * Audit log entries must be sorted by most recent first.

 * the filter tab on the left side of the screen has a grey section at the top that displays the selected filter options and the ''clear filter'' link. This is followed by a green ''Apply filters'' button and then the email and user ID search fields. The user ID search field displays the following descriptive message above the search field ''Must be an exact match''. Next is the Filter date filter option with the descriptive message ''For example, 27 3 2007'' written above the ''day'', ''month'' and ''year'' fields and lastly the ''Actions'' filter option that provides the various actions that can be filtered on with check boxes (see attached)
 *  When a system admin clicks the "View" link, they see full audit details for the individual entry in a table with the following rows; User ID, Email, Role, Provenance, Action and Details. 
 * Users can return to the top by clicking the ''Back to top'' arrow at the bottom of the screen and the list of audit entries by clicking the back link at the top right of the screen

 * Only system admins have the permission to access the Audit Log Viewer.
 * The Audit log table is created in the database with the following data fields; User ID, Email, Role, Provenance, Action and Details
 * The audit log table captures all actions of the system admin and is populated immediately a new action is performed by the system admin.

 

 

**Technical Specifications**

**User Story**

As a system admin
I want to view the full list of audit logs and individual audit log entries
So that I can monitor and review system activity.

 

**Page: System Admin Dashboard**

**Form fields**
 * None

**Content**
 * EN: Title/H1 “System admin dashboard”

 * CY: Title/H1 “Welsh placeholder”

 * EN: Navigation tab — “Audit Log Viewer”

 * CY: Navigation tab — “Welsh placeholder”

**Errors**
 * EN: “You do not have permission to access this service”

 * CY: “Welsh placeholder”

**Back navigation**
 * Not applicable (entry point).

 

**Page: Audit Log List View**

**Form fields**
 * Email search

 * 
 ** Input type: text

 * 
 ** Required: No

 * 
 ** Validation rules:

 * 
 ** 
 *** Must be a valid email format if entered

 * 
 ** 
 *** Maximum length: 254 characters

 * User ID search

 * 
 ** Input type: text

 * 
 ** Required: No

 * 
 ** Validation rules:

 * 
 ** 
 *** Must be an exact match

 * 
 ** 
 *** Alphanumeric only

 * 
 ** 
 *** Maximum length: 50 characters

 * Filter date

 * 
 ** Input type: date (split fields: day / month / year)

 * 
 ** Required: No

 * 
 ** Validation rules:

 * 
 ** 
 *** Must be a valid calendar date

 * 
 ** 
 *** Format guidance displayed to user

 * Actions filter

 * 
 ** Input type: checkbox group

 * 
 ** Required: No

 * 
 ** Validation rules:

 * 
 ** 
 *** One or more actions may be selected

**Content**
 * EN: Title/H1 “Audit log viewer”

 * CY: Title/H1 “Welsh placeholder”

 * EN: Table column headers — “Timestamp”, “Email”, “Action”, “View”

 * CY: Table column headers — “Welsh placeholder”, “Welsh placeholder”, “Welsh placeholder”, “Welsh placeholder”

 * EN: Timestamp format guidance — “Date (dd/mm/yyyy) Time (hh:mm:ss)”

 * CY: Timestamp format guidance — “Welsh placeholder”

 * EN: Filter panel heading — “Filters”

 * CY: Filter panel heading — “Welsh placeholder”

 * EN: Selected filters summary text — “Selected filters”

 * CY: Selected filters summary text — “Welsh placeholder”

 * EN: Link — “Clear filters”

 * CY: Link — “Welsh placeholder”

 * EN: Button — “Apply filters”

 * CY: Button — “Welsh placeholder”

 * EN: User ID helper text — “Must be an exact match”

 * CY: Helper text — “Welsh placeholder”

 * EN: Date helper text — “For example, 27 3 2007”

 * CY: Helper text — “Welsh placeholder”

 * EN: Action link — “View”

 * CY: Action link — “Welsh placeholder”

**Errors**
 * EN: “There are no audit log entries that match your filters”

 * CY: “Welsh placeholder”

 * EN: “Enter a valid date”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back link returns to System Admin Dashboard.

 

**Page: Individual Audit Log Detail View**

**Form fields**
 * None (read-only)

**Content**
 * EN: Title/H1 “Audit log entry details”

 * CY: Title/H1 “Welsh placeholder”

 * EN: Table row labels — “User ID”, “Email”, “Role”, “Provenance”, “Action”, “Details”

 * CY: Table row labels — “Welsh placeholder”, “Welsh placeholder”, “Welsh placeholder”, “Welsh placeholder”, “Welsh placeholder”, “Welsh placeholder”

 * EN: Link — “Back to audit log list”

 * CY: Link — “Welsh placeholder”

 * EN: Link — “Back to top”

 * CY: Link — “Welsh placeholder”

**Errors**
 * EN: “Audit log entry could not be found”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back link returns to Audit Log List View with filters retained.

 

**Accessibility**
 * Access to the Audit Log Viewer is restricted to system admin users only.

 * All pages must meet WCAG 2.2 AA standards.

 * Tables must use proper semantic markup with header associations.

 * Filter controls must be keyboard accessible and clearly labelled.

 * Error messages must be announced to assistive technologies.

 * “Back to top” link must move focus to the page heading.

 

**Test Scenarios**
 * System admin can access Audit Log Viewer from the dashboard.

 * Non-system admin users are prevented from accessing the Audit Log Viewer.

 * Audit log entries are displayed sorted by most recent first.

 * Timestamp displays date and time in the specified format.

 * Filters correctly refine audit log results by email, user ID, date and action.

 * Clearing filters resets the results list.

 * Selecting “View” opens the correct individual audit log entry.

 * Audit log detail view displays all required fields.

 * Back navigation returns the user to the previous screen without losing context.

 * Newly performed system admin actions appear immediately in the audit log list.', 'functional', 'verified', 'medium', 'story', 299, 'https://github.com/hmcts/cath-service/issues/299', '2026-01-20T17:21:01Z', '2026-02-25T12:42:12Z', 'linusnorton', 'linusnorton'),
  (77, 'REQ-0077', 'Delete Court Process', '### **PROBLEM STATEMENT**

System admin users in CaTH access several system functionalities through the System Admin dashboard which allows them to perform administrative tasks. The dashboard acts as the main control panel for managing reference data, user accounts, media accounts, audit logs, and other administrative operations. This ticket covers the the end~~to~~end navigation of the Delete Court process which is covered across four screens; Dashboard, Find the court to remove, Are you sure you want to delete this court? and Delete Successful screen.

 

 

**AS A** system Admin  
**I WANT** to delete an existing court in CaTH
**SO THAT** I can update the list of available venues in CaTH

 

**Technical Specification:**
 * On confirm, do the soft delete for the location. DO NOT delete the record from the location table.
 * If location is soft deleted, make sure that location is not visible on any page or search.

### **ACCEPTANCE CRITERIA** 
 * System Admin Users can access the “Delete Court” tab from the system admin dashboard to search for a court, review its details, confirm deletion, and receive confirmation that it has been deleted.

 * When the system admin user clicks on the “Delete Court” tab, then the user is taken to the ''Are you sure you want to delete this court?'' screen, which has a table with the following row headings, ''Court or Tribunal name'', ''Location Type'', ''Jurisdiction'' and ''Region'', then 2 radio buttons with ''Yes'' and ''No'' and a green ''Continue'' button. 
 * When system admin user clicks ''Continue'' button,
 ** we need to find if there is any subscription for that location, if yes, show the error message "
There are active subscriptions for the given location."
 ** if there is no subscription for a location, check for active artefact for it. If yes, show the error message "
There are active artefacts for the given location."
 * If there is no active subscription and artefact for the location, then the system admin user is taken to a confirmation page with ''Delete Successful'' header in a green banner.
 * the deleted court is no longer available in CaTH front end and back end and is deleted from the master reference data.
 * All CaTH page specifications are maintained .

 

 

**Page: System Admin Dashboard**

**Form fields**
 * None

**Content**
 * EN: Title/H1 “System admin dashboard”

 * CY: Title/H1 “Dangosfwrdd Gweinyddwr y System”

 * EN: Navigation tab — “Delete court”

 * CY: Navigation tab — “Dileu llys”

**Errors**
 * EN: “You do not have permission to access this page”

 * CY: “Welsh placeholder”

**Back navigation**
 * Not applicable (entry point).

~~--~~
**Page: Find the Court to Remove**

**Form fields**
 * Court or tribunal search

 * 
 ** Input type: text

 * 
 ** Required: Yes

 * 
 ** Validation rules:

 * 
 ** 
 *** Must not be empty

 * 
 ** 
 *** Must match an existing court or tribunal

**Content**
 * EN: Title/H1 “Find the court to remove”

 * CY: Title/H1 “Dod o hyd i''r llys i''w ddileu”

 * EN: Label — “Court or tribunal name”

 * CY: Label — “Enw’r llys neu’r tribiwnlys”

 * EN: Button — “Continue”

 * CY: Button — “Dewiswch opsiwn”

**Errors**
 * EN: “Enter a court or tribunal name”

 * CY: “Welsh placeholder”

 * EN: “Court or tribunal not found”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back link returns to System Admin Dashboard.

~~--~~
**Page: Are You Sure You Want to Delete This Court?**

**Form fields**
 * Confirm deletion

 * 
 ** Input type: radio

 * 
 ** Required: Yes

 * 
 ** Options:

 * 
 ** 
 *** Yes

 * 
 ** 
 *** No

 * 
 ** Validation rules:

 * 
 ** 
 *** One option must be selected

**Content**
 * EN: Title/H1 “Are you sure you want to delete this court?”

 * CY: Title/H1 “Ydych chi''n siŵr eich bod eisiau dileu''r llys hwn?”

 * EN: Table row labels — “Court or tribunal name”, “Location type”, “Jurisdiction”, “Region”

 * CY: Table row labels — “Enw’r llys neu’r tribiwnlys”, “Math o Lleoliad”, “Awdurdodaeth”, “Rhanbarth”

 * EN: Radio options — “Yes”, “No”

 * CY: Radio options — “Ydw”, “Nac ydw”

 * EN: Button — “Continue”

 * CY: Button — “Dewiswch opsiwn”

**Errors**
 * EN: “Select yes or no to continue”

 * CY: “Welsh placeholder”

 * EN: “There are active subscriptions for the given location.”

 * CY: “Welsh placeholder”

 * EN: “There are active artefacts for the given location.”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back link returns to Find the Court to Remove, retaining the selected court.

~~--~~
**Page: Delete Successful**

**Form fields**
 * None

**Content**
 * EN: Title/H1 “Delete successful”

 * CY: Title/H1 “Wedi llwyddo i ddileu”

 * EN: Banner text — “The court has been successfully deleted.”

 * CY: Banner text — “Welsh placeholder”

 * EN: Link — “System admin dashboard”

 * CY: Link — “Gweinyddwr y System”

**Errors**
 * None

**Back navigation**
 * Link returns to System Admin Dashboard.

~~--~~
**System Behaviour and Data Rules (Applies to all pages)**
 * Court deletion is implemented as a {**}soft delete{**}.

 * The court record must not be physically removed from the location table.

 * On confirmation, the system must:

 * 
 ** Check for active subscriptions linked to the location.

 * 
 ** If subscriptions exist, block deletion and display the relevant error message.

 * 
 ** If no subscriptions exist, check for active artefacts linked to the location.

 * 
 ** If artefacts exist, block deletion and display the relevant error message.

 * If no active subscriptions or artefacts exist:

 * 
 ** Mark the location as deleted (soft delete).

 * 
 ** Ensure the location is no longer visible in:

 * 
 ** 
 *** Front-end pages

 * 
 ** 
 *** Search results

 * 
 ** 
 *** Admin selection lists

 * The deleted court must be excluded from all future CaTH operations while remaining in reference data for audit and integrity purposes.

~~--~~
**Accessibility**
 * All pages must comply with WCAG 2.2 AA standards.

 * Radio buttons must be keyboard accessible and correctly grouped.

 * Error messages must be announced to screen readers and linked to the relevant form controls.

 * Summary tables must use semantic table markup with appropriate headers.

 * Green success banners must meet colour contrast requirements and include textual confirmation.

~~--~~
**Test Scenarios**
 * System admin can access the Delete Court journey from the dashboard.

 * Entering an invalid court name displays an error.

 * Court details are displayed correctly on the confirmation screen.

 * Attempting to delete a court with active subscriptions is blocked with an error.

 * Attempting to delete a court with active artefacts is blocked with an error.

 * Successfully deleting a court shows the Delete Successful page.

 * Soft~~deleted courts do not appear in front~~end or admin searches.

 * Soft-deleted courts remain in the database for reference and audit.

 * Non-system admin users cannot access the Delete Court functionality.', 'functional', 'verified', 'medium', 'story', 300, 'https://github.com/hmcts/cath-service/issues/300', '2026-01-20T17:21:14Z', '2026-01-30T14:03:59Z', 'linusnorton', 'linusnorton'),
  (78, 'REQ-0078', 'Third Party User Management - Future', '### **PROBLEM STATEMENT**

System admin users in CaTH access several system functionalities through the System Admin dashboard which allows them to perform administrative tasks. The dashboard acts as the main control panel for managing reference data, user accounts, media accounts, audit logs, and other administrative operations. This ticket covers the system admin user''s ability to onboard, update and delete third~~party users through a structured, multi~~screen workflow. 
### **AS A** system admin
**I WANT** to create and manage a third-party user in CaTH
**SO THAT** I can manage external users efficiently while ensuring the right access permissions are applied.

 
### **ACCEPTANCE CRITERIA**
 * Only users with the **System Admin** role can access the System Admin Dashboard and all “Third-party user” management screens.
 * “Back” returns to the previous screen {**}without losing saved data{**}.
 * Page refresh does not create duplicate third-party users (idempotency on create confirm).
 * Create, update (subscriptions), and delete actions write an audit entry capturing: admin user, timestamp, third-party name, action type, before/after values (where applicable).

**The create third party user process:**

**Screen Flow:** Dashboard → Manage Third Party Users → Create Third Party User → Summary → Confirmation
 * System Admin can navigate from **Dashboard → Manage Third Party Users** where a table displays third~~party users **Name and Created date** where existing third parties are already in the system and a **Manage** link/action per row / third party user. Where no third~~party user exists, then the table is empty and the manage link is not displayed.
 * A green ''{**}Create new User''{**} button is displayed above the table which when clicked, takes the system admin user to the ‘Create third party user’ page to fill in the third-party user name in a free text box and When complete, the system admin clicks on the green ''Continue'' button to continue.
 * The System Admin is taken to the ''Create third party user summary'' screen that displays the entered details in a table beside the ''Name'' in a row in read~~only format with a ''Change'' link on each row which enables the editing of the inputted data by returning user to the **Create third party user** page with the previously entered Name pre~~populated.
 * Clicking **Confirm** on summary screen creates the third-party user and displays a **“Third party user created”** and the created **Name** on the confirmation page.
 * System must validate mandatory fields before allowing Continue.
 * System displays an error message if required data is missing.
 * Name is mandatory.

 * Name cannot be only whitespace.
 * Name length and character rules are enforced
 * Created user is added to the third-party users list.

 * A table is created in the database (Third Party User Table) with the following data fields; Name, Created Date, sensitivity and subscriptions and each newly created third party is saved in the table

 

**The update third party user process:**

**Screen Flow:**  Dashboard → Manage Third Party Users → Manage User → Manage Subscriptions → Subscriptions Updated
 *  System Admin can navigate from **Dashboard → Manage Third Party Users** where the system admin is able to view existing third-party user details and update subscription options by clicking the ''{**}Manage''{**} button
 * The System Admin is taken to the ''Manage user'' screen which displays a table with the third party user details in rows titled ''Name'', ''Created Date'', ''Number of subscriptions'''' and ''Sensitivity'' and two actionable buttons below; a green **Manage subscriptions** button which routes to **Manage third party subscriptions** and a red **Delete user** button which routes to the delete confirmation screen.
 * Clicking the green “Manage Subscriptions” button take the system admin to the “Manage third party Subscriptions” page. The “Manage third party Subscriptions” screen displays **all list types available in CaTH** in a tabular form, across multiple pages with paging controls (e.g., “Next”, “Previous”, page numbers) which allows navigation through list types.
 * For each list type, the admin can select **only one** sensitivity level (Public, Private and Classified). ‘Unselect’ option is also provided to remove access. Where ‘private’ is selected, then the user has access to public can private lists. Where ‘classified is selected, then the user has access to public, private and classified lists. 
 * Clicking the green “Save Subscriptions” button on the last page updates the changes and takes the system admin user to the ‘{**}Third party subscriptions updated{**}’ confirmation page
 * Two UI options are provided for the tabular display on the “Manage third party Subscriptions” page and should be explored

**Manage third party subscriptions (Option 1 – radio buttons)**
 * The table displays five column headers (List type, public, private, classified and unselect). Each list type is provided in a row with the ability to select **only one** sensitivity level using radio buttons displayed under each of the 3 sensitivity options and the unselect option.

**Manage third party subscriptions (Option 2 – dropdowns)**
 * The table displays two column headers (List type and Sensitivity). Each list type is provided in a row with the ability to select **only one** sensitivity level from public, private, classified, using a dropdown provided in the sensitivity column, which is defaulted to ‘Unselected’.
 * System must save updated subscription settings when “Save Subscriptions” is clicked and display a confirmation screen with title **“Third Party Subscriptions Updated”** in a green banner and the descriptive message ''Third party subscriptions for the user have been successfully updated''. underneath the green banner is the following message ''To manage further subscriptions for third parties, you can go to: ''Manage third party users'' (link)
 * Updated subscriptions are visible when returning to Manage User screen.

 

**The delete third party user process:** 

**Screen Flow:** Dashboard → Manage Third Party Users → Manage User → Delete Confirmation → Deletion Confirmation
 * System Admin can navigate from **Dashboard → Manage Third Party Users** where the system admin is able to view existing third-party user details and update subscription options by clicking the ''{**}Manage''{**} button
 * The System Admin is taken to the ''Manage user'' screen which displays a table with the third-party user details in rows titled ''Name'', ''Created Date'', ''Number of subscriptions'''' and ‘Sensitivity''
 * Clicking the red “Delete user” button take the system admin to the “Are you sure you want to delete <third party>?” screen where the system admin can select from a ''Yes'' or ''No'' radio button and click the green “Continue” to confirm. Screen title includes the selected third-party name (e.g., “Are you sure you want to delete <third party>.?”). the ‘Yes’ radio button confirms deletion action while the ‘No’ radio button cancels the action and returns to **Manage user** page without deleting anything. The System Admin must explicitly confirm deletion before the system proceeds to delete the third party.
 * The System displays a **Deletion Confirmation** screen with the title ''Third party user deleted'' and the descriptive text ''The third party user and associated subscriptions have been removed'' both in a green banner, followed by the text below; ''What do you want to do next?'' and then two links; ''Manage another third party user'' which take the system admin user back to the respective screen  and the ''Home'' screen which takes user to the dashboard.
 * Deletion removes the third-party user **and associated subscriptions** and the Deleted user no longer appears in the user list.
 * System prevents deletion of users with dependencies (if applicable).
 * Audit logging is triggered for create, update, and delete actions 

 

**Welsh translations**
 * Create new user - Creu defnyddiwr newydd
 * Name - enw''r
 * Created date - Crëwyd Dyddiad
 * Number of subscriptions
 * Sensitivity 
 * Actions - Camau gweithredu
 * Manage - Rheoli
 * Continue - Parhau
 * Create third party user - Creu defnyddiwr trydydd parti 
 * Create third party user - Wedi methu creu defnyddiwr trydydd parti 
 * Create third party user summary - Creu crynodeb o ddefnyddiwr trydydd parti
 * Change - newid
 * Confirm - Cadarnhau
 * Third party user created - Crëwyd defnyddiwr trydydd parti
 * The third party user has been successfully created
 * Role - 
 * Manage subscriptions - Rheoli tanysgrifiadau
 * Delete user - Dileu Defnyddiwr
 * Classified
 * Private
 * Public
 * unselected 
 * Manage third party subscriptions - Rheoli tanysgrifiadau trydydd parti
 * subscriptions - tanysgrifiadau
 * third party - Trydydd Parti
 * confirm subscriptions - Cadarnhau tanysgrifiadau
 * Third party subscriptions updated - Diweddarwyd Tanysgrifiadau Trydydd Parti
 * Third party subscriptions for the user have been successfully updated
 * To manage further subscriptions for third parties, you can go to
 * Manage third party users - Rheoli defnyddiwr trydydd parti
 * Are you sure you want to delete user <third party>? - Ydych chi''n siŵr eich bod eisiau dileu defnyddiwr?
 * Yes - Ydw
 * No - Nac ydw
 * Select yes or no to continue
 * Third party user deleted
 * Home
 * back - Yn ôl

 

 
## Page 1 — System Admin Dashboard → Manage Third Party Users

**Form fields**
 * Create new user

 ** Field name: Create new user

 ** Input type: button

 ** Required: No

 ** Validation rules:

 *** None

 *** Navigates to Create third party user screen

 * Third~~party users table (read~~only)

 ** Field name: Third-party users list

 ** Input type: table

 ** Required: No

 ** Validation rules:

 *** Displays rows only when third-party users exist

 *** Columns:

 ****** Name (text)

 ****** Created date (date)

 ****** Actions (link/button)

 * Manage

 ** Field name: Manage

 ** Input type: link/button (per row)

 ** Required: No

 ** Validation rules:

 *** Navigates to Manage user screen for the selected third-party user

**Content**
 * EN: Title/H1 “Manage third party users”

 * CY: Title/H1 “Rheoli defnyddwyr trydydd parti”

 * EN: Button “Create new user”

 * CY: Button “Creu defnyddiwr newydd”

 * EN: Table headers — “Name”, “Created date”, “Actions”

 * CY: Table headers — “enw''r”, “Crëwyd Dyddiad”, “Camau gweithredu”

**Errors**
 * EN: “There are no third party users.”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back returns to the System Admin Dashboard.

~~--~~
## Page 2 — Create Third Party User

**Form fields**
 * Name

 ** Field name: Name

 ** Input type: text

 ** Required: Yes

 ** Validation rules:

 *** Must not be empty

 *** Must not contain only whitespace

 *** Maximum length: 255 characters

 *** Allowed characters: letters, numbers, spaces, hyphens, apostrophes

 *** Trim leading and trailing whitespace on save

 * Continue

 ** Field name: Continue

 ** Input type: button

 ** Required: No

 ** Validation rules:

 *** Disabled until Name passes validation

**Content**
 * EN: Title/H1 “Create third party user”

 * CY: Title/H1 “Creu defnyddiwr trydydd parti”

 * EN: Field label “Name”

 * CY: Field label “enw''r”

 * EN: Button “Continue”

 * CY: Button “Parhau”

**Errors**
 * EN: “Enter a name”

 * CY: “Welsh placeholder”

 * EN: “Name cannot be blank or contain only spaces”

 * CY: “Welsh placeholder”

 * EN: “Name must be 255 characters or fewer and use valid characters”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back returns to Manage Third Party Users without losing entered data.

~~--~~
## Page 3 — Create Third Party User Summary

**Form fields**
 * Summary table

 ** Field name: Name (read-only)

 ** Input type: table (read-only)

 ** Required: Yes

 ** Validation rules:

 *** Displays entered Name

 * Change

 ** Field name: Change

 ** Input type: link

 ** Required: No

 ** Validation rules:

 *** Returns to Create third party user page with Name pre-populated

 * Confirm

 ** Field name: Confirm

 ** Input type: button

 ** Required: No

 ** Validation rules:

 *** Creates third-party user (idempotent)

**Content**
 * EN: Title/H1 “Create third party user summary”

 * CY: Title/H1 “Creu crynodeb o ddefnyddiwr trydydd parti”

 * EN: Link “Change”

 * CY: Link “newid”

 * EN: Button “Confirm”

 * CY: Button “Cadarnhau”

**Errors**
 * EN: “This third party user already exists”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back returns to Create third party user with data retained.

~~--~~
## Page 4 — Third Party User Created (Confirmation)

**Form fields**
 * None

**Content**
 * EN: Banner title “Third party user created”

 * CY: Banner title “Crëwyd defnyddiwr trydydd parti”

 * EN: Message “The third party user has been successfully created”

 * CY: Message “Welsh placeholder”

**Back navigation**
 * Link returns to Manage Third Party Users.

~~--~~
## Page 5 — Manage User

**Form fields**
 * User details table (read-only)

 ** Field names:

 *** Name

 *** Created Date

 *** Number of subscriptions

 *** Sensitivity

 ** Input type: table

 ** Required: No

 * Manage subscriptions

 ** Field name: Manage subscriptions

 ** Input type: button

 ** Required: No

 * Delete user

 ** Field name: Delete user

 ** Input type: button

 ** Required: No

**Content**
 * EN: Title/H1 “Manage user”

 * CY: Title/H1 “Rheoli defnyddiwr”

 * EN: Button “Manage subscriptions”

 * CY: Button “Rheoli tanysgrifiadau”

 * EN: Button “Delete user”

 * CY: Button “Dileu Defnyddiwr”

**Errors**
 * EN: “Unable to load user details”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back returns to Manage Third Party Users.

~~--~~
## Page 6 — Manage Third Party Subscriptions

**Form fields**
 * Subscriptions table (Option 1 – radio buttons)

 ** Field name: Sensitivity

 ** Input type: radio buttons

 ** Required: No

 ** Validation rules:

 *** Only one option selectable per list type

 *** Options:

 ****** Public

 ****** Private

 ****** Classified

 ****** Unselected

OR
 * Subscriptions table (Option 2 – dropdown)

 ** Field name: Sensitivity

 ** Input type: select

 ** Required: No

 ** Validation rules:

 *** Options:

 ****** Public

 ****** Private

 ****** Classified

 ****** Unselected (default)

 * Save subscriptions

 ** Field name: Save subscriptions

 ** Input type: button

 ** Required: No

**Content**
 * EN: Title/H1 “Manage subscriptions”

 * CY: Title/H1 “Rheoli tanysgrifiadau”

 * EN: Sensitivity options — “Public”, “Private”, “Classified”, “Unselected”

 * CY: Sensitivity options — “Public”, “Private”, “Classified”, “unselected”

**Errors**
 * EN: “Subscriptions could not be saved”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back returns to Manage User without saving changes.

~~--~~
## Page 7 — Third Party Subscriptions Updated (Confirmation)

**Form fields**
 * None

**Content**
 * EN: Banner title “Third Party Subscriptions Updated”

 * CY: Banner title “Welsh placeholder”

 * EN: Message “Third party subscriptions for the user have been successfully updated”

 * CY: Message “Welsh placeholder”

 * EN: Link “Manage third party users”

 * CY: Link “Rheoli defnyddwyr trydydd parti”

**Back navigation**
 * Link returns to Manage Third Party Users.

~~--~~
## Page 8 — Delete Third Party User (Confirmation)

**Form fields**
 * Confirm deletion

 ** Field name: Confirm delete

 ** Input type: radio buttons

 ** Required: Yes

 ** Validation rules:

 *** Options:

 ****** Yes

 ****** No

 * Continue

 ** Field name: Continue

 ** Input type: button

 ** Required: No

**Content**
 * EN: Title/H1 “Are you sure you want to delete <third party>?”

 * CY: Title/H1 “Welsh placeholder”

 * EN: Button “Continue”

 * CY: Button “Parhau”

**Errors**
 * EN: “Select yes or no to continue”

 * CY: “Welsh placeholder”

**Back navigation**
 * Selecting No returns to Manage User.

~~--~~
## Page 9 — Third Party User Deleted (Confirmation)

**Form fields**
 * None

**Content**
 * EN: Banner title “Third party user deleted”

 * CY: Banner title “Welsh placeholder”

 * EN: Message “The third party user and associated subscriptions have been removed”

 * CY: Message “Welsh placeholder”

 * EN: Links “Manage another third party user”, “Home”

 * CY: Links “Welsh placeholder”, “Welsh placeholder”

**Back navigation**
 * Links route to Manage Third Party Users or Dashboard.

~~--~~
## **Accessibility**
 * All screens must meet WCAG 2.2 AA standards.

 * All buttons, links, tables, radio buttons, and dropdowns must be fully keyboard accessible.

 * Error messages must be associated with the relevant fields and announced to assistive technologies.

 * Confirmation banners must use appropriate ARIA roles to announce success messages.

~~--~~
## **Test Scenarios**
 * Only System Admin users can access third-party user management screens.

 * Creating a third-party user with valid data succeeds and creates an audit log entry.

 * Creating a user with invalid or missing Name shows validation errors.

 * Page refresh on confirmation does not create duplicate users.

 * Updating subscriptions correctly persists and is visible on return to Manage User.

 * Deleting a user removes them from the list and deletes associated subscriptions.

 * Deletion is blocked if dependencies exist.

 * All create, update, and delete actions write audit logs with before/after values where applicable.

 * Back navigation preserves entered or saved data across all flows.', 'functional', 'implemented', 'medium', 'story', 301, 'https://github.com/hmcts/cath-service/issues/301', '2026-01-20T17:21:32Z', '2026-05-11T16:01:42Z', 'linusnorton', 'linusnorton'),
  (79, 'REQ-0079', 'Refactor artefact search extraction and subscription process', '**PROBLEM STATEMENT**

Currently, a verified user can only subscribe to a location but it can also subscribe by other types as well which are not implemented yet. But we need to update the application database in such a ways that it can support all types of user subscription.

 

**As a** system admin
**I want** the system to support multiple subscription search types (not just location)
**So that** users can subscribe to publications using different identifiers such as case number or case name in the future.

 

**Technical Specification:**
 * In list configuration system admin section, we need a page which will have two fields case number and case name. This will contain the json field name for the relevant information for that list, and store this information in table named list*search*config. i.e. for civil and family daily cause list, if json field case number and case name has fields in incoming json named case*number and case*name, we will enter this information in this page and it will be stored against that list type so later when we receive that list, it can extract the information and save into database.
 * We need to extract case information like case urn, number and name from incoming JSON (via manual upload or /api/publication) using list*search*config table, extract the information and store into table named artefact*search with columns id (PK) artefact*id (FK), case*number and case*name. 
 * In subscription table, you need to create two columns: search*type and search*value, remove location*id column. The only search*type at this point will be LOCATION_ID.
 * For location subscription which has been implemented and working fine, Once user is subscribe to a location, we need to store search*type as LOCATION*ID and search value as location id.
 * For fulfilment, when application will receive a publication for a specific location, to see any existing subscription for location, it need to find a record with search*type as LOCATION*ID and search_value as location id. If there is a subscription, send notification email (sending notification email functionality has been implemented already).

 

**Page: List Search Configuration**

**Form fields**
 * Case number JSON field name

 * 
 ** Input type: text

 * 
 ** Required: Yes

 * 
 ** Validation rules:

 * 
 ** 
 *** Maximum length: 100 characters

 * 
 ** 
 *** Must match a valid JSON field name pattern (letters, numbers and underscores only)

 * 
 ** 
 *** Must not be empty

 * Case name JSON field name

 * 
 ** Input type: text

 * 
 ** Required: Yes

 * 
 ** Validation rules:

 * 
 ** 
 *** Maximum length: 100 characters

 * 
 ** 
 *** Must match a valid JSON field name pattern (letters, numbers and underscores only)

 * 
 ** 
 *** Must not be empty

**Content**
 * EN: Title/H1 “Configure list search fields”

 * CY: Title/H1 “Welsh placeholder”

 * EN: Body text — “Enter the JSON field names used to extract case details for this list type.”

 * CY: Body text — “Welsh placeholder”

 * EN: Label — “Case number JSON field name”

 * CY: Label — “Welsh placeholder”

 * EN: Label — “Case name JSON field name”

 * CY: Label — “Welsh placeholder”

 * EN: Button — “Save configuration”

 * CY: Button — “Welsh placeholder”

**Errors**
 * EN: “Enter the case number JSON field name”

 * CY: “Welsh placeholder”

 * EN: “Enter the case name JSON field name”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back link returns to the System Admin list configuration section.

 

**Page: Publication Processing (System Behaviour)**

**Form fields**
 * None (system process)

**Content**
 * EN: Title/H1 “Publication search data extraction”

 * CY: Title/H1 “Welsh placeholder”

 * EN: Body text — “Case search data is extracted from incoming publication JSON using configured list search fields.”

 * CY: Body text — “Welsh placeholder”

**Errors**
 * EN: “Unable to extract case search data from publication”

 * CY: “Welsh placeholder”

**Back navigation**
 * Not applicable.

 

**Page: Subscription Storage (System Behaviour)**

**Form fields**
 * None (system process)

**Content**
 * EN: Title/H1 “Subscription search type storage”

 * CY: Title/H1 “Welsh placeholder”

 * EN: Body text — “Subscriptions are stored using a search type and search value instead of a location reference.”

 * CY: Body text — “Welsh placeholder”

**Errors**
 * None

**Back navigation**
 * Not applicable.

 

**Data and Processing Rules (Applies to all pages)**
 * A new database table `list*search*config` is created to store, per list type:

 * 
 ** Case number JSON field name

 * 
 ** Case name JSON field name

 * When a publication is received (manual upload or {{{}/api/publication{}}}):

 * 
 ** The system looks up the relevant configuration in `list*search*config`

 * 
 ** Case information (case number and case name) is extracted from the incoming JSON

 * 
 ** Extracted values are stored in the `artefact_search` table

 * The `artefact_search` table contains:

 * 
 ** id (primary key)

 * 
 ** artefact_id (foreign key)

 * 
 ** case_number

 * 
 ** case_name

 * The subscription table is updated as follows:

 * 
 ** Add column: `search_type`

 * 
 ** Add column: `search_value`

 * 
 ** Remove column: `location_id`

 * For existing location-based subscriptions:

 * 
 ** `search*type` is set to `LOCATION*ID`

 * 
 ** `search_value` is set to the location ID

 * For fulfilment processing:

 * 
 ** When a publication is received for a location, the system checks for subscriptions where:

 * 
 ** 
 *** `search*type = LOCATION*ID`

 * 
 ** 
 *** `search_value = <location id>`

 * 
 ** If a matching subscription exists, a notification email is sent using existing functionality

 

**Accessibility**
 * All admin configuration pages must meet WCAG 2.2 AA standards.

 * Form fields must have associated labels and accessible error messages.

 * Error messages must be announced to screen readers.

 * Pages must be fully operable using keyboard navigation.

 

**Test Scenarios**
 * Saving list search configuration with valid JSON field names succeeds.

 * Submitting the configuration form with missing fields displays validation errors.

 * Publications with configured JSON fields correctly populate {{{}artefact_search{}}}.

 * Publications without matching configuration do not cause system failure.

 * Existing location subscriptions are migrated to use {{{}search*type = LOCATION*ID{}}}.

 * Location-based fulfilment continues to send notification emails correctly.

 * No references to `location_id` remain in the subscription table.

 * Future subscription types can be added without further schema changes.', 'functional', 'verified', 'medium', 'story', 302, 'https://github.com/hmcts/cath-service/issues/302', '2026-01-20T17:21:43Z', '2026-02-24T10:02:46Z', 'linusnorton', 'linusnorton'),
  (80, 'REQ-0080', 'The RCJ Hearing Lists', '**PROBLEM STATEMENT**

Hearing lists are published in CaTH through various routes. This ticket covers the non-strategic publishing of hearing lists from The Royal Court of Justice (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.

 
|**Type of court**|**Jurisdiction**|**Venue name**|**Region**|**List type (in the excel upload drop down options)**|
|High court|Civil|Royal Courts of Justice|Royal Courts of Justice Group|London Administrative Court Daily Cause List|
|Civil|Civil|Royal Courts of Justice|Royal Courts of Justice Group|County Court at Central London Civil Daily Cause List |
|Civil|Civil |Royal Courts of Justice|Royal Courts of Justice Group|Civil Courts at the RCJ Daily Cause List |
|Court of Appeal (Criminal Division)|Criminal|Royal Courts of Justice|Royal Courts of Justice Group|Court of Appeal (Criminal Division) Daily Cause List |
|High Court of the Family Division|Family|Royal Courts of Justice|Royal Courts of Justice Group|Family Division of the High Court Daily Cause List |
|High Court|Civil|Royal Courts of Justice|Royal Courts of Justice Group|King’s Bench Division Daily Cause List |
|High Court|Civil|Royal Courts of Justice|Royal Courts of Justice Group|King’s Bench Masters Daily Cause List|
|High Court|Civil|Royal Courts of Justice|Royal Courts of Justice Group|Senior Courts Costs Office Daily Cause List |
|Civil|Civil|Royal Courts of Justice|Royal Courts of Justice Group|Mayor & City Civil Daily Cause List|
|High court|Civil|Birmingham Administrative Court|Midlands|Birmingham Administrative Court Daily Cause List|
|High court|Civil|Leeds Administrative Court |Yorkshire|Leeds Administrative Court Daily Cause List|
|High court|Civil|Bristol and Cardiff Administrative Court|Wales and South West|Bristol and Cardiff Administrative Court Daily Cause List|
|High court|Civil|Manchester Administrative Court|North West|Manchester Administrative Court Daily Cause List|

 

 

**AS A** Service

**I WANT** to create the validation schema and style guides for hearing lists published in The Royal Court of Justice

**SO THAT** these hearing lists can be published in CaTH

 

 

**ACCEPTANCE CRITERIA**
 * The venue **“Royal Courts of Justice”** is created and available in CaTH and linked to the **“Royal Courts of Justice Group”** region.

 * All hearing lists defined in this ticket are linked to the ''Royal Courts of Justice'' venue, ''Royal Courts of Justice Group'' region and to the jurisdiction specified in the source configuration table (see attached).

 * In the front end, the following text is displayed as a page header; 

**What do you want to view from Royal Courts of Justice?**
 * The link to FaCT is displayed after the text above in the following text and masked in the highlighted part of the text; 

<Find contact details and other information about courts and tribunals>(https://www.find~~court~~tribunal.service.gov.uk/) in England and Wales, and some non-devolved tribunals in Scotland.
 * The following caution message is displayed under the FaCT link;

''These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives. 
If you do not see a list published for the court you are looking for, it means there are no hearings scheduled.''
 * The Royal Courts of Justice hearing lists are arranged in an alphabetical order under the caution message
 * The Validation schema for each list provided below is created with the following data fields which are to be displayed in order of appearance are; Venue, Judge, Time, Case Number, Case Details, Hearing Type and Additional Information. 

 

County Court at Central London Civil Daily Cause List

Court of Appeal (Civil Division) Daily Cause List

Court of Appeal (Criminal Division) Daily Cause List

Civil Courts at the RCJ Daily Cause List 

Family Division of the High Court Daily Cause List

King’s Bench Division Daily Cause List

King’s Bench Masters Daily Cause List

London Administrative Court Daily Cause List

Mayor & City Civil Daily Cause List

Senior Courts Costs Office Daily Cause List

 
 * The Validation schema and excel template for the ''Court of Appeal (Civil Division) Daily Cause List'' also has a different format/layout as defined in the mock~~up and must not reuse the layout defined above. The excel template is created with 2 tabs. The First tab is created with the following data fields; Venue, Judge, Time, Case Number, Case Details, Hearing Type and Additional Information. The Second tab is created with a header (Notice for future judgements) and the following data fields; Date, Venue, Judge, Time, Case Number, Case Details, Hearing Type and Additional Information. This supports the creation of a sub~~section where notices for future judgements are published in the style guide.
 * The Validation schema and excel template for the ''London Administrative Court daily cause list'' also has a different format/layout as defined in the mock~~up and must not reuse the layouts defined above. The excel template is created with 2 tabs with the same data fields which are as follows; Venue, Judge, Time, Case Number, Case Details, Hearing Type and Additional Information. The Second tab is created with a header (Planning Court) and this supports the creation of a sub~~section within the London Administrative Court daily cause list where the Planning Court hearing cases are published
 * In the Court of Appeal (Criminal Division) Daily Cause List, a link is to to be masked in the text ''this quick guide'' in the following sentence ''For further information about our hearings, please see <this quick guide>(https://www.judiciary.uk/wp~~content/uploads/2025/07/A~~QUICK~~GUIDE~~TO~~HEARINGS~~IN~~THE~~CACD.docx)
 * The Style guide for all the lists are created using the attached mock ups.
 * A confluence page containing all the data fields is created for each hearing list.
 * A PDF downloadable version of each hearing list is created.
 * The email summary is created

 

 

**User Story**
 * As a Service
I WANT to create the validation schema and style guides for hearing lists published from the Royal Courts of Justice using the non-strategic Excel upload route
SO THAT these hearing lists can be published consistently and correctly in CaTH

~~--~~
## Page 1 — Royal Courts of Justice landing page

**Form fields**
 * Search cases

 ** Input type: text

 ** Required: No

 ** Validation rules:

 *** Maximum length: 200 characters

 *** Format: free text

 *** Filters visible hearing lists and case content on the page

**Content**
 * EN: Title/H1 “What do you want to view from Royal Courts of Justice?”

 * CY: Title/H1 “Beth hoffech chi ei weld o Lys Barn Brenhinol?”

 * EN: Link text “Find contact details and other information about courts and tribunals in England and Wales, and some non-devolved tribunals in Scotland.”

 * CY: Link text “Dewch o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd yng Nghymru a Lloegr, a rhai tribiwnlysoedd heb eu datganoli yn yr Alban.”

 * EN: Caution message
“These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives.
If you do not see a list published for the court you are looking for, it means there are no hearings scheduled.”

 * CY: Caution message
“Mae''r rhestrau hyn yn destun newid tan 4:30pm. Os bydd unrhyw newidiadau ar ôl yr amser hwn, byddwn yn ffonio neu’n anfon e-bost yn uniongyrchol at y partïon neu eu cynrychiolwyr cyfreithiol.
Os nad ydych yn gweld rhestr wedi’i chyhoeddi ar gyfer y llys rydych yn chwilio amdano, mae’n golygu nad oes gwrandawiadau wedi’u trefnu.”

 * EN: Hearing lists (displayed in alphabetical order)

 * CY: Hearing lists (wedi’u trefnu yn nhrefn yr wyddor)

**Errors**
 * EN: “There are no hearing lists available.”

 * CY: “Welsh placeholder”

**Back navigation**
 * Not applicable (top-level landing page)

~~--~~
## Page 2 — Standard Daily Cause List (Royal Courts of Justice)

Applies to:
 * County Court at Central London Civil Daily Cause List

 * Civil Courts at the RCJ Daily Cause List

 * Court of Appeal (Criminal Division) Daily Cause List

 * Family Division of the High Court Daily Cause List

 * King’s Bench Division Daily Cause List

 * King’s Bench Masters Daily Cause List

 * Mayor & City Civil Daily Cause List

 * Senior Courts Costs Office Daily Cause List

**Form fields**
 * Download PDF

 ** Input type: button/link

 ** Required: No

 ** Validation rules: None

**Content**
 * EN: Title/H1 “\{Daily Cause List name}”

 * CY: Title/H1 “\{Welsh Daily Cause List name}”

 * EN: Column headers (displayed in this order):
“Venue”, “Judge”, “Time”, “Case Number”, “Case Details”, “Hearing Type”, “Additional Information”

 * CY: Column headers (displayed in this order):
“Lleoliad”, “Barnwr”, “Amser”, “Rhif yr Achos”, “Manylion yr achos”, “Math o Wrandawiad”, “Gwybodaeth ychwanegol”

 * EN: Button “Download PDF”

 * CY: Button “Welsh placeholder”

**Errors**
 * EN: “There are no hearings scheduled.”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back returns to the Royal Courts of Justice landing page.

~~--~~
## Page 3 — Court of Appeal (Civil Division) Daily Cause List (special layout)

**Form fields**
 * Download PDF

 ** Input type: button/link

 ** Required: No

 ** Validation rules: None

**Content**
 * EN: Title/H1 “Court of Appeal (Civil Division) Daily Cause List”

 * CY: Title/H1 “Rhestr Achosion Dyddiol y Llys Apêl (Adran Sifil)”

 * EN: Section heading “Daily hearings”

 * CY: Section heading “Gwrandawiadau dyddiol”

 * EN: Section heading “Notice for future judgements”

 * CY: Section heading “Hysbysiad ar gyfer dyfarniadau’r dyfodol”

 * EN: Daily hearings table fields (tab 1):
Venue, Judge, Time, Case Number, Case Details, Hearing Type, Additional Information

 * CY: Daily hearings table fields:
Lleoliad, Barnwr, Amser, Rhif yr Achos, Manylion yr achos, Math o Wrandawiad, Gwybodaeth ychwanegol

 * EN: Notice for future judgements table fields (tab 2):
Date, Venue, Judge, Time, Case Number, Case Details, Hearing Type, Additional Information

 * CY: Notice for future judgements table fields:
Dyddiad, Lleoliad, Barnwr, Amser, Rhif yr Achos, Manylion yr achos, Math o Wrandawiad, Gwybodaeth ychwanegol

**Errors**
 * EN: “No future judgments have been published.”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back returns to the Royal Courts of Justice landing page.

~~--~~
## Page 4 — London Administrative Court Daily Cause List (special layout)

**Form fields**
 * Download PDF

 ** Input type: button/link

 ** Required: No

 ** Validation rules: None

**Content**
 * EN: Title/H1 “London Administrative Court Daily Cause List”

 * CY: Title/H1 “Rhestr Achosion Dyddiol Llys Gweinyddol Llundain”

 * EN: Section heading “Administrative Court”

 * CY: Section heading “Welsh placeholder”

 * EN: Section heading “Planning Court”

 * CY: Section heading “Welsh placeholder”

 * EN: Both sections use the same data fields:
Venue, Judge, Time, Case Number, Case Details, Hearing Type, Additional Information

 * CY:
Lleoliad, Barnwr, Amser, Rhif yr Achos, Manylion yr achos, Math o Wrandawiad, Gwybodaeth ychwanegol

**Errors**
 * EN: “There are no hearings scheduled.”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back returns to the Royal Courts of Justice landing page.

~~--~~
## Page 5 — Court of Appeal (Criminal Division) Daily Cause List (link masking)

**Form fields**
 * Download PDF

 ** Input type: button/link

 ** Required: No

**Content**
 * EN: Informational text
“For further information about our hearings, please see this quick guide”

 * CY: Informational text
“Am ragor o wybodaeth am ein gwrandawiadau gweler y canllaw cyflym hwn”

 * EN: Masked link text “this quick guide”

 * CY: Masked link text “y canllaw cyflym hwn”

**Errors**
 * EN: “Unable to display additional guidance.”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back returns to the Royal Courts of Justice landing page.

~~--~~
## Admin — Non-strategic publishing (Excel upload)

**Form fields**
 * List type

 ** Input type: select

 ** Required: Yes

 ** Validation rules:

 *** Must match configured list types for RCJ and Administrative Courts

 * Upload file

 ** Input type: file upload

 ** Required: Yes

 ** Validation rules:

 *** File type: .xlsx only

 *** Must match validation schema for selected list type

 *** Schema validation failure blocks publishing

**Content**
 * EN: Button “Publish”

 * CY: Button “Welsh placeholder”

**Errors**
 * EN: “The file does not match the required format for this hearing list.”

 * CY: “Welsh placeholder”

 * EN: “Upload an Excel (.xlsx) file.”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back returns to the previous admin screen without publishing.

~~--~~
## Accessibility
 * All pages meet WCAG 2.2 AA.

 * Tables use semantic table markup with correctly associated headers.

 * Masked links are accessible to screen readers with meaningful link text.

 * PDF download links are keyboard accessible and announced correctly.

 * Error messages are programmatically associated with the relevant controls.

~~--~~
## Test Scenarios
 * Venue configuration:

 ** “Royal Courts of Justice” exists and is linked to “Royal Courts of Justice Group”.

 * Landing page:

 ** Header, FaCT link, caution message, and alphabetical ordering display correctly.

 * Standard lists:

 ** Columns render in the correct order and match the validation schema.

 * Court of Appeal (Civil Division):

 ** Two Excel tabs render correctly as separate on-screen sections.

 * London Administrative Court:

 ** Administrative Court and Planning Court sections render correctly from separate tabs.

 * Court of Appeal (Criminal Division):

 ** “This quick guide” link is correctly masked.

 * Admin upload:

 ** Invalid files are rejected with validation errors.

 ** Valid files publish successfully.

 * Outputs:

 ** PDF downloads are available for each list.

 ** Email summaries are generated on publication.', 'functional', 'verified', 'medium', 'story', 303, 'https://github.com/hmcts/cath-service/issues/303', '2026-01-20T17:21:56Z', '2026-02-09T09:42:42Z', 'linusnorton', 'linusnorton'),
  (81, 'REQ-0081', 'Care Standards Weekly hearing list - Welsh translation', '**PROBLEM STATEMENT**

This ticket covers the implementation of the Welsh translation for the publishing of the care standards weekly hearing list through the non-strategic publishing route.

 

**AS A** Local Admin

**I WANT** to create a Welsh version of the Care Standards Weekly hearing list

**SO THAT** users have the option to switch to the Welsh translation of the list in CaTH

 

**ACCEPTANCE CRITERIA**

The Welsh translations needed for the care standards weekly hearing list are as follows;
 * 
 ** Care Standards Tribunal - Tribiwnlys Safonau Gofal
 ** CST weekly Hearing list - Rhestr Gwrandawiadau Wythnosol y CST
 ** Care Standards Tribunal Weekly Hearing List - Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Safonau Gofal
 ** National - Cenedlaethol
 ** Case Name - Enw’r Achos
 ** Hearing length - Hyd y gwrandawiad
 ** Hearing type - Math o wrandawiad
 ** Venue – Lleoliad
 ** Date – Dyddiad
 ** Back - Yn ôl
 ** Data Source - Ffynhonnell Data
 ** Manual Upload - Lanlwytho â llaw
 ** Additional information - Gwybodaeth ychwanegol
 ** Search Cases - chwilio achosion
 ** Important Information - Gwybodaeth Bwysig
 ** List for week commencing – Rhestr ar gyfer yr wythnos yn dechrau ar
 ** Last updated - Diweddarwyd diwethaf
 ** Please contact the Care Standards Office at cst@justice.gov.uk for details of how to access video hearings - Cysylltwch â''r Swyddfa Safonau Gofal yn cst@justice.gov.uk i gael manylion am sut i gael mynediad at wrandawiadau fideo.
 ** Observe a court or tribunal hearing as a journalist, researcher or member of the public - Arsylwi gwrandawiad llys neu dribiwnlys fel newyddiadurwr, ymchwilydd neu aelod o''r cyhoedd

 * See attached mock up for style guide.

 
**User Story**
 * As a Local Admin
I WANT to create a Welsh version of the Care Standards Weekly hearing list
SO THAT users have the option to switch to the Welsh translation of the list in CaTH

**Form fields**
 * Language toggle

 ** Input type: toggle / link (EN | CY)

 ** Required: No

 ** Validation:

 *** None

 *** Behaviour: switches all static and dynamic content on the page between English and Welsh without changing the underlying data

 * Search cases

 ** Input type: text

 ** Required: No

 ** Validation:

 *** Max length: 200 characters

 *** Format: free text

 *** Behaviour: filters visible hearing entries by case name and other displayed case text

 * Download PDF

 ** Input type: button/link

 ** Required: No

 ** Validation:

 *** None

 *** Behaviour: downloads the Welsh or English PDF depending on the selected language

 * (Admin) Upload hearing list file

 ** Input type: file upload

 ** Required: Yes

 ** Validation:

 *** File type: .xlsx only

 *** File must match the existing Care Standards Weekly Hearing List schema

 *** Language toggle must not affect schema validation

**Content**

Page 1 — Venue / tribunal landing
 * EN: Title/H1 “Care Standards Tribunal”

 * CY: Title/H1 “Tribiwnlys Safonau Gofal”

 * EN: Region label “National”

 * CY: Region label “Cenedlaethol”

 * EN: Search label “Search cases”

 * CY: Search label “chwilio achosion”

 * EN: Link text “CST weekly Hearing list”

 * CY: Link text “Rhestr Gwrandawiadau Wythnosol y CST”

Page 2 — Care Standards Tribunal Weekly Hearing List
 * EN: Title/H1 “Care Standards Tribunal Weekly Hearing List”

 * CY: Title/H1 “Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Safonau Gofal”

 * EN: Subheading “List for week commencing \{date}”

 * CY: Subheading “Rhestr ar gyfer yr wythnos yn dechrau ar \{date}”

 * EN: Meta text “Last updated \{date/time}”

 * CY: Meta text “Diweddarwyd diwethaf \{date/time}”

 * EN: Important information heading “Important Information”

 * CY: Important information heading “Gwybodaeth Bwysig”

 * EN: Important information content
“Please contact the Care Standards Office at cst@justice.gov.uk for details of how to access video hearings.”

 * CY: Important information content
“Cysylltwch â''r Swyddfa Safonau Gofal yn cst@justice.gov.uk i gael manylion am sut i gael mynediad at wrandawiadau fideo.”

 * EN: Additional information link
“Observe a court or tribunal hearing as a journalist, researcher or member of the public”

 * CY: Additional information link
“Arsylwi gwrandawiad llys neu dribiwnlys fel newyddiadurwr, ymchwilydd neu aelod o''r cyhoedd”

 * EN: Column headers / field labels shown in this order:

 ** “Case Name”

 ** “Hearing length”

 ** “Hearing type”

 ** “Venue”

 ** “Date”

 ** “Additional information”

 * CY: Column headers / field labels shown in this order:

 ** “Enw’r Achos”

 ** “Hyd y gwrandawiad”

 ** “Math o wrandawiad”

 ** “Lleoliad”

 ** “Dyddiad”

 ** “Gwybodaeth ychwanegol”

 * EN: Data source label “Data Source”

 * CY: Data source label “Ffynhonnell Data”

 * EN: Data source value “Manual Upload”

 * CY: Data source value “Lanlwytho â llaw”

 * EN: Button/link “Back”

 * CY: Button/link “Yn ôl”

 * EN: Button/link “Download this PDF to your device”

 * CY: Button/link “Llwytho’r PDF yma ar eich dyfais"

 *  
 

Behavioural rules for bilingual content
 * EN: When Welsh is selected, all static labels, headings, metadata, buttons, and informational text must display in Welsh.

 * CY: “Welsh placeholder”

 * EN: Case data values (e.g. case names entered in English) are not translated and remain as provided in the uploaded file.

 * CY: “Welsh placeholder”

**Errors**
 * EN: No hearings available
“There are no hearings scheduled for this week.”

 * CY: “Welsh placeholder”

 * EN: Search returns no results
“No cases match your search.”

 * CY: “Welsh placeholder”

 * EN: List cannot be displayed
“We cannot display this hearing list at the moment.”

 * CY: “Welsh placeholder”

 * EN: PDF generation error
“The PDF is not available right now. Try again later.”

 * CY: “Welsh placeholder”

 * EN: Admin upload error (file type)
“The file must be an Excel .xlsx”

 * CY: “Welsh placeholder”

 * EN: Admin upload error (schema)
“The file does not match the required format for the Care Standards Weekly Hearing List.”

 * CY: “Welsh placeholder”

**Back navigation**
 * Weekly hearing list page

 ** Behaviour: “Back” returns the user to the Care Standards Tribunal landing page.

 ** Behaviour: Selected language (EN or CY) is preserved when navigating back.

 * PDF view

 ** Behaviour: Back returns to the weekly hearing list in the same language.

 * Admin upload journey

 ** Behaviour: Back returns to the previous admin screen without publishing changes.

**Accessibility**
 * The language toggle must be keyboard accessible and programmatically indicate the selected language.

 * Screen readers must announce page language changes correctly when switching between English and Welsh.

 * All headings, labels, and buttons must have appropriate semantic markup in both languages.

 * Tables must use semantic table structures with correctly associated headers.

 * Error messages must be announced to assistive technologies and appear in the selected language.

**Test Scenarios**
 * Welsh language toggle:

 ** Switching to Welsh updates all static text to the approved Welsh translations.

 ** Switching back to English restores English text without page reload errors.

 * Content accuracy:

 ** All specified Welsh translations display exactly as defined in the acceptance criteria.

 * Case data integrity:

 ** Case names and uploaded data values remain unchanged when switching languages.

 * Navigation:

 ** Back button returns to the correct previous page and preserves the selected language.

 * Search:

 ** Search works identically in English and Welsh and returns the same filtered results.

 * PDF:

 ** Downloaded PDF matches the selected language and weekly list content.

 * Accessibility:

 ** Keyboard-only users can toggle language, search cases, navigate back, and download the PDF.

 ** Screen readers correctly announce headings, table headers, and language changes.', 'functional', 'verified', 'medium', 'story', 305, 'https://github.com/hmcts/cath-service/issues/305', '2026-01-20T17:22:24Z', '2026-02-09T10:03:26Z', 'linusnorton', 'linusnorton'),
  (82, 'REQ-0082', 'PDF Subscriptions template & email summary for the RCJ and Care Standards lists', '**PROBLEM STATEMENT**

This ticket cover the creation of the email summary and the PDF version of the RCJ hearing Lists and the Care Standards List which are to be included within the Subscription fulfilment. 

 

**AS A** Service

**I WANT** to create the email summary and PDF version of the RCJ and Care Standards Lists

**SO THAT** users who have subscribed to these Lists are notified and can download a copy of the lists

 

**Pre-Condition**
 * CaTH users can subscribe and have subscribed to receive email notifications for specific hearing lists published in CaTH
 * Email notification templates have been set up in Gov.Notify 

 

**ACCEPTANCE CRITERIA**
 * ''Build a PDF'' foundation~~PDF~~conversion-logic is implemented to allow the creation of a downloadable PDF version of the RCJ hearing lists and the Care Standard list from the list blob / Excel template, using the specific List Style Guide template
 * The generated PDF file must match the style guide at the front end and should be included within the Subscription fulfilment process
 * When a CaTH user subscribe to publications in CaTH and a publication matching the users'' subscriptions are uploaded to CaTH, then the user will receive an email notification informing them that the publication is available to view from the CaTH frontend.
 * The mail notification is sent out from GOV.Notify using the agreed email template 
 * The email notification summary should contain the link to the PDF file, the Case Number, Case Details and Hearing Type for the RCJ hearing Lists and the Case name, hearing date for the Care Standard List
 * The email summary of the earing List should follow the following format;
 * An opening statement that reads as follows; 

Note this email contains Special Category Data as defined by Data Protection Act 2018, formally known as Sensitive Personal Data, and should be handled appropriately.

This email contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used.
 * This is followed by the list name and venue (bulleted) in the following format;

 

          Your subscription to get updates about the below has been triggered based on a <list name e.g. Family Daily Cause List> being published for the date               25 October 2023:
 *    <Venue name e.g. Oxford Combined Court Centre>
 * This is followed by the text with the link to CaTH masked in the highlighted text ''{**}Manage your subscriptions, view lists, and add additional case information{**} within the Court and tribunal hearings service.'' and then the link to the PDF version of the list which is masked in the text ''Download the case list as a PDF:''.
 * The last section ''Summary of cases within listing'', provides the summarised key case details followed by the ''Unsubscribe'' link
 * Integration test, Unit test and Accessibility test are performed
 * When the user clicks the  link to the PDF version, user is taken to a screen titled **''You have a file to download''** which displays the following message under the title header and above a green ''Continue'' button; ''Court and tribunal hearings service sent you a file to download.'' . Underneath the continue button is the following message ''If you have any questions, call 0300 303 0656.''

 * When the user clicks the continue button, the user is taken to another screen titled **''Download your file''** and displays the following messages under the title header ''This file is available to download until 13 November 2026.'' ''Make sure you save your file somewhere you can find it.''. This is followed by the link to the PDF masked in the text ''Download this PDF (<file size>) to your device'' and then followed by the text ''If you have any questions, call 0300 303 0656.'' clicking the file link displays the PDF file.
 
 

 

 

**Specifications:**

 

**User Story**
As a Service, I want to create the email summary and PDF version of the RCJ Hearing Lists and the Care Standards List, so that users who have subscribed to these lists are notified and can download a copy of the lists.
~~--~~
### Page 1: Subscription fulfilment – PDF generation (RCJ Hearing Lists and Care Standards List)

**Form fields**
 * None (system-generated process)

**Content**
 * EN: Process description — “Build PDF version of hearing list”

 * CY: Process description — “Welsh placeholder”

 * EN: List types — “RCJ Hearing Lists”, “Care Standards List”

 * CY: List types — “Welsh placeholder”, “Welsh placeholder”

 * EN: Template reference — “List Style Guide template”

 * CY: Template reference — “Welsh placeholder”

**Errors**
 * EN: Error message — “The PDF could not be generated for this list.”

 * CY: Error message — “Welsh placeholder”

**Back navigation**
 * Not applicable

~~--~~
### Page 2: Subscription fulfilment – Email notification summary

**Form fields**
 * None (system-generated email content)

**Content**
 * EN: Email subject — “New hearing list available”

 * CY: Email subject — “Welsh placeholder”

 * EN: Opening statement —
“Note this email contains Special Category Data as defined by Data Protection Act 2018, formally known as Sensitive Personal Data, and should be handled appropriately.

This email contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used.”

 * CY: Opening statement — “Welsh placeholder”

 * EN: Trigger explanation —
“Your subscription to get updates about the below has been triggered based on a <list name e.g. RCJ Hearing List / Care Standards List> being published for the date <publication date>:”

 * CY: Trigger explanation — “Welsh placeholder”

 * EN: Bulleted details —

 ** “<List name>”

 ** “<Venue name e.g. Oxford Combined Court Centre>”

 * CY: Bulleted details —

 ** “Welsh placeholder”

 ** “Welsh placeholder”

 * EN: Link text —
“Manage your subscriptions, view lists, and add additional case information within the Court and tribunal hearings service.”

 * CY: Link text — “Welsh placeholder”

 * EN: PDF link text —
“Download the case list as a PDF:”

 * CY: PDF link text — “Welsh placeholder”

 * EN: Section heading — “Summary of cases within listing”

 * CY: Section heading — “Welsh placeholder”

 * EN: Summary content (RCJ Hearing Lists) —
“Case number, Case details, Hearing type”

 * CY: Summary content — “Welsh placeholder”

 * EN: Summary content (Care Standards List) —
“Case name, Hearing date”

 * CY: Summary content — “Welsh placeholder”

 * EN: Link — “Unsubscribe”

 * CY: Link — “Welsh placeholder”

**Errors**
 * EN: Error message — “The email notification could not be sent.”

 * CY: Error message — “Welsh placeholder”

**Back navigation**
 * Not applicable

~~--~~
### Page 3: You have a file to download

**Form fields**
 * None

**Content**
 * EN: Title/H1 “You have a file to download”

 * CY: Title/H1 “Welsh placeholder”

 * EN: Body text — “Court and tribunal hearings service sent you a file to download.”

 * CY: Body text — “Welsh placeholder”

 * EN: Button — “Continue”

 * CY: Button — “Welsh placeholder”

 * EN: Support text — “If you have any questions, call 0300 303 0656.”

 * CY: Support text — “Welsh placeholder”

**Errors**
 * None

**Back navigation**
 * Back link returns the user to the previous page without losing context.

~~--~~
### Page 4: Download your file

**Form fields**
 * None

**Content**
 * EN: Title/H1 “Download your file”

 * CY: Title/H1 “Welsh placeholder”

 * EN: Body text — “This file is available to download until 13 November 2026.”

 * CY: Body text — “Welsh placeholder”

 * EN: Body text — “Make sure you save your file somewhere you can find it.”

 * CY: Body text — “Welsh placeholder”

 * EN: File link — “Download this PDF (<file size>) to your device”

 * CY: File link — “Welsh placeholder”

 * EN: Support text — “If you have any questions, call 0300 303 0656.”

 * CY: Support text — “Welsh placeholder”

**Errors**
 * EN: Error message — “The file is no longer available to download.”

 * CY: Error message — “Welsh placeholder”

**Back navigation**
 * Back link returns the user to the “You have a file to download” page.

~~--~~
**Accessibility**
 * Email notifications must be readable by screen readers with clear structure and descriptive links.

 * PDF files must meet WCAG 2.2 AA standards, including tagged structure, selectable text, and logical heading hierarchy.

 * Download journey pages must support keyboard-only navigation and visible focus states.

 * Status and error messages must be announced to assistive technologies.

**Test Scenarios**
 * PDF generation: RCJ Hearing Lists are successfully converted into PDFs using the List Style Guide template.

 * PDF generation: Care Standards List is successfully converted into a PDF using the List Style Guide template.

 * Subscription trigger: Subscribed users receive an email when a matching list is published.

 * Email delivery: Notifications are sent via GOV.UK Notify using the agreed template.

 * Email content: Mandatory Special Category Data warning text is present.

 * Summary section: Correct case details are displayed for each list type.

 * PDF link journey: User can access the download screens and successfully download the PDF.

 * Testing: Unit tests, integration tests, and accessibility tests are completed successfully.', 'functional', 'verified', 'medium', 'story', 306, 'https://github.com/hmcts/cath-service/issues/306', '2026-01-20T17:22:43Z', '2026-02-16T17:05:33Z', 'linusnorton', 'linusnorton'),
  (83, 'REQ-0083', 'PDF Subscriptions template & email summary for the Civil and Family Daily Cause list', '**PROBLEM STATEMENT**

This ticket covers the creation of the email summary and the PDF version of the Civil and Family Daily Cause List which are to be included within the subscription fulfilment.

 

**AS A** Service

**I WANT** to create the email summary and PDF version of the Daily Cause Lists

**SO THAT** users who have subscribed to these Lists are notified and can download a copy of the lists

 

**Pre-Condition**
 * CaTH users can subscribe and have subscribed to receive email notifications for specific hearing lists published in CaTH
 * Email notification templates have been set up in GOV.UK Notify 

 

**ACCEPTANCE CRITERIA**
 * ''Build a PDF'' foundation~~PDF~~conversion-logic is implemented to allow the creation of a downloadable PDF version of the Civil and Family Daily Cause List from the list blob template, using the specific List Style Guide template.
 * The generated PDF file must match the style guide at the front end and should be included within the Subscription fulfilment in CaTH
 * When a CaTH user subscribes to publications in CaTH and a publication matching the users'' subscriptions are uploaded to CaTH, then the user will receive an email notification informing them that the publication is available to view from the CaTH frontend.
 * The mail notification is sent out from GOV.UK Notify using the agreed email template 
 * The email notification summary should contain the link to the PDF file followed by the email summary.
 * There should be 3 separate GOV.UK email template. First one with both PDF link and email summary. The second template with just the email summary. We should use the second template if the generated PDF file for Civil and Family Daily Cause List is more than 2MB. All other list types will continue to use the third (original) email template.
 * The email summary contain a summary of cases within the listing. It includes Applicant, Case reference number, Case name, Case type and Hearing type for Civil and Family Daily Cause List
 * The email summary of the Civil and Family Daily Cause List should follow the following format:
 * An opening statement that reads as follows:

Note this email contains Special Category Data as defined by Data Protection Act 2018, formally known as Sensitive Personal Data, and should be handled appropriately.

This email contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used.
 * This is followed by the list name and venue (bulleted) in the following format;

 

          Your subscription to get updates about the below has been triggered based on a <list name e.g. Family Daily Cause List> being published for the date               25 October 2023:
 *    <Venue name e.g. Oxford Combined Court Centre>
 * This is followed by the text with the link to CaTH masked in the highlighted text ''{**}Manage your subscriptions, view lists, and add additional case information{**} within the Court and tribunal hearings service.'' and then the link to the PDF version of the list which is masked in the text ''Download the case list as a PDF:''.
 * The last section ''Summary of cases within listing'', provides the summarised key case details followed by the ''Unsubscribe'' link
 * Validation, unit and Integration tests are performed for each list type
 * When the user clicks the  link to the PDF version, it redirects to <https://documents.service.gov.uk>(https://documents.service.gov.uk/) to download the PDF. 

**Specifications**

 

**User Story**
As a Service, I want to create the email summary and PDF version of the Civil and Family Daily Cause List, so that users who have subscribed to this list type are notified and can download a copy of the list.
~~--~~
### Page 1: Subscription fulfilment – PDF generation (Daily Cause Lists)

**Form fields**
 * None (system-generated process)

**Content**
 * EN: Process description — “Build PDF version of Daily Cause Lists”

 * CY: Process description — “Welsh placeholder”

 * EN: List types — “Civil and Family Daily Cause List”

 * CY: List types — “Welsh placeholder”

 * EN: Template reference — “List Style Guide template”

 * CY: Template reference — “Welsh placeholder”

**Errors**
 * EN: Error message — “The PDF could not be generated for this list.”

 * CY: Error message — “Welsh placeholder”

**Back navigation**
 * Not applicable

~~--~~
### Page 2: Subscription fulfilment – Email notification summary

**Form fields**
 * None (system-generated email content)

**Content**
 * EN: Email subject — “New Daily Cause List available”

 * CY: Email subject — “Welsh placeholder”

 * EN: Opening statement —
“Note this email contains Special Category Data as defined by Data Protection Act 2018, formally known as Sensitive Personal Data, and should be handled appropriately.

This email contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used.”
 * CY: Opening statement — “Welsh placeholder”

 * EN: Trigger explanation —
“Your subscription to get updates about the below has been triggered based on a <list name e.g. Civil and Family Daily Cause List> being published for the date <publication date>:”

 * CY: Trigger explanation — “Welsh placeholder”

 * EN: Bulleted details —

 * 
 ** “<List name>”

 * 
 ** “<Venue name e.g. Oxford Combined Court Centre>”

 * CY: Bulleted details —

 * 
 ** “Welsh placeholder”

 * 
 ** “Welsh placeholder”

 * EN: Link text —
“Manage your subscriptions, view lists, and add additional case information within the Court and tribunal hearings service.”

 * CY: Link text — “Welsh placeholder”

 * EN: PDF link text —
“Download the case list as a PDF:”

 * CY: PDF link text — “Welsh placeholder”

 * EN: Section heading — “Summary of cases within listing”
 * CY: Section heading — “Welsh placeholder”

 * EN: Summary content (Civil and Family Daily Cause List) —
“Applicant, Case reference number, Case name, Case type, Hearing type”

 * CY: Summary content — “Welsh placeholder”

 * EN: Link — “Unsubscribe”

 * CY: Link — “Welsh placeholder”

**Errors**
 * EN: Error message — “The email notification could not be sent.”

 * CY: Error message — “Welsh placeholder”

**Back navigation**
 * Not applicable

~~--~~
### Page 3: You have a file to download

**Form fields**
 * None

**Content**
 * EN: Title/H1 “You have a file to download”

 * CY: Title/H1 “Welsh placeholder”

 * EN: Body text — “Court and tribunal hearings service sent you a file to download.”

 * CY: Body text — “Welsh placeholder”

 * EN: Button — “Continue”

 * CY: Button — “Welsh placeholder”

 * EN: Support text — “If you have any questions, call 0300 303 0656.”

 * CY: Support text — “Welsh placeholder”

**Errors**
 * None

**Back navigation**
 * Back link returns the user to the previous page without losing context.

~~--~~
### Page 4: Download your file

**Form fields**
 * None

**Content**
 * EN: Title/H1 “Download your file”

 * CY: Title/H1 “Welsh placeholder”

 * EN: Body text —
“This file is available to download until 13 November 2026.”

 * CY: Body text — “Welsh placeholder”

 * EN: Body text —
“Make sure you save your file somewhere you can find it.”

 * CY: Body text — “Welsh placeholder”

 * EN: File link —
“Download this PDF (<file size>) to your device”

 * CY: File link — “Welsh placeholder”

 * EN: Support text —
“If you have any questions, call 0300 303 0656.”

 * CY: Support text — “Welsh placeholder”

**Errors**
 * EN: Error message — “The file is no longer available to download.”

 * CY: Error message — “Welsh placeholder”

**Back navigation**
 * Back link returns the user to the “You have a file to download” page.

~~--~~
**Accessibility**
 * Email content must be readable by screen readers with descriptive link text and logical reading order.

 * PDF files must be accessible, including tagged structure, selectable text, and correct heading hierarchy.

 * Download pages must meet WCAG 2.2 AA requirements, including visible focus states and keyboard-only navigation.

 * Error and status messages must be announced to assistive technologies.

**Test Scenarios**
 * PDF generation: Civil and Family Daily Cause List is successfully converted into a PDF using the List Style Guide template.

 * Subscription trigger: Subscribed users receive an email when a matching list is published.

 * Email delivery: Notifications are sent via GOV.UK Notify using the agreed template.

 * Email content: Mandatory Special Category Data warning text is present.

 * Summary section: Correct case details are displayed for each list type.

 * PDF link journey: User can access “You have a file to download” and “Download your file” pages and download the PDF.

 * Expiry handling: Attempting to access the file after expiry shows the correct error message.

 * Testing: Validation, unit tests, and integration tests are completed successfully for each list type.', 'functional', 'verified', 'medium', 'story', 308, 'https://github.com/hmcts/cath-service/issues/308', '2026-01-20T17:23:04Z', '2026-03-18T09:59:14Z', 'linusnorton', 'linusnorton'),
  (84, 'REQ-0084', 'RCJ/Rolls Building - Summary of Pubs Caution Message', '**PROBLEM STATEMENT**

This ticket covers the implementation of the Rolls Building and RCJ landing page caution and no list message which would require some backend database changes (location metadata) and frontend screen updates.

 

**AS A** Service

**I WANT** to display a caution and ''no list'' message on the Summary of Publications page

**SO THAT** users are aware of these important information

 

**TECHNICAL ACCEPTANCE CRITERIA**
 * Add a new tile on System Admin Dashboard to manage location metadata. The tile should have title ''Manage Location Metadata'' and description ''View, update and remove location metadata''.
 * Clicking the ''Manage Location Metadata'' tile will redirect to ''Find the location metadata to manage'' page with URL /location~~metadata~~search which contains a serach-autocomplete search box to search for locations. Refer to the /search page to see how it is implemented.
 * Clicking on the continue button on the /location~~metadata~~search page after selecting a location will redirect to a page with URL /location~~metadata~~manage. This page has title ''Manage location metadata for \{location name}'' where location name is the selected location from the previous page. This page contains 4 text areas (English caution message, Welsh caution message, English no list message and Welsh no list message). There are button(s) at the bottom of the page. If there is no existing location metadata, we have a single button called ''Create''. If there is existing location metadata for the location, we have 2 buttons, ''Update'' and ''Delete''
 * After typing in location metadata and click the ''Create'' or ''Update'' button on the /location~~metadata~~manage page, it will redirect to the success page. The success page with contain a panel with text ''Location metadata created'' or ''Location metadata updated''. Below that there is a bold text ''What do you want to do next?'' and a link ''Search for location metadata by court or tribunal name'' which takes the user back to /location~~metadata~~search page.
 * If we click on the ''Delete'' button on the /location~~metadata~~manage page, it will remove the location metadata record and go to a page with URL /location~~metadata~~delete-confirmation. This page has title ''Are you sure you want to delete location metadata for \{location name}'' plus ''Yes'' and ''No'' radio buttons.
 * Click on yes with go to the success page with panel ''Location metadata deleted''. Below that there is a bold text ''What do you want to do next?'' and a link ''Search for location metadata by court or tribunal name'' which takes the user back to /location~~metadata~~search page. 
 * Create location metadata table with the following fields:
 ** location*metadata*id - Primary key. UUID
 ** location_id - Foreign key to link to the location table
 ** caution_message - string
 ** welsh*caution*message - string
 ** no*list*message - string
 ** welsh*no*list_message - string

 

**ACCEPTANCE CRITERIA**
 * The following caution message is displayed under the FaCT link and above the hearing lists on the RCJ and Rolls Building summary of publications pages;

''These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives. 
If you do not see a list published for the court you are looking for, it means there are no hearings scheduled.''
 * The following message is displayed when no publication is available/displayed;
 * The Caution & no list Message upload and maintenance will be done through the System Admin portal
 * A new location metadata table will be created in the backend/database for data storage and updating of the frontend summary of publications will be read from this new table via data-management to avoid hardcoding the messages within frontend. These messages are passed into the nunjucks file to pick the right message to display for the location.
 * At least one message must be entered into the table to create or update the metadata.
 * Where there are hearing lists published for the location (RCJ/Rolls Building), only the caution message will be displayed
 * Where no hearing lists are published, then both messages (caution and no list messages) should be displayed
 * The new table should adopt the following format

![https://tools.hmcts.net/confluence/download/attachments/1847016575/image~~2025~~4~~17_15~~27-2.png?version=1&modificationDate=1744898621839&api=v2](https://tools.hmcts.net/confluence/download/attachments/1847016575/image~~2025~~4~~17_15~~27-2.png?version=1&modificationDate=1744898621839&api=v2)

 

**Welsh translation:**
 * English
“These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives.
If you do not see a list published for the court you are looking for, it means there are no hearings scheduled.”

 * Welsh
“Mae''r rhestrau hyn yn destun newid tan 4:30pm. Os bydd unrhyw newidiadau ar ôl yr amser hwn, byddwn yn ffonio neu’n anfon e-bost yn uniongyrchol at y partïon neu eu cynrychiolwyr cyfreithiol.
Os nad ydych yn gweld rhestr wedi’i chyhoeddi ar gyfer y llys rydych yn chwilio amdano, mae’n golygu nad oes gwrandawiadau wedi’u trefnu.”', 'functional', 'verified', 'medium', 'story', 309, 'https://github.com/hmcts/cath-service/issues/309', '2026-01-20T17:23:14Z', '2026-02-13T15:41:36Z', 'linusnorton', 'linusnorton'),
  (85, 'REQ-0085', 'User Management', '### **PROBLEM STATEMENT**

System admin users in CaTH access several system administrative functionalities through the System Admin dashboard which allows them to perform administrative tasks. This ticket covers the system admin user''s ability to manage and delete CaTH users through a structured, multi-screen workflow. 

### **AS A** System Administrator

**I WANT** to search and delete user accounts from CaTH

**SO THAT** these users no longer have unrestricted access in CaTH

 
### **ACCEPTANCE CRITERIA**
* Only users with the **System Admin** role can access the System Admin Dashboard.
* on the dashboard, when the system admin user clicks on the ''User Management'' tab, then the system admin user is taken to the ''Find, update and delete a user'' page and can view the list of CaTH users in a table that displays the following columns in sequential order ''Email'', ''Role'' and ''Provenance''. The 4th column without a title provides a link to ''Manage'' each user provided in the table rows. Where there are several users, then a maximum of 25 users are displayed per page
* A filter panel is provided on the left side of the page. The first section displays the ''Selected filters''. 2nd section displays 3 free text search fields. First is the ''Email'' search field. When the correct search criteria is inputted and run, then the user list is updated to display matching results; however, where the wrong email is inputted, the following error message is displayed; ''{**}There is a problem''. ''{**}No users could be found matching your search criteria. Try adjusting or clearing the filters.'' The second and third search fields are the ''User ID'' and ''User Provenance ID'' fields which display the following descriptive message beneath the field name and above the search bar ''Must be an exact match''. The 3rd section provides 2 check box sub-sections titled ''Role'' which has the following options, ''Verified, CTSC Admin, Local[+] Admin and System Admin'', and then ''Provenance'' with the following options ''CFT IdAM and SSO''. [/+][-]Admin, CTSC Super Admin, Local Super Admin and System Admin'', and then ''Provenance'' with the following options ''B2C, CFT IdAM, Crime IdAM and SSO''.[/-]
* Clicking on the ''Manage'' link beside a user takes the system admin to the ''Manage <user email>'' page which displays a caution symbol underneath the page title with the following descriptive message beside it; ''{**}Ensure authorisation has been granted before updating this user''{**}. The following rows are provided in a displayed table; ''User ID, Email, Role. Provenance, Provenance ID, Creation Date and Last sign in''. This is followed by a red ''Delete user'' button. 
* When the system admin clicks the ''Delete user'' button, the system admin is taken to a confirmation page titled ''Are you sure you want to delete [user]? underneath the header are two radio buttons titled ''Yes'' and ''No'', followed by a green ''Continue'' button. Where the system admin selects ''No'', then the system admin is taken to the previous page with the user''s details but where the system admin selects ''Yes'', then the system admin is taken to the delete confirmation page which displays ''User deleted'' in a green banner. 
* Page numbers are displayed at the bottom of the page with ''Next'' above and ''2 of 2'' beneath on the left hand side and ''Previous'' on the right hand side with ''1 of 2'' beneath. 
* When a user is deleted in CaTH, then the user is also deleted from the database

 

 **Specifications**

User Story
As a System Administrator, I want to search and delete user accounts from CaTH, so that these users no longer have unrestricted access in CaTH.

Page 1: System Admin Dashboard

Form fields

None

Content

EN: Title/H1 “System Admin Dashboard”

EN: Navigation tab — “User Management”

Errors

EN: “You do not have permission to access this page.”

Back navigation

Not applicable

Page 2: Find, update and delete a user

Form fields

Email

Input type: text

Required: No

Validation rules:

Must be a valid email format

Maximum length: 254 characters

User ID

Input type: text

Required: No

Validation rules:

Must be an exact match

Alphanumeric only

Maximum length: 50 characters

User Provenance ID

Input type: text

Required: No

Validation rules:

Must be an exact match

Alphanumeric only

Maximum length: 50 characters

Role

Input type: checkbox

Required: No

Options: Verified, CTSC Admin, Local Admin, System Admin

Provenance

Input type: checkbox

Required: No

Options: CFT IdAM, SSO

Content

EN: Title/H1 “Find, update and delete a user”

EN: Section heading — “Selected filters”

EN: Field hint — “Must be an exact match”

EN: Table column headers — “Email”, “Role”, “Provenance”, “Manage”

EN: Link — “Manage”

EN: Pagination —

Left: “Next” with “2 of 2” beneath

Right: “Previous” with “1 of 2” beneath

EN: Maximum of 25 users displayed per page

Errors

EN: Error summary title — “There is a problem”

EN: Error message — “No users could be found matching your search criteria. Try adjusting or clearing the filters.”

Back navigation

Back link returns the user to the System Admin Dashboard without losing applied filters.

Page 3: Manage user

Form fields

None (read-only user details)

Content

EN: Title/H1 “Manage [user email]”

EN: Warning message — “Ensure authorisation has been granted before updating this user”

EN: Table rows —

User ID

Email

Role

Provenance

Provenance ID

Creation Date

Last sign in

EN: Button — “Delete user” (red)

Errors

None

Back navigation

Back link returns the user to the Find, update and delete a user page without losing search results.

Page 4: Confirm delete user

Form fields

Confirm deletion

Input type: radio

Required: Yes

Options: Yes, No

Validation rules:

One option must be selected to continue

Content

EN: Title/H1 “Are you sure you want to delete [user]?”

EN: Radio options — “Yes”, “No”

EN: Button — “Continue” (green)

Errors

EN: “Select yes or no to continue.”

Back navigation

Selecting “No” returns the user to the Manage user page.

Page 5: User deleted confirmation

Form fields

None

Content

EN: Confirmation banner — “User deleted” (green)

Errors

None

Back navigation

Back link returns the user to the Find, update and delete a user page.

Accessibility

All pages must comply with WCAG 2.2 AA standards.

Tables must include proper header associations for screen readers.

Pagination controls must be keyboard accessible and announced correctly.

Warning messages, error summaries, and confirmation banners must be announced to assistive technologies.

Colour contrast must be sufficient, including red and green action elements.

Test Scenarios

Access control: Only users with the System Admin role can access the System Admin Dashboard and User Management pages.

User list display: No more than 25 users are displayed per page.

Search by email: Valid email returns matching users; invalid email displays the defined error message.

Exact match validation: User ID and User Provenance ID only return results when an exact match is entered.

Manage navigation: Selecting “Manage” opens the correct user details page.

Delete flow (No): Selecting “No” returns the user to the Manage user page without deleting the user.

Delete flow (Yes): Selecting “Yes” deletes the user and displays the “User deleted” confirmation banner.

Data integrity: Deleted users are removed from the CaTH database.

Pagination: Next and Previous controls navigate correctly between result pages.', 'functional', 'verified', 'medium', 'story', 310, 'https://github.com/hmcts/cath-service/issues/310', '2026-01-20T17:23:27Z', '2026-06-05T16:01:12Z', 'linusnorton', 'linusnorton'),
  (86, 'REQ-0086', 'Header and footer update', 'After the implementation of VIBE-159, there are some known differences between current CaTH and AI CaTH on header and footer below:
 * New CaTH has an additional foot link called ''Open Government Licence'' in the footer which is not in current CaTH.


 * New CaTH missing the current text in footer:

When you use this information under the OGL, you should include the following attribution: Contains public sector information licensed under the <Open Government Licence v3.0>(https://www.nationalarchives.gov.uk/doc/open~~government~~licence/version/3/)

The <Open Government Licence v3.0>(https://www.nationalarchives.gov.uk/doc/open~~government~~licence/version/3/) does not cover use of any personal data in the Court and tribunal hearings service. Personal data is subject to applicable data protection laws.

 * The pageurl parameter for the feedback link begins with a ''/'' in the new CaTH and no ''/'' in current CaTH', 'functional', 'verified', 'medium', 'task', 311, 'https://github.com/hmcts/cath-service/issues/311', '2026-01-20T17:23:41Z', '2026-01-30T15:05:14Z', 'linusnorton', 'linusnorton'),
  (87, 'REQ-0087', 'Service navigation update', '# Update service navigation for manual upload pages following SSO implementation to include Dashboard and Admin Dashboard for system admin sign~~in, and Dashboard only for local admin and CTSC admin sign~~in
 # When signed in as SSO local admin or CTSC admin, the service navigation text on the admin dashboard page should be ''Dashboard'' not ''Admin Dashboard''
 # When signed in as CTSC admin, we should see 4 tiles instead of 3 on admin dashboard. Local admin and system admin should continue to see 3 tiles on admin dashboard. The fourth tile should be ''Manage Media Account Requests''', 'functional', 'verified', 'medium', 'task', 312, 'https://github.com/hmcts/cath-service/issues/312', '2026-01-20T17:23:56Z', '2026-01-30T15:05:17Z', 'linusnorton', 'linusnorton'),
  (88, 'REQ-0088', 'Merge Tests Related to Manual Upload (Flat File)', '**Description:**
Currently, there are three separate test files created for the manual upload (flat file) functionality across different tickets. This task aims to merge all these tests into a single, unified test file. During this process, any tests that are not necessary for validating the core functionality should be removed to ensure the test suite remains efficient, relevant, and easy to maintain.

**Acceptance Criteria:**
 * Review all existing manual upload test cases.

 * Merge the relevant tests into one comprehensive test file.

 * Remove any tests that are not required for the functionality.

 * Ensure the final test file fully covers the manual upload process.

 * Verify that the new test file executes successfully in the pipeline.', 'non_functional', 'verified', 'medium', 'task', 313, 'https://github.com/hmcts/cath-service/issues/313', '2026-01-20T17:24:09Z', '2026-01-30T15:05:20Z', 'linusnorton', 'linusnorton'),
  (89, 'REQ-0089', 'Merge CFT Login Tests into One File & Merge SSO Login Tests into One File', '**Description:**
Currently, login tests for CFT and SSO are spread across multiple test files, leading to duplication, scattered maintenance, and inconsistent structure. To improve test organization, readability, and maintainability, we should consolidate:
 * All **CFT login tests** into a single test file

 * All **SSO login tests** into a single test file



**Acceptance Criteria:**
 * CFT login tests exist in **one consolidated file**

 * SSO login tests exist in **one consolidated file**

 * No duplicated or unused test files remain

 * Test suite runs successfully with all login test cases passing

 * CI/CD pipelines reflect updated test paths', 'non_functional', 'verified', 'medium', 'task', 314, 'https://github.com/hmcts/cath-service/issues/314', '2026-01-20T17:24:23Z', '2026-01-30T15:05:22Z', 'linusnorton', 'linusnorton'),
  (90, 'REQ-0090', 'Optimize Tests for Subscription Add/Remove Functionality by Removing Redundancies and Merging Related Scenarios', '**Description:**
The current test suite for *Adding and Removing Subscriptions* contains several redundant or fragmented test cases that validate similar flows using separate tests. This increases test execution time and maintenance overhead.

We should review and optimise these tests by:
 * Removing unnecessary or duplicate test cases.

 * Combining smaller tests that validate separate but related behaviours into longer end~~to~~end paths.

 * Creating consolidated tests that cover:

 * 
 ** Adding subscriptions

 * 
 ** Validating subscription details

 * 
 ** Removing subscriptions

 * Ensuring the merged tests maintain full coverage of critical validations and edge cases.

**Goals:**
 * Reduce total number of test cases.

 * Increase test efficiency and functional coverage.

 * Maintain or improve overall quality of validation.

**Acceptance Criteria:**
 * Redundant tests are identified and removed.

 * Tests validating related flows are merged into longer, end~~to~~end paths.

 * Final set of optimised tests is documented and reviewed.

 * No loss in functional coverage.', 'non_functional', 'verified', 'medium', 'task', 315, 'https://github.com/hmcts/cath-service/issues/315', '2026-01-20T17:24:36Z', '2026-01-30T15:05:24Z', 'linusnorton', 'linusnorton'),
  (91, 'REQ-0091', 'Third Party User Management - Current', '### **PROBLEM STATEMENT**

System admin users in CaTH access several system functionalities through the System Admin dashboard which allows them to perform administrative tasks. The dashboard acts as the main control panel for managing reference data, user accounts, media accounts, audit logs, and other administrative operations. This ticket covers the system admin user''s ability to onboard, update and delete third~~party users through a structured, multi~~screen workflow. 
### **AS A** system admin
**I WANT** to create and manage a third-party user in CaTH
**SO THAT** I can manage external users efficiently while ensuring the right access permissions are applied.

  ### **TECHNIAL SPECIFICATIONS**
  * Create a new table named legacy_third_party_users with columns id, name and created_date
  * Create a new table named legacy_third_party_subscription with id, user_id, list_type_id, created_date. 
  * Implement audit logs for all the pages.
  * Create branch for this ticket from branch feature/VIBE-311-audit-log-view
 
### **ACCEPTANCE CRITERIA**
 * Only users with the **System Admin** role can access the System Admin Dashboard and all “Third-party user” management screens.
 * “Back” returns to the previous screen {**}without losing saved data{**}.
 * Page refresh does not create duplicate third-party users (idempotency on create confirm).
 * Create, update (subscriptions), and delete actions write an audit entry capturing: admin user, timestamp, third-party name, action type, before/after values (where applicable).

**The create third party user process:**

**Screen Flow:** Dashboard → Manage Third Party Users → Create Third Party User → Summary → Confirmation
 * System Admin can navigate from **Dashboard → Manage Third Party Users** where a table displays third~~party users **Name and Created date** where existing third parties are already in the system and a **Manage** link/action per row / third party user. Where no third~~party user exists, then the table is empty and the manage link is not displayed.
 * A green ''{**}Create new User''{**} button is displayed above the table which when clicked, takes the system admin user to the ‘Create third party user’ page to fill in the third-party user name in a free text box and When complete, the system admin clicks on the green ''Continue'' button to continue.
 * The System Admin is taken to the ''Create third party user summary'' screen that displays the entered details in a table beside the ''Name'' in a row in read~~only format with a ''Change'' link on each row which enables the editing of the inputted data by returning user to the **Create third party user** page with the previously entered Name pre~~populated.
 * Clicking **Confirm** on summary screen creates the third-party user and displays a **“Third party user created”** and the created **Name** on the confirmation page.
 * System must validate mandatory fields before allowing Continue.
 * System displays an error message if required data is missing.
 * Name is mandatory.

 * Name cannot be only whitespace.
 * Name length and character rules are enforced
 * Created user is added to the third-party users list.

 * A table is created in the database (Third Party User Table) with the following data fields; Name, Created Date, sensitivity and subscriptions and each newly created third party is saved in the table

 

**The update third party user process:**

**Screen Flow:**  Dashboard → Manage Third Party Users → Manage User → Manage Subscriptions → Subscriptions Updated
 *  System Admin can navigate from **Dashboard → Manage Third Party Users** where the system admin is able to view existing third-party user details and update subscription options by clicking the ''{**}Manage''{**} button
 * The System Admin is taken to the ''Manage user'' screen which displays a table with the third party user details in rows titled ''Name'', ''Created Date'', ''Number of subscriptions'''' and ''Sensitivity'' and two actionable buttons below; a green **Manage subscriptions** button which routes to **Manage third party subscriptions** and a red **Delete user** button which routes to the delete confirmation screen.
 * Clicking the green “Manage Subscriptions” button take the system admin to the “Manage third party Subscriptions” page. The “Manage third party Subscriptions” screen displays a radio button under the following descriptive text under the page title ''Please select a Channel''. This is followed by the text ''Please select list types'' and then **all list types available in CaTH** in rows beginning with a checkbox beside each list type.
 * Upon selection, clicking the green “Save Subscriptions” button on the last page updates the changes and takes the system admin user to the ‘{**}Third party subscriptions updated{**}’ confirmation page

 

**The delete third party user process:** 

**Screen Flow:** Dashboard → Manage Third Party Users → Manage User → Delete Confirmation → Deletion Confirmation
 * System Admin can navigate from **Dashboard → Manage Third Party Users** where the system admin is able to view existing third-party user details and update subscription options by clicking the ''{**}Manage''{**} button
 * The System Admin is taken to the ''Manage user'' screen which displays a table with the third-party user details in rows titled ''Name'', ''Created Date'', ''Number of subscriptions'''' and ‘Sensitivity''
 * Clicking the red “Delete user” button take the system admin to the “Are you sure you want to delete <third party>?” screen where the system admin can select from a ''Yes'' or ''No'' radio button and click the green “Continue” to confirm. Screen title includes the selected third-party name (e.g., “Are you sure you want to delete <third party>.?”). the ‘Yes’ radio button confirms deletion action while the ‘No’ radio button cancels the action and returns to **Manage user** page without deleting anything. The System Admin must explicitly confirm deletion before the system proceeds to delete the third party.
 * The System displays a **Deletion Confirmation** screen with the title ''Third party user deleted'' and the descriptive text ''The third party user and associated subscriptions have been removed'' both in a green banner, followed by the text below; ''What do you want to do next?'' and then two links; ''Manage another third party user'' which take the system admin user back to the respective screen  and the ''Home'' screen which takes user to the dashboard.
 * Deletion removes the third-party user **and associated subscriptions** and the Deleted user no longer appears in the user list.
 * System prevents deletion of users with dependencies (if applicable).
 * Audit logging is triggered for create, update, and delete actions 

 

**Welsh translations**
 * Create new user - Creu defnyddiwr newydd
 * Name - enw''r
 * Created date - Crëwyd Dyddiad
 * Number of subscriptions
 * Sensitivity 
 * Actions - Camau gweithredu
 * Manage - Rheoli
 * Continue - Parhau
 * Create third party user - Creu defnyddiwr trydydd parti 
 * Create third party user - Wedi methu creu defnyddiwr trydydd parti 
 * Create third party user summary - Creu crynodeb o ddefnyddiwr trydydd parti
 * Change - newid
 * Confirm - Cadarnhau
 * Third party user created - Crëwyd defnyddiwr trydydd parti
 * The third party user has been successfully created
 * Role - 
 * Manage subscriptions - Rheoli tanysgrifiadau
 * Delete user - Dileu Defnyddiwr
 * Classified
 * Private
 * Public
 * unselected 
 * Manage third party subscriptions - Rheoli tanysgrifiadau trydydd parti
 * subscriptions - tanysgrifiadau
 * third party - Trydydd Parti
 * confirm subscriptions - Cadarnhau tanysgrifiadau
 * Third party subscriptions updated - Diweddarwyd Tanysgrifiadau Trydydd Parti
 * Third party subscriptions for the user have been successfully updated
 * To manage further subscriptions for third parties, you can go to
 * Manage third party users - Rheoli defnyddiwr trydydd parti
 * Are you sure you want to delete user <third party>? - Ydych chi''n siŵr eich bod eisiau dileu defnyddiwr?
 * Yes - Ydw
 * No - Nac ydw
 * Select yes or no to continue
 * Third party user deleted
 * Home
 * back - Yn ôl', 'functional', 'verified', 'medium', 'story', 322, 'https://github.com/hmcts/cath-service/issues/322', '2026-01-29T16:02:45Z', '2026-04-15T11:15:45Z', 'linusnorton', 'linusnorton'),
  (92, 'REQ-0092', 'Third Party subscription Fulfilment - Current', '**PROBLEM STATEMENT**

Third Party users can subscribe to receive publications from CaTH. This ticket covers the Third Party Subscription fulfilment process.

 

**AS A** CaTH Third Party Subscriber 

**I WANT** to receive email notifications when hearing lists I’m subscribed to in CaTH are published

**SO THAT** I am aware when a new hearing list is published

**AND** can download a copy of this list

 

**Pre-Condition**
 * CaTH Third Party users can subscribe to receive specific hearing lists published in CaTH

 **TECHNIAL SPECIFICATION**
 * When we receive a publication via manual upload or api endpoint (json/flat file) for a specific list, it needs to send to the third party user (if subscriber to that list) 
 * Get Third party url and certificate (trust store) from keyvault 
 * As part of PUSH, following headers information also need to be added: x-provenance, x-source-artefact-id, x-type, x-list-type, x-content-date, x-sensitivity, x-language, x-display-from, x-display-to, x-location-name, x-location-jurisdiction and x-location-region. x-location-name, x-location-jurisdiction and x-location-region will come from reference data (location table). It also includes PDF generated for that list.
 * Retries three times if request fails.
 * If publication manually deleted, we send POST request with all the headers but body is blank.

**ACCEPTANCE CRITERIA**
 * When a CaTH Third Party user subscribes to publications in CaTH and a publication matching the users'' subscriptions is uploaded to CaTH, the system fulfils the subscription by identifying the Third Party User ID subscribed to that publication. 
 * The system retrieves the publication metadata from artefact table and sends the file in JSON format to the Third Party using the POST endpoint
 * The system should push the file to the third party their API (P&I push) using the third party authorisation certificate
 * An acknowledgment receipt should be issued in the form of a HTTP status return 
 * Third Party Subscribers are notified when publications are uploaded, updated or manually deleted before expiry, using the correct status code
 * Successful <`**POST**`>(https://hmcts.github.io/restful~~api~~standards/#post) requests will generate:
 ** 200 (if resources have been updated)
 ** 201 (if resources have been created)
 ** 202 (if the request was accepted but has not been finished yet)
 *** 204 with <`**Location*`>(https://tools.ietf.org/html/rfc7231#section-7.1.2) header (if the actual resource is not returned)
 * Validation is established to ensure no publication is sent when the trigger has not been activated, to ensure that Non-subscribed JSON payload is not sent to the third party and to ensure that the system differentiates between newly uploaded and updated publication 
 * Integration test and Unit test are performed', 'functional', 'verified', 'medium', 'story', 323, 'https://github.com/hmcts/cath-service/issues/323', '2026-01-29T16:02:45Z', '2026-06-05T15:11:14Z', 'linusnorton', 'linusnorton'),
  (93, 'REQ-0093', 'Project Prep Tasks', '#### This epic is raised to capture preparatory tasks needed for the CaTH AI project.', 'functional', 'verified', 'lowest', 'epic', 328, 'https://github.com/hmcts/cath-service/issues/328', '2026-01-30T13:58:56Z', '2026-01-30T15:05:27Z', 'linusnorton', 'linusnorton'),
  (94, 'REQ-0094', '‘What do you want to do?’ Page', '**PROBLEM STATEMENT**

All CaTH users, including members of the public, have access to hearing lists published in CaTH. This would require users to undergo a few steps to navigate through the different pages in CaTH including selection what they want to view.

 

**AS A** CaTH User

**I WANT** to select a court/tribunal

**SO THAT** I can view specific hearing lists

 

**ACCEPTANCE CRITERIA**
 * All CaTH users have access to unrestricted published hearing information in CaTH
 * All users access the ‘What do you want to do?’ Page by clicking the ‘continue’ button on the landing page
 * All users can see 2 radio buttons to select either to ‘find a court or tribunal’ or ‘find a single justice procedure case’
 * Under the ‘find a court or tribunal’, the descriptive text in the bracket is provided (View time, location, type of hearings and more)
 * Under the ‘find a single justice procedure case’ option, the descriptive text in the bracket is provided (TV licensing, minor traffic offences such as speeding and more)
 * Users can continue the process by clicking the ‘continue’ button
 * All CaTH pages specifications are maintained', 'functional', 'verified', 'high', 'story', 329, 'https://github.com/hmcts/cath-service/issues/329', '2026-01-30T13:59:35Z', '2026-01-30T15:05:29Z', 'linusnorton', 'linusnorton'),
  (95, 'REQ-0095', 'Upload Reference Data', '**PROBLEM STATEMENT**

This ticket is raised to upload the reference data needed to publish hearing lists in CaTH.

 

**AS A** System Admin

**I WANT** to upload reference data in CaTH

**SO THAT** the reference data needed for publishing hearing lists is available in CaTH

 

**Technical Criteria**
 * Tables created for Location, Jurisdiction, Sub-Jurisdiction and Region based on mock data
 * Pre~~loading of jurisdiction, Sub~~jurisdiction and region tables with ref data
 * If location ID already exists, overwrite else create new
 * If Sub jurisdiction and region lookups fail, error to be displayed
 * If any row fails validation, no locations are updated and user error is displayed
 * If text contains HTML tags, upload should fail. Regex: <<^>>+>
 * If location name or welsh location name already exists within the DB or a duplicate within the file itself, upload should fail. Add constraint to table for this.

 

**ACCEPTANCE CRITERIA**
 * A master Court reference data will be created as a CSV file to store all required court reference data for upload in CaTH
 * The csv file contains columns titled as follows; LOCATION*ID (PK - Integer), LOCATION*NAME, WELSH*LOCATION*NAME, SUB*JURISDICTION*NAME (Lookup only - ID is stored in DB), REGION_NAME (Lookup only - ID is stored in DB)
 * The Court master reference data CSV file is uploaded in CaTH through the ''Upload Reference Data'' tile on the system admin dashboard in CaTH
 * The CSV file should be max size 2MB and must be in the right format for it to be manually uploaded in CaTH
 * System admin begins the upload process by clicking on the ‘Upload reference data'' tile on the system admin dashboard 
 * The system admin is taken to the page titled ‘Manually upload a csv file’ 
 * Above the title, a ''warning'' is displayed in a grey banner with the warning logo and the descriptive message ''Prior to upload you must ensure the file is suitable for location data upload e.g. file should be in correct formats.''
 * Underneath the page title is a link to ''Download current reference data''
 * This is followed by a descriptive message that states ''Manually upload a csv file (saved as Comma-separated Values .csv), max size 2MB'' and a ''choose file'' tab
 * The system admin clicks on the ‘choose file’ tab to upload the csv file and clicks the green ''Continue'' button to continue the upload process

 * The system admin is taken to the next page titled ''Check upload details'' which displays row with ''File'' in the first column of the row and the uploaded file name in the 2nd column and then in the 3rd column a link to make changed to the uploaded file is masked in the text ''change'' followed by a green ''confirm'' button
 * The system admin clicks the confirm button after checking the uploaded file details to complete the upload process or clicks the ‘change link to change the uploaded file
 * Where there is an error with the uploaded file, then the following message is displayed in a red box ''There is a problem'' followed by the following text in red colour Unable to upload reference data file, please verify that provided fields are correct'' 

 * Upon successful upload, a confirmation screen with green coloured banner displays ''File Upload Successful'' as the header and a sub-header in the same banner displays the descriptive message ''Your file has been uploaded''.  Underneath the banner is another section titled '' What do you want to do next?'' and beneath that are 2 action links ''Upload another file'' and ''Home'' which take the user back to the upload page and to the system admin dashboard respectively.

 * All CaTH page specifications are maintained. 

 
 # VIBE-180 Upload Reference Data Specification

> Owner: {**}`**`VIBE-180`**`{**} · Updated: {**}`**`24 Oct 2025`**`{**}

—
 # 
 ## Problem Statement

This ticket is raised to upload the reference data needed to publish hearing lists in CaTH.  
The system must allow a System Admin to manually upload a reference data CSV file through the CaTH System Admin Dashboard.

—
 # 
 ## User Story

{**}`**`As a`**`{**} **System Admin**  
{**}`**`I want to`**`{**} **upload reference data in CaTH**  
{**}`**`So that`**`{**} **the reference data needed for publishing hearing lists is available in CaTH**

—
 # 
 ## Acceptance Criteria

1. A {**}`**`master Court reference data file`**`{**} is created as a CSV to store all required court reference data for upload into CaTH.  
2. The CSV file contains the following columns:  
   - CONTACT  
   - COURT DESC  
   - EMAIL  
   - JURISDICTION  
   - JURISDICTION TYPE  
   - P&I ID  
   - PROVENANCE  
   - PROVENANCE LOCATION ID  
   - PROVENANCE LOCATION TYPE  
   - REGION  
   - WELSH COURT DESC  
   - WELSH JURISDICTION  
   - WELSH JURISDICTION TYPE  
   - WELSH REGION  
3. The Court master reference data CSV file is uploaded via the {**}`**`‘Upload Reference Data’`**`{**} tile on the System Admin Dashboard.  
4. The CSV file must:  
   - Be a valid `.csv` format (Comma-Separated Values)  
   - Have a {**}`**`maximum file size of 2MB`**`{**}  
5. The System Admin initiates the process by clicking the {**}`**`‘Upload Reference Data’`**`{**} tile.  
6. The admin is taken to a page titled {**}`**`‘Manually upload a csv file’`**`{**}.  
7. A grey {**}`**`warning banner`**`{**} is displayed at the top with a warning icon and the message:  
   > “Prior to upload you must ensure the file is suitable for location data upload e.g. file should be in correct formats.”  
8. Below the title, a {**}`**`‘Download current reference data’`**`{**} link is displayed.  
9. Beneath this, a descriptive text reads:  
   > “Manually upload a csv file (saved as Comma-separated Values .csv), max size 2MB”  
10. A {**}`**`‘Choose file’`**`{**} tab allows the admin to select the file, and a {**}`**`green ‘Continue’`**`{**} button proceeds with the upload.  
11. On clicking Continue, the system navigates to the {**}`**`‘Check upload details’`**`{**} page.  
12. The page displays:  
    - A row with {**}`**`File`**`{**} in the first column, the uploaded filename in the second, and a {**}`**`‘change’`**`{**} link in the third.  
    - A {**}`**`green ‘Confirm’`**`{**} button beneath to confirm the upload.  
13. The admin can click {**}`**`‘Change’`**`{**} to reselect a file, or {**}`**`‘Confirm’`**`{**} to complete the upload.  
14. If there is an error with the file, a red box appears with:  
    - Header: {**}`**`“There is a problem”`**`{**}  
    - Message: {**}`**`“Unable to upload reference data file, please verify that provided fields are correct.”`**`{**}  
15. Upon successful upload, a green confirmation banner displays:  
    - Header: {**}`**`“File upload successful”`**`{**}  
    - Sub-header: {**}`**`“Your file has been uploaded.”`**`{**}  
16. Beneath the banner, a section titled {**}`**`“What do you want to do next?”`**`{**} displays two action links:  
    - {**}`**`Upload another file`**`{**} → returns to the upload page  
    - {**}`**`Home`**`{**} → returns to the System Admin Dashboard  
17. All CaTH page and accessibility standards are maintained.

—
 # 
 ## User Journey Flow

1. System Admin signs in using SSO credentials.  
2. Admin clicks {**}`**`Upload Reference Data`**`{**} on the Dashboard.  
3. The {**}`**`Upload CSV page`**`{**} loads with a warning and file selection area.  
4. Admin selects a `.csv` file and clicks {**}`**`Continue`**`{**}.  
5. The {**}`**`Check upload details`**`{**} page loads, showing the filename and options to {**}`**`Change`**`{**} or {**}`**`Confirm`**`{**}.  
6. If confirmed, the system validates the file:  
   - On success → Success page displays.  
   - On error → Error message displayed.  
7. On success, admin can either upload another file or return home.

—
 # 
 ## Wireframes

 # 
 ## 
 ### A. Upload Reference Data Page

┌──────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK <Language Toggle> │
├──────────────────────────────────────────────────────────────────────────────┤
│ HMCTS – Courts and Tribunals Hearings (CaTH) │
├──────────────────────────────────────────────────────────────────────────────┤
│ ⚠️ Prior to upload you must ensure the file is suitable for location data │
│ upload e.g. file should be in correct formats. │
│ │
│ Manually upload a csv file │
│ <Download current reference data> │
│ │
│ Manually upload a csv file (saved as Comma-separated Values .csv), │
│ max size 2MB │
│ <Choose file> │
│ <Continue> (Green Button) │
└──────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## 
 ### B. Check Upload Details Page

┌──────────────────────────────────────────────────────────────────────────────┐
│ GOV.UK <Language Toggle> │
├──────────────────────────────────────────────────────────────────────────────┤
│ HMCTS – Courts and Tribunals Hearings (CaTH) │
├──────────────────────────────────────────────────────────────────────────────┤
│ Check upload details │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ File | reference*data*2025.csv | change │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ <Confirm> (Green Button) │
└──────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## 
 ### C. Error Page

┌──────────────────────────────────────────────────────────────────────────────┐
│ ❌ There is a problem │
│ Unable to upload reference data file, please verify that provided fields │
│ are correct. │
└──────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## 
 ### D. Upload Success Page

┌──────────────────────────────────────────────────────────────────────────────┐
│ ✅ File upload successful │
│ Your file has been uploaded. │
│ │
│ What do you want to do next? │
│ • Upload another file │
│ • Home │
└──────────────────────────────────────────────────────────────────────────────┘

 

—
 # 
 ## Form Fields

|Field|Type|Required|Description|Validation|
|~~--~~~~--~~|~~--~~~~-|~~~~--~~~~--~~~~-|~~~~--~~~~--~~~~--~~~~|-~~~~--~~~~--~~---|
|Choose file|File upload|Yes|Accepts .csv files only|Must be .csv format and ≤ 2MB|
|Confirm|Button|Yes|Submits the upload for validation|Enabled after file selection|

—
 # 
 ## Content

{**}`**`EN:`**`{**}  
 - Warning Banner — “Prior to upload you must ensure the file is suitable for location data upload e.g. file should be in correct formats.”  
 - Page Title — “Manually upload a csv file”  
 - Description — “Manually upload a csv file (saved as Comma-separated Values .csv), max size 2MB”  
 - Link — “Download current reference data”  
 - Buttons — “Continue”, “Confirm”, “Change”  
 - Success Banner — “File upload successful”, “Your file has been uploaded.”  
 - Section Title — “What do you want to do next?”  
 - Links — “Upload another file”, “Home”  
 - Error Message — “Unable to upload reference data file, please verify that provided fields are correct.”  

{**}`**`CY:`**`{**}  
 - Warning Banner — “Welsh placeholder”  
 - Page Title — “Welsh placeholder”  
 - Description — “Welsh placeholder”  
 - Link — “Welsh placeholder”  
 - Buttons — “Welsh placeholder”, “Welsh placeholder”, “Welsh placeholder”  
 - Success Banner — “Welsh placeholder”, “Welsh placeholder”  
 - Section Title — “Welsh placeholder”  
 - Links — “Welsh placeholder”, “Welsh placeholder”  
 - Error Message — “Welsh placeholder”

—
 # 
 ## URL Structure

|Page|URL|
|~~--~~~~-|~~---|
|Upload reference data|`/admin/upload~~reference~~data`|
|Check upload details|`/admin/upload~~reference~~data/check`|
|Success page|`/admin/upload~~reference~~data/success`|
|Error page|`/admin/upload~~reference~~data/error`|

—
 # 
 ## Validation Rules

 - Only authenticated {**}`**`System Admins`**`{**} can access upload functionality.  
 - File must be a `.csv` and ≤ 2MB; otherwise, show an error message.  
 - The file name must not contain special characters.  
 - System validates file headers against required column names.  
 - Successful upload triggers success confirmation; invalid headers trigger the error message.  

—
 # 
 ## Error Messages

{**}`**`EN:`**`{**}  
 - “Unable to upload reference data file, please verify that provided fields are correct.”  
 - “There is a problem.”  
 - “File exceeds the maximum size limit (2MB).”  
 - “Unsupported file type. Please upload a .csv file.”  

{**}`**`CY:`**`{**}  
 - “Welsh placeholder”  
 - “Welsh placeholder”  
 - “Welsh placeholder”  
 - “Welsh placeholder”

—
 # 
 ## Navigation

 - {**}`**`Upload Reference Data Tile`**`{**} → `/admin/upload~~reference~~data`  
 - {**}`**`Continue`**`{**} → `/admin/upload~~reference~~data/check`  
 - {**}`**`Confirm`**`{**} → `/admin/upload~~reference~~data/success`  
 - {**}`**`Change`**`{**} → Returns to Upload Reference Data page  
 - {**}`**`Upload another file`**`{**} → `/admin/upload~~reference~~data`  
 - {**}`**`Home`**`{**} → `/admin/dashboard`  

—
 # 
 ## Accessibility

 - Must comply with {**}`**`WCAG 2.2 AA`**`{**} and {**}`**`GOV.UK Design System`**`{**} standards.  
 - Warning and success banners must have ARIA roles (`role="alert"` and `role="status"`) to ensure accessibility.  
 - File input element must be operable by keyboard.  
 - Focus must shift to the success or error banner after submission.  
 - Ensure all buttons and links have visible focus states.  
 - Provide text alternatives for icons (e.g., warning, checkmark).  

—
 # 
 ## Test Scenarios

|ID|Scenario|Steps|Expected Result|
|~~--~~|~~--~~~~--~~~~--|~~~~--~~~~--|~~~~--~~~~--~~~~--~~---|
|TS1|Valid upload|Select valid `.csv` file ≤ 2MB, click Continue → Confirm|File uploaded successfully|
|TS2|Invalid file format|Upload `.xls` or `.txt`|Error: “Unsupported file type.”|
|TS3|Invalid column headers|Upload `.csv` missing columns|Error message displayed|
|TS4|Exceed size limit|Upload > 2MB file|Error message displayed|
|TS5|Confirm upload|Click Confirm|Success page appears|
|TS6|Change file|Click Change|Returns to upload page|
|TS7|Success navigation|Click “Upload another file”|Returns to upload page|
|TS8|Success navigation|Click “Home”|Redirects to admin dashboard|
|TS9|Accessibility test|Use keyboard navigation only|All elements reachable and labelled|
|TS10|Screen reader test|Use assistive technology|Banner and messages announced correctly|

—
 # 
 ## Assumptions / Open Questions

 - Confirm if multiple reference data types (e.g., location, jurisdiction) will share this same upload flow.  
 - Confirm if file uploads trigger automatic database refresh or require manual review.  
 - Confirm if a log entry should be generated for each upload (e.g., timestamp, admin ID).  
 - Confirm if an email confirmation should be sent after a successful upload.  
 - Confirm if Welsh translation will be hard-coded or managed by a translation service.

—', 'functional', 'verified', 'high', 'story', 330, 'https://github.com/hmcts/cath-service/issues/330', '2026-01-30T14:01:18Z', '2026-01-30T15:05:31Z', 'linusnorton', 'linusnorton'),
  (96, 'REQ-0096', 'Merge Tests Related to Manual Upload (Flat File)', '**Description:**
Currently, there are three separate test files created for the manual upload (flat file) functionality across different tickets. This task aims to merge all these tests into a single, unified test file. During this process, any tests that are not necessary for validating the core functionality should be removed to ensure the test suite remains efficient, relevant, and easy to maintain.

**Acceptance Criteria:**
 * Review all existing manual upload test cases.

 * Merge the relevant tests into one comprehensive test file.

 * Remove any tests that are not required for the functionality.

 * Ensure the final test file fully covers the manual upload process.

 * Verify that the new test file executes successfully in the pipeline.', 'non_functional', 'verified', 'medium', 'task', 332, 'https://github.com/hmcts/cath-service/issues/332', '2026-01-30T14:05:30Z', '2026-01-30T15:05:34Z', 'linusnorton', 'linusnorton'),
  (97, 'REQ-0097', 'PDDA/HTML', '**PROBLEM STATEMENT**
To implement the Crown lists publishing in CaTH, the PDDA functionality sends data in HTML/HTM format to the AWS S3 bucket. This ticket captures the requirements needed to implement the PDDA/HTML connection.

**AS A** Service
**I WANT** to implement the PDDA/HTML functionality in CaTH
**SO THAT** the Crown hearing lists can be published in CaTH

**TECHNIAL SPECIFICATION**

- Add a new column in artefact table named type - set the value of existing artefacts as LIST.
- Add new artefact type LCSU to be used when system receives an HTML.
- AWS S3 bucket name will be stored a environment variable.
- AWS S3 secrets xhibit-s3-access-key and xhibit-s3-access-key-secret can get from azure keyvault.


**ACCEPTANCE CRITERIA** 
•	Both HTM and HTML files are to be accepted 
•	When PDDA sends HTML file to CaTH, the file is to be passed through to XHIBIT Simple Storage Service (S3) on AWS; hence, the credential needed to connect and send data to the XHIBIT S3 bucket is configured and the correct residential region of the S3 bucket is specified
•	A new endpoint is created in API to push the data file (HTM/ HTML to AWS S3 bucket since the data ingestion from PDDA is not through the HMI APIM, but through the publication upload endpoint/CaTH APIM.
•	AWS S3 SDK should be set up in API to communicate with S3
•	A new value LCSU is added to the ArtefactType which is to be used by PDDA when sending html to PIP APIM
•	Functional test is added to the API to upload the html file
•	Functional test is added to upload the html/htm file to file to S3 bucket and check the uploaded file exists in the S3 bucket

**Specifications:**
**Form fields**
•	Artefact type
o	Input type: text (enum)
o	Required: Yes
o	Validation:
	Must equal “LCSU” for this PDDA HTM/HTML publishing flow.
	Reject any other value for this endpoint (or route non-LCSU artefact types to existing handling, if applicable — see open clarification).
•	File
o	Input type: file (binary)
o	Required: Yes
o	Validation:
	File extension must be “.htm” or “.html” (case-insensitive).
	File content type must be accepted for HTM/HTML (exact allowed MIME types to confirm; validate if provided, but do not rely solely on MIME type).
	File must not be empty.
	Maximum file size: **TBD (required input).**
•	Filename
o	Input type: text (derived from upload metadata)
o	Required: Yes
o	Validation:
	Must end with “.htm” or “.html” (case-insensitive).
	Must not include path traversal characters/sequences (e.g., “../”, “..\”).
	Maximum length: **TBD (required input).**
•	S3 destination key (object key)
o	Input type: text (system-generated)
o	Required: Yes (generated)
o	Validation:
	Must map deterministically to an agreed S3 prefix/path for XHIBIT uploads.
	Must be unique enough to avoid overwriting unless overwrites are explicitly required (**TBD**).
•	AWS region
o	Input type: config value
o	Required: Yes
o	Validation:
	Must match the residential region of the target XHIBIT S3 bucket.
•	AWS credentials
o	Input type: secret/config value
o	Required: Yes
o	Validation:
	Must be valid for PutObject (and HeadObject/List if used by verification) against the target bucket/prefix.
•	Correlation / request ID
o	Input type: header (text)
o	Required: No (but recommended)
o	Validation:
	If present, must be a non-empty string; max length **TBD.**
________________________________________
**Content**
•	EN: Title/H1 “PDDA HTM/HTML upload to XHIBIT S3”
•	CY: Title/H1 “Welsh placeholder”
•	EN: Body text — “Accept HTM/HTML files from PDDA via CaTH publication upload flow and upload them to the XHIBIT AWS S3 bucket.”
•	CY: Body text — “Welsh placeholder”
•	EN: Endpoint label — “Publication-services: Upload PDDA Crown list (HTM/HTML) to S3”
•	CY: Endpoint label — “Welsh placeholder”
•	EN: Supported file types — “.htm, .html”
•	CY: Supported file types — “Welsh placeholder”
•	EN: Artefact type — “LCSU”
•	CY: Artefact type — “Welsh placeholder”
•	EN: Success response — “Upload accepted and stored”
•	CY: Success response — “Welsh placeholder”
•	EN: Audit/log event — “HTM/HTML artefact received from PDDA and uploaded to XHIBIT S3”
•	CY: Audit/log event — “Welsh placeholder”
•	EN: Button — “Continue”
•	CY: Button — “Welsh placeholder”
________________________________________
**Errors**
•	Invalid file extension
o	EN: “The uploaded file must be an HTM or HTML file”
o	CY: “Welsh placeholder”
•	Missing file
o	EN: “Select an HTM or HTML file to upload”
o	CY: “Welsh placeholder”
•	Invalid artefact type
o	EN: “ArtefactType must be LCSU for HTM/HTML uploads”
o	CY: “Welsh placeholder”
•	File too large
o	EN: “The uploaded file is too large”
o	CY: “Welsh placeholder”
•	Unsupported content type (if validated)
o	EN: “The uploaded file type is not supported”
o	CY: “Welsh placeholder”
•	S3 upload failure (connectivity/permissions)
o	EN: “The file could not be uploaded to storage. Try again.”
o	CY: “Welsh placeholder”
•	S3 region misconfiguration
o	EN: “Storage configuration error prevented upload”
o	CY: “Welsh placeholder”
•	S3 verification failure (object not found after upload, if verification is implemented)
o	EN: “Upload could not be verified”
o	CY: “Welsh placeholder”
________________________________________
**Back navigation**
•	Not applicable (service-to-service API flow with no user navigation).
•	If CaTH APIM upload endpoint supports retries:
o	A failed upload must allow safe retry without corrupting downstream state (idempotency expectations TBD).
________________________________________
**Accessibility**
•	Ensure error messages returned by the upload flow are concise, consistent, and machine-readable for any consuming UI (where applicable).
•	Ensure logs/audit events include correlation identifiers to support support/operations without exposing sensitive credentials or file contents.
•	Ensure any user-facing surfacing of errors (if a UI exists in the upload path) follows WCAG 2.2 AA: clear error summary, field association, and predictable language toggling.
________________________________________
**Test Scenarios**
•	File type acceptance
o	Upload “.html” file with ArtefactType=LCSU succeeds and is passed to S3.
o	Upload “.htm” file with ArtefactType=LCSU succeeds and is passed to S3.
o	Upload “.txt” (or any other extension) is rejected with the correct error.
•	ArtefactType validation
o	Upload HTM/HTML with ArtefactType≠LCSU is rejected with the correct error (or routed to existing handling if defined — TBD).
•	S3 integration
o	Successful upload results in an object existing in the XHIBIT S3 bucket at the expected key/prefix.
o	Upload fails gracefully when AWS credentials are invalid (expect appropriate error and no partial success).
o	Upload fails gracefully when S3 region is incorrect/mismatched.
•	API functional test (as per acceptance criteria)
o	Functional test uploads an HTML file through the API and validates the request completes successfully.
•	End-to-end verification functional test (as per acceptance criteria)
o	Functional test uploads an HTML/HTM file and verifies the object exists in S3 (via HeadObject or equivalent).
•	Observability
o	Logs include correlation/request ID (when provided) and record the resulting S3 key, without logging file contents or secrets.
________________________________________
**CLARIFICATIONS REQUIRED BEFORE THIS CAN BE TREATED AS “FINAL”** 
•	Exact Publication-services endpoint path, HTTP method, and expected request shape (multipart vs raw body), including required headers.
•	Maximum file size and any timeout expectations.
•	Exact allowed MIME types (if validation is required) and whether MIME validation is mandatory or best-effort.
•	S3 bucket name/prefix conventions and object key naming rules (including whether overwrites are allowed and idempotency strategy).
•	Whether non-LCSU artefact types should be rejected by this new endpoint or handled by existing publication upload logic.
•	Expected response codes for success/failure (e.g., 200/201/202, and specific 4xx/5xx mapping).', 'functional', 'verified', NULL, NULL, 334, 'https://github.com/hmcts/cath-service/issues/334', '2026-02-02T16:41:24Z', '2026-06-08T08:27:38Z', 'OgechiOkelu', 'OgechiOkelu'),
  (98, 'REQ-0098', 'Refactor the code to use List information from the database table', 'Currently, lots of pages are getting list information from mock file. We need to update the code so that all the list information comes for list type database tables.

**Acceptance criteria:**

- All pages are getting list type information from database
- list type mock file has been deleted from the code repository.', 'functional', 'approved', NULL, 'epic', 342, 'https://github.com/hmcts/cath-service/issues/342', '2026-02-11T11:41:46Z', '2026-02-12T21:41:50Z', 'junaidiqbalmoj', 'junaidiqbalmoj'),
  (99, 'REQ-0099', 'Subscription Emails Fulfilment Complete Journey', 'Once excel generation for SJP has been implemented. We need to make sure that user is able to get all four types of subscriptions emails which have been configured in Gov Notifier:

Media Publication Subscription (JSON) - Both PDF and Excel. This will be send when list type is SJP list and file size is less than 2MB.
Template id: 4017c40f-0644-4b02-acd2-e00a1ece3b85
Personalisation list: 

- if there is case number, display_case_num will be true 
- case_num
- if there is case urn, display_case_urn will be true 
- case_urn
- if there is location, display_locations will be true 
- locations
- ListType
- content_date
- pdf_link_text
- excel_link_text
- display_summary
- summary_of_cases

Media Publication Subscription (JSON) - Excel Only - SJP Press list (need to check)
Template id: e03108e1-db29-40d3-90f2-bf8f6c233c35
Personalisation list: 

- if there is case number, display_case_num will be true 
- case_num
- if there is case urn, display_case_urn will be true 
- case_urn
- if there is location, display_locations will be true 
- locations
- ListType
- content_date
- excel_link_text
- display_summary
- summary_of_cases

Media Publication Subscription (JSON) - No Link - If any list size is more than 2MB (mostly SJP lists)
Template id: 072fa7fd-ac23-4a99-be9a-70153374c66e
Personalisation list: 

- if there is case number, display_case_num will be true 
- case_num
- if there is case urn, display_case_urn will be true 
- case_urn
- if there is location, display_locations will be true 
- locations
- ListType
- content_date
- display_summary
- summary_of_cases

Media Publication Subscription (JSON) - PDF Only. All the list except SJP lists and size is less than 2MB
Template id: e551a0c1-91e7-4871-a540-1e7101b70f14
Personalisation list: 

- if there is case number, display_case_num will be true 
- case_num
- if there is case urn, display_case_urn will be true 
- case_urn
- if there is location, display_locations will be true 
- locations
- ListType
- content_date
- pdf_link_text
- display_summary
- summary_of_cases

As a part of this ticket, we need to tell AI about the personalisation lists and also ask to include dynamic text like case number,  name or urn in the email subject.

**Acceptance criteria:**

- User is able to get all four type of subscription emails.', 'functional', 'implemented', 'medium', 'story', 343, 'https://github.com/hmcts/cath-service/issues/343', '2026-02-11T12:00:11Z', '2026-06-08T16:36:45Z', 'junaidiqbalmoj', 'junaidiqbalmoj'),
  (100, 'REQ-0100', 'Complete Azure B2C media user creation journey', 'As part of this ticket, once CTSC Admin approves the media application, we need to make that user has been created in Azure AD using graph api and relevant emails will be sent to the user.

If it is a new user, we need to send Media New Account Confirmation & Setup
Template Id: 689c0183-0461-423e-a542-de513a93a5b7
Personalisation list:

- Full name
- forgot password process link

if user already exists, we need to send Existing User Confirmation Email
Personalisation list:
Template Id: cc1b744d-6aa1-4410-9f53-216f8bd3298f
- forgot password process link
- subscription_page_link
- start_page_link


**Acceptance criteria**

- User created in Azure AD once admin approves
- User receive Confirmation & setup email if a new user otherwise receive Existing User Confirmation Email', 'functional', 'verified', 'medium', 'story', 346, 'https://github.com/hmcts/cath-service/issues/346', '2026-02-11T16:36:19Z', '2026-05-07T15:57:43Z', 'junaidiqbalmoj', 'junaidiqbalmoj'),
  (101, 'REQ-0101', 'Replace passport-azure-ad with openid-client', 'CaTH AI is currently using library passport-azure-ad which will be deprecated soon. Instead of using passport-azure-ad, we need to use openid-client in our application.

SSO_ISSUER_URL will be used from keyvault and Github secrets which has been added already.

Once both https://github.com/hmcts/cath-service/issues/229 and https://github.com/hmcts/cath-service/issues/357 merged, we need to make sure that both Azure B2C and Crime IDAM is using openid-client.

**Acceptance criteria**

- SSO logins are working and users are able to login successfully.
- CFT login is working and users are able to login successfully.
- Azure B2C is working and users are able to login successfully.
- Crime IDAM user is working and able to login successfully.', 'constraint', 'verified', 'medium', 'story', 347, 'https://github.com/hmcts/cath-service/issues/347', '2026-02-11T16:48:32Z', '2026-06-05T14:27:07Z', 'junaidiqbalmoj', 'junaidiqbalmoj'),
  (102, 'REQ-0102', 'Implement Crime IDAM Integration', 'I want to integrate Crime IDAM into the application so that users can authenticate securely and access crime-related services.

**Description:**
The application needs to integrate with Crime IDAM to enable secure authentication and authorisation for users accessing crime-related services. This integration will involve setting up environment variables, configuring endpoints, and ensuring proper handling of tokens and user roles.

The following environment variables must be added to the .env file:

- CRIME_IDAM_CLIENT_ID: The client ID for the Crime IDAM application.
- CRIME_IDAM_CLIENT_SECRET: The client secret for the Crime IDAM application.
- CRIME_IDAM_BASE_URL: The base URL for the Crime IDAM service (e.g., https://idam.crime.hmcts.net).
- CRIME_IDAM_REDIRECT_URI: The redirect URI configured in Crime IDAM for the application.
- CRIME_IDAM_SCOPE: The scope of access required (e.g., openid profile roles).

The application must use the Crime IDAM OAuth2 endpoints for:

- Authorisation (/oauth2/authorise).
- Token exchange (/oauth2/token).
- User info retrieval (/details).
- Ensure proper handling of access tokens and refresh tokens.

**Authentication Flow:**

- Users must be redirected to the Crime IDAM login page for authentication.
- Upon successful login, the application must handle the callback and exchange the authorisation code for an access token.
- The access token must be used to retrieve user details and roles

**Error Handling**

- Handle errors gracefully, such as invalid tokens, expired sessions, or unauthorised access.
- Display appropriate error messages to the user.', 'functional', 'verified', NULL, NULL, 357, 'https://github.com/hmcts/cath-service/issues/357', '2026-02-12T14:41:50Z', '2026-05-07T14:33:43Z', 'junaidiqbalmoj', 'junaidiqbalmoj'),
  (103, 'REQ-0103', 'System Admin - Data Management', '**PROBLEM STATEMENT:**
This ticket covers the implementation of the functionality needed to upload Reference Data, manage Jurisdiction Data and Reference Data. It will explore different options in the fulfilment of this scope of work.


**AS A** System Administrator
**I WANT** create a ‘Reference Data’ tile on the system admin dashboard
**SO THAT** I can manage all activities related to the jurisdiction and reference data from one central location.


**ACCEPTANCE CRITERIA:**
•	A single tile with title “Reference Data” is created in the system admin dashboard
•	Clicking the tile opens the Reference Data landing page titled ‘What do you want to do?’ which displays 4 action pathways; ‘Upload Reference Data’, ‘Manage Jurisdiction Data’, ‘Manage Location Jurisdiction Data’ and ‘Manage Location Metadata’. 2 options will be explored for the display of all 4 pathways. 1st option is presented as 4 tiles while the 2nd option is presented as 4 radio buttons.
•	Under the ‘Upload Reference Data’ is written the descriptive message ‘Upload CSV location reference data’
•	Under the ‘Manage Location Metadata’ is the descriptive message ‘View, update and remove location metadata’
•	Under the ‘Manage Jurisdiction Data’ is the descriptive message ‘View, update and remove jurisdiction metadata’
•	Under the ‘Manage Location Jurisdiction Data’ is the descriptive message ‘View and update location jurisdiction data’
•	Where the user selects the ‘Upload Reference Data’, then the user is taken to the ‘Manually upload a csv file’ page. A warning message displayed at the top reads as follows ‘Warning’ followed by the caution symbol and the message ‘Prior to upload you must ensure the file is suitable for location data upload e.g. file should be in correct formats.’. The link to the current reference data stored in the database is displayed under the warning and masked in the text ‘Download current reference data’. Underneath is written ‘Manually upload a csv file (saved as Comma-separated Values .csv), max size 2MB’ with a ‘Choose File’ tab which the user can click on to upload the csv file. This followed by the green ‘Continue’ button. Where no file is attached and user clicks the continue button, the message ‘Please provide a file’ is displayed in red above the upload portal.
•	Where the user selects ‘Manage Location Metadata’ the user is taken to the ‘Find the location metadata to manage’ page. ‘Search by court or tribunal name’ is displayed under the page header followed by a search tab with the following descriptive message displayed on top; ‘For example, Blackburn Crown Court’. This is followed by the green ‘Continue’ button which takes the user to the ‘Manage location metadata for Gateshead County Court and Family Court’ page which displays 4 free text bars with the following titles; ‘English caution message’, ‘Welsh caution message’, ‘English no list message’ and ‘Welsh no list message’, followed by the green ‘create’ button.

•	Where the user selects ‘Manage Jurisdiction Data’ the user is taken to the ‘What do you want to do?’ page where the user sees 2 radio buttons; ‘Create a new jurisdiction or sub-jurisdiction’ and ‘Modify an existing jurisdiction or sub-jurisdiction’, followed by a green ‘Continue’ button.
1.	Where the user selects the ‘Modify an existing jurisdiction or sub-jurisdiction’, then the user is taken to the ‘Modify an existing jurisdiction or sub-jurisdiction’ page which displays a table with columns titled ‘Name’, ‘Type’ and a third column the a ‘Modify’ link beside each row that allows the user click to modify the details provided in the row. On the left side of the page is a filter provided in the already existing CaTH filter format but with 2 search fields; ‘Jurisdiction’ and ‘Sub-Jurisdiction’. Each field displays the following message above the search box ‘Must be an exact match’ Users can search for specific jurisdictions or sub-jurisdiction and the system pulls up details regarding the search when the green ‘Apply filters’ button is clicked.
2.	Clicking on the ‘Modify’ link takes the user to the ‘Modify’ page which displays a table with 2 rows; ‘Name’ and ‘Type’ of the specific Jurisdiction/Sub-jurisdiction to be modified, followed by a green ‘Update’ and red ‘Delete’ button. Where the user selects ‘delete’, then the user is taken to a ‘Summary’ page that displays the same table on previous page, followed by the question ‘Are you sure you want to delete this Jurisdiction data? And then 2 ‘Yes’ and ‘No’ radio buttons and a green ‘Continue’ button which when clicked after a selection has been made, takes the user to the final confirmation page.
3.	The final confirmation page displays ‘Jurisdiction Data Deleted’ as a header in a green banner, followed by the descriptive message ‘The jurisdiction data has been successfully deleted’. Under the green banner is the message ‘To further modify or delete any jurisdiction data, you can go to ‘Manage Jurisdiction Data’ (link to the manage jurisdiction data is masked in the highlighted text).
4.	Where the user selects the ‘Update’ button, the user is taken to the ‘Update Jurisdiction Data’ page A table is displayed underneath with the following rows; ‘Name’ which displays the existing name and a free text box, ‘Welsh Name’ which displays the existing Welsh name and provides a free text box for the user to type in, ‘Type’ which provides a dropdown for the user to select either ‘Jurisdiction’, ‘Sub-Jurisdiction’ or ‘Region’. this is followed by the green ‘Confirm’ button which when clicked takes the user to the final confirmation page.
5.	The final confirmation page displays ‘Jurisdiction Data Updated’ as a header in a green banner, followed by the descriptive message ‘The jurisdiction data has been successfully updated’. Under the green banner is the message ‘To further modify or delete any jurisdiction data, you can go to ‘Manage Jurisdiction Data’ (link to the manage jurisdiction data is masked in the highlighted text).
6.	Where the user selects ‘Create a new jurisdiction or sub-jurisdiction’ radio button on the ‘What do you want to do?’ page and clicks the green continue button, the user is taken to the ‘Create Jurisdiction Data’ page which displays A table is displayed underneath with the following rows; ‘Name’ which displays a free text box, ‘Welsh Name’ which displays a free text box for the user to type in, ‘Type’ which provides a dropdown for the user to select either ‘Jurisdiction’, ‘Sub-Jurisdiction’ or ‘Region’. this is followed by the green ‘Confirm’ button which when clicked takes the user to the final confirmation page.

•	Where the user selects ‘Manage Location Jurisdiction data’ the user is taken to the ‘Find the Jurisdiction date to manage’ page where displays the following message under the header; ‘Search by court or tribunal name’ and then a search box that allows the user type to search while the system displays possible suggestions. Above the search box is the text ‘Foe example, Blackburn Crown Court’. This is followed by the green ‘Continue’ button which takes the user to the ‘Manage Jurisdiction Data’ page which displays the warning caution symbol and message ‘Ensure authorisation has been granted before making any modification to the jurisdiction data’. A table is displayed below with the search details in the rows titled ‘Court or tribunal name’, ‘Jurisdiction’ and ‘Sub-Jurisdiction’. Underneath the table are a green ‘Update’ and red ‘Delete’ button.
•	If the user clicks the ‘Delete’ button, user is taken to the ‘Are you sure you want to delete this data?’ page where the user can select either ‘Yes’ or ‘No’ radio button and beneath is the green ‘Confirm’ button which when clicked takes user to the final confirmation page which displays ‘Jurisdiction Data Deleted’ with the following descriptive message beneath ‘The jurisdiction data has been successfully deleted’
•	If user clicks update button, user is taken to the screen with the ‘Court or tribunal name’ as the page title followed by the descriptive message ‘Update Jurisdiction Data’. This is followed by 2 screen options to be provided for testing
•	Option 1: ‘Jurisdiction’, ‘Type of civil court’, ‘Type of criminal court’, ‘Type of family court’, ‘Type of tribunal’ and ‘Region’ are displayed in a row with dropdown boxes that contain the options to be selected followed by the green ‘Confirm’ button and the red ‘Cancel’ button
•	Option 2: ‘Jurisdiction’, ‘Type of civil court’, ‘Type of criminal court’, ‘Type of family court’, ‘Type of tribunal’ and ‘Region’ are displayed as accordions with the associated options displayed as checkboxes to be selected followed by the green ‘Confirm’ button and the red ‘Cancel’ button
•	When user clicks the green ‘Confirm button in either option 1 or 2, user is taken to the confirmation page with ‘Location Jurisdiction Data Updated’ displayed in a green banner an the descriptive text beneath ‘The location jurisdiction data has been successfully updated’. This is followed by the same link as above in other confirmation pages
•	Where the user clicks the ‘Cancel’ button then the process is cancelled
•	System checks for dependencies must be performed before any deletion can occur and orphaned lists due to the deletion must be accounted and Audit entry must be logged. The possibility of Soft delete (status = inactive) should be considered
•	Where no radio button is selected and the continue button is clicked, then the system will display a ‘There is a problem. Please select one option’ error message in red.', 'functional', 'implemented', NULL, 'story', 410, 'https://github.com/hmcts/cath-service/issues/410', '2026-02-24T17:54:19Z', '2026-05-28T08:01:52Z', 'OgechiOkelu', 'OgechiOkelu'),
  (104, 'REQ-0104', 'Style Guide: Tribunal non-strategic publishing - UTCC, UTLC & UTAAC', '**PROBLEM STATEMENT**
This ticket is raised for the creation of the validation schema, style guide, PDF and email summary needed for the Upper Tribunal (Tax and Chancery Chamber), Upper Tribunal (Lands Chamber) and the Upper Tribunal (Administrative Appeals Chamber) to publish in CaTH, through the non-strategic publishing route.



**AS A** Service
**I WANT** to create the validation schema, style guide, PDF & email summary for tribunal hearing lists to be published through the non-strategic publishing route
**SO THAT** the tribunal hearing lists can be published in CaTH


**ACCEPTANCE CRITERIA**
•	Validation schemas are created for each hearing list from the tribunals listed above
•	Error handling is put in place for the validation schema
•	Valid publications are saved via the current method
•	List types are classified and user groups are decided based on authorised access to the list types (Public, Private, etc)
•	A new pdf template is created for the downloadable version of each tribunal hearing list
•	All the tribunals adopt a unified email summary format similar to the existing email summary
•	The fields to be published for the email summary for all the lists are the Date, Time and Case Reference Number
•	a new style guide is created for each hearing list of the above-mentioned tribunals
•	List manipulation is created for the style guide(s)
•	The full list names shall be displayed as follows in the front-end summary of publications; Upper Tribunal Tax and Chancery Chamber Daily Hearing list- date, Upper Tribunal (Lands Chamber) Daily Hearing list – date and Upper Tribunal (Administrative Appeals Chamber) Daily Hearing list- date while in the upload form, it will be displayed as UT (T and CC) Daily Hearing List, UT (LC) Daily Hearing List and 
•	The ‘Region’ for UT (T and CC) Daily Hearing List and UT (LC) Daily Hearing List is ‘National’ while for UT (AAC) Daily Hearing List is ‘London’
•	The opening statement displayed within the Upper Tribunal (Tax and Chancery Chamber) Daily Hearing list should be as follows;
A representative of the media, or any other person, wishing to attend a remote hearing should contact uttc@justice.gov.uk and we will arrange for your attendance.
Observe a court or tribunal hearing as a journalist, researcher or member of the public 
•	The fields to be displayed in the Upper Tribunal (Tax and Chancery Chamber) Daily Hearing list are Time, Case Reference, Case Name, Judge(s), Member(s), Hearing Type, Venue and Additional Information
•	 The opening statement displayed within the Upper Tribunal (Lands Chamber) Daily Hearing list should be as follows;
If a representative of the media or a member of the public wishes to attend a Cloud Video Platform (CVP) hearing they should contact the Lands Chamber listing section Lands@justice.gov.uk who will provide further information.
Observe a court or tribunal hearing as a journalist, researcher or member of the public
•	The fields to be displayed in the Upper Tribunal (Lands Chamber) Daily Hearing list are Time, Case Reference, Case Name, Judge(s), Member(s), Hearing Type, Venue, Mode of Hearing and Additional Information
•	The opening statement displayed within the Upper Tribunal (Administrative Appeals Chamber) Daily Hearing list should be as follows;
Details
Lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives.

**England and Wales**
Remote hearings via CVP and BT Meet Me
Hearings will be available to representatives of the media or any other member of the public, on their request, and therefore will be a hearing conducted in public in accordance with Rule 37 of the Tribunal Procedure (Upper Tribunal) Rules 2008.
Any media representative or any other member of the public wishing to witness the hearing will need to do so over the internet and provide an email address at which to be sent an appropriate link for access.
Please contact [adminappeals@justice.gov.uk](mailto:adminappeals@justice.gov.uk).

**Scotland**
Remote hearings
When hearings are listed for Scotland the hearing will be available to representatives of the media or any other member of the public, on their request, and therefore will be a hearing conducted in public in accordance with Rule 37 of the Tribunal Procedure (Upper Tribunal) Rules 2008. It will be organised and conducted using Cloud Video Platform (CVP). Any media representative or any other member of the public wishing to witness the hearing will need to do so over the internet and provide an email address at which to be sent an appropriate link for access. Please contact UTAACMailbox@justice.gov.uk.

•	The fields to be displayed in the Upper Tribunal (Administrative Appeals Chamber) Daily Hearing list are Time, Appellant, Case Reference Number, Case Name, Judge(s), Member(s), Mode of Hearing, Venue and Additional Information
•	The following link [Observe a court or tribunal hearing - GOV.UK](https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing) should be masked anywhere this text is displayed in the opening statement for all the lists; ‘Observe a court or tribunal hearing as a journalist, researcher or member of the public’', 'functional', 'implemented', 'medium', 'story', 425, 'https://github.com/hmcts/cath-service/issues/425', '2026-02-27T16:23:17Z', '2026-05-28T14:59:06Z', 'OgechiOkelu', 'OgechiOkelu'),
  (105, 'REQ-0105', 'Style Guide: Tribunal non-strategic publishing - SIAC, POAC, PAAC, FFT TC, FFT LRT & FFT RPT', '**PROBLEM STATEMENT**
This ticket is raised for the creation of the validation schema, style guide, PDF and email summary needed for the following tribunals to publish in CaTH, through the non-strategic publishing route; Special Immigration Appeals Commission, Proscribed Organisations Appeal Commission, Pathogens Access Appeal Commission, First-tier Tribunal (Tax Chamber), First-tier Tribunal (Lands Registration Tribunal and First-tier Tribunal (Property Chamber) (Residential Property).


**AS A** Service
**I WANT** to create the validation schema, style guide, PDF & email summary for tribunal hearing lists to be published through the non-strategic publishing route
**SO THAT** the tribunal hearing lists can be published in CaTH


**ACCEPTANCE CRITERIA**
•	Validation schemas are created for each hearing list from the tribunals listed above
•	Error handling is put in place for the validation schema
•	Valid publications are saved via the current method
•	List types are classified and user groups are decided based on authorised access to the list types (Public, Private, etc)
•	A new pdf template is created for the downloadable version of each tribunal hearing list
•	All the tribunals adopt a unified email summary format similar to the existing email summary
•	The fields to be published for the email summary for all the lists are the Date, Time and Case Reference Number
•	A new style guide is created for each hearing list of the above-mentioned tribunals
•	List manipulation is created for the style guide(s)
•	The hearing lists for the Special Immigration Appeals Commission, Proscribed Organisations Appeal Commission and the Pathogens Access Appeal Commission will be published weekly, and the full list name shall be displayed as follows in the front-end summary of publications; Special Immigration Appeals Commission Weekly Hearing List, Proscribed Organisations Appeal Commission Weekly Hearing List and Pathogens Access Appeal Commission Weekly Hearing List respectively
•	On the upload form, the lists will be displayed as SIAC Weekly Hearing List, POAC Weekly Hearing List and PACC Weekly Hearing List
•	The ‘Region’ for all 3 lists above is ‘London’

•	The opening statement displayed within the important information accordion for the Special Immigration Appeals Commission, Proscribed Organisations Appeal Commission and Pathogens Access Appeal Commission is as follows;
 The tribunal sometimes uses reference numbers or initials to protect the anonymity of those involved in the appeal.
 All hearings take place at Field House, 15-25 Bream’s Buildings, London EC4A 1DZ.
 [Find out what to expect coming to a court or tribunal](https://www.gov.uk/guidance/what-to-expect-coming-to-a-court-or-tribunal)

•	The fields to be displayed within the Special Immigration Appeals Commission Weekly Hearing List, Proscribed Organisations Appeal Commission Weekly Hearing List and Pathogens Access Appeal Commission Weekly Hearing List are Date, Time, Appellant, Case Reference Number, Hearing Type, Courtroom and Additional information
•	The hearing lists for the First-tier Tribunal (Tax Chamber) will be published weekly, and the full list name shall be displayed as follows in the front-end summary of publications; First-tier Tribunal (Tax Chamber) Weekly Hearing List while on the upload form, the names displayed is FFT Tax Weekly Hearing List  
•	The ‘Region’ for First-tier Tribunal (Tax Chamber) Weekly Hearing List is ‘National’

•	The opening statement displayed within the important information accordion for the First-tier Tribunal (Tax Chamber) Weekly Hearing List is as follows;
Open justice is a fundamental principle of our justice system. You can attend a public hearing in person, or you can apply for permission to observe remotely.
Members of the public and the media can ask to join any telephone or video hearing remotely. Contact the Tribunal before the hearing to ask for permission to attend by emailing taxappeals@justice.gov.uk.
The subject line for the email should contain the following wording: “HEARING ACCESS REQUEST – [Appellant’s name] v [Respondent’s name, for example HMRC] – [case reference] – [hearing date]”. You will be sent instructions on how to join the hearing.
The judge may refuse a request and can also decide a hearing must be held in private, in such cases you will not be able to attend.
[Observe a court or tribunal hearing as a journalist, researcher or member of the public](https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing)


•	The fields to be displayed within the First-tier Tribunal (Tax Chamber) Weekly Hearing List are Date, Hearing Time, Case Name, Case Reference Number, Judge(s), Member(s) and Venue/Platform
•	The hearing list for the First-tier Tribunal (Lands Registration Tribunal) will be published weekly, and the full list name shall be displayed as follows in the front-end summary of publications; First-tier Tribunal (Lands Registration Tribunal) Weekly Hearing list while on the upload form, the names displayed is FFT (LR) Weekly Hearing List
•	The ‘Region’ for First-tier Tribunal (Lands Registration Tribunal) Weekly Hearing List is ‘National’
•	The fields to be displayed within the First-tier Tribunal (Lands Registration Tribunal) Weekly Hearing List are Date, Hearing Time, Case Name, Case Reference Number, Judge, and Venue/Platform

•	The opening statement displayed within the important information accordion for the First-tier Tribunal (Lands Registration Tribunal) Weekly Hearing List is as follows;
Members of the public wishing to observe a hearing or representatives of the media may, on their request, join any telephone or video hearing remotely while they are taking place by sending an email in advance to the tribunal at [insert office email] with the following details in the subject line “[OBSERVER/MEDIA] REQUEST – [case reference] – [hearing date] (need to include any other information required by the tribunal)” and appropriate arrangements will be made to allow access where reasonably practicable
[Observe a court or tribunal hearing as a journalist, researcher or member of the public](https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing)

•	The hearing list for the First-tier Tribunal (Residential and Property Tribunal) will be published weekly and as different lists for the different regions. Hence, the full list name which shall be displayed in the front-end summary of publications are as follows; First-tier Tribunal (Residential and Property Tribunal) Eastern Region Weekly Hearing list, First-tier Tribunal (Residential and Property Tribunal) London Region Weekly Hearing list, First-tier Tribunal (Residential and Property Tribunal) Midlands Region Weekly Hearing list, First-tier Tribunal (Residential and Property Tribunal) Northern Region Weekly Hearing list, First-tier Tribunal (Residential and Property Tribunal) Southern Region Weekly Hearing list
•	The regions for the First-tier Tribunal (Residential and Property Tribunal) are Eastern, London, Midlands, Northern and Southern regions 
•	On the upload form, the names displayed are RPT Eastern Weekly Hearing List, RPT London Weekly Hearing List, RPT Midlands Weekly Hearing List, RPT Northern Weekly Hearing List and RPT Southern Weekly Hearing List

•	The opening statement displayed within the important information accordion for the First-tier Tribunal (Residential and Property Tribunal) Weekly Hearing List is as follows;
Members of the public wishing to observe a hearing or representatives of the media may, on their request, join any telephone or video hearing remotely while they are taking place by sending an email in advance to the tribunal at [insert office email] with the following details in the subject line “[OBSERVER/MEDIA] REQUEST – [case reference] – [hearing date]” and appropriate arrangements will be made to allow access where reasonably practicable.
[Observe a court or tribunal hearing as a journalist, researcher or member of the public](https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing)

•	The fields to be displayed within the First-tier Tribunal (Tax Chamber) Weekly Hearing List are Date, Time, Venue, Case Type, Case Reference Number, Judge(s), Member(s), Hearing Method and Additional Information', 'functional', 'approved', 'medium', 'story', 428, 'https://github.com/hmcts/cath-service/issues/428', '2026-03-03T13:36:57Z', '2026-06-03T08:59:39Z', 'OgechiOkelu', 'OgechiOkelu'),
  (106, 'REQ-0106', 'Style Guide: Tribunal non-strategic publishing - GRC, WPAFCC & UTIAC', '**PROBLEM STATEMENT**
This ticket is raised for the creation of the validation schema, style guide, PDF and email summary needed for the following tribunals to publish in CaTH, through the non-strategic publishing route; General Regulatory Chamber, First-tier Tribunal (War Pensions and Armed Forces Compensation) Chamber, Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review and Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeals.


**AS A** Service
**I WANT** to create the validation schema, style guide, PDF & email summary for tribunal hearing lists to be published through the non-strategic publishing route
**SO THAT** the tribunal hearing lists can be published in CaTH


**ACCEPTANCE CRITERIA**
•	Validation schemas are created for each hearing list from the tribunals listed above
•	Error handling is put in place for the validation schema
•	Valid publications are saved via the current method
•	List types are classified and user groups are decided based on authorised access to the list types (Public, Private, etc)
•	A new pdf template is created for the downloadable version of each tribunal hearing list
•	All the tribunals adopt a unified email summary format similar to the existing email summary
•	The fields to be published for the email summary for all the lists are the Date, Time and Case Reference Number
•	A new style guide is created for each hearing list of the above-mentioned tribunals
•	List manipulation is created for the style guide(s)
•	The hearing lists for the General Regulatory Chamber will be published weekly, and the full list name shall be displayed as follows in the front-end summary of publications; General Regulatory Chamber Weekly Hearing list. On the upload form, the lists will be displayed as GRC Weekly Hearing List  
•	The hearing lists for the First-tier Tribunal (War Pensions and Armed Forces Compensation) will be published weekly, and the full list name shall be displayed as follows in the front-end summary of publications; First-tier Tribunal (War Pensions and Armed Forces Compensation) Weekly Hearing list while on the upload form, the names displayed is WPAFCC Weekly Hearing list
•	The hearing list for the Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeals will be published daily, and the full list name shall be displayed as follows in the front-end summary of publications; Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeal Daily Hearing List while on the upload form, the names displayed is UTIAC Statutory Appeal Daily Hearing List
•	The hearing lists for the Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review will be published Daily and the full list names which shall be displayed in the front-end summary of publications are as follows; Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily Hearing List and Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List while on the upload form, the names displayed are UTIAC (JR) - Leeds Daily Hearing List and UTIAC (JR) - London Daily Hearing List 
•	The ‘Region’ for the General Regulatory Chamber Weekly Hearing list and First-tier Tribunal (War Pensions, Armed Forces Compensation) Weekly Hearing list and Upper Tribunal (Immigration and Asylum) Chamber Statutory Daily Hearing List is ‘National’, while the Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily hearing List is ‘London’ and the Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List is ‘Yorkshire’

•	The opening statement displayed within the important information accordion for the General Regulatory Chamber Weekly Hearing list is as follows;
Parties and representatives will be informed about arrangements for hearing cases remotely. Any other person interested in joining the hearing remotely should email GRC@justice.gov.uk so that arrangements can be made. If the case is to be heard in private or is subject to a reporting restriction, this will be notified.
If you join a hearing you must not make any personal or private recording or publish any part of this hearing, including court communications. It is a criminal offence to do so.
[What to expect when joining a telephone or video hearing](https://www.gov.uk/guidance/what-to-expect-when-joining-a-telephone-or-video-hearing)
[Observe a court or tribunal hearing as a journalist, researcher or member of the public](https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing)

•	The opening statement displayed within the important information accordion for the First-tier Tribunal (War Pensions, Armed Forces Compensation) Weekly Hearing list is as follows;
Members of the public wishing to observe a hearing or representatives of the media may, on their request, join any telephone or video hearing remotely while they are taking place by sending an email in advance to the tribunal at armedforces.listing@justice.gov.uk with the following details in the subject line “[OBSERVER/MEDIA] REQUEST – [case reference] – [hearing date] (need to include any other information required by the tribunal)” and appropriate arrangements will be made to allow access where reasonably practicable.
[Observe a court or tribunal hearing as a journalist, researcher or member of the public](https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing)

•	The opening statement displayed within the important information accordion for the Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily Hearing List and the Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List is as follows; 
The following list is subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives.
[Observe a court or tribunal hearing as a journalist, researcher or member of the public](https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing)


•	The opening statement displayed within the important information accordion for the General Regulatory Chamber Weekly Hearing list is as follows;
We update this list by 5pm for the following day. If there are late changes to the list, we’ll update no later than 9am on the day of the hearing.
For details on attending a UTIAC remote hearing, please email uppertribunallistingteam@justice.gov.uk.
[Observe a court or tribunal hearing as a journalist, researcher or member of the public](https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing)


•	The fields to be displayed within the General Regulatory Chamber Weekly Hearing list and First-tier Tribunal (War Pensions and Armed Forces Compensation) Weekly Hearing list are Date, Hearing Time, Case Reference Number, Case Name, Judge(s), Member(s), Mode of Hearing, Venue and Additional information
•	The fields to be displayed within the Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List are Venue, Judge(s), Hearing Time, Case Reference Number, Case Title, Hearing Type and Additional Information.
•	The fields to be displayed within the Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily Hearing List are Hearing Time, Case Title, Representative, Case Reference Number, Judge(s), Hearing Type, Location and Additional Information.
•	The fields to be displayed within the Upper Tribunal (Immigration and Asylum) Chamber – Statutory Appeal are Hearing Time, Appellant, Representative, Appeal Reference Number, Judge(s), Hearing Type, Location and Additional Information.

•	The text ''Observe a court or tribunal hearing as a journalist, researcher or member of the public'' is used to mask the  https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing link', 'functional', 'approved', 'medium', 'story', 429, 'https://github.com/hmcts/cath-service/issues/429', '2026-03-03T18:12:03Z', '2026-05-26T15:33:53Z', 'OgechiOkelu', 'OgechiOkelu'),
  (107, 'REQ-0107', 'Style Guide: Tribunal non-Strategic publishing - SSCS Hearing Lists', '**PROBLEM STATEMENT**
This ticket is raised for the creation of the validation schema, style guide, PDF and email summary needed for the SSCS tribunals to publish in CaTH through the non-strategic publishing route.

**AS A** Service
**I WANT** to create the validation schema, style guide, PDF & email summary for the SSCS tribunal hearing lists
**SO THAT** the SSCS tribunal hearing lists can be published in CaTH through the non-strategic publishing route

**ACCEPTANCE CRITERIA**
•	Validation schemas are created for each hearing list from the tribunals listed above
•	Error handling is put in place for the validation schema
•	Valid publications are saved via the current method
•	List types are classified and user groups are decided based on authorised access to the list types (Public, Private, etc)
•	A new pdf template is created for the downloadable version of each tribunal hearing list
•	All the tribunals adopt a unified email summary format similar to the existing email summary
•	The fields to be published within the email summary for all the lists are Hearing time, Hearing Type and Appeal Reference Number 
•	A new style guide is created for each hearing list of the SSCS tribunals
•	List manipulation is created for the style guide(s)
•	The SSCS hearing lists are linked to the ‘Tribunal’ jurisdiction
•	Midlands Social Security and Child Support Tribunal is created and linked to the ‘Midlands’ region
•	South East Social Security and Child Support Tribunal is created and linked to the ‘South East’ region
•	Wales and South West Social Security and Child Support Tribunal is created and linked to the ‘Wales’ and ‘South West’ region
•	Scotland Social Security and Child Support Tribunal is created and linked to the ‘Scotland’ region
•	North East Social Security and Child Support Tribunal is created and linked to the ‘North East’ region
•	North West Social Security and Child Support Tribunal is created and linked to the ‘North West’ region
•	London Social Security and Child Support Tribunal is created and linked to the ‘London’ region
•	Liverpool Social Security and Child Support Tribunal is created and linked to the ‘North West’ region
•	The hearing lists for the SSCS tribunals will be published daily
•	The full list names shall be displayed as follows in the front-end summary of publications;  Midlands Social Security and Child Support Tribunal Daily Hearing List, South East Social Security and Child Support Tribunal Daily Hearing List, Wales and South West Social Security and Child Support Tribunal Daily Hearing List, Scotland Social Security and Child Support Tribunal Daily Hearing List, North East Social Security and Child Support Tribunal Daily Hearing List, North West Social Security and Child Support Tribunal Daily Hearing List, London Social Security and Child Support Tribunal Daily Hearing List and Liverpool Social Security and Child Support Tribunal Daily Hearing List
•	On the Excel file upload form, the lists will be displayed as follows; SSCS Midlands Daily Hearing List, SSCS South East Daily Hearing List, SSCS Wales and South West Daily Hearing List, SSCS Scotland Daily Hearing List, SSCS North East Daily Hearing List, SSCS North West Daily Hearing List, SSCS London Daily Hearing List and SSCS Liverpool Daily Hearing List

•	The opening statement displayed within the important information accordion for the London Social Security and Child Support Tribunal Daily Hearing list is as follows;
Open justice is a fundamental principle of our justice system. When considering the use of telephone and video technology, the judiciary will have regard to the principles of open justice. Judges may determine that a hearing should be held in private if this is necessary to secure the proper administration of justice.
Social Security and Child Support Tribunal parties and representatives will be informed directly as to the arrangements for hearing cases remotely. Any other person interested in joining the hearing remotely should contact the Social Security and Child Support Tribunal Office direct, in advance of the hearing date, by emailing sscsa-sutton@justice.gov.uk so that arrangements can be made. The following details should be included in the subject line of the email [OBSERVER/MEDIA] REQUEST – [case reference] – [hearing date]. If the case is to be heard in private or is subject to a reporting restriction, this will be notified.
For more information, please visit https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing

•	The opening statement displayed within the important information accordion for the Midlands Social Security and Child Support Tribunal Daily Hearing list is as follows;
Open justice is a fundamental principle of our justice system. When considering the use of telephone and video technology, the judiciary will have regard to the principles of open justice. Judges may determine that a hearing should be held in private if this is necessary to secure the proper administration of justice.
Social Security and Child Support Tribunal parties and representatives will be informed directly as to the arrangements for hearing cases remotely. Any other person interested in joining the hearing remotely should contact the Social Security and Child Support Tribunal Office direct, in advance of the hearing date, by emailing ascbirmingham@justice.gov.uk so that arrangements can be made. The following details should be included in the subject line of the email [OBSERVER/MEDIA] REQUEST – [case reference] – [hearing date]. If the case is to be heard in private or is subject to a reporting restriction, this will be notified.
For more information, please visit https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing

•	The opening statement displayed within the important information accordion for the North East Social Security and Child Support Tribunal Daily Hearing List is as follows;
Open justice is a fundamental principle of our justice system. When considering the use of telephone and video technology, the judiciary will have regard to the principles of open justice. Judges may determine that a hearing should be held in private if this is necessary to secure the proper administration of justice.
Social Security and Child Support Tribunal parties and representatives will be informed directly as to the arrangements for hearing cases remotely. Any other person interested in joining the hearing remotely should contact the Social Security and Child Support Tribunal Office direct, in advance of the hearing date, by emailing sscsa-leeds@Justice.gov.uk so that arrangements can be made. The following details should be included in the subject line of the email [OBSERVER/MEDIA] REQUEST – [case reference] – [hearing date]. If the case is to be heard in private or is subject to a reporting restriction, this will be notified.
For more information, please visit https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing

•	The opening statement displayed within the important information accordion for the North West Social Security and Child Support Tribunal Daily Hearing List is as follows;
Open justice is a fundamental principle of our justice system. When considering the use of telephone and video technology, the judiciary will have regard to the principles of open justice. Judges may determine that a hearing should be held in private if this is necessary to secure the proper administration of justice.
Social Security and Child Support Tribunal parties and representatives will be informed directly as to the arrangements for hearing cases remotely. Any other person interested in joining the hearing remotely should contact the Social Security and Child Support Tribunal Office direct, in advance of the hearing date, by emailing sscsa-liverpool@justice.gov.uk so that arrangements can be made. The following details should be included in the subject line of the email [OBSERVER/MEDIA] REQUEST – [case reference] – [hearing date]. If the case is to be heard in private or is subject to a reporting restriction, this will be notified.
For more information, please visit https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing

•	The opening statement displayed within the important information accordion for the Scotland Social Security and Child Support Tribunal Daily Hearing List is as follows;
Open justice is a fundamental principle of our justice system. When considering the use of telephone and video technology, the judiciary will have regard to the principles of open justice. Judges may determine that a hearing should be held in private if this is necessary to secure the proper administration of justice.
Social Security and Child Support Tribunal parties and representatives will be informed directly as to the arrangements for hearing cases remotely. Any other person interested in joining the hearing remotely should contact the Social Security and Child Support Tribunal Office direct, in advance of the hearing date, by emailing sscsa-glasgow@justice.gov.uk so that arrangements can be made. The following details should be included in the subject line of the email [OBSERVER/MEDIA] REQUEST – [case reference] – [hearing date]. If the case is to be heard in private or is subject to a reporting restriction, this will be notified.
For more information, please visit https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing

•	The opening statement displayed within the important information accordion for the South East Social Security and Child Support Tribunal Daily Hearing List is as follows;
Open justice is a fundamental principle of our justice system. When considering the use of telephone and video technology, the judiciary will have regard to the principles of open justice. Judges may determine that a hearing should be held in private if this is necessary to secure the proper administration of justice.
Social Security and Child Support Tribunal parties and representatives will be informed directly as to the arrangements for hearing cases remotely. Any other person interested in joining the hearing remotely should contact the Social Security and Child Support Tribunal Office direct, in advance of the hearing date, by emailing sscs_bradford@justice.gov.uk so that arrangements can be made. The following details should be included in the subject line of the email [OBSERVER/MEDIA] REQUEST – [case reference] – [hearing date]. If the case is to be heard in private or is subject to a reporting restriction, this will be notified.
For more information, please visit https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing

•	The opening statement displayed within the important information accordion for the Wales and South West Social Security and Child Support Tribunal Daily Hearing List is as follows;
Open justice is a fundamental principle of our justice system. When considering the use of telephone and video technology, the judiciary will have regard to the principles of open justice. Judges may determine that a hearing should be held in private if this is necessary to secure the proper administration of justice.
Social Security and Child Support Tribunal parties and representatives will be informed directly as to the arrangements for hearing cases remotely. Any other person interested in joining the hearing remotely should contact the Social Security and Child Support Tribunal Office direct, in advance of the hearing date, by emailing sscsa-cardiff@justice.gov.uk so that arrangements can be made. The following details should be included in the subject line of the email [OBSERVER/MEDIA] REQUEST – [case reference] – [hearing date]. If the case is to be heard in private or is subject to a reporting restriction, this will be notified.
For more information, please visit https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing

•	The fields to be displayed within all the SSCS Hearing lists are Venue, Appeal Reference Number, Hearing Type, Appellant, Courtroom, Hearing Time, Tribunal, FTA/Respondent and Additional Information', 'functional', 'approved', 'medium', 'story', 431, 'https://github.com/hmcts/cath-service/issues/431', '2026-03-09T15:04:40Z', '2026-05-26T15:34:00Z', 'OgechiOkelu', 'OgechiOkelu'),
  (108, 'REQ-0108', 'Style Guide: SEND, CIC and Asylum Support Tribunal Hearing Lists Publishing in CaTH', '**PROBLEM STATEMENT**
This ticket is raised for the creation of the validation schema, style guide, PDF and email summary needed for the First-tier Tribunal (Special Educational Needs and Disability), Criminal Injuries Compensation Tribunal and Asylum Support Tribunal to publish in CaTH through the non-strategic publishing route.

**AS A** Service
**I WANT** to create the validation schema, style guide, PDF & email summary for the above-mentioned Tribunals  
**SO THAT** the tribunal hearing lists can be published in CaTH through the non-strategic publishing route


**ACCEPTANCE CRITERIA**
•	Validation schemas are created for each hearing list from the tribunals listed above
•	Error handling is put in place for the validation schema
•	Valid publications are saved via the current method
•	List types are classified and user groups are decided based on authorised access to the list types (Public, Private, etc)
•	A new pdf template is created for the downloadable version of each tribunal hearing list
•	All the tribunals adopt a unified email summary format like the existing email summary
•	A new style guide is created for each hearing list of all the tribunals
•	List manipulation is created for the style guides 
•	The full list names shall be displayed as follows in the front-end summary of publications; First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List, Criminal Injuries Compensation Weekly Hearing List and Asylum Support Tribunal Daily Hearing List
•	On the Excel file upload form, the lists will be displayed as follows; SEND Daily Hearing list, CIC Weekly Hearing List and AST Daily Hearing List respectively
•	The SEND Daily Hearing list and CIC Weekly Hearing List are linked to the ‘Tribunal’ jurisdiction and ‘National’ region
•	The AST Daily Hearing List is linked to the ‘Tribunal’ jurisdiction and ‘London’ region
•	The SEND Daily Hearing list and AST Daily Hearing List will be published daily
•	The CIC Weekly Hearing List will be published weekly
•	Data fields to be displayed within the SEND Daily Hearing list are Time, Case Reference Number, Respondent, Hearing Type, Venue and Time Estimate
•	Data fields to be displayed within the CIC Weekly Hearing List are Date, Hearing time, Case reference number, Case name, Venue/Platform, Judge(s), Member(s), Additional information
•	Data fields to be displayed within the AST Daily Hearing List are Appellant, Appeal Reference Number, Case Type, Hearing Type, Hearing Time and Additional Information
•	The address to be displayed within the AST Daily Hearing List is East London Tribunal Service, HMCTS, 2nd Floor, Import Building, 2 Clove Crescent London E14 2BE
•	The fields to be published in the email summary for the SEND Daily Hearing list and CIC Weekly Hearing List are Time, Case Reference Number and venue
•	The fields to be published in the email summary for the AST Daily Hearing List are Appellant, Appeal Reference Number and Hearing Time

•	The opening statement displayed within the important information accordion for the SEND Daily Hearing list is as follows;
Special Educational Needs and Disability (SEND) Tribunal hearings are held in private and unless a request from the parties for the hearing to be heard in public has been approved, you will not be able to observe.
Private hearings do not allow anyone to observe remotely or in person. This includes members of the press.
Open justice is a fundamental principle of our justice system. To attend a public hearing using a remote link you must apply for permission to observe.
Requests to observe a public hearing that is taking place should be made in good time direct to: send@justice.gov.uk. You may be asked to provide further details.
The judge hearing the case will decide if it is appropriate for you to observe remotely. They will have regard to the interests of justice, the technical capacity for remote observation and what is necessary to secure the proper administration of justice.

•	The opening statement displayed within the important information accordion for the CIC Weekly Hearing List is as follows;
Open justice is a fundamental principle of our justice system.
When considering the use of telephone and video technology, the judiciary will have regard to the principles of open justice. Judges may determine that a hearing should be held in private if this is necessary to secure the proper administration of justice.
Criminal Injuries Compensation Tribunal parties and representatives will be informed directly as to the arrangements for hearing cases remotely. Any other person interested in joining the hearing remotely should contact the Criminal Injuries Compensation Tribunal Office direct, in advance of the hearing date, by emailing CIC.enquiries@Justice.gov.uk so that arrangements can be made. The following details should be included in the subject line of the email [OBSERVER/MEDIA] REQUEST – [AN Other v CICA] – [hearing date]. If the case is to be heard in private or is subject to a reporting restriction, this will be notified.
Restricted Reporting Orders
The inclusion of a case in the Press List is no guarantee that it is not subject to a restricted reporting order. Members of the press should ensure that no order exists on an individual case before submitting material for publication.
For more information, please visit https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing.

•	The opening statement displayed within the important information accordion for the AST Daily Hearing List is as follows;
Open justice is a fundamental principle of our justice system. When considering the use of telephone and video technology, the judiciary will have regard to the principles of open justice. Judges may determine that a hearing should be held in private if this is necessary to secure the proper administration of justice.
Asylum Support Tribunal parties and representatives will be informed directly as to the arrangements for hearing cases remotely. Any other person interested in joining the hearing remotely should contact the Asylum Support Tribunal Office direct, in advance of the hearing date, by emailing asylumsupporttribunals@justice.gov.uk so that arrangements can be made. The following details should be included in the subject line of the email [OBSERVER/MEDIA] REQUEST – [case reference] – [hearing date]. If the case is to be heard in private or is subject to a reporting restriction, this will be notified.
For more information, please visit https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing', 'functional', 'approved', 'medium', 'story', 434, 'https://github.com/hmcts/cath-service/issues/434', '2026-03-10T13:26:03Z', '2026-05-26T15:34:42Z', 'OgechiOkelu', 'OgechiOkelu'),
  (109, 'REQ-0109', 'Style Guide: Implement Crown PDDA Lists', '**PROBLEM STATEMENT**
This ticket is raised for the creation of the validation schema, style guide, PDF and email summary needed for the PDDA Crime Lists (Crown Firm, Daily and Warned lists) to publish in CaTH through the non-strategic publishing route.


**AS A** Service
**I WANT** to create the validation schema, style guide, PDF & email summary for the PDDA Crime Lists 
**SO THAT** these hearing lists can be published in CaTH 


**ACCEPTANCE CRITERIA**
•	3 Crown lists are created in CaTH with the following names; Crown Daily List, Crown Firm List, And Crown Warned List
•	Validation schemas are created for each hearing list above
•	Error handling is put in place for the validation schema
•	Valid publications are saved via the current method
•	List types are classified and user groups are decided based on authorised access to the list types (Public, Private, etc)
•	A new pdf template is created for the downloadable version of each hearing list
•	All the lists adopt a unified email summary format using the existing email summary template
•	A new style guide is created for each hearing list 
•	List manipulation is created for the style guides 
•	The ''Hearing type'' field will contain the ''hearing description'' data sent in the JSON file 
•	Validation for the three lists (Crown Daily List, Crown Firm List, And Crown Warned List) is created according to the established business rules
•	Subscription fulfilment process is implemented for the three lists 
•	Email summary for the Crown Firm List will display the defendant name, case reference number and prosecuting authority 
•	Email summary for the Crown Firm List will display the defendant name, case number, prosecuting authority and hearing type
•	Email summary for the Crown Daily List will display the defendant name, case reference number, prosecuting authority and hearing type
•	Data fields to be displayed within the Crown Firm List are Case Number, Defendant Name(s), Hearing Type, Representative, Prosecuting Authority, and Listing Notes
•	Within the list, each section is grouped by the Day [DD Month YYYY], followed by sub-sections grouped by ‘Courtroom’ and ‘Judiciary’, and a ‘Sitting at’ sub-header within each sub-group which displays the time in the [HH am/pm] format, using the sitting start and end values
•	Data fields to be displayed within the Crown Warned List are Fixed For, Case Reference, Defendant Name(s), Prosecuting Authority, Linked Cases and Listing Notes
•	Within the Crown Warned List, each case section is grouped by ‘For Trial’, ‘For Plea’, ‘For Sentence’, ''For Appeal'' and ''To be allocated''
•	Data fields to be displayed within the Crown Daily List are Hearing Time, Case Reference, Defendant Name(s), Hearing Type, Prosecuting Authority and Listing Notes
•	Within the list, each section is grouped by the Courtroom and Judiciary, followed by a ‘Sitting at’ sub-header which displays the time in the [HH am/pm] format, using the sitting start and end values
•	The opening statement displayed within the three Crown  Lists (after the document name, publication date, version, venue name and address), is displayed within a grey sectioned box as follows;
Restrictions on publishing or writing about these cases
You must check if any reporting restrictions apply before publishing details on any of the cases listed here either in writing, in a broadcast or by internet, including social media.
Warning You''ll be in contempt of court if you publish any information which is protected by a reporting restriction. You could get a fine, prison sentence or both.
Specific restrictions ordered by the court will be mentioned on the cases listed here.
However, restrictions are not always listed. Some apply automatically. For example, anonymity given to the victims of certain sexual offences.
To find out which reporting restrictions apply on a specific case, contact:
•	the court directly
•	HM Courts and Tribunals Service on 0330 808 4407

•	For the Warned List, just before the opening statement displayed within the grey section, the following statement should be displayed;
The undermentioned cases are warned for the hearing period of week commencing [date as DD month YYYY]
Any representation about the listing of a case should be made to the Listing Officer immediately
The prosecuting authority is the Crown Prosecution Service unless otherwise stated
*denotes a defendant in custody', 'functional', 'approved', NULL, NULL, 436, 'https://github.com/hmcts/cath-service/issues/436', '2026-03-11T17:06:21Z', '2026-05-26T15:35:38Z', 'OgechiOkelu', 'OgechiOkelu'),
  (110, 'REQ-0110', 'Style Guide: PCOL, Mental Health Tribunal, IAC Daily List', '**PROBLEM STATEMENT**
This ticket is raised for the creation of lists for manual publishing in CaTH.


**AS A** Service
**I WANT** to create the supporting information for Lists that are to be manual published in CaTH 
**SO THAT** these hearing lists can be manually published in CaTH 


**ACCEPTANCE CRITERIA**
•	The Possession Daily Cause List is created in the front end and linked to the Civil Jurisdiction. In the manual upload form, the list name is displayed as PCOL Daily Cause list. 
•	The Mental Health Tribunal Daily Hearing List is created in the front end and linked to the ‘Tribunal’ Jurisdiction and ‘National’ Region. The same name is displayed on the manual upload form. 
•	The Mental Health Tribunal rarely publishes a hearing list and so the following message should be displayed in the summary of publications page to inform users that the hearing list is not routinely published;
‘Mental health hearings are held in private and unless a request has been made by the patient for a public hearing a hearing list will not be published.’
•	Immigration and Asylum Chamber publishes 2 lists manually in CaTH; the Immigration and Asylum Chamber Daily List and the Immigration and Asylum Chamber Daily List – Additional Cases. These lists are created in the front end.   
•	The Immigration and Asylum Chamber Daily List will always appear first where both list types are published under the same venue, regardless of the order in which both lists are published', 'functional', 'approved', 'medium', 'story', 438, 'https://github.com/hmcts/cath-service/issues/438', '2026-03-12T16:58:40Z', '2026-05-26T15:35:51Z', 'OgechiOkelu', 'OgechiOkelu'),
  (111, 'REQ-0111', 'Update: ‘Remove List Summary’ table', '**PROBLEM STATEMENT**
In the ‘Remove’ tile, when the Local Admin selects the venue to remove a publication from, the published lists for the selected venue are displayed in a table with several columns. This ticket is raised to implement some changes to the table.

**AS A** Service
**I WANT** to make changes to the

[Remove list summary changes mock up.docx](https://github.com/user-attachments/files/26211877/Remove.list.summary.changes.mock.up.docx)

**SO THAT** the table aligns with the expected formatting 

**ACCEPTANCE CRITERIA**
•	The double-headed arrow cursor is added beside each column header
•	The arrow facing down under the ‘content date’ column is removed', 'functional', 'implemented', NULL, NULL, 466, 'https://github.com/hmcts/cath-service/issues/466', '2026-03-24T11:30:02Z', '2026-06-05T13:27:25Z', 'OgechiOkelu', 'OgechiOkelu'),
  (112, 'REQ-0112', 'Update: Audit log view', '**PROBLEM STATEMENT**
In the ‘Audit Log Viewer’ tile, when the Admin selects the action to view from the list of actions in the audit log, there are several functionalities that are inconsistent with the formatting across CaTH. Hence, this ticket is raised to implement changes to the identified instances.

**AS A** Service
**I WANT** to make changes to the Audit log view
**SO THAT** it aligns with the expected formatting in CaTH

[Audit log updates.docx](https://github.com/user-attachments/files/26214306/Audit.log.updates.docx)

**ACCEPTANCE CRITERIA**
•	‘Back’ link is changed from ‘Back to audit log list’ to ‘Back’
•	The ‘Date/Month/Year’ data boxes are presented in one row rather than across two rows', 'functional', 'in_progress', NULL, NULL, 467, 'https://github.com/hmcts/cath-service/issues/467', '2026-03-24T12:54:56Z', '2026-06-03T12:46:12Z', 'OgechiOkelu', 'OgechiOkelu'),
  (113, 'REQ-0113', 'PDF not generated after publication upload', 'PDF should be generated after manual upload and non-strategic upload. This feature has been broken recently. PDF is not generated and no subscription email sent after upload.

**Acceptance criteria**
PDF is generated during the upload process and subscription email containing the PDF link sent to subscribers', 'functional', 'verified', NULL, NULL, 475, 'https://github.com/hmcts/cath-service/issues/475', '2026-04-13T14:02:04Z', '2026-05-08T08:30:01Z', 'KianKwa', 'KianKwa'),
  (114, 'REQ-0114', 'Publication dates not displaying correctly on style guide', '- For all list types the content date on the artefact table is set to be one day earlier than the set date due to BST.
- The publication date is on the style guide pages for all RCJ and Care Standards lists is not set to the content date. Instead it is using the display from date
- For weekly hearing list like Care Standards list, the summary of publications page should shows the text ''for week commencing''. This is currently not shown.

**Acceptance criteria**
All the above are fixed.', 'functional', 'verified', NULL, NULL, 478, 'https://github.com/hmcts/cath-service/issues/478', '2026-04-13T16:27:11Z', '2026-05-08T08:45:23Z', 'KianKwa', 'KianKwa'),
  (115, 'REQ-0115', 'Get List Types from database on all the pages', 'We have added functionality to add list types in database. All pages in CaTH should get the list type from database instead of mock-list-types.ts.

**Acceptance criteria**

- There is no mock-list-types.ts in code repo
- All list types are coming from database 
- All tests are passing', 'functional', 'verified', NULL, NULL, 482, 'https://github.com/hmcts/cath-service/issues/482', '2026-04-14T10:40:11Z', '2026-05-06T17:20:07Z', 'junaidiqbalmoj', 'junaidiqbalmoj'),
  (116, 'REQ-0116', 'Refactor End to End Tests', 'Using PR: https://github.com/hmcts/cath-service/pull/414 make sure no test is interacting with database directly. Use existing CaTH pages or add Testing support endpoint to populate data for end to end tests.

**Acceptance criteria**

- All tests are passing on PR build stage
- No mock data setup for end to end tests', 'non_functional', 'verified', NULL, NULL, 483, 'https://github.com/hmcts/cath-service/issues/483', '2026-04-14T10:45:42Z', '2026-04-24T14:52:46Z', 'junaidiqbalmoj', 'junaidiqbalmoj'),
  (117, 'REQ-0117', 'Generate SJP Excel file when list is uploaded', '## User Story

As a verified user, I want an Excel file to be generated automatically when an SJP list is uploaded, so that I can download the case data in spreadsheet format.

We also need to add the "Download a copy" button when PDF/Excel has been generated for the SJP lists

## Background

When a publication is ingested via `POST /v1/publication`, the `processPublication` function in `libs/publication` is called asynchronously (fire-and-forget). Currently it only triggers PDF generation and notifications. Excel generation needs to be added to this pipeline for SJP list types.

A placeholder `libs/excel-generation` library already exists in the monorepo with empty `src/excel/` and `src/file-storage/` directories. This is where the implementation lives.

Four SJP list types require Excel generation:
- `SJP_PUBLIC_LIST`
- `SJP_DELTA_PUBLIC_LIST`
- `SJP_PRESS_LIST`
- `SJP_DELTA_PRESS_LIST`', 'functional', 'implemented', NULL, NULL, 484, 'https://github.com/hmcts/cath-service/issues/484', '2026-04-14T10:57:58Z', '2026-06-08T16:36:26Z', 'junaidiqbalmoj', 'junaidiqbalmoj'),
  (118, 'REQ-0118', 'Subscribe by case name, case reference number, case ID or unique reference number (URN)', '**PROBLEM STATEMENT**

Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH and subscribe to email notifications from CaTH.

 

**AS A** Verified Media User

**I WANT** to subscribe to hearing lists in CaTH

**SO THAT** I can receive email notifications whenever a new list I subscribed to is published

**Technical Specification:**

This ticket should branch off ''feature/296-select-and-edit-list-type-subscriptions
Add Case_number and case_name fields to the subscription table so they can be retrieved for display on subscription pages.
When user search by a case number or case name, use the artefact_search table to get the results.
If user subscribes by case number, Store value for search_type column on the subscription table as CASE_NUMBER and store the case number in the search_value column.
If user subscribes by case name, Store value for search_type column on the subscription table as CASE_NAME and store the case name in the search_value column.
Subscriptions should be fulfilled for the new search type / value combination. If an artefact is ingested that matches the CASE_NUMBER, then subscription should be fulfilled using the existing subscriptions process / logic.
The code for subscription pages should sit under libs/verified-pages/src/pages.
The code for manipulating subscription information should sit under libs/subscription
 

**Pre-conditions:**

The user has valid credentials and is already approved as a verified media user.
Only published information is available for searching, per system restriction.
Email notifications are implemented in Gov Notify
 

**ACCEPTANCE CRITERIA**

- A verified user is a member of the media who has been verified and has an approved account in CaTH

- A verified user can sign into CaTH to view restricted hearing information and subscribe to email notifications.

- The verified user can see the Dashboard as soon as the user signs in

- At the top of the page user can see a clickable link to see 3 pages provided in these texts Court and tribunal hearings , Dashboard and Email subscriptions

- The verified user can click on the ‘Email subscriptions’ tab to subscribe to hearing lists from specific venues.

- When the user clicks on the ''Email subscriptions'' tab,  the user is taken to a page with a header title ‘Your email subscriptions’ and can see the green ‘Add email subscription’ button under the header. Underneath the button is a table with multiple display options available to the user to select. These display options are titled ‘All subscriptions’, ‘Subscriptions by case’ and ‘Subscription by court or tribunal’. Each option displays the total number of active subscriptions in a bracket beside the title.

- The content of each displayed table is dependent on the availability of active subscriptions the user has and the selected option.

- Each table displays details of the available active subscriptions in the user’s account

- Where the user has subscribed by case name or /and case reference number and clicks on the ‘Subscriptions by case’ option, then the column titles displayed will be ‘Case name’,''Reference number’ and ‘date added’.

- Where the user has subscribed by court or tribunal name and clicks on the ‘Subscription by court or tribunal’ option, then the table will display ‘Court or tribunal name’ and ‘Date added'' in the columns

- Where the user has subscribed by both case name or /and case reference number and court or tribunal name and selects the ‘All subscriptions’ option, then 2 tables will be displayed with the Subscription by case table coming first before the subscription by court or tribunal table following

- Where the user does not have any existing subscriptions, then the following message is displayed under the ''Add email subscription'' tab; ''You do not have any active subscriptions'' and the user can click the green ''Add email subscription'' tab to begin the subscription process

- When the user clicks on the ''Add email subscription'' tab, the user is taken to the page with path ''/subscription-add'' titled ‘How do you want to add an email subscription?’ and underneath the page title, user can see the following message ‘You can only search for information that is currently published.’

- User can see 3 radio button options; ‘By court or tribunal name'', ‘By case name’ and ‘By case reference number, case ID or unique reference number (URN)’

- The user can make one selection and then click the continue button to progress to the next page

- Clicking Continue without selecting an option must trigger a validation error.

- When the user clicks to subscribe ''By court or tribunal name'' it should go to the existing path for ''location-name-search''.

- Where the user clicks to subscribe ''By case name'' then the following steps completes the subscription process

- After selecting By case name, the user must be shown a page requesting a case name input.

- Submitting an empty form must trigger a mandatory field validation message.

- If no results match the case name entered, an error message must be displayed (per Screen 3).

- If matching cases exist, the system must display a search results page (Screen 4).

- The user must be able to select one case from the results list.

- After selection, the user must be brought to a Confirm email subscription page (Screen 5).

- After confirming, the user must be shown a subscription confirmation page (Screen 6).

- The subscription must be added to the user’s active subscription table immediately.

- Where the user clicks to subscribe ''By case reference number, case ID or unique reference number (URN)'' then the following steps completes the subscription process

- After selecting By case reference number, case ID or URN, show an input page requesting the reference.

- Submitting an empty value must trigger validation requiring a reference number.

- Submitting an invalid or non-matching reference must show an error message (Screen 3).

- If a matching case is found, display the results page (Screen 4).

- The user must select a case to subscribe to.

- Display a confirmation page for the selected case (Screen 5).

- Upon confirmation, show a subscription success page (Screen 6).

- The subscription must be added to the user’s subscription table.

- The newly added subscription must updated in the database and be visible immediately in the subscription table in the user''s account

- All CaTH page specifications are maintained.

 **Welsh Translations**

EN: Title/H1 “Dashboard”
CY: Title/H1 “Dangosfwrdd”
EN: Navigation links — “Court and tribunal hearings”, “Dashboard”, “Email subscriptions”
CY: Navigation links — “Gwrandawiadau llys a thribiwnlys”, “Dangosfwrdd”, “tanysgrifiadau e-bost”
EN: Title/H1 “Your email subscriptions”
CY: Title/H1 “Eich tanysgrifiadau e-bost”
EN: Button — “Add email subscription”
CY: Button — “Ychwanegu tanysgrifiad e-bost”
EN: Tab options — “All subscriptions”, “Subscriptions by case”, “Subscription by court or tribunal”
CY: Tab options — “Pob tanysgrifiad”, “Tanysgrifio yn ôl achos”, “Tanysgrifio yn ôl llys neu dribiwnlys”
EN: Empty state message — “You do not have any active subscriptions”
CY: Empty state message — “Nid oes gennych unrhyw danysgrifiadau gweithredol”
EN: Title/H1 “How do you want to add an email subscription?”
CY: Title/H1 “Sut ydych chi eisiau ychwanegu tanysgrifiad e-bost?”
EN: Body text — “You can only search for information that is currently published.”
CY: Body text — “Gallwch ond chwilio am wybodaeth sydd eisoes wedi’i chyhoeddi”
EN: Button — “Continue”
CY: Button — “Dewiswch opsiwn”
EN: “Select how you want to add an email subscription.”
CY: “Dewiswch Sut ydych chi eisiau ychwanegu tanysgrifiad e-bost?”
EN: Title/H1 “By case name”
CY: Title/H1 “Yn ôl enw’r achos”
EN: Label — “Case name”
CY: Label — “Enw''r Achos”
EN: Button — “Continue”
CY: Button — “Dewiswch opsiwn”
EN: “Enter a case name”
CY: “Welsh placeholder”
EN: “No results found”
CY: “Welsh placeholder”
EN: Title/H1 “By case reference number, case ID or unique reference number (URN)”
CY: Title/H1 “Yn ôl enw’r achos, Yn ôl cyfeirnod yr achos, ID yr achos neu gyfeirnod unigryw (URN)”
EN: Label — “Reference number”
CY: Label — “Cyfeirnod”
EN: Button — “Continue”
CY: Button — “Dewiswch opsiwn”
EN: “Enter reference number”
CY: “Rhowch gyfeirnod achos dilys”
EN: “No matching case found”
CY: “Welsh placeholder”
EN: Title/H1 “Select a case”
CY: Title/H1 “Dewiswch yr achos”
EN: Table column headers — “Case name”, “Party name”, “Reference number”
CY: Table column headers — “Enw''r Achos”, “Enw’r parti”, “Cyfeirnod yr Achos”
EN: Button — “Continue”
CY: Button — “Dewiswch opsiwn”
EN: Title/H1 “Confirm email subscription”
CY: Title/H1 “Cadarnhewch tanysgrifiadau e-bost”
EN: Button — “Confirm”
CY: Button — “Cadarnhewch”
 EN: Title/H1 “Subscription added”
CY: Title/H1 “tanysgrifiadau wedi’i ychwanegu”
EN: Body text — “Your email subscription has been added.”
CY: Body text — “Eich tanysgrifiadau e-bost wedi’i ychwanegu”
EN: Link — “Email subscriptions”
CY: Link — “Welsh placeholder”', 'functional', 'verified', 'medium', 'story', 510, 'https://github.com/hmcts/cath-service/issues/510', '2026-04-20T16:01:32Z', '2026-05-15T09:35:51Z', 'OgechiOkelu', 'OgechiOkelu'),
  (119, 'REQ-0119', 'Remove List Sensitivity - Third Party Courtel', '**PROBLEM STATEMENT**
CaTH AI implemented List Sensitivity when user subscribe to the list. Courtel does not support List sensitivity. So we need to remove it.

We also need to remove channel from the manage-third-party-subscriptions page. The third-party users are stored in a separate database table so we do not need the concept of channel to differentiate it from the standard user using email subscriptions.

**AS A** Service
**I WANT** to remove CaTH AI implemented List Sensitivity
**SO THAT** it does not affect Courtel subscription in CaTH

**ACCEPTANCE CRITERIA**
List sensitivity has been removed from Third Party (Coutel).
Channel has been removed from Third Party (Coutel).
The sensitivity and channel fields removed from legacy_third_party_subscription table.', 'constraint', 'implemented', 'high', 'story', 511, 'https://github.com/hmcts/cath-service/issues/511', '2026-04-20T16:27:39Z', '2026-06-08T15:42:44Z', 'OgechiOkelu', 'OgechiOkelu'),
  (120, 'REQ-0120', 'Style Guide: Magistrates'' Court Hearing Lists - Crime Portal / Libra', '**PROBLEM STATEMENT**

This ticket is raised for the creation of the style guide, downloadable PDF and email summary of the Magistrates'' Court Hearing Lists from Crime Portal, which are to be published in CaTH.

**AS A** Service

**I WANT** to create the style guide, PDF & email summary for the new Mags Libra Public Daily list

**SO THAT** the Mags Libra hearing lists can be published in CaTH 

 

**ACCEPTANCE CRITERIA**

- The following list types are to be created in CaTH backend for publishing in CaTH from Crime Portal / Libra.  (Names in bracket for frontend)
MAGISTRATES_ADULT_COURT_LIST_DAILY (Magistrates Adult Court List - Daily)
MAGISTRATES_ADULT_COURT_LIST_FUTURE (Magistrates Adult Court List - Future)
MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY (Magistrates Public Adult Court List - Daily)
MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE (Magistrates Public Adult Court List - Future)

- The fields to be displayed in the public lists are Listing Time, Defendant Name and Case Number
- The fields to be displayed in the standard lists are Block Start, Defendant Name, Date of Birth, Address, Age, Informant, Case Number, Offence Code, Offence Title and Offence Summary
- The validation schema, style guide, PDF & email summary for the MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE are created
- The validation schema, style guide, PDF & email summary for the MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY is created
- Subscription fulfilment process is implemented for each list
- A new pdf template is created for the downloadable version of each list
- Email notification summary for each list will display the defendant name, informant, case number and offence title
- List manipulation is created for the style guide(s)
- Both Crime IDAM and Media Verifies users are able to access all 4 list types which are assigned the ''classified'' sensitivity
- the main party for a case should be the party with DEFENDANT as their partyRole.
 



**Welsh translations:**
Listing time - Amser rhestru
Magistrates Public Adult Daily Court List - Rhestr Achosion Dyddiol Cyhoeddus y Llys Ynadon – Oedolion
Magistrates Adult Court List - Future - Rhestr Llys Ynadon Oedolion – Dyfodol
Listing time - Amser rhestru
Defendant Name - Enw''r Diffynnydd
Case Number - Rhif yr Achos
Sitting at - Yn eistedd yn
Session start - Amser Cychwyn y Sesiwn
Restrictions on publishing or writing about these cases
You must check if any reporting restrictions apply before publishing details on any of the cases listed here either in writing, in a broadcast or by internet, including social media.
 
You''ll be in contempt of court if you publish any information which is protected by a reporting restriction. You could get a fine, prison sentence or both.
Specific restrictions ordered by the court will be mentioned on the cases listed here.
 
However, restrictions are not always listed. Some apply automatically. For example, anonymity given to the victims of certain sexual offences.
 
To find out which reporting restrictions apply on a specific case, contact:
• the court directly
• HM Courts and Tribunals Service on 0330 808 4407
You can also read the reporting restrictions guide

Cyfyngiadau ar gyhoeddi neu ysgrifennu am yr achosion hyn.
Rhaid i chi wirio a oes unrhyw gyfyngiadau riportio yn berthnasol cyn cyhoeddi manylion am unrhyw un o''r achosion a restrir yma, naill ai''n ysgrifenedig, mewn darllediad neu ar y rhyngrwyd, gan gynnwys y cyfryngau cymdeithasol.
 
Byddwch yn euog o ddirmyg llys os byddwch yn cyhoeddi unrhyw wybodaeth sydd wedi''i diogelu gan gyfyngiad riportio. Gallwch gael dirwy, eich dedfrydu i garchar, neu''r ddau.
Bydd cyfyngiadau penodol a orchmynnir gan y llys yn cael eu crybwyll ar yr achosion a restrir yma.
 
Fodd bynnag, nid yw''r cyfyngiadau bob amser yn cael eu rhestru. Mae rhai yn berthnasol yn awtomatig. Er enghraifft, anhysbysrwydd a roddir i ddioddefwyr rhai troseddau rhywiol.
 
I ganfod pa gyfyngiadau riportio sy''n berthnasol ar achos penodol, cysylltwch â''r:
• llys yn uniongyrchol
• Gwasanaeth Llysoedd a Thribiwnlysoedd EM ar 0330 808 4407
Gallwch hefyd ddarllen y canllaw ar gyfyngiadau riportio', 'functional', 'approved', NULL, NULL, 514, 'https://github.com/hmcts/cath-service/issues/514', '2026-04-22T16:25:55Z', '2026-05-21T15:54:40Z', 'OgechiOkelu', 'OgechiOkelu'),
  (121, 'REQ-0121', 'Add the open justice licence link to CaTH footer', '**PROBLEM STATEMENT**
This ticket is raised to add the open justice licence link to CaTH footer. It also needs to be added to B2C page footer as well.

 

**AS A** Service

**I WANT** to add the open justice licence link to CaTH footer

**SO THAT** users can access the required information 

 

**ACCEPTANCE CRITERIA** 

open justice licence link is added to the CaTH footer
link for the open justice licence is https://caselaw.nationalarchives.gov.uk/open-justice-licence/version/2 
Above 2 points added to B2C page as well.', 'functional', 'implemented', NULL, NULL, 545, 'https://github.com/hmcts/cath-service/issues/545', '2026-05-01T08:54:16Z', '2026-06-08T15:20:28Z', 'OgechiOkelu', 'OgechiOkelu'),
  (122, 'REQ-0122', 'Proof of ID document not removed if a media application is rejected', 'If a media application is rejected, the media application status should be set to REJECTED and the proof of ID document deleted.

Currently the document remains in the temp folder if the application is rejected. This is correctly deleted when the media application is approved.', 'functional', 'verified', NULL, NULL, 546, 'https://github.com/hmcts/cath-service/issues/546', '2026-05-06T12:54:41Z', '2026-05-15T09:48:00Z', 'KianKwa', 'KianKwa'),
  (123, 'REQ-0123', 'Fix STAGING Env', 'We need to make sure that all the changes which are being marge into master deployed successfully on STG environment.

Acceptance Criteria:

- STG environment is working', 'constraint', 'verified', NULL, NULL, 559, 'https://github.com/hmcts/cath-service/issues/559', '2026-05-11T07:52:29Z', '2026-05-11T07:52:29Z', 'junaidiqbalmoj', 'junaidiqbalmoj'),
  (124, 'REQ-0124', 'Fix any typescript and lint issue when commit code into branch', 'We need to make sure that when a developers commit a code, it should automatically fix any typescript or lint issue in the code. You need to create per-commit hook for it.', 'non_functional', 'approved', NULL, NULL, 563, 'https://github.com/hmcts/cath-service/issues/563', '2026-05-11T10:59:30Z', '2026-05-26T12:24:01Z', 'junaidiqbalmoj', 'junaidiqbalmoj'),
  (125, 'REQ-0125', 'Fix firewall issue for CaTH Staging Environment', 'We managed to successfully deploy the code on Staging environment but all the pages are being blocked by firewall. We need to fix this issue.

Staging URL: https://cath-web.staging.platform.hmcts.net/

Acceptance criteria:

- CaTH AI staging URL is working
- All Public pages are working', 'constraint', 'verified', NULL, NULL, 565, 'https://github.com/hmcts/cath-service/issues/565', '2026-05-11T15:35:46Z', '2026-05-15T15:26:49Z', 'junaidiqbalmoj', 'junaidiqbalmoj'),
  (126, 'REQ-0126', 'Set up ITHC, Demo and Test environments', '## User Story

As a platform engineer, I want Flux kustomization overlays created for ITHC, Demo and Test environments in `sds-flux-config`, so that Flux can manage application deployments to those environments.

## Background

Currently `cath-service` only has STG and PROD overlays in `sds-flux-config`. ITHC, Demo and Test environments need their own Flux kustomization overlays before deployments to those environments can be automated.

## Acceptance Criteria

- [ ] `apps/cath/ithc/`, `apps/cath/demo/`, `apps/cath/test/` kustomization overlays created in `sds-flux-config`
- [ ] Each overlay has a `base/kustomization.yaml` referencing the shared app HelmRelease definitions
- [ ] Environment-specific patches created for `cath-web` and `cath-api` with correct `ingressHost` per environment:
  - `cath-web.ithc.platform.hmcts.net`
  - `cath-web.demo.platform.hmcts.net`
  - `cath-web.test.platform.hmcts.net`
- [ ] `ENABLE_TEST_SUPPORT` set to `false` for Demo (production-like) and `true` for ITHC and Test
- [ ] Image policies updated to track the correct image tags for each environment (`latest` tag promoted from master)

## Out of Scope

- Pipeline workflow changes (covered in separate issues)
- Infrastructure / Terraform changes (covered in separate issue)
- IDAM/SSO configuration for new environments (separate story)
- PROD deployment changes', 'constraint', 'in_progress', NULL, NULL, 566, 'https://github.com/hmcts/cath-service/issues/566', '2026-05-12T10:04:34Z', '2026-06-09T09:13:14Z', 'junaidiqbalmoj', 'junaidiqbalmoj'),
  (127, 'REQ-0127', 'Create bootstrap Key Vault infrastructure inside cath-service', '## User Story
As a platform engineer, I want bootstrap Key Vaults provisioned per environment from within the cath-service monorepo infrastructure folder, so that there is a central and controlled place to manage secrets before they are synced into the application Key Vault.

## Background
The HMCTS standard pattern uses bootstrap Key Vaults (`cath-bootstrap-{env}-kv`) per environment as the authoritative source for secrets — operators add secrets here manually, and the main infrastructure pipeline reads from them and syncs them into the application KV (`cath-{env}`).

This work lives inside the existing `cath-service` monorepo under the `infrastructure/` folder, following the same pattern used by other HMCTS monorepo projects.

## Acceptance Criteria
- [ ] Bootstrap Key Vault Terraform added under `infrastructure/` (or a dedicated `infrastructure/bootstrap/` subfolder)
- [ ] `main.tf` creates resource group `cath-bootstrap-{env}-rg` and Key Vault `cath-bootstrap-{env}-kv` using `cnp-module-key-vault` with `create_managed_identity = false`; uses locals for prefix, resource group name, and key vault name
- [ ] `variables.tf` with `product` defaulting to `"cath"`, `env`, `location`, `common_tags`, `active_directory_group`
- [ ] `providers.tf`, `state.tf`, `output.tf` present
- [ ] Per-environment `.tfvars` files: `demo.tfvars`, `ithc.tfvars`, `prod.tfvars`, `stg.tfvars`, `test.tfvars`
- [ ] GitHub Actions workflow (`.github/workflows/deploy.yml`) wired to deploy bootstrap infrastructure across all environments
- [ ] Pipeline successfully provisions all 5 bootstrap Key Vaults

## Technical Notes
- Bootstrap KVs do not need managed identity — they are read-only sources
- Naming convention: `cath-bootstrap-{env}-kv`
- Reference the GitHub Actions service principal for KV access
- Follow the `pip-shared-infrastructure-bootstrap` pattern but scoped to the `infrastructure/` folder within this monorepo

## Out of Scope
Adding secrets manually or syncing secrets from bootstrap KV to application KV.', 'constraint', 'verified', NULL, NULL, 580, 'https://github.com/hmcts/cath-service/issues/580', '2026-05-12T12:34:31Z', '2026-05-22T13:25:44Z', 'junaidiqbalmoj', 'junaidiqbalmoj'),
  (128, 'REQ-0128', 'System admin reference data upload - Backend logic update', '*Frontend update is not covered in this ticket.

Currently the reference data upload does not have the concept of provenance. To support multiple provenances for a location:

- The following fields need to be added to the input CSV file format, the relevant model classes and the database:
  - PROVENANCE
  - PROVENANCE LOCATION ID
  - PROVENANCE LOCATION TYPE
- The above fields should be mandatory and non-empty.
- A new location_reference table with the following fields added to store the location provenance:
- location_reference_id
  - location_id
  - provenance
  - provenance_location_id
  - provenance_location_type
- The possible values for provenance should be one of the enum values below:
  - SNL
  - COMMON_PLATFORM
  - CP_CATH
  - PDDA
- The possible values for provenance_location_type should be one of the enum values below:
  - VENUE
  - REGION
  - OWNING_HEARING_LOCATION
  - NATIONAL

Reference data upload validation update:
- When the CSV file has multiple records with same location name or welsh location name but different location IDs, we should show the error on frontend.
- When the CSV file has records with the same location name or Welsh location name but different location IDs as existing records on the database, we should also error on frontend.
- Location name and Welsh location name on the location table should have unique constraint.
- The CSV files are allowed to have same location name or Welsh location name for records with the same location ID but difference provenances.

Changes required in publication upload processing to support the use of provenance location ID:
- Frontend manual upload should always use internal location ID to represent the court or tribunal the publication is uploaded to.
- Publication upload using the API currently only uses internal location ID for the court_id header. With the addition of provenance in reference data upload, external systems (SNL, COMMON_PLATFORM, CP_CATH, PDDA) should use their owned provenance location ID in the header when uploading publication. 
- A new field called location_type needs to be added to the list_type table with one of the possible values below:
  - VENUE
  - REGION
  - OWNING_HEARING_LOCATION
  - NATIONAL
 - When a publication is uploaded by external systems using the API, we should query the location table by the provenance location ID, provenance and the list type provenance location type to covert the provenance location ID to internal location ID before storing the publication in the database.', 'functional', 'verified', NULL, NULL, 582, 'https://github.com/hmcts/cath-service/issues/582', '2026-05-12T12:41:17Z', '2026-06-05T09:03:38Z', 'KianKwa', 'KianKwa'),
  (129, 'REQ-0129', 'Configure multi-environment infrastructure for ITHC, Demo and Test', '## User Story

As a platform engineer, I want infrastructure configured for ITHC, Demo and Test environments, so that Azure resources (Key Vault, Redis, PostgreSQL) and GitHub Actions credentials are available for deployments to those environments.

## Background

Currently `infrastructure/state.tf` has STG hardcoded and there are no per-environment `.tfvars` files. The infrastructure pipeline only provisions resources for STG. ITHC, Demo and Test need their own Azure resources and GitHub Actions credentials before deployments can run.

## Dependencies

- #580 (bootstrap KV repo) and #581 (bootstrap KV secret sync) must be completed first — main KVs for all environments are provisioned as part of that work

## Acceptance Criteria

- [ ] `infrastructure/state.tf` updated to parameterise the backend key (not STG hardcoded)
- [ ] Per-environment `.tfvars` files added to `infrastructure/`:
  - `demo.tfvars`, `ithc.tfvars`, `test.tfvars` (in addition to existing `stg.tfvars`)
- [ ] Infrastructure pipeline configured to deploy to all four environments: ITHC, Demo, Test, STG
- [ ] Azure credentials secrets added to GitHub repo for each new environment:
  - `AZURE_CREDENTIALS_SDS_ITHC`
  - `AZURE_CREDENTIALS_SDS_DEMO`
  - `AZURE_CREDENTIALS_SDS_TEST`
- [ ] Environment-specific Azure resources provisioned (Key Vault, Redis, PostgreSQL) for ITHC, Demo and Test

## Out of Scope

- PROD infrastructure changes
- Bootstrap KV creation (covered in #580 and #581)
- Pipeline workflow changes (covered in separate issues)', 'constraint', 'approved', NULL, NULL, 583, 'https://github.com/hmcts/cath-service/issues/583', '2026-05-12T13:46:13Z', '2026-05-12T13:46:13Z', 'junaidiqbalmoj', 'junaidiqbalmoj'),
  (130, 'REQ-0130', 'Add environment-specific deploy workflows for ITHC, Demo and Test', '## User Story

As a developer, I want dedicated GitHub Actions workflows for ITHC, Demo and Test environments, so that pushing to those branches automatically deploys the promoted images to the correct environment.

## Background

Currently only `workflow.main.yml` exists and deploys to STG. ITHC, Demo and Test environments need their own workflow files that trigger on pushes to their respective branches. These workflows skip the build stage entirely — images are already built and promoted from the master run — and deploy directly using the `latest` tag.

## Dependencies

- #566 (Flux overlays) must be in place so Flux can receive the deployment
- #583 (multi-environment infrastructure) must be complete so Azure credentials and resources exist

## Acceptance Criteria

- [ ] `workflow.ithc.yml` created — triggers on push to `ithc` branch, deploys to ITHC environment using `latest` images
- [ ] `workflow.demo.yml` created — triggers on push to `demo` branch, deploys to Demo environment using `latest` images
- [ ] `workflow.test.yml` created — triggers on push to `test` branch, deploys to Test environment using `latest` images
- [ ] Each workflow:
  - Skips the build stage (no image build or publish)
  - Uses the `latest` image tag promoted from the master build
  - Calls the existing `stage.deploy.yml` with environment-specific inputs
  - Calls the existing `stage.smoke-test.yml` after deploy
  - Uses the correct Azure credentials secret for the target environment
- [ ] `ENABLE_TEST_SUPPORT` is `false` for Demo and `true` for ITHC and Test
- [ ] Environment-specific ingress hosts passed correctly to deploy stage:
  - ITHC: `cath-web.ithc.platform.hmcts.net`
  - Demo: `cath-web.demo.platform.hmcts.net`
  - Test: `cath-web.test.platform.hmcts.net`

## Out of Scope

- Branch sync wiring from master (covered in separate issue)
- Creating the `ithc`, `demo`, `test` branches (covered in branch sync issue)
- Pipeline changes to `workflow.main.yml` (covered in branch sync issue)', 'constraint', 'approved', NULL, NULL, 584, 'https://github.com/hmcts/cath-service/issues/584', '2026-05-12T13:46:39Z', '2026-05-12T13:46:39Z', 'junaidiqbalmoj', 'junaidiqbalmoj'),
  (131, 'REQ-0131', 'Sync lower environment branches from master after successful promote', '## User Story

As a developer, I want master to automatically sync to ITHC, Demo and Test branches after a successful promote, so that lower environment deployments are triggered automatically without any manual intervention.

## Background

After a successful master build (build → STG deploy → smoke test → image promote), the pipeline currently stops. Lower environments need to be updated by fast-forward merging `master` into `ithc`, `demo` and `test` branches. Each branch push then triggers its own workflow (`workflow.ithc.yml`, `workflow.demo.yml`, `workflow.test.yml`) which deploys to that environment.

This is the GitHub Actions equivalent of the Jenkins `branchesToSync` pattern used across HMCTS services.

## Dependencies

- #584 (environment-specific deploy workflows) must exist so the branch pushes have a workflow to trigger

## Acceptance Criteria

- [ ] `ithc`, `demo` and `test` branches created in the `cath-service` repository
- [ ] `workflow.main.yml` has a `sync-branches` job that:
  - Runs after `promote-stage` result is `success`
  - Fast-forward merges `master` into `ithc`, `demo` and `test` branches via `git push origin master:ithc master:demo master:test`
  - Uses a GitHub token with write access to push to those branches
- [ ] Pushing to `ithc`, `demo` or `test` branches triggers the respective workflow (`workflow.ithc.yml`, `workflow.demo.yml`, `workflow.test.yml`)
- [ ] A full end-to-end flow is observable in GitHub Actions: master build → STG deploy → smoke test → promote → branch sync → ITHC/Demo/Test deploy

## Out of Scope

- Creating the environment-specific workflows (covered in #584)
- Flux overlays (covered in #566)
- Infrastructure changes (covered in #583)', 'constraint', 'approved', NULL, NULL, 585, 'https://github.com/hmcts/cath-service/issues/585', '2026-05-12T13:47:04Z', '2026-05-12T13:47:04Z', 'junaidiqbalmoj', 'junaidiqbalmoj'),
  (132, 'REQ-0132', 'Configure Helm values to load secrets from cath Key Vaults for PR and STG builds', '## User Story

As a developer, I want PR builds to load secrets from `cath-bootstrap-stg-kv` and STG/master builds to load secrets from `cath-stg`, so that all environments use the cath-owned Key Vaults rather than borrowing secrets from unrelated services.

## Background

Once #581 (bootstrap KV secret sync) is complete, secrets will be managed in cath-owned Key Vaults:
- `cath-bootstrap-stg-kv` — source of truth, holds all secrets including `-dev` suffixed variants for local/PR use
- `cath-stg` — application KV populated from bootstrap KV by the infrastructure pipeline

Currently:
- `apps/web/helm/values.dev.yaml` (used by PR builds) references `pip-ss-kv-stg` — a Key Vault owned by another team
- `apps/web/helm/values.yaml` and `apps/api/helm/values.yaml` (used by STG) reference `cath` KV correctly but may have gaps once secrets are migrated

## Dependencies

- #581 must be completed and all secrets must be present in `cath-bootstrap-stg-kv` and `cath-stg` before this work begins

## Acceptance Criteria

### PR builds (`values.dev.yaml`)
- [ ] `apps/web/helm/values.dev.yaml` updated to reference `cath-bootstrap-stg-kv` instead of `pip-ss-kv-stg`
- [ ] All secret names updated to match those defined in `cath-bootstrap-stg-kv` (using `-dev` suffixed secrets for SSO where applicable, e.g. `sso-client-id-dev`, `sso-client-secret-dev`)
- [ ] `apps/api/helm/values.dev.yaml` created (if not present) referencing `cath-bootstrap-stg-kv` for API secrets
- [ ] PR build deploys successfully and all secrets are loaded correctly from `cath-bootstrap-stg-kv`

### STG/master builds (`values.yaml`)
- [ ] `apps/web/helm/values.yaml` confirmed to reference `cath` KV only — no references to `pip-ss-kv-stg` or any other external KV
- [ ] `apps/api/helm/values.yaml` confirmed to reference `cath` KV only
- [ ] All secret names in `values.yaml` match those synced from bootstrap into `cath-stg` by #581
- [ ] STG deployment succeeds and all secrets are loaded correctly from `cath-stg`

### General
- [ ] No references to `pip-ss-kv-stg` remain in any Helm values files
- [ ] `helm/cath-service/values.template.yaml` updated if it references any external KV

## Technical Notes

- PR builds use `values.dev.yaml` — these target the `cath-bootstrap-stg-kv` vault directly since preview namespaces share the STG cluster and identity
- STG builds use `values.yaml` — these target the `cath` KV which resolves to `cath-stg` in the STG environment via the HMCTS workload identity binding
- The `-dev` suffixed secrets in `cath-bootstrap-stg-kv` (e.g. `sso-client-id-dev`) are for non-production use — the same pattern used in #581

## Out of Scope

- Secrets management for ITHC, Demo or Test environments (covered in #583)
- Bootstrap KV creation or secret sync (covered in #580 and #581)', 'constraint', 'approved', NULL, NULL, 586, 'https://github.com/hmcts/cath-service/issues/586', '2026-05-12T13:51:32Z', '2026-05-12T13:51:32Z', 'junaidiqbalmoj', 'junaidiqbalmoj'),
  (133, 'REQ-0133', 'Style Guide: Implement Civil and Family Daily Cause Lists', '## User Story

As a user, I want to view the Civil Daily Cause List and Family Daily Cause List in an accessible and well-formatted style, so that I can see scheduled hearings with all relevant case details.

## Background

Two strategic list types are implemented together:
- `civil-daily-cause-list` — `CIVIL_DAILY_CAUSE_LIST`
- `family-daily-cause-list` — `FAMILY_DAILY_CAUSE_LIST`

Each has its own separate JSON schema. They follow the same module pattern as the existing `civil-and-family-daily-cause-list` implementation.

## Acceptance Criteria

### Module structure
- [ ] Two new libs created:
  - `libs/list-types/civil-daily-cause-list/`
  - `libs/list-types/family-daily-cause-list/`
- [ ] Each lib contains:
  - `src/models/types.ts` — TypeScript interfaces matching the JSON schema structure
  - `src/validation/json-validator.ts` — validates incoming JSON against the relevant schema
  - `src/schemas/{list-type}.json` — copied from pip-data-management
  - `src/rendering/renderer.ts` and `renderer.test.ts`
  - `src/pages/index.ts`, `index.test.ts`, `en.ts`, `cy.ts`, `{list-type}.njk`
  - `src/pdf/pdf-generator.ts`, `pdf-template.njk`, `pdf-generator.test.ts`
  - `src/index.ts`, `src/config.ts`, `package.json`, `tsconfig.json`

### List type data registration
- [ ] Both list type keys registered in `libs/location/src/list-type-data.ts` with correct `urlPath`, `provenance: "CFT_IDAM"`, `isNonStrategic: false`, and `defaultSensitivity`

### Page content (EN)

| Key | Civil | Family |
|-----|-------|--------|
| title | Civil Daily Cause List | Family Daily Cause List |
| listDate | List for date: | List for date: |
| lastUpdated | Last updated: | Last updated: |
| publishedAt | Published at: | Published at: |
| venueAddress | Venue address | Venue address |
| openJusticeTitle | Open justice | Open justice |
| openJusticeText | The open justice principle means courts and tribunals should, where possible, be open for the public and press to observe. | The open justice principle means courts and tribunals should, where possible, be open for the public and press to observe. |
| dataSource | Data source | Data source |
| time | Time | Time |
| caseRef | Case ref | Case ref |
| caseName | Case name | Case name |
| caseType | Case type | Case type |
| hearingType | Hearing type | Hearing type |
| location | Location | Location |
| duration | Duration | Duration |
| applicant | Applicant | Applicant |
| respondent | Respondent | Respondent |
| noHearings | No hearings today | No hearings today |
| linkToTop | Back to top | Back to top |
| judiciary | Judiciary | Judiciary |

### Page content (CY)

| Key | Civil | Family |
|-----|-------|--------|
| title | Rhestr Achosion Dyddiol Sifil | Rhestr Achosion Dyddiol Teulu |
| listDate | Rhestr ar gyfer dyddiad: | Rhestr ar gyfer dyddiad: |
| lastUpdated | Diweddarwyd ddiwethaf: | Diweddarwyd ddiwethaf: |
| publishedAt | Cyhoeddwyd am: | Cyhoeddwyd am: |
| venueAddress | Cyfeiriad y lleoliad | Cyfeiriad y lleoliad |
| openJusticeTitle | Cyfiawnder agored | Cyfiawnder agored |
| openJusticeText | Mae egwyddor cyfiawnder agored yn golygu y dylai llysoedd a thribiwnlysoedd, lle bo modd, fod yn agored i''r cyhoedd a''r wasg eu gwylio. | Mae egwyddor cyfiawnder agored yn golygu y dylai llysoedd a thribiwnlysoedd, lle bo modd, fod yn agored i''r cyhoedd a''r wasg eu gwylio. |
| dataSource | Ffynhonnell data | Ffynhonnell data |
| time | Amser | Amser |
| caseRef | Cyfeirnod yr achos | Cyfeirnod yr achos |
| caseName | Enw''r achos | Enw''r achos |
| caseType | Math o achos | Math o achos |
| hearingType | Math o wrandawiad | Math o wrandawiad |
| location | Lleoliad | Lleoliad |
| duration | Hyd | Hyd |
| applicant | Ceisydd | Ceisydd |
| respondent | Atebydd | Atebydd |
| noHearings | Dim gwrandawiadau heddiw | Dim gwrandawiadau heddiw |
| linkToTop | Yn ôl i''r brig | Yn ôl i''r brig |
| judiciary | Barnwriaeth | Barnwriaeth |

### Hearings table columns

Both lists use individual column keys (no `tableHeaders` array in locale):

| Column | EN | CY |
|--------|----|----|
| Time | Time | Amser |
| Case ref | Case ref | Cyfeirnod yr achos |
| Case name | Case name | Enw''r achos |
| Case type | Case type | Math o achos |
| Hearing type | Hearing type | Math o wrandawiad |
| Location | Location | Lleoliad |
| Duration | Duration | Hyd |
| Applicant | Applicant | Ceisydd |
| Respondent | Respondent | Atebydd |

### Pages
- [ ] Pages accessible at:
  - `GET /civil-daily-cause-list?artefactId=<id>`
  - `GET /family-daily-cause-list?artefactId=<id>`
- [ ] Each displays venue name, address, content date, last updated timestamp
- [ ] Displays court rooms grouped in accordion sections
- [ ] Each accordion section shows judiciary name(s)
- [ ] Hearings table shows the 9 columns defined above
- [ ] Open Justice collapsible section present
- [ ] Case search input present
- [ ] Data source attribution shown at bottom

### Validation and access control
- [ ] Returns 400 if `artefactId` is missing
- [ ] Returns 404 if artefact not found
- [ ] Returns 403 if user does not have access
- [ ] Returns 400 if JSON fails schema validation

### PDF generation
- [ ] PDF generated from `pdf-template.njk` matching the HTML view structure for each list
- [ ] PDF saved to storage correctly

### Welsh language
- [ ] All page content available in Welsh via `?lng=cy`
- [ ] PDF generated in correct language based on locale

### Registration
- [ ] Both modules registered in `apps/web/src/app.ts` (`pageRoutes` and `moduleRoot`)
- [ ] Path aliases added to root `tsconfig.json`
- [ ] Packages added as dependencies in `apps/web/package.json`

### Tests
- [ ] Unit tests pass for both modules (controller, renderer and PDF generator)
- [ ] `yarn test` passes across the workspace

## TODO

- [ ] Add email summary (`src/email-summary/summary-builder.ts`) for each list once email summary requirements are confirmed

## Technical Notes

- Schema sources from pip-data-management `src/main/resources/schemas/`:
  - `civil_daily_cause_list.json`
  - `family_daily_cause_list.json`
- Follow the `civil-and-family-daily-cause-list` module as the reference implementation', 'functional', 'implemented', NULL, NULL, 594, 'https://github.com/hmcts/cath-service/issues/594', '2026-05-13T08:52:28Z', '2026-05-22T10:22:32Z', 'junaidiqbalmoj', 'junaidiqbalmoj'),
  (134, 'REQ-0134', 'Add missing regions and sub-jurisdictions to seed data', 'Some regions and sub-jurisdictions are missing in the seed data. As a result, we cannot upload court venues containing those regions or sub-jurisdictions.

Review what is in current CaTH and make sure AI CaTH have the same regions/sub-jurisdictions as well as their Welsh translations

**Acceptance Criteria**
Regions and sub-jurisdictions in AI CaTH match those in current CaTH.', 'functional', 'implemented', NULL, NULL, 678, 'https://github.com/hmcts/cath-service/issues/678', '2026-06-04T15:24:44Z', '2026-06-04T16:11:26Z', 'KianKwa', 'KianKwa');

-- One 'created' change row per requirement (version 1), stamped with the
-- issue's creation time and author.
INSERT INTO requirement_change
  (requirement_id, version, change_type, change_summary, changed_by, changed_at)
VALUES
  (1, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T16:58:42Z'),
  (2, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T16:59:00Z'),
  (3, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:00:25Z'),
  (4, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:01:02Z'),
  (5, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:01:14Z'),
  (6, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:01:28Z'),
  (7, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:01:44Z'),
  (8, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:01:58Z'),
  (9, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:02:16Z'),
  (10, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:02:27Z'),
  (11, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:02:44Z'),
  (12, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:02:54Z'),
  (13, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:03:12Z'),
  (14, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:03:32Z'),
  (15, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:03:46Z'),
  (16, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:03:56Z'),
  (17, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:04:19Z'),
  (18, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:04:34Z'),
  (19, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:04:48Z'),
  (20, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:05:02Z'),
  (21, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:05:15Z'),
  (22, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:05:29Z'),
  (23, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:05:45Z'),
  (24, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:05:59Z'),
  (25, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:06:10Z'),
  (26, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:06:20Z'),
  (27, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:06:30Z'),
  (28, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:06:48Z'),
  (29, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:07:00Z'),
  (30, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:07:15Z'),
  (31, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:07:27Z'),
  (32, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:07:40Z'),
  (33, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:07:52Z'),
  (34, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:08:04Z'),
  (35, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:08:25Z'),
  (36, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:08:38Z'),
  (37, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:08:53Z'),
  (38, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:09:05Z'),
  (39, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:09:18Z'),
  (40, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:09:36Z'),
  (41, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:10:16Z'),
  (42, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:10:31Z'),
  (43, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:10:43Z'),
  (44, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:11:30Z'),
  (45, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:11:42Z'),
  (46, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:11:55Z'),
  (47, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:12:10Z'),
  (48, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:12:26Z'),
  (49, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:12:41Z'),
  (50, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:12:53Z'),
  (51, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:13:05Z'),
  (52, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:13:51Z'),
  (53, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:14:05Z'),
  (54, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:14:19Z'),
  (55, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:14:32Z'),
  (56, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:14:45Z'),
  (57, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:15:01Z'),
  (58, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:15:17Z'),
  (59, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:15:32Z'),
  (60, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:15:58Z'),
  (61, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:16:41Z'),
  (62, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:16:52Z'),
  (63, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:17:09Z'),
  (64, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:17:26Z'),
  (65, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:18:09Z'),
  (66, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:18:50Z'),
  (67, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:19:04Z'),
  (68, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:19:15Z'),
  (69, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:19:25Z'),
  (70, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:19:35Z'),
  (71, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:19:46Z'),
  (72, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:19:59Z'),
  (73, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:20:13Z'),
  (74, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:20:28Z'),
  (75, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:20:45Z'),
  (76, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:21:01Z'),
  (77, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:21:14Z'),
  (78, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:21:32Z'),
  (79, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:21:43Z'),
  (80, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:21:56Z'),
  (81, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:22:24Z'),
  (82, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:22:43Z'),
  (83, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:23:04Z'),
  (84, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:23:14Z'),
  (85, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:23:27Z'),
  (86, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:23:41Z'),
  (87, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:23:56Z'),
  (88, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:24:09Z'),
  (89, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:24:23Z'),
  (90, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-20T17:24:36Z'),
  (91, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-29T16:02:45Z'),
  (92, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-29T16:02:45Z'),
  (93, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-30T13:58:56Z'),
  (94, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-30T13:59:35Z'),
  (95, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-30T14:01:18Z'),
  (96, 1, 'created', 'imported from GitHub issue', 'linusnorton', '2026-01-30T14:05:30Z'),
  (97, 1, 'created', 'imported from GitHub issue', 'OgechiOkelu', '2026-02-02T16:41:24Z'),
  (98, 1, 'created', 'imported from GitHub issue', 'junaidiqbalmoj', '2026-02-11T11:41:46Z'),
  (99, 1, 'created', 'imported from GitHub issue', 'junaidiqbalmoj', '2026-02-11T12:00:11Z'),
  (100, 1, 'created', 'imported from GitHub issue', 'junaidiqbalmoj', '2026-02-11T16:36:19Z'),
  (101, 1, 'created', 'imported from GitHub issue', 'junaidiqbalmoj', '2026-02-11T16:48:32Z'),
  (102, 1, 'created', 'imported from GitHub issue', 'junaidiqbalmoj', '2026-02-12T14:41:50Z'),
  (103, 1, 'created', 'imported from GitHub issue', 'OgechiOkelu', '2026-02-24T17:54:19Z'),
  (104, 1, 'created', 'imported from GitHub issue', 'OgechiOkelu', '2026-02-27T16:23:17Z'),
  (105, 1, 'created', 'imported from GitHub issue', 'OgechiOkelu', '2026-03-03T13:36:57Z'),
  (106, 1, 'created', 'imported from GitHub issue', 'OgechiOkelu', '2026-03-03T18:12:03Z'),
  (107, 1, 'created', 'imported from GitHub issue', 'OgechiOkelu', '2026-03-09T15:04:40Z'),
  (108, 1, 'created', 'imported from GitHub issue', 'OgechiOkelu', '2026-03-10T13:26:03Z'),
  (109, 1, 'created', 'imported from GitHub issue', 'OgechiOkelu', '2026-03-11T17:06:21Z'),
  (110, 1, 'created', 'imported from GitHub issue', 'OgechiOkelu', '2026-03-12T16:58:40Z'),
  (111, 1, 'created', 'imported from GitHub issue', 'OgechiOkelu', '2026-03-24T11:30:02Z'),
  (112, 1, 'created', 'imported from GitHub issue', 'OgechiOkelu', '2026-03-24T12:54:56Z'),
  (113, 1, 'created', 'imported from GitHub issue', 'KianKwa', '2026-04-13T14:02:04Z'),
  (114, 1, 'created', 'imported from GitHub issue', 'KianKwa', '2026-04-13T16:27:11Z'),
  (115, 1, 'created', 'imported from GitHub issue', 'junaidiqbalmoj', '2026-04-14T10:40:11Z'),
  (116, 1, 'created', 'imported from GitHub issue', 'junaidiqbalmoj', '2026-04-14T10:45:42Z'),
  (117, 1, 'created', 'imported from GitHub issue', 'junaidiqbalmoj', '2026-04-14T10:57:58Z'),
  (118, 1, 'created', 'imported from GitHub issue', 'OgechiOkelu', '2026-04-20T16:01:32Z'),
  (119, 1, 'created', 'imported from GitHub issue', 'OgechiOkelu', '2026-04-20T16:27:39Z'),
  (120, 1, 'created', 'imported from GitHub issue', 'OgechiOkelu', '2026-04-22T16:25:55Z'),
  (121, 1, 'created', 'imported from GitHub issue', 'OgechiOkelu', '2026-05-01T08:54:16Z'),
  (122, 1, 'created', 'imported from GitHub issue', 'KianKwa', '2026-05-06T12:54:41Z'),
  (123, 1, 'created', 'imported from GitHub issue', 'junaidiqbalmoj', '2026-05-11T07:52:29Z'),
  (124, 1, 'created', 'imported from GitHub issue', 'junaidiqbalmoj', '2026-05-11T10:59:30Z'),
  (125, 1, 'created', 'imported from GitHub issue', 'junaidiqbalmoj', '2026-05-11T15:35:46Z'),
  (126, 1, 'created', 'imported from GitHub issue', 'junaidiqbalmoj', '2026-05-12T10:04:34Z'),
  (127, 1, 'created', 'imported from GitHub issue', 'junaidiqbalmoj', '2026-05-12T12:34:31Z'),
  (128, 1, 'created', 'imported from GitHub issue', 'KianKwa', '2026-05-12T12:41:17Z'),
  (129, 1, 'created', 'imported from GitHub issue', 'junaidiqbalmoj', '2026-05-12T13:46:13Z'),
  (130, 1, 'created', 'imported from GitHub issue', 'junaidiqbalmoj', '2026-05-12T13:46:39Z'),
  (131, 1, 'created', 'imported from GitHub issue', 'junaidiqbalmoj', '2026-05-12T13:47:04Z'),
  (132, 1, 'created', 'imported from GitHub issue', 'junaidiqbalmoj', '2026-05-12T13:51:32Z'),
  (133, 1, 'created', 'imported from GitHub issue', 'junaidiqbalmoj', '2026-05-13T08:52:28Z'),
  (134, 1, 'created', 'imported from GitHub issue', 'KianKwa', '2026-06-04T15:24:44Z');

COMMIT;
