# #310: [VIBE-362] User Management

**State:** OPEN
**Assignees:** None
**Author:** linusnorton
**Labels:** migrated-from-jira, status:new, priority:3-medium, type:story, jira:VIBE-362
**Created:** 2026-01-20T17:23:27Z
**Updated:** 2026-01-30T15:00:35Z

## Description

> **Migrated from [VIBE-362](https://tools.hmcts.net/jira/browse/VIBE-362)**

### **PROBLEM STATEMENT**

System admin users in CaTH access several system administrative functionalities through the System Admin dashboard which allows them to perform administrative tasks. This ticket covers the system admin user's ability to manage and delete CaTH users through a structured, multi-screen workflow.

### **AS A** System Administrator

**I WANT** to search and delete user accounts from CaTH

**SO THAT** these users no longer have unrestricted access in CaTH


### **ACCEPTANCE CRITERIA**
* Only users with the **System Admin** role can access the System Admin Dashboard.
* on the dashboard, when the system admin user clicks on the 'User Management' tab, then the system admin user is taken to the 'Find, update and delete a user' page and can view the list of CaTH users in a table that displays the following columns in sequential order 'Email', 'Role' and 'Provenance'. The 4th column without a title provides a link to 'Manage' each user provided in the table rows. Where there are several users, then a maximum of 25 users are displayed per page
* A filter panel is provided on the left side of the page. The first section displays the 'Selected filters'. 2nd section displays 3 free text search fields. First is the 'Email' search field. When the correct search criteria is inputted and run, then the user list is updated to display matching results; however, where the wrong email is inputted, the following error message is displayed; '{**}There is a problem'. '{**}No users could be found matching your search criteria. Try adjusting or clearing the filters.' The second and third search fields are the 'User ID' and 'User Provenance ID' fields which display the following descriptive message beneath the field name and above the search bar 'Must be an exact match'. The 3rd section provides 2 check box sub-sections titled 'Role' which has the following options, 'Verified, CTSC Admin, Local[+] Admin and System Admin', and then 'Provenance' with the following options 'CFT IdAM and SSO'. [/+][-]Admin, CTSC Super Admin, Local Super Admin and System Admin', and then 'Provenance' with the following options 'B2C, CFT IdAM, Crime IdAM and SSO'.[/-]
* Clicking on the 'Manage' link beside a user takes the system admin to the 'Manage <user email>' page which displays a caution symbol underneath the page title with the following descriptive message beside it; '{**}Ensure authorisation has been granted before updating this user'{**}. The following rows are provided in a displayed table; 'User ID, Email, Role. Provenance, Provenance ID, Creation Date and Last sign in'. This is followed by a red 'Delete user' button.
* When the system admin clicks the 'Delete user' button, the system admin is taken to a confirmation page titled 'Are you sure you want to delete [user]? underneath the header are two radio buttons titled 'Yes' and 'No', followed by a green 'Continue' button. Where the system admin selects 'No', then the system admin is taken to the previous page with the user's details but where the system admin selects 'Yes', then the system admin is taken to the delete confirmation page which displays 'User deleted' in a green banner.
* Page numbers are displayed at the bottom of the page with 'Next' above and '2 of 2' beneath on the left hand side and 'Previous' on the right hand side with '1 of 2' beneath.
* When a user is deleted in CaTH, then the user is also deleted from the database



 **Specifications**

User Story
As a System Administrator, I want to search and delete user accounts from CaTH, so that these users no longer have unrestricted access in CaTH.

Page 1: System Admin Dashboard

Form fields

None

Content

EN: Title/H1 "System Admin Dashboard"

EN: Navigation tab — "User Management"

Errors

EN: "You do not have permission to access this page."

Back navigation

Not applicable

Page 2: Find, update and delete a user

Form fields

Email

Input type: text

Required: No

Validation rules:

Must be a valid email format

Maximum length: 254 characters

User ID

Input type: text

Required: No

Validation rules:

Must be an exact match

Alphanumeric only

Maximum length: 50 characters

User Provenance ID

Input type: text

Required: No

Validation rules:

Must be an exact match

Alphanumeric only

Maximum length: 50 characters

Role

Input type: checkbox

Required: No

Options: Verified, CTSC Admin, Local Admin, System Admin

Provenance

Input type: checkbox

Required: No

Options: CFT IdAM, SSO

Content

EN: Title/H1 "Find, update and delete a user"

EN: Section heading — "Selected filters"

EN: Field hint — "Must be an exact match"

EN: Table column headers — "Email", "Role", "Provenance", "Manage"

EN: Link — "Manage"

EN: Pagination —

Left: "Next" with "2 of 2" beneath

Right: "Previous" with "1 of 2" beneath

EN: Maximum of 25 users displayed per page

Errors

EN: Error summary title — "There is a problem"

EN: Error message — "No users could be found matching your search criteria. Try adjusting or clearing the filters."

Back navigation

Back link returns the user to the System Admin Dashboard without losing applied filters.

Page 3: Manage user

Form fields

None (read-only user details)

Content

EN: Title/H1 "Manage [user email]"

EN: Warning message — "Ensure authorisation has been granted before updating this user"

EN: Table rows —

User ID

Email

Role

Provenance

Provenance ID

Creation Date

Last sign in

EN: Button — "Delete user" (red)

Errors

None

Back navigation

Back link returns the user to the Find, update and delete a user page without losing search results.

Page 4: Confirm delete user

Form fields

Confirm deletion

Input type: radio

Required: Yes

Options: Yes, No

Validation rules:

One option must be selected to continue

Content

EN: Title/H1 "Are you sure you want to delete [user]?"

EN: Radio options — "Yes", "No"

EN: Button — "Continue" (green)

Errors

EN: "Select yes or no to continue."

Back navigation

Selecting "No" returns the user to the Manage user page.

Page 5: User deleted confirmation

Form fields

None

Content

EN: Confirmation banner — "User deleted" (green)

Errors

None

Back navigation

Back link returns the user to the Find, update and delete a user page.

Accessibility

All pages must comply with WCAG 2.2 AA standards.

Tables must include proper header associations for screen readers.

Pagination controls must be keyboard accessible and announced correctly.

Warning messages, error summaries, and confirmation banners must be announced to assistive technologies.

Colour contrast must be sufficient, including red and green action elements.

Test Scenarios

Access control: Only users with the System Admin role can access the System Admin Dashboard and User Management pages.

User list display: No more than 25 users are displayed per page.

Search by email: Valid email returns matching users; invalid email displays the defined error message.

Exact match validation: User ID and User Provenance ID only return results when an exact match is entered.

Manage navigation: Selecting "Manage" opens the correct user details page.

Delete flow (No): Selecting "No" returns the user to the Manage user page without deleting the user.

Delete flow (Yes): Selecting "Yes" deletes the user and displays the "User deleted" confirmation banner.

Data integrity: Deleted users are removed from the CaTH database.

Pagination: Next and Previous controls navigate correctly between result pages.



---

## Original JIRA Metadata

- **Status**: New
- **Priority**: 3-Medium
- **Issue Type**: Story
- **Assignee**: Unassigned
- **Created**: 1/20/2026
- **Updated**: 1/20/2026
- **Original Labels**: CaTH

_Attachments will be added in a comment below._

## Comments

### Comment by OgechiOkelu on 2026-01-30T14:54:31Z
[system admin user management.docx](https://github.com/user-attachments/files/24967917/system.admin.user.management.docx)

### Comment by OgechiOkelu on 2026-01-30T14:55:15Z
@plan

### Comment by hmctsclaudecode on 2026-01-30T15:00:35Z
## Technical Plan Complete

I've created a comprehensive technical plan for the User Management feature. The plan is available in the `feature/310-user-management` branch:

- **Plan**: `docs/tickets/310/plan.md` - Technical specification with architecture decisions, implementation details, and acceptance criteria mapping
- **Tasks**: `docs/tickets/310/tasks.md` - Sequential checklist of 50+ implementation tasks

### Clarification Questions

Before implementation, I need clarification on the following points:

1. **Provenance options discrepancy**: The acceptance criteria mentions "CFT IdAM and SSO" but the detailed specifications list "B2C, CFT IdAM, Crime IdAM and SSO". Which set of provenance options should be used for the filter checkboxes?

2. **Role options**: The specifications mention "Verified, CTSC Admin, Local Admin, System Admin". Should these match the exact role names from the database model (e.g., `VERIFIED`, `LOCAL_ADMIN`, `CTSC_ADMIN`, `SYSTEM_ADMIN`)?

3. **Self-deletion**: Should the system prevent a System Admin from deleting their own account, or is this allowed?

4. **Filter persistence after deletion**: When a user successfully deletes a user and returns to the user list, should the previous search filters remain active, or should they be cleared?

5. **Back navigation from Manage page**: When returning from the Manage User page to the Find Users page, should we maintain the exact pagination position, or is it acceptable to return to page 1 of the filtered results?

6. **Filter application**: Should filters update the user list automatically as they're changed, or should there be an explicit "Apply filters" button?

7. **Cascade deletion**: When a user is deleted, should their related subscriptions be automatically deleted as well?

8. **Welsh translations**: Should all pages in this feature be fully translated to Welsh (following the standard bilingual approach)?

Please let me know your preferences for these points so I can proceed with implementation.

---

_Generated via /qk-plan_
