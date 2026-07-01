## Implementation Tasks

- [ ] Add new list type entry (id 28, `MENTAL_HEALTH_DAILY_HEARING_LIST`, `isNonStrategic: true`, `subJurisdictionIds: [20]`) to `libs/location/src/list-type-data.ts`
- [ ] Add new location entry (locationId 13, "Mental Health Tribunal", `regions: [8]`, `subJurisdictions: [20]`) to `libs/location/src/location-data.ts`
- [ ] Confirm `provenance` and `defaultSensitivity` values with the team before merging (see open questions in plan.md)
- [ ] Confirm approach for seeding the new location on existing environments (seed only runs on empty tables)
- [ ] After deployment: system admin to set English and Welsh caution messages on the "Mental Health Tribunal" location via the location-metadata-manage admin journey
