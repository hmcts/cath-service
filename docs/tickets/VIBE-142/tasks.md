# VIBE-142: Implementation Tasks

## Phase 1: Azure B2C Setup ⚠️ CRITICAL - DO FIRST

### Azure B2C Configuration (DevOps/Infrastructure)
- [ ] Create Non-Prod Azure B2C tenant
- [ ] Register CaTH application in B2C
- [ ] Configure reply URLs for OAuth callbacks
- [ ] Create user flows for HMCTS authentication
- [ ] Create user flows for Common Platform authentication
- [ ] Create user flows for CaTH authentication
- [ ] Enable Welsh language support in all user flows
- [ ] Test user flows manually in B2C portal
- [ ] Document B2C configuration steps

### Environment Configuration
- [ ] Obtain Azure B2C credentials (tenant ID, client ID, client secret)
- [ ] Obtain policy names for each authentication route
- [ ] Add environment variables to `.env.example`
- [ ] Configure `.env` with B2C credentials
- [ ] Generate secure SESSION_SECRET
- [ ] Configure REDIS_URL for session storage
- [ ] Set SESSION_TIMEOUT_WARNING (e.g., 25 minutes = 1500000ms)
- [ ] Set SESSION_TIMEOUT_LOGOUT (e.g., 30 minutes = 1800000ms)

## Phase 2: Authentication Module Setup

### Module Structure
- [ ] Create directory structure: `libs/auth/src/{pages,locales,assets/{css,js}}`
- [ ] Create `libs/auth/package.json`
- [ ] Create `libs/auth/tsconfig.json`
- [ ] Create `libs/auth/src/config.ts`
- [ ] Create `libs/auth/src/index.ts`

### Dependencies
- [ ] Install passport: `yarn add passport`
- [ ] Install passport-azure-ad: `yarn add passport-azure-ad`
- [ ] Install express-session: `yarn add express-session`
- [ ] Install connect-redis: `yarn add connect-redis`
- [ ] Install ioredis: `yarn add ioredis`
- [ ] Install csurf: `yarn add csurf`
- [ ] Install dev dependencies: `yarn add -D @types/passport @types/express-session @types/connect-redis @types/csurf`

### B2C Configuration
- [ ] Create `libs/auth/src/azure-b2c-config.ts`
- [ ] Export B2C metadata endpoints
- [ ] Configure passport-azure-ad OIDCStrategy
- [ ] Set up redirect URLs
- [ ] Add unit tests for B2C config

### B2C Service
- [ ] Create `libs/auth/src/azure-b2c-service.ts`
- [ ] Implement `getAuthorizationUrl(provider, language)`
- [ ] Implement `handleCallback(code, state)`
- [ ] Implement `getUserProfile(accessToken)`
- [ ] Add error handling for B2C errors
- [ ] Add unit tests for B2C service

## Phase 3: Session Management

### Redis Setup
- [ ] Configure Redis connection in `libs/auth/src/redis-client.ts`
- [ ] Test Redis connection
- [ ] Configure connect-redis store

### Session Service
- [ ] Create `libs/auth/src/session-service.ts`
- [ ] Implement `createSession(userId, userProfile)`
- [ ] Implement `getSession(sessionId)`
- [ ] Implement `destroySession(sessionId)`
- [ ] Implement `updateSessionActivity(sessionId)`
- [ ] Add unit tests for session service

### Session Middleware
- [ ] Create `libs/auth/src/session-timeout-middleware.ts`
- [ ] Track last activity timestamp
- [ ] Calculate time until warning and logout
- [ ] Set session data for client-side timeout script
- [ ] Add unit tests for session middleware

### Session Configuration
- [ ] Configure express-session in `apps/web/src/app.ts`
- [ ] Set up RedisStore
- [ ] Configure session cookie options (secure, httpOnly, maxAge)
- [ ] Add session middleware to app

## Phase 4: Authentication Pages

### Page 1: Sign-In Options
- [ ] Create `libs/auth/src/pages/sign-in-options.ts` controller
- [ ] Implement GET handler to render sign-in options
- [ ] Implement POST handler to validate selection
- [ ] Build Azure B2C authorization URL with selected policy
- [ ] Include language parameter (ui_locales)
- [ ] Include state parameter for CSRF protection
- [ ] Add content objects (en and cy)
- [ ] Create `libs/auth/src/pages/sign-in-options.njk` template
- [ ] Add radio buttons for three providers
- [ ] Add continue button
- [ ] Add error summary component

### Page 2: B2C Callback Handler
- [ ] Create route `/auth/callback` in auth module
- [ ] Handle OAuth callback from Azure B2C
- [ ] Exchange authorization code for tokens
- [ ] Extract user profile from ID token
- [ ] Validate state parameter
- [ ] Create session with user profile
- [ ] Redirect to dashboard on success
- [ ] Handle authentication errors from B2C
- [ ] Add error handler with redirect to sign-in page
- [ ] Add unit tests for callback handler

### Page 3: Session Timeout Warning
- [ ] Create `libs/auth/src/pages/session-timeout-warning.ts` controller
- [ ] Implement GET handler to render warning modal
- [ ] Implement POST handler to reset session activity
- [ ] Add content objects (en and cy)
- [ ] Create `libs/auth/src/pages/session-timeout-warning.njk` template
- [ ] Add warning message
- [ ] Add continue button
- [ ] Create `libs/auth/src/assets/js/session-timeout.ts` client-side script
- [ ] Track inactivity with JavaScript timer
- [ ] Show warning modal at threshold
- [ ] Auto-redirect to expired page if no action
- [ ] Reset timer on user activity

### Page 4: Session Expired
- [ ] Create `libs/auth/src/pages/session-expired.ts` controller
- [ ] Implement GET handler to render expired message
- [ ] Add content objects (en and cy)
- [ ] Create `libs/auth/src/pages/session-expired.njk` template
- [ ] Add expired message
- [ ] Add "Sign in again" button

## Phase 5: Authentication Middleware

- [ ] Create `libs/auth/src/auth-middleware.ts`
- [ ] Implement `requireAuth()` to verify user is authenticated
- [ ] Implement `requireRole(role)` to verify user has required role
- [ ] Redirect to sign-in if not authenticated
- [ ] Add flash message for redirect reason
- [ ] Add unit tests for auth middleware

### Apply Middleware to Protected Routes
- [ ] Apply requireAuth to dashboard routes
- [ ] Apply requireAuth to subscription management routes
- [ ] Apply requireAuth and requireRole('SYSTEM_ADMIN') to system admin routes
- [ ] Test unauthorized access redirects correctly

## Phase 6: Sign Out

- [ ] Create sign-out route `/sign-out`
- [ ] Destroy session
- [ ] Clear cookies
- [ ] Optionally redirect to Azure B2C logout endpoint
- [ ] Redirect to home page with confirmation
- [ ] Add unit tests for sign-out

### Sign Out Link
- [ ] Update `libs/layout/src/views/header.njk` to add sign-out link
- [ ] Display "Sign out" link when user is authenticated
- [ ] Hide sign-out link when user is not authenticated
- [ ] Test sign-out link visibility

## Phase 7: Translations

### English Translations
- [ ] Create `libs/auth/src/locales/en.ts`
- [ ] Add page titles and headings
- [ ] Add form labels
- [ ] Add button text
- [ ] Add error messages
- [ ] Add session timeout messages
- [ ] Add sign-in/sign-out text

### Welsh Translations
- [ ] Create `libs/auth/src/locales/cy.ts`
- [ ] Translate all content from English file using ticket descriptions
- [ ] Review Welsh translations for accuracy

## Phase 8: Styles

- [ ] Create `libs/auth/src/assets/css/auth.scss`
- [ ] Style sign-in options page
- [ ] Style timeout warning modal
- [ ] Style session expired page
- [ ] Style error messages

## Phase 9: Security & CSRF Protection

- [ ] Add csurf middleware to app
- [ ] Add CSRF token to all forms
- [ ] Validate CSRF token on form submissions
- [ ] Test CSRF protection

## Phase 10: Module Registration

- [ ] Register module in `apps/web/src/app.ts`
- [ ] Register assets in `apps/web/vite.config.ts`
- [ ] Update root `tsconfig.json` with module path

## Phase 11: Testing

### Unit Tests
- [ ] Test B2C service URL generation
- [ ] Test session service CRUD operations
- [ ] Test auth middleware authentication checks
- [ ] Test timeout calculation logic
- [ ] Test callback handler token exchange
- [ ] Ensure >80% coverage on business logic

### Integration Tests
- [ ] Test mocked B2C authentication flow
- [ ] Test session creation and validation
- [ ] Test protected route access control
- [ ] Test session timeout behavior
- [ ] Test sign-out flow

### E2E Tests
- [ ] Test complete sign-in journey with HMCTS provider
- [ ] Test complete sign-in journey with Common Platform provider
- [ ] Test complete sign-in journey with CaTH provider
- [ ] Test validation error when no option selected
- [ ] Test session timeout warning appears after inactivity
- [ ] Test auto sign-out after final timeout
- [ ] Test continue button resets timeout
- [ ] Test manual sign-out journey
- [ ] Test Welsh language throughout authentication flow
- [ ] Test language persists through B2C redirect
- [ ] Test accessibility with Axe (inline with journeys)
- [ ] Test keyboard navigation

## Phase 12: Documentation & Cleanup

- [ ] Document B2C setup steps in README
- [ ] Document environment variables
- [ ] Document session timeout configuration
- [ ] Run `yarn lint:fix` to fix any linting issues
- [ ] Run `yarn format` to format code
- [ ] Review all changes
- [ ] Create pull request

## Notes

- **Critical**: Azure B2C must be configured before development can begin
- Use Non-Prod B2C instance for all development and testing
- Store session data server-side only (never in client cookies)
- Validate all tokens from B2C before trusting user profile
- Log all authentication events for audit
- Test language persistence through B2C flows thoroughly
- Session timeout values should be configurable via environment variables
- Client-side timeout timer should sync with server-side session
- Use CSRF protection on all forms
- Follow GOV.UK Design System for all page layouts
