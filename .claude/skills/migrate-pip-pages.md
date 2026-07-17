# migrate-pip-pages

Migrate Nunjucks templates and page controllers for tribunal list pages from pip-frontend.

When the user invokes this skill, run the `migrate-pip-pages` workflow with the issue number as args.

## Usage

```bash
/migrate-pip-pages <issue-number>
```

## Scope

This is a **frontend-only** migration: Nunjucks templates, page controllers, and their
co-located Welsh/English content. It does **not** create JSON schemas, validators, PDF
generators, email summaries, data-conversion configs, or database/list-type registrations.
Those are handled separately.

## What it does

1. **Parses ticket** to extract the pages to migrate and their frontend metadata:
   - Full display names (for the page heading/summary)
   - Fields to display
   - Opening statements for the "important information" accordion
   - Static addresses if specified
2. **Migrates frontend** (from pip-frontend):
   - Creates page templates in `apps/web/src/pages/(list-types)/`
   - Migrates Nunjucks templates using GOV.UK Design System components
   - Creates page controllers with co-located `cy.ts`/`en.ts` content
3. **Generates tests**:
   - Controller unit tests (Vitest)
   - E2E journey tests (Playwright) with Welsh + accessibility inline
4. **Verifies** the migrated pages against ticket requirements and reports any gaps for
   manual review

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

Extracts routes from issue #312, fetches those pages from pip-frontend, then migrates their
templates and controllers to the new structure.

## Ticket Requirements

Works with tribunal style guide tickets that describe list types in acceptance criteria.

**Example:** Issue #428, #429, #438 describe tribunals like:
- "SIAC Weekly Hearing List"
- "First-tier Tribunal (Tax Chamber) Weekly Hearing List"
- "RPT Eastern Weekly Hearing List"

Each includes (frontend-relevant fields):
- Full display name (for the frontend summary/heading)
- Fields to display (e.g., Date, Time, Case Reference Number)
- Opening statements for the important information accordion
- Static addresses (e.g., tribunal locations)

Routes are automatically derived from list names:
- "SIAC Weekly Hearing List" → `/siac-weekly-hearing-list`
- "RPT Eastern Weekly Hearing List" → `/rpt-eastern-weekly-hearing-list`

## What gets created

For each list type (e.g., "send-daily-hearing-list"):

**Frontend page (co-located content):**
```
apps/web/src/pages/(list-types)/send-daily-hearing-list/
├── index.ts        # Controller (imports co-located cy/en content)
├── index.njk       # Template with GOV.UK components
├── en.ts           # English content (page title, field labels, opening statement)
├── cy.ts           # Welsh content (same structure as en.ts)
└── index.test.ts   # Controller unit tests
```

**E2E tests:**
```
e2e-tests/tests/send-daily-hearing-list.spec.ts  # Journey test with Welsh + accessibility
```

## Notes

- **Frontend only** - templates, controllers, and co-located content; no backend or DB work
- **Co-located content** - `cy.ts`/`en.ts` live alongside the controller (the default pattern)
- Flexible route matching handles naming variations
- Converts pip-frontend Nunjucks/i18n to the new structure
- Follows GOV.UK Design System patterns
- Tests follow AAA pattern with Welsh + accessibility inline
- Verifies migrated pages against ticket requirements and reports gaps for developer review
