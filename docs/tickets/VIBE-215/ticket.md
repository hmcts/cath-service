# VIBE-215: Display of Pubs - View flat file

## Ticket Information

- **Key**: VIBE-215
- **Status**: In Progress
- **Assignee**: Alex Bottenberg
- **Created**: 2025-10-30
- **Updated**: 2025-11-18

## Problem Statement

This ticket covers the display screens required in CaTH to allow users to view uploaded publication flat files as hearing lists in the CaTH front end. This functionality enables users to open and read detailed case information contained in a published hearing list.

## User Story

**As a** User
**I want to** view a hearing list published as a flat file in CaTH
**So that** I can view the cases published in the hearing list

## Pre-conditions

1. A hearing list publication file has been uploaded by a Local Admin in CaTH.
2. The viewing date is within the set display period, meaning the file remains available for display.
3. The user has completed Screens 1–4 of the CaTH user journey:
   - Screen 1 – "What do you want to do?"
   - Screen 2 – "What court or tribunal are you interested in?"
   - Screen 3 – "A–Z List of Courts and Tribunals" (if applicable).
   - Screen 4 – "What do you want to view from [Court/Tribunal Name]?"
4. The user has clicked the link to a published hearing list from Screen 4.
5. The system retrieves the flat file from CaTH's publication storage repository.

## Technical Criteria

- Get the artefact ID from artefact table which will be the file name followed by extension.
- Click on link if file is PDF, open in new tab otherwise save file on your disk.

## Acceptance Criteria

1. User begins journey by clicking the 'continue' button on the landing page in CaTH and completing screen 1, 2, 3 and 4.
2. On screen 4, user clicks on the link to the published hearing list of interest
3. The list opens in another tab and user is able to view the cases displayed on the flat file
4. When the user clicks the link to a published hearing list on Screen 4, the file opens in a new browser tab.
5. The hearing list file displays all the cases published in that list.
6. The file content is presented in the same layout and format as uploaded (e.g., PDF, HTML, CSV, or plain text).
7. Users can scroll through, zoom, or download the file (depending on the file type).
8. The opened file tab includes the court or tribunal name and list title in the browser header.
9. If the publication file is unavailable, expired, or cannot be loaded, the user must see an error message.
10. Page design and navigation must comply with GOV.UK Design System and CaTH accessibility standards.

## User Journey Flow

1. User navigates through CaTH and selects a hearing list from Screen 4.
2. The system retrieves the associated publication file from CaTH's file repository.
3. The publication opens in a new tab for viewing.
4. User reviews the hearing list content.
5. User may close the tab to return to the previous page (Screen 4).

## Wireframe

### Main Tab – Screen 4
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ What do you want to view from Oxford Combined Court Centre?                 │
│ Select the list you want to view from the link(s) below:                    │
│                                                                              │
│ • Civil and Family Daily Cause List, 31 October 2025 – English (Saesneg)   │
│                                                                              │
│ [User clicks link above → File opens in new tab]                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### New Tab – Hearing List File
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Oxford Combined Court Centre – Civil and Family Daily Cause List            │
│ Published: 31 October 2025                                                   │
│                                                                              │
│ ┌───────────────────────────────────────────────────────────────────────┐  │
│ │ Case No: 24CF00012 | Smith v Jones | Hearing Room 3 | 10:00 AM       │  │
│ │ Case No: 24CF00013 | Brown v Green | Hearing Room 5 | 11:30 AM       │  │
│ │ ... (continued)                                                        │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│ [Download PDF] [Print]                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Display Requirements

| Element | Description |
|---------|-------------|
| Browser tab title | "[Court/Tribunal Name] – [List Name]" (e.g., "Oxford Combined Court Centre – Civil and Family Daily Cause List") |
| File container | Displays the uploaded publication in native format (PDF viewer, HTML render, or plain text). |
| Metadata | Show publication date and language version where available. |
| Controls | File viewer may provide "Download" or "Print" options depending on file type. |
| Scroll/zoom | Enabled by default for PDF or long-format lists. |

## Content

### EN (English):
- **Page Title (browser tab)**: "[Court Name] – [List Name]"
- **Header**: "[Court Name] Hearing List"
- **Message (if no file available)**: "The selected hearing list is not available or has expired. Please return to the previous page."

### CY (Welsh):
- **Page Title (browser tab)**: "[Enw'r Llys] – [Enw'r Rhestr]"
- **Header**: "Rhestr Wrando [Enw'r Llys]"
- **Message (if no file available)**: "Nid yw'r rhestr wrando a ddewiswyd ar gael neu mae wedi dod i ben. Ewch yn ôl i'r dudalen flaenorol."

## URL

`/hearing-lists/{court-id}/{list-id}`
*(Opens in a new browser tab)*

## Validation Rules

- The file must only be displayed if:
  - Publication status = "Active."
  - Display date range includes current date.
- File metadata (court name, title, date, and language) must match the publication details stored in CaTH.
- Links must point to the correct file location (e.g., `/files/publications/{court-id}/{filename}`).
- If the file link is broken or missing, show an error message on a simple fallback page.

## Error Messages

### EN (English):
- "The selected hearing list is not available or has expired. Please return to the previous page."
- "We could not load the hearing list file. Please try again later."

### CY (Welsh):
- "Nid yw'r rhestr wrando a ddewiswyd ar gael neu mae wedi dod i ben. Ewch yn ôl i'r dudalen flaenorol."
- "Ni allwn lwytho ffeil y rhestr wrando. Ceisiwch eto yn nes ymlaen."

## Navigation

- **Back (previous tab)**: Returns to Screen 4 – "What do you want to view from [Court/Tribunal Name]?"
- **Close tab**: Closes the current file view and returns user to CaTH.
- **Language toggle**: Switches translated versions of the file (if both English and Welsh versions are available).
- **Download/Print controls**: Available for supported file types (e.g., PDFs).

## Accessibility

- Must comply with WCAG 2.2 AA and GOV.UK Design System standards.
- Publication files must be accessible (text-based PDFs or HTML files).
- Files must be readable by screen readers (avoid scanned images without OCR).
- "Back to previous page" message should include accessible link text.
- File viewers must provide zoom functionality and keyboard shortcuts for navigation.
- Language versions (English/Welsh) must be labelled clearly.
- Tab focus must open on the file container when new tab is launched.

## Test Scenarios

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| TS1 | Open hearing list | Click a published list link on Screen 4 | File opens in a new tab |
| TS2 | File available | Verify file loads correctly | Hearing list displays with correct details |
| TS3 | File unavailable | Open expired or missing file | Error message displayed |
| TS4 | Browser tab title | Open a valid file | Tab title shows "[Court Name] – [List Name]" |
| TS5 | Language toggle | Switch to Welsh | File reloads with Welsh version if available |
| TS6 | Accessibility – Screen reader | Open list using assistive tech | File content readable and properly labelled |
| TS7 | Accessibility – Keyboard nav | Navigate via Tab and Enter | File viewer controls reachable |
| TS8 | File format test | Upload and view PDF, CSV, HTML | File renders correctly in new tab |
| TS9 | Expired publication | Attempt to access expired list | "File not available or expired" message displayed |
| TS10 | Download/Print | Open PDF file | Download or print options available and functional |

## Assumptions / Open Questions

- Confirm whether all hearing list files will open in a new tab or inline on the same page.
- Confirm if publication files can be downloaded or only viewed.
- Confirm if there will be a consistent format (PDF/HTML) across all courts.
- Confirm if language toggle dynamically switches the file or requires reloading from storage.
- Confirm retention period for published files after display expiry date.
