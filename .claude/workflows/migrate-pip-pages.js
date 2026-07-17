export const meta = {
  name: 'migrate-pip-pages',
  description: 'Migrate Nunjucks templates and page controllers from pip-frontend',
  phases: [
    { title: 'Discover', detail: 'Parse ticket and fetch pages from pip-frontend' },
    { title: 'Migrate Frontend', detail: 'Create Nunjucks templates, content modules, and page controllers' },
    { title: 'Tests', detail: 'Generate unit and E2E tests for the migrated pages' },
    { title: 'Verify', detail: 'Verify migrated pages against ticket requirements' },
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
          name: { type: 'string', description: 'Page name in kebab-case (e.g., "send-daily-hearing-list")' },
          route: { type: 'string', description: 'Route path (e.g., "/send-daily-hearing-list")' },
          fullDisplayName: { type: 'string', description: 'Full display name for frontend (e.g., "First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List")' },
          fieldsToDisplay: { type: 'array', items: { type: 'string' }, description: 'Fields to display in the style guide' },
          openingStatement: { type: 'string', description: 'Opening statement for important information accordion' },
          staticAddress: { type: 'string', description: 'Static tribunal address if specified' }
        },
        required: ['name', 'route', 'fullDisplayName']
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
  `Fetch GitHub issue #${issueNumber} using curl to https://api.github.com/repos/hmcts/cath-service/issues/${issueNumber}

  Parse the acceptance criteria to identify list types or pages that need style guides/templates.

  DETECTION PATTERNS - Look for any of these in acceptance criteria:
  1. List names mentioned with display names (e.g., "The Mental Health Tribunal Daily Hearing List is created...")
  2. Upload form names (e.g., "the list name is displayed as PCOL Daily Cause list")
  3. Tribunal names with weekly/daily lists (e.g., "SIAC Weekly Hearing List")
  4. Regional variants of the same list type (e.g., RPT Eastern, RPT London)
  5. Multiple related lists (e.g., "Immigration and Asylum Chamber Daily List" and "...Additional Cases")

  ROUTE DERIVATION - For each list/page found:
  1. Use the full display name (or upload form name if that is the only name given)
  2. Convert to kebab-case: lowercase, replace spaces/punctuation with hyphens
  3. Examples:
     - "SIAC Weekly Hearing List" → /siac-weekly-hearing-list
     - "PCOL Daily Cause list" → /pcol-daily-cause-list
     - "Mental Health Tribunal Daily Hearing List" → /mental-health-tribunal-daily-hearing-list
     - "Immigration and Asylum Chamber Daily List – Additional Cases" → /immigration-and-asylum-chamber-daily-list-additional-cases

  FOR EACH LIST/PAGE, EXTRACT (frontend/template concerns only):
  - Full display name: Complete name for the page heading/summary (e.g., "First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List")
  - Derived route: Convert the display name to kebab-case
  - Fields to display: Extract from "Data fields to be displayed within the [list name]" sections
  - Opening statement: Full text from "opening statement displayed within the important information accordion"
  - Static address: Any tribunal/court address mentioned (e.g., "East London Tribunal Service, HMCTS...")

  Return structured data:
  - pages: Array with all extracted fields per schema
  - contentRequirements: ALL acceptance criteria bullets as array of strings (preserve exact wording)`,
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

// Phase 2: Frontend migration - create Nunjucks templates and page controllers
phase('Migrate Frontend');

const migrations = await pipeline(
  legacyPages.pages,

  (page) => agent(
    `Migrate the Nunjucks template and page controller for page "${page.name}".

    IMPORTANT: Follow all conventions from CLAUDE.md and .claude/rules/:
    - GOV.UK Design System patterns (.claude/rules/design.md)
    - Naming conventions (camelCase vars, kebab-case files)
    - Functional style (no classes unless shared state)
    - ES modules with .js extensions in imports
    - Co-located content: cy.ts/en.ts live alongside the controller (the default pattern)

    Legacy page data: ${JSON.stringify(page)}
    ${page.legacyRoute && page.legacyRoute !== page.route ? `Note: This page was "${page.legacyRoute}" in pip-frontend, now "${page.route}" in new app.` : ''}
    ${page.notes ? `Migration notes: ${page.notes}` : ''}
    Ticket requirements: ${JSON.stringify(ticketInfo)}

    SPECIAL HANDLING FOR TRIBUNAL STYLE GUIDE PAGES:
    - Many tribunal pages use shared controllers (e.g., nonStrategicTribunalListsController)
    - Templates might be dynamically generated or use partials
    - Content is often in JSON keyed by list-type slug
    - Opening statements are in "important information" accordion sections

    SCOPE: This is a Nunjucks template migration only. Do NOT create JSON schemas,
    validators, PDF generators, email summaries, conversion configs, or database/list-type
    registrations. Frontend template + controller + co-located content only.

    Step 1: Create page template at apps/web/src/pages/(list-types)/${page.name}/index.njk
    - Follow the GOV.UK style guide page pattern
    - Include "important information" details component with the opening statement
    - Display the fields specified in the ticket (Date, Time, Case Reference, etc.)
    - Ensure proper heading hierarchy
    - Use GOV.UK Design System components
    - Reference content via the co-located i18n variables (see Step 3)

    Step 2: Create page controller
    - Location: apps/web/src/pages/(list-types)/${page.name}/index.ts
    - Import { cy } from "./cy.js" and { en } from "./en.js"
    - Implement GET handler: select locale from res.locals.locale and render with { en, cy, t }
    - Follow pattern from existing list-type pages

    Step 3: Create co-located content files
    - apps/web/src/pages/(list-types)/${page.name}/en.ts
    - apps/web/src/pages/(list-types)/${page.name}/cy.ts
    - Convert pip-frontend i18n (locales/en/*.json, cy/*.json) to TypeScript objects
    - Include page title, field labels, opening statement (from ticket), static address if specified
    - If no Welsh source exists, mirror the en.ts structure with TODO markers for translation

    Report what was created.`,
    {
      label: `frontend-${page.name}`,
      phase: 'Migrate Frontend',
      schema: MIGRATION_RESULT_SCHEMA
    }
  )
);

const successfulMigrations = migrations.filter(Boolean).filter(m => m.controllerCreated && m.templateMigrated);
log(`Successfully migrated ${successfulMigrations.length}/${legacyPages.pages.length} pages`);

// Phase 3: Generate tests
phase('Tests');

const tests = await pipeline(
  successfulMigrations,

  (migration) => agent(
    `Generate frontend tests for migrated page "${migration.page}".

    CRITICAL: Follow testing rules from .claude/rules/testing.md and .claude/rules/e2e-testing.md:
    - AAA pattern (Arrange, Act, Assert) with clear sections
    - Vitest for unit tests, Playwright for E2E
    - E2E: ONE test per user journey (not per validation/Welsh/accessibility)
    - Include Welsh and accessibility INLINE in the journey test
    - Use getByRole() selectors (preferred)
    - Tag @nightly for longer tests

    Step 1: Create page controller unit test
    - Location: apps/web/src/pages/(list-types)/${migration.page}/index.test.ts
    - Test GET handler renders the template with en/cy/t
    - Mock Request/Response with proper types
    - Use Vitest with AAA pattern

    Step 2: Create E2E test
    - Location: e2e-tests/tests/${migration.page}.spec.ts
    - Test the complete user journey for this page
    - Include Welsh translation test (?lng=cy)
    - Include accessibility check with AxeBuilder inline
    - Use getByRole() selectors (preferred)
    - Tag with @nightly if appropriate

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

  (migration) => agent(
    `Verify the migrated Nunjucks page for "${migration.page}" against ticket requirements.

    Ticket requirements: ${JSON.stringify(ticketInfo)}

    1. Read apps/web/src/pages/(list-types)/${migration.page}/index.njk
       - Check all fields from the ticket are displayed
       - Check the opening statement is in the "important information" accordion
       - Check GOV.UK Design System components are used correctly
       - Check static content (addresses, contact details) if specified

    2. Read apps/web/src/pages/(list-types)/${migration.page}/index.ts
       - Check the controller imports co-located cy/en content
       - Check the GET handler renders with the correct data

    3. Read apps/web/src/pages/(list-types)/${migration.page}/en.ts and cy.ts
       - Check all content from the ticket (page title, field labels, opening statement)
       - Check the static address if specified in the ticket
       - Check the cy.ts structure matches en.ts

    Return verification results with specific missing items.`,
    {
      label: `verify-${migration.page}`,
      phase: 'Verify',
      schema: VERIFICATION_SCHEMA
    }
  )
);

const contentIssues = verifications
  .filter(Boolean)
  .filter(v => !v.contentComplete);

if (contentIssues.length > 0) {
  log(`⚠️  Content verification found issues in ${contentIssues.length} pages - manual review needed`);
}

// Summary
const summary = {
  totalPages: legacyPages.pages.length,
  migrated: successfulMigrations.length,
  tested: tests.filter(Boolean).length,
  pagesWithIssues: contentIssues.length,
  pages: successfulMigrations.map(m => {
    const remainingIssues = contentIssues.find(v => v.page === m.page);

    return {
      name: m.page,
      hasTests: tests.some(t => t && t.page === m.page),
      contentComplete: !remainingIssues,
      issues: remainingIssues ? [
        ...remainingIssues.missingContent || [],
        ...remainingIssues.suggestions || []
      ] : []
    };
  })
};

if (summary.pagesWithIssues > 0) {
  log(`\n⚠️ Migration complete with ${summary.pagesWithIssues} pages needing manual review`);
} else {
  log(`\n✅ Migration complete: ${summary.migrated} pages migrated`);
}

return summary;
