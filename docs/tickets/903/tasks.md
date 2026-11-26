# Tasks: #903 Magistrate Standard List Prosecuting authority in Email Summary

## Implementation Tasks

- [x] In `summary-builder.ts`, replace the gated `Prosecuting authority` push in the case loop with an unconditional push whose value is the extracted authority or `""`.
- [x] Confirm field ordering is unchanged (Name, Prosecuting authority, Reference, Hearing type, Offence).
- [x] Leave the application loop unchanged (no prosecuting authority field).
- [x] Add a test: prosecuting authority empty/missing still emits the `Prosecuting authority` field with an empty value.
- [x] Keep the existing "should include prosecuting authority for cases" test passing.
- [x] Run `yarn test` for the magistrates-standard-list package.
- [x] Run `yarn lint:fix` and `yarn format`.
- [x] Resolve the CLARIFICATIONS NEEDED items in plan.md with the ticket author before merge. RESOLVED: Always emit the "Prosecuting authority" field for every case, even when no PROSECUTING_AUTHORITY party exists at all (value = ""). Matches CaTH ORG's consistent line-per-case rendering; do NOT gate on `if (prosecutor)`. No trailing-space trimming required — the formatter's `${label} - ${value}` output is correct as-is.
