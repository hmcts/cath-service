# HMCTS Monorepo AI Development Guide

## Core Development Commands

```bash
# Development
yarn dev                        # Start all services concurrently

# Testing
yarn test                       # Run all tests across workspaces
yarn test:e2e                   # Playwright E2E tests
yarn test:coverage              # Generate coverage report

# Code Quality
yarn lint:fix                    # Run Biome linter
yarn format                     # Format code with Biome

# Git Hooks (installed automatically via postinstall)
# Pre-commit hook runs Biome --write on all staged files and re-stages fixes.
# To skip the hook for a single commit: LEFTHOOK=0 git commit ...

# Database Operations
yarn db:migrate                 # Apply migrations  
yarn db:migrate:dev             # Auto apply migrations, add new migrations if necessary
yarn db:generate                # Generate the Prisma client
yarn db:studio                  # Open Prisma Studio
yarn db:drop                    # Drop all tables and reset the database
```

## Ticket Documentation

When working on GitHub issues, use the QK commands to manage planning and implementation:

```bash
/qk-plan 312       # Create technical plan for issue #312
/qk-implement 312  # Implement following the plan
/qk-review 312     # Review the implementation
```

These commands create documentation in `docs/tickets/<issue-number>/`:
- `ticket.md` - Fetched issue details
- `plan.md` - Technical implementation plan
- `tasks.md` - Implementation checklist
- `review.md` - Code review feedback

**Note:** Use plain GitHub issue numbers (e.g., `312`), not JIRA prefixes. Legacy `VIBE-*` folders are from the previous JIRA era.

## Naming Conventions (STRICT - MUST FOLLOW)

### 1. Database Tables and Fields
- **MUST be singular and snake_case**: `user`, `case`, `created_at`
- Use Prisma `@@map` and `@map` for aliases
```prisma
model Case {
  id         String   @id @default(cuid())
  caseNumber String   @unique @map("case_number")
  createdAt  DateTime @default(now()) @map("created_at")
  
  @@map("case")
}
```

### 2. TypeScript Variables
- Use camelCase: `userId`, `caseDetails`, `documentId`
- Booleans with `is/has/can`: `isActive`, `hasAccess`, `canEdit`

### 3. Classes and Interfaces
- Use PascalCase: `UserService`, `CaseRepository`
- NO `I` prefix: `UserRepository` not `IUserRepository`

### 4. Constants
- Use SCREAMING_SNAKE_CASE: `MAX_FILE_SIZE`, `DEFAULT_TIMEOUT`

### 5. Files and Directories
- Use kebab-case: `user-service.ts`, `case-management/`

### 6. API Endpoints
- Plural for collections: `/api/cases`, `/api/users`
- Singular for specific: `/api/case/:id`
- Singular for creation: `POST /api/case`

### 7. Package Names
- Use @hmcts scope: `@hmcts/auth`, `@hmcts/case-management`

### 8. Module Ordering
- consts outside the scope of a function should be at the top (e.g. `const COOKIE_NAME = "cookie_name";`)
- Exported functions should next
- Other functions should be ordered in the order they are used
- Interfaces and types should be at the bottom

## Module Development Guidelines

### Module Registration System

The web and API applications use explicit imports to register modules, enabling turborepo to properly track dependencies and optimize builds. Each module exports standardized interfaces for different types of functionality.

### Creating a New Feature Module

1. **Create module structure**:
```bash
mkdir -p libs/my-feature/src/routes           # API routes (optional)
mkdir -p libs/my-feature/src/locales          # Shared translation files (optional)
mkdir -p libs/my-feature/src/views            # Shared templates (optional)
mkdir -p libs/my-feature/src/assets/css       # Module styles (optional)
mkdir -p libs/my-feature/src/assets/js        # Module scripts (optional)

# Pages live in apps, not libs
mkdir -p apps/web/src/pages/my-feature-page   # Page controllers, templates, and content
```

2. **Create src/config.ts for module configuration**:
```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Module configuration for asset bundling and template discovery
export const moduleRoot = __dirname;
export const assets = path.join(__dirname, "assets/");
export const apiRoutes = { path: path.join(__dirname, "routes") }; // Only if you have API routes
```

**Create src/index.ts for business logic exports**:
```typescript
// Business logic exports only
export * from "./my-feature/service.js";

// Only export page content if it's truly shared/reusable across multiple pages
// Most page content should be co-located with controllers in apps/web/src/pages/
// Example of shared content export (like accessibility-statement, cookie-policy):
// export { cy as sharedPageCy } from "./locales/shared-page/cy.js";
// export { en as sharedPageEn } from "./locales/shared-page/en.js";
```

**IMPORTANT - Content Location Strategy**: 
- **Pages (controllers, templates, content)** live in `apps/web/src/pages/`
- **Co-locate cy.ts/en.ts with controllers** - this is the default pattern for page-specific content
- **Export from libs only for shared content** - when the same content is reused by multiple pages (e.g., accessibility-statement, cookie-policy)
- **Config exports** (moduleRoot, assets, apiRoutes) are in `config.ts` for asset bundling and template discovery
- **Apps import config** using the `/config` path (e.g., `@hmcts/my-feature/config`)

3. **Package.json requirements**:
```json
{
  "name": "@hmcts/my-feature",
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
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "format": "biome format --write .",
    "lint": "biome check .",
    "lint:fix": "biome check --write ."
  }
}
```

**Note**: Page templates (.njk files) are now in `apps/web/src/pages/` and are handled by the web app's build process, not the lib's build.

3. **Create tsconfig.json**:
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
4. **Register module in root tsconfig.json**:
```json
{
  "compilerOptions": {
    "paths": {
      // ... existing paths ...
      "@hmcts/my-feature": ["libs/my-feature/src"]
    }
  }
}
```

5. **Register module in applications**:

```typescript
// apps/web/src/app.ts
import { moduleRoot as myFeatureModuleRoot } from "@hmcts/my-feature/config";

// Add module to modulePaths for Nunjucks template discovery
const modulePaths = [
  __dirname,
  webCoreModuleRoot,
  myFeatureModuleRoot,
  // ... other modules
];

await configureGovuk(app, modulePaths, { /* options */ });

// Pages are auto-discovered from apps/web/src/pages/ - no manual registration needed
// Just create your page at apps/web/src/pages/my-feature-page/index.ts

// apps/web/vite.config.ts
import { assets as myFeatureAssets } from "@hmcts/my-feature/config";
const baseConfig = createBaseViteConfig([
  path.join(__dirname, "src"),
  myFeatureAssets  // Only if your lib has assets
]);

// apps/api/src/app.ts (only if you have API routes)
import { apiRoutes as myFeatureRoutes } from "@hmcts/my-feature/config";
app.use(await createSimpleRouter(myFeatureRoutes));
```

### Module Structure

```
libs/my-feature/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts               # Module configuration (moduleRoot, assets)
    ├── index.ts                # Business logic exports only
    ├── routes/                 # API routes (optional, auto-discovered)
    │   └── my-api.ts           # API route file
    ├── locales/                # Shared i18n translations (optional)
    │   ├── shared-page/        # Only if content is reused across pages
    │   │   ├── en.ts           # Shared English content
    │   │   └── cy.ts           # Shared Welsh content
    │   ├── en.ts               # Common English translations
    │   └── cy.ts               # Common Welsh translations
    ├── views/                  # Shared templates (optional)
    │   └── partials/
    └── assets/                 # Module assets (optional)
        ├── css/
        │   └── module.scss
        └── js/
            └── module.ts

apps/web/src/pages/
├── (auth)/                     # Route group (no URL prefix)
│   └── login/
│       ├── index.ts            # Controller
│       ├── index.njk           # Template
│       ├── cy.ts               # Welsh content (co-located)
│       ├── en.ts               # English content (co-located)
│       └── index.test.ts       # Tests
├── (core)/                     # Route group (no URL prefix)
│   └── accessibility-statement/
│       ├── index.ts            # Controller (imports from lib if shared)
│       └── index.njk           # Template
├── my-feature-page/            # Regular route (/my-feature-page)
│   ├── index.ts                # Controller
│   ├── index.njk               # Nunjucks template
│   ├── cy.ts                   # Welsh content (co-located - default pattern)
│   ├── en.ts                   # English content (co-located - default pattern)
│   └── index.test.ts           # Unit tests
└── admin/                      # Regular directory (/admin/*)
    └── dashboard/              # /admin/dashboard
        ├── index.ts
        ├── index.njk
        ├── cy.ts               # Co-located content
        └── en.ts               # Co-located content
```

**Architecture Notes**:
- **Route Groups**: Directories with parentheses like `(auth)` organize code without affecting URLs
- **Regular Directories**: Directories like `admin/` create URL prefixes (`/admin/*`)
- **Content Co-location (Default)**: cy.ts/en.ts live alongside controllers in `apps/web/src/pages/` for page-specific content
- **Shared Content (Exception)**: Only export cy.ts/en.ts from libs when content is reused across multiple pages
- **Auto-Discovery**: All pages in `apps/web/src/pages/` are automatically registered
- **Example**: `apps/web/src/pages/my-feature-page/index.ts` becomes `/my-feature-page`
- **Nested Routes**: Use subdirectories (e.g., `admin/dashboard/` becomes `/admin/dashboard`)

## Database Schema Management

All Prisma schemas are centralized in **`libs/postgres-prisma/prisma/schema/`** with one file per feature domain.

### Schema Organization

```
libs/postgres-prisma/
├── prisma.config.ts            # Points to prisma/schema directory
└── prisma/
    └── schema/                 # All .prisma files live here
        ├── base.prisma         # Datasource and generator config
        ├── audit-log.prisma    # Audit log models
        ├── location.prisma     # Location models
        ├── subscription.prisma # Subscription models
        └── ...                 # One file per domain
```

### Adding a New Schema File

1. **Create feature schema file** in `libs/postgres-prisma/prisma/schema/`:

```prisma
// libs/postgres-prisma/prisma/schema/my-feature.prisma

model MyFeature {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("my_feature")
}
```

2. **Run Prisma generate** to update the client:

```bash
yarn db:generate
```

### Schema Naming Conventions

- **File names**: kebab-case (`audit-log.prisma`, `list-search-config.prisma`)
- **Models**: PascalCase (`User`, `CaseDocument`)
- **Tables**: singular snake_case via `@@map("user")`
- **Fields**: camelCase in code, snake_case in DB via `@map`

### Using the Prisma Client

```typescript
import { prisma } from "@hmcts/postgres-prisma";

// All models from all schema files are available
const user = await prisma.user.findUnique({ where: { id } });
const location = await prisma.location.findMany();
```

### Important Notes

- **Never create `prisma/` directories in feature modules** - all schemas go in `libs/postgres-prisma/prisma/schema/`
- **Prisma automatically merges** all `.prisma` files in the schema directory
- **One schema per domain** keeps models organized and maintainable
- **Migrations apply to all schemas** - run `yarn db:migrate:dev` from the root

### Page Controller Pattern

**Default Pattern: Co-located Content** (use this for most pages)
```typescript
// apps/web/src/pages/my-page/index.ts
import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const GET = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  
  res.render("my-page/index", { en, cy, t });
};

export const POST = async (req: Request, res: Response) => {
  res.redirect("/success");
};
```

**Content files co-located with controller**:
```typescript
// apps/web/src/pages/my-page/cy.ts
export const cy = {
  title: "Teitl y Dudalen",
  heading: "Pennawd"
};

// apps/web/src/pages/my-page/en.ts
export const en = {
  title: "Page Title",
  heading: "Heading"
};
```

**Alternative Pattern: Shared Content from Libs** (only for reusable pages)
```typescript
// apps/web/src/pages/(core)/accessibility-statement/index.ts
import type { Request, Response } from "express";
import { accessibilityStatementCy, accessibilityStatementEn } from "@hmcts/web-core";

export const GET = async (_req: Request, res: Response) => {
  res.render("accessibility-statement/index", {
    en: accessibilityStatementEn,
    cy: accessibilityStatementCy
  });
};
```

**When content is shared across pages, export from lib**:
```typescript
// libs/web-core/src/locales/accessibility-statement/cy.ts
export const cy = { title: "Datganiad Hygyrchedd", /* ... */ };

// libs/web-core/src/locales/accessibility-statement/en.ts
export const en = { title: "Accessibility Statement", /* ... */ };

// libs/web-core/src/index.ts
export { cy as accessibilityStatementCy } from "./locales/accessibility-statement/cy.js";
export { en as accessibilityStatementEn } from "./locales/accessibility-statement/en.js";
```

### Nunjucks Template Pattern

```html
<!-- apps/web/src/pages/my-page/index.njk -->
{% extends "layouts/base-template.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">
    
    {% if errors %}
      {{ govukErrorSummary({
        titleText: errorSummaryTitle,
        errorList: errors
      }) }}
    {% endif %}

    <form method="post" novalidate>
      {{ govukInput({
        id: "email",
        name: "email",
        type: "email",
        autocomplete: "email",
        label: {
          text: emailLabel
        },
        errorMessage: errors.email,
        value: data.email
      }) }}

      {{ govukButton({
        text: continueButtonText
      }) }}
    </form>

  </div>
</div>
{% endblock %}
```

### Content Organization

**Shared/Common Content** (goes in locale files libs/[module]/src/locales/en.ts and cy.ts):
- Common button text (Back, Continue, Submit)
- Phase banner text
- Service name
- Common error messages
- Content used by multiple pages

**Page-Specific Content** (goes in en.ts and cy.ts files next to controllers):
- Page titles
- Section headings
- Body text
- Lists specific to that page
- Contact details specific to that page
- Any content unique to that page

### Welsh Language Support

Every page must support both English and Welsh:

1. **In Controllers**: Provide both `en` and `cy` objects with page content
2. **In Templates**: Use the current language data automatically selected by the i18n middleware
3. **In Locale Files**: Maintain the same structure between en.ts and cy.ts
4. **Testing**: Always test pages with `?lng=cy` query parameter to verify Welsh content

### Express Middleware Pattern

Reusable middleware should be placed in a dedicated `libs/[module]/src/[middleware-name]-middleware.ts` file and exported as a function:

```typescript
// libs/auth/src/authenticate-middleware.ts
import type { Request, Response, NextFunction } from 'express';

export function authenticate() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Authentication logic
      next();
    } catch (error) {
      res.status(401).render('errors/401');
    }
  };
}
```

## List Type Implementation

The `list_type` table uses an autoincrement `id` column. These IDs are assigned at insert time and **differ between environments** (local, STG, production). Any code that compares against a numeric `listTypeId` will break on environments where the seed order differs.

### Rule: Always use `listTypeName`, never `listTypeId`

The `name` column is `@unique` and stable across all environments. Use it for all list type guards and routing logic.

**Wrong — breaks on STG/production:**
```typescript
const MY_LIST_TYPE_ID = 42;

if (artefact.listTypeId !== MY_LIST_TYPE_ID) {
  res.status(400).render("errors/common", { ... });
  return;
}
```

**Correct — works everywhere:**
```typescript
const SUPPORTED_LIST_TYPE = "MY_LIST_TYPE_NAME";

if (artefact.listTypeName !== SUPPORTED_LIST_TYPE) {
  res.status(400).render("errors/common", { ... });
  return;
}
```

### `listTypeName` is only populated by `getArtefactById`

`getArtefactsByLocation` and `getArtefactsByIds` do NOT perform the `listType` join. Only `getArtefactById` returns `ArtefactWithListType` (with `listTypeName` guaranteed non-null). When you need `listTypeName`, ensure the artefact comes from `getArtefactById`.

```typescript
// ArtefactWithListType guarantees listTypeName is a string
import type { ArtefactWithListType } from "@hmcts/publication";
```

### Court names and other list-type-specific strings must come from locale files

Do not hardcode display strings (court names, page titles, etc.) in controllers. Hardcoded English strings will not change when the locale switches to Welsh.

**Wrong:**
```typescript
courtName: "Upper Tribunal (Immigration and Asylum) Chamber"
```

**Correct — add to both `en.ts` and `cy.ts` in the lib's locale files:**
```typescript
// libs/my-list-type/src/locales/en.ts
export const en = {
  courtName: "Upper Tribunal (Immigration and Asylum) Chamber",
  ...
};

// libs/my-list-type/src/locales/cy.ts
export const cy = {
  courtName: "[WELSH TRANSLATION REQUIRED: 'Upper Tribunal (Immigration and Asylum) Chamber']",
  ...
};

// controller
const t = locale === "cy" ? cy : en;
courtName: t.courtName as string
```

### Multi-list-type handlers

When a single controller handles several list types (e.g. RCJ, administrative court), use `createMultiListGuardAndRender` with a string-keyed `LIST_TYPE_CONFIG`. Do not include an `id`→`name` mapping — the guard reads `artefact.listTypeName` directly.

```typescript
const LIST_TYPE_CONFIG: ListTypeConfig = {
  MY_LIST_TYPE_A: { en: en.pageTitleA, cy: cy.pageTitleA, template: "template-a" },
  MY_LIST_TYPE_B: { en: en.pageTitleB, cy: cy.pageTitleB, template: "template-b" }
};

const { guardArtefact, render } = createMultiListGuardAndRender({
  en, cy,
  listTypeConfig: LIST_TYPE_CONFIG,
  renderFn,
  resolveTemplate: (c) => c.template
});
```

### Test fixtures must not rely on specific numeric IDs

Use `listTypeId: 999` (or any arbitrary value) in test artefact fixtures to prove the logic is ID-independent. The `listTypeName` field drives all routing.

```typescript
const mockArtefact = {
  listTypeId: 999,               // arbitrary — must not affect behaviour
  listTypeName: "MY_LIST_TYPE",  // this is what matters
  ...
};
```

### Implementing a new list type — checklist

Every new list type MUST follow these rules. Never use `ListType.id` (numeric) anywhere.

**1. PDF generator — use `listTypeName`, not `listTypeId`**

The PDF generator interface must accept `listTypeName: string`, not a numeric ID:

```typescript
// libs/my-list-type/src/pdf/pdf-generator.ts
interface PdfGenerationOptions extends BasePdfGenerationOptions<MyHearingList> {
  contentDate: Date;
  listTypeName: string;   // ✅ string name, never a numeric ID
}

const LIST_TITLE_MAP: Record<string, string> = {
  MY_LIST_TYPE_NAME: "My List Type Display Title"
};

export async function generateMyListTypePdf(options: PdfGenerationOptions) {
  const listTitle = LIST_TITLE_MAP[options.listTypeName] || "Default Title";
  // ...
}
```

**2. Register the PDF generator by name in `service.ts`**

Add to `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts` using the string `listTypeName` as key:

```typescript
const PDF_GENERATOR_REGISTRY: Partial<Record<string, PdfGenerator>> = {
  // ...existing entries...
  MY_LIST_TYPE_NAME: (p) => generateMyListTypePdf({ ...p, jsonData: p.jsonData as MyHearingList }),
};
```

**3. Register the Excel converter by name**

Use `registerConverterByName` — never reference a numeric ID:

```typescript
// libs/my-list-type/src/conversion/my-config.ts
registerConverterByName("MY_LIST_TYPE_NAME", createConverter(MY_EXCEL_CONFIG));
```

**4. Prisma queries — filter by name, never by id**

When querying artefacts for a specific list type, use the `listType` relation filter:

```typescript
// ✅ Correct — stable across environments
await prisma.artefact.findMany({
  where: { listType: { name: { in: ["MY_LIST_TYPE_NAME"] } } }
});

// ❌ Wrong — numeric ID differs per environment
await prisma.artefact.findMany({
  where: { listTypeId: { in: [42] } }
});
```

**5. Never reference `ListType.id` in code comments or JSDoc**

Comments that mention numeric IDs (e.g. `// listTypeId: 42`) will rot as environments diverge. Use the stable name instead:

```typescript
// ✅ Correct
/** Used by: MY_LIST_TYPE_NAME */

// ❌ Wrong
/** Used by list type ID 42 */
```

**6. Schema validation is MANDATORY for every new list type**

Every list type that accepts JSON uploads MUST have:

- A JSON schema file at `libs/list-types/<name>/src/schemas/<name>.json`
- A `validate*` wrapper at `libs/list-types/<name>/src/validation/json-validator.ts`
- The wrapper exported from `libs/list-types/<name>/src/index.ts`
- A test file at `libs/list-types/<name>/src/validation/json-validator.test.ts`

A CI guard test at `libs/list-types/common/src/validation/guard.test.ts` **will fail** if any package ships a schema without a `validate*` export. Fix the guard failure before merging.

**Validator wrapper pattern** (use `createJsonValidator` from `@hmcts/list-types-common`):

```typescript
// libs/list-types/my-list-type/src/validation/json-validator.ts
import { createJsonValidator, type ValidationResult } from "@hmcts/list-types-common";
import { schemaPath } from "../config.js";

export function validateMyListType(jsonData: unknown): ValidationResult {
  return createJsonValidator(schemaPath)(jsonData);
}
```

Export from `index.ts`:

```typescript
export { validateMyListType } from "./validation/json-validator.js";
```

**Test file pattern** — real schema execution, no mocks, one `it` per required field at every nesting level:

```typescript
// libs/list-types/my-list-type/src/validation/json-validator.test.ts
import { describe, expect, it } from "vitest";
import { validateMyListType } from "./json-validator.js";

// Fully-hydrated fixture — satisfies ALL required arrays at EVERY nesting level.
// Read the schema before writing this; missing a nested required field will cause
// the valid-data test to fail with a confusing schema error.
const VALID_DATA = [
  {
    topLevelField: "value",
    nestedObject: {
      requiredNestedField: "value",
      deeplyNested: [
        {
          deepField: "value"
        }
      ]
    }
  }
];

describe("validateMyListType", () => {
  it("should return valid when all required fields are present", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));

    // Act
    const result = validateMyListType(data);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // One test per required field — top-level and nested.
  // Use JSON.parse(JSON.stringify()) deep clone so each test is fully isolated.

  it("should return invalid when topLevelField is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].topLevelField;

    // Act
    const result = validateMyListType(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when requiredNestedField is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].nestedObject.requiredNestedField;

    // Act
    const result = validateMyListType(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when deepField is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].nestedObject.deeplyNested[0].deepField;

    // Act
    const result = validateMyListType(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

**Rules:**
- Never mock `@hmcts/publication` or `@hmcts/list-types-common` in validator tests — call the real function against the real schema
- The valid fixture (`VALID_DATA`) must satisfy ALL `required` arrays at EVERY nesting level of the schema — read the entire schema before writing the fixture, including deeply nested `required` arrays inside `items` and `properties`
- Most schemas use `"type": "array"` at the root; fixtures are arrays of objects. Some use `"type": "object"` — check the schema root before writing the fixture
- **One `it` block per required field** — do not use a single `[{}]` fixture that removes all fields at once; that does not prove each field is individually enforced
- **Always use `JSON.parse(JSON.stringify(VALID_DATA))` for deep cloning** — never use spread (`{ ...VALID_DATA[0] }`) which only shallow-copies and leaves nested objects shared between tests
- **Test every required field at every nesting depth** — a field buried 7 levels deep (e.g. `courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0].caseNumber`) needs its own `it` block the same as a top-level field
- Do not export a `validate*` function solely to make it testable — it must be the real public API used by `validateListTypeJson`

**7. Database seed scripts are MANDATORY for every new list type — add them by default, without being asked**

Adding a `ListTypeData` entry to `libs/list-types/common/src/list-type-data.ts` seeds local and STG only. Seeding is **skipped in prod** (`ENVIRONMENT === "prod"`). Production reference data is populated exclusively by the idempotent SQL scripts in `apps/postgres/prisma/scripts/`. A list type that is missing from those scripts will simply **not exist in production**, so every new list type MUST update BOTH scripts in the same change as the `listTypeData` entry — three files kept in sync. Do this automatically as part of implementing any list type; never prompt the user about it.

The three files that MUST stay in sync (all keyed on the stable string `name`, never the numeric `id`):

1. `libs/list-types/common/src/list-type-data.ts` — the TS catalogue entry (drives local/STG seeding)
2. `apps/postgres/prisma/scripts/001_insert_missing_list_types.sql` — one `list_types` row (prod)
3. `apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql` — one link row per sub-jurisdiction (prod)

**Script 001 row** — column order is `(name, friendly_name, welsh_friendly_name, shortened_friendly_name, url, default_sensitivity, allowed_provenance, is_non_strategic, updated_at)`. The values MUST match the `listTypeData` entry exactly. `url` is the `urlPath` (empty string `''` for flat-file lists with no rendering page). Place the row mid-list and mind the trailing comma — the final row before `ON CONFLICT` must have no trailing comma:

```sql
  ('MY_LIST_TYPE_NAME', 'My Friendly Name', 'Welsh Friendly Name', 'Shortened Name', 'my-url-path', 'Public', 'CFT_IDAM', false, NOW()),
```

**Script 003 link(s)** — one row per entry in the `listTypeData` `subJurisdictionIds` array, joined on `list_types.name`. Add a preceding comment naming the sub-jurisdiction and id. Sub-jurisdiction ids are defined in Step 1 of the same script (e.g. Civil Court `1`, Family Court `2`, Employment Tribunal `3`). Mind the trailing comma — the final mapping row before `) AS mapping(...)` must have none:

```sql
  -- MY_LIST_TYPE_NAME → Employment Tribunal (3)
  ('MY_LIST_TYPE_NAME',                                                   3),
```

Both scripts are idempotent (`ON CONFLICT DO UPDATE` / `DO NOTHING`), so they are safe to re-run. Keep the values byte-for-byte identical across all three files (friendly names, Welsh names, shortened name, sensitivity, provenance, `is_non_strategic`, sub-jurisdiction ids).

## Testing Strategy

- **Unit/Integration Tests**: Vitest, co-located with source (`*.test.ts`)
- **Template Tests**: Vitest with `@hmcts/test-support` render helpers (`*.njk.test.ts`)
- **E2E Tests**: Playwright in `e2e-tests/`
- **Accessibility Tests**: Axe-core with Playwright
- **Test Scripts**: All packages must use `"test": "vitest run"`
- **Coverage**: Aim for >80% on business logic

### Test File Pattern
```typescript
// user-service.test.ts (co-located with user-service.ts)
import { describe, it, expect, vi } from 'vitest';
import { UserService } from './user-service';

vi.mock('@hmcts/postgres', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    }
  }
}));

describe('UserService', () => {
  it('should find user by id', async () => {
    // Test implementation
  });
});
```

### E2E Testing with Playwright

#### CRITICAL: Minimize Test Count

**Create the minimum number of tests.** Each test should represent a complete end-to-end user journey. Do NOT create separate tests for individual validations, accessibility checks, or Welsh translations. Instead, include all validations, accessibility checks, and Welsh translations within the journey test itself.

**Key Principle:** One test per user journey, not one test per validation or feature.

✅ **Good - Minimum tests, each covering complete journey:**
```typescript
// One test for the subscription journey - includes validations, Welsh, accessibility
test('user can subscribe to updates @nightly', async ({ page }) => {
  await page.goto('/subscribe');

  // Test validation along the journey
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Enter your email')).toBeVisible();

  // Test Welsh translation along the journey
  await page.getByRole('link', { name: 'Cymraeg' }).click();
  await expect(page.getByText('Rhowch eich e-bost')).toBeVisible();

  // Test accessibility along the journey
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  // Complete the journey
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Subscription confirmed')).toBeVisible();
});

// Separate test only for a DIFFERENT user journey (e.g., unsubscribe)
test('user can unsubscribe @nightly', async ({ page }) => {
  await page.goto('/unsubscribe');
  // ... complete unsubscribe journey with validations, Welsh, accessibility
});
```

❌ **Bad - Too many separate tests:**
```typescript
test('shows validation error for email', async ({ page }) => { /* ... */ });
test('shows validation error for name', async ({ page }) => { /* ... */ });
test('Welsh translation works on subscribe page', async ({ page }) => { /* ... */ });
test('accessibility passes on subscribe page', async ({ page }) => { /* ... */ });
test('user completes subscription', async ({ page }) => { /* ... */ });
```

#### Test Organization

- Location: `e2e-tests/`
- Naming: `*.spec.ts`
- Tag nightly-only tests with `@nightly` in test title

#### What to Include in Each Journey Test
1. Complete user journey from start to finish
2. All relevant validation checks encountered in the journey
3. Welsh translation checks at key points
4. Accessibility checks at key points
5. Keyboard navigation where relevant
6. Successful completion of the journey

#### Example Pattern

```typescript
test('user can complete journey @nightly', async ({ page }) => {
  // 1. Test main journey
  await page.goto('/start');
  await page.getByRole('button', { name: 'Start now' }).click();

  // 2. Test Welsh
  await page.getByRole('link', { name: 'Cymraeg' }).click();
  expect(await page.getByRole('heading', { level: 1 })).toContainText('Dechrau nawr');

  // 3. Test accessibility inline
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);

  // 4. Test keyboard navigation
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');

  // 5. Continue journey...
});
```

#### Correct Selectors (Priority Order)

1. `getByRole()` - Preferred for accessibility
2. `getByLabel()` - For form inputs
3. `getByText()` - For specific text
4. `getByTestId()` - Last resort only

#### DO NOT Test

- Font sizes
- Background colors
- Margins/padding
- Any visual styling
- UI design aspects

#### Test Data Management

- Use global-setup.ts for reference data seeding
- Use test-specific data creation in tests
- Clean up test data in global-teardown.ts

#### Coverage Expectations

- E2E tests: Cover critical user journeys
- Accessibility: Test inline with journeys (not separately)

#### Running Tests

```bash
yarn test:e2e                   # Run E2E tests (excludes @nightly)
yarn test:e2e:all               # Run all E2E tests (including @nightly)
```

## Code Quality Standards

- **TypeScript**: Strict mode enabled, no `any` without justification
- **ES Modules**: Use `"type": "module"` in all package.json files
- **Express**: Version 5.x only (`"express": "5.2.0"`)
- **Imports**: Use workspace aliases (`@hmcts/*`)
  - **IMPORTANT**: Always add `.js` extension to relative imports (e.g., `import { foo } from "./bar.js"`)
  - This is required for ESM with Node.js "nodenext" module resolution
  - Applies even when importing TypeScript files (they compile to .js)
- **Linting**: Fix all Biome warnings before commit
- **No CommonJS**: Use `import`/`export`, never `require()`/`module.exports`
- **Pinned dependencies**: Specific versions only (`"express": "5.2.0"`) - except peer dependencies

## Security Requirements

- Input validation on all endpoints
- Parameterized database queries (Prisma)
- No sensitive data in logs

## Common Pitfalls to Avoid

1. **Don't put business logic in apps/** - Use libs/ modules
2. **Don't hardcode values** - Use environment variables
3. **Don't skip Welsh translations** - Required for all user-facing text
4. **Don't use CommonJS** - ES modules only
5. **Don't ignore TypeScript errors** - Fix or justify with comments
6. **Don't duplicate dependencies** - Check root package.json first
7. **Don't create circular dependencies** between modules
8. **Don't skip accessibility testing** - WCAG 2.2 AA is mandatory
9. **Don't commit secrets** - Use environment variables
10. **Don't use relative imports across packages** - Use @hmcts/* aliases
11. **Don't create types.ts files** - Colocate types with the appropriate code
12. **Don't create generic files like utils.ts** - Be specific (e.g., object-properties.ts, date-formatting.ts)
13. **Don't export functions in order to test them** - Only export functions that are intended to be used outside the module
14. **Don't add comments unless they are meaningful** - If necessary, explain why something is done, not what is done
15. **Don't hardcode `listTypeId` numeric values** - `ListType.id` is autoincrement and differs per environment. Always use `artefact.listTypeName` (the stable `@unique` string column). See [List Type Implementation](#list-type-implementation) below.
16. **Don't add a list type schema without a validator and tests** - Every `src/schemas/*.json` file requires a `src/validation/json-validator.ts` wrapper and a `src/validation/json-validator.test.ts`. The CI guard test in `libs/list-types/common` will fail if you don't. See [List Type Implementation](#list-type-implementation) item 6.

## Debugging Tips

1. **Module Loading**: Check imports in apps/*/src/app.ts
2. **Database Issues**: Enable Prisma logging with `DEBUG=prisma:query`
3. **Run commands from the root directory**: Run yarn test etc from the root directory

## Core Principles

* **YAGNI**: You Aren't Gonna Need It - Don't add speculative functionality or features. Always take the simplest approach. 
* **Functional style** favour a simple functional approach. Don't use a class unless you have shared state
* **KISS**: Keep It Simple, Stupid - Avoid unnecessary complexity. Write code that is easy to understand and maintain.
* **Immutable**: Data should be immutable by default. Use const and avoid mutations to ensure predictable state.
* **Side Effects**: Functions should have no side effects. Avoid modifying external state or relying on mutable data.
* **DRY**: Don't repeat yourself, factor out code used in multiple places.

## Communication Style

Be direct and straightforward. No cheerleading phrases like "that's absolutely right" or "great question." Tell the user when ideas are flawed, incomplete, or poorly thought through. Focus on practical problems and realistic solutions rather than being overly positive or encouraging.

Challenge assumptions, point out potential issues, and ask questions about implementation, scalability, and real-world viability. If something won't work, say so directly and explain why it has problems rather than just dismissing it.
