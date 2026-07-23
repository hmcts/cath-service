# Implementation Tasks — #872 Mags Subscription email new Media Protocol

> Blocked on clarifications 1–4 in `plan.md` §7 (approach choice, Notify template
> ownership/IDs, Welsh delivery, SJP scope). Tasks below assume **Approach A**
> (dedicated Magistrates Notify template) and English-only unless clarified.

## Prerequisites (external / clarification)
- [ ] Confirm Approach A vs B (plan §7 Q1)
- [ ] Obtain new Magistrates GOV.UK Notify template(s) + template ID(s) (§7 Q2)
- [ ] Confirm Welsh delivery mechanism / obtain approved Welsh translation (§7 Q3)
- [ ] Confirm SJP in/out of scope (§7 Q4)
- [ ] Confirm email address spelling `mediaandpressenquires@justice.gov.uk` (§7 Q5)

## Implementation (Approach A)
- [ ] Record approved EN/CY wording in `docs/tickets/872/opening-message.md`
- [ ] Add `MAGISTRATES_LIST_TYPE_NAMES` set (six names) in `template-config.ts` next to `SJP_LIST_TYPE_NAMES`
- [ ] Add new env var(s) `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_MAGS[_PDF]` (config schema, `.env` example, Helm values / Key Vault)
- [ ] Extend `getSubscriptionTemplateId` to route Magistrates names → new template ID(s) with PDF/no-link variants + fallback
- [ ] Thread resolved `listTypeName` / `isMagistrates` from `notification-service.ts` into `buildEmailDataWithFiles` → `getSubscriptionTemplateId` (no extra Prisma query)

## Tests
- [ ] `template-config.test.ts`: six Magistrates names → Magistrates template ID; PDF vs no-file variants
- [ ] `template-config.test.ts`: non-Mags + SJP names → existing template IDs (regression)
- [ ] `template-config.test.ts`: ID-independence — fix arbitrary `listTypeId`, vary only name
- [ ] `notification-service.test.ts`: Magistrates list selects Magistrates template; non-Mags unchanged; existing assertions stay green
- [ ] Run `yarn test`, `yarn lint:fix`

## Manual verification
- [ ] GOV.UK Notify preview / test-send of new Magistrates template: opening message correct, `mailto:` link works, phone number readable
- [ ] Confirm a non-Magistrates subscription email is byte-for-byte unchanged
