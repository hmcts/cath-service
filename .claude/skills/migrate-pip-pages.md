# migrate-pip-pages

Migrate pages from pip-frontend legacy service based on routes listed in the ticket.

When the user invokes this skill, run the `migrate-pip-pages` workflow with the issue number as args.

## Usage

```bash
/migrate-pip-pages <issue-number>
```

## What it does

1. **Parses ticket** to extract routes/page names from tables or lists
2. **Searches pip-frontend** using flexible matching for those routes (handles naming differences)
3. **Migrates in parallel**:
   - Creates lib module with `en.ts`/`cy.ts` content files
   - Creates page controller in `apps/web/src/pages/`
   - Migrates Nunjucks template with GOV.UK components
   - Generates unit tests for controller
   - Generates E2E tests for user journey
4. **Verifies content** against ticket requirements
5. **Updates routes** in `apps/web/src/app.ts`

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

The ticket must include routes in one of these formats:

**Route table:**
```markdown
| Page | Route |
| 5 | `/subscription-add-list` |
| 6 | `/subscription-add-list-language` |
```

**Route list:**
```markdown
New routes: `/crime-login`, `/crime-login/return`, `/crime-rejected`
```

**URL structure:**
```markdown
## URL Structure
- Sign-in options: `/sign-in`
- Dashboard: `/dashboard`
```

## What gets created

For each page (e.g., "home"):

```
libs/home/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts           # Module configuration
    ├── index.ts            # Exports content
    ├── home-page/
    │   ├── en.ts          # English content
    │   └── cy.ts          # Welsh content

apps/web/src/pages/
└── (core)/
    └── home/
        ├── index.ts        # Controller with GET export
        ├── index.njk       # Migrated template
        └── index.test.ts   # Unit tests

e2e-tests/tests/
└── home.spec.ts           # E2E test with accessibility checks
```

## Notes

- Uses flexible route matching (handles minor naming differences between ticket and pip-frontend)
- Handles cases where one ticket route maps to multiple pip-frontend pages
- Preserves all i18n content from legacy JSON files
- Updates GOV.UK component usage to latest patterns
- Follows new codebase conventions (camelCase, functional style)
- Verifies content against ticket requirements
- Generates tests following AAA pattern
