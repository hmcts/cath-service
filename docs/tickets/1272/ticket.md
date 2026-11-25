# #1272: CaTH Cron Trigger - Subscription Triggers

**State:** OPEN
**Assignees:** RebeccaHayleyPickles
**Author:** junaidiqbalmoj
**Labels:** 
**Created:** 2026-10-28T10:38:25Z
**Updated:** 2026-10-29T09:47:36Z

## Description

Split from #355.

I want the application to trigger subscription notifications for publications on a schedule,
so that subscribers are notified when a publication becomes visible or when a scheduled list type is due to be sent.

**Acceptance Criteria:**

1. Subscriptions Artefacts Retrieval:
The system should retrieve artefacts where:
- The display_from date matches the current date.
- The display_to timestamp is either in the future or null.
The subscription notifications should be triggered for these artefacts.
This query should be executed using a scheduled trigger.

2. Scheduled List Type Subscription:
For publications with list types flagged as scheduled list type subscription (currently these include MAGISTRATES_ADULT_COURT_LIST_DAILY and MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY), we send the subscriptions at a set time using this cron trigger. We need to find all publications for these list types with the content date of today and not expired yet, and trigger the subscription for these publications.
- List types must be identified by `listTypeName`, never by numeric `listTypeId`.

3. Error Handling:
The system should log and handle any errors encountered during the execution of these queries or when triggering subscriptions. A failure for one artefact should not prevent the remaining artefacts from being processed.

**Technical Notes:**
- Implement as a script in `apps/crons/src/` run through the existing crons entrypoint (`SCRIPT_NAME`).
- Reuse the existing notification flow (`sendPublicationNotificationsForArtefact` in `@hmcts/publication`) rather than duplicating it.
- The CronJob and its schedule must be configured in **cnp-flux-config** (`apps/cath`), not sds-flux-config. The schedule in `apps/crons/helm/values.yaml` is only a placeholder.


## Comments

No comments on this issue.
