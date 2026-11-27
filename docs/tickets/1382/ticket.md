# #1382: Updates - Employment Tribunal

**State:** OPEN
**Assignees:** HarveyMoj
**Author:** OgechiOkelu
**Labels:** 
**Created:** 2026-11-09T17:17:35Z
**Updated:** 2026-11-27T08:50:19Z

## Description

**PROBLEM STATEMENT**
This ticket is raised to implement the required changes for the Employment tribunal.

 

**AS A** Service
**I WANT** to make some chanes to ET hearing lists
**SO THAT** it aligns with the updated requirements

 

**ACCEPTANCE CRITERIA**
- The Employment Tribunal fortnightly list is renamed to ‘Employment Tribunal Advance Hearing List’ while 2nd list is called ‘Employment Tribunal Daily Hearing List’.
- The sensitivity for both lists is ‘Public’

> **Note:** The AC "The connection/ feed to courtel is turned on" has been moved to #1761.


**Welsh translations:**
Employment Tribunal Advance Hearing List - Rhestr Gwrandawiadau Ymlaen llaw y Tribiwnlys Cyflogaeth
Employment Tribunal Daily Hearing List - Rhestr Gwrandawiadau Dyddiol y Tribiwnlys Cyflogaeth



**Technical plan: ET hearing list changes (CaTH)**
Repo: apps/cath/cath-service

**Scope**
Rename the ET fortnightly list to Employment Tribunal Advance Hearing List and the ET daily list to Employment Tribunal Daily Hearing List.
Turn on the Courtel feed for both lists.
Sensitivity for both lists is Public.
**Findings**
Both lists are defined in libs/list-types/common/src/list-type-data.ts as ET_DAILY_LIST and ET_FORTNIGHTLY_PRESS_LIST. Both already have defaultSensitivity: "Public", so item 3 needs no code change, only a check.
The Courtel push (libs/legacy-third-party-fulfilment) sends a publication only if a legacy_third_party_subscription row exists for the list type. It also needs the COURTEL_API_URL and COURTEL_CERTIFICATE secrets. The feed is therefore a data and config change, not a code change.
List-type reference data is seeded from listTypeData by apps/postgres/prisma/generate-seed-sql.ts.
**Approach**
Change display names only. Keep the internal names (ET_DAILY_LIST, ET_FORTNIGHTLY_PRESS_LIST), URL paths (et-daily-list, et-fortnightly-list) and package names. Renaming them would break stored artefacts, subscriptions and links.

**Tasks**
Names in code
list-type-data.ts: update englishFriendlyName and shortenedFriendlyName for both entries.
libs/list-types/et-daily-list/src/locales/en.ts and et-fortnightly-list/src/locales/en.ts: update title and pageTitle.
Welsh
Obtain approved Welsh translations for the two new names.
Update welshFriendlyName, both locales/cy.ts files, welsh/catalogue.csv and templates/tech-spec-references/welsh-translations-catalogue.json.
Until then, Welsh keeps the old names.
Tests: update assertions in the two index.test.ts files, the two pdf-generator.test.ts files and apps/postgres/prisma/generate-seed-sql.test.ts.
**Database**
Re-seed reference data, or add a migration that updates list_types friendly names for already-seeded environments.
Confirm which mechanism the repo uses for existing environments.
**Courtel feed**
Confirm the Courtel third-party user exists in each environment.
Add subscriptions for both list types through the system-admin third-party user page, or seed them.
Confirm that COURTEL_API_URL and COURTEL_CERTIFICATE are set in the Helm values and Key Vault for each environment, not just preview.
Sensitivity: confirm that no per-publication override or upload default makes either list non-Public, and that the DB default_sensitivity is Public.
Other references: check email subjects, the summary-of-publications page and the e2e tests for the old names.
Verification
Unit tests in common, et-daily-list, et-fortnightly-list and apps/postgres.
In a lower environment, publish one file of each type and check three things:
The new names appear in the list picker and on the rendered page and PDF.
The artefact is Public.
The Courtel mock or endpoint receives the push, and a row appears in legacy_third_party_push_log.

## Comments

No comments on this issue.
