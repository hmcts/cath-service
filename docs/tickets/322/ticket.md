# #322: [VIBE-368] Third Party User Management - Current

**State:** OPEN
**Assignees:** alao-daniel
**Author:** linusnorton
**Labels:** migrated-from-jira, status:new, priority:3-medium, type:story, jira:VIBE-368
**Created:** 2026-01-29T16:02:45Z
**Updated:** 2026-02-09T12:56:28Z

## Description

> **Migrated from [VIBE-368](https://tools.hmcts.net/jira/browse/VIBE-368)**

### **PROBLEM STATEMENT**

System admin users in CaTH access several system functionalities through the System Admin dashboard which allows them to perform administrative tasks. The dashboard acts as the main control panel for managing reference data, user accounts, media accounts, audit logs, and other administrative operations. This ticket covers the system admin user's ability to onboard, update and delete third-party users through a structured, multi-screen workflow.

### **AS A** system admin
**I WANT** to create and manage a third-party user in CaTH
**SO THAT** I can manage external users efficiently while ensuring the right access permissions are applied.

### **TECHNICAL SPECIFICATIONS**
* Create a new table named legacy_third_party_users with columns id, name and created_date
* Create a new table named legacy_third_party_subscription with id, user_id, list_type_id, created_date.
* Implement audit logs for all the pages.
* Create branch for this ticket from branch feature/VIBE-311-audit-log-view

### **ACCEPTANCE CRITERIA**
* Only users with the **System Admin** role can access the System Admin Dashboard and all "Third-party user" management screens.
* "Back" returns to the previous screen **without losing saved data**.
* Page refresh does not create duplicate third-party users (idempotency on create confirm).
* Create, update (subscriptions), and delete actions write an audit entry capturing: admin user, timestamp, third-party name, action type, before/after values (where applicable).

**The create third party user process:**

**Screen Flow:** Dashboard → Manage Third Party Users → Create Third Party User → Summary → Confirmation
* System Admin can navigate from **Dashboard → Manage Third Party Users** where a table displays third-party users **Name and Created date** where existing third parties are already in the system and a **Manage** link/action per row / third party user. Where no third-party user exists, then the table is empty and the manage link is not displayed.
* A green '**Create new User**' button is displayed above the table which when clicked, takes the system admin user to the 'Create third party user' page to fill in the third-party user name in a free text box and When complete, the system admin clicks on the green 'Continue' button to continue.
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

**Screen Flow:**  Dashboard → Manage Third Party Users → Manage User → Manage Subscriptions → Subscriptions Updated
* System Admin can navigate from **Dashboard → Manage Third Party Users** where the system admin is able to view existing third-party user details and update subscription options by clicking the '**Manage**' button
* The System Admin is taken to the 'Manage user' screen which displays a table with the third party user details in rows titled 'Name', 'Created Date', 'Number of subscriptions'' and 'Sensitivity' and two actionable buttons below; a green **Manage subscriptions** button which routes to **Manage third party subscriptions** and a red **Delete user** button which routes to the delete confirmation screen.
* Clicking the green "Manage Subscriptions" button take the system admin to the "Manage third party Subscriptions" page. The "Manage third party Subscriptions" screen displays a radio button under the following descriptive text under the page title 'Please select a Channel'. This is followed by the text 'Please select list types' and then **all list types available in CaTH** in rows beginning with a checkbox beside each list type.
* Upon selection, clicking the green "Save Subscriptions" button on the last page updates the changes and takes the system admin user to the '**Third party subscriptions updated**' confirmation page

**The delete third party user process:**

**Screen Flow:** Dashboard → Manage Third Party Users → Manage User → Delete Confirmation → Deletion Confirmation
* System Admin can navigate from **Dashboard → Manage Third Party Users** where the system admin is able to view existing third-party user details and update subscription options by clicking the '**Manage**' button
* The System Admin is taken to the 'Manage user' screen which displays a table with the third-party user details in rows titled 'Name', 'Created Date', 'Number of subscriptions'' and 'Sensitivity'
* Clicking the red "Delete user" button take the system admin to the "Are you sure you want to delete <third party>?" screen where the system admin can select from a 'Yes' or 'No' radio button and click the green "Continue" to confirm. Screen title includes the selected third-party name (e.g., "Are you sure you want to delete <third party>.?"). the 'Yes' radio button confirms deletion action while the 'No' radio button cancels the action and returns to **Manage user** page without deleting anything. The System Admin must explicitly confirm deletion before the system proceeds to delete the third party.
* The System displays a **Deletion Confirmation** screen with the title 'Third party user deleted' and the descriptive text 'The third party user and associated subscriptions have been removed' both in a green banner, followed by the text below; 'What do you want to do next?' and then two links; 'Manage another third party user' which take the system admin user back to the respective screen and the 'Home' screen which takes user to the dashboard.
* Deletion removes the third-party user **and associated subscriptions** and the Deleted user no longer appears in the user list.
* System prevents deletion of users with dependencies (if applicable).
* Audit logging is triggered for create, update, and delete actions

**Welsh translations**
* Create new user - Creu defnyddiwr newydd
* Name - enw'r
* Created date - Crëwyd Dyddiad
* Number of subscriptions
* Sensitivity
* Actions - Camau gweithredu
* Manage - Rheoli
* Continue - Parhau
* Create third party user - Creu defnyddiwr trydydd parti
* Create third party user - Wedi methu creu defnyddiwr trydydd parti
* Create third party user summary - Creu crynodeb o ddefnyddiwr trydydd parti
* Change - newid
* Confirm - Cadarnhau
* Third party user created - Crëwyd defnyddiwr trydydd parti
* The third party user has been successfully created
* Role -
* Manage subscriptions - Rheoli tanysgrifiadau
* Delete user - Dileu Defnyddiwr
* Classified
* Private
* Public
* unselected
* Manage third party subscriptions - Rheoli tanysgrifiadau trydydd parti
* subscriptions - tanysgrifiadau
* third party - Trydydd Parti
* confirm subscriptions - Cadarnhau tanysgrifiadau
* Third party subscriptions updated - Diweddarwyd Tanysgrifiadau Trydydd Parti
* Third party subscriptions for the user have been successfully updated
* To manage further subscriptions for third parties, you can go to
* Manage third party users - Rheoli defnyddiwr trydydd parti
* Are you sure you want to delete user <third party>? - Ydych chi'n siŵr eich bod eisiau dileu defnyddiwr?
* Yes - Ydw
* No - Nac ydw
* Select yes or no to continue
* Third party user deleted
* Home
* back - Yn ôl

---

## Original JIRA Metadata

- **Status**: New
- **Priority**: 3-Medium
- **Issue Type**: Story
- **Assignee**: Unassigned
- **Created**: 1/22/2026
- **Updated**: 1/23/2026
- **Original Labels**: CaTH, tech-refinement

_Attachments will be added in a comment below._

## Comments

No comments on this issue.
