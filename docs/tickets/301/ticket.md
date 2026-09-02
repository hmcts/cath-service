# #301: [VIBE-313] Third Party User Management - Future

**State:** OPEN
**Assignees:** alexbottenberg
**Author:** linusnorton
**Labels:** migrated-from-jira, priority:3-medium, type:story, jira:VIBE-313, status:prioritised-backlog
**Created:** 2026-01-20T17:21:32Z
**Updated:** 2026-03-18T14:43:34Z

## Description

> **Migrated from [VIBE-313](https://tools.hmcts.net/jira/browse/VIBE-313)**

### **PROBLEM STATEMENT**

System admin users in CaTH access several system functionalities through the System Admin dashboard which allows them to perform administrative tasks. The dashboard acts as the main control panel for managing reference data, user accounts, media accounts, audit logs, and other administrative operations. This ticket covers the system admin user's ability to onboard, update and delete third-party users through a structured, multi-screen workflow.

### **AS A** system admin
**I WANT** to create and manage a third-party user in CaTH
**SO THAT** I can manage external users efficiently while ensuring the right access permissions are applied.

### **ACCEPTANCE CRITERIA**
* Only users with the **System Admin** role can access the System Admin Dashboard and all "Third-party user" management screens.
* "Back" returns to the previous screen **without losing saved data**.
* Page refresh does not create duplicate third-party users (idempotency on create confirm).
* Create, update (subscriptions), and delete actions write an audit entry capturing: admin user, timestamp, third-party name, action type, before/after values (where applicable).

**The create third party user process:**

**Screen Flow:** Dashboard → Manage Third Party Users → Create Third Party User → Summary → Confirmation
* System Admin can navigate from **Dashboard → Manage Third Party Users** where a table displays third-party users **Name and Created date** where existing third parties are already in the system and a **Manage** link/action per row / third party user. Where no third-party user exists, then the table is empty and the manage link is not displayed.
* A green **'Create new User'** button is displayed above the table which when clicked, takes the system admin user to the 'Create third party user' page to fill in the third-party user name in a free text box and When complete, the system admin clicks on the green 'Continue' button to continue.
* The System Admin is taken to the 'Create third party user summary' screen that displays the entered details in a table beside the 'Name' in a row in read-only format with a 'Change' link on each row which enables the editing of the inputted data by returning user to the **Create third party user** page with the previously entered Name pre-populated.
* Clicking **Confirm** on summary screen creates the third-party user and displays a **"Third party user created"** and the created **Name** on the confirmation page.
* System must validate mandatory fields before allowing Continue.
* System displays an error message if required data is missing.
* Name is mandatory.
* Name cannot be only whitespace.
* Name length and character rules are enforced
* Created user is added to the third-party users list.
* A table is created in the database (Third Party User Table) with the following data fields; Name, Created Date, sensitivity and subscriptions and each newly created third party is saved in the table

**The update third party user process:**

**Screen Flow:** Dashboard → Manage Third Party Users → Manage User → Manage Subscriptions → Subscriptions Updated
* System Admin can navigate from **Dashboard → Manage Third Party Users** where the system admin is able to view existing third-party user details and update subscription options by clicking the **'Manage'** button
* The System Admin is taken to the 'Manage user' screen which displays a table with the third party user details in rows titled 'Name', 'Created Date', 'Number of subscriptions' and 'Sensitivity' and two actionable buttons below; a green **Manage subscriptions** button which routes to **Manage third party subscriptions** and a red **Delete user** button which routes to the delete confirmation screen.
* Clicking the green "Manage Subscriptions" button takes the system admin to the "Manage third party Subscriptions" page. The "Manage third party Subscriptions" screen displays **all list types available in CaTH** in a tabular form, across multiple pages with paging controls (e.g., "Next", "Previous", page numbers) which allows navigation through list types.
* For each list type, the admin can select **only one** sensitivity level (Public, Private and Classified). 'Unselect' option is also provided to remove access. Where 'private' is selected, then the user has access to public and private lists. Where 'classified' is selected, then the user has access to public, private and classified lists.
* Clicking the green "Save Subscriptions" button on the last page updates the changes and takes the system admin user to the **'Third party subscriptions updated'** confirmation page
* Two UI options are provided for the tabular display on the "Manage third party Subscriptions" page and should be explored

**Manage third party subscriptions (Option 1 – radio buttons)**
* The table displays five column headers (List type, public, private, classified and unselect). Each list type is provided in a row with the ability to select **only one** sensitivity level using radio buttons displayed under each of the 3 sensitivity options and the unselect option.

**Manage third party subscriptions (Option 2 – dropdowns)**
* The table displays two column headers (List type and Sensitivity). Each list type is provided in a row with the ability to select **only one** sensitivity level from public, private, classified, using a dropdown provided in the sensitivity column, which is defaulted to 'Unselected'.
* System must save updated subscription settings when "Save Subscriptions" is clicked and display a confirmation screen with title **"Third Party Subscriptions Updated"** in a green banner and the descriptive message 'Third party subscriptions for the user have been successfully updated'. underneath the green banner is the following message 'To manage further subscriptions for third parties, you can go to: 'Manage third party users' (link)
* Updated subscriptions are visible when returning to Manage User screen.

**The delete third party user process:**

**Screen Flow:** Dashboard → Manage Third Party Users → Manage User → Delete Confirmation → Deletion Confirmation
* System Admin can navigate from **Dashboard → Manage Third Party Users** where the system admin is able to view existing third-party user details and update subscription options by clicking the **'Manage'** button
* The System Admin is taken to the 'Manage user' screen which displays a table with the third-party user details in rows titled 'Name', 'Created Date', 'Number of subscriptions' and 'Sensitivity'
* Clicking the red "Delete user" button takes the system admin to the "Are you sure you want to delete \<third party>?" screen where the system admin can select from a 'Yes' or 'No' radio button and click the green "Continue" to confirm. The 'Yes' radio button confirms deletion action while the 'No' radio button cancels the action and returns to **Manage user** page without deleting anything. The System Admin must explicitly confirm deletion before the system proceeds to delete the third party.
* The System displays a **Deletion Confirmation** screen with the title 'Third party user deleted' and the descriptive text 'The third party user and associated subscriptions have been removed' both in a green banner, followed by the text below; 'What do you want to do next?' and then two links; 'Manage another third party user' which takes the system admin user back to the respective screen and the 'Home' screen which takes user to the dashboard.
* Deletion removes the third-party user **and associated subscriptions** and the deleted user no longer appears in the user list.
* System prevents deletion of users with dependencies (if applicable).
* Audit logging is triggered for create, update, and delete actions

**Welsh translations**
* Create new user - Creu defnyddiwr newydd
* Name - enw'r
* Created date - Crëwyd Dyddiad
* Actions - Camau gweithredu
* Manage - Rheoli
* Continue - Parhau
* Create third party user - Creu defnyddiwr trydydd parti
* Create third party user summary - Creu crynodeb o ddefnyddiwr trydydd parti
* Change - newid
* Confirm - Cadarnhau
* Third party user created - Crëwyd defnyddiwr trydydd parti
* Manage subscriptions - Rheoli tanysgrifiadau
* Delete user - Dileu Defnyddiwr
* Manage third party subscriptions - Rheoli tanysgrifiadau trydydd parti
* Third party subscriptions updated - Diweddarwyd Tanysgrifiadau Trydydd Parti
* Manage third party users - Rheoli defnyddiwr trydydd parti
* Are you sure you want to delete user \<third party>? - Ydych chi'n siŵr eich bod eisiau dileu defnyddiwr?
* Yes - Ydw
* No - Nac ydw
* back - Yn ôl

## Page Specifications

### Page 1 — Manage Third Party Users
- H1 EN: "Manage third party users" | CY: "Rheoli defnyddwyr trydydd parti"
- Table columns: Name, Created date, Actions
- Button: "Create new user"
- "Manage" link per row
- Empty state: "There are no third party users."
- Back → System Admin Dashboard

### Page 2 — Create Third Party User
- H1 EN: "Create third party user" | CY: "Creu defnyddiwr trydydd parti"
- Text input: Name (required, max 255 chars, letters/numbers/spaces/hyphens/apostrophes)
- Validation: not empty, not whitespace-only, max 255 chars, valid chars
- Back → Manage Third Party Users (data retained)

### Page 3 — Create Third Party User Summary
- H1 EN: "Create third party user summary" | CY: "Creu crynodeb o ddefnyddiwr trydydd parti"
- Summary list showing Name (read-only) with Change link
- Confirm button → creates user (idempotent)
- Back → Create Third Party User (data retained)

### Page 4 — Third Party User Created (Confirmation)
- Panel: "Third party user created" / "The third party user has been successfully created"
- Link back to Manage Third Party Users

### Page 5 — Manage User
- H1 EN: "Manage user" | CY: "Rheoli defnyddiwr"
- Summary table: Name, Created Date, Number of subscriptions, Sensitivity
- Green button: "Manage subscriptions"
- Red button: "Delete user"
- Back → Manage Third Party Users

### Page 6 — Manage Third Party Subscriptions
- H1 EN: "Manage subscriptions" | CY: "Rheoli tanysgrifiadau"
- Paginated table of list types with sensitivity selection (radio buttons OR dropdown — A/B tested via LaunchDarkly)
- Option 1 (radio): columns — List type, Public, Private, Classified, Unselected
- Option 2 (dropdown): columns — List type, Sensitivity (select: Public/Private/Classified/Unselected)
- "Save Subscriptions" button
- Back → Manage User (without saving)

### Page 7 — Third Party Subscriptions Updated (Confirmation)
- Panel: "Third Party Subscriptions Updated" / "Third party subscriptions for the user have been successfully updated"
- Link: "Manage third party users"

### Page 8 — Delete Third Party User (Confirmation)
- H1 EN: "Are you sure you want to delete \<third party>?" | CY: "Ydych chi'n siŵr eich bod eisiau dileu defnyddiwr?"
- Radio buttons: Yes / No
- Continue button
- Validation: must select yes or no

### Page 9 — Third Party User Deleted (Confirmation)
- Panel: "Third party user deleted" / "The third party user and associated subscriptions have been removed"
- "What do you want to do next?"
- Links: "Manage another third party user", "Home"

## Accessibility
* All screens must meet WCAG 2.2 AA standards.
* All buttons, links, tables, radio buttons, and dropdowns must be fully keyboard accessible.
* Error messages must be associated with the relevant fields and announced to assistive technologies.
* Confirmation banners must use appropriate ARIA roles to announce success messages.

## Test Scenarios
* Only System Admin users can access third-party user management screens.
* Creating a third-party user with valid data succeeds and creates an audit log entry.
* Creating a user with invalid or missing Name shows validation errors.
* Page refresh on confirmation does not create duplicate users.
* Updating subscriptions correctly persists and is visible on return to Manage User.
* Deleting a user removes them from the list and deletes associated subscriptions.
* Deletion is blocked if dependencies exist.
* All create, update, and delete actions write audit logs with before/after values where applicable.
* Back navigation preserves entered or saved data across all flows.

## Comments

### Comment by linusnorton on 2026-03-18T14:43:26Z
Let's use LaunchDarkly to A/B test Option 1 and Option 2 of how we manage third party subscriptions.

I have added cath-ld-key to the pip-ss-kv-stg keyvault.

### Comment by linusnorton on 2026-03-18T14:43:34Z
@plan
