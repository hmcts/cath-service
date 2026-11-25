# #1549: Third-party subscriber "Manage subscriptions" page: "Save subscriptions" button only appears on the last page

**State:** OPEN
**Assignees:** alao-daniel
**Author:** ashwini-mv
**Labels:** bug
**Created:** 2026-11-18T14:28:36Z
**Updated:** 2026-11-18T14:36:11Z

## Description

## Description
On `/third-party-subscribers/:id/subscriptions/manage`, list types are paginated at 20 per page. The "Save subscriptions" button only renders on the last page. Every other page shows only a "Next" button. To save a change made on page 1, a system admin has to click "Next" through every remaining page to reach the save button.

## Steps to reproduce
1. Sign in as a system admin.
2. Go to Third-party subscribers, pick a subscriber, then Manage subscriptions.
3. On page 1, change the sensitivity for any list type.
4. Look for the "Save subscriptions" button.

## Actual result
Only "Next" is shown. "Save subscriptions" appears only after going through to the last page.

## Expected result
"Save subscriptions" is shown on every page (1, 2, 3, …), alongside the page navigation. Clicking it saves all changes made so far, from the current page and any pages visited earlier, without having to visit the remaining pages.

## Acceptance criteria
- "Save subscriptions" is visible on every page of the manage subscriptions journey.
- Saving from any page keeps the selections from the current page and all previously visited pages (held in the session), plus the subscriber's existing subscriptions on pages not visited.
- "Next" is still available on every page except the last.
- Users can move between pages without saving.
- Works in Welsh (`?lng=cy`).
- Unit tests in `index.test.ts` and template tests are updated, and the E2E journey covers saving from a page that isn't the last.

## Technical notes
- Template: `index.njk`. Remove the `isLastPage` condition around the save button and render both buttons, with name/value attributes so the POST can tell "save" from "next".
- Controller: `index.ts` POST (around lines 104–120). Branch on the submitted action instead of `isLastPage`.
- Possible related improvement: there's no "Previous" or numbered page navigation. Consider the GOV.UK Pagination component.

## Priority (suggested)
Medium (P1 on the board). This is a usability issue with no data loss: changes are kept in the session until the last page.


## Comments

No comments on this issue.
