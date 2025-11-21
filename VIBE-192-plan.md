# VIBE-192 — Technical Implementation Plan

> Ticket: VIBE-192 — Verified User – Email subscriptions
> Updated: 21 Nov 2025

---

## Overview

Implement email subscription functionality for verified users to subscribe to court/tribunal hearing notifications. The feature includes four pages: subscription list, venue selection, confirmation, and success confirmation.

---

## Technical Approach

### Architecture
- **Module**: Subscription management module at `libs/subscriptions/`
- **Pages**: Four controller/template pairs for the subscription flow
- **Database**: Subscriptions table with user-location relationships
- **Auth**: Verify user is a verified media user before allowing subscriptions
- **Validation**: Prevent duplicate subscriptions, require at least one selection

### Database Schema

```prisma
model Subscription {
  id          String   @id @default(cuid()) @map("subscription_id")
  userId      String   @map("user_id")
  locationId  String   @map("location_id")
  dateAdded   DateTime @default(now()) @map("date_added")

  user        User     @relation(fields: [userId], references: [id])
  location    Location @relation(fields: [locationId], references: [id])

  @@unique([userId, locationId]) // Prevent duplicate subscriptions
  @@map("subscription")
}
```

### Route Structure
- `GET /subscriptions` - List all user subscriptions
- `GET /subscriptions/add` - Select venues to subscribe
- `POST /subscriptions/add` - Store selections in session
- `GET /subscriptions/confirm` - Review selections before saving
- `POST /subscriptions/confirm` - Save subscriptions to database
- `GET /subscriptions/success` - Success confirmation

---

## Implementation Steps

### 1. Module Structure
```bash
libs/subscriptions/
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma
└── src/
    ├── index.ts
    ├── config.ts
    ├── pages/
    │   ├── list-subscriptions.ts
    │   ├── list-subscriptions.njk
    │   ├── add-subscription.ts
    │   ├── add-subscription.njk
    │   ├── confirm-subscription.ts
    │   ├── confirm-subscription.njk
    │   ├── subscription-success.ts
    │   └── subscription-success.njk
    ├── services/
    │   └── subscription-service.ts
    └── locales/
        ├── en.ts
        └── cy.ts
```

### 2. Database Service Layer

**File**: `libs/subscriptions/src/services/subscription-service.ts`

```typescript
import { prisma } from "@hmcts/postgres";

export async function getUserSubscriptions(userId: string) {
  return prisma.subscription.findMany({
    where: { userId },
    include: { location: true },
    orderBy: { dateAdded: 'desc' }
  });
}

export async function checkSubscriptionExists(userId: string, locationId: string) {
  const existing = await prisma.subscription.findUnique({
    where: {
      userId_locationId: { userId, locationId }
    }
  });
  return !!existing;
}

export async function createSubscriptions(userId: string, locationIds: string[]) {
  // Filter out duplicates
  const newLocationIds: string[] = [];
  for (const locationId of locationIds) {
    const exists = await checkSubscriptionExists(userId, locationId);
    if (!exists) {
      newLocationIds.push(locationId);
    }
  }

  // Bulk create
  return prisma.subscription.createMany({
    data: newLocationIds.map(locationId => ({
      userId,
      locationId
    })),
    skipDuplicates: true
  });
}

export async function deleteSubscription(subscriptionId: string, userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, userId }
  });

  if (!subscription) {
    throw new Error("Subscription not found or unauthorized");
  }

  return prisma.subscription.delete({
    where: { id: subscriptionId }
  });
}
```

### 3. Page 1: List Subscriptions

**Controller**: `libs/subscriptions/src/pages/list-subscriptions.ts`

```typescript
import type { Request, Response } from "express";
import { getUserSubscriptions } from "../services/subscription-service.js";

export const GET = async (req: Request, res: Response) => {
  const userId = req.session.userId;

  if (!userId || !req.session.isVerifiedUser) {
    return res.redirect("/sign-in");
  }

  const subscriptions = await getUserSubscriptions(userId);

  res.render("subscriptions/list-subscriptions", {
    subscriptions,
    hasSubscriptions: subscriptions.length > 0
  });
};
```

**Template**: `libs/subscriptions/src/pages/list-subscriptions.njk`

```html
{% extends "layouts/default.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/table/macro.njk" import govukTable %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-full">
    <h1 class="govuk-heading-l">{{ t('subscriptions.list.title') }}</h1>

    {{ govukButton({
      text: t('subscriptions.list.addButton'),
      href: "/subscriptions/add"
    }) }}

    {% if not hasSubscriptions %}
      <p class="govuk-body">{{ t('subscriptions.list.noSubscriptions') }}</p>
    {% else %}
      {{ govukTable({
        head: [
          { text: t('subscriptions.list.tableHeaders.courtName') },
          { text: t('subscriptions.list.tableHeaders.dateAdded') },
          { text: t('subscriptions.list.tableHeaders.actions') }
        ],
        rows: subscriptions | map(sub => [
          { text: sub.location.name },
          { text: sub.dateAdded | date('DD MMM YYYY') },
          { html: '<a href="/subscriptions/remove/' + sub.id + '" class="govuk-link">' + t('subscriptions.list.removeLink') + '</a>' }
        ])
      }) }}
    {% endif %}
  </div>
</div>
{% endblock %}
```

### 4. Page 2: Add Subscription (Venue Selection)

**Controller**: `libs/subscriptions/src/pages/add-subscription.ts`

```typescript
import type { Request, Response } from "express";
import { prisma } from "@hmcts/postgres";

export const GET = async (req: Request, res: Response) => {
  const userId = req.session.userId;

  if (!userId || !req.session.isVerifiedUser) {
    return res.redirect("/sign-in");
  }

  // Get all available locations
  const locations = await prisma.location.findMany({
    orderBy: { name: 'asc' }
  });

  res.render("subscriptions/add-subscription", {
    locations,
    selectedLocationIds: req.session.selectedLocationIds || [],
    errors: req.session.errors || {}
  });

  delete req.session.errors;
};

export const POST = async (req: Request, res: Response) => {
  const { locationIds } = req.body;
  const userId = req.session.userId;

  if (!userId || !req.session.isVerifiedUser) {
    return res.redirect("/sign-in");
  }

  // Validation: At least one location must be selected
  if (!locationIds || locationIds.length === 0) {
    req.session.errors = {
      locationIds: { text: t('subscriptions.add.errors.required') }
    };
    return res.redirect("/subscriptions/add");
  }

  // Store selections in session
  req.session.selectedLocationIds = Array.isArray(locationIds) ? locationIds : [locationIds];

  return res.redirect("/subscriptions/confirm");
};
```

**Template**: `libs/subscriptions/src/pages/add-subscription.njk`

```html
{% extends "layouts/default.njk" %}
{% from "govuk/components/checkboxes/macro.njk" import govukCheckboxes %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">

    {% if errors %}
      {{ govukErrorSummary({
        titleText: t('errors.summaryTitle'),
        errorList: errors | errorList
      }) }}
    {% endif %}

    <form method="post" novalidate>
      <h1 class="govuk-heading-l">{{ t('subscriptions.add.title') }}</h1>

      {{ govukCheckboxes({
        name: "locationIds",
        fieldset: {
          legend: {
            text: t('subscriptions.add.searchLabel'),
            classes: "govuk-fieldset__legend--m"
          }
        },
        items: locations | map(location => {
          value: location.id,
          text: location.name,
          checked: location.id in selectedLocationIds
        }),
        errorMessage: errors.locationIds
      }) }}

      {{ govukButton({
        text: t('common.continue')
      }) }}
    </form>
  </div>
</div>
{% endblock %}
```

### 5. Page 3: Confirm Subscriptions

**Controller**: `libs/subscriptions/src/pages/confirm-subscription.ts`

```typescript
import type { Request, Response } from "express";
import { prisma } from "@hmcts/postgres";

export const GET = async (req: Request, res: Response) => {
  const userId = req.session.userId;
  const selectedLocationIds = req.session.selectedLocationIds || [];

  if (!userId || !req.session.isVerifiedUser) {
    return res.redirect("/sign-in");
  }

  if (selectedLocationIds.length === 0) {
    return res.redirect("/subscriptions/add");
  }

  // Fetch location details
  const locations = await prisma.location.findMany({
    where: { id: { in: selectedLocationIds } }
  });

  res.render("subscriptions/confirm-subscription", {
    locations,
    errors: req.session.errors || {}
  });

  delete req.session.errors;
};

export const POST = async (req: Request, res: Response) => {
  const { action, removeLocationId } = req.body;
  const userId = req.session.userId;

  if (!userId || !req.session.isVerifiedUser) {
    return res.redirect("/sign-in");
  }

  // Handle remove action
  if (action === "remove" && removeLocationId) {
    const selectedLocationIds = req.session.selectedLocationIds || [];
    req.session.selectedLocationIds = selectedLocationIds.filter(
      id => id !== removeLocationId
    );

    // Check if any remain
    if (req.session.selectedLocationIds.length === 0) {
      req.session.errors = {
        general: { text: t('subscriptions.confirm.errors.atLeastOne') }
      };
    }

    return res.redirect("/subscriptions/confirm");
  }

  // Handle add another action
  if (action === "addAnother") {
    return res.redirect("/subscriptions/add");
  }

  // Handle continue - save subscriptions
  const selectedLocationIds = req.session.selectedLocationIds || [];

  if (selectedLocationIds.length === 0) {
    req.session.errors = {
      general: { text: t('subscriptions.confirm.errors.atLeastOne') }
    };
    return res.redirect("/subscriptions/confirm");
  }

  // Save to database
  await createSubscriptions(userId, selectedLocationIds);

  // Clear session
  delete req.session.selectedLocationIds;

  return res.redirect("/subscriptions/success");
};
```

**Template**: `libs/subscriptions/src/pages/confirm-subscription.njk`

```html
{% extends "layouts/default.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">

    {% if errors.general %}
      {{ govukErrorSummary({
        titleText: t('errors.thereIsAProblem'),
        errorList: [errors.general]
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
            <li class="govuk-!-margin-bottom-2">
              {{ location.name }}
              <button type="submit" name="action" value="remove" formaction="/subscriptions/confirm" class="govuk-link govuk-!-margin-left-2" style="background:none;border:none;padding:0;cursor:pointer;">
                <input type="hidden" name="removeLocationId" value="{{ location.id }}">
                {{ t('subscriptions.confirm.removeLink') }}
              </button>
            </li>
          {% endfor %}
        </ul>

        <p class="govuk-body">
          <button type="submit" name="action" value="addAnother" class="govuk-link" style="background:none;border:none;padding:0;cursor:pointer;">
            {{ t('subscriptions.confirm.addAnotherLink') }}
          </button>
        </p>

        {{ govukButton({
          text: t('common.continue')
        }) }}
      </form>

    {% endif %}
  </div>
</div>
{% endblock %}
```

### 6. Page 4: Success Confirmation

**Controller**: `libs/subscriptions/src/pages/subscription-success.ts`

```typescript
import type { Request, Response } from "express";

export const GET = async (_req: Request, res: Response) => {
  res.render("subscriptions/subscription-success");
};
```

**Template**: `libs/subscriptions/src/pages/subscription-success.njk`

```html
{% extends "layouts/default.njk" %}
{% from "govuk/components/panel/macro.njk" import govukPanel %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">

    {{ govukPanel({
      titleText: t('subscriptions.success.title')
    }) }}

    <p class="govuk-body">{{ t('subscriptions.success.whatNext.intro') }}</p>

    <ul class="govuk-list govuk-list--bullet">
      <li>
        <a href="/subscriptions/add" class="govuk-link">{{ t('subscriptions.success.whatNext.addNew') }}</a>
      </li>
      <li>
        <a href="/subscriptions" class="govuk-link">{{ t('subscriptions.success.whatNext.manage') }}</a>
      </li>
      <li>
        <a href="/hearing-lists/find-court" class="govuk-link">{{ t('subscriptions.success.whatNext.findCourt') }}</a>
      </li>
    </ul>
  </div>
</div>
{% endblock %}
```

### 7. Localization Files

**English**: `libs/subscriptions/src/locales/en.ts`

```typescript
export const en = {
  subscriptions: {
    list: {
      title: "Your email subscriptions",
      addButton: "Add email subscription",
      noSubscriptions: "You do not have any active subscriptions.",
      tableHeaders: {
        courtName: "Court or tribunal name",
        dateAdded: "Date added",
        actions: "Actions"
      },
      removeLink: "Remove"
    },
    add: {
      title: "Subscribe by court or tribunal name",
      searchLabel: "Search for a court or tribunal",
      errors: {
        required: "Select at least one court or tribunal"
      }
    },
    confirm: {
      title: "Confirm your email subscriptions",
      removeLink: "Remove",
      addAnotherLink: "Add another subscription",
      addButton: "Add subscription",
      errors: {
        atLeastOne: "At least one subscription is needed"
      }
    },
    success: {
      title: "Subscription confirmation",
      whatNext: {
        intro: "To continue, you can go to your account in order to:",
        addNew: "add a new email subscription",
        manage: "manage your current email subscriptions",
        findCourt: "find a court or tribunal"
      }
    }
  }
};
```

**Welsh**: `libs/subscriptions/src/locales/cy.ts`

```typescript
export const cy = {
  subscriptions: {
    list: {
      title: "Eich tanysgrifiadau e-bost",
      addButton: "Ychwanegu tanysgrifiad e-bost",
      noSubscriptions: "Nid oes gennych unrhyw danysgrifiadau gweithredol.",
      tableHeaders: {
        courtName: "Enw'r llys neu'r tribiwnlys",
        dateAdded: "Dyddiad ychwanegu",
        actions: "Camau gweithredu"
      },
      removeLink: "Tynnu"
    },
    add: {
      title: "Tanysgrifio yn ôl enw llys neu dribiwnlys",
      searchLabel: "Chwilio am lys neu dribiwnlys",
      errors: {
        required: "Dewiswch o leiaf un llys neu dribiwnlys"
      }
    },
    confirm: {
      title: "Cadarnhewch eich tanysgrifiadau e-bost",
      removeLink: "Tynnu",
      addAnotherLink: "Ychwanegu tanysgrifiad arall",
      addButton: "Ychwanegu tanysgrifiad",
      errors: {
        atLeastOne: "Mae angen o leiaf un tanysgrifiad"
      }
    },
    success: {
      title: "Cadarnhad tanysgrifiad",
      whatNext: {
        intro: "I barhau, gallwch fynd i'ch cyfrif er mwyn:",
        addNew: "ychwanegu tanysgrifiad e-bost newydd",
        manage: "rheoli eich tanysgrifiadau e-bost cyfredol",
        findCourt: "dod o hyd i lys neu dribiwnlys"
      }
    }
  }
};
```

---

## Testing Strategy

### Unit Tests
- `subscription-service.test.ts`: Test CRUD operations, duplicate prevention
- Test authorization (only verified users can subscribe)
- Test session management for multi-step flow

### E2E Tests
```typescript
test.describe("Email subscription flow", () => {
  test("should add subscriptions successfully", async ({ page }) => {
    await signInAsVerifiedUser(page);
    await page.goto("/subscriptions");

    await page.click('button:has-text("Add email subscription")');
    await page.check('input[value="location-1"]');
    await page.check('input[value="location-2"]');
    await page.click('button:has-text("Continue")');

    await expect(page.locator("h1")).toContainText("Confirm your email subscriptions");
    await page.click('button:has-text("Continue")');

    await expect(page.locator("h1")).toContainText("Subscription confirmation");
  });

  test("should prevent removing all selections", async ({ page }) => {
    await navigateToConfirmPage(page, ["location-1"]);

    await page.click('button:has-text("Remove")');

    await expect(page.locator(".govuk-error-summary")).toContainText("At least one subscription is needed");
  });

  test("should prevent duplicate subscriptions", async ({ page }) => {
    // Test database constraint and service-level prevention
  });
});
```

---

## Dependencies

- `@hmcts/postgres` - Database access
- `@hmcts/auth` - User authentication
- `@hmcts/i18n` - Translation support
- GOV.UK Frontend components
- Session store for multi-step form

---

## Security Considerations

1. **Authorization**: Only verified media users can create subscriptions
2. **Duplicate Prevention**: Database unique constraint + service-level checks
3. **Session Security**: Protect session data, clear after submission
4. **CSRF Protection**: Ensure CSRF tokens on all POST forms

---

## Estimated Effort

- Database schema: 2 hours
- Service layer: 3 hours
- Page 1 (List): 2 hours
- Page 2 (Add): 3 hours
- Page 3 (Confirm): 4 hours (complex removal logic)
- Page 4 (Success): 1 hour
- Localization: 2 hours
- Unit tests: 3 hours
- E2E tests: 3 hours
- Accessibility testing: 2 hours

**Total: ~25 hours**
