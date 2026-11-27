## Implementation Tasks

### Rename (AC1)
- [x] Update `ET_DAILY_LIST` and `ET_FORTNIGHTLY_PRESS_LIST` in `libs/list-types/common/src/list-type-data.ts`: set `englishFriendlyName`, `welshFriendlyName` and `shortenedFriendlyName` to the new values. Keep `name`, `urlPath` and `defaultSensitivity` unchanged.
- [x] Update `title` and `pageTitle` in `libs/list-types/et-daily-list/src/locales/en.ts` and `cy.ts`, and remove the stale "listLookup.json" comments.
- [x] Update `title` and `pageTitle` in `libs/list-types/et-fortnightly-list/src/locales/en.ts` and `cy.ts`.
- [x] Update the JSDoc list names in both `src/validation/json-validator.ts` files.
- [x] Add the two new entries to `templates/tech-spec-references/welsh-translations-catalogue.json`.
- [x] Add two `approved` rows to `welsh/catalogue.csv`. The plugin was not available locally; ids use the catalogue's scheme, `sha1(english + "\0" + context + "\0" + welsh)` truncated to 10 hex characters, verified against all 1,217 existing rows.

### Courtel feed
- Moved to #1761 (AC removed from #1382). This includes subscribing Courtel to `ET_DAILY_LIST` and `ET_FORTNIGHTLY_PRESS_LIST` in each environment.

### Sensitivity (AC3)
- [x] Confirm that no code change is needed (`defaultSensitivity: "Public"` already set); locked in by `list-type-data.test.ts`.
- [ ] Confirm both list types are not hidden (`is_hidden`) in each deployed environment. The seed does not set `is_hidden`. (operational: after #1761 / per environment)

### Tests
- [x] Scenario 1: update the EN and CY title assertions in `libs/list-types/et-daily-list/src/index.test.ts` and `libs/list-types/et-fortnightly-list/src/index.test.ts`, and the mocked titles in both `pdf-generator.test.ts` files.
- [x] Scenario 2: add `libs/list-types/common/src/list-type-data.test.ts`, asserting new names, unchanged `urlPath` and `defaultSensitivity` "Public" for both ET entries, looked up by `name`.
- [ ] Scenario 3 (manual, lower environment): publish one file of each type through `/v1/publication`. Verify the new names (EN and CY) on the page, PDF, summary of publications and manual-upload picker, and that the artefact is Public. The Courtel check is in #1761.
- [x] Scenario 4: run `yarn test` and `yarn lint:fix` from the root, and grep the repo to confirm the old names remain only in `docs/`, `requirements/` and the legacy catalogue rows. Done: 72 of 74 workspaces passed. The one failure is `@hmcts/ui-baseline` `runs.test.ts` "should stop a run that hangs at its time limit", a shell-signal timing test that does not depend on this change. Biome was run on the changed files rather than as root `lint:fix`, because root `lint:fix` would rewrite unrelated files. The old names remain only in the legacy catalogue rows and the synthetic `generate-seed-sql.test.ts` fixture.
