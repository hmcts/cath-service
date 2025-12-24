# VIBE-228: Manage media account requests - Approve application

**Status**: In Progress
**Assignee**: Iqbal, Junaid
**Created**: 2025-11-11
**Updated**: 2025-12-01

## Problem Statement

Media users are expected to create accounts in CaTH by filling and submitting the account creation form. When this happens, the CTSC Admin user is expected to verify the applicant and approve before the account is created. Where there are any concerns, the application can be rejected.

## User Story

**AS A** CTSC Admin
**I WANT** to review CaTH media account requests
**SO THAT** I can manage the account requests

## Pre-conditions

- CaTH Account creation form has been filled and submitted by a CaTH user
- CTSC Admin has been given access to media admin functionality in CaTH

## Technical Specifications

- Get media application from `media_application` database table
- Get the Press ID file (uploaded during create media application) from temp folder
- Once application review process has been rejected, delete Press ID file from temp folder and update record in `media_application` database table as APPROVED.

## Acceptance Criteria

1. **CTSC Admin Dashboard Access**
   - CTSC Admin logs into CaTH and accesses their Dashboard
   - Dashboard layout mirrors the Admin Dashboard (with existing tiles: Upload, Upload Excel file, Remove)
   - An additional tile is visible:
     - Title: "Manage media account requests"
     - Description: "CTSC assess new media account applications."

2. **Pending Requests Notification**
   - Below the header 'Your Dashboard', an 'Important' notification box is displayed
   - Text inside the box: "There are x outstanding media requests. Manage media account requests."

3. **Manage Media Account Requests Page**
   - Clicking the "Manage media account requests" tile takes the admin to a new page titled "Select application to assess"
   - A table displays all pending applications with the following columns:
     - Name
     - Employer
     - Date applied
     - (Untitled column) containing a 'View' link for each row
   - Clicking 'View' opens the Applicant's details page

4. **Applicant's Details Page**
   - Title: "Applicant's details"
   - Displays a table with the following rows:
     - Name
     - Email
     - Employer
     - Date applied
     - Proof of ID (with text "(opens in a new window)" and "View" link that opens file in new tab)
   - Under the table:
     - Green button: "Approve application"
     - Red button: "Reject application"

5. **Approve Application Flow**
   - Clicking "Approve application" takes admin to page titled: "Are you sure you want to approve this application?"
   - Beneath the title: subheading "Applicant's details", followed by same details table
   - Two radio buttons displayed:
     - "Yes"
     - "No"
   - Green 'Continue' button beneath the options

6. **Approval Confirmation**
   - If Yes selected → Clicking Continue navigates to confirmation page
   - Title: "Application has been approved" (displayed inside a green success banner)
   - Table displayed below banner with the applicant's key details:
     - Name
     - Email
     - Employer
     - Date applied
   - Below the table:
     - Section titled "What happens next" with message:
       > "This account has been created and the applicant will be notified to confirm their details.
       > If an account already exists, the applicant will be asked to sign in, or choose forgot password."

7. **Reject Application Flow**
   - Clicking Reject application (future iteration placeholder) will take CTSC Admin to a rejection workflow (not covered in this user story)

8. **Navigation**
   - Every page includes a Back link at the top left corner
   - All CaTH accessibility and page specifications are maintained

## URL Structure

| Page | URL |
|------|-----|
| Dashboard | `/admin/dashboard` |
| Manage media account requests | `/admin/media-requests` |
| Applicant details | `/admin/media-requests/{id}` |
| Approve confirmation | `/admin/media-requests/{id}/approve` |
| Approved confirmation | `/admin/media-requests/{id}/approved` |

## Validation Rules

- CTSC Admin must have a valid authenticated session
- Only pending applications are visible in the "Select application to assess" table
- Clicking Approve updates the application status to Approved in blob storage
- Clicking Reject (future feature) will update the application status to Rejected
- "Yes" or "No" radio button selection is mandatory before proceeding from confirmation screen
- All proof of ID file links must open in a new tab/window

## Error Messages

**EN:**
- "Select yes or no before continuing."
- "Unable to load applicant details. Please try again later."

**CY:**
- "Dewiswch ie neu na cyn parhau."
- "Methu llwytho manylion yr ymgeisydd. Ceisiwch eto'n hwyrach."

## Accessibility

- Must comply with WCAG 2.2 AA and GOV.UK Design System standards
- Tables must include `<th scope="col">` headers for all columns
- Proof of ID link must include `aria-label="Opens in new window"`
- Success banners use `role="status"`
- Radio buttons must have clear labels and logical tab order
- All links and buttons must be keyboard accessible with visible focus outlines

## Welsh Translation Requirements

All pages must have both English and Welsh content:

### Page 1 - CTSC Admin Dashboard
**EN:**
- Header: "Your Dashboard"
- Tile: "Manage media account requests"
- Description: "CTSC assess new media account applications."
- Important box: "There are x outstanding media requests. Manage media account requests."

**CY:**
- Header: "Eich Dangosfwrdd"
- Tile: "Rheoli ceisiadau cyfrif cyfryngau"
- Description: "Mae CTSC yn asesu ceisiadau newydd ar gyfer cyfrifon cyfryngau."
- Important box: "Mae x cais cyfryngau heb eu hasesu. Rheoli ceisiadau cyfrif cyfryngau."

### Page 2 - Select Application to Assess
**EN:**
- Title: "Select application to assess"
- Table headers: "Name", "Employer", "Date applied", "View"

**CY:**
- Title: "Dewiswch gais i'w asesu"
- Table headers: "Enw", "Cyflogwr", "Dyddiad gwneud cais", "Gweld"

### Page 3 - Applicant's Details
**EN:**
- Title: "Applicant's details"
- Button 1: "Approve application"
- Button 2: "Reject application"
- Proof of ID text: "(opens in a new window)"

**CY:**
- Title: "Manylion yr ymgeisydd"
- Button 1: "Cymeradwyo cais"
- Button 2: "Gwrthod cais"
- Proof of ID text: "(yn agor mewn ffenestr newydd)"

### Page 4 - Approve Application Confirmation
**EN:**
- Title: "Are you sure you want to approve this application?"
- Subheader: "Applicant's details"
- Options: "Yes" / "No"
- Button: "Continue"

**CY:**
- Title: "A ydych yn siŵr eich bod am gymeradwyo'r cais hwn?"
- Subheader: "Manylion yr ymgeisydd"
- Options: "Ie" / "Na"
- Button: "Parhau"

### Page 5 - Application Approved
**EN:**
- Banner: "Application has been approved"
- Message: "This account has been created and the applicant will be notified to confirm their details. If an account already exists, the applicant will be asked to sign in, or choose forgot password."

**CY:**
- Banner: "Mae'r cais wedi'i gymeradwyo"
- Message: "Mae'r cyfrif wedi'i greu ac fe fydd yr ymgeisydd yn cael gwybod i gadarnhau ei fanylion. Os oes cyfrif eisoes yn bodoli, fe ofynnir i'r ymgeisydd fewngofnodi, neu ddewis 'wedi anghofio cyfrinair'."

## Assumptions / Open Questions

- Confirm if email notification to applicant is triggered immediately after approval
- Confirm whether CTSC Admin can filter or search pending requests by name or employer
- Confirm if rejected applications are archived or deleted
- Confirm if an audit log entry must be created when an Admin approves or rejects
- Confirm if rejected applicants receive an automated notification
