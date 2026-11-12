# #588: Add bespoke logic for publication subscription triggers

**State:** OPEN
**Assignees:** RebeccaHayleyPickles
**Author:** KianKwa
**Labels:** type:story
**Created:** 2026-05-12T16:00:40Z
**Updated:** 2026-11-05T14:07:46Z

## Description

Currently the subscription  notification process for the email subscribers and API subscribers are triggered on every publication upload (Except no match). The following check should be performed before processing subscription:
- Subscription should not be triggered if the displayFrom date is from tomorrow onwards.  CaTh should notify the subscribers if the publication is already displayable (today or earlier). Subscription for future dated publications is done via the subscription cron job.
- Subscription should be skipped if the publication has already expired, i.e. the displayedTo date is before the current date.
- Subscription should be skipped for list types flagged as scheduled subscription. Currently this include MAGISTRATES_ADULT_COURT_LIST_DAILY and MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY. Subscription for publications of these list types is done via the scheduled list type subscription cron job.

## Comments

No comments on this issue.
