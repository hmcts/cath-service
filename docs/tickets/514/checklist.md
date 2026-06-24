# Checklist: Issue #514 - Style Guide: Magistrates' Court Hearing Lists - Crime Portal / Libra

## Acceptance Criteria (verify each when complete)

- [ ] AC1: Four new list types are registered in the CaTH backend: MAGISTRATES_ADULT_COURT_LIST_DAILY, MAGISTRATES_ADULT_COURT_LIST_FUTURE, MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY, MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE - all assigned 'classified' sensitivity
- [ ] AC2: Public list views display only Listing Time, Defendant Name and Case Number; standard list views display Block Start, Defendant Name, Date of Birth, Address, Age, Informant, Case Number, Offence Code, Offence Title and Offence Summary
- [ ] AC3: Validation schema, style guide, PDF template and email summary created for both MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY and MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE
- [ ] AC4: Email notification summaries display defendant name, informant, case number and offence title; subscription fulfilment process implemented for all 4 list types
- [ ] AC5: List manipulation logic created for style guides; main party resolved as the party with partyRole DEFENDANT
- [ ] AC6: Both Crime IDAM and Media Verified users can access all 4 list types
- [ ] AC7: All user-facing text has Welsh translations including: Listing time (Amser rhestru), Defendant Name (Enw'r Diffynnydd), Case Number (Rhif yr Achos), Sitting at (Yn eistedd yn), Session start (Amser Cychwyn y Sesiwn), and the full reporting restrictions warning text

## Verification Steps

- [ ] Build passes: `yarn build`
- [ ] Lint passes: `yarn lint`
- [ ] Tests pass: `yarn test`
- [ ] E2E tests pass (if applicable): `yarn test:e2e`
- [ ] Coverage >80%: `yarn test:coverage`

## Code Quality Checks

- [ ] Self-review: `git diff`
- [ ] All acceptance criteria verified
- [ ] No TODO comments left
- [ ] No console.log statements
