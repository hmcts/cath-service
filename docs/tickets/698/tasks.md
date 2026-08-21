# Tasks — Issue #698: Add/Update provenance for all lists

## Implementation Tasks

### Shared constant and validation
- [ ] Create `libs/list-types/common/src/allowed-provenance.ts` with `ALLOWED_PROVENANCE_OPTIONS`, `AllowedProvenance`, `isAllowedProvenance`, `parseAllowedProvenance`, `canonicaliseAllowedProvenance`, plus the `VARCHAR(50)` headroom comment
- [ ] Export the new module from `libs/list-types/common/src/index.ts`
- [ ] Add `libs/list-types/common/src/allowed-provenance.test.ts`
- [ ] Delete the local `PROVENANCE_OPTIONS` from `libs/system-admin-pages/src/list-type/validation.ts` and import from `@hmcts/list-types-common`
- [ ] Add exported `validateAllowedProvenanceSelection` and reimplement the private `validateProvenance` on top of it
- [ ] Export `validateAllowedProvenanceSelection` from `libs/system-admin-pages/src/index.ts`
- [ ] Extend `libs/system-admin-pages/src/list-type/validation.test.ts` (valid single/all, empty array, undefined, `MANUAL_UPLOAD`, `SSO`, `B2C_IDAM`, single-error short-circuit)

### Query
- [ ] Add `updateListTypeProvenance(id, allowedProvenance)` to `libs/system-admin-pages/src/list-type/queries.ts` writing only `allowedProvenance`, canonicalised
- [ ] Export it from `libs/system-admin-pages/src/index.ts`
- [ ] Add `listTypeProvenanceUpdated?: string` to the session interface alongside `ListTypeSession`
- [ ] Extend `libs/system-admin-pages/src/list-type/queries.test.ts` (only `allowedProvenance` in `data`, comma join, canonical order, de-duplication)

### New page `/update-list-type-provenance`
- [ ] Create `apps/web/src/pages/(system-admin)/update-list-type-provenance/en.ts` and `cy.ts`
- [ ] Create `index.ts` GET: id 400/404 guards, parse stored value, detect unrecognised tokens, build checkbox items, resolve `backHref` from `from=detail`
- [ ] Add POST: id guards, body normalisation, validation, error re-render preserving selection with no write, success write + `req.auditMetadata` + session banner key + `res.redirect(303, "/manage-list-types")`
- [ ] Export `GET`/`POST` as `RequestHandler[]` with `requireRole([USER_ROLES.SYSTEM_ADMIN])` first
- [ ] Create `index.njk` — back link, error summary, inset text, `govukCheckboxes` with h1 as legend and the list type name as a caption inside the legend, save button, cancel link
- [ ] Add `index.test.ts` (all GET and POST cases from plan §5.4)
- [ ] Add `index.njk.test.ts` (all cases from plan §5.5, including locale-key parity and both-ways inset/error assertions)

### `/manage-list-types` — provenance column and success banner
- [ ] Add `provenanceColumnHeading`, `actionsColumnHeading`, `changeProvenanceLink`, `notSet`, `unrecognisedSuffix`, `successBannerTitle`, `successBannerMessage`, `provenanceLabels` to `en.ts` and `cy.ts`
- [ ] Map `provenanceLabels`, `hasUnrecognisedProvenance` and `provenanceUrl` onto each row in `index.ts` (keep the existing spread-content / bare-key convention)
- [ ] Read then delete `session.listTypeProvenanceUpdated`, build the banner string in the controller, pass as `updatedListTypeMessage`
- [ ] Update `index.njk`: provenance `<th>`, real actions `<th>`, provenance cell with "Not set" fallback, "Change provenance" link with visually hidden list type name, `govukNotificationBanner` before the `<h1>`
- [ ] Extend `index.test.ts` and `index.njk.test.ts` per plan §5.5

### `/manage-list-type` — Change link
- [ ] Add `changeLink`, `provenanceLabels`, `unrecognisedSuffix` to `en.ts` and `cy.ts`; reuse existing `allowedProvenanceLabel` and `notSet`
- [ ] Resolve `provenanceText` in `index.ts` from the label map
- [ ] Add the Change link cell to the Allowed provenance row in `index.njk`, and an empty third cell to every other row
- [ ] Replace the `[WELSH TRANSLATION REQUIRED: …]` placeholders on the provenance label/hint in `manage-list-type/cy.ts` and `add-list-type/cy.ts` with real translations

### Reference data and seed ownership
- [ ] Change `PHT_WEEKLY_HEARING_LIST.provenance` from `MANUAL_UPLOAD` to `CFT_IDAM` in `libs/list-types/common/src/list-type-data.ts`
- [ ] Remove `allowed_provenance = EXCLUDED.allowed_provenance,` from the `ON CONFLICT` update clause in `apps/postgres/prisma/generate-seed-sql.ts`, keeping it in the `INSERT`, with the explanatory comment
- [ ] Drop `allowedProvenance` from the `update` payload in `libs/location/src/seed-list-types.ts`, keeping it in `create`
- [ ] Add `libs/list-types/common/src/list-type-data.test.ts` guard (all tokens valid, non-empty, ≤50 chars)
- [ ] Extend `apps/postgres/prisma/generate-seed-sql.test.ts` (`allowed_provenance` absent from the update clause, present in the `INSERT`, all other reconciled columns still present)
- [ ] Add the equivalent create/update assertion for `seed-list-types.ts`
- [ ] Apply the signed-off provenance mapping for the remaining 76 list types once received (blocked — see plan §7)

### Cross-cutting
- [ ] Add the `PI_AAD` / `B2C_IDAM` coupling comment at the session-provenance assignment in `apps/web/src/pages/(auth)/login/return/index.ts`
- [ ] Extend `e2e-tests/tests/system-admin/manage-list-types.spec.ts` with the provenance journey test (validation, Welsh, axe, keyboard inline); resolve or justify the existing `test.describe.skip`
- [ ] Run `yarn lint:fix`, `yarn test`, `yarn test:e2e`
- [ ] Manual keyboard-only and screen-reader pass of the journey
- [ ] Verify on STG that a dashboard change survives an `apps/postgres` redeploy and no other column drifted
