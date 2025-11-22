# VIBE-196: Verified User Unsubscribe - Technical Implementation Plan

## Overview

This plan details the implementation of an unsubscribe feature that allows verified users to opt out of email notifications about court and tribunal hearings. The implementation follows HMCTS monorepo standards with a focus on simplicity, accessibility, and security.

## Architecture Decisions

### 1. Module Structure

Create a new feature module: `libs/email-subscriptions`

**Rationale**:
- Follows established monorepo patterns
- Encapsulates all unsubscribe functionality in a single module
- Allows for future expansion (e.g., subscription preferences, re-subscribe)
- Clear separation of concerns

### 2. Database Schema Approach

Add email notification preferences to a new User model in the postgres app.

**Decision**: Since there's no existing User model in the schema (only Artefact), we need to create a User model with minimal fields focused on notification preferences.

```prisma
model User {
  id                         String    @id @default(cuid())
  email                      String    @unique
  emailNotifications         Boolean   @default(true) @map("email_notifications")
  emailNotificationsUpdatedAt DateTime? @map("email_notifications_updated_at")
  createdAt                  DateTime  @default(now()) @map("created_at")
  updatedAt                  DateTime  @updatedAt @map("updated_at")

  @@map("user")
  @@index([email])
}
```

**Rationale**:
- YAGNI: Only add fields needed for this feature
- Snake_case database fields with camelCase TypeScript mapping (HMCTS standard)
- Indexed email field for efficient lookups
- Timestamp tracking for audit compliance
- Default to true (subscribed) for new users

### 3. Authentication Integration

**Approach**: Use existing `@hmcts/auth` middleware patterns

The system already has authentication infrastructure through `UserProfile` in session. We'll:
1. Use `requireAuth()` middleware from `@hmcts/auth` to protect routes
2. Access user email from `req.user.email` (from UserProfile)
3. Query/update User record based on authenticated user's email

**Session Access Pattern**:
```typescript
// User is already authenticated via Passport
// UserProfile contains: { id, email, displayName, role }
const userEmail = req.user.email;
```

### 4. Page Flow

**Two-page flow** (minimal complexity):
1. `/unsubscribe` - Confirmation page with unsubscribe button
2. `/unsubscribe/confirmation` - Success confirmation

**Rationale**:
- Simple, clear user journey
- Follows GOV.UK "one thing per page" principle
- No unnecessary steps

### 5. Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User clicks "Email subscriptions" in nav or dashboard       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ requireAuth() middleware checks authentication               │
│ - If not authenticated → redirect to login                  │
│ - If authenticated → continue                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ GET /unsubscribe                                            │
│ - Fetch user by email from req.user.email                   │
│ - Display confirmation page with user's email               │
│ - Show consequences of unsubscribing                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ POST /unsubscribe                                           │
│ - Validate CSRF token                                       │
│ - Call unsubscribeUser(userEmail) service                   │
│ - Update emailNotifications = false                         │
│ - Redirect to /unsubscribe/confirmation                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ GET /unsubscribe/confirmation                               │
│ - Display success message                                   │
│ - Provide link back to account home                         │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Breakdown

### Phase 1: Database Setup

**Files**:
- `apps/postgres/prisma/schema.prisma` (add User model)
- Migration files (auto-generated)

**Tasks**:
1. Add User model to Prisma schema
2. Run `yarn db:migrate:dev` to generate migration
3. Apply migration to development database
4. Verify in Prisma Studio

**Acceptance**: User table exists with correct fields and indexes

### Phase 2: Module Scaffold

**Files**:
- `libs/email-subscriptions/package.json`
- `libs/email-subscriptions/tsconfig.json`
- `libs/email-subscriptions/src/config.ts`
- `libs/email-subscriptions/src/index.ts`

**Tasks**:
1. Create module directory structure
2. Configure package.json with build scripts
3. Set up TypeScript configuration
4. Register module in root tsconfig.json paths

**Acceptance**: Module compiles successfully with `yarn build`

### Phase 3: Business Logic Layer

**Files**:
- `libs/email-subscriptions/src/email-subscriptions/queries.ts`
- `libs/email-subscriptions/src/email-subscriptions/service.ts`
- `libs/email-subscriptions/src/email-subscriptions/queries.test.ts`
- `libs/email-subscriptions/src/email-subscriptions/service.test.ts`

**Implementation**:

```typescript
// queries.ts
import { prisma } from "@hmcts/postgres";

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      emailNotifications: true,
      emailNotificationsUpdatedAt: true
    }
  });
}

export async function findOrCreateUser(email: string) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      emailNotifications: true
    },
    select: {
      id: true,
      email: true,
      emailNotifications: true
    }
  });
}

export async function updateEmailNotificationPreference(
  userId: string,
  enabled: boolean
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      emailNotifications: enabled,
      emailNotificationsUpdatedAt: new Date()
    }
  });
}

// service.ts
import { findOrCreateUser, updateEmailNotificationPreference } from "./queries.js";

export async function unsubscribeUser(email: string) {
  const user = await findOrCreateUser(email);

  if (!user.emailNotifications) {
    return { alreadyUnsubscribed: true };
  }

  await updateEmailNotificationPreference(user.id, false);

  return { success: true };
}
```

**Acceptance**: All unit tests pass with >80% coverage

### Phase 4: Page Controllers and Templates

**Files**:
- `libs/email-subscriptions/src/pages/unsubscribe/index.ts`
- `libs/email-subscriptions/src/pages/unsubscribe/index.njk`
- `libs/email-subscriptions/src/pages/unsubscribe/confirmation/index.ts`
- `libs/email-subscriptions/src/pages/unsubscribe/confirmation/index.njk`

**Implementation**:

```typescript
// pages/unsubscribe/index.ts
import type { Request, Response } from "express";
import { unsubscribeUser } from "../../email-subscriptions/service.js";
import { findOrCreateUser } from "../../email-subscriptions/queries.js";

const en = {
  title: "Unsubscribe from email notifications",
  heading: "Unsubscribe from email notifications",
  description: "You are currently subscribed to email notifications about court and tribunal hearings.",
  yourEmail: "Your email address",
  consequences: "If you unsubscribe, you will no longer receive:",
  consequencesList: [
    "Email notifications about upcoming hearings",
    "Updates about changes to hearing times or locations",
    "Reminders about hearings you are interested in"
  ],
  resubscribe: "You can subscribe again at any time by visiting the Email subscriptions page.",
  button: "Unsubscribe from email notifications",
  cancel: "Cancel"
};

const cy = {
  title: "Dad-danysgrifio o hysbysiadau e-bost",
  heading: "Dad-danysgrifio o hysbysiadau e-bost",
  description: "Rydych wedi tanysgrifio i hysbysiadau e-bost am wrandawiadau llys a thribiwnlys.",
  yourEmail: "Eich cyfeiriad e-bost",
  consequences: "Os byddwch yn dad-danysgrifio, ni fyddwch yn derbyn:",
  consequencesList: [
    "Hysbysiadau e-bost am wrandawiadau sydd i ddod",
    "Diweddariadau am newidiadau i amseroedd neu leoliadau gwrandawiadau",
    "Atgofion am wrandawiadau sydd o ddiddordeb i chi"
  ],
  resubscribe: "Gallwch danysgrifio eto unrhyw bryd trwy ymweld â'r tudalen Tanysgrifiadau e-bost.",
  button: "Dad-danysgrifio o hysbysiadau e-bost",
  cancel: "Canslo"
};

export const GET = async (req: Request, res: Response) => {
  const user = await findOrCreateUser(req.user.email);

  res.render("unsubscribe/index", {
    en,
    cy,
    userEmail: user.email
  });
};

export const POST = async (req: Request, res: Response) => {
  try {
    await unsubscribeUser(req.user.email);
    res.redirect("/unsubscribe/confirmation");
  } catch (error) {
    res.render("errors/500", {
      en: { title: "Something went wrong" },
      cy: { title: "Aeth rhywbeth o'i le" }
    });
  }
};
```

**Template Pattern**:
```html
{% extends "layouts/default.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">
    <h1 class="govuk-heading-l">{{ heading }}</h1>

    <p class="govuk-body">{{ description }}</p>

    <p class="govuk-body">
      <strong>{{ yourEmail }}:</strong> {{ userEmail }}
    </p>

    <p class="govuk-body">{{ consequences }}</p>

    <ul class="govuk-list govuk-list--bullet">
      {% for item in consequencesList %}
        <li>{{ item }}</li>
      {% endfor %}
    </ul>

    <p class="govuk-body">{{ resubscribe }}</p>

    <form method="post" novalidate>
      {{ govukButton({ text: button, preventDoubleClick: true }) }}
      <p class="govuk-body">
        <a href="/account-home" class="govuk-link">{{ cancel }}</a>
      </p>
    </form>
  </div>
</div>
{% endblock %}
```

**Acceptance**: Pages render correctly in both English and Welsh

### Phase 5: Application Integration

**Files**:
- `apps/web/src/app.ts` (register module)
- `libs/verified-pages/src/pages/account-home/index.njk` (update link)
- `libs/auth/src/middleware/navigation-helper.ts` (update navigation)

**Tasks**:
1. Import email-subscriptions config in apps/web/src/app.ts
2. Register pageRoutes with createSimpleRouter
3. Add requireAuth() middleware to unsubscribe routes
4. Update Email subscriptions links to point to /unsubscribe
5. Test module loading

**Integration Code**:
```typescript
// apps/web/src/app.ts
import { pageRoutes as emailSubscriptionsPages } from "@hmcts/email-subscriptions/config";

// Register routes with authentication
app.use("/unsubscribe", requireAuth());
app.use(await createSimpleRouter(emailSubscriptionsPages));
```

**Acceptance**: Module routes are accessible and properly authenticated

### Phase 6: Testing

**E2E Tests** (`e2e-tests/tests/unsubscribe.spec.ts`):

```typescript
import { test, expect } from '@playwright/test';

test.describe('Unsubscribe Flow', () => {
  test('authenticated user can unsubscribe', async ({ page }) => {
    // Login as verified user
    await page.goto('/login');
    await loginAsVerifiedUser(page);

    // Navigate to unsubscribe
    await page.goto('/unsubscribe');
    await expect(page.locator('h1')).toContainText('Unsubscribe from email notifications');

    // Submit unsubscribe
    await page.click('button:has-text("Unsubscribe from email notifications")');

    // Verify confirmation
    await expect(page).toHaveURL('/unsubscribe/confirmation');
    await expect(page.locator('h1')).toContainText('You have been unsubscribed');

    // Verify database state
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });
    expect(user.emailNotifications).toBe(false);
  });

  test('unauthenticated user redirected to login', async ({ page }) => {
    await page.goto('/unsubscribe');
    await expect(page).toHaveURL(/\/login/);
  });

  test('Welsh translation works', async ({ page }) => {
    await loginAsVerifiedUser(page);
    await page.goto('/unsubscribe?lng=cy');
    await expect(page.locator('h1')).toContainText('Dad-danysgrifio o hysbysiadau e-bost');
  });
});
```

**Acceptance**: All E2E tests pass, accessibility tests pass with zero violations

## Security Considerations

### 1. Authentication
- All routes protected with `requireAuth()` middleware
- Session validation on every request
- User can only unsubscribe their own email

### 2. CSRF Protection
- Forms include CSRF token (handled by Express session middleware)
- POST requests validated for CSRF token

### 3. Input Validation
- Email comes from authenticated session (trusted source)
- No user input to validate in this flow
- All database operations use Prisma (SQL injection protected)

### 4. Data Protection
- Email addresses not logged
- Minimal PII stored
- User email already in system (from authentication)

## Performance Considerations

- **Database**: Simple index on email field for fast lookups
- **Queries**: Minimal - one SELECT, one UPDATE per unsubscribe
- **Caching**: Not needed for this infrequent operation
- **Page Weight**: Minimal - text only, no heavy assets

## Rollback Plan

If issues arise:
1. Remove route registration from apps/web/src/app.ts
2. Revert navigation link changes
3. Migration rollback: `yarn db:migrate:dev --rollback`
4. Remove @hmcts/email-subscriptions from dependencies

## Success Metrics

- User can unsubscribe in < 3 clicks
- Page load time < 2 seconds
- Zero accessibility violations
- 100% test coverage on business logic
- Database query time < 100ms

## Future Enhancements (Out of Scope)

- Granular subscription preferences (specific courts)
- Temporary pause notifications
- Unsubscribe via email link (no login required)
- Re-subscribe functionality
- Subscription history/audit log

## Dependencies

- `@hmcts/auth` - Authentication middleware
- `@hmcts/postgres` - Database access
- `express` - HTTP framework
- `govuk-frontend` - UI components
- `nunjucks` - Template rendering

## Estimated Effort

- **Database setup**: 1 hour
- **Module scaffold**: 1 hour
- **Business logic**: 2 hours
- **Pages & templates**: 3 hours
- **Integration**: 1 hour
- **Testing**: 3 hours
- **Code review & docs**: 1 hour

**Total**: 12 hours (1.5 development days)

## Definition of Done

- [ ] Database migration applied successfully
- [ ] Module builds without errors
- [ ] All unit tests passing (>80% coverage)
- [ ] All E2E tests passing
- [ ] Accessibility tests pass (zero Axe violations)
- [ ] Both English and Welsh translations complete
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Deployed to staging and smoke tested
