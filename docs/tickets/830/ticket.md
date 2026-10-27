# #830: Add functionality to update status (Pending/Active/Suspended) for Third Party Subscriber

**State:** OPEN
**Assignees:** RebeccaHayleyPickles
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-07-07T09:55:47Z
**Updated:** 2026-10-16T14:40:53Z

## Description

PROBLEM STATEMENT

In legacy CaTH (pip-frontend / pip-account-management), every third-party subscriber has a status of **Pending**, **Active** or **Suspended**. A system admin can change it from the Manage subscriber page, and publications are only pushed to **Active** subscribers. This lets the team onboard a subscriber (OAuth configuration, test connection, subscriptions) before it starts receiving data, and pause delivery to a subscriber without deleting it.

AI CaTH has no subscriber status. Every subscriber receives pushes as soon as it has a subscription, and the only way to stop delivery is to delete the subscriber.

**AS A** System Admin
**I WANT** to set the status of a third-party subscriber to Pending, Active or Suspended
**SO THAT** only approved subscribers receive publications, and I can pause a subscriber without losing its configuration and subscriptions

**ACCEPTANCE CRITERIA**

Status values and defaults
- A third-party subscriber has one of three statuses: `PENDING`, `ACTIVE`, `SUSPENDED`
- A newly created subscriber defaults to `PENDING`
- Existing subscribers already receiving pushes are set to `ACTIVE` when this is released, so current delivery is not interrupted

Manage subscriber page (`/third-party-subscribers/:id/manage`)
- The summary list shows a **Status** row (displayed as Pending / Active / Suspended) with a **Change** link

Change status page (`/third-party-subscribers/:id/status`)
- Only System Admins can access it
- The page title and H1 are "Manage subscriber status"
- The current status is pre-selected
- The admin chooses one status and selects **Confirm**; **Cancel** returns to the Manage subscriber page without saving
- Use GOV.UK radios rather than the legacy `<select>` (Design System guidance: use selects only as a last resort)
- If no status is submitted or the value is invalid, show an error summary and an inline error: "Select a status"
- An unknown subscriber id redirects to `/third-party-subscribers`

Success page (`/third-party-subscribers/:id/status/success`)
- A GOV.UK confirmation panel: "Third party account status updated" / "Third party account status has been successfully updated."
- Followed by: "To further update third party account, you can go to:" with a link to **Manage third party subscribers**

Delivery
- Only `ACTIVE` subscribers receive publication pushes (new, updated and deleted publications)
- `PENDING` and `SUSPENDED` subscribers are skipped without error, and the skip is logged with the subscriber id
- Test connection (#829) works regardless of status, so a Pending subscriber can be verified before activation

Audit
- Viewing the status page and updating the status are both written to the audit log, following the other third-party subscriber pages

Welsh
- All content on the new pages is available in Welsh (legacy pip-frontend only has English placeholders, so translations are needed)

**TECHNICAL NOTES**

- Legacy reference:
  - pip-frontend `ManageThirdPartySubscriberStatusController` and `manage-third-party-subscriber-status(-success).njk`
  - pip-account-management `ApiUserStatus` and `ThirdPartySubscriptionNotificationService.collectThirdPartySubscriberConfigurationList`, which filters `ACTIVE`
- **Two subscriber models need resolving first.** The system-admin pages (`libs/system-admin-pages/src/pages/third-party-subscribers`) read and write `third_party_user` (`ThirdPartyUser`). The push path (`libs/legacy-third-party-fulfilment`: `findSubscribersByListType` → `sendThirdPartyPublications` / `sendThirdPartyDeletion`) reads `legacy_third_party_user` (`LegacyThirdPartyUser`). A status column on only one of these will either not be editable or not gate delivery. Agree which model is the source of truth (or how they link) before implementing.
- Add a `status` column to the agreed model in `libs/postgres-prisma/prisma/schema/`, with a migration that defaults new rows to `PENDING` and backfills existing rows to `ACTIVE`
- Filter on `status = 'ACTIVE'` in the push subscriber query rather than in each caller

**Welsh translation:** required for all new page content (see Welsh above)


## Comments

No comments on this issue.

