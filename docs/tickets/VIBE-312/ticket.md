# VIBE-312: Delete Court Process

**Status:** Acceptance
**Assignee:** Iqbal, Junaid
**Created:** 2025-12-08
**Updated:** 2025-12-16

## Summary
System admin users in CaTH access several system functionalities through the System Admin dashboard which allows them to perform administrative tasks. The dashboard acts as the main control panel for managing reference data, user accounts, media accounts, audit logs, and other administrative operations. This ticket covers the the end-to-end navigation of the Delete Court process which is covered across four screens; Dashboard, Find the court to remove, Are you sure you want to delete this court? and Delete Successful screen.

## User Story
**AS A** system Admin
**I WANT** to delete an existing court in CaTH
**SO THAT** I can update the list of available venues in CaTH

## Technical Specification
* On confirm, do the soft delete for the location. DO NOT delete the record from the location table.
* If location is soft deleted, make sure that location is not visible on any page or search.

## Acceptance Criteria
* System Admin Users can access the "Delete Court" tab from the system admin dashboard to search for a court, review its details, confirm deletion, and receive confirmation that it has been deleted.

* When the system admin user clicks on the "Delete Court" tab, then the user is taken to the 'Are you sure you want to delete this court?' screen, which has a table with the following row headings, 'Court or Tribunal name', 'Location Type', 'Jurisdiction' and 'Region', then 2 radio buttons with 'Yes' and 'No' and a green 'Continue' button.

* When system admin user clicks 'Continue' button,
  * we need to find if there is any subscription for that location, if yes, show the error message "There are active subscriptions for the given location."
  * if there is no subscription for a location, check for active artefact for it. If yes, show the error message "There are active artefacts for the given location."

* If there is no active subscription and artefact for the location, then the system admin user is taken to a confirmation page with 'Delete Successful' header in a green banner.

* the deleted court is no longer available in CaTH front end and back end and is deleted from the master reference data.

* All CaTH page specifications are maintained.

## Page Specifications

### Page: System Admin Dashboard

**Form fields**
* None

**Content**
* EN: Title/H1 "System admin dashboard"
* CY: Title/H1 "Dangosfwrdd Gweinyddwr y System"
* EN: Navigation tab — "Delete court"
* CY: Navigation tab — "Dileu llys"

**Errors**
* EN: "You do not have permission to access this page"
* CY: "Welsh placeholder"

**Back navigation**
* Not applicable (entry point).

---

### Page: Find the Court to Remove

**Form fields**
* Court or tribunal search
  * Input type: text
  * Required: Yes
  * Validation rules:
    * Must not be empty
    * Must match an existing court or tribunal

**Content**
* EN: Title/H1 "Find the court to remove"
* CY: Title/H1 "Dod o hyd i'r llys i'w ddileu"
* EN: Label — "Court or tribunal name"
* CY: Label — "Enw'r llys neu'r tribiwnlys"
* EN: Button — "Continue"
* CY: Button — "Dewiswch opsiwn"

**Errors**
* EN: "Enter a court or tribunal name"
* CY: "Welsh placeholder"
* EN: "Court or tribunal not found"
* CY: "Welsh placeholder"

**Back navigation**
* Back link returns to System Admin Dashboard.

---

### Page: Are You Sure You Want to Delete This Court?

**Form fields**
* Confirm deletion
  * Input type: radio
  * Required: Yes
  * Options:
    * Yes
    * No
  * Validation rules:
    * One option must be selected

**Content**
* EN: Title/H1 "Are you sure you want to delete this court?"
* CY: Title/H1 "Ydych chi'n siŵr eich bod eisiau dileu'r llys hwn?"
* EN: Table row labels — "Court or tribunal name", "Location type", "Jurisdiction", "Region"
* CY: Table row labels — "Enw'r llys neu'r tribiwnlys", "Math o Lleoliad", "Awdurdodaeth", "Rhanbarth"
* EN: Radio options — "Yes", "No"
* CY: Radio options — "Ydw", "Nac ydw"
* EN: Button — "Continue"
* CY: Button — "Dewiswch opsiwn"

**Errors**
* EN: "Select yes or no to continue"
* CY: "Welsh placeholder"
* EN: "There are active subscriptions for the given location."
* CY: "Welsh placeholder"
* EN: "There are active artefacts for the given location."
* CY: "Welsh placeholder"

**Back navigation**
* Back link returns to Find the Court to Remove, retaining the selected court.

---

### Page: Delete Successful

**Form fields**
* None

**Content**
* EN: Title/H1 "Delete successful"
* CY: Title/H1 "Wedi llwyddo i ddileu"
* EN: Banner text — "The court has been successfully deleted."
* CY: Banner text — "Welsh placeholder"
* EN: Link — "System admin dashboard"
* CY: Link — "Gweinyddwr y System"

**Errors**
* None

**Back navigation**
* Link returns to System Admin Dashboard.

---

## System Behaviour and Data Rules (Applies to all pages)
* Court deletion is implemented as a **soft delete**.
* The court record must not be physically removed from the location table.
* On confirmation, the system must:
  * Check for active subscriptions linked to the location.
  * If subscriptions exist, block deletion and display the relevant error message.
  * If no subscriptions exist, check for active artefacts linked to the location.
  * If artefacts exist, block deletion and display the relevant error message.
* If no active subscriptions or artefacts exist:
  * Mark the location as deleted (soft delete).
  * Ensure the location is no longer visible in:
    * Front-end pages
    * Search results
    * Admin selection lists
* The deleted court must be excluded from all future CaTH operations while remaining in reference data for audit and integrity purposes.

---

## Accessibility
* All pages must comply with WCAG 2.2 AA standards.
* Radio buttons must be keyboard accessible and correctly grouped.
* Error messages must be announced to screen readers and linked to the relevant form controls.
* Summary tables must use semantic table markup with appropriate headers.
* Green success banners must meet colour contrast requirements and include textual confirmation.

---

## Test Scenarios
* System admin can access the Delete Court journey from the dashboard.
* Entering an invalid court name displays an error.
* Court details are displayed correctly on the confirmation screen.
* Attempting to delete a court with active subscriptions is blocked with an error.
* Attempting to delete a court with active artefacts is blocked with an error.
* Successfully deleting a court shows the Delete Successful page.
* Soft-deleted courts do not appear in front-end or admin searches.
* Soft-deleted courts remain in the database for reference and audit.
* Non-system admin users cannot access the Delete Court functionality.

## Attachments
* delete court process.docx
