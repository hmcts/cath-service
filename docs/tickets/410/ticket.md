# #410: System Admin - Data Management

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** type:story
**Created:** 2026-02-24T17:54:19Z
**Updated:** 2026-02-24T18:06:25Z

## Description

**PROBLEM STATEMENT:**
This ticket covers the implementation of the functionality needed to upload Reference Data, manage Jurisdiction Data and Reference Data. It will explore different options in the fulfilment of this scope of work.


**AS A** System Administrator
**I WANT** create a ‘Reference Data’ tile on the system admin dashboard
**SO THAT** I can manage all activities related to the jurisdiction and reference data from one central location.


**ACCEPTANCE CRITERIA:**
•	A single tile with title “Reference Data” is created in the system admin dashboard
•	Clicking the tile opens the Reference Data landing page titled ‘What do you want to do?’ which displays 4 action pathways; ‘Upload Reference Data’, ‘Manage Jurisdiction Data’, ‘Manage Location Jurisdiction Data’ and ‘Manage Location Metadata’. 2 options will be explored for the display of all 4 pathways. 1st option is presented as 4 tiles while the 2nd option is presented as 4 radio buttons.
•	Under the ‘Upload Reference Data’ is written the descriptive message ‘Upload CSV location reference data’
•	Under the ‘Manage Location Metadata’ is the descriptive message ‘View, update and remove location metadata’
•	Under the ‘Manage Jurisdiction Data’ is the descriptive message ‘View, update and remove jurisdiction metadata’
•	Under the ‘Manage Location Jurisdiction Data’ is the descriptive message ‘View and update location jurisdiction data’
•	Where the user selects the ‘Upload Reference Data’, then the user is taken to the ‘Manually upload a csv file’ page. A warning message displayed at the top reads as follows ‘Warning’ followed by the caution symbol and the message ‘Prior to upload you must ensure the file is suitable for location data upload e.g. file should be in correct formats.’. The link to the current reference data stored in the database is displayed under the warning and masked in the text ‘Download current reference data’. Underneath is written ‘Manually upload a csv file (saved as Comma-separated Values .csv), max size 2MB’ with a ‘Choose File’ tab which the user can click on to upload the csv file. This followed by the green ‘Continue’ button. Where no file is attached and user clicks the continue button, the message ‘Please provide a file’ is displayed in red above the upload portal.
•	Where the user selects ‘Manage Location Metadata’ the user is taken to the ‘Find the location metadata to manage’ page. ‘Search by court or tribunal name’ is displayed under the page header followed by a search tab with the following descriptive message displayed on top; ‘For example, Blackburn Crown Court’. This is followed by the green ‘Continue’ button which takes the user to the ‘Manage location metadata for Gateshead County Court and Family Court’ page which displays 4 free text bars with the following titles; ‘English caution message’, ‘Welsh caution message’, ‘English no list message’ and ‘Welsh no list message’, followed by the green ‘create’ button.

•	Where the user selects ‘Manage Jurisdiction Data’ the user is taken to the ‘What do you want to do?’ page where the user sees 2 radio buttons; ‘Create a new jurisdiction or sub-jurisdiction’ and ‘Modify an existing jurisdiction or sub-jurisdiction’, followed by a green ‘Continue’ button.
1.	Where the user selects the ‘Modify an existing jurisdiction or sub-jurisdiction’, then the user is taken to the ‘Modify an existing jurisdiction or sub-jurisdiction’ page which displays a table with columns titled ‘Name’, ‘Type’ and a third column the a ‘Modify’ link beside each row that allows the user click to modify the details provided in the row. On the left side of the page is a filter provided in the already existing CaTH filter format but with 2 search fields; ‘Jurisdiction’ and ‘Sub-Jurisdiction’. Each field displays the following message above the search box ‘Must be an exact match’ Users can search for specific jurisdictions or sub-jurisdiction and the system pulls up details regarding the search when the green ‘Apply filters’ button is clicked.
2.	Clicking on the ‘Modify’ link takes the user to the ‘Modify’ page which displays a table with 2 rows; ‘Name’ and ‘Type’ of the specific Jurisdiction/Sub-jurisdiction to be modified, followed by a green ‘Update’ and red ‘Delete’ button. Where the user selects ‘delete’, then the user is taken to a ‘Summary’ page that displays the same table on previous page, followed by the question ‘Are you sure you want to delete this Jurisdiction data? And then 2 ‘Yes’ and ‘No’ radio buttons and a green ‘Continue’ button which when clicked after a selection has been made, takes the user to the final confirmation page.
3.	The final confirmation page displays ‘Jurisdiction Data Deleted’ as a header in a green banner, followed by the descriptive message ‘The jurisdiction data has been successfully deleted’. Under the green banner is the message ‘To further modify or delete any jurisdiction data, you can go to ‘Manage Jurisdiction Data’ (link to the manage jurisdiction data is masked in the highlighted text).
4.	Where the user selects the ‘Update’ button, the user is taken to the ‘Update Jurisdiction Data’ page A table is displayed underneath with the following rows; ‘Name’ which displays the existing name and a free text box, ‘Welsh Name’ which displays the existing Welsh name and provides a free text box for the user to type in, ‘Type’ which provides a dropdown for the user to select either ‘Jurisdiction’, ‘Sub-Jurisdiction’ or ‘Region’. this is followed by the green ‘Confirm’ button which when clicked takes the user to the final confirmation page.
5.	The final confirmation page displays ‘Jurisdiction Data Updated’ as a header in a green banner, followed by the descriptive message ‘The jurisdiction data has been successfully updated’. Under the green banner is the message ‘To further modify or delete any jurisdiction data, you can go to ‘Manage Jurisdiction Data’ (link to the manage jurisdiction data is masked in the highlighted text).
6.	Where the user selects ‘Create a new jurisdiction or sub-jurisdiction’ radio button on the ‘What do you want to do?’ page and clicks the green continue button, the user is taken to the ‘Create Jurisdiction Data’ page which displays A table is displayed underneath with the following rows; ‘Name’ which displays a free text box, ‘Welsh Name’ which displays a free text box for the user to type in, ‘Type’ which provides a dropdown for the user to select either ‘Jurisdiction’, ‘Sub-Jurisdiction’ or ‘Region’. this is followed by the green ‘Confirm’ button which when clicked takes the user to the final confirmation page.

•	Where the user selects ‘Manage Location Jurisdiction data’ the user is taken to the ‘Find the Jurisdiction date to manage’ page where displays the following message under the header; ‘Search by court or tribunal name’ and then a search box that allows the user type to search while the system displays possible suggestions. Above the search box is the text ‘Foe example, Blackburn Crown Court’. This is followed by the green ‘Continue’ button which takes the user to the ‘Manage Jurisdiction Data’ page which displays the warning caution symbol and message ‘Ensure authorisation has been granted before making any modification to the jurisdiction data’. A table is displayed below with the search details in the rows titled ‘Court or tribunal name’, ‘Jurisdiction’ and ‘Sub-Jurisdiction’. Underneath the table are a green ‘Update’ and red ‘Delete’ button.
•	If the user clicks the ‘Delete’ button, user is taken to the ‘Are you sure you want to delete this data?’ page where the user can select either ‘Yes’ or ‘No’ radio button and beneath is the green ‘Confirm’ button which when clicked takes user to the final confirmation page which displays ‘Jurisdiction Data Deleted’ with the following descriptive message beneath ‘The jurisdiction data has been successfully deleted’
•	If user clicks update button, user is taken to the screen with the ‘Court or tribunal name’ as the page title followed by the descriptive message ‘Update Jurisdiction Data’. This is followed by 2 screen options to be provided for testing
•	Option 1: ‘Jurisdiction’, ‘Type of civil court’, ‘Type of criminal court’, ‘Type of family court’, ‘Type of tribunal’ and ‘Region’ are displayed in a row with dropdown boxes that contain the options to be selected followed by the green ‘Confirm’ button and the red ‘Cancel’ button
•	Option 2: ‘Jurisdiction’, ‘Type of civil court’, ‘Type of criminal court’, ‘Type of family court’, ‘Type of tribunal’ and ‘Region’ are displayed as accordions with the associated options displayed as checkboxes to be selected followed by the green ‘Confirm’ button and the red ‘Cancel’ button
•	When user clicks the green ‘Confirm button in either option 1 or 2, user is taken to the confirmation page with ‘Location Jurisdiction Data Updated’ displayed in a green banner an the descriptive text beneath ‘The location jurisdiction data has been successfully updated’. This is followed by the same link as above in other confirmation pages
•	Where the user clicks the ‘Cancel’ button then the process is cancelled
•	System checks for dependencies must be performed before any deletion can occur and orphaned lists due to the deletion must be accounted and Audit entry must be logged. The possibility of Soft delete (status = inactive) should be considered
•	Where no radio button is selected and the continue button is clicked, then the system will display a ‘There is a problem. Please select one option’ error message in red.


## Comments

### Comment by OgechiOkelu on 2026-02-24T17:55:57Z

@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-02-24T18:04:13Z

# Issue #410 – System Admin: Data Management

## 1. User Story

**As a** System Administrator
**I want to** manage all reference data activities from a single central location via a "Reference Data" tile on the System Admin Dashboard
**So that** I can upload reference data, manage jurisdiction data, manage location jurisdiction data, and manage location metadata without navigating multiple separate dashboard tiles

---

## 2. Background

The current System Admin Dashboard exposes "Upload Reference Data" and "Manage Location Metadata" as separate top-level tiles alongside unrelated admin functions. There is no dedicated management interface for jurisdiction data (creating, modifying, or deleting `Jurisdiction`, `SubJurisdiction`, and `Region` records) or for managing which jurisdictions are associated with individual court locations.

This ticket consolidates all reference-data-related workflows under a single "Reference Data" tile on the dashboard, introducing a landing page with four action pathways. Two new workflows are introduced:

- **Manage Jurisdiction Data** – CRUD operations for Jurisdiction, Sub-Jurisdiction, and Region records, replacing the scattered "Add Jurisdiction", "Add Sub-Jurisdiction", and "Add Region" quick-links on the upload page.
- **Manage Location Jurisdiction Data** – Search for a court/tribunal and manage the jurisdictions and sub-jurisdictions associated with that location.

The existing "Upload Reference Data" and "Manage Location Metadata" workflows are preserved but accessible via the new Reference Data landing page rather than directly from the dashboard.

**Relevant existing files:**
- `libs/system-admin-pages/src/pages/system-admin-dashboard/` – Dashboard page (tile updated)
- `libs/system-admin-pages/src/pages/reference-data-upload/` – Existing upload flow (back link updated)
- `libs/system-admin-pages/src/pages/location-metadata-search/` – Existing metadata search (back link updated)
- `libs/location/prisma/schema.prisma` – `Jurisdiction`, `SubJurisdiction`, `Region`, `Location`, `LocationSubJurisdiction` models

---

## 3. Acceptance Criteria

**Scenario: System admin sees Reference Data tile on dashboard**
- **Given** I am logged in as a System Administrator and on the System Admin Dashboard
- **When** I view the dashboard
- **Then** I see a tile titled "Reference Data" and it links to the Reference Data landing page
- **And** the existing "Upload Reference Data" and "Manage Location Metadata" top-level tiles are no longer displayed on the dashboard

**Scenario: Reference Data landing page – tile layout option**
- **Given** I am on the Reference Data landing page (tile display variant)
- **When** the page loads
- **Then** I see the heading "What do you want to do?" and four tiles: "Upload Reference Data", "Manage Jurisdiction Data", "Manage Location Jurisdiction Data", and "Manage Location Metadata"
- **And** each tile displays its descriptive message beneath its title

**Scenario: Reference Data landing page – radio button layout option**
- **Given** I am on the Reference Data landing page (radio button display variant)
- **When** the page loads
- **Then** I see the heading "What do you want to do?" and four radio buttons: "Upload Reference Data", "Manage Jurisdiction Data", "Manage Location Jurisdiction Data", and "Manage Location Metadata", followed by a green "Continue" button
- **And** if I click "Continue" without selecting an option, I see the error "There is a problem. Please select one option"

**Scenario: Upload Reference Data pathway**
- **Given** I am on the Reference Data landing page
- **When** I select "Upload Reference Data" (either by clicking the tile or selecting the radio and clicking Continue)
- **Then** I am taken to the "Manually upload a csv file" page
- **And** I see the warning message with the caution symbol: "Prior to upload you must ensure the file is suitable for location data upload e.g. file should be in correct formats."
- **And** I see a "Download current reference data" link
- **And** I see file upload instructions and the Choose File control
- **And** if I click Continue without attaching a file, I see the error "Please provide a file" displayed above the upload portal

**Scenario: Manage Location Metadata pathway**
- **Given** I am on the Reference Data landing page
- **When** I select "Manage Location Metadata"
- **Then** I am taken to the existing "Find the location metadata to manage" search page

**Scenario: Manage Jurisdiction Data – create new**
- **Given** I am on the Manage Jurisdiction Data landing ("What do you want to do?") page
- **When** I select "Create a new jurisdiction or sub-jurisdiction" and click Continue
- **Then** I am taken to the Create Jurisdiction Data form with Name, Welsh Name, and Type (dropdown: Jurisdiction / Sub-Jurisdiction / Region) fields
- **And** clicking "Confirm" saves the record and shows the success confirmation panel

**Scenario: Manage Jurisdiction Data – modify existing**
- **Given** I am on the Manage Jurisdiction Data landing page
- **When** I select "Modify an existing jurisdiction or sub-jurisdiction" and click Continue
- **Then** I am taken to the Modify Jurisdiction Data list page showing a table of existing records with columns Name, Type, and a Modify action link
- **And** a filter sidebar with Jurisdiction and Sub-Jurisdiction search fields (each labelled "Must be an exact match") and an Apply Filters button is displayed on the left

**Scenario: Manage Jurisdiction Data – modify individual record**
- **Given** I am on the Modify Jurisdiction Data list page
- **When** I click the "Modify" link for a record
- **Then** I see the record's Name and Type displayed in a summary table
- **And** I see a green "Update" button and a red "Delete" button

**Scenario: Manage Jurisdiction Data – delete**
- **Given** I have clicked "Delete" on a jurisdiction record
- **When** I confirm deletion by selecting "Yes" and clicking Continue
- **Then** I am taken to the delete confirmation page showing "Are you sure you want to delete this Jurisdiction data?" with Yes/No radio buttons
- **And** after confirming, I see the "Jurisdiction Data Deleted" success panel with the message "The jurisdiction data has been successfully deleted"
- **And** a link to "Manage Jurisdiction Data" is displayed

**Scenario: Manage Jurisdiction Data – update**
- **Given** I have clicked "Update" on a jurisdiction record
- **When** I update the Name, Welsh Name, and/or Type and click "Confirm"
- **Then** I see the "Jurisdiction Data Updated" success panel with the message "The jurisdiction data has been successfully updated"
- **And** a link to "Manage Jurisdiction Data" is displayed

**Scenario: Manage Location Jurisdiction Data – search and manage**
- **Given** I am on the "Find the Jurisdiction data to manage" search page
- **When** I search for a court and click Continue
- **Then** I am taken to the Manage Location Jurisdiction Data page showing a warning, a table with Court or tribunal name, Jurisdiction, and Sub-Jurisdiction columns, and green "Update" and red "Delete" buttons

**Scenario: Manage Location Jurisdiction Data – delete**
- **Given** I am on the Manage Location Jurisdiction Data page
- **When** I click "Delete" and confirm "Yes"
- **Then** I see the "Jurisdiction Data Deleted" success panel

**Scenario: Manage Location Jurisdiction Data – update (Option 1: dropdowns)**
- **Given** I am on the Location Jurisdiction Update page (Option 1)
- **When** I select values for Jurisdiction, Type of civil court, Type of criminal court, Type of family court, Type of tribunal, and Region using dropdown menus and click "Confirm"
- **Then** I am taken to the "Location Jurisdiction Data Updated" success panel

**Scenario: Manage Location Jurisdiction Data – update (Option 2: accordions)**
- **Given** I am on the Location Jurisdiction Update page (Option 2)
- **When** I expand accordions for each category and select checkboxes, then click "Confirm"
- **Then** I am taken to the "Location Jurisdiction Data Updated" success panel

**Scenario: Cancel location jurisdiction update**
- **Given** I am on the Location Jurisdiction Update page
- **When** I click "Cancel"
- **Then** the update process is cancelled and I am returned to the previous page

**Scenario: Dependency and audit checks on deletion**
- **Given** a deletion is requested for any jurisdiction data
- **When** the system processes the deletion
- **Then** the system checks for dependencies before deletion, accounts for orphaned lists, and logs an audit entry

**Scenario: No option selected on radio pages**
- **Given** I am on any page with radio buttons and a Continue button (Reference Data landing, Manage Jurisdiction Data landing, Delete confirmation, Location Jurisdiction Delete confirmation)
- **When** I click Continue without selecting a radio option
- **Then** I see the error: "There is a problem. Please select one option"

---

## 4. User Journey Flow

```
System Admin Dashboard
        │
        ▼ [Reference Data tile]
Reference Data Landing Page
("What do you want to do?")
        │
   ┌────┴──────────────────────────────────┐
   │            │              │            │
   ▼            ▼              ▼            ▼
Upload      Manage         Manage      Manage
Reference   Jurisdiction   Location    Location
Data        Data           Jurisdiction Metadata
(existing)  Landing        Data
   │            │              │            │
   ▼            │              ▼            ▼
[upload     ┌───┴────┐    Location     [existing
flow]       │        │    Jurisdiction  metadata
        Create   Modify   Search       flow]
            │        │        │
            ▼        ▼        ▼
        Create    List +  Location
        Form      Filter  Jurisdiction
            │        │    Manage Page
            ▼        ▼       │
        Confirm  Modify  ┌───┴────┐
        Success  Item   Delete  Update
                    │       │       │
               ┌────┴──┐    ▼       ▼
             Update  Delete  Delete  Update
             Form    Confirm Success Form
               │         │       │
               ▼         ▼       ▼
            Update    Delete  Update
            Success   Success Success
```

---

## 5. Low Fidelity Wireframes

### 5a. Reference Data Landing Page – Option 1 (Tiles)

```
┌──────────────────────────────────────────────────────────────────┐
│ ◀ Back                                                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  What do you want to do?                                         │
│                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────┐       │
│  │ Upload Reference Data   │  │ Manage Jurisdiction     │       │
│  │                         │  │ Data                    │       │
│  │ Upload CSV location     │  │ View, update and remove │       │
│  │ reference data          │  │ jurisdiction metadata   │       │
│  └─────────────────────────┘  └─────────────────────────┘       │
│                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────┐       │
│  │ Manage Location         │  │ Manage Location         │       │
│  │ Jurisdiction Data       │  │ Metadata                │       │
│  │                         │  │                         │       │
│  │ View and update         │  │ View, update and remove │       │
│  │ location jurisdiction   │  │ location metadata       │       │
│  │ data                    │  │                         │       │
│  └─────────────────────────┘  └─────────────────────────┘       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 5b. Reference Data Landing Page – Option 2 (Radio Buttons)

```
┌──────────────────────────────────────────────────────────────────┐
│ ◀ Back                                                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  What do you want to do?                                         │
│                                                                  │
│  ○ Upload Reference Data                                         │
│    Upload CSV location reference data                            │
│                                                                  │
│  ○ Manage Jurisdiction Data                                       │
│    View, update and remove jurisdiction metadata                 │
│                                                                  │
│  ○ Manage Location Jurisdiction Data                              │
│    View and update location jurisdiction data                    │
│                                                                  │
│  ○ Manage Location Metadata                                       │
│    View, update and remove location metadata                     │
│                                                                  │
│  [ Continue ]                                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 5c. Upload Reference Data Page

```
┌──────────────────────────────────────────────────────────────────┐
│ ◀ Back                                                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ Warning                                              │       │
│  │ ⚠ Prior to upload you must ensure the file is        │       │
│  │   suitable for location data upload e.g. file        │       │
│  │   should be in correct formats.                      │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
│  Manually upload a csv file                                      │
│                                                                  │
│  Download current reference data                                 │
│                                                                  │
│  Manually upload a csv file (saved as Comma-separated            │
│  Values .csv), max size 2MB                                      │
│                                                                  │
│  [Choose File]   No file chosen                                  │
│                                                                  │
│  [ Continue ]                                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 5d. Manage Jurisdiction Data Landing

```
┌──────────────────────────────────────────────────────────────────┐
│ ◀ Back                                                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  What do you want to do?                                         │
│                                                                  │
│  ○ Create a new jurisdiction or sub-jurisdiction                 │
│                                                                  │
│  ○ Modify an existing jurisdiction or sub-jurisdiction           │
│                                                                  │
│  [ Continue ]                                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 5e. Modify Existing Jurisdiction List (with Filter)

```
┌──────────────────────────────────────────────────────────────────┐
│ ◀ Back                                                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Modify an existing jurisdiction or sub-jurisdiction             │
│                                                                  │
│  ┌─────────────────┐  ┌───────────────────────────────────────┐  │
│  │ Filter          │  │ Name              │ Type        │     │  │
│  │─────────────────│  │───────────────────┼─────────────┼─────│  │
│  │ Jurisdiction    │  │ Civil             │ Jurisdiction│Mod. │  │
│  │ Must be exact   │  │───────────────────┼─────────────┼─────│  │
│  │ [____________]  │  │ Family            │ Sub-Juris.  │Mod. │  │
│  │                 │  │───────────────────┼─────────────┼─────│  │
│  │ Sub-Jurisdiction│  │ North West        │ Region      │Mod. │  │
│  │ Must be exact   │  └───────────────────────────────────────┘  │
│  │ [____________]  │                                             │
│  │                 │                                             │
│  │ [ Apply filters]│                                             │
│  └─────────────────┘                                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 5f. Modify Individual Jurisdiction Record

```
┌──────────────────────────────────────────────────────────────────┐
│ ◀ Back                                                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Modify                                                          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ Name     │ Civil                                    │        │
│  │──────────────────────────────────────────────────── │        │
│  │ Type     │ Jurisdiction                             │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
│  [ Update ]    [ Delete ]                                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 5g. Create / Update Jurisdiction Data Form

```
┌──────────────────────────────────────────────────────────────────┐
│ ◀ Back                                                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Create Jurisdiction Data  (or: Update Jurisdiction Data)        │
│                                                                  │
│  ┌──────────────┬──────────────────────────────────────┐        │
│  │ Name         │ [existing value]  [____________]     │        │
│  │──────────────┼──────────────────────────────────────│        │
│  │ Welsh Name   │ [existing value]  [____________]     │        │
│  │──────────────┼──────────────────────────────────────│        │
│  │ Type         │ [Jurisdiction ▾]                     │        │
│  └──────────────┴──────────────────────────────────────┘        │
│                                                                  │
│  [ Confirm ]                                                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 5h. Delete Confirmation (Jurisdiction Data)

```
┌──────────────────────────────────────────────────────────────────┐
│ ◀ Back                                                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────┐                        │
│  │ Name     │ Civil                    │                        │
│  │──────────────────────────────────── │                        │
│  │ Type     │ Jurisdiction             │                        │
│  └──────────────────────────────────────┘                        │
│                                                                  │
│  Are you sure you want to delete this Jurisdiction data?         │
│                                                                  │
│  ○ Yes                                                           │
│  ○ No                                                            │
│                                                                  │
│  [ Continue ]                                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 5i. Jurisdiction Data Success Page (Delete / Update / Create)

```
┌──────────────────────────────────────────────────────────────────┐
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │           Jurisdiction Data Deleted                  │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
│  The jurisdiction data has been successfully deleted.            │
│                                                                  │
│  To further modify or delete any jurisdiction data, you can      │
│  go to Manage Jurisdiction Data                                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 5j. Find Location Jurisdiction Data (Search)

```
┌──────────────────────────────────────────────────────────────────┐
│ ◀ Back                                                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Find the Jurisdiction data to manage                            │
│                                                                  │
│  Search by court or tribunal name                                │
│                                                                  │
│  For example, Blackburn Crown Court                              │
│  [autocomplete input________________________]                    │
│                                                                  │
│  [ Continue ]                                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 5k. Manage Location Jurisdiction Data

```
┌──────────────────────────────────────────────────────────────────┐
│ ◀ Back                                                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Manage Jurisdiction Data                                        │
│                                                                  │
│  ⚠ Ensure authorisation has been granted before making          │
│    any modification to the jurisdiction data                     │
│                                                                  │
│  ┌───────────────────────┬──────────────┬─────────────────┐     │
│  │ Court or tribunal name│ Jurisdiction │ Sub-Jurisdiction│     │
│  ├───────────────────────┼──────────────┼─────────────────┤     │
│  │ Gateshead County Court│ Civil        │ County Court    │     │
│  └───────────────────────┴──────────────┴─────────────────┘     │
│                                                                  │
│  [ Update ]    [ Delete ]                                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 5l. Location Jurisdiction Update – Option 1 (Dropdowns)

```
┌──────────────────────────────────────────────────────────────────┐
│ ◀ Back                                                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Gateshead County Court and Family Court                         │
│  Update Jurisdiction Data                                        │
│                                                                  │
│  Jurisdiction            [Select ▾]                              │
│  Type of civil court     [Select ▾]                              │
│  Type of criminal court  [Select ▾]                              │
│  Type of family court    [Select ▾]                              │
│  Type of tribunal        [Select ▾]                              │
│  Region                  [Select ▾]                              │
│                                                                  │
│  [ Confirm ]    [ Cancel ]                                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 5m. Location Jurisdiction Update – Option 2 (Accordions + Checkboxes)

```
┌──────────────────────────────────────────────────────────────────┐
│ ◀ Back                                                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Gateshead County Court and Family Court                         │
│  Update Jurisdiction Data                                        │
│                                                                  │
│  ▸ Jurisdiction                                                   │
│  ▾ Type of civil court                                           │
│    ☐ County Court                                                │
│    ☐ High Court                                                  │
│  ▸ Type of criminal court                                        │
│  ▸ Type of family court                                          │
│  ▸ Type of tribunal                                              │
│  ▸ Region                                                        │
│                                                                  │
│  [ Confirm ]    [ Cancel ]                                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 5n. Location Jurisdiction Update Success

```
┌──────────────────────────────────────────────────────────────────┐
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │       Location Jurisdiction Data Updated             │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
│  The location jurisdiction data has been successfully updated.   │
│                                                                  │
│  To further modify or delete any jurisdiction data, you can      │
│  go to Manage Location Jurisdiction Data                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. Page Specifications

### Page A: System Admin Dashboard (Updated)

**File:** `libs/system-admin-pages/src/pages/system-admin-dashboard/en.ts`, `cy.ts`, `index.njk`

- Remove existing "Upload Reference Data" tile (`/upload-reference-data`)
- Remove existing "Manage Location Metadata" tile (`/location-metadata-search`)
- Add new "Reference Data" tile with `href: "/reference-data"`
- Tile description: "Upload, manage jurisdiction data and location metadata"
- Template unchanged (tiles rendered in loop via existing `admin-tile` component)

---

### Page B: Reference Data Landing (`/reference-data`)

**New file:** `libs/system-admin-pages/src/pages/reference-data/`

**Two layout variants are provided for design/user research testing:**

**Option 1 (Tiles):**
- Heading: "What do you want to do?"
- 4 admin tiles (using existing `.admin-tile` CSS component) in a 2×2 grid (`govuk-grid-column-one-half`)
- Each tile links directly to its destination URL

**Option 2 (Radio Buttons):**
- Heading: "What do you want to do?"
- `govukRadios` component with 4 items, each with a `hint.text` showing the descriptive message
- `govukButton` "Continue" submits the form to `POST /reference-data`
- `POST` handler reads the selected radio value and redirects accordingly
- If no selection is made, `POST` re-renders the page with an error summary

**Controller:** `GET` renders the page. `POST` (Option 2 only) validates selection and redirects.

**Role guard:** `requireRole([USER_ROLES.SYSTEM_ADMIN])`

---

### Page C: Upload Reference Data (`/reference-data-upload`) – Existing, Minor Update

**File:** `libs/system-admin-pages/src/pages/reference-data-upload/`

- Back link updated to point to `/reference-data`
- No other changes to existing functionality
- The quick-link buttons for Add Jurisdiction / Add Sub-Jurisdiction / Add Region are removed from this page (these functions are now accessible via "Manage Jurisdiction Data")

---

### Page D: Manage Location Metadata Search (`/location-metadata-search`) – Existing, Minor Update

- Back link updated to point to `/reference-data`
- No other changes to existing functionality

---

### Page E: Manage Jurisdiction Data Landing (`/manage-jurisdiction-data`)

**New file:** `libs/system-admin-pages/src/pages/manage-jurisdiction-data/`

- Heading: "What do you want to do?"
- 2 radio buttons
- Green "Continue" button
- Back link to `/reference-data`
- `POST` validates selection and redirects:
  - "Create" → `/jurisdiction-data-create`
  - "Modify" → `/jurisdiction-data`

---

### Page F: Jurisdiction Data List (`/jurisdiction-data`)

**New file:** `libs/system-admin-pages/src/pages/jurisdiction-data/`

**Layout:** 2-column (`govuk-grid-column-one-quarter` filter + `govuk-grid-column-three-quarters` table)

**Filter sidebar (GET form – query string parameters):**
- Heading: "Filter"
- Input: "Jurisdiction" – text input with hint "Must be an exact match"
- Input: "Sub-Jurisdiction" – text input with hint "Must be an exact match"
- Green "Apply filters" button

**Main table:**
- Columns: Name | Type | (action column)
- "Type" values: Jurisdiction / Sub-Jurisdiction / Region
- Action column: "Modify" link for each row → `/jurisdiction-data/[id]?type=[jurisdiction|sub-jurisdiction|region]`

**Data source:** Combined query across `jurisdiction`, `sub_jurisdiction`, and `region` tables, tagged with a type discriminator. Filter by exact name match on jurisdiction or sub-jurisdiction as appropriate.

**Role guard:** `requireRole([USER_ROLES.SYSTEM_ADMIN])`

---

### Page G: Modify Individual Record (`/jurisdiction-data/[id]`)

**New file:** `libs/system-admin-pages/src/pages/jurisdiction-data-modify/`

- Back link to `/jurisdiction-data`
- Summary table: Name | [value], Type | [value]
- Green "Update" button → `POST` with action "update" → redirects to `/jurisdiction-data-update/[id]`
- Red "Delete" button → `POST` with action "delete" → redirects to `/jurisdiction-data-delete-confirm`
- Session stores record `id`, `name`, `welshName`, and `type` for subsequent pages

---

### Page H: Update Jurisdiction Data Form (`/jurisdiction-data-update`)

**New file:** `libs/system-admin-pages/src/pages/jurisdiction-data-update/`

- Heading: "Update Jurisdiction Data"
- Table-style form with 3 rows:
  - Name: shows existing value + `govukInput` free text
  - Welsh Name: shows existing value + `govukInput` free text
  - Type: `govukSelect` with options Jurisdiction / Sub-Jurisdiction / Region
- Green "Confirm" button
- `POST` validates, updates the database record using the appropriate Prisma model based on type, then redirects to `/jurisdiction-data-update-success`

---

### Page I: Create Jurisdiction Data Form (`/jurisdiction-data-create`)

**New file:** `libs/system-admin-pages/src/pages/jurisdiction-data-create/`

- Heading: "Create Jurisdiction Data"
- Identical form layout to Page H but without pre-populated existing values
- `POST` validates, creates record in the appropriate table based on Type selection, then redirects to `/jurisdiction-data-create-success`

---

### Page J: Delete Confirmation – Jurisdiction Data (`/jurisdiction-data-delete-confirm`)

**New file:** `libs/system-admin-pages/src/pages/jurisdiction-data-delete-confirm/`

- Reads record details from session
- Summary table: Name | [value], Type | [value]
- Question: "Are you sure you want to delete this Jurisdiction data?"
- `govukRadios`: Yes / No
- Green "Continue" button
- `POST`:
  - No selection → error
  - "No" → redirect to `/jurisdiction-data/[id]`
  - "Yes" → perform dependency check, soft-delete (set `status = inactive` or equivalent), log audit entry, redirect to `/jurisdiction-data-delete-success`

---

### Page K: Delete Success – Jurisdiction Data (`/jurisdiction-data-delete-success`)

**New file:** `libs/system-admin-pages/src/pages/jurisdiction-data-delete-success/`

- `govukPanel` with `titleText: "Jurisdiction Data Deleted"`
- Paragraph: "The jurisdiction data has been successfully deleted"
- Link: "Manage Jurisdiction Data" → `/manage-jurisdiction-data`
- No back link block

---

### Page L: Update Success – Jurisdiction Data (`/jurisdiction-data-update-success`)

**New file:** `libs/system-admin-pages/src/pages/jurisdiction-data-update-success/`

- `govukPanel` with `titleText: "Jurisdiction Data Updated"`
- Paragraph: "The jurisdiction data has been successfully updated"
- Link: "Manage Jurisdiction Data" → `/manage-jurisdiction-data`
- No back link block

---

### Page M: Create Success – Jurisdiction Data (`/jurisdiction-data-create-success`)

**New file:** `libs/system-admin-pages/src/pages/jurisdiction-data-create-success/`

- `govukPanel` with `titleText: "Jurisdiction Data Created"`
- Paragraph: "The jurisdiction data has been successfully created"
- Link: "Manage Jurisdiction Data" → `/manage-jurisdiction-data`
- No back link block

---

### Page N: Find Location Jurisdiction Data (`/location-jurisdiction-search`)

**New file:** `libs/system-admin-pages/src/pages/location-jurisdiction-search/`

- Heading: "Find the Jurisdiction data to manage"
- Label: "Search by court or tribunal name"
- Autocomplete input using existing `data-autocomplete="true"` pattern (same as `location-metadata-search`)
- Hint: "For example, Blackburn Crown Court"
- Green "Continue" button
- `POST` validates autocomplete selection, looks up location, stores `locationId` and `locationName` in session, redirects to `/location-jurisdiction-manage`

---

### Page O: Manage Location Jurisdiction Data (`/location-jurisdiction-manage`)

**New file:** `libs/system-admin-pages/src/pages/location-jurisdiction-manage/`

- Heading: "Manage Jurisdiction Data"
- `govukWarningText`: "Ensure authorisation has been granted before making any modification to the jurisdiction data"
- Table with columns: Court or tribunal name | Jurisdiction | Sub-Jurisdiction
- Data populated from session (`locationId`) by querying `LocationSubJurisdiction` with jurisdiction join
- Green "Update" button → redirects to `/location-jurisdiction-update`
- Red (warning) "Delete" button → redirects to `/location-jurisdiction-delete-confirm`

---

### Page P: Location Jurisdiction Delete Confirmation (`/location-jurisdiction-delete-confirm`)

**New file:** `libs/system-admin-pages/src/pages/location-jurisdiction-delete-confirm/`

- Heading: "Are you sure you want to delete this data?"
- `govukRadios`: Yes / No
- Green "Confirm" button
- `POST`:
  - No selection → error
  - "No" → redirect to `/location-jurisdiction-manage`
  - "Yes" → perform dependency check, delete `LocationSubJurisdiction` records for location, log audit entry, redirect to `/location-jurisdiction-delete-success`

---

### Page Q: Location Jurisdiction Delete Success (`/location-jurisdiction-delete-success`)

**New file:** `libs/system-admin-pages/src/pages/location-jurisdiction-delete-success/`

- `govukPanel` with `titleText: "Jurisdiction Data Deleted"`
- Paragraph: "The jurisdiction data has been successfully deleted"
- Link to "Manage Location Jurisdiction Data" → `/location-jurisdiction-search`

---

### Page R: Location Jurisdiction Update (`/location-jurisdiction-update`)

**New file:** `libs/system-admin-pages/src/pages/location-jurisdiction-update/`

**Two layout variants provided for testing:**

**Option 1 (Dropdowns):**
- Page title: [court/tribunal name] from session
- Sub-heading: "Update Jurisdiction Data"
- 6 `govukSelect` fields: Jurisdiction | Type of civil court | Type of criminal court | Type of family court | Type of tribunal | Region
- Each pre-populated with currently associated values
- Green "Confirm" button + Red (secondary/warning) "Cancel" button

**Option 2 (Accordions + Checkboxes):**
- Same title and sub-heading
- 6 `govukAccordion` sections, each containing `govukCheckboxes` items populated from reference data
- Pre-selected checkboxes reflect current associations
- Green "Confirm" button + Red (secondary/warning) "Cancel" button

**`POST` (both variants):**
- Validate at least one selection per required field
- Update `LocationSubJurisdiction` records for the location within a Prisma transaction
- Log audit entry
- Redirect to `/location-jurisdiction-update-success`

**Cancel:**
- Redirect to `/location-jurisdiction-manage` (no data written)

---

### Page S: Location Jurisdiction Update Success (`/location-jurisdiction-update-success`)

**New file:** `libs/system-admin-pages/src/pages/location-jurisdiction-update-success/`

- `govukPanel` with `titleText: "Location Jurisdiction Data Updated"`
- Paragraph: "The location jurisdiction data has been successfully updated"
- Link: "Manage Location Jurisdiction Data" → `/location-jurisdiction-search`
- No back link block

---

## 7. Content

### Dashboard Tile

| Field | English | Welsh |
|-------|---------|-------|
| Tile title | Reference Data | [WELSH TRANSLATION REQUIRED: "Reference Data"] |
| Tile description | Upload, manage jurisdiction data and location metadata | [WELSH TRANSLATION REQUIRED: "Upload, manage jurisdiction data and location metadata"] |

### Reference Data Landing Page (`/reference-data`)

| Field | English | Welsh |
|-------|---------|-------|
| Page title | What do you want to do? | Beth yr ydych eisiau ei wneud? |
| Option 1 label | Upload Reference Data | Uwchlwytho Data Cyfeirnod |
| Option 1 description | Upload CSV location reference data | [WELSH TRANSLATION REQUIRED: "Upload CSV location reference data"] |
| Option 2 label | Manage Jurisdiction Data | [WELSH TRANSLATION REQUIRED: "Manage Jurisdiction Data"] |
| Option 2 description | View, update and remove jurisdiction metadata | [WELSH TRANSLATION REQUIRED: "View, update and remove jurisdiction metadata"] |
| Option 3 label | Manage Location Jurisdiction Data | [WELSH TRANSLATION REQUIRED: "Manage Location Jurisdiction Data"] |
| Option 3 description | View and update location jurisdiction data | [WELSH TRANSLATION REQUIRED: "View and update location jurisdiction data"] |
| Option 4 label | Manage Location Metadata | [WELSH TRANSLATION REQUIRED: "Manage Location Metadata"] |
| Option 4 description | View, update and remove location metadata | [WELSH TRANSLATION REQUIRED: "View, update and remove location metadata"] |
| Continue button | Continue | Parhau |
| Error summary title | There is a problem | Mae problem |
| No option error | Please select one option | [WELSH TRANSLATION REQUIRED: "Please select one option"] |

### Manage Jurisdiction Data Landing (`/manage-jurisdiction-data`)

| Field | English | Welsh |
|-------|---------|-------|
| Page heading | What do you want to do? | Beth yr ydych eisiau ei wneud? |
| Radio 1 | Create a new jurisdiction or sub-jurisdiction | [WELSH TRANSLATION REQUIRED: "Create a new jurisdiction or sub-jurisdiction"] |
| Radio 2 | Modify an existing jurisdiction or sub-jurisdiction | [WELSH TRANSLATION REQUIRED: "Modify an existing jurisdiction or sub-jurisdiction"] |
| Continue button | Continue | Parhau |
| No option error | Please select one option | [WELSH TRANSLATION REQUIRED: "Please select one option"] |

### Jurisdiction Data List (`/jurisdiction-data`)

| Field | English | Welsh |
|-------|---------|-------|
| Page heading | Modify an existing jurisdiction or sub-jurisdiction | [WELSH TRANSLATION REQUIRED: "Modify an existing jurisdiction or sub-jurisdiction"] |
| Filter heading | Filter | Ffiltro |
| Jurisdiction filter label | Jurisdiction | Awdurdodaeth |
| Jurisdiction filter hint | Must be an exact match | [WELSH TRANSLATION REQUIRED: "Must be an exact match"] |
| Sub-jurisdiction filter label | Sub-Jurisdiction | [WELSH TRANSLATION REQUIRED: "Sub-Jurisdiction"] |
| Sub-jurisdiction filter hint | Must be an exact match | [WELSH TRANSLATION REQUIRED: "Must be an exact match"] |
| Apply filters button | Apply filters | Cadarnhau hidlwyr |
| Table column: Name | Name | Enw'r |
| Table column: Type | Type | [WELSH TRANSLATION REQUIRED: "Type"] |
| Modify link | Modify | [WELSH TRANSLATION REQUIRED: "Modify"] |
| Type value: Jurisdiction | Jurisdiction | Awdurdodaeth |
| Type value: Sub-Jurisdiction | Sub-Jurisdiction | [WELSH TRANSLATION REQUIRED: "Sub-Jurisdiction"] |
| Type value: Region | Region | Rhanbarth |

### Modify Record / Create / Update Forms

| Field | English | Welsh |
|-------|---------|-------|
| Modify page heading | Modify | [WELSH TRANSLATION REQUIRED: "Modify"] |
| Name row label | Name | Enw'r |
| Welsh name row label | Welsh Name | [WELSH TRANSLATION REQUIRED: "Welsh Name"] |
| Type row label | Type | [WELSH TRANSLATION REQUIRED: "Type"] |
| Update button | Update | [WELSH TRANSLATION REQUIRED: "Update"] |
| Delete button | Delete | [WELSH TRANSLATION REQUIRED: "Delete"] |
| Create form heading | Create Jurisdiction Data | [WELSH TRANSLATION REQUIRED: "Create Jurisdiction Data"] |
| Update form heading | Update Jurisdiction Data | [WELSH TRANSLATION REQUIRED: "Update Jurisdiction Data"] |
| Confirm button | Confirm | [WELSH TRANSLATION REQUIRED: "Confirm"] |
| Type dropdown: Jurisdiction | Jurisdiction | Awdurdodaeth |
| Type dropdown: Sub-Jurisdiction | Sub-Jurisdiction | [WELSH TRANSLATION REQUIRED: "Sub-Jurisdiction"] |
| Type dropdown: Region | Region | Rhanbarth |

### Delete Confirmation – Jurisdiction Data

| Field | English | Welsh |
|-------|---------|-------|
| Delete confirm question | Are you sure you want to delete this Jurisdiction data? | [WELSH TRANSLATION REQUIRED: "Are you sure you want to delete this Jurisdiction data?"] |
| Yes radio | Yes | Ydw |
| No radio | No | Nac ydw |
| Continue button | Continue | Parhau |

### Success Pages – Jurisdiction Data

| Field | English | Welsh |
|-------|---------|-------|
| Delete success panel title | Jurisdiction Data Deleted | [WELSH TRANSLATION REQUIRED: "Jurisdiction Data Deleted"] |
| Delete success message | The jurisdiction data has been successfully deleted | [WELSH TRANSLATION REQUIRED: "The jurisdiction data has been successfully deleted"] |
| Update success panel title | Jurisdiction Data Updated | [WELSH TRANSLATION REQUIRED: "Jurisdiction Data Updated"] |
| Update success message | The jurisdiction data has been successfully updated | [WELSH TRANSLATION REQUIRED: "The jurisdiction data has been successfully updated"] |
| Create success panel title | Jurisdiction Data Created | [WELSH TRANSLATION REQUIRED: "Jurisdiction Data Created"] |
| Create success message | The jurisdiction data has been successfully created | [WELSH TRANSLATION REQUIRED: "The jurisdiction data has been successfully created"] |
| Manage jurisdiction link text | Manage Jurisdiction Data | [WELSH TRANSLATION REQUIRED: "Manage Jurisdiction Data"] |
| Post-success body | To further modify or delete any jurisdiction data, you can go to | [WELSH TRANSLATION REQUIRED: "To further modify or delete any jurisdiction data, you can go to"] |

### Location Jurisdiction Search (`/location-jurisdiction-search`)

| Field | English | Welsh |
|-------|---------|-------|
| Page heading | Find the Jurisdiction data to manage | [WELSH TRANSLATION REQUIRED: "Find the Jurisdiction data to manage"] |
| Search label | Search by court or tribunal name | Chwilio yn 'l enw'r llys neu dribiwnlys |
| Search hint | For example, Blackburn Crown Court | [WELSH TRANSLATION REQUIRED: "For example, Blackburn Crown Court"] |
| Continue button | Continue | Parhau |
| Error: no location | Please enter a court or tribunal name | [WELSH TRANSLATION REQUIRED: "Please enter a court or tribunal name"] |
| Error: not found | Court or tribunal not found | [WELSH TRANSLATION REQUIRED: "Court or tribunal not found"] |

### Manage Location Jurisdiction (`/location-jurisdiction-manage`)

| Field | English | Welsh |
|-------|---------|-------|
| Page heading | Manage Jurisdiction Data | [WELSH TRANSLATION REQUIRED: "Manage Jurisdiction Data"] |
| Warning text | Ensure authorisation has been granted before making any modification to the jurisdiction data | [WELSH TRANSLATION REQUIRED: "Ensure authorisation has been granted before making any modification to the jurisdiction data"] |
| Column: court name | Court or tribunal name | Enw'r llys neu'r tribiwnlys |
| Column: jurisdiction | Jurisdiction | Awdurdodaeth |
| Column: sub-jurisdiction | Sub-Jurisdiction | [WELSH TRANSLATION REQUIRED: "Sub-Jurisdiction"] |
| Update button | Update | [WELSH TRANSLATION REQUIRED: "Update"] |
| Delete button | Delete | [WELSH TRANSLATION REQUIRED: "Delete"] |

### Location Jurisdiction Delete Confirmation

| Field | English | Welsh |
|-------|---------|-------|
| Page heading | Are you sure you want to delete this data? | [WELSH TRANSLATION REQUIRED: "Are you sure you want to delete this data?"] |
| Yes radio | Yes | Ydw |
| No radio | No | Nac ydw |
| Confirm button | Confirm | [WELSH TRANSLATION REQUIRED: "Confirm"] |

### Location Jurisdiction Update Form

| Field | English | Welsh |
|-------|---------|-------|
| Sub-heading | Update Jurisdiction Data | [WELSH TRANSLATION REQUIRED: "Update Jurisdiction Data"] |
| Jurisdiction label | Jurisdiction | Awdurdodaeth |
| Civil court label | Type of civil court | Math o Llys Sifil |
| Criminal court label | Type of criminal court | [WELSH TRANSLATION REQUIRED: "Type of criminal court"] |
| Family court label | Type of family court | [WELSH TRANSLATION REQUIRED: "Type of family court"] |
| Tribunal label | Type of tribunal | [WELSH TRANSLATION REQUIRED: "Type of tribunal"] |
| Region label | Region | Rhanbarth |
| Confirm button | Confirm | [WELSH TRANSLATION REQUIRED: "Confirm"] |
| Cancel button | Cancel | Canslo |

### Location Jurisdiction Success Pages

| Field | English | Welsh |
|-------|---------|-------|
| Update success panel title | Location Jurisdiction Data Updated | [WELSH TRANSLATION REQUIRED: "Location Jurisdiction Data Updated"] |
| Update success message | The location jurisdiction data has been successfully updated | [WELSH TRANSLATION REQUIRED: "The location jurisdiction data has been successfully updated"] |
| Delete success panel title | Jurisdiction Data Deleted | [WELSH TRANSLATION REQUIRED: "Jurisdiction Data Deleted"] |
| Delete success message | The jurisdiction data has been successfully deleted | [WELSH TRANSLATION REQUIRED: "The jurisdiction data has been successfully deleted"] |
| Manage location jurisdiction link | Manage Location Jurisdiction Data | [WELSH TRANSLATION REQUIRED: "Manage Location Jurisdiction Data"] |

---

## 8. URL

| Page | Method | URL |
|------|--------|-----|
| Reference Data Landing (Option 1 or 2) | GET | `/reference-data` |
| Reference Data Landing (radio POST) | POST | `/reference-data` |
| Upload Reference Data (existing) | GET/POST | `/reference-data-upload` |
| Location Metadata Search (existing) | GET/POST | `/location-metadata-search` |
| Manage Jurisdiction Data Landing | GET/POST | `/manage-jurisdiction-data` |
| Jurisdiction Data List | GET | `/jurisdiction-data` |
| Modify Individual Record | GET | `/jurisdiction-data/modify` |
| Modify Individual Record – action | POST | `/jurisdiction-data/modify` |
| Update Jurisdiction Data Form | GET/POST | `/jurisdiction-data-update` |
| Create Jurisdiction Data Form | GET/POST | `/jurisdiction-data-create` |
| Delete Jurisdiction Data Confirm | GET/POST | `/jurisdiction-data-delete-confirm` |
| Jurisdiction Data Delete Success | GET | `/jurisdiction-data-delete-success` |
| Jurisdiction Data Update Success | GET | `/jurisdiction-data-update-success` |
| Jurisdiction Data Create Success | GET | `/jurisdiction-data-create-success` |
| Location Jurisdiction Search | GET/POST | `/location-jurisdiction-search` |
| Location Jurisdiction Manage | GET | `/location-jurisdiction-manage` |
| Location Jurisdiction Delete Confirm | GET/POST | `/location-jurisdiction-delete-confirm` |
| Location Jurisdiction Delete Success | GET | `/location-jurisdiction-delete-success` |
| Location Jurisdiction Update | GET/POST | `/location-jurisdiction-update` |
| Location Jurisdiction Update Success | GET | `/location-jurisdiction-update-success` |

All routes are under the `libs/system-admin-pages` module and access-controlled with `requireRole([USER_ROLES.SYSTEM_ADMIN])`.

---

## 9. Validation

### Reference Data Landing (Option 2 – radio)
- A radio button must be selected before clicking Continue

### Manage Jurisdiction Data Landing
- A radio button must be selected before clicking Continue

### Create / Update Jurisdiction Data Form
- **Name**: Required, max 255 characters, must not contain HTML tags, must be unique within its type
- **Welsh Name**: Required, max 255 characters, must not contain HTML tags, must be unique within its type
- **Type**: Required, must be one of: Jurisdiction / Sub-Jurisdiction / Region
- For Update: at least one field must differ from the existing values

### Delete Confirmation Pages (both jurisdiction data and location jurisdiction)
- A radio button (Yes/No) must be selected before clicking Continue/Confirm

### Location Jurisdiction Search
- A location must be selected from the autocomplete (not just typed) – mirrors existing `location-metadata-search` validation:
  - If user typed ≥ 3 characters but did not select a suggestion: "Court or tribunal not found"
  - If field is empty: "Please enter a court or tribunal name"

### Location Jurisdiction Update
- At least one value should be provided/selected to proceed
- On Cancel: no validation required

### Dependency Checks (Server-side – Deletion Only)
- Before deleting a Jurisdiction record: check for linked `SubJurisdiction` records
- Before deleting a SubJurisdiction record: check for linked `LocationSubJurisdiction` records
- Before deleting a Region record: check for linked `LocationRegion` records
- If dependencies exist: display a blocking error message and do not proceed with deletion (or implement soft-delete – see Assumptions)

---

## 10. Error Messages

| Page | Trigger | Error text |
|------|---------|------------|
| Reference Data Landing (radios) | Continue clicked with no radio selected | "There is a problem. Please select one option" |
| Manage Jurisdiction Data Landing | Continue clicked with no radio selected | "There is a problem. Please select one option" |
| Create/Update Form – Name | Name field empty | "Enter a name" |
| Create/Update Form – Name | Name contains HTML tags | "Name must not contain HTML" |
| Create/Update Form – Name | Name already exists | "A record with this name already exists" |
| Create/Update Form – Welsh Name | Welsh Name field empty | "Enter a Welsh name" |
| Create/Update Form – Welsh Name | Welsh Name contains HTML tags | "Welsh name must not contain HTML" |
| Create/Update Form – Welsh Name | Welsh Name already exists | "A record with this Welsh name already exists" |
| Create/Update Form – Type | No type selected | "Select a type" |
| Delete confirmation (jurisdiction) | Continue clicked with no radio selected | "There is a problem. Please select one option" |
| Delete confirmation (jurisdiction) | Dependencies exist (hard delete) | "This record cannot be deleted because it is linked to other data. Remove all linked records first." |
| Location Jurisdiction Search | Empty field, Continue clicked | "Please enter a court or tribunal name" |
| Location Jurisdiction Search | Text typed but no suggestion selected | "Court or tribunal not found" |
| Location Jurisdiction Search | Location ID invalid / not found | "Court or tribunal not found" |
| Location Jurisdiction Delete Confirm | Confirm clicked with no radio selected | "There is a problem. Please select one option" |
| Upload Reference Data (existing) | No file attached, Continue clicked | "Please provide a file" |

All error messages are displayed:
1. In a `govukErrorSummary` at the top of the page (title: "There is a problem")
2. Inline next to the relevant field using `govukErrorMessage` or the `errorMessage` parameter on the GOV.UK component

---

## 11. Navigation

### Back Links

| Page | Back link destination |
|------|-----------------------|
| `/reference-data` | `/system-admin-dashboard` |
| `/reference-data-upload` | `/reference-data` |
| `/location-metadata-search` | `/reference-data` |
| `/manage-jurisdiction-data` | `/reference-data` |
| `/jurisdiction-data` | `/manage-jurisdiction-data` |
| `/jurisdiction-data/modify` | `/jurisdiction-data` |
| `/jurisdiction-data-update` | `/jurisdiction-data/modify` |
| `/jurisdiction-data-create` | `/manage-jurisdiction-data` |
| `/jurisdiction-data-delete-confirm` | `/jurisdiction-data/modify` |
| `/jurisdiction-data-delete-success` | No back link |
| `/jurisdiction-data-update-success` | No back link |
| `/jurisdiction-data-create-success` | No back link |
| `/location-jurisdiction-search` | `/reference-data` |
| `/location-jurisdiction-manage` | `/location-jurisdiction-search` |
| `/location-jurisdiction-delete-confirm` | `/location-jurisdiction-manage` |
| `/location-jurisdiction-delete-success` | No back link |
| `/location-jurisdiction-update` | `/location-jurisdiction-manage` |
| `/location-jurisdiction-update-success` | No back link |

### POST Redirects

| Page | Condition | Redirect to |
|------|-----------|-------------|
| `POST /reference-data` | Upload Reference Data selected | `/reference-data-upload` |
| `POST /reference-data` | Manage Jurisdiction Data selected | `/manage-jurisdiction-data` |
| `POST /reference-data` | Manage Location Jurisdiction Data selected | `/location-jurisdiction-search` |
| `POST /reference-data` | Manage Location Metadata selected | `/location-metadata-search` |
| `POST /reference-data` | No selection | Re-render `/reference-data` with error |
| `POST /manage-jurisdiction-data` | Create selected | `/jurisdiction-data-create` |
| `POST /manage-jurisdiction-data` | Modify selected | `/jurisdiction-data` |
| `POST /manage-jurisdiction-data` | No selection | Re-render with error |
| `POST /jurisdiction-data/modify` | Update action | `/jurisdiction-data-update` |
| `POST /jurisdiction-data/modify` | Delete action | `/jurisdiction-data-delete-confirm` |
| `POST /jurisdiction-data-update` | Valid | `/jurisdiction-data-update-success` |
| `POST /jurisdiction-data-update` | Invalid | Re-render form with errors |
| `POST /jurisdiction-data-create` | Valid | `/jurisdiction-data-create-success` |
| `POST /jurisdiction-data-create` | Invalid | Re-render form with errors |
| `POST /jurisdiction-data-delete-confirm` | Yes selected | `/jurisdiction-data-delete-success` |
| `POST /jurisdiction-data-delete-confirm` | No selected | `/jurisdiction-data/modify` |
| `POST /jurisdiction-data-delete-confirm` | No selection | Re-render with error |
| `POST /location-jurisdiction-search` | Valid location | `/location-jurisdiction-manage` |
| `POST /location-jurisdiction-search` | Invalid | Re-render with error |
| `POST /location-jurisdiction-delete-confirm` | Yes | `/location-jurisdiction-delete-success` |
| `POST /location-jurisdiction-delete-confirm` | No | `/location-jurisdiction-manage` |
| `POST /location-jurisdiction-delete-confirm` | No selection | Re-render with error |
| `POST /location-jurisdiction-update` | Confirm | `/location-jurisdiction-update-success` |
| `POST /location-jurisdiction-update` | Cancel | `/location-jurisdiction-manage` |

### In-page Links on Success Pages

| Success page | Link text | Destination |
|-------------|-----------|-------------|
| `/jurisdiction-data-delete-success` | Manage Jurisdiction Data | `/manage-jurisdiction-data` |
| `/jurisdiction-data-update-success` | Manage Jurisdiction Data | `/manage-jurisdiction-data` |
| `/jurisdiction-data-create-success` | Manage Jurisdiction Data | `/manage-jurisdiction-data` |
| `/location-jurisdiction-delete-success` | Manage Location Jurisdiction Data | `/location-jurisdiction-search` |
| `/location-jurisdiction-update-success` | Manage Location Jurisdiction Data | `/location-jurisdiction-search` |

---

## 12. Accessibility

- All pages must comply with WCAG 2.2 AA
- All interactive elements (tiles as links, radio buttons, inputs, buttons, autocomplete) must be keyboard-navigable
- Admin tiles (Option 1 on landing page) rendered as `<a>` elements with visible focus styles using existing `.admin-tile` component; focus state uses `outline: 3px solid #ffdd00`
- For Option 2 (radio landing): `govukRadios` automatically provides label association and ARIA attributes
- Warning text components use `govukWarningText` which includes the visually-hidden "Warning" text for screen readers
- Error summaries placed at the top of the page; focus is moved to the error summary on page load after a failed POST (existing pattern in codebase)
- `govukErrorSummary` is used on all pages where validation errors can occur
- All form inputs have associated `<label>` elements
- `govukAccordion` (Option 2 for location jurisdiction update) supports keyboard expand/collapse by default
- Filter form on jurisdiction list uses standard `govukInput` with proper label association
- Table `<th>` elements use `scope="col"` for column headers
- Delete buttons styled with `govuk-button--warning` class to distinguish destructive actions visually
- The autocomplete input on location search uses existing `data-autocomplete="true"` JavaScript enhancement; must degrade gracefully to plain text input without JS
- All pages include a `{% block pageTitle %}{{ pageTitle }} - {{ serviceName }} - {{ govUk }}{% endblock %}` declaration
- Success pages should not include a back link (no navigation back to a completed action)

---

## 13. Test Scenarios

Unit tests (`*.test.ts` co-located with controllers, following Arrange-Act-Assert pattern):

**Dashboard:**
- The Reference Data tile is present in `en.tiles` and `cy.tiles` with correct title, description, and href
- The "Upload Reference Data" and "Manage Location Metadata" tiles are absent

**Reference Data Landing (Option 2 – radio POST):**
- `POST` with `action = "upload-reference-data"` redirects to `/reference-data-upload`
- `POST` with `action = "manage-jurisdiction-data"` redirects to `/manage-jurisdiction-data`
- `POST` with `action = "manage-location-jurisdiction-data"` redirects to `/location-jurisdiction-search`
- `POST` with `action = "manage-location-metadata"` redirects to `/location-metadata-search`
- `POST` with no selection re-renders the page with an error

**Manage Jurisdiction Data Landing:**
- `POST` "Create" redirects to `/jurisdiction-data-create`
- `POST` "Modify" redirects to `/jurisdiction-data`
- `POST` empty selection renders error

**Jurisdiction Data List:**
- `GET` without filters returns all records (Jurisdiction, SubJurisdiction, Region) combined
- `GET` with `jurisdiction=Civil` filter returns only "Civil" jurisdiction entries (exact match)
- `GET` with `subJurisdiction=County` filter returns only "County" sub-jurisdiction entries

**Modify Record:**
- `POST` with action "update" redirects to `/jurisdiction-data-update`
- `POST` with action "delete" redirects to `/jurisdiction-data-delete-confirm`
- Session stores record id, name, welshName, and type

**Create/Update Forms:**
- `POST` with valid data creates/updates the correct table record and redirects to success
- `POST` with empty name re-renders with "Enter a name" error
- `POST` with empty Welsh name re-renders with "Enter a Welsh name" error
- `POST` with no type re-renders with "Select a type" error
- `POST` with duplicate name re-renders with duplicate error

**Delete Confirmation (Jurisdiction):**
- `POST` "Yes" performs deletion and redirects to success
- `POST` "No" redirects back to modify page
- `POST` empty selection re-renders with error
- Dependency check prevents deletion when linked records exist

**Location Jurisdiction Search:**
- `POST` with valid autocomplete selection stores location in session and redirects
- `POST` with text but no selection re-renders with "Court or tribunal not found" error
- `POST` with empty field re-renders with "Please enter a court or tribunal name" error

**Location Jurisdiction Manage:**
- `GET` displays warning text, location name, and jurisdiction/sub-jurisdiction table
- Update button redirects to `/location-jurisdiction-update`
- Delete button redirects to `/location-jurisdiction-delete-confirm`

**Location Jurisdiction Update:**
- `POST` Confirm with valid selections updates `LocationSubJurisdiction` records and redirects to success
- `POST` Cancel redirects back without writing data

**Location Jurisdiction Delete:**
- `POST` Yes deletes `LocationSubJurisdiction` records and redirects to delete success
- `POST` No redirects to manage page

**E2E test (Playwright, `@nightly`):**
- System admin can navigate from dashboard → Reference Data tile → landing page → Upload Reference Data → (existing upload journey)
- System admin can create a new jurisdiction via the Manage Jurisdiction Data pathway, including Welsh accessibility check and inline axe-core scan
- System admin can search for a court, view its jurisdiction data, update it (Option 1), and see the success panel
- System admin can delete a location's jurisdiction data after confirmation
- System admin can navigate to Manage Location Metadata via the Reference Data landing page

---

## 14. Assumptions & Open Questions

**Assumptions:**

1. The "Upload Reference Data" and "Manage Location Metadata" dashboard tiles are replaced (not kept alongside) the new "Reference Data" tile. The existing quick-link buttons for Add Jurisdiction / Add Sub-Jurisdiction / Add Region on the upload page are removed, as these functions move to the Manage Jurisdiction Data workflow.

2. The "Manage Jurisdiction Data" interface handles `Jurisdiction`, `SubJurisdiction`, and `Region` as a unified list distinguished by a "Type" column. The underlying Prisma operations will branch based on the selected type (e.g., a "Jurisdiction" type record is read/written to the `jurisdiction` table; "Sub-Jurisdiction" to `sub_jurisdiction`; "Region" to `region`). No schema changes are required for this – it is handled at the service layer.

3. The `id` used in `/jurisdiction-data/modify` URLs is the database primary key for the relevant model (`jurisdictionId`, `subJurisdictionId`, or `regionId`). The `type` is passed as a query string parameter to disambiguate.

4. "Soft delete" (marking a record `status = inactive`) is the preferred deletion mechanism where it does not conflict with database constraints. A schema migration will be needed to add a `status` or `deletedAt` field to `jurisdiction`, `sub_jurisdiction`, and `region` tables if not already present. Hard delete should only be used after confirming no orphaned records.

5. Audit logging is implemented via an existing audit log service/mechanism. The spec assumes the `@hmcts/audit` or equivalent module is available and that jurisdiction/location jurisdiction operations will call its logging function.

6. Session-based state management is used between pages in the same workflow (e.g., storing the selected record's ID between the list page and the modify page). Sessions are saved using the existing `saveSession()` pattern.

7. The "Manage Location Jurisdiction Data" update form fields ("Type of civil court", "Type of criminal court", etc.) correspond to `SubJurisdiction` records grouped by their parent `Jurisdiction` type. The exact grouping logic needs confirmation from the data team.

8. For the Reference Data landing page, Option 1 (tiles) and Option 2 (radio buttons) are both implemented as separate Nunjucks templates or as a conditional block within the same template, toggled by a configuration flag or feature flag, to allow A/B testing during user research.

**Open Questions:**

1. **Tile description for dashboard:** The issue does not specify a description for the new "Reference Data" dashboard tile. The spec uses "Upload, manage jurisdiction data and location metadata" – confirm this is correct.

2. **Remove existing tiles?** Should "Upload Reference Data" and "Manage Location Metadata" be removed from the top-level dashboard, or kept as additional tiles? The spec assumes removal (consolidation).

3. **Manage Jurisdiction Data – Type discriminator:** Should "Region" be included as a manageable type in the Manage Jurisdiction Data workflow, or is it managed separately? The issue mentions "Region" as a Type dropdown option, but the filter sidebar only shows "Jurisdiction" and "Sub-Jurisdiction" search fields.

4. **Soft-delete schema:** Do `jurisdiction`, `sub_jurisdiction`, and `region` tables already have a soft-delete mechanism (e.g., `deleted_at` or `status` column)? If not, a Prisma migration is required. The implementation choice (soft vs hard delete) needs team sign-off.

5. **Orphaned list handling:** The issue mentions "orphaned lists due to the deletion must be accounted." What constitutes an "orphaned list" in this context – publications missing a sub-jurisdiction link? Clarify the business rule and whether blocking deletion or cascading is preferred.

6. **Location jurisdiction data columns:** The update form shows "Jurisdiction, Type of civil court, Type of criminal court, Type of family court, Type of tribunal, Region." Are these distinct `SubJurisdiction` categories, or are they a mix of `SubJurisdiction` and `Region` data? Confirm the data model relationship.

7. **Landing page variant selection:** Which option (tiles vs radios) is the default deployed version? Are both deployed simultaneously behind a feature flag for testing, or is one selected before deployment?

8. **Location jurisdiction update variant selection:** Same question for Option 1 (dropdowns) vs Option 2 (accordions) on the location jurisdiction update page.

9. **Audit log scope:** Which user actions require audit log entries? At minimum: create, update, delete for all jurisdiction types and location jurisdiction associations. Confirm if viewing (GET requests) also needs to be logged.

10. **Welsh Name validation for Region:** The current `Region` schema has `welshName` as `@unique`. Does the same uniqueness constraint apply in the create/update form validation?


### Comment by OgechiOkelu on 2026-02-24T18:06:24Z

@plan


