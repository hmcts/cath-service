export const meta = {
  name: 'migrate-pip-pages',
  description: 'Migrate views and accompanying logic from pip services',
  phases: [
    { title: 'Discover', detail: 'Parse ticket and fetch pages from pip-frontend' },
    { title: 'Migrate Frontend', detail: 'Create content modules and page controllers' },
    { title: 'Migrate Backend', detail: 'Create schemas, PDFs, and email summary from pip-data-management' },
    { title: 'Tests', detail: 'Generate unit and E2E tests for all components' },
    { title: 'Verify', detail: 'Verify all components against ticket requirements' },
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
          name: { type: 'string', description: 'Page name in kebab-case (e.g., "siac-weekly-hearing-list")' },
          route: { type: 'string', description: 'Route path (e.g., "/siac-weekly-hearing-list")' },
          description: { type: 'string', description: 'Full display name (e.g., "Special Immigration Appeals Commission Weekly Hearing List")' },
          listTypeConstant: { type: 'string', description: 'Java constant name from pip-data-management (e.g., "SIAC_WEEKLY_HEARING_LIST")' }
        },
        required: ['name', 'route', 'description']
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

const BACKEND_WORK_SCHEMA = {
  type: 'object',
  properties: {
    page: { type: 'string' },
    validationSchemaCreated: { type: 'boolean' },
    pdfTemplateCreated: { type: 'boolean' },
    emailSummaryCreated: { type: 'boolean' },
    listManipulationCreated: { type: 'boolean' },
    issues: { type: 'array', items: { type: 'string' } }
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
  1. If upload form name is provided, use that for route derivation
  2. Otherwise use the full display name
  3. Convert to kebab-case: lowercase, replace spaces/punctuation with hyphens
  4. Examples:
     - "SIAC Weekly Hearing List" → /siac-weekly-hearing-list
     - "PCOL Daily Cause list" → /pcol-daily-cause-list
     - "Mental Health Tribunal Daily Hearing List" → /mental-health-tribunal-daily-hearing-list
     - "Immigration and Asylum Chamber Daily List – Additional Cases" → /immigration-and-asylum-chamber-daily-list-additional-cases

  FOR EACH LIST/PAGE, EXTRACT:
  - Display name (full name shown in frontend)
  - Upload form name (if different/specified)
  - Derived route (kebab-case)
  - List type constant: Derive Java constant name for pip-data-management lookup
    * Convert to SCREAMING_SNAKE_CASE
    * Example: "SIAC Weekly Hearing List" → "SIAC_WEEKLY_HEARING_LIST"
    * Example: "RPT Eastern Weekly Hearing List" → "RPT_EASTERN_WEEKLY_HEARING_LIST"
  - Jurisdiction (Civil, Tribunal, etc.)
  - Region (National, London, Yorkshire, etc.)
  - Frequency (daily, weekly, rarely, etc.)
  - Fields to display (if specified in "fields to be displayed" sections)
  - Opening statements or special messages (from accordion or summary page)
  - Ordering/priority rules (if specified)

  Return structured data:
  - pages: [{name: route without slash, route: with slash, description: display name, listTypeConstant: SCREAMING_SNAKE_CASE}]
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

    SPECIAL HANDLING FOR TRIBUNAL STYLE GUIDE PAGES:
    - Many tribunal pages use shared controllers (e.g., nonStrategicTribunalListsController)
    - Templates might be dynamically generated or use partials
    - Content is often in JSON keyed by list-type slug
    - Opening statements are in "important information" accordion sections

    NOTE: This creates frontend-only components. The unified list-type module (with schemas, PDF, etc.)
    will be created in the Backend phase. This separation allows parallel work.

    Step 1: Extract i18n content from pip-frontend
    - Fetch i18n files from pip-frontend (locales/en/*.json and cy/*.json)
    - Extract content specific to this list type
    - Prepare for creation in list-types module (will be created in Backend phase)

    Step 2: Create page template at apps/web/src/pages/(list-types)/${page.name}/
    - Create ${page.name}.njk (Nunjucks template)
    - Follow the GOV.UK style guide page pattern
    - Include "important information" details component with opening statement
    - Display fields as specified in ticket (Date, Time, Case Reference, etc.)
    - Ensure proper heading hierarchy
    - Use GOV.UK Design System components
    - Use i18n variables for all text content

    Step 3: Create page controller (if needed for non-standard behavior)
    - Most list types use shared rendering logic
    - Only create custom controller if page has unique behavior
    - Location: apps/web/src/pages/(list-types)/${page.name}/index.ts
    - Import locales from list-types module (will be available after Backend phase)

    Report what was created and note that the unified list-type module will be created in Backend phase.`,
    {
      label: `migrate-${page.name}`,
      phase: 'Migrate',
      schema: MIGRATION_RESULT_SCHEMA
    }
  )
);

const successfulMigrations = migrations.filter(Boolean).filter(m => m.libCreated && m.controllerCreated);
log(`Successfully migrated ${successfulMigrations.length}/${legacyPages.pages.length} pages`);

// Phase 3: Backend work - fetch schemas and templates from pip-data-management
phase('Backend');

const backendWork = await pipeline(
  successfulMigrations,

  (migration) => agent(
    `Migrate backend components for "${migration.page}" from pip-data-management.

    CRITICAL: All backend components already exist in pip-data-management and must be migrated.
    If you cannot find any component after thorough searching, STOP and ask the developer for help.
    Do NOT create placeholder code - migrate existing implementations.

    List type information:
    - Page name: ${migration.page}
    - List type constant: ${ticketInfo.pages.find(p => p.name === migration.page)?.listTypeConstant || 'UNKNOWN'}
    - Use this constant to find components in pip-data-management

    Follow conventions from CLAUDE.md and .claude/rules/backend.md:
    - JSON Schema with AJV for validation
    - Functional style
    - ES modules with .js extensions

    Page: ${migration.page}
    Ticket requirements: ${JSON.stringify(ticketInfo)}

    IMPORTANT: Create a unified list-type module at libs/list-types/${migration.page}/
    This module will contain: schemas, locales (i18n), email-summary, PDF, conversion, models

    STEP 1 - Create Locales from pip-frontend i18n:
    - Fetch i18n files from pip-frontend (locales/en/*.json and cy/*.json)
    - Extract content specific to this list type
    - Create: libs/list-types/${migration.page}/src/locales/en.ts
      * Convert JSON to TypeScript object
      * Include: page title, fields, opening statement, labels
    - Create: libs/list-types/${migration.page}/src/locales/cy.ts
      * Welsh translation (if exists in pip-frontend)
      * Otherwise create with TODO comments

    STEP 2 - Fetch JSON Validation Schema:
    Search pip-data-management repo for schema:
    - Try: https://raw.githubusercontent.com/hmcts/pip-data-management/master/src/main/resources/schemas/
    - Search for files matching list type (e.g., "siac", "poac", "tribunal")
    - Fetch JSON schema using curl
    - Copy to: libs/publication/src/validation/schemas/${migration.page}-schema.json

    STEP 3 - Fetch PDF Generation Logic:
    PDF templates are at:
    - Java service: https://github.com/hmcts/pip-data-management/tree/master/src/main/java/uk/gov/hmcts/reform/pip/data/management/service/filegeneration
    - Thymeleaf templates: https://github.com/hmcts/pip-data-management/tree/master/src/main/resources/templates

    Actions:
    1. Find the Java file generation service for this list type (search filegeneration/ directory)
    2. Find the Thymeleaf template (search templates/ directory)
    3. Convert Java/Thymeleaf to TypeScript + Nunjucks/HTML
    4. Create: libs/pdf-generation/src/templates/${migration.page}-pdf.ts
    5. Use generatePdf from libs/pdf-generation/src/generator.ts
    6. Include all fields from ticket

    STEP 4 - Email Summary Field Extraction:

    NOTE: Email templates themselves are in GOV.UK Notify (external), not in the codebase.
    We only create the field extraction logic to generate summary data.

    Fetch from pip-data-management artefact summary service:
    - URL: https://raw.githubusercontent.com/hmcts/pip-data-management/master/src/main/java/uk/gov/hmcts/reform/pip/data/management/service/artefactsummary/NonStrategicListSummaryData.java
    - Search for this list type in LIST_TYPE_SUMMARY_FIELDS map
    - Example: SIAC_WEEKLY_HEARING_LIST: List.of(TIME, CASE_REFERENCE_NUMBER, CASE_NAME)
    - Extract the fields list for this specific list type

    Create: libs/list-types/${migration.page}/src/email-summary/summary-builder.ts
    - Import CaseSummary types from @hmcts/list-types-common
    - Implement extractCaseSummary() function
    - Map Java field names to proper labels (TIME → "Time", CASE_REFERENCE_NUMBER → "Case reference number")
    - Re-export formatCaseSummaryForEmail

    Follow pattern from: libs/list-types/rcj-standard-daily-cause-list/src/email-summary/summary-builder.ts

    STEP 5 - Data Conversion/Transformation:
    Search pip-data-management for data transformation logic:
    - Look in service files for sorting/filtering/grouping of publication JSON data
    - Check for field mapping and data manipulation
    - Convert Java logic to TypeScript functional style

    Create: libs/list-types/${migration.page}/src/conversion/${migration.page}-config.ts
    - Field mapping configuration for publication JSON
    - Data transformation functions
    - Sorting/filtering logic
    - Follow pattern from: libs/list-types/rcj-standard-daily-cause-list/src/conversion/

    Also create TypeScript types for publication JSON data (NOT database):
    - libs/list-types/${migration.page}/src/models/${migration.page}.types.ts
    - Define interfaces for the publication JSON structure
    - Example: HearingList, Hearing, CaseDetails (from the JSON schema)

    STEP 6 - Create List-Type Module Structure and Register:

    A) Create module configuration files:
    1. package.json - "@hmcts/list-types-${migration.page}" with proper exports
    2. tsconfig.json - extends root, excludes tests/assets
    3. src/config.ts - exports moduleRoot path
    4. src/index.ts - exports schemas, email summary, PDF, conversion, types

    B) Register email summary in notification service:
    Update: libs/notifications/src/notification/notification-service.ts
    \`\`\`typescript
    import { extractCaseSummary as extract${migration.page.replace(/-/g, '')}, formatCaseSummaryForEmail } from "@hmcts/list-types-${migration.page}";

    const ${migration.page.replace(/-/g, '')}Config: EmailBuilderConfig = {
      extract: extract${migration.page.replace(/-/g, '')} as SummaryExtractor,
      format: formatCaseSummaryForEmail
    };

    // Find the list type ID by searching for ${ticketInfo.pages.find(p => p.name === migration.page)?.listTypeConstant || 'LIST_TYPE_CONSTANT'}
    // in the ListType enum or database. Add to EMAIL_BUILDER_CONFIGS:
    const EMAIL_BUILDER_CONFIGS: EmailBuilderConfigs = {
      [LIST_TYPE_ID]: ${migration.page.replace(/-/g, '')}Config,
      // ... existing configs
    };
    \`\`\`

    C) Update root tsconfig.json:
    Add path: "@hmcts/list-types-${migration.page}": ["libs/list-types/${migration.page}/src"]

    Report what was migrated, what was created new, and any issues.`,
    {
      label: `backend-${migration.page}`,
      phase: 'Backend',
      schema: BACKEND_WORK_SCHEMA
    }
  )
);

const successfulBackendWork = backendWork.filter(Boolean).filter(b => b.validationSchemaCreated);
log(`Successfully created backend components for ${successfulBackendWork.length}/${successfulMigrations.length} pages`);

// Phase 4: Generate tests in parallel
phase('Tests');

const tests = await pipeline(
  successfulMigrations,

  (migration) => agent(
    `Generate tests for migrated page "${migration.page}" - both frontend and backend.

    CRITICAL: Follow testing rules from .claude/rules/testing.md and .claude/rules/e2e-testing.md:
    - AAA pattern (Arrange, Act, Assert) with clear sections
    - Vitest for unit tests, Playwright for E2E
    - E2E: ONE test per user journey (not per validation/Welsh/accessibility)
    - Include Welsh and accessibility INLINE in the journey test
    - Use getByRole() selectors (preferred)
    - Tag @nightly for longer tests

    FRONTEND TESTS:

    Step 1: Create page controller unit test
    - Location: apps/web/src/pages/(core)/${migration.page}/index.test.ts
    - Test GET handler renders with correct data
    - Test POST handler if it exists (validation, redirect, error handling)
    - Mock Request/Response with proper types
    - Use Vitest with AAA pattern

    Step 2: Create E2E test
    - Location: e2e-tests/tests/${migration.page}.spec.ts
    - Test complete user journey for this page
    - Include Welsh translation test (?lng=cy)
    - Include accessibility check with AxeBuilder inline
    - Use getByRole() selectors (preferred)
    - Tag with @nightly if appropriate

    BACKEND TESTS (if backend components were created):

    Step 3: Create email summary unit test
    - Location: libs/list-types/${migration.page}/src/email-summary/summary-builder.test.ts
    - Test extractCaseSummary extracts correct fields
    - Test with various JSON data structures
    - Test empty data handling
    - Follow pattern from libs/list-types/rcj-standard-daily-cause-list/src/email-summary/summary-builder.test.ts

    Step 4: Create PDF generator unit test
    - Location: libs/list-types/${migration.page}/src/pdf/pdf-generator.test.ts
    - Test PDF generation with valid data
    - Test field rendering
    - Test with empty/missing data
    - Follow pattern from libs/list-types/rcj-standard-daily-cause-list/src/pdf/pdf-generator.test.ts

    Step 5: Create conversion logic unit test (if conversion exists)
    - Location: libs/list-types/${migration.page}/src/conversion/${migration.page}-config.test.ts
    - Test data transformation functions
    - Test sorting/filtering logic

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
      `Verify migrated components for "${migration.page}" against ticket requirements.

      Ticket requirements: ${JSON.stringify(ticketInfo)}

      FRONTEND VERIFICATION:
      1. Read apps/web/src/pages/(core)/${migration.page}/index.njk
         - Check all fields from ticket are displayed
         - Check opening statement is present
         - Check GOV.UK Design System components used correctly

      2. Read libs/${migration.page}/src/${migration.page}-page/en.ts
         - Check all content from ticket is present
         - Check field labels, headings, body text

      3. Read libs/${migration.page}/src/${migration.page}-page/cy.ts
         - Check Welsh translation is complete
         - Check all en.ts content has Welsh equivalent

      BACKEND VERIFICATION (if backend work was done):
      4. Read libs/list-types/${migration.page}/src/schemas/${migration.page}.json
         - Check schema includes all fields from ticket
         - Check required fields match ticket requirements

      5. Read libs/list-types/${migration.page}/src/email-summary/summary-builder.ts
         - Check extractCaseSummary extracts correct fields
         - From ticket: "fields to be published for the email summary" (e.g., Date, Time, Case Reference)

      6. Read libs/list-types/${migration.page}/src/pdf/pdf-template.njk
         - Check PDF template includes all fields from ticket
         - Check formatting matches GOV.UK standards

      7. Check libs/notifications/src/notification/notification-service.ts
         - Verify email summary is registered in EMAIL_BUILDER_CONFIGS

      Return verification results with specific missing items for both frontend and backend.`,
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
  backendCompleted: successfulBackendWork.length,
  tested: tests.filter(Boolean).length,
  contentIssues: contentIssues.length,
  pages: successfulMigrations.map(m => {
    const backend = backendWork.find(b => b && b.page === m.page);
    return {
      name: m.page,
      hasTests: tests.some(t => t && t.page === m.page),
      contentComplete: !contentIssues.some(v => v.page === m.page),
      backendComplete: backend ?
        (backend.validationSchemaCreated && backend.pdfTemplateCreated && backend.emailSummaryCreated) :
        false,
      issues: [
        ...m.issues || [],
        ...verifications.find(v => v && v.page === m.page)?.missingContent || [],
        ...backend?.issues || []
      ]
    };
  })
};

log(`\n✅ Migration complete: ${summary.migrated} pages migrated, ${summary.backendCompleted} with backend, ${summary.tested} with tests`);

return summary;
