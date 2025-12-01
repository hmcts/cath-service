# VIBE-228: Implementation Plan - Approve Media Application

## Architecture Overview

This feature extends the media-admin module (created in VIBE-229) with approval-specific functionality. It shares the dashboard, list page, and applicant details page with the rejection flow.

### Module Structure
```
libs/media-admin/
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma              # MediaApplication model (shared)
└── src/
    ├── config.ts                   # Module configuration
    ├── index.ts                    # Business logic exports
    ├── pages/
    │   ├── admin/
    │   │   ├── dashboard.ts        # Shared with VIBE-229
    │   │   ├── dashboard.njk       # Shared with VIBE-229
    │   │   ├── media-requests/
    │   │   │   ├── index.ts        # List page (shared)
    │   │   │   ├── index.njk       # List template (shared)
    │   │   │   ├── [id].ts         # Applicant details (shared)
    │   │   │   ├── [id].njk        # Details template (shared)
    │   │   │   ├── [id]/
    │   │   │   │   ├── approve.ts      # NEW - Confirmation page
    │   │   │   │   ├── approve.njk     # NEW - Confirmation template
    │   │   │   │   ├── approved.ts     # NEW - Success page
    │   │   │   │   ├── approved.njk    # NEW - Success template
    │   │   │   │   ├── reject.ts       # VIBE-229
    │   │   │   │   ├── reject.njk      # VIBE-229
    │   │   │   │   ├── rejected.ts     # VIBE-229
    │   │   │   │   └── rejected.njk    # VIBE-229
    ├── locales/
    │   ├── en.ts                   # Shared translations
    │   └── cy.ts                   # Shared translations
    ├── media-application/
    │   ├── queries.ts              # Database access (shared, extended)
    │   ├── approval-service.ts     # NEW - Approval business logic
    │   ├── rejection-service.ts    # VIBE-229
    │   ├── validation.ts           # Input validation (shared)
    │   └── file-cleanup.ts         # File deletion (shared)
    ├── user/
    │   ├── creation-service.ts     # NEW - User account creation
    │   └── queries.ts              # NEW - User database access
    ├── notification/
    │   ├── notify-client.ts        # NEW - Gov.Notify wrapper
    │   └── email-templates.ts      # NEW - Email template IDs
    └── admin-auth-middleware.ts    # CTSC Admin auth (shared)
```

## Integration with VIBE-229

### Shared Components
1. **Dashboard** (`/admin/dashboard`)
   - Shows pending count for both approvals and rejections
   - Single dashboard for all admin actions

2. **Media Requests List** (`/admin/media-requests`)
   - Lists all pending applications
   - Single entry point for review

3. **Applicant Details** (`/admin/media-requests/{id}`)
   - Shows full application details
   - Displays both "Approve" and "Reject" buttons
   - Routes to respective flows

4. **Database Schema**
   - MediaApplication model supports both flows
   - Status enum: PENDING | APPROVED | REJECTED

5. **Authentication**
   - Same CTSC Admin middleware
   - Shared authorization logic

6. **File Management**
   - Shared file cleanup service
   - Press ID deletion on both approve/reject

### Approval-Specific Components
1. **Approval Confirmation Page** (new)
2. **Approval Success Page** (new)
3. **User Account Creation** (new)
4. **Approval Email Service** (new)

## Database Schema

### MediaApplication (shared with VIBE-229)
```prisma
model MediaApplication {
  id                  String   @id @default(uuid()) @map("id") @db.Uuid
  firstName           String   @map("first_name") @db.VarChar(255)
  surname             String   @db.VarChar(255)
  email               String   @db.VarChar(255)
  organization        String   @db.VarChar(255)
  pressIdFilePath     String   @map("press_id_file_path") @db.VarChar(500)
  status              String   @db.VarChar(20)
  submittedAt         DateTime @default(now()) @map("submitted_at")
  processedAt         DateTime? @map("processed_at")
  processedBy         String?  @map("processed_by") @db.Uuid
  languagePreference  String   @default("EN") @map("language_preference") @db.VarChar(2)

  @@map("media_application")
  @@index([status])
  @@index([submittedAt])
}
```

### User (extends existing schema)
```prisma
model User {
  userId             String         @id @default(uuid()) @map("user_id") @db.Uuid
  email              String         @db.VarChar(255)
  firstName          String?        @map("first_name") @db.VarChar(255)
  surname            String?        @db.VarChar(255)
  userProvenance     String         @map("user_provenance") @db.VarChar(20)
  userProvenanceId   String         @unique @map("user_provenance_id") @db.VarChar(255)
  role               String         @db.VarChar(20)
  createdDate        DateTime       @default(now()) @map("created_date")
  lastSignedInDate   DateTime?      @map("last_signed_in_date")

  subscriptions Subscription[]

  @@map("user")
  @@index([email])
  @@index([role])
}
```

## Implementation Details

### 1. Approval Confirmation Page Controller

**File:** `libs/media-admin/src/pages/admin/media-requests/[id]/approve.ts`

```typescript
import type { Request, Response } from "express";
import { findMediaApplicationById } from "../../../../media-application/queries.js";

const en = {
  title: "Approve media account application",
  heading: "Are you sure you want to approve this application?",
  applicantDetails: "Applicant details",
  yes: "Yes, approve this application",
  no: "No, go back",
  continue: "Continue",
  back: "Back to applicant details"
};

const cy = {
  title: "Cymeradwyo cais am gyfrif y cyfryngau",
  heading: "Ydych chi'n siŵr eich bod am gymeradwyo'r cais hwn?",
  applicantDetails: "Manylion yr ymgeisydd",
  yes: "Iawn, cymeradwyo'r cais hwn",
  no: "Na, mynd yn ôl",
  continue: "Parhau",
  back: "Nôl i fanylion yr ymgeisydd"
};

export const GET = async (req: Request, res: Response) => {
  const applicationId = req.params.id;

  const application = await findMediaApplicationById(applicationId);

  if (!application) {
    return res.status(404).render("errors/404");
  }

  if (application.status !== "PENDING") {
    req.flash("error", "This application has already been processed");
    return res.redirect(`/admin/media-requests/${applicationId}`);
  }

  res.render("admin/media-requests/[id]/approve", {
    en,
    cy,
    application
  });
};

export const POST = async (req: Request, res: Response) => {
  const applicationId = req.params.id;
  const { confirm } = req.body;

  if (confirm === "no") {
    return res.redirect(`/admin/media-requests/${applicationId}`);
  }

  if (confirm !== "yes") {
    const application = await findMediaApplicationById(applicationId);
    return res.render("admin/media-requests/[id]/approve", {
      en,
      cy,
      application,
      errors: {
        confirm: { text: "Select yes to approve or no to go back" }
      }
    });
  }

  try {
    await approveApplication(applicationId, req.user.userId);
    res.redirect(`/admin/media-requests/${applicationId}/approved`);
  } catch (error) {
    req.flash("error", "Failed to approve application. Please try again.");
    return res.redirect(`/admin/media-requests/${applicationId}`);
  }
};
```

### 2. Approval Success Page Controller

**File:** `libs/media-admin/src/pages/admin/media-requests/[id]/approved.ts`

```typescript
import type { Request, Response } from "express";
import { findMediaApplicationById } from "../../../../media-application/queries.js";

const en = {
  title: "Application approved",
  banner: "Application has been approved",
  heading: "Application approved",
  body: "The applicant has been sent an email with login instructions.",
  applicantDetails: "Applicant details",
  viewAll: "View all media requests",
  returnDashboard: "Return to dashboard"
};

const cy = {
  title: "Cais wedi'i gymeradwyo",
  banner: "Mae'r cais wedi'i gymeradwyo",
  heading: "Cais wedi'i gymeradwyo",
  body: "Mae'r ymgeisydd wedi cael e-bost gyda chyfarwyddiadau mewngofnodi.",
  applicantDetails: "Manylion yr ymgeisydd",
  viewAll: "Gweld pob cais cyfryngau",
  returnDashboard: "Dychwelyd i'r dangosfwrdd"
};

export const GET = async (req: Request, res: Response) => {
  const applicationId = req.params.id;

  const application = await findMediaApplicationById(applicationId);

  if (!application) {
    return res.status(404).render("errors/404");
  }

  if (application.status !== "APPROVED") {
    return res.redirect(`/admin/media-requests/${applicationId}`);
  }

  res.render("admin/media-requests/[id]/approved", {
    en,
    cy,
    application
  });
};
```

### 3. Approval Service

**File:** `libs/media-admin/src/media-application/approval-service.ts`

```typescript
import { prisma } from "@hmcts/postgres";
import { createMediaUser } from "../user/creation-service.js";
import { sendApprovalEmail } from "../notification/notify-client.js";
import { deleteFile } from "./file-cleanup.js";

export async function approveApplication(applicationId: string, adminUserId: string) {
  return prisma.$transaction(async (tx) => {
    const application = await tx.mediaApplication.findUnique({
      where: { id: applicationId }
    });

    if (!application) {
      throw new Error("Application not found");
    }

    if (application.status !== "PENDING") {
      throw new Error("Application has already been processed");
    }

    const existingUser = await tx.user.findFirst({
      where: { email: application.email }
    });

    if (existingUser) {
      throw new Error("A user with this email already exists");
    }

    const user = await createMediaUser(
      {
        email: application.email,
        firstName: application.firstName,
        surname: application.surname
      },
      tx
    );

    await tx.mediaApplication.update({
      where: { id: applicationId },
      data: {
        status: "APPROVED",
        processedAt: new Date(),
        processedBy: adminUserId
      }
    });

    await deleteFile(application.pressIdFilePath);

    await sendApprovalEmail({
      email: application.email,
      firstName: application.firstName,
      surname: application.surname,
      language: application.languagePreference
    });

    return user;
  });
}
```

### 4. User Creation Service

**File:** `libs/media-admin/src/user/creation-service.ts`

```typescript
import type { PrismaClient } from "@prisma/client";

export async function createMediaUser(
  userData: CreateMediaUserData,
  prismaClient: PrismaClient
) {
  return prismaClient.user.create({
    data: {
      email: userData.email,
      firstName: userData.firstName,
      surname: userData.surname,
      userProvenance: "SSO",
      userProvenanceId: userData.email,
      role: "MEDIA",
      createdDate: new Date()
    }
  });
}

type CreateMediaUserData = {
  email: string;
  firstName: string;
  surname: string;
};
```

### 5. Gov.Notify Client

**File:** `libs/media-admin/src/notification/notify-client.ts`

```typescript
import { NotifyClient } from "notifications-node-client";
import config from "config";
import { MEDIA_APPROVED_EN, MEDIA_APPROVED_CY } from "./email-templates.js";

const notifyClient = new NotifyClient(config.get("govNotify.apiKey"));

export async function sendApprovalEmail(data: ApprovalEmailData) {
  const templateId = data.language === "CY" ? MEDIA_APPROVED_CY : MEDIA_APPROVED_EN;

  try {
    await notifyClient.sendEmail(templateId, data.email, {
      personalisation: {
        firstName: data.firstName,
        surname: data.surname,
        loginUrl: `${config.get("serviceUrl")}/login`,
        serviceName: config.get("serviceName")
      }
    });
  } catch (error) {
    console.error("Failed to send approval email:", error);
    throw error;
  }
}

type ApprovalEmailData = {
  email: string;
  firstName: string;
  surname: string;
  language: string;
};
```

**File:** `libs/media-admin/src/notification/email-templates.ts`

```typescript
export const MEDIA_APPROVED_EN = process.env.NOTIFY_TEMPLATE_MEDIA_APPROVED_EN || "";
export const MEDIA_APPROVED_CY = process.env.NOTIFY_TEMPLATE_MEDIA_APPROVED_CY || "";
export const MEDIA_REJECTED_EN = process.env.NOTIFY_TEMPLATE_MEDIA_REJECTED_EN || "";
export const MEDIA_REJECTED_CY = process.env.NOTIFY_TEMPLATE_MEDIA_REJECTED_CY || "";
```

### 6. File Cleanup Service (shared with VIBE-229)

**File:** `libs/media-admin/src/media-application/file-cleanup.ts`

```typescript
import fs from "node:fs/promises";
import path from "node:path";

export async function deleteFile(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error(`Failed to delete file ${filePath}:`, error);
  }
}
```

### 7. Media Application Queries (extended)

**File:** `libs/media-admin/src/media-application/queries.ts`

```typescript
import { prisma } from "@hmcts/postgres";

export async function findMediaApplicationById(id: string) {
  return prisma.mediaApplication.findUnique({
    where: { id }
  });
}

export async function findPendingMediaApplications() {
  return prisma.mediaApplication.findMany({
    where: { status: "PENDING" },
    orderBy: { submittedAt: "desc" }
  });
}

export async function countPendingMediaApplications() {
  return prisma.mediaApplication.count({
    where: { status: "PENDING" }
  });
}
```

## Nunjucks Templates

### Approval Confirmation Template

**File:** `libs/media-admin/src/pages/admin/media-requests/[id]/approve.njk`

```html
{% extends "layouts/default.njk" %}
{% from "govuk/components/radios/macro.njk" import govukRadios %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/summary-list/macro.njk" import govukSummaryList %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">

    {% if errors %}
      {{ govukErrorSummary({
        titleText: "There is a problem",
        errorList: [
          {
            text: errors.confirm.text,
            href: "#confirm"
          }
        ]
      }) }}
    {% endif %}

    <h1 class="govuk-heading-l">{{ heading }}</h1>

    <h2 class="govuk-heading-m">{{ applicantDetails }}</h2>

    {{ govukSummaryList({
      rows: [
        {
          key: { text: "Name" },
          value: { text: application.firstName + " " + application.surname }
        },
        {
          key: { text: "Email" },
          value: { text: application.email }
        },
        {
          key: { text: "Organization" },
          value: { text: application.organization }
        }
      ]
    }) }}

    <form method="post" novalidate>
      {{ govukRadios({
        name: "confirm",
        fieldset: {
          legend: {
            text: heading,
            isPageHeading: false,
            classes: "govuk-visually-hidden"
          }
        },
        items: [
          {
            value: "yes",
            text: yes
          },
          {
            value: "no",
            text: no
          }
        ],
        errorMessage: errors.confirm if errors
      }) }}

      {{ govukButton({
        text: continue
      }) }}
    </form>

    <p class="govuk-body">
      <a href="/admin/media-requests/{{ application.id }}" class="govuk-link">{{ back }}</a>
    </p>

  </div>
</div>
{% endblock %}
```

### Approval Success Template

**File:** `libs/media-admin/src/pages/admin/media-requests/[id]/approved.njk`

```html
{% extends "layouts/default.njk" %}
{% from "govuk/components/panel/macro.njk" import govukPanel %}
{% from "govuk/components/summary-list/macro.njk" import govukSummaryList %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">

    {{ govukPanel({
      titleText: banner,
      classes: "govuk-panel--confirmation"
    }) }}

    <p class="govuk-body">{{ body }}</p>

    <h2 class="govuk-heading-m">{{ applicantDetails }}</h2>

    {{ govukSummaryList({
      rows: [
        {
          key: { text: "Name" },
          value: { text: application.firstName + " " + application.surname }
        },
        {
          key: { text: "Email" },
          value: { text: application.email }
        },
        {
          key: { text: "Organization" },
          value: { text: application.organization }
        }
      ]
    }) }}

    <p class="govuk-body">
      <a href="/admin/media-requests" class="govuk-link">{{ viewAll }}</a>
    </p>

    <p class="govuk-body">
      <a href="/admin/dashboard" class="govuk-link">{{ returnDashboard }}</a>
    </p>

  </div>
</div>
{% endblock %}
```

## Configuration

### Environment Variables

```bash
# Gov.Notify
NOTIFY_API_KEY=your_notify_api_key
NOTIFY_TEMPLATE_MEDIA_APPROVED_EN=template_id_for_english
NOTIFY_TEMPLATE_MEDIA_APPROVED_CY=template_id_for_welsh
NOTIFY_TEMPLATE_MEDIA_REJECTED_EN=template_id_for_english
NOTIFY_TEMPLATE_MEDIA_REJECTED_CY=template_id_for_welsh

# Service URLs
SERVICE_URL=https://your-service-url.gov.uk
SERVICE_NAME=Court and tribunal hearings
```

### Module Package.json

**File:** `libs/media-admin/package.json`

```json
{
  "name": "@hmcts/media-admin",
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
  "dependencies": {
    "notifications-node-client": "8.2.0"
  },
  "peerDependencies": {
    "express": "^5.1.0"
  }
}
```

## Testing Strategy

### Unit Tests

**File:** `libs/media-admin/src/media-application/approval-service.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { approveApplication } from "./approval-service.js";
import { prisma } from "@hmcts/postgres";

vi.mock("@hmcts/postgres");
vi.mock("../user/creation-service.js");
vi.mock("../notification/notify-client.js");
vi.mock("./file-cleanup.js");

describe("approveApplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should approve application and create user", async () => {
    const mockApplication = {
      id: "app-123",
      email: "test@example.com",
      firstName: "John",
      surname: "Doe",
      status: "PENDING",
      pressIdFilePath: "/tmp/press-id.pdf",
      languagePreference: "EN"
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return callback({
        mediaApplication: {
          findUnique: vi.fn().mockResolvedValue(mockApplication),
          update: vi.fn().mockResolvedValue({ ...mockApplication, status: "APPROVED" })
        },
        user: {
          findFirst: vi.fn().mockResolvedValue(null)
        }
      });
    });

    await approveApplication("app-123", "admin-123");

    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("should throw error if application already processed", async () => {
    const mockApplication = {
      id: "app-123",
      status: "APPROVED"
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return callback({
        mediaApplication: {
          findUnique: vi.fn().mockResolvedValue(mockApplication)
        }
      });
    });

    await expect(approveApplication("app-123", "admin-123")).rejects.toThrow(
      "Application has already been processed"
    );
  });

  it("should throw error if user email already exists", async () => {
    const mockApplication = {
      id: "app-123",
      email: "existing@example.com",
      status: "PENDING"
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return callback({
        mediaApplication: {
          findUnique: vi.fn().mockResolvedValue(mockApplication)
        },
        user: {
          findFirst: vi.fn().mockResolvedValue({ userId: "user-456" })
        }
      });
    });

    await expect(approveApplication("app-123", "admin-123")).rejects.toThrow(
      "A user with this email already exists"
    );
  });
});
```

### E2E Tests

**File:** `e2e-tests/media-admin/approve-application.spec.ts`

```typescript
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Approve Media Application", () => {
  test.beforeEach(async ({ page }) => {
    // Login as CTSC Admin
    await page.goto("/admin/login");
    // ... authentication steps
  });

  test("should display approval confirmation page", async ({ page }) => {
    await page.goto("/admin/media-requests");
    await page.click("text=Review application");
    await page.click("text=Approve");

    await expect(page).toHaveURL(/\/admin\/media-requests\/.*\/approve/);
    await expect(page.locator("h1")).toContainText("Are you sure you want to approve");
  });

  test("should approve application successfully", async ({ page }) => {
    await page.goto("/admin/media-requests/test-app-123/approve");

    await page.check('input[value="yes"]');
    await page.click("text=Continue");

    await expect(page).toHaveURL(/\/admin\/media-requests\/.*\/approved/);
    await expect(page.locator(".govuk-panel")).toContainText("Application has been approved");
  });

  test("should return to details when selecting no", async ({ page }) => {
    await page.goto("/admin/media-requests/test-app-123/approve");

    await page.check('input[value="no"]');
    await page.click("text=Continue");

    await expect(page).toHaveURL(/\/admin\/media-requests\/test-app-123$/);
  });

  test("should show error when no option selected", async ({ page }) => {
    await page.goto("/admin/media-requests/test-app-123/approve");

    await page.click("text=Continue");

    await expect(page.locator(".govuk-error-summary")).toContainText("There is a problem");
  });

  test("should be accessible", async ({ page }) => {
    await page.goto("/admin/media-requests/test-app-123/approve");

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("should display Welsh content", async ({ page }) => {
    await page.goto("/admin/media-requests/test-app-123/approve?lng=cy");

    await expect(page.locator("h1")).toContainText("Ydych chi'n siŵr eich bod am gymeradwyo");
  });
});
```

## Error Handling

### Error Scenarios

1. **Application Not Found**
   - Check exists before rendering
   - Return 404 page

2. **Application Already Processed**
   - Check status is PENDING
   - Flash error and redirect

3. **Email Already Exists**
   - Database constraint will catch
   - Show user-friendly error

4. **File Deletion Fails**
   - Log but don't block
   - Queue for cleanup job

5. **Email Send Fails**
   - Log with full details
   - Mark application approved
   - Queue for retry

## Welsh Language Support

### Translation Files

**File:** `libs/media-admin/src/locales/en.ts`

```typescript
export default {
  common: {
    back: "Back",
    continue: "Continue",
    yes: "Yes",
    no: "No"
  },
  approve: {
    title: "Approve media account application",
    heading: "Are you sure you want to approve this application?",
    applicantDetails: "Applicant details",
    yesOption: "Yes, approve this application",
    noOption: "No, go back",
    backLink: "Back to applicant details"
  },
  approved: {
    title: "Application approved",
    banner: "Application has been approved",
    heading: "Application approved",
    body: "The applicant has been sent an email with login instructions.",
    viewAll: "View all media requests",
    returnDashboard: "Return to dashboard"
  }
};
```

**File:** `libs/media-admin/src/locales/cy.ts`

```typescript
export default {
  common: {
    back: "Nôl",
    continue: "Parhau",
    yes: "Iawn",
    no: "Na"
  },
  approve: {
    title: "Cymeradwyo cais am gyfrif y cyfryngau",
    heading: "Ydych chi'n siŵr eich bod am gymeradwyo'r cais hwn?",
    applicantDetails: "Manylion yr ymgeisydd",
    yesOption: "Iawn, cymeradwyo'r cais hwn",
    noOption: "Na, mynd yn ôl",
    backLink: "Nôl i fanylion yr ymgeisydd"
  },
  approved: {
    title: "Cais wedi'i gymeradwyo",
    banner: "Mae'r cais wedi'i gymeradwyo",
    heading: "Cais wedi'i gymeradwyo",
    body: "Mae'r ymgeisydd wedi cael e-bost gyda chyfarwyddiadau mewngofnodi.",
    viewAll: "Gweld pob cais cyfryngau",
    returnDashboard: "Dychwelyd i'r dangosfwrdd"
  }
};
```

## Dependencies

### New Dependencies
- `notifications-node-client` (8.2.0) - Gov.Notify client

### Peer Dependencies
- `express` (^5.1.0)

### Internal Dependencies
- `@hmcts/postgres` - Database access
- `@hmcts/auth` - Admin authentication
- `@hmcts/web-core` - GOV.UK Frontend integration

## Deployment Considerations

1. **Database Migration**
   - Run migrations before deployment
   - MediaApplication table created in VIBE-229

2. **Environment Variables**
   - Set Gov.Notify API key
   - Configure email template IDs
   - Set service URL

3. **File Storage**
   - Ensure temp directory configured
   - Set up cleanup cron job

4. **Gov.Notify Templates**
   - Create templates in Gov.Notify dashboard
   - Get template IDs
   - Test with real emails

## Monitoring and Logging

### Key Metrics
- Approval success rate
- Email send success rate
- Average approval time
- File deletion errors

### Log Points
- Application approval started
- User account created
- Email sent successfully
- File deleted
- Errors at each step

### Alerts
- Email send failures > 5%
- File deletion failures
- Database transaction failures

## Success Criteria

1. CTSC Admin can approve media applications
2. User accounts created with correct role
3. Approval emails sent reliably
4. Press ID files deleted
5. All pages WCAG 2.2 AA compliant
6. Welsh translations accurate
7. Test coverage >80%
8. E2E tests pass
9. Integration with VIBE-229 works seamlessly
