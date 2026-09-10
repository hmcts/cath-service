# #587: System Admin delete court - complete journey

**State:** OPEN
**Assignees:** alao-daniel (Daniel Alao)
**Author:** KianKwa
**Labels:** type:story, epic:public-journey
**Created:** 2026-05-12T14:58:34Z
**Updated:** 2026-08-18T08:47:10Z

## Description

The current delete court functionality is incomplete and has some issues which have to be addressed:

- When a court to delete has a subscription, current it flags the error "There are active subscriptions for the given location". However there is no link to allow deletion of subscriptions and deletion is blocked.
- When a court to delete still has a publication, current it flags the error "There are active artefacts for the given location". However there is no link to allow deletion of publications and deletion is blocked.
- When a court to delete has both publication and subscription, we should allow publication error to come before the subscription error.
- When we select 'No' on the delete-court-confirm page, currently it navigates to system-admin-dashboard page. It should go to the delete-court page.
- When delete a court or a publication/subscription related to the court, we need to send relevant System Admin notification emails.
- Currently when we delete a court, it does not remove that record from database. Instead it just sets the 'deleted_at' field for that location on the location table. Change that to do a hard deletion when a court is removed. We also need to remove the 'deleted_at' field on the location table
- **To discuss:** On current CaTH when we delete a court with location metadata, we flags an error 'There is metadata exists for the given location'. AI CaTH allows the court to be deleted but the orphaned location metadata record remains. I think the better solution is to delete the location metadata record before delete the location.

## Comments

No comments on this issue.
