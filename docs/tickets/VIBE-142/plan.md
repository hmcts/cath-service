# VIBE-142: Implementation Plan

## Overview

This ticket implements Azure B2C authentication for verified users in CaTH. Users can sign in via three authentication providers (HMCTS, Common Platform, CaTH), with password reset functionality, session timeout management, and full Welsh language support throughout the authentication flow.

## Critical Files

### New Files to Create

1. **Authentication Module**
   - `libs/auth/package.json` - Module configuration
   - `libs/auth/tsconfig.json` - TypeScript config
   - `libs/auth/src/config.ts` - Module exports
   - `libs/auth/src/index.ts` - Business logic exports
   - `libs/auth/src/pages/sign-in-options.ts` - Sign-in method selection
   - `libs/auth/src/pages/sign-in-options.njk` - Template
   - `libs/auth/src/pages/session-timeout-warning.ts` - Timeout warning modal
   - `libs/auth/src/pages/session-timeout-warning.njk` - Template
   - `libs/auth/src/pages/session-expired.ts` - Session expired page
   - `libs/auth/src/pages/session-expired.njk` - Template
   - `libs/auth/src/locales/en.ts` - English translations
   - `libs/auth/src/locales/cy.ts` - Welsh translations
   - `libs/auth/src/azure-b2c-service.ts` - Azure B2C integration
   - `libs/auth/src/session-service.ts` - Session management
   - `libs/auth/src/auth-middleware.ts` - Authentication middleware
   - `libs/auth/src/session-timeout-middleware.ts` - Inactivity tracking
   - `libs/auth/src/assets/css/auth.scss` - Auth page styles
   - `libs/auth/src/assets/js/session-timeout.ts` - Client-side timeout logic

2. **Azure B2C Configuration**
   - `libs/auth/src/azure-b2c-config.ts` - B2C endpoint configuration
   - `libs/auth/src/azure-b2c-callback-handler.ts` - Handle B2C callbacks

### Files to Modify

1. **App Configuration**
   - `apps/web/src/app.ts` - Register auth module, add session middleware
   - `apps/web/vite.config.ts` - Register auth assets
   - `apps/web/package.json` - Add passport-azure-ad dependency

2. **Environment Configuration**
   - `.env.example` - Add Azure B2C environment variables
   - `apps/web/.env` - Configure B2C tenant, client IDs, secrets

3. **Navigation**
   - `libs/layout/src/views/header.njk` - Add "Sign in" and "Sign out" links
   - `libs/dashboard/src/pages/dashboard.njk` - Add authenticated user navigation

4. **Root Configuration**
   - `tsconfig.json` - Add @hmcts/auth path
   - `package.json` - Add passport, express-session, connect-redis dependencies

## Implementation Steps

### Phase 1: Azure B2C Setup (Priority: Critical)

1. **Configure Azure B2C tenant** (DevOps/Infrastructure task)
   - Create Non-Prod B2C instance
   - Register application in B2C
   - Configure reply URLs for callback
   - Set up user flows for HMCTS, Common Platform, CaTH
   - Enable Welsh language support in user flows

2. **Obtain credentials**
   - Tenant ID
   - Client ID
   - Client Secret
   - Policy names for each authentication route

3. **Add environment variables** to `.env`
   ```
   AZURE_B2C_TENANT_NAME=your-tenant
   AZURE_B2C_TENANT_ID=your-tenant-id
   AZURE_B2C_CLIENT_ID=your-client-id
   AZURE_B2C_CLIENT_SECRET=your-client-secret
   AZURE_B2C_POLICY_HMCTS=B2C_1A_HMCTS_SignIn
   AZURE_B2C_POLICY_COMMON_PLATFORM=B2C_1A_CommonPlatform_SignIn
   AZURE_B2C_POLICY_CATH=B2C_1A_CaTH_SignIn
   AZURE_B2C_REDIRECT_URI=http://localhost:3000/auth/callback
   SESSION_SECRET=your-session-secret
   REDIS_URL=redis://localhost:6379
   SESSION_TIMEOUT_WARNING=1500000
   SESSION_TIMEOUT_LOGOUT=1800000
   ```

### Phase 2: Authentication Module Setup (Priority: High)

1. **Create module structure**
   ```bash
   mkdir -p libs/auth/src/{pages,locales,assets/{css,js}}
   ```

2. **Install dependencies**
   ```bash
   yarn add passport passport-azure-ad express-session connect-redis ioredis
   yarn add -D @types/passport @types/express-session @types/connect-redis
   ```

3. **Create B2C configuration** `libs/auth/src/azure-b2c-config.ts`
   - Export B2C metadata endpoints
   - Configure passport-azure-ad strategy
   - Set up redirect URLs

4. **Create B2C service** `libs/auth/src/azure-b2c-service.ts`
   - `getAuthorizationUrl(provider: 'hmcts' | 'common-platform' | 'cath', language: 'en' | 'cy')`
   - `handleCallback(code: string, state: string)`
   - `getUserProfile(accessToken: string)`

### Phase 3: Session Management (Priority: High)

1. **Set up Redis** (for session storage)
   - Configure Redis connection
   - Use connect-redis for express-session store

2. **Create session service** `libs/auth/src/session-service.ts`
   - `createSession(userId: string, userProfile: UserProfile)`
   - `getSession(sessionId: string)`
   - `destroySession(sessionId: string)`
   - `updateSessionActivity(sessionId: string)`

3. **Create session middleware** `libs/auth/src/session-timeout-middleware.ts`
   - Track last activity timestamp
   - Calculate time until warning and logout
   - Set session data for client-side timeout script

4. **Configure session** in `apps/web/src/app.ts`
   ```typescript
   import session from 'express-session';
   import RedisStore from 'connect-redis';
   import { createClient } from 'redis';

   const redisClient = createClient({ url: process.env.REDIS_URL });
   const redisStore = new RedisStore({ client: redisClient });

   app.use(session({
     store: redisStore,
     secret: process.env.SESSION_SECRET,
     resave: false,
     saveUninitialized: false,
     cookie: {
       secure: process.env.NODE_ENV === 'production',
       httpOnly: true,
       maxAge: parseInt(process.env.SESSION_TIMEOUT_LOGOUT)
     }
   }));
   ```

### Phase 4: Authentication Pages (Priority: High)

#### Page 1: Sign-In Options
1. **Create controller** `libs/auth/src/pages/sign-in-options.ts`
   - GET handler: Render sign-in options
   - POST handler: Validate selection, redirect to Azure B2C
   - Content objects (en/cy)

2. **Create template** `libs/auth/src/pages/sign-in-options.njk`
   - Radio buttons for three providers
   - Continue button
   - Error summary

3. **Redirect logic**
   - Build Azure B2C authorization URL with selected policy
   - Include language parameter (ui_locales=en or cy)
   - Include state parameter for CSRF protection

#### Page 2: B2C Callback Handler
1. **Create route** `/auth/callback`
   - Handle OAuth callback from Azure B2C
   - Exchange authorization code for tokens
   - Extract user profile from ID token
   - Create session
   - Redirect to dashboard

2. **Create error handler**
   - Handle authentication errors from B2C
   - Redirect to sign-in page with error message

#### Page 3: Session Timeout Warning
1. **Create controller** `libs/auth/src/pages/session-timeout-warning.ts`
   - GET handler: Render warning modal
   - POST handler: Reset session activity

2. **Create template** `libs/auth/src/pages/session-timeout-warning.njk`
   - Warning message
   - Continue button

3. **Create client-side script** `libs/auth/src/assets/js/session-timeout.ts`
   - Track inactivity
   - Show warning modal at threshold
   - Auto-redirect to expired page if no action

#### Page 4: Session Expired
1. **Create controller** `libs/auth/src/pages/session-expired.ts`
   - GET handler: Render expired message
   - Content objects (en/cy)

2. **Create template** `libs/auth/src/pages/session-expired.njk`
   - Expired message
   - "Sign in again" button

### Phase 5: Authentication Middleware (Priority: High)

1. **Create auth middleware** `libs/auth/src/auth-middleware.ts`
   - `requireAuth()` - Verify user is authenticated
   - `requireRole(role: string)` - Verify user has required role
   - Redirect to sign-in if not authenticated

2. **Apply middleware** to protected routes
   - Dashboard
   - Subscription management
   - System admin pages

### Phase 6: Sign Out (Priority: High)

1. **Create sign-out route** `/sign-out`
   - Destroy session
   - Clear cookies
   - Redirect to Azure B2C logout endpoint (optional)
   - Redirect to home page with confirmation

2. **Add sign-out link** to authenticated pages
   - Update header template
   - Display "Sign out" link when authenticated

### Phase 7: Translations (Priority: High)

1. **Create English translations** `libs/auth/src/locales/en.ts`
   - Page titles
   - Form labels
   - Button text
   - Error messages
   - Session timeout messages

2. **Create Welsh translations** `libs/auth/src/locales/cy.ts`
   - All content from English file
   - Use translations from ticket description

### Phase 8: Styles (Priority: Medium)

1. **Create styles** `libs/auth/src/assets/css/auth.scss`
   - Sign-in page layout
   - Timeout warning modal
   - Error message styling

### Phase 9: Integration & Registration (Priority: Medium)

1. **Register module** in `apps/web/src/app.ts`
2. **Register assets** in `apps/web/vite.config.ts`
3. **Update root tsconfig.json** with module path

### Phase 10: Testing (Priority: High)

1. **Unit tests**
   - B2C service methods
   - Session service
   - Middleware logic
   - Callback handler

2. **Integration tests**
   - Full authentication flow (mocked B2C)
   - Session creation and validation
   - Session timeout logic
   - Sign-out flow

3. **E2E tests**
   - Sign in with each provider (HMCTS, Common Platform, CaTH)
   - Invalid credentials handling
   - Password reset flow (via B2C)
   - Session timeout warning and auto-logout
   - Manual sign out
   - Welsh language throughout flow
   - Accessibility checks with Axe

## Technical Considerations

### Azure B2C Integration

- Use passport-azure-ad with BearerStrategy for API authentication
- Use passport-azure-ad with OIDCStrategy for web authentication
- Store tokens securely in session (server-side only)
- Validate ID tokens on callback
- Handle B2C errors gracefully

### Session Management

- Use Redis for session storage (scalable, distributed)
- Set appropriate session timeout values
- Track last activity timestamp
- Client-side timer synced with server-side timeout
- Handle clock drift between client and server

### Security

- CSRF protection on all forms (use csurf middleware)
- Secure session cookies (httpOnly, secure, sameSite)
- Validate state parameter on B2C callback
- Never expose client secret in client-side code
- Log authentication events for audit

### Performance

- Cache B2C metadata endpoints
- Use connection pooling for Redis
- Minimize session data size
- Use short session cookie names

### Language Support

- Pass language parameter to B2C (ui_locales)
- Store language preference in session
- Maintain language throughout auth flow and after sign-in

## Testing Strategy

### Unit Tests
- B2C service URL generation
- Session service CRUD operations
- Middleware authentication checks
- Timeout calculation logic

### Integration Tests
- Mocked B2C authentication flow
- Session creation and validation
- Protected route access control
- Session timeout behavior

### E2E Tests
- Complete sign-in journey for each provider
- Password reset journey (if implemented in B2C)
- Session timeout warning and auto-logout journey
- Manual sign-out journey
- Welsh language journey
- Accessibility with Axe

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| B2C configuration issues | High | Test thoroughly in Non-Prod, document configuration steps |
| Session storage failure | High | Use Redis with persistence, implement fallback to in-memory sessions for development |
| Timeout issues (clock drift) | Medium | Use server-side session validation, sync client-side timer with server |
| Language not persisting in B2C | Medium | Test ui_locales parameter, document B2C language configuration |
| Authentication callback errors | High | Comprehensive error handling, user-friendly error messages |

## Success Criteria

1. ✅ Users can sign in via HMCTS, Common Platform, or CaTH accounts
2. ✅ Azure B2C integration working in Non-Prod
3. ✅ Session management with Redis working
4. ✅ Session timeout warning displays at configured threshold
5. ✅ Auto sign-out occurs after final timeout
6. ✅ Manual sign-out works correctly
7. ✅ Language selection persists through B2C flow
8. ✅ Protected routes require authentication
9. ✅ Welsh translations provided for all content
10. ✅ Accessibility standards met (WCAG 2.2 AA)
11. ✅ All tests passing

## Estimated Complexity: High

This ticket involves Azure B2C integration, OAuth/OIDC authentication flows, session management with Redis, client-side timeout tracking, and multiple authentication providers. The complexity is high due to the external dependencies, security requirements, and the need for robust error handling throughout the authentication flow.
