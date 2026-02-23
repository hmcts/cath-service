# #356: CaTH Cron Trigger - Infrastructure deployment

**State:** OPEN
**Assignees:** None
**Author:** junaidiqbalmoj
**Labels:** None
**Created:** 2026-02-12T14:30:05Z
**Updated:** 2026-02-23T16:52:14Z

## Description

Following triggers needs to be implemented:
1. clear-audit-cron runs at 1am everyday
2. inactive-verification-cron runs at 08:01am everyday
3. media-reporting-cron runs at 12:00 AM (midnight) on Mondays for each yearly month
4. expired-artefacts-cron runs at 1am everyday
5. no-match-artefacts-cron runs at 1am everyday
6. subscriptions-cron runs at 1am everyday
7. refresh-views-cron runs at 2am everyday

## Comments

### Comment by OgechiOkelu on 2026-02-23T16:46:22Z
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-02-23T16:50:44Z
## 1. User Story

**As a** platform engineer
**I want to** deploy 7 scheduled Kubernetes CronJobs for the CaTH service
**So that** automated maintenance tasks (audit cleanup, verification, reporting, artefact management, subscription processing, and view refresh) run reliably on defined schedules without manual intervention

---

## 2. Background

The `apps/crons` application already exists as a containerised runner that dynamically loads and executes job scripts based on the `SCRIPT_NAME` environment variable. The Helm chart at `apps/crons/helm/` is configured for Kubernetes `CronJob` workloads using the HMCTS job chart (v2.2.0).

Currently only a placeholder `example` script exists. This issue requires implementing 7 production CronJob deployments with the following scripts and schedules, each deployed as a separate Kubernetes CronJob pointing at the same container image but with a distinct `SCRIPT_NAME` and `schedule`.

| Cron Name | Script Name | Schedule (Cron Expression) | Human Description |
|---|---|---|---|
| clear-audit-cron | `clear-audit` | `0 1 * * *` | 1:00 AM daily |
| inactive-verification-cron | `inactive-verification` | `1 8 * * *` | 8:01 AM daily |
| media-reporting-cron | `media-reporting` | `0 0 * * 1` | Midnight every Monday |
| expired-artefacts-cron | `expired-artefacts` | `0 1 * * *` | 1:00 AM daily |
| no-match-artefacts-cron | `no-match-artefacts` | `0 1 * * *` | 1:00 AM daily |
| subscriptions-cron | `subscriptions` | `0 1 * * *` | 1:00 AM daily |
| refresh-views-cron | `refresh-views` | `0 2 * * *` | 2:00 AM daily |

The existing `apps/crons/src/index.ts` runner handles `SCRIPT_NAME` resolution and `configurePropertiesVolume` setup — no changes to the runner are required.

The Helm `values.yaml` schedule is documented as a placeholder only; actual schedules are configured in the Flux GitOps deployment.

---

## 3. Acceptance Criteria

* **Scenario:** clear-audit-cron executes on schedule
    * **Given** the Kubernetes CronJob `clear-audit-cron` is deployed with schedule `0 1 * * *`
    * **When** 1:00 AM UTC is reached on any day
    * **Then** a Job pod is created, the `clear-audit` script runs, audit records are deleted according to retention policy, and the pod exits with code 0

* **Scenario:** inactive-verification-cron executes on schedule
    * **Given** the Kubernetes CronJob `inactive-verification-cron` is deployed with schedule `1 8 * * *`
    * **When** 8:01 AM UTC is reached on any day
    * **Then** a Job pod is created, the `inactive-verification` script runs, inactive user verification records are processed, and the pod exits with code 0

* **Scenario:** media-reporting-cron executes on schedule
    * **Given** the Kubernetes CronJob `media-reporting-cron` is deployed with schedule `0 0 * * 1`
    * **When** midnight UTC is reached on any Monday
    * **Then** a Job pod is created, the `media-reporting` script runs, media application reporting data is generated, and the pod exits with code 0

* **Scenario:** expired-artefacts-cron executes on schedule
    * **Given** the Kubernetes CronJob `expired-artefacts-cron` is deployed with schedule `0 1 * * *`
    * **When** 1:00 AM UTC is reached on any day
    * **Then** a Job pod is created, the `expired-artefacts` script runs, artefacts past their `displayTo` date are deleted or archived, and the pod exits with code 0

* **Scenario:** no-match-artefacts-cron executes on schedule
    * **Given** the Kubernetes CronJob `no-match-artefacts-cron` is deployed with schedule `0 1 * * *`
    * **When** 1:00 AM UTC is reached on any day
    * **Then** a Job pod is created, the `no-match-artefacts` script runs, artefacts flagged with `noMatch = true` are processed, and the pod exits with code 0

* **Scenario:** subscriptions-cron executes on schedule
    * **Given** the Kubernetes CronJob `subscriptions-cron` is deployed with schedule `0 1 * * *`
    * **When** 1:00 AM UTC is reached on any day
    * **Then** a Job pod is created, the `subscriptions` script runs, stale or expired subscriptions are cleaned up, and the pod exits with code 0

* **Scenario:** refresh-views-cron executes on schedule
    * **Given** the Kubernetes CronJob `refresh-views-cron` is deployed with schedule `0 2 * * *`
    * **When** 2:00 AM UTC is reached on any day
    * **Then** a Job pod is created, the `refresh-views` script runs, database materialised views are refreshed, and the pod exits with code 0

* **Scenario:** CronJob concurrency is prevented
    * **Given** any of the 7 CronJobs is already running
    * **When** the next scheduled trigger fires before the current execution completes
    * **Then** the new Job is skipped (concurrencyPolicy: Forbid)

* **Scenario:** Job failure is observable
    * **Given** a script throws an unhandled error
    * **When** the pod exits with a non-zero exit code
    * **Then** the failure is visible in Kubernetes Job status and Application Insights

---

## 4. User Journey Flow

This is an infrastructure deployment — there is no end-user journey. The operational flow is:

```
1. Developer creates script file in apps/crons/src/<script-name>.ts
      |
      v
2. Script exports a named function and default for the runner to call
      |
      v
3. Flux deploys a Kubernetes CronJob per job with:
     - SCRIPT_NAME=<script-name>
     - schedule=<cron-expression>
     - concurrencyPolicy=Forbid
      |
      v
4. Kubernetes scheduler fires the CronJob at the configured time
      |
      v
5. Pod starts → index.ts loads SCRIPT_NAME → imports script → calls default()
      |
      v
6. Script executes business logic against the database
      |
      v
7. Pod exits with code 0 (success) or 1 (failure)
      |
      v
8. Application Insights captures telemetry and any errors
```

---

## 6. Infrastructure Specifications

**Script file structure** (each script in `apps/crons/src/`):

```
apps/crons/src/
├── index.ts                  (existing runner — no changes)
├── example.ts                (existing placeholder — no changes)
├── clear-audit.ts            (new)
├── inactive-verification.ts  (new)
├── media-reporting.ts        (new)
├── expired-artefacts.ts      (new)
├── no-match-artefacts.ts     (new)
├── subscriptions.ts          (new)
└── refresh-views.ts          (new)
```

**Each script must:**
- Export a named function for testability
- Export the named function as `default` for the runner to call
- Accept no arguments (all configuration comes from environment/database)
- Be async and return `Promise<void>`
- Log a start and completion message for observability
- Let errors propagate (the runner handles exit code 1)

**Helm deployment pattern per CronJob:**
Each CronJob is a separate Flux HelmRelease pointing at `apps/crons/helm/` with overridden values:
- `job.environment.SCRIPT_NAME`: the script name
- `job.schedule`: the cron expression
- `global.jobKind`: `CronJob` (already default in chart)
- `job.concurrencyPolicy`: `Forbid` (already default in chart)

**Job responsibilities:**

| Script | Responsible For | Relevant DB Tables |
|---|---|---|
| `clear-audit` | Delete old `notification_audit_log` records beyond retention window | `notification_audit_log` |
| `inactive-verification` | Process or expire unverified users inactive past a threshold | `user` |
| `media-reporting` | Generate or export weekly media application report data | `media_application` |
| `expired-artefacts` | Delete `artefact` records where `displayTo` is in the past | `artefact`, `ingestion_log` |
| `no-match-artefacts` | Process or delete artefacts with `noMatch = true` | `artefact` |
| `subscriptions` | Clean up orphaned or inactive subscriptions | `subscription` |
| `refresh-views` | Refresh database materialised views for reporting/display | DB views (TBD per schema) |

---

## 14. Assumptions & Open Questions

* **Assumption:** All 7 cron schedules are UTC.
* **Assumption:** The `media-reporting-cron` schedule `0 0 * * 1` (midnight every Monday) is the correct interpretation of "12:00 AM (midnight) on Mondays for each yearly month" — meaning weekly on Mondays, year-round.
* **Assumption:** Each CronJob is deployed as a separate Flux HelmRelease rather than a single multi-job Helm release.
* **Assumption:** The business logic for each script will be defined by the product team as part of implementing each individual script. This ticket covers the infrastructure deployment scaffolding.
* **Open Question:** What is the data retention period for `clear-audit-cron`?
* **Open Question:** What defines an "inactive" user for `inactive-verification-cron`? Is it based on `lastSignedInDate` on the `user` table, and what is the threshold?
* **Open Question:** What format does `media-reporting-cron` produce — a database record, a file export, or an email report?
* **Open Question:** Should `expired-artefacts-cron` delete artefact records and their related `ingestion_log` records (cascade), or archive them?
* **Open Question:** What action does `subscriptions-cron` perform — delete subscriptions for deleted/inactive users, or something else?
* **Open Question:** Are the database views for `refresh-views-cron` materialised views already defined in the schema, or do they need to be created?
* **Open Question:** Are all schedules UTC or should they align with UK local time (accounting for BST/GMT transitions)?

### Comment by OgechiOkelu on 2026-02-23T16:52:14Z
@plan
