# migrate-pip-pages

Complete end-to-end migration of tribunal list pages from pip services (pip-frontend, pip-data-management, pip-publication-service).

When the user invokes this skill, run the `migrate-pip-pages` workflow with the issue number as args.

## Usage

```bash
/migrate-pip-pages <issue-number>
```

## What it does

1. **Parses ticket** to extract list types/pages with detailed metadata:
   - Full display names and upload form names
   - Jurisdiction, region, frequency, access level
   - Fields to display and email summary fields
   - Opening statements for "important information" accordion
   - Static addresses and contact details
2. **Database setup**:
   - Adds list types to `libs/location/src/list-type-data.ts`
   - Maps jurisdiction/region to sub-jurisdiction IDs
   - Configures display names, upload form names, access control
3. **Migrates backend** (pip-data-management):
   - Fetches and converts JSON schemas
   - Creates validation error handlers for user-friendly messages
   - Converts PDF templates (Java/Thymeleaf → TypeScript/Nunjucks)
   - Extracts email summary field configuration
   - Creates data conversion/transformation logic
   - Creates unified list-type module with locales (i18n)
4. **Migrates frontend** (pip-frontend):
   - Creates page controllers in `apps/web/src/pages/(list-types)/`
   - Migrates Nunjucks templates with GOV.UK components
   - Imports locales from backend list-type modules
5. **Registers services**:
   - Registers in upload form (with short names)
   - Registers in validation service
   - Registers in PDF generation service
   - Registers in notification service (email summaries)
6. **Generates tests**:
   - Frontend: controller unit tests, E2E journey tests
   - Backend: email summary tests, PDF generator tests, validation error handler tests
7. **Verifies** all components against ticket requirements
8. **Fixes issues** automatically (up to 3 attempts):
   - Identifies verification failures
   - Fixes missing files, incorrect fields, content mismatches
   - Re-verifies after each fix
   - Reports unresolved issues for manual review

## Instructions

When this skill is invoked with an issue number:

1. Extract the issue number from the user's command
2. Call the Workflow tool with:
   - name: "migrate-pip-pages"
   - args: the issue number as a number (not string)
3. Wait for the workflow to complete
4. Report the summary results to the user

Example invocation:
```javascript
Workflow({
  name: "migrate-pip-pages",
  args: 312
})
```

## Example

```bash
/migrate-pip-pages 312
```

Extracts routes from issue #312, fetches those pages from pip-frontend, then migrates them to the new structure.

## Ticket Requirements

Works with tribunal style guide tickets that describe list types in acceptance criteria.

**Example:** Issue #428, #429, #438 describe tribunals like:
- "SIAC Weekly Hearing List" 
- "First-tier Tribunal (Tax Chamber) Weekly Hearing List"
- "RPT Eastern Weekly Hearing List"

Each includes:
- Full display name (for frontend summary) and upload form name (for file upload dropdown)
- Jurisdiction and region (mapped to sub-jurisdictions)
- Publishing frequency (daily, weekly)
- Access level (public, private)
- Fields to display (e.g., Date, Time, Case Reference Number)
- Email summary fields (subset of display fields)
- Opening statements for important information accordion
- Static addresses (e.g., tribunal locations)

Routes are automatically derived from list names:
- "SIAC Weekly Hearing List" → `/siac-weekly-hearing-list`
- "RPT Eastern Weekly Hearing List" → `/rpt-eastern-weekly-hearing-list`

## What gets created

For each list type (e.g., "send-daily-hearing-list"):

**Database configuration:**
```
libs/location/src/list-type-data.ts           # Updated with new list type entries
```

**Unified list-type module (backend + content):**
```
libs/list-types/send-daily-hearing-list/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts                              # Module configuration
    ├── index.ts                               # Exports all components
    ├── locales/                               # i18n content
    │   ├── en.ts                              # English (page title, fields, opening statement, static address)
    │   └── cy.ts                              # Welsh
    ├── validation/
    │   └── error-formatter.ts                 # User-friendly validation errors
    ├── email-summary/
    │   ├── summary-builder.ts                 # Email field extraction
    │   └── summary-builder.test.ts
    ├── pdf/
    │   ├── pdf-generator.ts                   # PDF generation
    │   ├── pdf-template.njk                   # PDF template
    │   └── pdf-generator.test.ts
    ├── conversion/
    │   └── send-daily-hearing-list-config.ts  # Data transformation
    └── models/
        └── send-daily-hearing-list.types.ts   # TypeScript types
```

**Validation schema:**
```
libs/publication/src/validation/schemas/
└── send-daily-hearing-list-schema.json        # JSON Schema from pip-data-management
```

**Frontend page:**
```
apps/web/src/pages/(list-types)/send-daily-hearing-list/
├── index.ts                                   # Controller (imports locales from list-type module)
├── index.njk                                  # Template with GOV.UK components
└── index.test.ts                              # Unit tests
```

**E2E tests:**
```
e2e-tests/tests/send-daily-hearing-list.spec.ts  # Journey test with Welsh + accessibility
```

**Service registrations:**
- Upload form configuration (displays short name)
- Validation service (schema mapping)
- PDF generation service (generator registration)
- Notification service (email summary mapping)
- Web app module paths (apps/web/src/app.ts)

## Notes

- **Self-correcting workflow** - automatically fixes issues up to 3 times before requiring manual review
- **All components migrated from existing pip services** - no placeholder code
- **Backend before frontend** - locales created in backend phase, imported by frontend
- **Database-first approach** - list types added to `list-type-data.ts` before migration
- **Comprehensive service registration** - upload form, validation, PDF, email notifications
- **User-friendly error handling** - validation errors formatted for end users
- **Static content support** - handles addresses, contact details from tickets
- **Display name variants** - separate names for frontend display vs upload form
- Flexible route matching handles naming variations
- Converts Java/Thymeleaf to TypeScript/Nunjucks
- Follows GOV.UK Design System patterns
- Tests follow AAA pattern with Welsh + accessibility inline
- Verifies all components against ticket requirements
- Reports unresolved issues for developer review if auto-fix doesn't resolve them
