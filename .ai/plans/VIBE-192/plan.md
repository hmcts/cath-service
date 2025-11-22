# VIBE-192 — Technical Implementation Plan

> Ticket: VIBE-192 — Verified User Email Subscriptions
> Updated: 22 November 2025

---

## Overview

Implement email subscription management functionality for verified users. This feature allows verified media users to subscribe to court/tribunal hearing list notifications. The implementation follows HMCTS monorepo patterns with a dedicated subscriptions module containing four pages, database schema, and business logic.

---

## Technical Architecture

### Module Structure

**Location**: `libs/subscriptions/`

**Type**: Feature module with pages, database schema, and business logic

**Dependencies**:
- `@hmcts/auth` - Authentication and authorization
- `@hmcts/location` - Location/venue data
- `@hmcts/postgres` - Database client
- `express` (peer dependency)

---

## Implementation Strategy

### Phase 1: Module Setup and Database Schema
1. Create module structure at `libs/subscriptions/`
2. Configure package.json with proper exports
3. Create and apply Prisma schema migration
4. Register module in applications and root tsconfig.json

### Phase 2: Business Logic and Service Layer
1. Implement subscription service with CRUD operations
2. Add duplicate prevention logic
3. Create query functions for database access
4. Implement validation functions

### Phase 3: Page Controllers and Templates
1. Build subscription list page (view all subscriptions)
2. Build add subscription page (venue selection)
3. Build confirmation page (review and edit selections)
4. Build success page (confirmation with next steps)

### Phase 4: Localization
1. Create English translations in `locales/en.ts`
2. Create Welsh translations in `locales/cy.ts`
3. Ensure all content is properly internationalized

### Phase 5: Testing
1. Write unit tests for service layer
2. Write E2E tests for user journeys
3. Perform accessibility testing with axe-core
4. Manual testing with keyboard and screen readers

---

## Database Design

### Subscription Table

```prisma
// libs/subscriptions/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
  output   = "../../../node_modules/.prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Subscription {
  id          String   @id @default(cuid()) @map("subscription_id")
  userId      String   @map("user_id")
  locationId  Int      @map("location_id")
  dateAdded   DateTime @default(now()) @map("date_added")

  @@unique([userId, locationId])
  @@index([userId])
  @@map("subscription")
}
```

**Key Design Decisions**:
- `locationId` is `Int` (not String) to match existing location data structure
- No foreign key to location (locations are in-memory data, not database)
- Unique constraint on `[userId, locationId]` prevents duplicates
- Index on `userId` for efficient user subscription queries
- Snake_case database names with `@map` for TypeScript camelCase

**Migration Strategy**:
```bash
# From root directory
yarn workspace @hmcts/postgres prisma migrate dev --name add-subscription-table
```

---

## Module Structure

```
libs/subscriptions/
├── package.json                    # Module metadata and scripts
├── tsconfig.json                   # TypeScript configuration
├── prisma/
│   └── schema.prisma              # Database schema
└── src/
    ├── index.ts                   # Business logic exports
    ├── config.ts                  # Module configuration exports
    ├── pages/
    │   ├── subscriptions/         # Subscription list page
    │   │   ├── index.ts           # GET handler
    │   │   └── index.njk          # Template
    │   ├── add/                   # Add subscription page
    │   │   ├── index.ts           # GET/POST handlers
    │   │   └── index.njk          # Template
    │   ├── confirm/               # Confirmation page
    │   │   ├── index.ts           # GET/POST handlers
    │   │   └── index.njk          # Template
    │   ├── success/               # Success page
    │   │   ├── index.ts           # GET handler
    │   │   └── index.njk          # Template
    │   └── remove/
    │       └── [id].ts            # POST handler for removal
    ├── subscription/              # Domain logic
    │   ├── queries.ts             # Database queries
    │   ├── service.ts             # Business logic
    │   └── validation.ts          # Validation functions
    └── locales/
        ├── en.ts                  # English translations
        └── cy.ts                  # Welsh translations
```

**Note**: URL structure is based on file paths:
- `pages/subscriptions/index.ts` → `/subscriptions`
- `pages/add/index.ts` → `/subscriptions/add` (need to namespace under subscriptions/)
- `pages/confirm/index.ts` → `/subscriptions/confirm`
- `pages/success/index.ts` → `/subscriptions/success`
- `pages/remove/[id].ts` → `/subscriptions/remove/:id`

**CORRECTED Structure** (with proper namespacing):

```
libs/subscriptions/
└── src/
    ├── pages/
    │   └── subscriptions/         # All routes under /subscriptions
    │       ├── index.ts           # GET /subscriptions
    │       ├── index.njk          # List template
    │       ├── add.ts             # GET/POST /subscriptions/add
    │       ├── add.njk            # Add template
    │       ├── confirm.ts         # GET/POST /subscriptions/confirm
    │       ├── confirm.njk        # Confirm template
    │       ├── success.ts         # GET /subscriptions/success
    │       ├── success.njk        # Success template
    │       └── remove/
    │           └── [id].ts        # POST /subscriptions/remove/:id
```

---

## Service Layer Implementation

### File: `src/subscription/queries.ts`

Database access layer - all Prisma interactions.

```typescript
import { prisma } from "@hmcts/postgres";

export async function findUserSubscriptions(userId: string) {
  return prisma.subscription.findMany({
    where: { userId },
    orderBy: { dateAdded: "desc" },
  });
}

export async function findSubscriptionById(id: string) {
  return prisma.subscription.findUnique({
    where: { id },
  });
}

export async function createSubscription(userId: string, locationId: number) {
  return prisma.subscription.create({
    data: {
      userId,
      locationId,
    },
  });
}

export async function deleteSubscription(id: string) {
  return prisma.subscription.delete({
    where: { id },
  });
}

export async function subscriptionExists(userId: string, locationId: number) {
  const subscription = await prisma.subscription.findUnique({
    where: {
      userId_locationId: {
        userId,
        locationId,
      },
    },
  });
  return !!subscription;
}
```

### File: `src/subscription/service.ts`

Business logic layer - orchestrates queries and location data.

```typescript
import { getLocationById } from "@hmcts/location";
import {
  createSubscription,
  deleteSubscription,
  findSubscriptionById,
  findUserSubscriptions,
  subscriptionExists,
} from "./queries.js";

export interface SubscriptionWithLocation {
  id: string;
  userId: string;
  locationId: number;
  locationName: string;
  locationWelshName: string;
  dateAdded: Date;
}

export async function getUserSubscriptionsWithLocations(
  userId: string,
): Promise<SubscriptionWithLocation[]> {
  const subscriptions = await findUserSubscriptions(userId);

  return subscriptions.map((sub) => {
    const location = getLocationById(sub.locationId);
    return {
      id: sub.id,
      userId: sub.userId,
      locationId: sub.locationId,
      locationName: location?.name || "Unknown location",
      locationWelshName: location?.welshName || "Lleoliad anhysbys",
      dateAdded: sub.dateAdded,
    };
  });
}

export async function addSubscriptions(
  userId: string,
  locationIds: number[],
): Promise<{ created: number; duplicates: number }> {
  let created = 0;
  let duplicates = 0;

  for (const locationId of locationIds) {
    const exists = await subscriptionExists(userId, locationId);
    if (exists) {
      duplicates++;
      continue;
    }

    await createSubscription(userId, locationId);
    created++;
  }

  return { created, duplicates };
}

export async function removeSubscription(
  subscriptionId: string,
  userId: string,
): Promise<boolean> {
  const subscription = await findSubscriptionById(subscriptionId);

  if (!subscription || subscription.userId !== userId) {
    return false;
  }

  await deleteSubscription(subscriptionId);
  return true;
}
```

### File: `src/subscription/validation.ts`

Validation logic separate from business logic.

```typescript
export interface ValidationError {
  field: string;
  message: string;
}

export function validateLocationSelection(
  locationIds: unknown,
): ValidationError | null {
  if (!locationIds) {
    return {
      field: "locationIds",
      message: "Select at least one court or tribunal",
    };
  }

  const ids = Array.isArray(locationIds) ? locationIds : [locationIds];

  if (ids.length === 0) {
    return {
      field: "locationIds",
      message: "Select at least one court or tribunal",
    };
  }

  return null;
}

export function normalizeLocationIds(locationIds: unknown): number[] {
  if (!locationIds) {
    return [];
  }

  const ids = Array.isArray(locationIds) ? locationIds : [locationIds];
  return ids.map((id) => (typeof id === "string" ? Number.parseInt(id, 10) : id));
}
```

---

## Page Implementations

### Page 1: Subscription List (`/subscriptions`)

**File**: `src/pages/subscriptions/index.ts`

```typescript
import {
  blockUserAccess,
  buildVerifiedUserNavigation,
  requireAuth,
} from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { getUserSubscriptionsWithLocations } from "../../subscription/service.js";

const getHandler = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.redirect("/sign-in");
  }

  const locale = res.locals.locale || "en";

  // Build navigation
  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(
    req.path,
    locale,
  );

  const subscriptions = await getUserSubscriptionsWithLocations(userId);

  res.render("subscriptions/index", {
    subscriptions,
    hasSubscriptions: subscriptions.length > 0,
  });
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
```

**File**: `src/pages/subscriptions/index.njk`

```html
{% extends "layouts/verified.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/table/macro.njk" import govukTable %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-full">
    <h1 class="govuk-heading-l">{{ t('subscriptions.list.title') }}</h1>

    {{ govukButton({
      text: t('subscriptions.list.addButton'),
      href: "/subscriptions/add",
      classes: "govuk-!-margin-bottom-6"
    }) }}

    {% if not hasSubscriptions %}
      <p class="govuk-body">{{ t('subscriptions.list.noSubscriptions') }}</p>
    {% else %}
      {% set rows = [] %}
      {% for sub in subscriptions %}
        {% set rows = (rows.push([
          { text: sub.locationName if locale === 'en' else sub.locationWelshName },
          { text: sub.dateAdded | date('DD MMM YYYY') },
          {
            html: '<form method="post" action="/subscriptions/remove/' + sub.id + '">
                    <button type="submit" class="govuk-link" style="background:none;border:none;padding:0;cursor:pointer;text-decoration:underline;">
                      ' + t('subscriptions.list.removeLink') + '
                    </button>
                  </form>'
          }
        ]), rows) %}
      {% endfor %}

      {{ govukTable({
        head: [
          { text: t('subscriptions.list.tableHeaders.courtName') },
          { text: t('subscriptions.list.tableHeaders.dateAdded') },
          { text: t('subscriptions.list.tableHeaders.actions') }
        ],
        rows: rows
      }) }}
    {% endif %}
  </div>
</div>
{% endblock %}
```

### Page 2: Add Subscription (`/subscriptions/add`)

**File**: `src/pages/subscriptions/add.ts`

```typescript
import {
  blockUserAccess,
  buildVerifiedUserNavigation,
  requireAuth,
} from "@hmcts/auth";
import { getLocationsGroupedByLetter } from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";
import {
  normalizeLocationIds,
  validateLocationSelection,
} from "../../subscription/validation.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";

  // Build navigation
  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(
    req.path,
    locale,
  );

  // Get session data
  const selectedLocationIds = req.session.subscriptionSelection?.locationIds || [];
  const errors = req.session.subscriptionSelection?.errors || {};
  delete req.session.subscriptionSelection?.errors;

  const locations = getLocationsGroupedByLetter();

  res.render("subscriptions/add", {
    locations,
    selectedLocationIds,
    errors,
  });
};

const postHandler = async (req: Request, res: Response) => {
  const { locationIds } = req.body;

  // Validation
  const validationError = validateLocationSelection(locationIds);
  if (validationError) {
    req.session.subscriptionSelection = {
      errors: {
        [validationError.field]: {
          text: validationError.message,
        },
      },
    };
    return res.redirect("/subscriptions/add");
  }

  // Store in session
  const normalizedIds = normalizeLocationIds(locationIds);
  req.session.subscriptionSelection = {
    locationIds: normalizedIds,
  };

  return res.redirect("/subscriptions/confirm");
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
```

**File**: `src/pages/subscriptions/add.njk`

```html
{% extends "layouts/verified.njk" %}
{% from "govuk/components/checkboxes/macro.njk" import govukCheckboxes %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">

    {% if errors.locationIds %}
      {{ govukErrorSummary({
        titleText: t('errors.thereIsAProblem'),
        errorList: [{
          text: errors.locationIds.text,
          href: "#locationIds"
        }]
      }) }}
    {% endif %}

    <h1 class="govuk-heading-l">{{ t('subscriptions.add.title') }}</h1>

    <form method="post" novalidate>

      {% for letter, letterLocations in locations %}
        <h2 class="govuk-heading-m govuk-!-margin-top-6">{{ letter }}</h2>

        {% set items = [] %}
        {% for location in letterLocations %}
          {% set items = (items.push({
            value: location.locationId,
            text: location.name if locale === 'en' else location.welshName,
            checked: location.locationId in selectedLocationIds
          }), items) %}
        {% endfor %}

        {{ govukCheckboxes({
          name: "locationIds",
          items: items,
          errorMessage: errors.locationIds if loop.first
        }) }}
      {% endfor %}

      {{ govukButton({
        text: t('common.continue')
      }) }}
    </form>

  </div>
</div>
{% endblock %}
```

### Page 3: Confirm Subscriptions (`/subscriptions/confirm`)

**File**: `src/pages/subscriptions/confirm.ts`

```typescript
import {
  blockUserAccess,
  buildVerifiedUserNavigation,
  requireAuth,
} from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";
import { addSubscriptions } from "../../subscription/service.js";

const getHandler = async (req: Request, res: Response) => {
  const selectedLocationIds = req.session.subscriptionSelection?.locationIds || [];

  // Redirect if no selections
  if (selectedLocationIds.length === 0) {
    return res.redirect("/subscriptions/add");
  }

  const locale = res.locals.locale || "en";

  // Build navigation
  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(
    req.path,
    locale,
  );

  // Get location details
  const locations = selectedLocationIds
    .map((id: number) => getLocationById(id))
    .filter((loc) => loc !== undefined);

  const errors = req.session.subscriptionSelection?.errors || {};
  delete req.session.subscriptionSelection?.errors;

  res.render("subscriptions/confirm", {
    locations,
    errors,
  });
};

const postHandler = async (req: Request, res: Response) => {
  const { action, removeLocationId } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.redirect("/sign-in");
  }

  const selectedLocationIds = req.session.subscriptionSelection?.locationIds || [];

  // Handle remove action
  if (action === "remove" && removeLocationId) {
    const updatedIds = selectedLocationIds.filter(
      (id: number) => id !== Number.parseInt(removeLocationId, 10),
    );

    req.session.subscriptionSelection = {
      locationIds: updatedIds,
    };

    // Check if empty
    if (updatedIds.length === 0) {
      req.session.subscriptionSelection.errors = {
        general: {
          text: "At least one subscription is needed",
        },
      };
    }

    return res.redirect("/subscriptions/confirm");
  }

  // Handle add another action
  if (action === "addAnother") {
    return res.redirect("/subscriptions/add");
  }

  // Handle continue - save subscriptions
  if (selectedLocationIds.length === 0) {
    req.session.subscriptionSelection = {
      errors: {
        general: {
          text: "At least one subscription is needed",
        },
      },
    };
    return res.redirect("/subscriptions/confirm");
  }

  // Save to database
  await addSubscriptions(userId, selectedLocationIds);

  // Clear session
  delete req.session.subscriptionSelection;

  return res.redirect("/subscriptions/success");
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
```

**File**: `src/pages/subscriptions/confirm.njk`

```html
{% extends "layouts/verified.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">

    {% if errors.general %}
      {{ govukErrorSummary({
        titleText: t('errors.thereIsAProblem'),
        errorList: [{ text: errors.general.text }]
      }) }}

      <p class="govuk-body">{{ errors.general.text }}</p>

      <form action="/subscriptions/add" method="get">
        {{ govukButton({
          text: t('subscriptions.confirm.addButton')
        }) }}
      </form>

    {% else %}

      <h1 class="govuk-heading-l">{{ t('subscriptions.confirm.title') }}</h1>

      <form method="post" novalidate>
        <ul class="govuk-list">
          {% for location in locations %}
            <li class="govuk-!-margin-bottom-3">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>{{ location.name if locale === 'en' else location.welshName }}</span>
                <button
                  type="submit"
                  name="removeLocationId"
                  value="{{ location.locationId }}"
                  formaction="/subscriptions/confirm"
                  class="govuk-link"
                  style="background:none;border:none;padding:0;cursor:pointer;text-decoration:underline;">
                  <input type="hidden" name="action" value="remove">
                  {{ t('subscriptions.confirm.removeLink') }}
                </button>
              </div>
            </li>
          {% endfor %}
        </ul>

        <p class="govuk-body">
          <button
            type="submit"
            name="action"
            value="addAnother"
            class="govuk-link"
            style="background:none;border:none;padding:0;cursor:pointer;text-decoration:underline;">
            {{ t('subscriptions.confirm.addAnotherLink') }}
          </button>
        </p>

        <button type="submit" name="action" value="continue" class="govuk-button" data-module="govuk-button">
          {{ t('common.continue') }}
        </button>
      </form>

    {% endif %}
  </div>
</div>
{% endblock %}
```

### Page 4: Success (`/subscriptions/success`)

**File**: `src/pages/subscriptions/success.ts`

```typescript
import {
  blockUserAccess,
  buildVerifiedUserNavigation,
  requireAuth,
} from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";

  // Build navigation
  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(
    req.path,
    locale,
  );

  res.render("subscriptions/success");
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
```

**File**: `src/pages/subscriptions/success.njk`

```html
{% extends "layouts/verified.njk" %}
{% from "govuk/components/panel/macro.njk" import govukPanel %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">

    {{ govukPanel({
      titleText: t('subscriptions.success.title'),
      classes: "govuk-!-margin-bottom-6"
    }) }}

    <p class="govuk-body">{{ t('subscriptions.success.whatNext.intro') }}</p>

    <ul class="govuk-list govuk-list--bullet">
      <li>
        <a href="/subscriptions/add" class="govuk-link">
          {{ t('subscriptions.success.whatNext.addNew') }}
        </a>
      </li>
      <li>
        <a href="/subscriptions" class="govuk-link">
          {{ t('subscriptions.success.whatNext.manage') }}
        </a>
      </li>
      <li>
        <a href="/hearing-lists/find-court" class="govuk-link">
          {{ t('subscriptions.success.whatNext.findCourt') }}
        </a>
      </li>
    </ul>
  </div>
</div>
{% endblock %}
```

### Remove Handler (`/subscriptions/remove/:id`)

**File**: `src/pages/subscriptions/remove/[id].ts`

```typescript
import { blockUserAccess, requireAuth } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { removeSubscription } from "../../../subscription/service.js";

const postHandler = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const subscriptionId = req.params.id;

  if (!userId) {
    return res.redirect("/sign-in");
  }

  const removed = await removeSubscription(subscriptionId, userId);

  if (!removed) {
    // Subscription not found or unauthorized
    return res.status(404).render("errors/404");
  }

  res.redirect("/subscriptions");
};

export const POST: RequestHandler[] = [
  requireAuth(),
  blockUserAccess(),
  postHandler,
];
```

---

## Localization Files

### File: `src/locales/en.ts`

```typescript
export default {
  subscriptions: {
    list: {
      title: "Your email subscriptions",
      addButton: "Add email subscription",
      noSubscriptions: "You do not have any active subscriptions.",
      tableHeaders: {
        courtName: "Court or tribunal name",
        dateAdded: "Date added",
        actions: "Actions",
      },
      removeLink: "Remove",
    },
    add: {
      title: "Subscribe by court or tribunal name",
      searchLabel: "Select courts or tribunals",
    },
    confirm: {
      title: "Confirm your email subscriptions",
      removeLink: "Remove",
      addAnotherLink: "Add another subscription",
      addButton: "Add subscription",
    },
    success: {
      title: "Subscription confirmation",
      whatNext: {
        intro: "To continue, you can go to your account in order to:",
        addNew: "add a new email subscription",
        manage: "manage your current email subscriptions",
        findCourt: "find a court or tribunal",
      },
    },
  },
};
```

### File: `src/locales/cy.ts`

```typescript
export default {
  subscriptions: {
    list: {
      title: "Eich tanysgrifiadau e-bost",
      addButton: "Ychwanegu tanysgrifiad e-bost",
      noSubscriptions: "Nid oes gennych unrhyw danysgrifiadau gweithredol.",
      tableHeaders: {
        courtName: "Enw'r llys neu'r tribiwnlys",
        dateAdded: "Dyddiad ychwanegu",
        actions: "Camau gweithredu",
      },
      removeLink: "Tynnu",
    },
    add: {
      title: "Tanysgrifio yn ôl enw llys neu dribiwnlys",
      searchLabel: "Dewiswch lysoedd neu dribiwnlysoedd",
    },
    confirm: {
      title: "Cadarnhewch eich tanysgrifiadau e-bost",
      removeLink: "Tynnu",
      addAnotherLink: "Ychwanegu tanysgrifiad arall",
      addButton: "Ychwanegu tanysgrifiad",
    },
    success: {
      title: "Cadarnhad tanysgrifiad",
      whatNext: {
        intro: "I barhau, gallwch fynd i'ch cyfrif er mwyn:",
        addNew: "ychwanegu tanysgrifiad e-bost newydd",
        manage: "rheoli eich tanysgrifiadau e-bost cyfredol",
        findCourt: "dod o hyd i lys neu dribiwnlys",
      },
    },
  },
};
```

---

## Module Configuration Files

### File: `package.json`

```json
{
  "name": "@hmcts/subscriptions",
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
  },
  "dependencies": {
    "@hmcts/auth": "workspace:*",
    "@hmcts/location": "workspace:*",
    "@hmcts/postgres": "workspace:*"
  }
}
```

### File: `tsconfig.json`

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts", "dist", "node_modules", "src/assets/"]
}
```

### File: `src/config.ts`

```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pageRoutes = { path: path.join(__dirname, "pages") };
export const prismaSchemas = path.join(__dirname, "../prisma");
export const locales = path.join(__dirname, "locales");
```

### File: `src/index.ts`

```typescript
// Business logic exports
export * from "./subscription/queries.js";
export * from "./subscription/service.js";
export * from "./subscription/validation.js";
```

---

## Application Registration

### 1. Root `tsconfig.json`

Add to `compilerOptions.paths`:

```json
{
  "compilerOptions": {
    "paths": {
      "@hmcts/subscriptions": ["libs/subscriptions/src"],
      "@hmcts/subscriptions/config": ["libs/subscriptions/src/config.ts"]
    }
  }
}
```

### 2. Web App (`apps/web/src/app.ts`)

Register page routes:

```typescript
import { pageRoutes as subscriptionPages } from "@hmcts/subscriptions/config";

// Register subscription pages
app.use(await createSimpleRouter(subscriptionPages));
```

### 3. Postgres App (`apps/postgres/src/schema-discovery.ts`)

Register Prisma schema:

```typescript
import { prismaSchemas as subscriptionSchemas } from "@hmcts/subscriptions/config";

const schemaPaths = [
  // ... existing schemas
  subscriptionSchemas,
];
```

### 4. Web App Package.json

Add dependency:

```json
{
  "dependencies": {
    "@hmcts/subscriptions": "workspace:*"
  }
}
```

---

## Navigation Integration

The subscription link needs to be added to the verified user navigation.

### File: `libs/auth/src/middleware/navigation-helper.ts`

Add subscription link to `buildVerifiedUserNavigation`:

```typescript
{
  text: locale === "en" ? "Email subscriptions" : "Tanysgrifiadau e-bost",
  href: "/subscriptions",
  active: currentPath.startsWith("/subscriptions"),
}
```

---

## Testing Strategy

### Unit Tests

**File**: `src/subscription/service.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserSubscriptionsWithLocations, addSubscriptions } from "./service";
import * as queries from "./queries";

vi.mock("./queries");
vi.mock("@hmcts/location");

describe("Subscription Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserSubscriptionsWithLocations", () => {
    it("should return subscriptions with location data", async () => {
      vi.mocked(queries.findUserSubscriptions).mockResolvedValue([
        {
          id: "sub-1",
          userId: "user-1",
          locationId: 1,
          dateAdded: new Date("2025-11-01"),
        },
      ]);

      const result = await getUserSubscriptionsWithLocations("user-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "sub-1",
        locationId: 1,
      });
    });
  });

  describe("addSubscriptions", () => {
    it("should create new subscriptions", async () => {
      vi.mocked(queries.subscriptionExists).mockResolvedValue(false);
      vi.mocked(queries.createSubscription).mockResolvedValue({
        id: "sub-1",
        userId: "user-1",
        locationId: 1,
        dateAdded: new Date(),
      });

      const result = await addSubscriptions("user-1", [1, 2]);

      expect(result.created).toBe(2);
      expect(result.duplicates).toBe(0);
    });

    it("should skip duplicate subscriptions", async () => {
      vi.mocked(queries.subscriptionExists)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await addSubscriptions("user-1", [1, 2]);

      expect(result.created).toBe(1);
      expect(result.duplicates).toBe(1);
    });
  });
});
```

### E2E Tests

**File**: `e2e-tests/subscriptions.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.describe("Email subscriptions", () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as verified user
    await page.goto("/sign-in");
    // ... authentication steps
  });

  test("should display subscription list page", async ({ page }) => {
    await page.goto("/subscriptions");
    await expect(page.locator("h1")).toContainText("Your email subscriptions");
    await expect(page.locator('a[href="/subscriptions/add"]')).toBeVisible();
  });

  test("should add subscriptions successfully", async ({ page }) => {
    await page.goto("/subscriptions");
    await page.click('a[href="/subscriptions/add"]');

    // Select locations
    await page.check('input[value="1"]');
    await page.check('input[value="2"]');
    await page.click('button:has-text("Continue")');

    // Confirm
    await expect(page.locator("h1")).toContainText("Confirm your email subscriptions");
    await page.click('button:has-text("Continue")');

    // Success
    await expect(page.locator("h1")).toContainText("Subscription confirmation");
  });

  test("should show error when no location selected", async ({ page }) => {
    await page.goto("/subscriptions/add");
    await page.click('button:has-text("Continue")');

    await expect(page.locator(".govuk-error-summary")).toContainText(
      "Select at least one court or tribunal"
    );
  });

  test("should allow removing subscription", async ({ page }) => {
    await page.goto("/subscriptions");

    const removeButton = page.locator('button:has-text("Remove")').first();
    await removeButton.click();

    await expect(page).toHaveURL("/subscriptions");
  });
});
```

---

## Security Considerations

1. **Authentication**: All routes protected with `requireAuth()` middleware
2. **Authorization**: Only verified users can access via `blockUserAccess()` middleware
3. **Ownership Validation**: Users can only manage their own subscriptions
4. **CSRF Protection**: Ensure CSRF tokens on all POST forms (handled by Express session middleware)
5. **SQL Injection**: Prevented via Prisma ORM parameterized queries
6. **XSS Prevention**: Nunjucks auto-escapes by default

---

## Performance Considerations

1. **Database Indexes**: Index on `userId` for efficient subscription queries
2. **Location Data**: In-memory lookups (no database joins required)
3. **Session Storage**: Minimal session data (just location IDs during flow)
4. **Query Optimization**: Batch operations where possible

---

## Accessibility Checklist

- [ ] All forms have proper labels and error messages
- [ ] Error summaries use `role="alert"`
- [ ] Tables use `<th scope="col">` for headers
- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA standards
- [ ] Screen reader testing completed
- [ ] Language toggle works on all pages

---

## Deployment Steps

1. **Create and test locally**:
   ```bash
   yarn install
   yarn db:migrate:dev
   yarn dev
   ```

2. **Run tests**:
   ```bash
   yarn test
   yarn test:e2e
   ```

3. **Create migration**:
   ```bash
   yarn workspace @hmcts/postgres prisma migrate dev --name add-subscription-table
   ```

4. **Deploy to environment**:
   ```bash
   # Migrations run automatically in CI/CD
   git push
   ```

---

## Estimated Effort

| Task | Estimated Hours |
|------|----------------|
| Module setup and configuration | 2 |
| Database schema and migration | 2 |
| Service layer (queries + business logic) | 4 |
| Validation functions | 1 |
| Page 1: List subscriptions | 3 |
| Page 2: Add subscription | 4 |
| Page 3: Confirm subscriptions | 5 |
| Page 4: Success page | 1 |
| Remove handler | 1 |
| Localization (EN + CY) | 2 |
| Navigation integration | 1 |
| Unit tests | 4 |
| E2E tests | 4 |
| Accessibility testing | 3 |
| Bug fixes and refinement | 3 |

**Total: ~40 hours (5 days)**

---

## Dependencies and Blockers

### Dependencies
- Existing `@hmcts/auth` module for authentication
- Existing `@hmcts/location` module for venue data
- Existing `@hmcts/postgres` module for database access
- GOV.UK Frontend components

### Potential Blockers
- None identified - all dependencies exist and are stable

---

## Success Criteria

- [ ] All four pages render correctly
- [ ] Users can add multiple subscriptions
- [ ] Users can remove subscriptions
- [ ] Duplicate subscriptions prevented
- [ ] All validation working correctly
- [ ] Welsh translations complete and accurate
- [ ] Navigation integration complete
- [ ] All unit tests passing
- [ ] All E2E tests passing
- [ ] Accessibility testing passed (WCAG 2.2 AA)
- [ ] Code review completed
- [ ] Documentation updated

---

## Future Enhancements (Out of Scope)

- Email notification delivery system
- Notification frequency preferences
- Bulk subscription management
- Export subscriptions to CSV
- Subscription analytics dashboard
