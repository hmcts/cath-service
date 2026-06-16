export const meta = {
  name: 'migrate-pip-pages',
  description: 'Migrate views and accompanying logic from pip services',
  phases: [
    { title: 'Discover', detail: 'Parse ticket and fetch pages from pip-frontend' },
    { title: 'Database Setup', detail: 'Create list type enums, database entries, and configure access control' },
    { title: 'Migrate Backend', detail: 'Create schemas, PDFs, email summary, and error handling from pip-data-management' },
    { title: 'Migrate Frontend', detail: 'Create content modules and page controllers' },
    { title: 'Register Services', detail: 'Register list types across all services (upload form, validation, PDF registry)' },
    { title: 'Tests', detail: 'Generate unit and E2E tests for all components' },
    { title: 'Verify', detail: 'Verify all components against ticket requirements' },
    { title: 'Fix Issues', detail: 'Automatically fix verification issues (up to 3 attempts)' },
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
          uploadFormName: { type: 'string', description: 'Short name for upload form (e.g., "SEND Daily Hearing List")' },
          listTypeConstant: { type: 'string', description: 'Java constant name from pip-data-management (e.g., "SEND_DAILY_HEARING_LIST")' },
          jurisdiction: { type: 'string', description: 'Jurisdiction (e.g., "Tribunal", "Civil")' },
          region: { type: 'string', description: 'Region (e.g., "National", "London")' },
          frequency: { type: 'string', description: 'Publishing frequency (e.g., "daily", "weekly")' },
          accessLevel: { type: 'string', description: 'Access level (e.g., "public", "private")' },
          fieldsToDisplay: { type: 'array', items: { type: 'string' }, description: 'Fields to display in style guide' },
          emailSummaryFields: { type: 'array', items: { type: 'string' }, description: 'Fields for email summary' },
          openingStatement: { type: 'string', description: 'Opening statement for important information accordion' },
          staticAddress: { type: 'string', description: 'Static tribunal address if specified' }
        },
        required: ['name', 'route', 'fullDisplayName', 'uploadFormName', 'listTypeConstant']
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
    validationErrorHandlerCreated: { type: 'boolean' },
    pdfTemplateCreated: { type: 'boolean' },
    emailSummaryCreated: { type: 'boolean' },
    listManipulationCreated: { type: 'boolean' },
    localesCreated: { type: 'boolean' },
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
  - Full display name: Complete name for frontend summary (e.g., "First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List")
  - Upload form name: Shorter name for upload form (e.g., "SEND Daily Hearing List")
  - Derived route: Convert uploadFormName (if specified) or fullDisplayName to kebab-case
  - List type constant: Derive Java constant name for pip-data-management lookup
    * Convert to SCREAMING_SNAKE_CASE
    * Example: "SEND Daily Hearing List" → "SEND_DAILY_HEARING_LIST"
    * Example: "RPT Eastern Weekly Hearing List" → "RPT_EASTERN_WEEKLY_HEARING_LIST"
  - Jurisdiction: (Civil, Tribunal, Family, etc.)
  - Region: (National, London, Yorkshire, etc.)
  - Frequency: (daily, weekly, rarely, etc.)
  - Access level: (public, private) - look for "private hearings", "classified", or "user groups"
  - Fields to display: Extract from "Data fields to be displayed within the [list name]" sections
  - Email summary fields: Extract from "fields to be published in the email summary" sections
  - Opening statement: Full text from "opening statement displayed within the important information accordion"
  - Static address: Any tribunal/court address mentioned (e.g., "East London Tribunal Service, HMCTS...")
  - Ordering/priority rules: (if specified)

  IMPORTANT: For display names vs upload form names:
  - "full list names shall be displayed as follows in the front-end summary" → fullDisplayName
  - "On the Excel file upload form, the lists will be displayed as" → uploadFormName
  - Use uploadFormName for route derivation if both are provided

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

// Phase 2: Database Setup - Add list types to configuration
phase('Database Setup');

log('Adding new list types to database configuration');

await agent(
  `Add new list types to database configuration.

  List types to create: ${JSON.stringify(ticketInfo.pages)}

  STEP 1 - Check if list types already exist:
  - Read libs/location/src/list-type-data.ts
  - Check if these list type constants already exist in the listTypeData array
  - Note which ones are new vs existing

  STEP 2 - Find next available ID:
  - Get the highest ID in listTypeData array
  - Use next sequential ID for new entries

  STEP 3 - Add new list types to listTypeData:
  For each new list type from ticket, add to libs/location/src/list-type-data.ts:

  {
    id: <next-id>,
    name: "<LIST_TYPE_CONSTANT>",  // e.g., "SEND_DAILY_HEARING_LIST"
    englishFriendlyName: "<fullDisplayName>",  // e.g., "First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List"
    welshFriendlyName: "<fullDisplayName>",  // Same as English if no Welsh translation provided yet
    provenance: "NON_STRATEGIC",  // For non-strategic publishing route
    urlPath: "<route-without-slash>",  // e.g., "send-daily-hearing-list"
    isNonStrategic: true,
    defaultSensitivity: "<accessLevel>",  // "Public" or "Private" from ticket
    shortenedFriendlyName: "<uploadFormName>",  // e.g., "SEND Daily Hearing List"
    subJurisdictionIds: [<mapped-ids>]  // Map jurisdiction+region to sub-jurisdiction IDs (check existing patterns)
  }

  STEP 4 - Map jurisdiction and region to subJurisdictionIds:
  - Read existing listTypeData entries to understand sub-jurisdiction mapping
  - Tribunal + National → sub-jurisdiction ID (check existing tribunal entries)
  - Tribunal + London → sub-jurisdiction ID (check existing tribunal entries)
  - If unclear, document the mapping needed and suggest consulting existing data

  STEP 5 - Verify the additions:
  - Ensure all required fields are populated
  - Verify IDs are sequential and unique
  - Check that shortenedFriendlyName matches uploadFormName from ticket
  - Check that englishFriendlyName matches fullDisplayName from ticket

  Report:
  - How many list types were added
  - What IDs were assigned
  - Any sub-jurisdiction mappings that need verification`,
  {
    label: 'database-setup'
  }
);

log('Database configuration updated - list types registered');

// Phase 3: Backend work - fetch schemas and templates from pip-data-management
phase('Migrate Backend');

const backendWork = await pipeline(
  legacyPages.pages,

  (page) => agent(
    `Migrate backend components for "${page.name}" from pip-data-management.

    CRITICAL: All backend components already exist in pip-data-management and must be migrated.
    If you cannot find any component after thorough searching, STOP and ask the developer for help.
    Do NOT create placeholder code - migrate existing implementations.

    List type information:
    - Page name: ${page.name}
    - List type constant: ${ticketInfo.pages.find(p => p.name === page.name)?.listTypeConstant || 'UNKNOWN'}
    - Use this constant to find components in pip-data-management

    Follow conventions from CLAUDE.md and .claude/rules/backend.md:
    - JSON Schema with AJV for validation
    - Functional style
    - ES modules with .js extensions

    Page: ${page.name}
    Ticket requirements: ${JSON.stringify(ticketInfo)}

    IMPORTANT: Create a unified list-type module at libs/list-types/${page.name}/
    This module will contain: schemas, locales (i18n), email-summary, PDF, conversion, models

    STEP 1 - Create Locales from pip-frontend i18n AND ticket data:
    - Fetch i18n files from pip-frontend (locales/en/*.json and cy/*.json)
    - Extract content specific to this list type
    - Create: libs/list-types/${page.name}/src/locales/en.ts
      * Convert JSON to TypeScript object
      * Include: page title, fields, opening statement (from ticket), labels
      * Add staticAddress if specified in ticket (e.g., AST tribunal address)
      * Add any contact emails or special instructions from ticket
    - Create: libs/list-types/${page.name}/src/locales/cy.ts
      * Welsh translation (if exists in pip-frontend)
      * Otherwise create with TODO comments for translations
      * Include same structure as en.ts (staticAddress, contact details, etc.)

    STEP 2 - Fetch JSON Validation Schema AND Create Error Handling:
    A) Fetch schema from pip-data-management:
    - Try: https://raw.githubusercontent.com/hmcts/pip-data-management/master/src/main/resources/schemas/
    - Search for files matching list type (e.g., "send", "cic", "ast", "tribunal")
    - Fetch JSON schema using curl
    - Copy to: libs/publication/src/validation/schemas/${page.name}-schema.json

    B) Create validation error handler:
    - Create: libs/list-types/${page.name}/src/validation/error-formatter.ts
    - Implement function to format AJV validation errors into user-friendly messages
    - Map JSON schema paths to field labels (e.g., "/hearings/0/time" → "Time in first hearing")
    - Follow pattern from existing list types
    - Export formatValidationErrors(errors: ErrorObject[]) → string[]

    STEP 3 - Fetch PDF Generation Logic:
    PDF templates are at:
    - Java service: https://github.com/hmcts/pip-data-management/tree/master/src/main/java/uk/gov/hmcts/reform/pip/data/management/service/filegeneration
    - Thymeleaf templates: https://github.com/hmcts/pip-data-management/tree/master/src/main/resources/templates

    Actions:
    1. Find the Java file generation service for this list type (search filegeneration/ directory)
    2. Find the Thymeleaf template (search templates/ directory)
    3. Convert Java/Thymeleaf to TypeScript + Nunjucks/HTML
    4. Create: libs/pdf-generation/src/templates/${page.name}-pdf.ts
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

    Create: libs/list-types/${page.name}/src/email-summary/summary-builder.ts
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

    Create: libs/list-types/${page.name}/src/conversion/${page.name}-config.ts
    - Field mapping configuration for publication JSON
    - Data transformation functions
    - Sorting/filtering logic
    - Follow pattern from: libs/list-types/rcj-standard-daily-cause-list/src/conversion/

    Also create TypeScript types for publication JSON data (NOT database):
    - libs/list-types/${page.name}/src/models/${page.name}.types.ts
    - Define interfaces for the publication JSON structure
    - Example: HearingList, Hearing, CaseDetails (from the JSON schema)

    STEP 6 - Create List-Type Module Structure and Register:

    A) Create module configuration files:
    1. package.json - "@hmcts/list-types-${page.name}" with proper exports
    2. tsconfig.json - extends root, excludes tests/assets
    3. src/config.ts - exports moduleRoot path
    4. src/index.ts - exports schemas, email summary, PDF, conversion, types

    B) Register email summary in notification service:
    Update: libs/notifications/src/notification/notification-service.ts
    \`\`\`typescript
    import { extractCaseSummary as extract${page.name.replace(/-/g, '')}, formatCaseSummaryForEmail } from "@hmcts/list-types-${page.name}";

    const ${page.name.replace(/-/g, '')}Config: EmailBuilderConfig = {
      extract: extract${page.name.replace(/-/g, '')} as SummaryExtractor,
      format: formatCaseSummaryForEmail
    };

    // Find the list type ID by searching for ${ticketInfo.pages.find(p => p.name === page.name)?.listTypeConstant || 'LIST_TYPE_CONSTANT'}
    // in the ListType enum or database. Add to EMAIL_BUILDER_CONFIGS:
    const EMAIL_BUILDER_CONFIGS: EmailBuilderConfigs = {
      [LIST_TYPE_ID]: ${page.name.replace(/-/g, '')}Config,
      // ... existing configs
    };
    \`\`\`

    C) Update root tsconfig.json:
    Add path: "@hmcts/list-types-${page.name}": ["libs/list-types/${page.name}/src"]

    Report what was migrated, what was created new, and any issues.`,
    {
      label: `backend-${page.name}`,
      phase: 'Migrate Backend',
      schema: BACKEND_WORK_SCHEMA
    }
  )
);

const successfulBackendWork = backendWork.filter(Boolean).filter(b => b.validationSchemaCreated);
log(`Successfully created backend components for ${successfulBackendWork.length}/${legacyPages.pages.length} pages`);

// Phase 3: Frontend migration - create page controllers and templates
phase('Migrate Frontend');

const migrations = await pipeline(
  successfulBackendWork,

  (backendResult) => {
    const page = legacyPages.pages.find(p => p.name === backendResult.page);
    if (!page) return null;

    return agent(
      `Migrate frontend components for page "${page.name}".

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

      NOTE: The unified list-type module (libs/list-types/${page.name}/) has already been created in the Backend phase
      with locales (i18n), schemas, PDF, and email summary. You can now import from it.

      Step 1: Create page template at apps/web/src/pages/(list-types)/${page.name}/
      - Create index.njk (Nunjucks template)
      - Follow the GOV.UK style guide page pattern
      - Include "important information" details component with opening statement
      - Display fields as specified in ticket (Date, Time, Case Reference, etc.)
      - Ensure proper heading hierarchy
      - Use GOV.UK Design System components
      - Use i18n variables from the list-type module

      Step 2: Create page controller
      - Location: apps/web/src/pages/(list-types)/${page.name}/index.ts
      - Import locales from @hmcts/list-types-${page.name}
      - Implement GET handler to render the page
      - Follow pattern from existing list-type pages

      Report what was created.`,
      {
        label: `frontend-${page.name}`,
        phase: 'Migrate Frontend',
        schema: MIGRATION_RESULT_SCHEMA
      }
    );
  }
);

const successfulMigrations = migrations.filter(Boolean).filter(m => m.controllerCreated && m.templateMigrated);
log(`Successfully migrated frontend for ${successfulMigrations.length}/${successfulBackendWork.length} pages`);

// Phase 4: Register Services - Register list types across all services
phase('Register Services');

log('Registering list types across services (upload form, validation, PDF registry)');

await agent(
  `Register migrated list types across all services.

  List types to register: ${JSON.stringify(successfulMigrations.map(m => m.page))}
  Ticket information: ${JSON.stringify(ticketInfo)}

  STEP 1 - Register in Upload Form Service:
  The upload form needs to display list types for file uploads.

  A) Find upload form configuration:
  - Search for files related to file upload, list type dropdown, or Excel upload
  - Look in apps/web or libs for upload form logic
  - Check for list type selection components

  B) Add list types to upload form:
  - Use uploadFormName from ticket (short name, e.g., "SEND Daily Hearing List")
  - Map to list type ID from database
  - Ensure list types appear in correct jurisdiction/region dropdowns
  - Follow existing pattern in upload form code

  STEP 2 - Register in Validation Service:
  Update: libs/publication/src/validation/validator.ts (or similar)

  For each list type:
  - Import schema from './schemas/<list-type-name>-schema.json'
  - Register schema with validator for this list type ID
  - Map list type constant to schema
  - Follow existing validation registration pattern

  STEP 3 - Register in PDF Generation Service:
  Update: libs/pdf-generation/src/pdf-registry.ts (or similar)

  For each list type:
  - Import PDF generator from list-type module
  - Register PDF generator for this list type ID
  - Map list type constant to PDF generation function
  - Follow existing PDF registration pattern

  STEP 4 - Verify Email Summary Registration:
  Check: libs/notifications/src/notification/notification-service.ts

  - Verify email summary was registered in Backend phase
  - Ensure EMAIL_BUILDER_CONFIGS includes entries for new list types
  - Verify list type IDs match database configuration

  STEP 5 - Verify Route Registration:
  Check: apps/web/src/app.ts

  - Verify module roots are imported and added to modulePaths
  - Ensure pages are discoverable (apps/web/src/pages/(list-types)/)
  - Test that routes are accessible

  Report:
  - Which services were updated
  - Any manual configuration steps needed
  - Any issues or missing registrations`,
  {
    label: 'register-services'
  }
);

log('Service registration complete');

// Phase 5: Generate tests
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

    Step 6: Create validation error handler test
    - Location: libs/list-types/${migration.page}/src/validation/error-formatter.test.ts
    - Test formatValidationErrors with various AJV error objects
    - Test field path mapping (JSON path → friendly label)
    - Test with missing fields, invalid types, constraint violations
    - Verify user-friendly error messages

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
      1. Read apps/web/src/pages/(list-types)/${migration.page}/index.njk
         - Check all fields from ticket are displayed
         - Check opening statement in "important information" accordion
         - Check GOV.UK Design System components used correctly
         - Check static content (addresses, contact details) if specified

      2. Read apps/web/src/pages/(list-types)/${migration.page}/index.ts
         - Check controller imports locales from list-type module
         - Check GET handler renders with correct data

      BACKEND VERIFICATION:
      3. Read libs/list-types/${migration.page}/src/locales/en.ts
         - Check all content from ticket (page title, fields, opening statement)
         - Check static address if specified in ticket
         - Check field labels match ticket requirements

      4. Read libs/list-types/${migration.page}/src/locales/cy.ts
         - Check Welsh translation structure matches en.ts

      5. Read libs/publication/src/validation/schemas/${migration.page}-schema.json
         - Check schema includes all fields from ticket

      6. Read libs/list-types/${migration.page}/src/validation/error-formatter.ts
         - Check error handler exists

      7. Read libs/list-types/${migration.page}/src/email-summary/summary-builder.ts
         - Check extractCaseSummary extracts correct fields from ticket

      8. Check PDF template exists at libs/list-types/${migration.page}/src/pdf/

      REGISTRATION VERIFICATION:
      9. Check libs/location/src/list-type-data.ts
         - Verify list type added with correct displayName, uploadFormName, jurisdiction, region

      10. Check libs/notifications/src/notification/notification-service.ts
         - Verify email summary registered in EMAIL_BUILDER_CONFIGS

      11. Check apps/web/src/app.ts
         - Verify module roots imported and registered

      Return verification results with specific missing items.`,
      {
        label: `verify-${migration.page}`,
        phase: 'Verify',
        schema: VERIFICATION_SCHEMA
      }
    );
  }
);

let contentIssues = verifications
  .filter(Boolean)
  .filter(v => !v.contentComplete);

if (contentIssues.length > 0) {
  log(`⚠️  Content verification found issues in ${contentIssues.length} pages`);
}

// Phase 8: Fix Issues - Self-correction loop (max 3 attempts)
phase('Fix Issues');

const MAX_FIX_ATTEMPTS = 3;
let fixAttempt = 0;

while (contentIssues.length > 0 && fixAttempt < MAX_FIX_ATTEMPTS) {
  fixAttempt++;
  log(`Fix attempt ${fixAttempt}/${MAX_FIX_ATTEMPTS} - Fixing ${contentIssues.length} pages with issues`);

  const fixes = await pipeline(
    contentIssues,

    (issue) => agent(
      `Fix verification issues for "${issue.page}".

      Issues found:
      ${issue.missingContent?.map(m => `- ${m}`).join('\n') || 'No specific issues listed'}

      Suggestions:
      ${issue.suggestions?.map(s => `- ${s}`).join('\n') || 'No suggestions provided'}

      Ticket requirements: ${JSON.stringify(ticketInfo.pages.find(p => p.name === issue.page))}

      INSTRUCTIONS:
      1. Read the files mentioned in the issues
      2. Fix ONLY the specific problems listed
      3. For missing files: Create them following existing patterns
      4. For incorrect fields: Update to match ticket requirements exactly
      5. For content mismatches: Update to match ticket wording exactly

      CRITICAL:
      - Use pip-data-management as source of truth where possible
      - For email summary fields, use EXACT fields from ticket
      - For opening statements, use EXACT text from ticket
      - Create missing error-formatter.ts if it doesn't exist

      Report what was fixed.`,
      {
        label: `fix-${issue.page}-attempt-${fixAttempt}`,
        phase: 'Fix Issues'
      }
    )
  );

  log(`Completed ${fixes.filter(Boolean).length} fixes, re-verifying...`);

  // Re-verify the pages that had issues
  const reVerifications = await pipeline(
    contentIssues,

    (issue) => agent(
      `Re-verify migrated components for "${issue.page}" after fixes.

      Original issues:
      ${issue.missingContent?.map(m => `- ${m}`).join('\n')}

      Use the same verification checklist as before to check if issues are resolved.

      Return verification results.`,
      {
        label: `reverify-${issue.page}-attempt-${fixAttempt}`,
        phase: 'Fix Issues',
        schema: VERIFICATION_SCHEMA
      }
    )
  );

  // Update contentIssues with remaining issues
  contentIssues = reVerifications
    .filter(Boolean)
    .filter(v => !v.contentComplete);

  if (contentIssues.length > 0) {
    log(`${contentIssues.length} pages still have issues after fix attempt ${fixAttempt}`);
  } else {
    log('✅ All issues resolved!');
    break;
  }
}

if (contentIssues.length > 0) {
  log(`⚠️ ${contentIssues.length} pages still have unresolved issues after ${MAX_FIX_ATTEMPTS} attempts - manual review needed`);
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
  fixAttempts: fixAttempt,
  unresolvedIssues: contentIssues.length,
  pages: successfulMigrations.map(m => {
    const backend = backendWork.find(b => b && b.page === m.page);
    const remainingIssues = contentIssues.find(v => v.page === m.page);

    return {
      name: m.page,
      hasTests: tests.some(t => t && t.page === m.page),
      contentComplete: !remainingIssues,
      backendComplete: backend ?
        (backend.validationSchemaCreated && backend.pdfTemplateCreated && backend.emailSummaryCreated) :
        false,
      issues: remainingIssues ? [
        ...remainingIssues.missingContent || [],
        ...remainingIssues.suggestions || []
      ] : []
    };
  })
};

if (summary.unresolvedIssues > 0) {
  log(`\n⚠️ Migration complete with ${summary.unresolvedIssues} pages needing manual review after ${fixAttempt} fix attempts`);
} else {
  log(`\n✅ Migration complete: ${summary.migrated} pages migrated, all issues auto-resolved in ${fixAttempt} fix attempts`);
}

return summary;
