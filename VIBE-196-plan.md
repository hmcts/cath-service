# VIBE-196 — Technical Implementation Plan

> Ticket: VIBE-196 — Verified User – Unsubscribe
> Updated: 21 Nov 2025

---

## Overview

Implement unsubscribe functionality for verified users to remove email subscriptions for court/tribunal hearing notifications. The feature includes three pages: subscription list, confirmation dialog, and success confirmation.

---

## Technical Approach

### Architecture
- **Module**: New subscription management module at `libs/subscriptions/`
- **Pages**: Three controller/template pairs for the unsubscribe flow
- **Database**: Extend existing subscription schema with soft delete or row removal
- **Auth**: Verify user owns subscription before allowing deletion

### Database Schema

Assuming existing `subscription` table structure:
```prisma
model Subscription {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  courtId     String   @map("court_id")
  createdAt   DateTime @default(now()) @map("created_at")

  user        User     @relation(fields: [userId], references: [id])
  court       Court    @relation(fields: [courtId], references: [id])

  @@unique([userId, courtId])
  @@map("subscription")
}
```

### Route Structure
- `GET /subscriptions` - List all user subscriptions
- `GET /subscriptions/unsubscribe/:id` - Confirmation page
- `POST /subscriptions/unsubscribe/:id` - Process deletion
- `GET /subscriptions/removed` - Success confirmation

---

## Implementation Steps

### 1. Create Subscription Module Structure
```bash
libs/subscriptions/
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma (if needed)
└── src/
    ├── index.ts (business logic exports)
    ├── config.ts (page/route paths)
    ├── pages/
    │   ├── list-subscriptions.ts
    │   ├── list-subscriptions.njk
    │   ├── unsubscribe-confirm.ts
    │   ├── unsubscribe-confirm.njk
    │   ├── unsubscribe-success.ts
    │   └── unsubscribe-success.njk
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
    include: { court: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getSubscriptionById(subscriptionId: string, userId: string) {
  return prisma.subscription.findFirst({
    where: { id: subscriptionId, userId },
    include: { court: true }
  });
}

export async function deleteSubscription(subscriptionId: string, userId: string) {
  // Verify ownership before deletion
  const subscription = await getSubscriptionById(subscriptionId, userId);
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
  const userId = req.session.userId; // Assuming session-based auth

  if (!userId) {
    return res.redirect("/sign-in");
  }

  const subscriptions = await getUserSubscriptions(userId);

  res.render("subscriptions/list-subscriptions", {
    subscriptions,
    currentPage: "subscriptions"
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
      href: "/subscriptions/add",
      classes: "govuk-!-margin-bottom-4"
    }) }}

    {% if subscriptions.length > 0 %}
      {{ govukTable({
        head: [
          { text: t('subscriptions.list.tableHeaders.courtName') },
          { text: t('subscriptions.list.tableHeaders.dateAdded') },
          { text: t('subscriptions.list.tableHeaders.actions') }
        ],
        rows: subscriptions | map(sub => [
          { text: sub.court.name },
          { text: sub.createdAt | date('DD MMM YYYY') },
          { html: '<a href="/subscriptions/unsubscribe/' + sub.id + '" class="govuk-link">' + t('subscriptions.list.unsubscribeLink') + '</a>' }
        ])
      }) }}
    {% else %}
      <p class="govuk-body">{{ t('subscriptions.list.noSubscriptions') }}</p>
    {% endif %}
  </div>
</div>
{% endblock %}
```

### 4. Page 2: Unsubscribe Confirmation

**Controller**: `libs/subscriptions/src/pages/unsubscribe-confirm.ts`

```typescript
import type { Request, Response } from "express";
import { getSubscriptionById, deleteSubscription } from "../services/subscription-service.js";

export const GET = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.session.userId;

  if (!userId) {
    return res.redirect("/sign-in");
  }

  const subscription = await getSubscriptionById(id, userId);

  if (!subscription) {
    return res.redirect("/subscriptions");
  }

  res.render("subscriptions/unsubscribe-confirm", {
    subscription,
    errors: req.session.errors || {},
    data: req.session.formData || {}
  });

  delete req.session.errors;
  delete req.session.formData;
};

export const POST = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { confirmation } = req.body;
  const userId = req.session.userId;

  if (!userId) {
    return res.redirect("/sign-in");
  }

  // Validation
  if (!confirmation) {
    req.session.errors = {
      confirmation: { text: t('subscriptions.unsubscribe.errors.required') }
    };
    req.session.formData = req.body;
    return res.redirect(`/subscriptions/unsubscribe/${id}`);
  }

  if (confirmation === "no") {
    return res.redirect("/subscriptions");
  }

  // Delete subscription
  try {
    await deleteSubscription(id, userId);
    return res.redirect("/subscriptions/removed");
  } catch (error) {
    req.session.errors = {
      general: { text: t('subscriptions.unsubscribe.errors.deleteFailed') }
    };
    return res.redirect(`/subscriptions/unsubscribe/${id}`);
  }
};
```

**Template**: `libs/subscriptions/src/pages/unsubscribe-confirm.njk`

```html
{% extends "layouts/default.njk" %}
{% from "govuk/components/radios/macro.njk" import govukRadios %}
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
      {{ govukRadios({
        name: "confirmation",
        fieldset: {
          legend: {
            text: t('subscriptions.unsubscribe.title'),
            isPageHeading: true,
            classes: "govuk-fieldset__legend--l"
          }
        },
        items: [
          {
            value: "yes",
            text: t('common.yes'),
            checked: data.confirmation === "yes"
          },
          {
            value: "no",
            text: t('common.no'),
            checked: data.confirmation === "no"
          }
        ],
        errorMessage: errors.confirmation
      }) }}

      {{ govukButton({
        text: t('common.continue')
      }) }}
    </form>
  </div>
</div>
{% endblock %}
```

### 5. Page 3: Success Confirmation

**Controller**: `libs/subscriptions/src/pages/unsubscribe-success.ts`

```typescript
import type { Request, Response } from "express";

export const GET = async (_req: Request, res: Response) => {
  res.render("subscriptions/unsubscribe-success");
};
```

**Template**: `libs/subscriptions/src/pages/unsubscribe-success.njk`

```html
{% extends "layouts/default.njk" %}
{% from "govuk/components/panel/macro.njk" import govukPanel %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">

    {{ govukPanel({
      titleText: t('subscriptions.removed.title'),
      html: t('subscriptions.removed.message')
    }) }}

    <p class="govuk-body">{{ t('subscriptions.removed.whatNext.intro') }}</p>

    <ul class="govuk-list govuk-list--bullet">
      <li>
        <a href="/subscriptions/add" class="govuk-link">{{ t('subscriptions.removed.whatNext.addNew') }}</a>
      </li>
      <li>
        <a href="/subscriptions" class="govuk-link">{{ t('subscriptions.removed.whatNext.manage') }}</a>
      </li>
      <li>
        <a href="/courts" class="govuk-link">{{ t('subscriptions.removed.whatNext.findCourt') }}</a>
      </li>
    </ul>
  </div>
</div>
{% endblock %}
```

### 6. Localization Files

**English**: `libs/subscriptions/src/locales/en.ts`

```typescript
export const en = {
  subscriptions: {
    list: {
      title: "Your email subscriptions",
      addButton: "Add email subscription",
      tableHeaders: {
        courtName: "Court or tribunal name",
        dateAdded: "Date added",
        actions: "Actions"
      },
      unsubscribeLink: "Unsubscribe",
      noSubscriptions: "You have no email subscriptions."
    },
    unsubscribe: {
      title: "Are you sure you want to remove this subscription?",
      errors: {
        required: "Select yes or no",
        deleteFailed: "We could not remove this subscription. Please try again."
      }
    },
    removed: {
      title: "Subscriptions removed",
      message: "Your subscription has been removed",
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
      tableHeaders: {
        courtName: "Enw'r llys neu'r tribiwnlys",
        dateAdded: "Dyddiad ychwanegu",
        actions: "Camau"
      },
      unsubscribeLink: "Dad-danysgrifio",
      noSubscriptions: "Nid oes gennych unrhyw danysgrifiadau e-bost."
    },
    unsubscribe: {
      title: "Ydych chi'n siŵr eich bod am dynnu'r tanysgrifiad hwn?",
      errors: {
        required: "Dewiswch ie neu na",
        deleteFailed: "Ni allem dynnu'r tanysgrifiad hwn. Rhowch gynnig arall arni."
      }
    },
    removed: {
      title: "Tanysgrifiadau wedi'u tynnu",
      message: "Mae eich tanysgrifiad wedi'i dynnu",
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

### 7. Module Configuration

**File**: `libs/subscriptions/src/config.ts`

```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pageRoutes = { path: path.join(__dirname, "pages") };
export const prismaSchemas = path.join(__dirname, "../prisma");
```

### 8. Register Module in Web App

**File**: `apps/web/src/app.ts`

```typescript
import { pageRoutes as subscriptionPages } from "@hmcts/subscriptions/config";

// Register routes
app.use(await createSimpleRouter(subscriptionPages));
```

### 9. URL Mapping

Update route configuration to map:
- `/subscriptions` → `list-subscriptions.ts`
- `/subscriptions/unsubscribe/:id` → `unsubscribe-confirm.ts`
- `/subscriptions/removed` → `unsubscribe-success.ts`

---

## Testing Strategy

### Unit Tests
- `subscription-service.test.ts`: Test CRUD operations
- Test authorization (user can only delete own subscriptions)
- Test edge cases (subscription not found, invalid ID)

### E2E Tests
```typescript
// e2e-tests/subscriptions/unsubscribe.spec.ts
test.describe("Unsubscribe flow", () => {
  test("should unsubscribe from a subscription", async ({ page }) => {
    // Setup: Create user with subscription
    await signIn(page);
    await page.goto("/subscriptions");

    // Click unsubscribe
    await page.click('a:has-text("Unsubscribe")').first();
    expect(page.url()).toContain("/subscriptions/unsubscribe/");

    // Confirm removal
    await page.check('input[value="yes"]');
    await page.click('button:has-text("Continue")');

    // Verify success
    await expect(page.locator("h1")).toContainText("Subscriptions removed");
  });

  test("should show validation error when no selection made", async ({ page }) => {
    await signIn(page);
    await navigateToUnsubscribe(page);

    await page.click('button:has-text("Continue")');

    await expect(page.locator(".govuk-error-summary")).toBeVisible();
    await expect(page.locator(".govuk-error-message")).toContainText("Select yes or no");
  });

  test("should cancel unsubscribe when No selected", async ({ page }) => {
    await signIn(page);
    await navigateToUnsubscribe(page);

    await page.check('input[value="no"]');
    await page.click('button:has-text("Continue")');

    expect(page.url()).toBe("/subscriptions");
  });
});
```

### Accessibility Tests
- Test keyboard navigation through all three pages
- Verify error summary focus management
- Test with screen reader (NVDA/JAWS)
- Verify table headers and ARIA labels

---

## Dependencies

- `@hmcts/postgres` - Database access
- `@hmcts/auth` - User authentication middleware
- `@hmcts/i18n` - Translation support
- GOV.UK Frontend components

---

## Security Considerations

1. **Authorization**: Verify user owns subscription before deletion
2. **CSRF Protection**: Ensure CSRF tokens on POST forms
3. **Input Validation**: Validate subscription ID format
4. **Session Security**: Protect session data from tampering

---

## Rollout Plan

1. Create feature branch `feature/VIBE-196-verified-user-unsubscribe`
2. Implement database service layer with tests
3. Implement pages sequentially with unit tests
4. Add E2E tests for complete flow
5. Manual QA testing (EN and CY)
6. Accessibility audit
7. Code review
8. Merge to main and deploy

---

## Open Questions

1. Should we soft-delete subscriptions (add `deletedAt` field) or hard-delete?
2. What happens if user has no subscriptions? Show empty state or redirect?
3. Should we send a confirmation email after unsubscribe?
4. Do we need audit logging for subscription deletions?

---

## Estimated Effort

- Database schema/service: 2 hours
- Page 1 (List): 2 hours
- Page 2 (Confirm): 2 hours
- Page 3 (Success): 1 hour
- Localization: 1 hour
- Unit tests: 2 hours
- E2E tests: 2 hours
- Accessibility testing: 1 hour

**Total: ~13 hours**
