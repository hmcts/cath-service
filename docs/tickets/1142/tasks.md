# Implementation Tasks — #1142

## Schema change (the only mandatory code change)

- [ ] Add `"maxLength": 200` to `ListNote` in `libs/list-types/crown-daily-list/src/schemas/crown-daily-list.json:242`
- [ ] Confirm `ListNote` is **not** added to any `required` array and that **no** `minLength` is added

## Tests — schema validator

- [ ] Add `ListNote` to the existing hearing object in `VALID_DATA` in `libs/list-types/crown-daily-list/src/validation/json-validator.test.ts`
- [ ] Add test: `ListNote` of exactly 200 characters is valid
- [ ] Add test: `ListNote` of 199 characters is valid
- [ ] Add test: `ListNote` of 150 characters is valid (proves the old 100-char ceiling is gone)
- [ ] Add test: `ListNote` of 201 characters is invalid, and the error path identifies `ListNote`
- [ ] Add test: omitted `ListNote` is valid (field stays optional)
- [ ] Add test: empty-string `ListNote` is valid
- [ ] Add test: non-string `ListNote` is invalid
- [ ] Confirm every test deep-clones with `JSON.parse(JSON.stringify(VALID_DATA))`

## Tests — renderer

- [ ] Add test to `libs/list-types/crown-daily-list/src/rendering/renderer.test.ts`: a 200-character `ListNote` maps to `listingNotes` byte-for-byte with no truncation or trimming

## Tests — web template

- [ ] In `apps/web/src/pages/(list-types)/crown-daily-cause-list/crown-daily-cause-list.njk.test.ts`, reusing the existing `buildCase`/`buildSession`/`buildCourtHouse`/`renderList` builders and the `COLUMN` constants:
  - [ ] the Listing Notes cell text equals the full 200-character note (text equality, not a raw-HTML substring)
  - [ ] the Listing Notes cell does not carry `no-wrap` while the Case Reference cell does
  - [ ] with a note present: 6 header cells and restriction row `colspan="6"`
  - [ ] with no note on any hearing in the session: notes header absent, 5 header cells, `colspan="5"`
  - [ ] rendered with the `cy` locale: "Nodiadau rhestru" heading and note content unchanged
  - [ ] HTML-like content inside a long note is escaped, not rendered as markup

## Tests — PDF

- [ ] Add test to `libs/list-types/crown-daily-list/src/pdf/pdf-generator.test.ts`: a 200-character note appears in full in the generated output

## Tests — ingest routes

- [ ] `libs/admin-pages/src/manual-upload/`: a Crown Daily List file with a 201-character note produces a file-scoped error with `href: "#file"` and is not accepted
- [ ] `libs/admin-pages/src/manual-upload/`: a file with exactly 200 characters produces no validation error
- [ ] `libs/api/src/blob-ingestion/`: a Crown Daily List payload with a 201-character note is rejected and no artefact is published

## Explicitly NOT to be done

- [ ] Do **not** add an E2E spec — no Crown Daily List journey exists and a schema-constraint change does not justify creating one (see plan §5)
- [ ] Do **not** add a duplicate length check in the renderer, controller or TypeScript model
- [ ] Do **not** add truncation, ellipsis, line-clamp, `white-space: nowrap`, fixed column widths, or a "show more" toggle on the notes cell
- [ ] Do **not** add a character-count hint or counter — CaTH is not the data-entry point
- [ ] Do **not** log note content (special category data)
- [ ] Do **not** apply `| safe` to `listingNotes`
- [ ] No database migration, no Prisma change, no `list-type-data.ts` change, no locale key change

## Manual verification (required before sign-off)

- [ ] Public list view at 320px viewport with a 200-char note: no horizontal page scroll (WCAG 1.4.10)
- [ ] Public list view at 200% browser zoom: no content clipped or lost (WCAG 1.4.4)
- [ ] Generated PDF with a 200-char note in a 6-column table: Listing Notes column not clipped at the right page margin
- [ ] Axe scan on the rendered page with a 200-char note: no violations

## Quality gates

- [ ] `yarn lint:fix` clean
- [ ] `yarn test` passes from the repo root
- [ ] `libs/list-types/common/src/validation/guard.test.ts` still passes

## Blocked on clarification (do not implement until answered — see plan §6)

- [ ] Q2 — if accepted: add `"maxLength": 200` to `ListNote` in `crown-firm-list.json:221,437` and `crown-warned-list.json:199,460`, with matching validator tests in each package
- [ ] Q3 — if accepted: map `keyword === "maxLength"` + `instancePath` ending `/ListNote` to a field-specific message in `validateJsonFileSchema`, plus the English string and a Welsh translation
