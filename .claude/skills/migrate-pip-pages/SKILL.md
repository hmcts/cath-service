---
name: migrate-pip-pages
description: Migrate a Nunjucks template (the .njk view + its en/cy locale content) from the legacy hmcts/pip-frontend service, copying and adapting the existing source rather than writing markup from scratch. Trigger whenever a ticket or plan calls for a new rendered page or list-type view — including vague asks like "add a page for X" or "implement ticket N" that don't name pip-frontend. Not for flat-file publications served by the flat-file viewer.
---

# migrate-pip-pages

Find the original source `.njk` in github.com/hmcts/pip-frontend and adapt it to this repo's
conventions, along with the `en`/`cy` locale content it renders. Copy the real source — never
reconstruct the page from memory or a sibling template and present it as a migration.

## When this is the wrong tool

- **A flat *file* publication** (PDF/Excel) — served by the flat-file viewer at
  `/hearing-lists/…`. This is a property of the uploaded artefact (`Artefact.isFlatFile`),
  not of the list type: the same list type renders a template for a JSON upload.
- **Registration/config only** — entries in `libs/list-types/common/src/list-type-data.ts`,
  seeding, ordering/comparator tweaks.

"Manually uploaded" is not an exclusion: manual *JSON* upload still renders a style-guide
page, even if the ticket says there's no schema or style guide. If the ticket links a
pip-frontend `.njk` or locale JSON, migrate it.

## Scope: the template and its locale content only

- Only produce the `.njk` view and the related `en.ts`/`cy.ts` (or locale JSON) keys that it consumes
- Do not write the controller, list-type lib (JSON schema, validator, renderer, PDF generator, email
summary), module registration, or DB/list-type-data work.

## 1. Fetch the source from pip-frontend

Throughout this skill, `<name>` is the kebab-case list-type name and `<ticket>` is the ticket number
you were given — from the invoking argument, the plan, or the `docs/tickets/` folder you're working in.
If you can't determine it, ask before writing anything to `docs/tickets/`.

Files live in `hmcts/pip-frontend` on the `master` branch:

| What | Path |
|------|------|
| Route → view mapping | `src/main/routes/routes.ts` |
| Controller | `src/main/controllers/<Name>Controller.ts` |
| View | `src/main/views/**/<name>.njk` (cause lists are often under `views/style-guide/`) |
| i18n content | `src/main/resources/locales/{en,cy}/<name>.json` |

**Fetch with `gh api` via Bash, not WebFetch** — WebFetch summarizes the file into a
*description*, not the markup, which is useless for copying. Use the raw media type so the
response body is the file itself, not a base64-wrapped JSON blob:

```bash
gh api -H "Accept: application/vnd.github.raw" \
  "repos/hmcts/pip-frontend/contents/src/main/views/style-guide/<name>.njk?ref=master"
```

If `gh` is unauthenticated, fall back to `curl` against raw.githubusercontent.com:

```bash
curl -sS "https://raw.githubusercontent.com/hmcts/pip-frontend/master/src/main/views/style-guide/<name>.njk"
```

pip-frontend's file names and directories are inconsistent, so don't guess from the path. If
a fetch 404s: read `routes.ts` to find the controller, read the controller to find the exact
`render("<view>")` name, and try `views/style-guide/` and kebab-case variants. To search rather
than guess a path outright, list a directory instead of requesting raw content:

```bash
gh api "repos/hmcts/pip-frontend/contents/src/main/views/style-guide" --jq '.[].name'
```

**If the fetch is unobtainable** — every candidate path 404s, or GitHub is unreachable — stop and
ask the user to paste the source `.njk` and locale JSON. If they can't, say so and label the output
unverified; do not pass a sibling-derived page off as a migration.

## 2. Note differences between the pip source and the requirements

- Create a temporary file in docs/tickets/<ticket>/template-changes.md that contains:
  - The pip source template used.
  - A verifiable checklist of differences between the pip-frontend source template
    and the new requirements.

## 3. Find the closest existing template to model on

Read the closest existing template in this repo before writing — its location depends on page type:

- **Simple pages** — co-located: `apps/web/src/pages/<group>/<page>/index.njk` with
  `cy.ts`/`en.ts` beside it (see `(public)/search/`).
- **List-type pages** — template at `apps/web/src/pages/(list-types)/<name>/<name>.njk`, but
  locale content lives in the lib (`libs/list-types/<name>/src/locales/{en,cy}.ts`), not
  co-located (see `(list-types)/civil-and-family-daily-cause-list/`).

## 4. Copy and adapt the template + locale content

**Content structure comes from the fetched source; conventions come from the sibling; deliberate
deviations come from the Step 2 checklist.** Copy the source `.njk`'s actual structure (columns,
row layout, accordion nesting, conditional rows) — never reconstruct it from memory or the
sibling — then apply each difference recorded in `docs/tickets/<ticket>/template-changes.md`.
Use the sibling only to apply this repo's conventions: extend `layouts/base-template.njk` and render
inside `{% block page_content %}` (note: `page_content`, nested inside `content`), use GOV.UK macros,
swap pip-frontend's `list-template.njk`/`common-components` macros for local equivalents, and keep
view-model variable names aligned so the existing controller/renderer feeds it unchanged.

Three source details are easy to get wrong — check all three: a column header may not match the
field its cell renders (e.g. "Case Details" over a `caseName` cell); reporting restrictions are
often a full-width `colspan` row *below* the case, not a column; and a field may be named
differently here than in the sibling (e.g. `reportingRestrictions` as a string vs the sibling's
`reportingRestrictionDetail[]`). Each produces plausible, passing, wrong output.

**Locale content**: move each i18n key into the right `en`/`cy` files (per Step 3), keeping `en` and
`cy` key structures identical. pip's `cy` locales are usually fully translated, so carry the Welsh
across verbatim rather than emitting `[WELSH TRANSLATION REQUIRED: '…']` placeholders — only use a
placeholder for a key that has no pip equivalent. When pip-frontend and the ticket disagree on
wording (e.g. `hearingChannel` "Hearing Channel" vs "Mode of hearing"), the ticket wins.

## 5. Verify and Test

- Verify your template against the checklist created in
  `docs/tickets/<ticket>/template-changes.md` to ensure:
  - Any overruling ticket requirements have been implemented
  - No additional changes to the template have been made that aren't in scope
- Verify the view model actually feeds the template. Aligned variable names are not enough: for each
  field the template reads (`header.*`, `openJustice.*`, per-row fields), confirm the renderer
  produces it *for this list type's schema*. A field the sibling's schema makes `required` may be
  optional in yours, so the shared renderer dereferences something legitimately absent and throws —
  a 500 on a payload that just passed validation. Diff the two schemas' `required` arrays and guard.
  Template tests cannot catch this — they render a hand-built fixture, not renderer output.
- Once verified delete `docs/tickets/<ticket>/template-changes.md`.
- Write the co-located `<name>.njk.test.ts` per the "Nunjucks Template Testing" in .claude/rules/testing.md
  - Mirror the *source's* structure in your assertions — the column order and colspan
    rows confirmed against pip-frontend, not what a sibling happened to have.
