# #699: Manage List Type Screens (Screens for adding jurisdictions and regions)

**State:** OPEN
**Assignees:** (none)
**Author:** OgechiOkelu
**Labels:** enhancement
**Created:** 2026-06-10T13:46:48Z
**Updated:** 2026-06-22T09:22:26Z

## Description

**PROBLEM STATEMENT**
This ticket is raised to make changes to the System Admin Dashboard.

**AS A** Service
**I WANT** to update the System Admin Dashboard
**SO THAT** the list configuration process is consolidated

**ACCEPTANCE CRITERIA**
Merge the 'Manage List Types' and 'Configure List Types' tiles and re-name the merged/single tile to 'Manage List Types'

**Process Flow:**

**'Manage list type' process:**
Step 1: Log into the System Admin Dashboard and click on the 'Manage List Types' tile which proceeds to the 'Select list type' screen.
Step 2: Click on the 'Manage' link which proceeds to the 'Manage list type' screen.

**'Edit list type' process:**
Step 1: On the 'Manage List Type' screen, click on the 'Edit List Type' button which proceeds to the 'Edit List Type' screen.
Step 2: Populate the form (Data fields: Name, Friendly name, Welsh friendly name, Shortened friendly name, URL, Case number JSON field name, Case name JSON field name, Default sensitivity, Allowed provenance and 'Is non-strategic?) and click 'Continue' button which proceeds to the 'Select sub-jurisdiction and region' screen.
Step 3: On the 'Select Sub-Jurisdiction and region' screen, check the boxes for the sub-jurisdictions to be linked to the list type (Type of criminal court, Type of civil court, Type of family court and Type of tribunal sub-jurisdiction options provided as check boxes under each jurisdiction title in an accordion) and the region. Accordions are open by default. Click 'Continue' button to proceed to the summary screen.
Step 4: On the Summary screen titled 'Check list type details', check the details and click 'Change' link beside any detail to be updated (takes user back to 'Edit List Type' screen) or 'Confirm' to proceed if the details are correct. 'Confirm' button takes user to the final confirmation screen titled 'List type updated'.

**'Delete list type' process:**
Step 1: On the 'Manage List Type' screen, click on the 'Delete List Type' button which proceeds to the 'Are you sure you want to delete list type' screen.
Step 2: Click on the 'Confirm' to proceed if the details are correct. 'Confirm' button takes user to the final confirmation screen titled 'list type deleted'.

**'Add new list type' process:**
Step 1: On the 'Select List Type' screen, click on the 'Add New List Type' button which proceeds to the 'Enter List Type' screen.
Step 2: Populate the form (Data fields: Name, Friendly name, Welsh friendly name, Shortened friendly name, URL, Case number JSON field name, Case name JSON field name, Default sensitivity, Allowed provenance and 'Is non-strategic?) and click 'Continue' button which proceeds to the 'Select sub-jurisdiction and region' screen.
Step 3: On the 'Select sub-jurisdiction and region' screen, check the boxes for the sub-jurisdictions to be linked to the list type (Type of criminal court, Type of civil court, Type of family court and Type of tribunal sub-jurisdiction options provided as check boxes under each jurisdiction title in an accordion) and the region. Accordions are open by default. Click 'Continue' button to proceed to the 'Summary' screen.
Step 4: On the Summary screen titled 'Check list details', check the details and click 'Change' link beside any detail to be updated (takes user back to 'Add List Configuration' screen) or 'Confirm' to proceed if the details are correct. 'Confirm' button takes user to the final confirmation screen titled 'List type updated'.

## Comments

### Comment by OgechiOkelu on 2026-06-15T13:27:33Z
@spec

### Comment by OgechiOkelu on 2026-06-19T09:16:50Z
@SPEC

### Comment by hmctsclaudecode on 2026-06-19T09:22:12Z
(Prior detailed technical specification — see plan.md for the current plan.)

### Comment by OgechiOkelu on 2026-06-19T09:22:57Z
@plan

### Comment by OgechiOkelu on 2026-06-22T09:22:26Z
@plan
