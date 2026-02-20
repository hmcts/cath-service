# #354: CaTH Cron Trigger - Generate and Send MI Report

**State:** OPEN
**Assignees:** None
**Author:** junaidiqbalmoj
**Labels:** None
**Created:** 2026-02-12T14:14:48Z
**Updated:** 2026-02-20T13:04:10Z

## Description

I want to automatically generate and send the MI report at scheduled intervals so that stakeholders receive timely updates without manual intervention.

**Description:** The system should periodically trigger the /mi/report endpoint to generate and send the Management Information (MI) report in excel format xlsx. This process should be automated using a cron job, ensuring that the report is sent consistently at predefined intervals.

Acceptance Criteria:

- The /mi/report endpoint should generate the MI report and send it via email.
- The MI report should include the following data:

Publication tab:
Publication details from the last 31 days.
Archived publication data.
Location names mapped to location IDs.

User accounts tab:
User ID, provenance user ID, user provenance, roles, account creation date, and last sign-in date.

Location subscriptions tab:
Subscription ID, search value, channel, user ID, location name, and subscription creation date (filtered by LOCATION_ID search type).

All subscriptions tab:
Subscription ID, channel, search type, user ID, location name, and subscription creation date.

- The system should handle any errors during the report generation or email sending process and log them appropriately.
- If the report is successfully sent, the system should log the success with a reference ID.
- The endpoint should return a 200 OK response upon successful execution.

## Comments

### Comment by OgechiOkelu on 2026-02-20T12:44:23Z
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-02-20T12:49:36Z
# Issue #354: CaTH Cron Trigger - Generate and Send MI Report

## 1. User Story
**As a** system administrator
**I want to** automatically generate and send the MI (Management Information) report at scheduled intervals
**So that** stakeholders receive timely, consistent updates on publication activity, user accounts, and subscriptions without manual intervention

---

## 2. Background

The CaTH service processes hearing list publications for court and tribunal locations. Stakeholders require periodic MI reports summarising publication activity, user accounts, and subscription data. Currently no automated reporting mechanism exists.

This feature introduces:
- A `GET /mi/report` API endpoint that generates an XLSX report and sends it via email
- A cron job in `apps/crons/` that triggers the endpoint at configured intervals

The implementation follows the existing pattern established in `apps/crons/src/index.ts`, where `SCRIPT_NAME` env var selects which script to execute. Email delivery uses GOV.UK Notify via the existing `@hmcts/notifications` library. XLSX generation requires adding a library such as `exceljs`.

**Related files and patterns:**
- Cron runner: `apps/crons/src/index.ts`
- Cron example: `apps/crons/src/example.ts`
- Email client: `libs/notifications/src/govnotify/govnotify-client.ts`
- API route pattern: `libs/api/src/routes/v1/publication.ts`
- Publication data: `Artefact` model in `apps/postgres/prisma/schema.prisma`
- User data: `User` model in `apps/postgres/prisma/schema.prisma`
- Subscription data: `Subscription` model in `libs/subscriptions/prisma/schema.prisma`
- Location data: `Location` model in `libs/location/prisma/schema.prisma`

---

## 3. Acceptance Criteria

* **Scenario:** Cron job triggers MI report generation
    * **Given** the cron is configured with `SCRIPT_NAME=mi-report`
    * **When** the scheduled interval fires
    * **Then** the cron script calls the `/mi/report` endpoint and logs the outcome

* **Scenario:** Endpoint generates and sends MI report successfully
    * **Given** the `/mi/report` endpoint is called
    * **When** report data is fetched from the database and XLSX is generated
    * **Then** the XLSX is sent via email using GOV.UK Notify, the success is logged with a reference ID, and the endpoint returns HTTP 200

* **Scenario:** Publication tab contains correct data
    * **Given** the `/mi/report` endpoint is called
    * **When** the XLSX is generated
    * **Then** the Publication tab contains artefact records from the last 31 days plus archived records, with location names resolved from location IDs

* **Scenario:** User accounts tab contains correct data
    * **Given** the `/mi/report` endpoint is called
    * **When** the XLSX is generated
    * **Then** the User accounts tab contains: user ID, provenance user ID, user provenance, role, account creation date, and last sign-in date for all users

* **Scenario:** Location subscriptions tab contains correct data
    * **Given** the `/mi/report` endpoint is called
    * **When** the XLSX is generated
    * **Then** the Location subscriptions tab contains: subscription ID, search value (location name), channel, user ID, location name, and subscription creation date — filtered to LOCATION_ID search type only

* **Scenario:** All subscriptions tab contains correct data
    * **Given** the `/mi/report` endpoint is called
    * **When** the XLSX is generated
    * **Then** the All subscriptions tab contains: subscription ID, channel, search type, user ID, location name, and subscription creation date for all subscriptions

* **Scenario:** Error handling during report generation
    * **Given** the `/mi/report` endpoint is called
    * **When** an error occurs during data fetch, XLSX generation, or email sending
    * **Then** the error is logged with details and the endpoint returns HTTP 500

* **Scenario:** Error handling in cron job
    * **Given** the cron script runs
    * **When** the endpoint returns a non-200 response or throws an error
    * **Then** the error is logged and the cron process exits with a non-zero exit code

---

## 4. Subscription Schema

The `subscription` table requires two new columns to support the channel and search type data in the MI report:

- `channel VARCHAR(20) DEFAULT 'EMAIL'`
- `search_type VARCHAR(50) DEFAULT 'LOCATION_ID'`

---

## 5. Open Questions / Assumptions (from spec comment)

* **Subscription schema extension:** Current `Subscription` model has no `channel` or `search_type` fields. A migration is needed or values can be hardcoded.
* **"Archived" publication definition:** Interpreted as records where `display_to < now()`.
* **Report recipient list:** Single recipient via `MI_REPORT_RECIPIENT_EMAIL` env var (clarification needed if multiple).
* **GOV.UK Notify file attachment support:** Assumes file attachment API is available on the current plan.
* **XLSX library:** `exceljs` assumed. Check if project has a preference.
* **Authentication for cron → API call:** Cron will need a service account or alternative internal auth mechanism.
* **Report schedule:** Placeholder schedule in Helm values.yaml needs confirmation from stakeholders.
* **"Publication details from last 31 days":** Interpreted as `lastReceivedDate >= (now - 31 days)`.

### Comment by OgechiOkelu on 2026-02-20T13:04:10Z
@plan
