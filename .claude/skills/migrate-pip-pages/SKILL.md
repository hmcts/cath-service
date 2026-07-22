---
name: migrate-pip-pages
description: Migrate a Nunjucks template (the .njk view + the en/cy locale content it renders) from the legacy pip-frontend service into this repo. Use whenever a ticket or plan calls for a new rendered page or list-type view — search, account, subscription, admin, static content, or a tribunal/cause list page — because an equivalent .njk almost always already exists in hmcts/pip-frontend, so copy and adapt it rather than writing markup from scratch. Trigger even when the user only says "add a page for X" or "plan ticket 428" without naming pip-frontend, and during qk-plan whenever a new rendered view is in scope. Scope is the template and its locale content ONLY — not controllers, list-type libs (schema/validator/renderer/PDF/email summary), registration, or DB work. Do NOT use for flat-file / manual-upload list types or list-type registration/config (e.g. list-type-data.ts entries, comparator tweaks) — those have no template to migrate.
---

# migrate-pip-pages

Almost every rendered page in this service already has a working Nunjucks template in the
legacy **pip-frontend** (github.com/hmcts/pip-frontend). Rather than write GOV.UK markup
from scratch, find that source `.njk` and adapt it to this repo's conventions, along with
the `en`/`cy` locale content it renders.

**Scope: the template and its locale content only.** This skill produces the `.njk` view
and the `en.ts`/`cy.ts` (or locale JSON) keys it consumes. It does **not** write the page
controller, the list-type lib (JSON schema, validator, renderer, PDF generator, email
summary), module registration, or DB/list-type-data work — those are separate concerns,
often a whole `libs/list-types/<name>/` package. When a ticket includes them (a strategic
list type like `cop-daily-cause-list` does), migrate the template here and flag the rest
as separate work; model the lib on the nearest sibling (e.g. `civil-and-family-daily-cause-list`).

Use this skill in two situations:

- **Planning** (e.g. inside `/qk-plan`): locate the source `.njk` and name the target
  template pattern so the plan points at concrete files.
- **Implementing**: copy the pip-frontend template and adapt it, plus its locale content.

**When not to use.** No template, nothing to migrate. Flat-file / manual-upload list types
(like `KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST`) are served by the existing flat-file viewer
with `urlPath` unset — no rendered template. Likewise list-type **registration/config**
(entries in `libs/location/src/list-type-data.ts`, seeding, ordering/comparator tweaks) has
no template to copy. The skill does not apply to either.

## Step 1 — Fetch the source from pip-frontend

Raw files live at `raw.githubusercontent.com/hmcts/pip-frontend/master/...`:

| What | Path |
|------|------|
| Route → view mapping | `src/main/routes/routes.ts` |
| Controller | `src/main/controllers/<Name>Controller.ts` |
| View | `src/main/views/**/<name>.njk` (cause lists are often under `views/style-guide/`) |
| i18n content | `src/main/resources/locales/{en,cy}/<name>.json` |

**Fetch with `curl` via Bash, not WebFetch.** WebFetch runs the file through a summarizing
model and returns a *description*, not the markup — useless for copying. Get the verbatim
source:

```bash
curl -sS "https://raw.githubusercontent.com/hmcts/pip-frontend/master/src/main/views/style-guide/<name>.njk"
```

pip-frontend's file names and directories are inconsistent, so don't guess from the URL. If
a path 404s: read `routes.ts` to find the controller, read the controller to find the exact
`render("<view>")` name, and try `views/style-guide/` and kebab-case variants. Save the raw
`.njk` and both locale JSONs locally so you can diff against them, and record the resolved
paths in the plan.

**If the fetch is unobtainable** — every candidate path 404s, or the network/GitHub is
unreachable (locked-down CI, offline) — stop and ask the user to paste the source `.njk`
and locale JSON. Do not reconstruct the page from the sibling and present it as a copy:
that produces a plausible-looking but unverified template (the exact failure mode of
building from memory). If the user can't supply the source either, say so explicitly and
mark the output as an unverified best-effort based on the sibling, so nobody mistakes it
for a faithful migration.

## Step 2 — Find the closest existing template to model on

Read an existing template in this repo before writing anything — matching one is faster and
more correct than inventing markup. Where the `.njk` and its locale content live depends on
the page type:

- **Simple pages** — co-located. Template at `apps/web/src/pages/<group>/<page>/index.njk`
  with `cy.ts`/`en.ts` beside it. See `(public)/search/`. Route groups in parentheses
  (e.g. `(public)`, `(auth)`) don't add a URL prefix; plain directories do.
- **List-type pages** — template at
  `apps/web/src/pages/(list-types)/<name>/<name>.njk`, but its locale content lives in the
  list-type lib (`libs/list-types/<name>/src/locales/{en,cy}.ts`), not co-located. See
  `(list-types)/civil-and-family-daily-cause-list/` and its lib. You migrate the `.njk` and
  the locale keys; the controller and lib plumbing are separate work (see scope note above).

Every template extends `layouts/base-template.njk` and renders inside `{% block page_content %}`
using GOV.UK macros (e.g. `govukTable`, `govukAccordion`).

## Step 3 — Copy and adapt the template + locale content

1. **Template**: start from the fetched pip-frontend `.njk` — copy its actual structure
   (table columns, row layout, accordion nesting, conditional rows), don't reconstruct it
   from memory or from the sibling. The sibling is your guide for *this repo's conventions*
   (extend `layouts/base-template.njk`, use GOV.UK macros, swap pip-frontend's
   `list-template.njk`/`common-components` macros for local equivalents) — not for the
   page's content structure. Keep view-model variable names aligned with the sibling so the
   existing controller/renderer feeds it unchanged. Two specifics worth checking against the
   source, because they're easy to get wrong: a column header label may not match the field
   its cell renders (e.g. a "Case Details" header over a `caseName` cell), and reporting
   restrictions are often a full-width `colspan` row *below* the case, not a column.
2. **Locale content**: move each i18n key into `en`/`cy` (co-located `.ts` for simple pages,
   the lib's `locales/{en,cy}.ts` for list types) with the **same key structure** in both.
   Titles, column labels, court names, and static copy are content — never hardcode them in
   markup, and they must switch with the language. Where a Welsh string is missing, use the
   `[WELSH TRANSLATION REQUIRED: '...']` placeholder. Reconcile wording against the ticket
   when pip-frontend and the ticket disagree (e.g. `hearingChannel` "Hearing Channel" vs
   "Mode of hearing") — the ticket wins.

## Step 4 — Verify the port against the source

Before testing, diff your template against the saved pip-frontend source and account for
every difference. Each one should be either a deliberate convention swap (a local macro or
layout block) or a deliberate ticket reconciliation — never an accident. Walk the columns
in order, the conditional rows, and the nesting; if a difference isn't explainable, you
copied it wrong. This is the check that catches the silent errors: a dropped column, a
header over the wrong field, a `colspan` row flattened into a column. If you built from the
sibling because the source was unobtainable (Step 1), say so here — there's nothing to diff
against, so the port is unverified.

## Step 5 — Template test

Write the co-located template test (`index.njk.test.ts`, Vitest) — the standard pattern for
a migrated template. Follow an existing one such as `(public)/search/index.njk.test.ts`. It
has four `describe` blocks:

- *Template file* — asserts `index.njk` (or `<name>.njk`) exists via `existsSync`.
- *English locale* — asserts each key in `en` equals its expected string.
- *Welsh locale* — the same assertions against `cy`.
- *Locale consistency* — `Object.keys(en).sort()` equals `Object.keys(cy).sort()`, and every
  required key is present in both. This catches the common bug where Welsh content drifts out
  of sync with English.

Controller unit tests, list-type lib tests, and E2E journeys are part of the controller/lib
work, not the template migration — out of scope here.
