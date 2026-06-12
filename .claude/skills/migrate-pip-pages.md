# migrate-pip-pages

Complete end-to-end migration of tribunal list pages from pip services (pip-frontend, pip-data-management, pip-publication-service).

When the user invokes this skill, run the `migrate-pip-pages` workflow with the issue number as args.

## Usage

```bash
/migrate-pip-pages <issue-number>
```

## What it does

1. **Parses ticket** to extract list types/pages from acceptance criteria (e.g., "SIAC Weekly Hearing List")
2. **Migrates frontend** (pip-frontend):
   - Creates content lib module with `en.ts`/`cy.ts`
   - Creates page controller in `apps/web/src/pages/`
   - Migrates Nunjucks template with GOV.UK components
3. **Migrates backend** (pip-data-management, pip-publication-service) in parallel:
   - Fetches and converts JSON schemas
   - Converts PDF templates (Java/Thymeleaf → TypeScript/Nunjucks)
   - Extracts email summary field configuration
   - Creates list-type module in `libs/list-types/`
4. **Generates tests**:
   - Frontend: controller unit tests, E2E journey tests
   - Backend: email summary tests, PDF generator tests
5. **Verifies** all components against ticket requirements

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
- Full display name and upload form name
- Fields to display (e.g., Date, Time, Case Reference Number)
- Opening statements for important information accordion
- Region information

Routes are automatically derived from list names:
- "SIAC Weekly Hearing List" → `/siac-weekly-hearing-list`
- "RPT Eastern Weekly Hearing List" → `/rpt-eastern-weekly-hearing-list`

## What gets created

For each list type (e.g., "siac-weekly-hearing-list"):

**Frontend content module:**
```
libs/siac-weekly-hearing-list/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts                        # Module configuration
    ├── index.ts                         # Exports content
    └── siac-weekly-hearing-list-page/
        ├── en.ts                        # English content
        └── cy.ts                        # Welsh content
```

**Frontend page:**
```
apps/web/src/pages/(core)/siac-weekly-hearing-list/
├── index.ts                             # Controller with GET export
├── index.njk                            # Migrated template
└── index.test.ts                        # Unit tests
```

**Backend list-type module:**
```
libs/list-types/siac-weekly-hearing-list/
├── package.json
├── tsconfig.json
└── src/
    ├── schemas/
    │   └── siac-weekly-hearing-list.json  # JSON Schema validation
    ├── email-summary/
    │   ├── summary-builder.ts              # Email field extraction
    │   └── summary-builder.test.ts
    ├── pdf/
    │   ├── pdf-generator.ts                # PDF generation
    │   ├── pdf-template.njk                # PDF template
    │   └── pdf-generator.test.ts
    ├── conversion/
    │   └── siac-weekly-hearing-list-config.ts  # Data transformation
    ├── models/
    │   └── siac-weekly-hearing-list.types.ts   # TypeScript types
    ├── config.ts
    └── index.ts
```

**E2E tests:**
```
e2e-tests/tests/siac-weekly-hearing-list.spec.ts  # Journey test with accessibility
```

## Notes

- **All components migrated from existing pip services** - no placeholder code
- Flexible route matching handles naming variations
- Converts Java/Thymeleaf to TypeScript/Nunjucks
- Registers email summary in notification service
- Follows GOV.UK Design System patterns
- Tests follow AAA pattern with Welsh + accessibility inline
- Verifies against ticket requirements
