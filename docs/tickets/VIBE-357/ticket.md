# VIBE-357: Rolls Building and RCJ Landing Page Caution and No List Message

**Status:** In Progress
**Labels:** Backend, Frontend, Database

---

## Problem Statement

This ticket covers the implementation of the Rolls Building and RCJ landing page caution and no list message which would require some backend database changes (location metadata) and frontend screen updates.

**AS A** Service
**I WANT** to display a caution and 'no list' message on the Summary of Publications page
**SO THAT** users are aware of these important information

---

## Technical Acceptance Criteria

### Admin Dashboard & UI Flow

1. **Admin Dashboard Tile**
   - Add a new tile on System Admin Dashboard to manage location metadata
   - Title: 'Manage Location Metadata'
   - Description: 'View, update and remove location metadata'

2. **Location Search Page** (`/location-metadata-search`)
   - Clicking the 'Manage Location Metadata' tile redirects to 'Find the location metadata to manage' page
   - Contains a search-autocomplete search box to search for locations
   - Refer to the `/search` page to see how it is implemented
   - Continue button redirects to management page after selecting a location

3. **Location Metadata Management Page** (`/location-metadata-manage`)
   - Title: 'Manage location metadata for {location name}'
   - Contains 4 text areas:
     - English caution message
     - Welsh caution message
     - English no list message
     - Welsh no list message
   - **Buttons (conditional):**
     - If no existing metadata: Single 'Create' button
     - If existing metadata: 'Update' and 'Delete' buttons

4. **Success Page**
   - Shown after Create/Update operations
   - Panel with text: 'Location metadata created' or 'Location metadata updated'
   - Bold text: 'What do you want to do next?'
   - Link: 'Search for location metadata by court or tribunal name' (returns to `/location-metadata-search`)

5. **Delete Confirmation Page** (`/location-metadata-delete-confirmation`)
   - Title: 'Are you sure you want to delete location metadata for {location name}'
   - Yes/No radio buttons
   - 'Yes' redirects to success page with panel 'Location metadata deleted'
   - Success page includes same navigation as Create/Update success page

### Database Schema

**Create `location_metadata` table:**

| Field | Type | Description |
|-------|------|-------------|
| `location_metadata_id` | UUID | Primary key |
| `location_id` | Foreign Key | Links to location table |
| `caution_message` | String | English caution message |
| `welsh_caution_message` | String | Welsh caution message |
| `no_list_message` | String | English no list message |
| `welsh_no_list_message` | String | Welsh no list message |

---

## Acceptance Criteria

### Display Rules

1. **Caution Message Display**
   - Displayed under the FaCT link and above the hearing lists
   - Applies to RCJ and Rolls Building summary of publications pages
   - Message: "These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives. If you do not see a list published for the court you are looking for, it means there are no hearings scheduled."

2. **No List Message Display**
   - Displayed when no publication is available/displayed

3. **Data Management**
   - Upload and maintenance done through System Admin portal
   - Location metadata table stores data in backend/database
   - Frontend reads from table via data-management (no hardcoding)
   - Messages passed into Nunjucks files to display correct message per location

4. **Validation Rules**
   - At least one message must be entered to create or update metadata

5. **Display Logic**
   - **When hearing lists ARE published:** Display caution message only
   - **When NO hearing lists are published:** Display both caution and no list messages

---

## Welsh Translations

### Caution Message

**English:**
"These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives. If you do not see a list published for the court you are looking for, it means there are no hearings scheduled."

**Welsh:**
"Mae'r rhestrau hyn yn destun newid tan 4:30pm. Os bydd unrhyw newidiadau ar ôl yr amser hwn, byddwn yn ffonio neu'n anfon e-bost yn uniongyrchol at y partïon neu eu cynrychiolwyr cyfreithiol. Os nad ydych yn gweld rhestr wedi'i chyhoeddi ar gyfer y llys rydych yn chwilio amdano, mae'n golygu nad oes gwrandawiadau wedi'u trefnu."

---

## Implementation Notes

- Backend database changes required (new `location_metadata` table)
- Frontend screen updates for RCJ and Rolls Building
- Admin portal CRUD functionality for location metadata management
- Integration with data-management service for dynamic message retrieval
