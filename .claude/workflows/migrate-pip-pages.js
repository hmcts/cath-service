export const meta = {
  name: 'migrate-pip-pages',
  description: 'Migrate pages from pip-frontend based on routes listed in ticket',
  phases: [
    { title: 'Discover', detail: 'Parse ticket for routes and fetch legacy pages from pip-frontend' },
    { title: 'Migrate', detail: 'Transform pages to new structure in parallel' },
    { title: 'Tests', detail: 'Generate unit and E2E tests' },
    { title: 'Verify', detail: 'Check content against ticket requirements' },
  ],
};

const ISSUE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    body: { type: 'string' },
    pages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Page name in kebab-case (e.g., "subscription-add-list")' },
          route: { type: 'string', description: 'Route path (e.g., "/subscription-add-list")' },
          description: { type: 'string', description: 'What this page does' }
        },
        required: ['name', 'route']
      }
    },
    contentRequirements: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of content/acceptance criteria requirements'
    }
  },
  required: ['pages']
};

const PAGE_DISCOVERY_SCHEMA = {
  type: 'object',
  properties: {
    pages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          route: { type: 'string' },
          legacyRoute: { type: 'string', description: 'Actual route in pip-frontend if different from ticket' },
          controller: { type: 'string' },
          template: { type: 'string' },
          i18nEn: { type: 'string' },
          i18nCy: { type: 'string' },
          hasPost: { type: 'boolean' },
          notes: { type: 'string', description: 'Any differences or special notes about this page' }
        },
        required: ['name', 'route', 'controller', 'template']
      }
    },
    matchingNotes: {
      type: 'string',
      description: 'Overall notes about route matching: exact matches, fuzzy matches, or split pages'
    }
  },
  required: ['pages']
};

const MIGRATION_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    page: { type: 'string' },
    libCreated: { type: 'boolean' },
    controllerCreated: { type: 'boolean' },
    templateMigrated: { type: 'boolean' },
    issues: { type: 'array', items: { type: 'string' } }
  }
};

const TEST_GENERATION_SCHEMA = {
  type: 'object',
  properties: {
    page: { type: 'string' },
    unitTestCreated: { type: 'boolean' },
    e2eTestCreated: { type: 'boolean' }
  }
};

const VERIFICATION_SCHEMA = {
  type: 'object',
  properties: {
    page: { type: 'string' },
    contentComplete: { type: 'boolean' },
    missingContent: { type: 'array', items: { type: 'string' } },
    suggestions: { type: 'array', items: { type: 'string' } }
  }
};

// Validate args
if (!args || typeof args !== 'number') {
  throw new Error('Usage: /migrate-pip-pages <issue-number>');
}

const issueNumber = args;

// Phase 1: Discover
phase('Discover');

log(`Fetching issue #${issueNumber} to extract page routes`);

const ticketInfo = await agent(
  `Fetch GitHub issue #${issueNumber} using: gh issue view ${issueNumber} --json title,body

  Parse the issue to extract:
  1. Pages to migrate - Look for:
     - Route tables (e.g., "| Page | Route |" with rows like "| 5 | /subscription-add-list |")
     - Route lists (e.g., "New routes: /crime-login, /crime-login/return")
     - URL structure sections with paths
  2. Content requirements - Look for:
     - Acceptance criteria
     - UI elements that must be present
     - Welsh translation requirements

  For each page, extract:
  - Route path (e.g., "/subscription-add-list")
  - Derive page name from route (e.g., "subscription-add-list")
  - Description (if provided in the ticket)

  Return structured data with pages array containing name, route, and description for each page to migrate.`,
  {
    label: 'parse-ticket',
    schema: ISSUE_SCHEMA
  }
);

if (!ticketInfo?.pages || ticketInfo.pages.length === 0) {
  throw new Error(`No pages/routes found in issue #${issueNumber}. Please ensure the issue lists routes to migrate.`);
}

log(`Found ${ticketInfo.pages.length} pages to migrate: ${ticketInfo.pages.map(p => p.route).join(', ')}`);

const legacyPages = await agent(
  `Fetch legacy pip-frontend pages for migration.

  Target pages from ticket: ${JSON.stringify(ticketInfo.pages)}

  For each page route, search pip-frontend repo (https://github.com/hmcts/pip-frontend):

  IMPORTANT: Use flexible matching for route names:
  - Try exact route match first
  - If not found, search for similar routes (e.g., "/case-reference-search" might be "/case-reference-number-search")
  - One ticket route might map to multiple pip-frontend pages (e.g., unified results page might be split)
  - Check for kebab-case variations (hyphens, singular/plural, shortened names)

  For each route:
  1. Search src/main/routes/routes.ts for matching or similar route paths
  2. Fetch corresponding controller from src/main/controllers/
  3. Fetch template from src/main/views/ (.njk file)
  4. Fetch i18n files from src/main/resources/locales/en/*.json and cy/*.json
  5. Check if it has POST handler
  6. If multiple pip-frontend pages match one ticket route, include all of them

  Use curl to fetch raw files from GitHub (main branch).

  Return structured data with discovered pages. Include notes about any route name differences found.`,
  {
    label: 'fetch-legacy-pages',
    schema: PAGE_DISCOVERY_SCHEMA
  }
);

if (!legacyPages?.pages || legacyPages.pages.length === 0) {
  throw new Error('No legacy pages discovered. Check pip-frontend repo structure or verify routes exist in pip-frontend.');
}

log(`Discovered ${legacyPages.pages.length} legacy pages with controllers, templates, and i18n`);

if (legacyPages.matchingNotes) {
  log(`Route matching: ${legacyPages.matchingNotes}`);
}

// Phase 2: Migrate pages in parallel
phase('Migrate');

const migrations = await pipeline(
  legacyPages.pages,

  // Stage 1: Create lib module with content files
  (page) => agent(
    `Migrate page "${page.name}" to new structure.

    IMPORTANT: Follow all conventions from CLAUDE.md and .claude/rules/:
    - GOV.UK Design System patterns (.claude/rules/design.md)
    - Naming conventions (camelCase vars, kebab-case files, snake_case DB)
    - Functional style (no classes unless shared state)
    - ES modules with .js extensions in imports
    - AAA pattern for tests (.claude/rules/testing.md)

    Legacy page data: ${JSON.stringify(page)}
    ${page.legacyRoute && page.legacyRoute !== page.route ? `Note: This page was "${page.legacyRoute}" in pip-frontend, now "${page.route}" in new app.` : ''}
    ${page.notes ? `Migration notes: ${page.notes}` : ''}
    Ticket requirements: ${JSON.stringify(ticketInfo)}

    Step 1: Create lib module at libs/${page.name}/
    - Create package.json with @hmcts/${page.name}
    - Create tsconfig.json
    - Create src/config.ts with moduleRoot export
    - Create src/index.ts with content exports
    - Create src/${page.name}-page/en.ts from i18n JSON
    - Create src/${page.name}-page/cy.ts from i18n JSON (if exists)
    - Convert JSON structure to TypeScript objects

    Step 2: Create page controller at apps/web/src/pages/(core)/${page.name}/
    - Create index.ts with GET export (and POST if hasPost is true)
    - Import content from lib: import { ${page.name}PageEn as en, ${page.name}PageCy as cy } from "@hmcts/${page.name}"
    - Use functional controller pattern, not class-based
    - Pass en, cy, t to res.render()

    Step 3: Migrate template to apps/web/src/pages/(core)/${page.name}/index.njk
    - Copy template structure
    - Ensure extends "layouts/base-template.njk"
    - Update any macro imports to use GOV.UK Design System
    - Replace hardcoded text with variables from content files
    - Follow GOV.UK patterns from .claude/rules/design.md:
      * Use appropriate components (govukButton, govukInput, etc.)
      * Include govukErrorSummary if form has validation
      * Proper heading hierarchy (h1 for page title)
      * Accessible form labels and hints

    Step 4: Update root tsconfig.json paths to include "@hmcts/${page.name}": ["libs/${page.name}/src"]

    Report what was created and any issues encountered.`,
    {
      label: `migrate-${page.name}`,
      phase: 'Migrate',
      schema: MIGRATION_RESULT_SCHEMA
    }
  )
);

const successfulMigrations = migrations.filter(Boolean).filter(m => m.libCreated && m.controllerCreated);
log(`Successfully migrated ${successfulMigrations.length}/${legacyPages.pages.length} pages`);

// Phase 3: Generate tests in parallel
phase('Tests');

const tests = await pipeline(
  successfulMigrations,

  (migration) => agent(
    `Generate tests for migrated page "${migration.page}".

    CRITICAL: Follow testing rules from .claude/rules/testing.md and .claude/rules/e2e-testing.md:
    - AAA pattern (Arrange, Act, Assert) with clear sections
    - Vitest for unit tests, Playwright for E2E
    - E2E: ONE test per user journey (not per validation/Welsh/accessibility)
    - Include Welsh and accessibility INLINE in the journey test
    - Use getByRole() selectors (preferred)
    - Tag @nightly for longer tests

    Step 1: Create unit test at apps/web/src/pages/(core)/${migration.page}/index.test.ts
    - Use Vitest with AAA pattern (Arrange, Act, Assert)
    - Test GET handler renders with correct data
    - Test POST handler if it exists (validation, redirect, error handling)
    - Mock Request/Response with proper types
    - Follow testing pattern from CLAUDE.md and .claude/rules/testing.md

    Step 2: Create E2E test at e2e-tests/tests/${migration.page}.spec.ts
    - Test complete user journey for this page
    - Include Welsh translation test (?lng=cy)
    - Include accessibility check with AxeBuilder inline
    - Use getByRole() selectors (preferred)
    - Tag with @nightly if appropriate
    - Follow E2E patterns from .claude/rules/e2e-testing.md

    Report what was created.`,
    {
      label: `tests-${migration.page}`,
      phase: 'Tests',
      schema: TEST_GENERATION_SCHEMA
    }
  )
);

log(`Generated tests for ${tests.filter(Boolean).length} pages`);

// Phase 4: Verify content against ticket
phase('Verify');

const verifications = await pipeline(
  successfulMigrations,

  (migration) => {
    return agent(
      `Verify migrated page "${migration.page}" against ticket requirements.

      Ticket requirements: ${JSON.stringify(ticketInfo)}

      Check:
      1. Read apps/web/src/pages/(core)/${migration.page}/index.njk
      2. Read libs/${migration.page}/src/${migration.page}-page/en.ts
      3. Read libs/${migration.page}/src/${migration.page}-page/cy.ts
      4. Verify all content requirements are present
      5. Check Welsh translation is complete
      6. Identify any missing or incomplete content

      Return verification results with specific missing items.`,
      {
        label: `verify-${migration.page}`,
        phase: 'Verify',
        schema: VERIFICATION_SCHEMA
      }
    );
  }
);

const contentIssues = verifications
  .filter(Boolean)
  .filter(v => !v.contentComplete);

if (contentIssues.length > 0) {
  log(`⚠️  Content verification found issues in ${contentIssues.length} pages`);
}

// Final step: Update app.ts with route registrations
log('Updating apps/web/src/app.ts with module registrations');

await agent(
  `Update apps/web/src/app.ts to register migrated modules.

  Migrated pages: ${successfulMigrations.map(m => m.page).join(', ')}

  For each migrated page:
  1. Add import at the top: import { moduleRoot as [pageName]ModuleRoot } from "@hmcts/[page-name]/config";
  2. Add to modulePaths array: [pageName]ModuleRoot

  Example for page "home":
  import { moduleRoot as homeModuleRoot } from "@hmcts/home/config";
  const modulePaths = [...existing, homeModuleRoot];

  Follow the existing pattern in app.ts.

  Note: Pages are auto-discovered from apps/web/src/pages/ - no manual route registration needed.`,
  {
    label: 'update-app-registration'
  }
);

// Summary
const summary = {
  totalPages: legacyPages.pages.length,
  migrated: successfulMigrations.length,
  tested: tests.filter(Boolean).length,
  contentIssues: contentIssues.length,
  pages: successfulMigrations.map(m => ({
    name: m.page,
    hasTests: tests.some(t => t && t.page === m.page),
    contentComplete: !contentIssues.some(v => v.page === m.page),
    issues: [
      ...m.issues || [],
      ...verifications.find(v => v && v.page === m.page)?.missingContent || []
    ]
  }))
};

return summary;
