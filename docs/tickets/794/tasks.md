## Implementation Tasks

- [x] Verify `@hmcts/publication` is a dependency of `libs/public-pages` (check `libs/public-pages/package.json`); add it if missing
- [x] Add access check to `createSimpleListTypeHandler` in `apps/web/src/pages/(list-types)/list-type-handler.ts` — look up list type via `prisma.listType.findUnique`, build `ListType` object, call `canAccessPublicationData`, render 403 on denial
- [x] Update `getFlatFileForDisplay` in `libs/public-pages/src/flat-file/flat-file-service.ts` — add `user: UserProfile | undefined` parameter, add `ACCESS_DENIED` to error union, add access check after existing validation
- [x] Update `getFileForDownload` in `libs/public-pages/src/flat-file/flat-file-service.ts` — add `user: UserProfile | undefined` parameter, add access check, return `ACCESS_DENIED` on denial
- [x] Update `apps/web/src/pages/(public)/hearing-lists/[locationId]/[artefactId]/index.ts` — pass `req.user` to `getFlatFileForDisplay`, handle `ACCESS_DENIED` error with 403 render before the non-PDF redirect branch
- [x] Update download API route `libs/public-pages/src/routes/api/flat-file/[artefactId]/download.ts` — pass `req.user` to `getFileForDownload`, map `ACCESS_DENIED` to HTTP 403 JSON response
- [x] Write unit tests for `createSimpleListTypeHandler` access control (CLASSIFIED/PRIVATE → 403, PUBLIC → no regression, verified user → allow)
- [x] Write unit tests for `getFlatFileForDisplay` access control (CLASSIFIED/PRIVATE + no user → ACCESS_DENIED, PUBLIC → file returned)
- [x] Write unit tests for `getFileForDownload` access control
- [x] Write unit tests for display page handler — ACCESS_DENIED → 403, non-PDF denied → no redirect to download
- [x] Write unit tests for download API route — ACCESS_DENIED → 403 JSON
- [x] Run `yarn test` from root to confirm all tests pass
- [x] Run `yarn lint:fix` to confirm no lint errors
