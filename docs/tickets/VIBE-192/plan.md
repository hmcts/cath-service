# VIBE-192: Email Subscriptions - Technical Implementation Plan

## Overview

This document provides technical implementation details for the email subscriptions feature, following HMCTS monorepo conventions and GOV.UK Design System patterns.

## Module Structure

### New Module: `@hmcts/email-subscriptions`

```
libs/email-subscriptions/
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma
└── src/
    ├── config.ts
    ├── index.ts
    │
    ├── pages/
    │   └── account/
    │       └── email-subscriptions/
    │           ├── index.ts              # Dashboard (Page 1)
    │           ├── index.njk
    │           ├── add/
    │           │   ├── index.ts          # Add subscription (Page 2)
    │           │   └── index.njk
    │           ├── confirm/
    │           │   ├── index.ts          # Confirm (Page 3)
    │           │   └── index.njk
    │           └── confirmation/
    │               ├── index.ts          # Success (Page 4)
    │               └── index.njk
    │
    ├── subscription/
    │   ├── service.ts
    │   ├── service.test.ts
    │   ├── queries.ts
    │   ├── queries.test.ts
    │   ├── validation.ts
    │   └── validation.test.ts
    │
    └── locales/
        ├── en.ts
        └── cy.ts
```

## Step-by-Step Implementation

### Step 1: Create Module Structure

```bash
# Create directory structure
mkdir -p libs/email-subscriptions/src/pages/account/email-subscriptions/{add,confirm,confirmation}
mkdir -p libs/email-subscriptions/src/subscription
mkdir -p libs/email-subscriptions/src/locales
mkdir -p libs/email-subscriptions/prisma
```

### Step 2: Package Configuration

**File**: `libs/email-subscriptions/package.json`

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

**File**: `libs/email-subscriptions/tsconfig.json`

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
  "exclude": ["**/*.test.ts", "dist", "node_modules"]
}
```

### Step 3: Module Configuration Exports

**File**: `libs/email-subscriptions/src/config.ts`

```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pageRoutes = { path: path.join(__dirname, "pages") };
export const prismaSchemas = path.join(__dirname, "../prisma");
```

**File**: `libs/email-subscriptions/src/index.ts`

```typescript
export * from "./subscription/service.js";
export * from "./subscription/validation.js";
```

### Step 4: Database Schema

**File**: `libs/email-subscriptions/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../../../node_modules/.prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Subscription {
  subscriptionId String   @id @default(uuid()) @map("subscription_id") @db.Uuid
  userId         String   @map("user_id")
  locationId     String   @map("location_id")
  subscribedAt   DateTime @default(now()) @map("subscribed_at")
  isActive       Boolean  @default(true) @map("is_active")

  @@unique([userId, locationId], name: "unique_user_location")
  @@index([userId], name: "idx_subscription_user")
  @@index([locationId], name: "idx_subscription_location")
  @@index([isActive], name: "idx_subscription_active")
  @@map("subscription")
}
```

### Step 5: Database Queries

**File**: `libs/email-subscriptions/src/subscription/queries.ts`

```typescript
import { prisma } from "@hmcts/postgres";

export async function findActiveSubscriptionsByUserId(userId: string) {
  return prisma.subscription.findMany({
    where: {
      userId,
      isActive: true
    },
    orderBy: {
      subscribedAt: "desc"
    }
  });
}

export async function findSubscriptionByUserAndLocation(userId: string, locationId: string) {
  return prisma.subscription.findUnique({
    where: {
      unique_user_location: {
        userId,
        locationId
      }
    }
  });
}

export async function countActiveSubscriptionsByUserId(userId: string) {
  return prisma.subscription.count({
    where: {
      userId,
      isActive: true
    }
  });
}

export async function createSubscriptionRecord(
  userId: string,
  locationId: string
) {
  return prisma.subscription.create({
    data: {
      userId,
      locationId,
      isActive: true
    }
  });
}

export async function deactivateSubscriptionRecord(subscriptionId: string) {
  return prisma.subscription.update({
    where: { subscriptionId },
    data: {
      isActive: false,
      unsubscribedAt: new Date()
    }
  });
}
```

### Step 6: Validation Functions

**File**: `libs/email-subscriptions/src/subscription/validation.ts`

```typescript
import { getLocationById } from "@hmcts/location";
import { findSubscriptionByUserAndLocation } from "./queries.js";

export async function validateLocationId(locationId: string): Promise<boolean> {
  const location = getLocationById(Number.parseInt(locationId, 10));
  return location !== undefined;
}

export async function validateDuplicateSubscription(
  userId: string,
  locationId: string
): Promise<boolean> {
  const existing = await findSubscriptionByUserAndLocation(userId, locationId);
  return !existing || !existing.isActive;
}

export async function validateMinimumSubscriptions(
  userId: string,
  excludeLocationId?: string
): Promise<boolean> {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      userId,
      isActive: true,
      ...(excludeLocationId && { locationId: { not: excludeLocationId } })
    }
  });
  return subscriptions.length > 0;
}
```

### Step 7: Business Logic Service

**File**: `libs/email-subscriptions/src/subscription/service.ts`

```typescript
import {
  countActiveSubscriptionsByUserId,
  createSubscriptionRecord,
  deactivateSubscriptionRecord,
  findActiveSubscriptionsByUserId,
  findSubscriptionByUserAndLocation
} from "./queries.js";
import { validateDuplicateSubscription, validateLocationId } from "./validation.js";

const MAX_SUBSCRIPTIONS = 50;

export async function createSubscription(userId: string, locationId: string) {
  const locationValid = await validateLocationId(locationId);
  if (!locationValid) {
    throw new Error("Invalid location ID");
  }

  const existing = await findSubscriptionByUserAndLocation(userId, locationId);
  if (existing?.isActive) {
    throw new Error("You are already subscribed to this court");
  }

  const count = await countActiveSubscriptionsByUserId(userId);
  if (count >= MAX_SUBSCRIPTIONS) {
    throw new Error(`Maximum ${MAX_SUBSCRIPTIONS} subscriptions allowed`);
  }

  if (existing && !existing.isActive) {
    return prisma.subscription.update({
      where: { subscriptionId: existing.subscriptionId },
      data: {
        isActive: true,
        subscribedAt: new Date()
      }
    });
  }

  return createSubscriptionRecord(userId, locationId);
}

export async function getSubscriptionsByUserId(userId: string) {
  return findActiveSubscriptionsByUserId(userId);
}

export async function removeSubscription(subscriptionId: string, userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { subscriptionId }
  });

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  if (subscription.userId !== userId) {
    throw new Error("Unauthorized");
  }

  if (!subscription.isActive) {
    throw new Error("Subscription already removed");
  }

  return deactivateSubscriptionRecord(subscriptionId);
}

export async function createMultipleSubscriptions(
  userId: string,
  locationIds: string[]
) {
  const results = await Promise.allSettled(
    locationIds.map((locationId) => createSubscription(userId, locationId))
  );

  const succeeded = results.filter((r) => r.status === "fulfilled");
  const failed = results.filter((r) => r.status === "rejected");

  return {
    succeeded: succeeded.length,
    failed: failed.length,
    errors: failed.map((r) =>
      r.status === "rejected" ? r.reason.message : "Unknown error"
    )
  };
}
```

### Step 8: Shared Translations

**File**: `libs/email-subscriptions/src/locales/en.ts`

```typescript
export const en = {
  back: "Back",
  continue: "Continue",
  cancel: "Cancel",
  remove: "Remove",
  search: "Search",
  errorSummaryTitle: "There is a problem",

  errors: {
    minSearchLength: "Enter at least 2 characters to search",
    alreadySubscribed: "You are already subscribed to this court",
    noResults: "No results found for",
    atLeastOne: "You must subscribe to at least one court or tribunal",
    invalidLocation: "Invalid location selected"
  }
};
```

**File**: `libs/email-subscriptions/src/locales/cy.ts`

```typescript
export const cy = {
  back: "Yn ôl",
  continue: "Parhau",
  cancel: "Canslo",
  remove: "Dileu",
  search: "Chwilio",
  errorSummaryTitle: "Mae problem wedi codi",

  errors: {
    minSearchLength: "Rhowch o leiaf 2 nod i chwilio",
    alreadySubscribed: "Rydych eisoes wedi tanysgrifio i'r llys hwn",
    noResults: "Dim canlyniadau wedi'u canfod ar gyfer",
    atLeastOne: "Mae'n rhaid i chi danysgrifio i o leiaf un llys neu dribiwnlys",
    invalidLocation: "Lleoliad annilys wedi'i ddewis"
  }
};
```

### Step 9: Page 1 - Dashboard

**File**: `libs/email-subscriptions/src/pages/account/email-subscriptions/index.ts`

```typescript
import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";
import { getSubscriptionsByUserId, removeSubscription } from "../../../subscription/service.js";

const en = {
  title: "Your email subscriptions",
  heading: "Your email subscriptions",
  noSubscriptions: "You have no email subscriptions",
  noSubscriptionsMessage: "Subscribe to courts and tribunals to receive email notifications when new hearing publications are available.",
  subscribedCount: "You are subscribed to {count} courts and tribunals",
  addButton: "Add subscription",
  subscribedLabel: "Subscribed:",
  removeLink: "Remove",
  successMessage: "Subscription removed successfully"
};

const cy = {
  title: "Eich tanysgrifiadau e-bost",
  heading: "Eich tanysgrifiadau e-bost",
  noSubscriptions: "Nid oes gennych unrhyw danysgrifiadau e-bost",
  noSubscriptionsMessage: "Tanysgrifiwch i lysoedd a thribiwnlysoedd i dderbyn hysbysiadau e-bost pan fydd cyhoeddiadau gwrandawiad newydd ar gael.",
  subscribedCount: "Rydych wedi tanysgrifio i {count} llys a thribiwnlys",
  addButton: "Ychwanegu tanysgrifiad",
  subscribedLabel: "Tanysgrifiwyd:",
  removeLink: "Dileu",
  successMessage: "Tanysgrifiad wedi'i ddileu yn llwyddiannus"
};

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const userId = req.user?.id;

  if (!userId) {
    return res.redirect("/login");
  }

  const subscriptions = await getSubscriptionsByUserId(userId);

  const subscriptionsWithDetails = subscriptions.map((sub) => {
    const location = getLocationById(Number.parseInt(sub.locationId, 10));
    return {
      ...sub,
      locationName: location ? (locale === "cy" ? location.welshName : location.name) : sub.locationId
    };
  });

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  const successMessage = req.session.successMessage;
  delete req.session.successMessage;

  res.render("account/email-subscriptions/index", {
    ...t,
    subscriptions: subscriptionsWithDetails,
    count: subscriptions.length,
    successBanner: successMessage ? { text: successMessage } : undefined
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const userId = req.user?.id;
  const { subscriptionId } = req.body;

  if (!userId) {
    return res.redirect("/login");
  }

  if (!subscriptionId) {
    return res.redirect("/account/email-subscriptions");
  }

  try {
    await removeSubscription(subscriptionId, userId);
    req.session.successMessage = t.successMessage;
    res.redirect("/account/email-subscriptions");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    const subscriptions = await getSubscriptionsByUserId(userId);
    const subscriptionsWithDetails = subscriptions.map((sub) => {
      const location = getLocationById(Number.parseInt(sub.locationId, 10));
      return {
        ...sub,
        locationName: location ? (locale === "cy" ? location.welshName : location.name) : sub.locationId
      };
    });

    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    res.render("account/email-subscriptions/index", {
      ...t,
      subscriptions: subscriptionsWithDetails,
      count: subscriptions.length,
      errors: {
        titleText: t.errorSummaryTitle || "There is a problem",
        errorList: [{ text: errorMessage }]
      }
    });
  }
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
```

**File**: `libs/email-subscriptions/src/pages/account/email-subscriptions/index.njk`

```html
{% extends "layouts/base-template.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/notification-banner/macro.njk" import govukNotificationBanner %}
{% from "govuk/components/warning-text/macro.njk" import govukWarningText %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}

{% block pageTitle %}
  {{ title }} - {{ serviceName }} - {{ govUk }}
{% endblock %}

{% block page_content %}

{% if errors %}
  {{ govukErrorSummary({
    titleText: errors.titleText,
    errorList: errors.errorList
  }) }}
{% endif %}

{% if successBanner %}
  {{ govukNotificationBanner({
    type: "success",
    text: successBanner.text
  }) }}
{% endif %}

<h1 class="govuk-heading-xl">{{ heading }}</h1>

{% if count === 0 %}
  {{ govukWarningText({
    text: noSubscriptions,
    iconFallbackText: "Warning"
  }) }}

  <p class="govuk-body">{{ noSubscriptionsMessage }}</p>

  <a href="/account/email-subscriptions/add" role="button" draggable="false" class="govuk-button" data-module="govuk-button">
    {{ addButton }}
  </a>
{% else %}
  <p class="govuk-body">{{ subscribedCount.replace('{count}', count) }}</p>

  <a href="/account/email-subscriptions/add" role="button" draggable="false" class="govuk-button" data-module="govuk-button">
    {{ addButton }}
  </a>

  <div class="govuk-!-margin-top-6">
    {% for subscription in subscriptions %}
      <div class="govuk-summary-card">
        <div class="govuk-summary-card__title-wrapper">
          <h2 class="govuk-summary-card__title">{{ subscription.locationName }}</h2>
          <ul class="govuk-summary-card__actions">
            <li class="govuk-summary-card__action">
              <form method="post" style="display: inline;">
                <input type="hidden" name="subscriptionId" value="{{ subscription.subscriptionId }}">
                <button type="submit" class="govuk-link" style="background: none; border: none; padding: 0; color: #1d70b8; text-decoration: underline; cursor: pointer;">
                  {{ removeLink }}
                </button>
              </form>
            </li>
          </ul>
        </div>
        <div class="govuk-summary-card__content">
          <dl class="govuk-summary-list">
            <div class="govuk-summary-list__row">
              <dt class="govuk-summary-list__key">{{ subscribedLabel }}</dt>
              <dd class="govuk-summary-list__value">{{ subscription.subscribedAt | date('D MMMM YYYY') }}</dd>
            </div>
          </dl>
        </div>
      </div>
    {% endfor %}
  </div>
{% endif %}

{% endblock %}
```

### Step 10: Page 2 - Add Subscription

**File**: `libs/email-subscriptions/src/pages/account/email-subscriptions/add/index.ts`

```typescript
import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getLocationsGroupedByLetter, searchLocations } from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";
import { getSubscriptionsByUserId } from "../../../../subscription/service.js";

const en = {
  title: "Subscribe by court or tribunal name",
  heading: "Subscribe by court or tribunal name",
  searchLabel: "Search for a court or tribunal by name",
  searchButton: "Search",
  subscribeButton: "Subscribe",
  browseLink: "Browse A-Z",
  searchResults: "Search results for \"{query}\"",
  resultsCount: "{count} results",
  noResults: "No results found for \"{query}\"",
  browseHeading: "Browse all courts and tribunals",
  letterHeading: "Courts and tribunals beginning with '{letter}'",
  alreadySubscribed: "Already subscribed"
};

const cy = {
  title: "Tanysgrifio yn ôl enw llys neu dribiwnlys",
  heading: "Tanysgrifio yn ôl enw llys neu dribiwnlys",
  searchLabel: "Chwilio am lys neu dribiwnlys yn ôl enw",
  searchButton: "Chwilio",
  subscribeButton: "Tanysgrifio",
  browseLink: "Pori A-Z",
  searchResults: "Canlyniadau chwilio ar gyfer \"{query}\"",
  resultsCount: "{count} canlyniad",
  noResults: "Dim canlyniadau wedi'u canfod ar gyfer \"{query}\"",
  browseHeading: "Pori pob llys a thribiwnlys",
  letterHeading: "Llysoedd a thribiwnlysoedd yn dechrau gyda '{letter}'",
  alreadySubscribed: "Eisoes wedi tanysgrifio"
};

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const userId = req.user?.id;
  const query = req.query.q as string | undefined;
  const view = req.query.view as string | undefined;
  const letter = req.query.letter as string | undefined;

  if (!userId) {
    return res.redirect("/login");
  }

  const userSubscriptions = await getSubscriptionsByUserId(userId);
  const subscribedLocationIds = new Set(userSubscriptions.map(s => s.locationId));

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  if (query && query.length >= 2) {
    const results = searchLocations(query, locale);
    const resultsWithStatus = results.map(location => ({
      ...location,
      isSubscribed: subscribedLocationIds.has(location.locationId.toString())
    }));

    return res.render("account/email-subscriptions/add/index", {
      ...t,
      query,
      results: resultsWithStatus,
      showResults: true,
      resultsCount: results.length
    });
  }

  if (view === "browse") {
    const grouped = getLocationsGroupedByLetter(locale);
    const targetLetter = letter?.toUpperCase() || "A";
    const locationsForLetter = grouped[targetLetter] || [];

    const locationsWithStatus = locationsForLetter.map(location => ({
      ...location,
      isSubscribed: subscribedLocationIds.has(location.locationId.toString())
    }));

    return res.render("account/email-subscriptions/add/index", {
      ...t,
      showBrowse: true,
      letters: Object.keys(grouped).sort(),
      selectedLetter: targetLetter,
      locations: locationsWithStatus
    });
  }

  res.render("account/email-subscriptions/add/index", {
    ...t,
    showSearch: true
  });
};

const postHandler = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { locationId } = req.body;

  if (!userId) {
    return res.redirect("/login");
  }

  if (!locationId) {
    return res.redirect("/account/email-subscriptions/add");
  }

  if (!req.session.emailSubscriptions) {
    req.session.emailSubscriptions = {};
  }

  if (!req.session.emailSubscriptions.pendingSubscriptions) {
    req.session.emailSubscriptions.pendingSubscriptions = [];
  }

  if (!req.session.emailSubscriptions.pendingSubscriptions.includes(locationId)) {
    req.session.emailSubscriptions.pendingSubscriptions.push(locationId);
  }

  res.redirect("/account/email-subscriptions/confirm");
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
```

**File**: `libs/email-subscriptions/src/pages/account/email-subscriptions/add/index.njk`

```html
{% extends "layouts/base-template.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/back-link/macro.njk" import govukBackLink %}

{% block pageTitle %}
  {{ title }} - {{ serviceName }} - {{ govUk }}
{% endblock %}

{% block beforeContent %}
  {{ govukBackLink({
    text: back,
    href: "/account/email-subscriptions"
  }) }}
{% endblock %}

{% block page_content %}

<h1 class="govuk-heading-xl">{{ heading }}</h1>

{% if showSearch or showResults %}
  <form method="get" novalidate>
    {{ govukInput({
      id: "search",
      name: "q",
      label: {
        text: searchLabel,
        classes: "govuk-label--m"
      },
      value: query if query else ""
    }) }}

    {{ govukButton({
      text: searchButton
    }) }}
  </form>

  <p class="govuk-body">
    <a href="/account/email-subscriptions/add?view=browse" class="govuk-link">{{ browseLink }}</a>
  </p>
{% endif %}

{% if showResults %}
  <h2 class="govuk-heading-m govuk-!-margin-top-6">
    {{ searchResults.replace('{query}', query) }}
  </h2>

  <p class="govuk-body">{{ resultsCount.replace('{count}', resultsCount) }}</p>

  {% if results.length > 0 %}
    {% for location in results %}
      <div class="govuk-summary-card">
        <div class="govuk-summary-card__title-wrapper">
          <h3 class="govuk-summary-card__title">{{ location.name if locale === 'en' else location.welshName }}</h3>
        </div>
        <div class="govuk-summary-card__content">
          {% if location.isSubscribed %}
            <p class="govuk-body">{{ alreadySubscribed }}</p>
          {% else %}
            <form method="post" style="display: inline;">
              <input type="hidden" name="locationId" value="{{ location.locationId }}">
              {{ govukButton({
                text: subscribeButton,
                classes: "govuk-button--secondary"
              }) }}
            </form>
          {% endif %}
        </div>
      </div>
    {% endfor %}
  {% else %}
    <p class="govuk-body">{{ noResults.replace('{query}', query) }}</p>
  {% endif %}
{% endif %}

{% if showBrowse %}
  <h2 class="govuk-heading-m">{{ browseHeading }}</h2>

  <div class="govuk-!-margin-bottom-6">
    {% for let in letters %}
      <a href="/account/email-subscriptions/add?view=browse&letter={{ let }}" class="govuk-link govuk-!-margin-right-3{% if let === selectedLetter %} govuk-!-font-weight-bold{% endif %}">{{ let }}</a>
    {% endfor %}
  </div>

  <h3 class="govuk-heading-m">{{ letterHeading.replace('{letter}', selectedLetter) }}</h3>

  <ul class="govuk-list">
    {% for location in locations %}
      <li class="govuk-!-margin-bottom-3">
        <strong>{{ location.name if locale === 'en' else location.welshName }}</strong>
        {% if location.isSubscribed %}
          <span class="govuk-body-s"> ({{ alreadySubscribed }})</span>
        {% else %}
          <form method="post" style="display: inline;">
            <input type="hidden" name="locationId" value="{{ location.locationId }}">
            <button type="submit" class="govuk-link" style="background: none; border: none; padding: 0; color: #1d70b8; text-decoration: underline; cursor: pointer;">
              {{ subscribeButton }}
            </button>
          </form>
        {% endif %}
      </li>
    {% endfor %}
  </ul>
{% endif %}

{% endblock %}
```

### Step 11: Page 3 - Confirm

**File**: `libs/email-subscriptions/src/pages/account/email-subscriptions/confirm/index.ts`

```typescript
import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";
import { createMultipleSubscriptions } from "../../../../subscription/service.js";

const en = {
  title: "Confirm your email subscriptions",
  heading: "Confirm your email subscriptions",
  reviewMessage: "Review your subscription before confirming:",
  reviewMessagePlural: "Review your subscriptions before confirming:",
  confirmButton: "Confirm subscription",
  confirmButtonPlural: "Confirm subscriptions",
  cancelLink: "Cancel",
  removeLink: "Remove",
  notificationMessage: "You will receive email notifications when new hearing publications are available for this court.",
  notificationMessagePlural: "You will receive email notifications when new hearing publications are available for these courts.",
  errorAtLeastOne: "You must subscribe to at least one court or tribunal",
  backToSearch: "Back to search"
};

const cy = {
  title: "Cadarnhau eich tanysgrifiadau e-bost",
  heading: "Cadarnhau eich tanysgrifiadau e-bost",
  reviewMessage: "Adolygu eich tanysgrifiad cyn cadarnhau:",
  reviewMessagePlural: "Adolygu eich tanysgrifiadau cyn cadarnhau:",
  confirmButton: "Cadarnhau tanysgrifiad",
  confirmButtonPlural: "Cadarnhau tanysgrifiadau",
  cancelLink: "Canslo",
  removeLink: "Dileu",
  notificationMessage: "Byddwch yn derbyn hysbysiadau e-bost pan fydd cyhoeddiadau gwrandawiad newydd ar gael ar gyfer y llys hwn.",
  notificationMessagePlural: "Byddwch yn derbyn hysbysiadau e-bost pan fydd cyhoeddiadau gwrandawiad newydd ar gael ar gyfer y llysoedd hyn.",
  errorAtLeastOne: "Mae'n rhaid i chi danysgrifio i o leiaf un llys neu dribiwnlys",
  backToSearch: "Yn ôl i chwilio"
};

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const userId = req.user?.id;

  if (!userId) {
    return res.redirect("/login");
  }

  const pendingLocationIds = req.session.emailSubscriptions?.pendingSubscriptions || [];

  if (pendingLocationIds.length === 0) {
    return res.redirect("/account/email-subscriptions/add");
  }

  const pendingLocations = pendingLocationIds
    .map((id: string) => {
      const location = getLocationById(Number.parseInt(id, 10));
      return location
        ? {
            locationId: id,
            name: locale === "cy" ? location.welshName : location.name
          }
        : null;
    })
    .filter(Boolean);

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  const isPlural = pendingLocations.length > 1;

  res.render("account/email-subscriptions/confirm/index", {
    ...t,
    locations: pendingLocations,
    isPlural,
    reviewMessage: isPlural ? t.reviewMessagePlural : t.reviewMessage,
    confirmButton: isPlural ? t.confirmButtonPlural : t.confirmButton,
    notificationMessage: isPlural ? t.notificationMessagePlural : t.notificationMessage
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const userId = req.user?.id;
  const { action, locationId } = req.body;

  if (!userId) {
    return res.redirect("/login");
  }

  const pendingLocationIds = req.session.emailSubscriptions?.pendingSubscriptions || [];

  if (action === "remove" && locationId) {
    req.session.emailSubscriptions.pendingSubscriptions = pendingLocationIds.filter(
      (id: string) => id !== locationId
    );

    if (req.session.emailSubscriptions.pendingSubscriptions.length === 0) {
      if (!res.locals.navigation) {
        res.locals.navigation = {};
      }
      res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

      return res.render("account/email-subscriptions/confirm/index", {
        ...t,
        errors: {
          titleText: "There is a problem",
          errorList: [{ text: t.errorAtLeastOne }]
        },
        locations: [],
        showBackToSearch: true
      });
    }

    return res.redirect("/account/email-subscriptions/confirm");
  }

  if (action === "confirm") {
    if (pendingLocationIds.length === 0) {
      return res.redirect("/account/email-subscriptions/add");
    }

    try {
      const result = await createMultipleSubscriptions(userId, pendingLocationIds);

      req.session.emailSubscriptions.confirmationComplete = true;
      req.session.emailSubscriptions.confirmedLocations = pendingLocationIds;
      delete req.session.emailSubscriptions.pendingSubscriptions;

      res.redirect("/account/email-subscriptions/confirmation");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      const pendingLocations = pendingLocationIds
        .map((id: string) => {
          const location = getLocationById(Number.parseInt(id, 10));
          return location
            ? {
                locationId: id,
                name: locale === "cy" ? location.welshName : location.name
              }
            : null;
        })
        .filter(Boolean);

      if (!res.locals.navigation) {
        res.locals.navigation = {};
      }
      res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

      const isPlural = pendingLocations.length > 1;

      res.render("account/email-subscriptions/confirm/index", {
        ...t,
        errors: {
          titleText: "There is a problem",
          errorList: [{ text: errorMessage }]
        },
        locations: pendingLocations,
        isPlural,
        reviewMessage: isPlural ? t.reviewMessagePlural : t.reviewMessage,
        confirmButton: isPlural ? t.confirmButtonPlural : t.confirmButton,
        notificationMessage: isPlural ? t.notificationMessagePlural : t.notificationMessage
      });
    }
  }
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
```

**File**: `libs/email-subscriptions/src/pages/account/email-subscriptions/confirm/index.njk`

```html
{% extends "layouts/base-template.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/back-link/macro.njk" import govukBackLink %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}

{% block pageTitle %}
  {{ title }} - {{ serviceName }} - {{ govUk }}
{% endblock %}

{% block beforeContent %}
  {{ govukBackLink({
    text: back,
    href: "/account/email-subscriptions/add"
  }) }}
{% endblock %}

{% block page_content %}

{% if errors %}
  {{ govukErrorSummary({
    titleText: errors.titleText,
    errorList: errors.errorList
  }) }}
{% endif %}

<h1 class="govuk-heading-xl">{{ heading }}</h1>

{% if showBackToSearch %}
  <p class="govuk-body">
    <a href="/account/email-subscriptions/add" class="govuk-link">{{ backToSearch }}</a>
  </p>
{% else %}
  <p class="govuk-body">{{ reviewMessage }}</p>

  {% for location in locations %}
    <div class="govuk-summary-card govuk-!-margin-bottom-3">
      <div class="govuk-summary-card__title-wrapper">
        <h2 class="govuk-summary-card__title">{{ location.name }}</h2>
        <ul class="govuk-summary-card__actions">
          <li class="govuk-summary-card__action">
            <form method="post" style="display: inline;">
              <input type="hidden" name="action" value="remove">
              <input type="hidden" name="locationId" value="{{ location.locationId }}">
              <button type="submit" class="govuk-link" style="background: none; border: none; padding: 0; color: #1d70b8; text-decoration: underline; cursor: pointer;">
                {{ removeLink }}
              </button>
            </form>
          </li>
        </ul>
      </div>
    </div>
  {% endfor %}

  <p class="govuk-body govuk-!-margin-top-6">{{ notificationMessage }}</p>

  <form method="post">
    <input type="hidden" name="action" value="confirm">
    {{ govukButton({
      text: confirmButton
    }) }}
  </form>

  <p class="govuk-body">
    <a href="/account/email-subscriptions/add" class="govuk-link">{{ cancelLink }}</a>
  </p>
{% endif %}

{% endblock %}
```

### Step 12: Page 4 - Confirmation

**File**: `libs/email-subscriptions/src/pages/account/email-subscriptions/confirmation/index.ts`

```typescript
import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";

const en = {
  title: "Subscription confirmed",
  panelTitle: "Subscription confirmed",
  panelTitlePlural: "Subscriptions confirmed",
  message: "You have subscribed to email notifications for:",
  notificationMessage: "You will receive an email when new hearing publications are available for this court.",
  notificationMessagePlural: "You will receive emails when new hearing publications are available for these courts.",
  viewSubscriptionsButton: "View your subscriptions",
  homeLink: "Back to service home"
};

const cy = {
  title: "Tanysgrifiad wedi'i gadarnhau",
  panelTitle: "Tanysgrifiad wedi'i gadarnhau",
  panelTitlePlural: "Tanysgrifiadau wedi'u cadarnhau",
  message: "Rydych wedi tanysgrifio i hysbysiadau e-bost ar gyfer:",
  notificationMessage: "Byddwch yn derbyn e-bost pan fydd cyhoeddiadau gwrandawiad newydd ar gael ar gyfer y llys hwn.",
  notificationMessagePlural: "Byddwch yn derbyn e-byst pan fydd cyhoeddiadau gwrandawiad newydd ar gael ar gyfer y llysoedd hyn.",
  viewSubscriptionsButton: "Gweld eich tanysgrifiadau",
  homeLink: "Yn ôl i hafan y gwasanaeth"
};

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!req.session.emailSubscriptions?.confirmationComplete) {
    return res.redirect("/account/email-subscriptions");
  }

  const confirmedLocationIds = req.session.emailSubscriptions.confirmedLocations || [];

  const confirmedLocations = confirmedLocationIds
    .map((id: string) => {
      const location = getLocationById(Number.parseInt(id, 10));
      return location ? (locale === "cy" ? location.welshName : location.name) : null;
    })
    .filter(Boolean);

  delete req.session.emailSubscriptions.confirmationComplete;
  delete req.session.emailSubscriptions.confirmedLocations;

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  const isPlural = confirmedLocations.length > 1;

  res.render("account/email-subscriptions/confirmation/index", {
    ...t,
    locations: confirmedLocations,
    isPlural,
    panelTitle: isPlural ? t.panelTitlePlural : t.panelTitle,
    notificationMessage: isPlural ? t.notificationMessagePlural : t.notificationMessage
  });
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
```

**File**: `libs/email-subscriptions/src/pages/account/email-subscriptions/confirmation/index.njk`

```html
{% extends "layouts/base-template.njk" %}
{% from "govuk/components/panel/macro.njk" import govukPanel %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% block pageTitle %}
  {{ title }} - {{ serviceName }} - {{ govUk }}
{% endblock %}

{% block page_content %}

{{ govukPanel({
  titleText: panelTitle,
  classes: "govuk-panel--confirmation"
}) }}

<p class="govuk-body govuk-!-margin-top-6">{{ message }}</p>

<ul class="govuk-list govuk-list--bullet">
  {% for location in locations %}
    <li>{{ location }}</li>
  {% endfor %}
</ul>

<p class="govuk-body govuk-!-margin-top-6">{{ notificationMessage }}</p>

<a href="/account/email-subscriptions" role="button" draggable="false" class="govuk-button govuk-!-margin-top-6" data-module="govuk-button">
  {{ viewSubscriptionsButton }}
</a>

<p class="govuk-body govuk-!-margin-top-3">
  <a href="/" class="govuk-link">{{ homeLink }}</a>
</p>

{% endblock %}
```

### Step 13: Register Module

**Update root `tsconfig.json`**:

```json
{
  "compilerOptions": {
    "paths": {
      "@hmcts/email-subscriptions": ["libs/email-subscriptions/src"]
    }
  }
}
```

**Update `apps/web/src/app.ts`**:

```typescript
import { pageRoutes as emailSubscriptionsPages } from "@hmcts/email-subscriptions/config";

// After authentication routes
app.use(await createSimpleRouter(emailSubscriptionsPages));
```

**Update `apps/postgres/src/schema-discovery.ts`**:

```typescript
import { prismaSchemas as emailSubscriptionsSchemas } from "@hmcts/email-subscriptions/config";

const schemaPaths = [
  emailSubscriptionsSchemas,
  // ... other schemas
];
```

### Step 14: Database Migration

```bash
# Generate migration
yarn db:migrate:dev

# Apply migration
yarn db:migrate

# Generate Prisma client
yarn db:generate
```

### Step 15: Testing

Create test files co-located with source:

- `libs/email-subscriptions/src/subscription/service.test.ts`
- `libs/email-subscriptions/src/subscription/queries.test.ts`
- `libs/email-subscriptions/src/subscription/validation.test.ts`

Run tests:

```bash
yarn test
```

### Step 16: E2E Testing

Create E2E test file: `e2e-tests/tests/email-subscriptions.spec.ts`

```bash
yarn test:e2e
```

## Security Checklist

- [ ] All routes protected with `requireAuth()` middleware
- [ ] All routes protected with `blockUserAccess()` (verified users only)
- [ ] User ownership validated on all mutations
- [ ] CSRF tokens on all POST forms (provided by express-session)
- [ ] Input validation on all fields
- [ ] Location IDs validated against known locations
- [ ] No email addresses stored in subscriptions table (use user_id)
- [ ] Soft deletes maintain audit trail

## Accessibility Checklist

- [ ] All pages WCAG 2.2 AA compliant
- [ ] Keyboard navigation functional
- [ ] Screen reader compatible (test with NVDA/JAWS)
- [ ] Error summaries linked to form fields
- [ ] Progressive enhancement (works without JavaScript)
- [ ] Color contrast ratios meet standards
- [ ] Focus indicators visible

## Welsh Language Checklist

- [ ] All page content available in Welsh
- [ ] Language toggle functional
- [ ] Error messages translated
- [ ] Date formatting localized
- [ ] Court names display in correct language

## Performance Targets

- Dashboard load time: < 2 seconds
- Search results: < 1 second
- Add/remove operations: < 1 second
- Support up to 50 subscriptions per user

## Definition of Done

- [ ] All pages implemented and functional
- [ ] Database schema created and migrated
- [ ] Unit tests written and passing (>80% coverage)
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Accessibility audit passed
- [ ] Welsh translations complete and verified
- [ ] Security review completed
- [ ] Code review approved
- [ ] Documentation updated
- [ ] Deployed to staging and smoke tested

## Out of Scope

The following are NOT included in this ticket:

- Email notification sending
- Email frequency preferences (immediate/daily/weekly)
- Unsubscribe via email link
- Notification queue processing
- GOV Notify integration
- Email templates
