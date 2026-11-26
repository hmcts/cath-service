# #1502: System Admin: hide and show a list type in CaTH

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-11-16T13:35:29Z
**Updated:** 2026-11-17T10:22:02Z

## Description

**As a** System Admin
**I want to** hide or show a list type without deleting it
**So that** a list type can be taken out of public view temporarily (for example while it is not yet live in AI CaTH during the migration, or while a problem is fixed) and brought back later with its configuration and publications intact.

## Notes
- Add a visibility setting (for example `is_hidden`, default false) to `list_types`. This is separate from the existing `deleted_at` soft delete.
- Add a **Hide** / **Show** action to the existing System Admin list type screens (`manage-list-types` / `manage-list-type`), with a confirmation page. Show the current state with a tag: green **Visible**, grey **Hidden**.
- **When a list type is hidden:**
  - It is not shown on the public pages: summary of publications, court and tribunal lists, search, and the list type choices when subscribing.
  - Its publication pages and download links aren't reachable.
  - Existing data is kept.
- To agree in refinement:
  - whether new publications for a hidden list type are still accepted and stored
  - whether subscription notifications, third-party pushes and Courtel are paused
- Each hide and show is recorded in the audit log.

## Acceptance criteria
- A System Admin can hide and show any list type. The list types page shows the current state.
- A hidden list type and its publications don't appear anywhere on the public site. Showing it again restores them unchanged.
- Hiding doesn't delete or change any list type configuration, publications or subscriptions.
- The changes are audited, the text is available in English and Welsh, and the page meets the WCAG 2.2 AA accessibility standard.

## Comments

No comments on this issue.
