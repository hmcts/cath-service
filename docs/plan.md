# Technical Implementation Plan for VIBE-151: Find a single justice procedure case

## Executive Summary

This plan details the implementation of a Single Justice Procedure (SJP) case listing system with two distinct list types: public and press lists. The implementation follows the established HMCTS monorepo architecture with a focus on performance (30,000+ case capacity), accessibility (WCAG 2.2 AA), and bilingual support (English/Welsh).

## High-Level Architecture

### Module Structure
```
libs/sjp/                                    # New module for SJP functionality
├── package.json                              # Module package configuration
├── tsconfig.json                             # TypeScript configuration
├── prisma/
│   └── schema.prisma                         # SJP database schema
└── src/
    ├── index.ts                              # Business logic exports
    ├── config.ts                             # Module configuration (pageRoutes, prismaSchemas)
    ├── pages/                                # Page controllers and templates
    │   ├── sjp-selection.ts                  # Selection page controller
    │   ├── sjp-selection.njk                 # Selection page template
    │   ├── sjp-selection/
    │   │   ├── en.ts                         # English content
    │   │   └── cy.ts                         # Welsh content
    │   ├── sjp-public-list.ts                # Public list page controller
    │   ├── sjp-public-list.njk               # Public list page template
    │   ├── sjp-public-list/
    │   │   ├── en.ts
    │   │   └── cy.ts
    │   ├── sjp-press-list.ts                 # Press list page controller
    │   ├── sjp-press-list.njk                # Press list page template
    │   └── sjp-press-list/
    │       ├── en.ts
    │       └── cy.ts
    ├── sjp-service.ts                        # Core SJP business logic
    ├── sjp-service.test.ts                   # Service unit tests
    ├── postcode-validator.ts                 # UK postcode validation
    ├── postcode-validator.test.ts            # Postcode validation tests
    ├── sjp-filters.ts                        # Filter logic (search, postcode, prosecutor)
    ├── sjp-filters.test.ts                   # Filter tests
    ├── sjp-paginator.ts                      # Pagination logic
    └── sjp-paginator.test.ts                 # Pagination tests
```

## Implementation Phases

### Phase 1: Database Schema and Data Model

#### 1.1 Prisma Schema Design

Create `libs/sjp/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../../../node_modules/.prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Main SJP List metadata
model SjpList {
  listId        String   @id @default(uuid()) @map("list_id") @db.Uuid
  listType      String   @map("list_type") // "public" or "press"
  locationId    Int      @map("location_id")
  generatedAt   DateTime @map("generated_at")
  publishedAt   DateTime @map("published_at")
  contentDate   DateTime @map("content_date")
  caseCount     Int      @map("case_count")

  location Location @relation(fields: [locationId], references: [locationId])
  cases    SjpCase[]

  @@index([listType], name: "idx_sjp_list_type")
  @@index([locationId], name: "idx_sjp_list_location")
  @@index([publishedAt], name: "idx_sjp_list_published")
  @@map("sjp_list")
}

// Individual SJP cases
model SjpCase {
  caseId             String   @id @default(uuid()) @map("case_id") @db.Uuid
  listId             String   @map("list_id") @db.Uuid
  name               String
  postcode           String?
  offence            String?
  prosecutor         String?
  dateOfBirth        DateTime? @map("date_of_birth")
  reference          String?
  address            String?
  reportingRestriction Boolean @default(false) @map("reporting_restriction")

  list SjpList @relation(fields: [listId], references: [listId], onDelete: Cascade)

  @@index([listId], name: "idx_sjp_case_list")
  @@index([postcode], name: "idx_sjp_case_postcode")
  @@index([prosecutor], name: "idx_sjp_case_prosecutor")
  @@index([name], name: "idx_sjp_case_name")
  @@map("sjp_case")
}
```

**Rationale:**
- **Separate tables**: `sjp_list` for metadata and `sjp_case` for individual cases enables efficient querying
- **Indexes**: Critical for performance with 30,000+ cases - indexes on `postcode`, `prosecutor`, `name` for filtering
- **Snake_case mapping**: Follows HMCTS convention with `@@map` and `@map`
- **UUID primary keys**: Scalable and follows existing patterns
- **Cascade deletion**: Ensures data integrity when lists are removed

#### 1.2 Database Migration

The migration will be auto-generated using:
```bash
yarn db:migrate:dev
```

### Phase 2: Backend Service Layer

#### 2.1 SJP Service (`libs/sjp/src/sjp-service.ts`)

```typescript
import { prisma } from "@hmcts/postgres";

const CASES_PER_PAGE = 50;

export interface SjpListMetadata {
  listId: string;
  listType: "public" | "press";
  generatedAt: Date;
  publishedAt: Date;
  contentDate: Date;
  caseCount: number;
  locationId: number;
}

export interface SjpCasePublic {
  caseId: string;
  name: string;
  postcode: string | null;
  offence: string | null;
  prosecutor: string | null;
}

export interface SjpCasePress extends SjpCasePublic {
  dateOfBirth: Date | null;
  reference: string | null;
  address: string | null;
  reportingRestriction: boolean;
}

export interface SjpSearchFilters {
  searchQuery?: string;
  postcode?: string;
  prosecutor?: string;
}

export async function getLatestSjpLists(): Promise<SjpListMetadata[]> {
  const lists = await prisma.sjpList.findMany({
    orderBy: { publishedAt: "desc" },
    take: 10,
    select: {
      listId: true,
      listType: true,
      generatedAt: true,
      publishedAt: true,
      contentDate: true,
      caseCount: true,
      locationId: true
    }
  });

  return lists;
}

export async function getSjpListById(listId: string): Promise<SjpListMetadata | null> {
  const list = await prisma.sjpList.findUnique({
    where: { listId },
    select: {
      listId: true,
      listType: true,
      generatedAt: true,
      publishedAt: true,
      contentDate: true,
      caseCount: true,
      locationId: true
    }
  });

  return list;
}

export async function getSjpPublicCases(
  listId: string,
  filters: SjpSearchFilters,
  page: number
): Promise<{ cases: SjpCasePublic[]; totalCases: number }> {
  const where = buildWhereClause(listId, filters);

  const [cases, totalCases] = await Promise.all([
    prisma.sjpCase.findMany({
      where,
      select: {
        caseId: true,
        name: true,
        postcode: true,
        offence: true,
        prosecutor: true
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * CASES_PER_PAGE,
      take: CASES_PER_PAGE
    }),
    prisma.sjpCase.count({ where })
  ]);

  return { cases, totalCases };
}

export async function getSjpPressCases(
  listId: string,
  filters: SjpSearchFilters,
  page: number
): Promise<{ cases: SjpCasePress[]; totalCases: number }> {
  const where = buildWhereClause(listId, filters);

  const [cases, totalCases] = await Promise.all([
    prisma.sjpCase.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * CASES_PER_PAGE,
      take: CASES_PER_PAGE
    }),
    prisma.sjpCase.count({ where })
  ]);

  return { cases, totalCases };
}

export async function getUniqueProsecutors(listId: string): Promise<string[]> {
  const prosecutors = await prisma.sjpCase.findMany({
    where: { listId, prosecutor: { not: null } },
    select: { prosecutor: true },
    distinct: ["prosecutor"],
    orderBy: { prosecutor: "asc" }
  });

  return prosecutors.map(p => p.prosecutor).filter((p): p is string => p !== null);
}

function buildWhereClause(listId: string, filters: SjpSearchFilters) {
  const where: any = { listId };

  if (filters.searchQuery) {
    where.OR = [
      { name: { contains: filters.searchQuery, mode: "insensitive" } },
      { reference: { contains: filters.searchQuery, mode: "insensitive" } }
    ];
  }

  if (filters.postcode) {
    where.postcode = { contains: filters.postcode, mode: "insensitive" };
  }

  if (filters.prosecutor) {
    where.prosecutor = filters.prosecutor;
  }

  return where;
}
```

**Key Design Decisions:**
- **Separate functions** for public vs press cases (different fields returned)
- **Server-side pagination**: Fixed page size of 50 cases for optimal performance
- **Case-insensitive search**: Uses Prisma's `mode: "insensitive"`
- **Parallel queries**: `Promise.all` for cases and count improves performance
- **Filter composition**: `buildWhereClause` allows combining multiple filters

#### 2.2 Postcode Validator (`libs/sjp/src/postcode-validator.ts`)

```typescript
// UK postcode regex from GOV.UK standards
const UK_POSTCODE_REGEX = /^([A-Z]{1,2}\d{1,2}[A-Z]?)\s*(\d[A-Z]{2})$/i;

export interface PostcodeValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export function validateUkPostcode(postcode: string | undefined): PostcodeValidationResult {
  if (!postcode || postcode.trim().length === 0) {
    return { isValid: false, errorMessage: "Enter a postcode" };
  }

  if (!UK_POSTCODE_REGEX.test(postcode.trim())) {
    return { isValid: false, errorMessage: "Enter a valid postcode" };
  }

  return { isValid: true };
}
```

#### 2.3 Pagination Helper (`libs/sjp/src/sjp-paginator.ts`)

```typescript
export interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
  pageNumbers: number[];
}

const MAX_PAGE_LINKS = 7;

export function calculatePagination(
  currentPage: number,
  totalItems: number,
  itemsPerPage: number
): PaginationData {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const hasNext = currentPage < totalPages;
  const hasPrevious = currentPage > 1;

  // Calculate which page numbers to show
  const pageNumbers = generatePageNumbers(currentPage, totalPages);

  return {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    hasNext,
    hasPrevious,
    pageNumbers
  };
}

function generatePageNumbers(currentPage: number, totalPages: number): number[] {
  if (totalPages <= MAX_PAGE_LINKS) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: number[] = [];
  const halfWindow = Math.floor(MAX_PAGE_LINKS / 2);

  let start = Math.max(1, currentPage - halfWindow);
  let end = Math.min(totalPages, currentPage + halfWindow);

  // Adjust if we're near the beginning or end
  if (currentPage <= halfWindow) {
    end = MAX_PAGE_LINKS;
  } else if (currentPage >= totalPages - halfWindow) {
    start = totalPages - MAX_PAGE_LINKS + 1;
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return pages;
}
```

### Phase 3: Frontend Pages

#### 3.1 Page 1: SJP Selection (`libs/sjp/src/pages/sjp-selection.ts`)

```typescript
import type { Request, Response } from "express";
import { getLatestSjpLists } from "../sjp-service.js";
import { cy } from "./sjp-selection/cy.js";
import { en } from "./sjp-selection/en.js";

export const GET = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const lists = await getLatestSjpLists();

  const publicLists = lists.filter(l => l.listType === "public");
  const pressLists = lists.filter(l => l.listType === "press");

  res.render("sjp-selection", {
    en,
    cy,
    locale,
    publicLists,
    pressLists
  });
};
```

**Content files structure:**

`libs/sjp/src/pages/sjp-selection/en.ts`:
```typescript
export const en = {
  title: "What do you want to view from Single Justice Procedure?",
  back: "Back",
  publicListPrefix: "SJP Public List – ",
  pressListPrefix: "SJP Press List – "
};
```

`libs/sjp/src/pages/sjp-selection/cy.ts`:
```typescript
export const cy = {
  title: "Welsh placeholder",
  back: "Yn ôl",
  publicListPrefix: "Welsh placeholder",
  pressListPrefix: "Welsh placeholder"
};
```

#### 3.2 Page 2: SJP Public List (`libs/sjp/src/pages/sjp-public-list.ts`)

```typescript
import type { Request, Response } from "express";
import { getSjpListById, getSjpPublicCases, getUniqueProsecutors } from "../sjp-service.js";
import { calculatePagination } from "../sjp-paginator.js";
import { validateUkPostcode } from "../postcode-validator.js";
import { cy } from "./sjp-public-list/cy.js";
import { en } from "./sjp-public-list/en.js";

export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const listId = req.query.listId as string;
  const page = Number.parseInt(req.query.page as string, 10) || 1;

  if (!listId) {
    return res.status(400).render("errors/common", {
      en,
      cy,
      errorTitle: t.errorTitle,
      errorMessage: t.errorListNotFound
    });
  }

  const list = await getSjpListById(listId);
  if (!list || list.listType !== "public") {
    return res.status(404).render("errors/common", {
      en,
      cy,
      errorTitle: t.errorTitle,
      errorMessage: t.errorListNotFound
    });
  }

  const filters = {
    searchQuery: req.query.search as string | undefined,
    postcode: req.query.postcode as string | undefined,
    prosecutor: req.query.prosecutor as string | undefined
  };

  const { cases, totalCases } = await getSjpPublicCases(listId, filters, page);
  const prosecutors = await getUniqueProsecutors(listId);
  const pagination = calculatePagination(page, totalCases, 50);

  res.render("sjp-public-list", {
    en,
    cy,
    locale,
    list,
    cases,
    prosecutors,
    pagination,
    filters
  });
};

export const POST = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const listId = req.body.listId as string;

  const filters = {
    searchQuery: req.body.search?.trim(),
    postcode: req.body.postcode?.trim(),
    prosecutor: req.body.prosecutor
  };

  const errors: Array<{ text: string; href: string }> = [];

  // Validate postcode if provided
  if (filters.postcode) {
    const postcodeValidation = validateUkPostcode(filters.postcode);
    if (!postcodeValidation.isValid) {
      errors.push({
        text: postcodeValidation.errorMessage || t.errorInvalidPostcode,
        href: "#postcode"
      });
    }
  }

  if (errors.length > 0) {
    const list = await getSjpListById(listId);
    const prosecutors = await getUniqueProsecutors(listId);

    return res.render("sjp-public-list", {
      en,
      cy,
      locale,
      list,
      errors,
      prosecutors,
      filters,
      cases: [],
      pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: 50, hasNext: false, hasPrevious: false, pageNumbers: [] }
    });
  }

  // Build query string for redirect
  const queryParams = new URLSearchParams({ listId });
  if (filters.searchQuery) queryParams.set("search", filters.searchQuery);
  if (filters.postcode) queryParams.set("postcode", filters.postcode);
  if (filters.prosecutor) queryParams.set("prosecutor", filters.prosecutor);

  res.redirect(`/sjp-public-list?${queryParams.toString()}`);
};
```

#### 3.3 Page 3: SJP Press List (`libs/sjp/src/pages/sjp-press-list.ts`)

Similar structure to public list but:
- Add authentication check: `if (!req.user?.verified) return res.status(403)`
- Use `getSjpPressCases` to get full case data
- Include additional fields in template

### Phase 4: Nunjucks Templates

#### 4.1 SJP Public List Template (`libs/sjp/src/pages/sjp-public-list.njk`)

```html
{% extends "layouts/base-template.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/select/macro.njk" import govukSelect %}
{% from "govuk/components/table/macro.njk" import govukTable %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}
{% from "govuk/components/accordion/macro.njk" import govukAccordion %}

{% block page_content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-full">

    {% if errors %}
      {{ govukErrorSummary({
        titleText: errorSummaryTitle,
        errorList: errors
      }) }}
    {% endif %}

    <h1 class="govuk-heading-xl">{{ title }}</h1>

    <p class="govuk-body">
      {{ listContainingText }} {{ list.caseCount }} {{ casesText }}
      {{ generatedOnText }} {{ list.generatedAt | date }} {{ atText }} {{ list.generatedAt | time }}.
    </p>

    <a href="/download-sjp-list?listId={{ list.listId }}" class="govuk-button govuk-button--secondary"
       data-module="govuk-button" download>
      {{ downloadButtonText }}
    </a>

    <!-- Search Bar -->
    <form method="post" class="govuk-!-margin-top-6">
      <input type="hidden" name="listId" value="{{ list.listId }}">

      {{ govukInput({
        id: "search",
        name: "search",
        type: "text",
        label: {
          text: searchLabel,
          classes: "govuk-label--m"
        },
        value: filters.searchQuery
      }) }}

      <!-- Filter Accordion -->
      <button type="button" class="govuk-button govuk-button--secondary"
              data-module="govuk-button"
              aria-expanded="false"
              aria-controls="filter-panel">
        {{ showFiltersText }}
      </button>

      <div id="filter-panel" class="govuk-!-margin-top-4" hidden>
        {{ govukAccordion({
          id: "sjp-filters",
          items: [
            {
              heading: { text: postcodeFilterHeading },
              content: {
                html: govukInput({
                  id: "postcode",
                  name: "postcode",
                  type: "text",
                  label: { text: postcodeLabel },
                  errorMessage: errors[0] if errors and errors[0].href === "#postcode" else undefined,
                  value: filters.postcode
                })
              }
            },
            {
              heading: { text: prosecutorFilterHeading },
              content: {
                html: govukSelect({
                  id: "prosecutor",
                  name: "prosecutor",
                  label: { text: prosecutorLabel },
                  items: [
                    { value: "", text: selectProsecutorText }
                  ] + prosecutors | map(attribute='text') | list,
                  selected: filters.prosecutor
                })
              }
            }
          ]
        }) }}

        <p class="govuk-body">
          <a href="/sjp-public-list?listId={{ list.listId }}" class="govuk-link">
            {{ clearFiltersText }}
          </a>
        </p>
      </div>

      {{ govukButton({
        text: applyFiltersText
      }) }}
    </form>

    <!-- Cases Table -->
    {% if cases.length > 0 %}
      {{ govukTable({
        head: [
          { text: nameHeader },
          { text: postcodeHeader },
          { text: offenceHeader },
          { text: prosecutorHeader }
        ],
        rows: cases | map(attribute='row') | list
      }) }}

      <!-- Pagination -->
      {% if pagination.totalPages > 1 %}
        <nav class="govuk-pagination" role="navigation" aria-label="Pagination">
          {% if pagination.hasPrevious %}
            <div class="govuk-pagination__prev">
              <a class="govuk-link govuk-pagination__link"
                 href="?listId={{ list.listId }}&page={{ pagination.currentPage - 1 }}">
                <span class="govuk-pagination__link-label">{{ previousText }}</span>
              </a>
            </div>
          {% endif %}

          <ul class="govuk-pagination__list">
            {% for pageNum in pagination.pageNumbers %}
              <li class="govuk-pagination__item {% if pageNum === pagination.currentPage %}govuk-pagination__item--current{% endif %}">
                <a class="govuk-link govuk-pagination__link"
                   href="?listId={{ list.listId }}&page={{ pageNum }}"
                   aria-label="Page {{ pageNum }}"
                   {% if pageNum === pagination.currentPage %}aria-current="page"{% endif %}>
                  {{ pageNum }}
                </a>
              </li>
            {% endfor %}
          </ul>

          {% if pagination.hasNext %}
            <div class="govuk-pagination__next">
              <a class="govuk-link govuk-pagination__link"
                 href="?listId={{ list.listId }}&page={{ pagination.currentPage + 1 }}">
                <span class="govuk-pagination__link-label">{{ nextText }}</span>
              </a>
            </div>
          {% endif %}
        </nav>
      {% endif %}
    {% else %}
      <p class="govuk-body">{{ noCasesFoundText }}</p>
    {% endif %}

    <!-- Back to Top -->
    <p class="govuk-body govuk-!-margin-top-8">
      <a href="#" class="govuk-link" id="back-to-top">
        {{ backToTopText }} ↑
      </a>
    </p>

  </div>
</div>

<script>
  // Filter toggle
  document.querySelector('[aria-controls="filter-panel"]')?.addEventListener('click', function() {
    const panel = document.getElementById('filter-panel');
    const expanded = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', !expanded);
    panel.hidden = expanded;
  });

  // Back to top
  document.getElementById('back-to-top')?.addEventListener('click', function(e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
</script>
{% endblock %}
```

### Phase 5: Module Configuration

#### 5.1 Package.json (`libs/sjp/package.json`)

```json
{
  "name": "@hmcts/sjp",
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
    "@hmcts/postgres": "workspace:*",
    "@hmcts/auth": "workspace:*",
    "@hmcts/location": "workspace:*"
  },
  "peerDependencies": {
    "express": "^5.1.0"
  }
}
```

#### 5.2 Config.ts (`libs/sjp/src/config.ts`)

```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pageRoutes = { path: path.join(__dirname, "pages") };
export const prismaSchemas = path.join(__dirname, "../prisma");
export const moduleRoot = __dirname;
```

#### 5.3 Update Root tsconfig.json

Add to paths:
```json
"@hmcts/sjp": ["libs/sjp/src"],
"@hmcts/sjp/config": ["libs/sjp/src/config"]
```

#### 5.4 Register in apps/web/src/app.ts

```typescript
import { pageRoutes as sjpRoutes, moduleRoot as sjpModuleRoot } from "@hmcts/sjp/config";

// Add to modulePaths array
const modulePaths = [
  __dirname,
  webCoreModuleRoot,
  // ... existing paths
  sjpModuleRoot
];

// Register page routes
app.use(await createSimpleRouter(sjpRoutes));
```

### Phase 6: Testing Strategy

#### 6.1 Unit Tests

- **sjp-service.test.ts**: Mock Prisma client, test all service functions
- **postcode-validator.test.ts**: Test valid/invalid postcodes
- **sjp-paginator.test.ts**: Test edge cases (0 items, 1 page, many pages)
- **sjp-filters.test.ts**: Test filter combinations

#### 6.2 E2E Tests

Create `e2e-tests/tests/sjp.spec.ts`:

```typescript
test('user can navigate through SJP public list @nightly', async ({ page }) => {
  // Navigate to selection page
  await page.goto('/sjp-selection');

  // Check page loads
  await expect(page.getByRole('heading', { name: /what do you want to view/i })).toBeVisible();

  // Click public list
  await page.getByRole('link', { name: /sjp public list/i }).first().click();

  // Verify public list page
  await expect(page.getByRole('heading', { name: /single justice procedure – public list/i })).toBeVisible();

  // Test search functionality
  await page.getByLabel(/search/i).fill('test');
  await page.getByRole('button', { name: /apply filters/i }).click();

  // Test postcode filter
  await page.getByRole('button', { name: /show filters/i }).click();
  await page.getByLabel(/postcode/i).fill('SW1A 1AA');
  await page.getByRole('button', { name: /apply filters/i }).click();

  // Test invalid postcode
  await page.getByLabel(/postcode/i).fill('INVALID');
  await page.getByRole('button', { name: /apply filters/i }).click();
  await expect(page.getByText(/enter a valid postcode/i)).toBeVisible();

  // Test pagination
  await page.getByRole('link', { name: /page 2/i }).click();
  await expect(page).toHaveURL(/page=2/);

  // Test Welsh translation
  await page.getByRole('link', { name: 'Cymraeg' }).click();
  await expect(page.getByRole('heading')).toHaveText(/welsh placeholder/i);

  // Test accessibility
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  // Test back to top
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole('link', { name: /back to top/i }).click();
  await expect(page.evaluate(() => window.scrollY)).resolves.toBe(0);
});
```

### Phase 7: Performance Optimizations

#### 7.1 Database Optimizations

- **Indexes**: Already defined in schema on searchable fields
- **Query optimization**: Use `select` to fetch only needed fields
- **Pagination**: Limit results to 50 per page
- **Connection pooling**: Handled by Prisma

#### 7.2 Caching Strategy

Consider adding Redis caching for:
- List metadata (TTL: 5 minutes)
- Prosecutor lists (TTL: 10 minutes)
- Search results (TTL: 2 minutes)

Implementation:
```typescript
import { redis } from "@hmcts/redis";

export async function getCachedProsecutors(listId: string): Promise<string[]> {
  const cacheKey = `sjp:prosecutors:${listId}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const prosecutors = await getUniqueProsecutors(listId);
  await redis.set(cacheKey, JSON.stringify(prosecutors), 'EX', 600); // 10 min TTL

  return prosecutors;
}
```

## Technical Decisions & Rationale

### 1. Separate Tables for Lists and Cases
**Decision**: Use `sjp_list` and `sjp_case` tables instead of embedding cases in list records.
**Rationale**: Enables efficient querying, filtering, and pagination. Scales better with 30,000+ cases.

### 2. Server-Side Pagination
**Decision**: Implement pagination on the server with fixed page size of 50.
**Rationale**: Client-side pagination with 30,000 cases would be impractical. Server-side keeps payload small.

### 3. Separate Public/Press Controllers
**Decision**: Create separate page controllers for public and press lists.
**Rationale**: Different access controls, different data fields, clearer separation of concerns.

### 4. Filter via Query Parameters
**Decision**: Use POST to validate, then redirect to GET with query parameters.
**Rationale**: Makes filtered views bookmarkable, allows back/forward navigation, follows REST principles.

### 5. UK Postcode Regex Validation
**Decision**: Use GOV.UK standard postcode regex.
**Rationale**: Authoritative source, handles all UK postcode formats correctly.

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Performance degradation with 30k+ cases | High | Medium | Implement database indexes, pagination, caching |
| Schema incompatibility with JSON sources | High | Medium | Review schemas early, create validation tests |
| Accessibility issues | Medium | Low | Use GOV.UK components, run Axe tests throughout |
| Welsh translation delays | Low | High | Use placeholders initially, coordinate with translation team |
| Authentication edge cases | Medium | Medium | Test verified/unverified user flows thoroughly |

## Dependencies & Prerequisites

### Before Starting
1. Review SJP JSON schemas from pip-data-management repo
2. Download style guide attachment from JIRA
3. Coordinate with data ingestion team on JSON import

### External Dependencies
- GOV.UK Design System components (already available)
- Prisma client generation (existing infrastructure)
- Redis for caching (optional but recommended)

## Acceptance Criteria Mapping

| AC | Implementation | File(s) |
|----|----------------|---------|
| Two list types (public/press) | Database schema with listType field | libs/sjp/prisma/schema.prisma |
| Handle 30,000 cases | Indexed DB, pagination, caching | sjp-service.ts, schema.prisma |
| Selection page | Page controller + template | sjp-selection.ts, sjp-selection.njk |
| Public list table | Nunjucks table component | sjp-public-list.njk |
| Search functionality | Filter logic in service | sjp-service.ts, sjp-filters.ts |
| Postcode filter | Validation + filter logic | postcode-validator.ts, sjp-service.ts |
| Prosecutor filter | Dropdown with unique values | sjp-service.ts (getUniqueProsecutors) |
| Pagination | Pagination helper + UI | sjp-paginator.ts, templates |
| Download button | Download route handler | TBD: sjp-download.ts |
| Press list access control | Authentication middleware | sjp-press-list.ts (req.user check) |
| Reporting restriction field | Database field + template | schema.prisma, sjp-press-list.njk |
| Welsh translations | cy.ts files for all pages | */cy.ts files |
| WCAG 2.2 AA compliance | GOV.UK components + testing | All templates, E2E tests |
| Accordion components | GOV.UK accordion | Templates with proper ARIA |

## Implementation Order

1. **Database** (Day 1-2): Create schema, run migrations
2. **Service Layer** (Day 2-3): Implement sjp-service.ts with tests
3. **Validators** (Day 3): Postcode validator, pagination helper
4. **Page 1** (Day 4): Selection page (simple, no complexity)
5. **Page 2** (Day 5-6): Public list page with filters
6. **Page 3** (Day 7): Press list page (similar to public)
7. **Module Registration** (Day 8): Wire up in app.ts, test routing
8. **E2E Tests** (Day 9): Comprehensive journey tests
9. **Polish** (Day 10): Accessibility fixes, Welsh content, documentation

## Post-Implementation

- Monitor performance metrics in Application Insights
- Gather user feedback on filter usability
- Consider adding export to CSV/PDF for download functionality
- Plan for Welsh translation completion
