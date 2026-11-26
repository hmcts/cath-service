# Tasks — #742: Advisory message for SJP publishing time

## Implementation Tasks

- [x] Remove the hardcoded advisory (`SJP_LOCATION_ID`, `isSjpVenue`, `sjpAdvisoryPrefix` / `sjpAdvisoryMessage` locale keys, `#sjp-publishing-advisory` template block and their unit/template/E2E assertions) — summary-of-publications page restored to master
- [x] Add `cautionMessage` / `welshCautionMessage` to location 9 in `libs/location/src/location-data.ts`, with the bold prefix as `<strong>` (allowed by the `sanitiseHtml` allowlist)
- [x] Emit `INSERT INTO location_metadata ... ON CONFLICT (location_id) DO NOTHING` from `apps/postgres/prisma/generate-seed-sql.ts` so admin edits are never overwritten on redeploy
- [x] Create the row in the local seed (`libs/location/src/seed-data.ts`) with a create-only upsert, on both fresh and existing databases
- [x] Unit tests for the SQL generator and the local seed
- [x] Apply the generated seed SQL to a local database (twice, to confirm idempotency) and confirm the `location_metadata` row for location 9
- [ ] Manually verify `/summary-of-publications?locationId=9` and `?locationId=9&lng=cy` render the caution message
- [ ] Resolve the outstanding CLARIFICATIONS NEEDED items on the issue before release
