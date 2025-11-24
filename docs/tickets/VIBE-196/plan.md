# VIBE-196: Verified User Unsubscribe - Technical Implementation Plan

## Overview

This plan details the implementation of an email subscription management feature that allows verified users to view their subscriptions and unsubscribe from email notifications about court and tribunal hearings. The implementation follows HMCTS monorepo standards with a focus on simplicity, accessibility, and GOV.UK Design System patterns.

## Architecture Decisions

### 1. Module Structure

Create a new feature module: `libs/email-subscriptions`

**Rationale**:
- Follows established monorepo patterns
- Encapsulates all subscription functionality in a single module
- Allows for future expansion (re-subscribe, granular preferences)
- Clear separation of concerns
- Reusable across different parts of the application

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
- Timestamp tracking for audit compliance (GDPR requirement)
- Default to true (subscribed) for new users
- Singular table name (user not users) following HMCTS conventions

### 3. Authentication Integration

**Approach**: Use existing `@hmcts/auth` middleware patterns

The system already has authentication infrastructure through `UserProfile` in session. We'll:
1. Use `requireAuth()` middleware from `@hmcts/auth` to protect routes
2. Access user email from `req.user.email` (from UserProfile)
3. Query/update User record based on authenticated user's email
4. Use `blockUserAccess()` to ensure only verified users (not SSO) can access

**Session Access Pattern**:
```typescript
// User is already authenticated via Passport
// UserProfile contains: { id, email, displayName, role }
const userEmail = req.user.email;
```

### 4. Page Flow

**Three-page flow** (matching JIRA specification):

1. `/email-subscriptions` - List of subscriptions with unsubscribe links
2. `/email-subscriptions/unsubscribe-confirm` - Yes/No radio confirmation
3. `/email-subscriptions/unsubscribe-success` - Green success banner

**Rationale**:
- Follows GOV.UK "one thing per page" principle
- Clear user journey with explicit confirmation
- Prevents accidental unsubscribes (two-step process)
- Success page provides clear feedback and next actions
- Matches existing HMCTS patterns (e.g., remove-list flow)

### 5. Session Management Strategy

Use Express session to track state between pages:

```typescript
interface EmailSubscriptionSession {
  unsubscribeSuccess?: boolean;  // Flag for success page guard
}
```

**Flow**:
1. List page → Click "Unsubscribe" → Navigate to confirmation
2. Confirmation page → Select "Yes" → Update DB → Set session flag → Redirect to success
3. Success page → Check session flag → Display success → Clear flag
4. If "No" selected → Redirect back to list page (no DB changes)

**Rationale**:
- Simple session state (just a boolean flag)
- Prevents direct access to success page without completing flow
- Follows pattern used in remove-list-success
- Session automatically expires if user abandons flow

### 6. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ User clicks "Email subscriptions" in nav or dashboard       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ requireAuth() + blockUserAccess() middleware                │
│ - If not authenticated → redirect to login                  │
│ - If SSO user → block access (verified users only)          │
│ - If verified user → continue                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ GET /email-subscriptions                                    │
│ - Query: findOrCreateUser(req.user.email)                   │
│ - Display: User's email and subscription status             │
│ - Show: "Unsubscribe" link if subscribed                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ GET /email-subscriptions/unsubscribe-confirm                │
│ - Display: Yes/No radios with consequences                  │
│ - Validate: Session is still valid                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ POST /email-subscriptions/unsubscribe-confirm               │
│ - Validate: Radio selection required                        │
│ - If "No" → redirect to /email-subscriptions                │
│ - If "Yes" → call unsubscribeUser(email)                    │
│            → set session.unsubscribeSuccess = true          │
│            → redirect to success page                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ GET /email-subscriptions/unsubscribe-success                │
│ - Guard: Check session.unsubscribeSuccess flag              │
│ - If false → redirect to /email-subscriptions               │
│ - Display: Green notification banner                        │
│ - Clear: session.unsubscribeSuccess flag                    │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Breakdown

### Phase 1: Database Setup

**Files**:
- `apps/postgres/prisma/schema.prisma` (add User model)
- Migration files (auto-generated via Prisma)

**Tasks**:
1. Add User model to Prisma schema with fields specified above
2. Run `yarn db:migrate:dev` to generate migration
3. Apply migration to development database
4. Run `yarn db:generate` to update Prisma client
5. Verify in Prisma Studio (`yarn db:studio`)

**Schema Addition**:
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

**Acceptance**: User table exists with correct fields, indexes, and constraints

### Phase 2: Module Scaffold

**Files**:
- `libs/email-subscriptions/package.json`
- `libs/email-subscriptions/tsconfig.json`
- `libs/email-subscriptions/src/config.ts`
- `libs/email-subscriptions/src/index.ts`

**Tasks**:
1. Create module directory structure:
   ```bash
   mkdir -p libs/email-subscriptions/src/pages
   mkdir -p libs/email-subscriptions/src/email-subscriptions
   ```
2. Configure package.json with build scripts (include build:nunjucks)
3. Set up TypeScript configuration (extends root tsconfig)
4. Register module in root tsconfig.json paths
5. Create config.ts with pageRoutes export
6. Create index.ts for business logic exports

**package.json**:
```json
{
  "name": "@hmcts/email-subscriptions",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "production": "./dist/index.js",
      "default": "./src/index.ts"
    },
    "./config": {
      "production": "./dist/config.js",
      "default": "./src/config.ts"
    }
  },
  "scripts": {
    "build": "tsc && yarn build:nunjucks",
    "build:nunjucks": "mkdir -p dist/pages && cd src/pages && find . -name '*.njk' -exec sh -c 'mkdir -p ../../dist/pages/$(dirname {}) && cp {} ../../dist/pages/{}' \\;",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "format": "biome format --write .",
    "lint": "biome check .",
    "lint:fix": "biome check --write ."
  },
  "peerDependencies": {
    "express": "^5.1.0"
  }
}
```

**Root tsconfig.json addition**:
```json
{
  "compilerOptions": {
    "paths": {
      "@hmcts/email-subscriptions": ["libs/email-subscriptions/src"]
    }
  }
}
```

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

export async function getUserSubscriptionStatus(email: string) {
  const user = await findOrCreateUser(email);

  return {
    email: user.email,
    isSubscribed: user.emailNotifications
  };
}
```

**Test Coverage**:
- Test findOrCreateUser creates user if not exists
- Test findOrCreateUser returns existing user
- Test updateEmailNotificationPreference updates correctly
- Test unsubscribeUser handles already unsubscribed state
- Test unsubscribeUser sets emailNotifications to false
- Mock Prisma client in tests using Vitest

**Acceptance**: All unit tests pass with >80% coverage

### Phase 4: Page Controllers and Templates

#### 4.1 Email Subscriptions List Page

**Files**:
- `libs/email-subscriptions/src/pages/email-subscriptions/index.ts`
- `libs/email-subscriptions/src/pages/email-subscriptions/index.njk`
- `libs/email-subscriptions/src/pages/email-subscriptions/en.ts`
- `libs/email-subscriptions/src/pages/email-subscriptions/cy.ts`

**Controller Implementation**:
```typescript
// index.ts
import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { getUserSubscriptionStatus } from "../../email-subscriptions/service.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const lang = locale === "cy" ? cy : en;

  const status = await getUserSubscriptionStatus(req.user.email);

  // Build navigation items for verified user
  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  res.render("email-subscriptions/index", {
    en,
    cy,
    userEmail: status.email,
    isSubscribed: status.isSubscribed
  });
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
```

**Content Files**:
```typescript
// en.ts
export const en = {
  pageTitle: "Your email subscriptions",
  heading: "Your email subscriptions",
  subscribedTo: "You are subscribed to email notifications at:",
  subscriptionCard: {
    title: "Court and tribunal hearing notifications",
    description: "Get email notifications about upcoming court and tribunal hearings, including updates about changes to hearing times or locations.",
    unsubscribeButton: "Unsubscribe"
  },
  notSubscribed: {
    message: "You are not currently subscribed to email notifications.",
    description: "Subscribe to receive notifications about court and tribunal hearings."
  }
};

// cy.ts
export const cy = {
  pageTitle: "Eich tanysgrifiadau e-bost",
  heading: "Eich tanysgrifiadau e-bost",
  subscribedTo: "Rydych wedi tanysgrifio i hysbysiadau e-bost yn:",
  subscriptionCard: {
    title: "Hysbysiadau gwrandawiadau llys a thribiwnlys",
    description: "Cael hysbysiadau e-bost am wrandawiadau llys a thribiwnlys sydd i ddod, gan gynnwys diweddariadau am newidiadau i amseroedd neu leoliadau gwrandawiadau.",
    unsubscribeButton: "Dad-danysgrifio"
  },
  notSubscribed: {
    message: "Nid ydych wedi tanysgrifio i hysbysiadau e-bost ar hyn o bryd.",
    description: "Tanysgrifio i dderbyn hysbysiadau am wrandawiadau llys a thribiwnlys."
  }
};
```

**Template**:
```html
{% extends "layouts/base-template.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% block page_content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">
    <h1 class="govuk-heading-l">{{ heading }}</h1>

    {% if isSubscribed %}
      <p class="govuk-body">{{ subscribedTo }}</p>
      <p class="govuk-body govuk-!-font-weight-bold">{{ userEmail }}</p>

      <div class="govuk-inset-text">
        <h2 class="govuk-heading-m">{{ subscriptionCard.title }}</h2>
        <p class="govuk-body">{{ subscriptionCard.description }}</p>

        <a href="/email-subscriptions/unsubscribe-confirm"
           class="govuk-button govuk-button--secondary"
           data-module="govuk-button">
          {{ subscriptionCard.unsubscribeButton }}
        </a>
      </div>
    {% else %}
      <p class="govuk-body">{{ notSubscribed.message }}</p>
      <p class="govuk-body">{{ notSubscribed.description }}</p>
    {% endif %}

  </div>
</div>
{% endblock %}
```

#### 4.2 Unsubscribe Confirmation Page

**Files**:
- `libs/email-subscriptions/src/pages/email-subscriptions/unsubscribe-confirm/index.ts`
- `libs/email-subscriptions/src/pages/email-subscriptions/unsubscribe-confirm/index.njk`
- `libs/email-subscriptions/src/pages/email-subscriptions/unsubscribe-confirm/en.ts`
- `libs/email-subscriptions/src/pages/email-subscriptions/unsubscribe-confirm/cy.ts`

**Controller Implementation**:
```typescript
// index.ts
import { blockUserAccess, requireAuth } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { unsubscribeUser } from "../../../email-subscriptions/service.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

function renderConfirmationPage(
  res: Response,
  lang: typeof en | typeof cy,
  errors?: Array<{ text: string; href: string }>
) {
  return res.render("email-subscriptions/unsubscribe-confirm/index", {
    pageTitle: lang.pageTitle,
    heading: lang.heading,
    description: lang.description,
    consequencesList: lang.consequencesList,
    resubscribeInfo: lang.resubscribeInfo,
    radioYes: lang.radioYes,
    radioNo: lang.radioNo,
    continueButton: lang.continueButton,
    ...(errors && {
      errors,
      errorSummaryTitle: lang.errorSummaryTitle
    }),
    hideLanguageToggle: true
  });
}

const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  return renderConfirmationPage(res, lang);
};

const postHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  const confirmation = req.body.confirmation;

  if (!confirmation) {
    return renderConfirmationPage(res, lang, [
      {
        text: lang.errorNoSelection,
        href: "#confirmation"
      }
    ]);
  }

  if (confirmation === "no") {
    const lng = req.query.lng === "cy" ? "?lng=cy" : "";
    return res.redirect(`/email-subscriptions${lng}`);
  }

  try {
    await unsubscribeUser(req.user.email);

    req.session.unsubscribeSuccess = true;

    await new Promise<void>((resolve, reject) => {
      req.session.save((err: Error | null | undefined) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const lng = req.query.lng === "cy" ? "?lng=cy" : "";
    res.redirect(`/email-subscriptions/unsubscribe-success${lng}`);
  } catch (error) {
    console.error("Error unsubscribing user:", error);

    return renderConfirmationPage(res, lang, [
      {
        text: lang.errorGeneric,
        href: "#"
      }
    ]);
  }
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
```

**Content Files**:
```typescript
// en.ts
export const en = {
  pageTitle: "Are you sure you want to unsubscribe?",
  heading: "Are you sure you want to unsubscribe?",
  description: "If you unsubscribe from court and tribunal hearing notifications, you will no longer receive:",
  consequencesList: [
    "Email notifications about upcoming hearings",
    "Updates about changes to hearing times or locations",
    "Reminders about hearings you are interested in"
  ],
  resubscribeInfo: "You can subscribe again at any time by visiting the email subscriptions page.",
  radioYes: "Yes",
  radioNo: "No",
  continueButton: "Continue",
  errorSummaryTitle: "There is a problem",
  errorNoSelection: "Select yes if you want to unsubscribe",
  errorGeneric: "An error occurred. Please try again later."
};

// cy.ts
export const cy = {
  pageTitle: "Ydych chi'n siŵr eich bod am ddad-danysgrifio?",
  heading: "Ydych chi'n siŵr eich bod am ddad-danysgrifio?",
  description: "Os byddwch yn dad-danysgrifio o hysbysiadau gwrandawiadau llys a thribiwnlys, ni fyddwch yn derbyn:",
  consequencesList: [
    "Hysbysiadau e-bost am wrandawiadau sydd i ddod",
    "Diweddariadau am newidiadau i amseroedd neu leoliadau gwrandawiadau",
    "Atgofion am wrandawiadau sydd o ddiddordeb i chi"
  ],
  resubscribeInfo: "Gallwch danysgrifio eto unrhyw bryd trwy ymweld â'r tudalen tanysgrifiadau e-bost.",
  radioYes: "Iawn",
  radioNo: "Na",
  continueButton: "Parhau",
  errorSummaryTitle: "Mae problem wedi codi",
  errorNoSelection: "Dewiswch iawn os ydych am ddad-danysgrifio",
  errorGeneric: "Digwyddodd gwall. Rhowch gynnig arall arni yn nes ymlaen."
};
```

**Template**:
```html
{% extends "layouts/base-template.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}
{% from "govuk/components/radios/macro.njk" import govukRadios %}

{% block page_content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">

    {% if errors %}
      {{ govukErrorSummary({
        titleText: errorSummaryTitle,
        errorList: errors
      }) }}
    {% endif %}

    <h1 class="govuk-heading-l">{{ heading }}</h1>

    <p class="govuk-body">{{ description }}</p>

    <ul class="govuk-list govuk-list--bullet">
      {% for item in consequencesList %}
        <li>{{ item }}</li>
      {% endfor %}
    </ul>

    <p class="govuk-body">{{ resubscribeInfo }}</p>

    <form method="post" novalidate>
      {{ govukRadios({
        name: "confirmation",
        fieldset: {
          legend: {
            text: heading,
            isPageHeading: false,
            classes: "govuk-visually-hidden"
          }
        },
        classes: "govuk-radios--inline",
        items: [
          {
            value: "yes",
            text: radioYes
          },
          {
            value: "no",
            text: radioNo
          }
        ],
        errorMessage: errors[0] if errors else undefined
      }) }}

      {{ govukButton({
        text: continueButton
      }) }}
    </form>

  </div>
</div>
{% endblock %}
```

#### 4.3 Unsubscribe Success Page

**Files**:
- `libs/email-subscriptions/src/pages/email-subscriptions/unsubscribe-success/index.ts`
- `libs/email-subscriptions/src/pages/email-subscriptions/unsubscribe-success/index.njk`
- `libs/email-subscriptions/src/pages/email-subscriptions/unsubscribe-success/en.ts`
- `libs/email-subscriptions/src/pages/email-subscriptions/unsubscribe-success/cy.ts`

**Controller Implementation**:
```typescript
// index.ts
import { blockUserAccess, requireAuth } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;

  if (!req.session.unsubscribeSuccess) {
    const lng = req.query.lng === "cy" ? "?lng=cy" : "";
    return res.redirect(`/email-subscriptions${lng}`);
  }

  delete req.session.unsubscribeSuccess;

  await new Promise<void>((resolve, reject) => {
    req.session.save((err: Error | null | undefined) => {
      if (err) reject(err);
      else resolve();
    });
  });

  res.render("email-subscriptions/unsubscribe-success/index", {
    pageTitle: lang.pageTitle,
    bannerTitle: lang.bannerTitle,
    confirmationMessage: lang.confirmationMessage,
    userEmail: req.user.email,
    whatNextHeading: lang.whatNextHeading,
    whatNextDescription: lang.whatNextDescription,
    viewSubscriptionsLink: lang.viewSubscriptionsLink,
    returnToAccountLink: lang.returnToAccountLink,
    hideLanguageToggle: true,
    lng: req.query.lng
  });
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
```

**Content Files**:
```typescript
// en.ts
export const en = {
  pageTitle: "You have unsubscribed from email notifications",
  bannerTitle: "Success",
  confirmationMessage: "You have unsubscribed from email notifications",
  userEmail: "You will no longer receive email notifications about court and tribunal hearings at",
  whatNextHeading: "What happens next",
  whatNextDescription: "You can subscribe again at any time by visiting your email subscriptions page.",
  viewSubscriptionsLink: "View your email subscriptions",
  returnToAccountLink: "Return to your account"
};

// cy.ts
export const cy = {
  pageTitle: "Rydych wedi dad-danysgrifio o hysbysiadau e-bost",
  bannerTitle: "Llwyddiant",
  confirmationMessage: "Rydych wedi dad-danysgrifio o hysbysiadau e-bost",
  userEmail: "Ni fyddwch yn derbyn hysbysiadau e-bost am wrandawiadau llys a thribiwnlys yn",
  whatNextHeading: "Beth sy'n digwydd nesaf",
  whatNextDescription: "Gallwch danysgrifio eto unrhyw bryd trwy ymweld â'ch tudalen tanysgrifiadau e-bost.",
  viewSubscriptionsLink: "Gweld eich tanysgrifiadau e-bost",
  returnToAccountLink: "Dychwelyd i'ch cyfrif"
};
```

**Template**:
```html
{% extends "layouts/base-template.njk" %}
{% from "govuk/components/notification-banner/macro.njk" import govukNotificationBanner %}

{% block page_content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">

    {{ govukNotificationBanner({
      type: "success",
      titleText: bannerTitle,
      html: '<p class="govuk-notification-banner__heading">' + confirmationMessage + '</p>'
    }) }}

    <p class="govuk-body">{{ userEmail }} <strong>{{ userEmail }}</strong></p>

    <h2 class="govuk-heading-m">{{ whatNextHeading }}</h2>

    <p class="govuk-body">{{ whatNextDescription }}</p>

    <p class="govuk-body govuk-!-font-weight-bold">
      <a href="/email-subscriptions{{ '?lng=cy' if lng == 'cy' else '' }}" class="govuk-link">
        {{ viewSubscriptionsLink }}
      </a>
    </p>

    <p class="govuk-body govuk-!-font-weight-bold">
      <a href="/account-home{{ '?lng=cy' if lng == 'cy' else '' }}" class="govuk-link">
        {{ returnToAccountLink }}
      </a>
    </p>

  </div>
</div>
{% endblock %}
```

**Acceptance**: All pages render correctly in both English and Welsh

### Phase 5: Application Integration

**Files to Modify**:
- `apps/web/src/app.ts` (register module)
- `libs/verified-pages/src/pages/account-home/index.njk` (update link)
- `libs/auth/src/middleware/navigation-helper.ts` (update navigation link)

**Tasks**:

1. **Register module in web app**:
```typescript
// apps/web/src/app.ts
import { pageRoutes as emailSubscriptionsPages } from "@hmcts/email-subscriptions/config";

// Add with other verified page routes
app.use(await createSimpleRouter(emailSubscriptionsPages));
```

2. **Update account home dashboard link**:
```html
<!-- libs/verified-pages/src/pages/account-home/index.njk -->
<a href="/email-subscriptions" class="verified-tile">
  <h2 class="govuk-heading-s verified-tile-heading">
    {{ sections.emailSubscriptions.title }}
  </h2>
  <p class="govuk-body verified-tile-description">
    {{ sections.emailSubscriptions.description }}
  </p>
</a>
```

3. **Update navigation helper**:
```typescript
// libs/auth/src/middleware/navigation-helper.ts
export function buildVerifiedUserNavigation(currentPath: string, locale: string = "en"): NavigationItem[] {
  // ... existing code ...
  {
    text: t.emailSubscriptions,
    href: "/email-subscriptions",
    current: currentPath === "/email-subscriptions",
    attributes: {
      "data-test": "email-subscriptions-link"
    }
  }
  // ...
}
```

**Acceptance**: Module routes are accessible, properly authenticated, and navigation links work

### Phase 6: Testing

#### 6.1 Unit Tests

**Files**:
- `libs/email-subscriptions/src/email-subscriptions/queries.test.ts`
- `libs/email-subscriptions/src/email-subscriptions/service.test.ts`
- `libs/email-subscriptions/src/pages/*/index.test.ts`

**Test Coverage**:
- Database queries (with mocked Prisma)
- Service functions (business logic)
- Controller GET handlers
- Controller POST handlers with validation

#### 6.2 E2E Tests

**File**: `e2e-tests/tests/email-subscriptions.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Email Subscriptions Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as verified user
    await page.goto('/login');
    await loginAsVerifiedUser(page);
  });

  test('user can view subscriptions list', async ({ page }) => {
    await page.goto('/email-subscriptions');

    await expect(page.locator('h1')).toContainText('Your email subscriptions');
    await expect(page.locator('text=Court and tribunal hearing notifications')).toBeVisible();
  });

  test('user can unsubscribe with Yes', async ({ page }) => {
    await page.goto('/email-subscriptions');
    await page.click('text=Unsubscribe');

    await expect(page.locator('h1')).toContainText('Are you sure you want to unsubscribe?');

    await page.check('input[value="yes"]');
    await page.click('button:has-text("Continue")');

    await expect(page).toHaveURL('/email-subscriptions/unsubscribe-success');
    await expect(page.locator('text=Success')).toBeVisible();
    await expect(page.locator('text=You have unsubscribed from email notifications')).toBeVisible();
  });

  test('user can cancel with No', async ({ page }) => {
    await page.goto('/email-subscriptions');
    await page.click('text=Unsubscribe');

    await page.check('input[value="no"]');
    await page.click('button:has-text("Continue")');

    await expect(page).toHaveURL('/email-subscriptions');
    await expect(page.locator('text=Unsubscribe')).toBeVisible();
  });

  test('validation error when no radio selected', async ({ page }) => {
    await page.goto('/email-subscriptions/unsubscribe-confirm');
    await page.click('button:has-text("Continue")');

    await expect(page.locator('text=There is a problem')).toBeVisible();
    await expect(page.locator('text=Select yes if you want to unsubscribe')).toBeVisible();
  });

  test('Welsh translation works', async ({ page }) => {
    await page.goto('/email-subscriptions?lng=cy');

    await expect(page.locator('h1')).toContainText('Eich tanysgrifiadau e-bost');
  });

  test('direct access to success page redirects', async ({ page }) => {
    await page.goto('/email-subscriptions/unsubscribe-success');

    await expect(page).toHaveURL('/email-subscriptions');
  });

  test('unauthenticated user redirected to login', async ({ page }) => {
    await page.goto('/logout');
    await page.goto('/email-subscriptions');

    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Accessibility', () => {
  test('subscriptions list page meets WCAG AA', async ({ page }) => {
    await loginAsVerifiedUser(page);
    await page.goto('/email-subscriptions');

    const results = await runAxeCore(page);
    expect(results.violations).toHaveLength(0);
  });

  test('confirmation page meets WCAG AA', async ({ page }) => {
    await loginAsVerifiedUser(page);
    await page.goto('/email-subscriptions/unsubscribe-confirm');

    const results = await runAxeCore(page);
    expect(results.violations).toHaveLength(0);
  });

  test('success page meets WCAG AA', async ({ page }) => {
    await loginAsVerifiedUser(page);

    // Complete unsubscribe flow
    await page.goto('/email-subscriptions');
    await page.click('text=Unsubscribe');
    await page.check('input[value="yes"]');
    await page.click('button:has-text("Continue")');

    const results = await runAxeCore(page);
    expect(results.violations).toHaveLength(0);
  });
});
```

**Acceptance**: All E2E tests pass, accessibility tests pass with zero violations

## Security Considerations

### 1. Authentication & Authorization
- All routes protected with `requireAuth()` middleware
- Additional `blockUserAccess()` to restrict to verified users only (not SSO)
- Session validation on every request
- User can only unsubscribe their own email (from req.user)

### 2. CSRF Protection
- Forms include CSRF token (handled by Express session middleware)
- POST requests validated for CSRF token
- Protects against cross-site request forgery attacks

### 3. Input Validation
- Email comes from authenticated session (trusted source)
- Radio button validation server-side
- No free-text input fields to validate
- All database operations use Prisma (SQL injection protected)

### 4. Data Protection
- Email addresses not logged to console/files
- Minimal PII stored (only email, which is already in auth system)
- Session data automatically expires
- GDPR compliant (audit timestamp, clear consent withdrawal)

### 5. Session Security
- HttpOnly cookies prevent XSS access
- Secure flag in production (HTTPS only)
- SameSite attribute prevents CSRF
- Session timeout after inactivity

## Performance Considerations

- **Database**: Simple index on email field for O(log n) lookups
- **Queries**: Minimal - one SELECT, one UPDATE per unsubscribe
- **Caching**: Not needed for infrequent operations
- **Page Weight**: Text-only pages, minimal assets
- **Response Time**: Target < 2 seconds for all pages

## Rollback Plan

If issues arise post-deployment:

1. Remove route registration from `apps/web/src/app.ts`
2. Revert navigation link changes in verified-pages and auth
3. Migration rollback: `prisma migrate rollback`
4. Remove `@hmcts/email-subscriptions` from dependencies
5. Restart application

Database rollback:
```sql
-- Emergency manual rollback if needed
DROP TABLE user CASCADE;
```

## Deployment Checklist

- [ ] All unit tests passing
- [ ] All E2E tests passing
- [ ] Accessibility tests passing (zero violations)
- [ ] Code reviewed and approved
- [ ] Database migration tested on staging
- [ ] Welsh translations reviewed by native speaker
- [ ] Performance tested (page load < 2s)
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Smoke tests passed on staging

## Success Metrics

- Users complete unsubscribe flow in < 5 clicks
- Page load time < 2 seconds for all pages
- Zero accessibility violations (Axe-core)
- 100% of automated tests passing
- > 80% code coverage on business logic
- Zero production errors in first week post-launch

## Future Enhancements (Out of Scope)

- Granular subscription preferences (specific courts/tribunals)
- Temporary pause notifications (snooze feature)
- Unsubscribe via email link (no login required)
- Re-subscribe button on list page
- Subscription history/audit log for users
- Email frequency preferences (immediate, daily, weekly)
- Multiple notification types (hearing updates, case status, etc.)

## Dependencies

- `@hmcts/auth` - Authentication and authorization middleware
- `@hmcts/postgres` - Database access via Prisma
- `govuk-frontend` - UI components and styles
- `express` v5.1.0 - Web framework
- `express-session` - Session management
- `nunjucks` - Template rendering

## Estimated Effort

- **Database setup**: 1 hour
- **Module scaffold**: 1 hour
- **Business logic**: 2 hours
- **Page 1 (list)**: 2 hours
- **Page 2 (confirmation)**: 2 hours
- **Page 3 (success)**: 1 hour
- **Integration**: 2 hours
- **Unit testing**: 2 hours
- **E2E testing**: 2 hours
- **Code review & documentation**: 1 hour

**Total**: 16 hours (2 development days)

## Definition of Done

- [ ] Database migration applied successfully
- [ ] User model exists with correct schema
- [ ] Module builds without errors
- [ ] All three pages render correctly
- [ ] All unit tests passing (>80% coverage)
- [ ] All E2E tests passing
- [ ] Accessibility tests pass (zero Axe violations)
- [ ] Both English and Welsh translations complete
- [ ] Navigation links updated and working
- [ ] Session management working correctly
- [ ] Error handling tested and working
- [ ] Code reviewed and approved
- [ ] Documentation updated (CLAUDE.md if needed)
- [ ] Deployed to staging and smoke tested
- [ ] GDPR compliance verified (audit trail, consent withdrawal)
