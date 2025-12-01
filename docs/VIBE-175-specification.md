# VIBE-175: Verified User - Account Creation

## Ticket Metadata
- **Key**: VIBE-175
- **Summary**: Verified user- Account creation
- **Status**: Ready for Progress
- **Priority**: 2-High
- **Issue Type**: Story
- **Reporter**: Okelu, Ogechi
- **Created**: 2025-10-08
- **Updated**: 2025-12-01
- **Labels**: CaTH

## Problem Statement
Users who meet the set criteria are able to apply to create a verified account in CaTH. This ticket covers the requirements for creating an account in CaTH.

## User Story
**AS A** CaTH User
**I WANT** to create a verified account
**SO THAT** I can access restricted information in CaTH

## Technical Acceptance Criteria
- The new page for create-media-account should sit in '/libs/public-pages/src/pages/create-media-account'. Keep the controller, nunjucks and language resources in the same place and follow the naming standard similar to other pages within public-pages
- The URL for the create media account page should be /create-media-account
- The URL for the media account submitted page should be /account-request-submitted
- When submitting media application, the image file should be stored in the temp directory in /storage/temp/files
- The metadata for the media application should be stored in the media_application postgres table
- The name of the image file stored in the temp directory should be the value of the id field in the media_application table plus the file extension
- The media_application table should have the following fields:
  - id - Unique UUID generated for a new record
  - fullName - Full name from the form data
  - email - Email from the form data
  - status - Set as PENDING when the record first created
  - requestDate - Set to the date the record first created
  - statusDate - Set to the date the status field is updated
- If there is an error when submitting application, the field values should remain on screen and the error highlighted in red
- The error title on the error summary should be 'There is a problem'
- When refreshing the page, the field values should be cleared

## Functional Acceptance Criteria
- When the user clicks the account creation link on the CaTH sign in page, the user is taken to the account creation form titled 'Create a Court and tribunal hearings account'
- The opening wording on the form states the following:

  > A Court and tribunal hearings account is for professional users who require the ability to view HMCTS information such as hearing lists, but do not have the ability to create an account using MyHMCTS or Common Platform e.g. members of the media.
  >
  > An account holder, once signed in, will be able choose what information they wish to receive via email and also view online information not available to the public, along with publicly available information.
  >
  > We will retain the personal information you enter here to manage your user account and our service.

- The form provides 3 text bars respectively for the user to input their full name, email address and employer
- The following descriptive text is displayed in the email address field 'We'll only use this to contact you about your account and this service.'
- A tab titled 'choose file' that allows the user upload their proof of identification is provided with the descriptive text 'Upload a clear photo of your UK Press Card or work ID. We will only use this to confirm your identity for this service, and will delete upon approval or rejection of your request. By uploading your document, you confirm that you consent to this processing of your data. Must be a jpg, pdf or png and less than 2mb in size'
- The terms and conditions section is provided afterwards with the following descriptive text 'A Court and tribunal hearing account is granted based on you having legitimate reasons to access information not open to the public e.g. you are a member of a media organisation and require extra information to report on hearings. If your circumstances change and you no longer have legitimate reasons to hold a Court and tribunal hearings account e.g. you leave your employer entered above. It is your responsibility to inform HMCTS of this for your account to be deactivated.'
- This is followed by a check box where the user can tick to agree to the terms and conditions. The following text is provided beside the check box 'Please tick this box to agree to the above terms and conditions'
- The continue button allows the user to continue the process
- The user can return to the top by clicking the 'back to top' arrow at the bottom of the page
- When the user completes and submits the account creation form, the user sees a confirmation page titled 'Details submitted' in a green banner
- The following message is displayed beneath the banner under the title 'What happens next':

  > HMCTS will review your details.
  >
  > We'll email you if we need more information or to confirm that your account has been created.
  >
  > If you do not get an email from us within 5 working days, call our courts and tribunals service centre on 0300 303 0656.

- All CaTH pages specifications are maintained
- A media application table is created in the database to store the account details for each account application created

## Form Fields & Validation

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| fullName | Text | Yes | 1–100 chars; alphabetic + spaces + common punctuation |
| email | Email | Yes | RFC-compliant format |
| employer | Text | Yes | 1–120 chars |
| idProof | File upload | Yes | Single file; .jpg/.jpeg, .pdf, .png; ≤ 2MB |
| termsAccepted | Checkbox | Yes | Must be checked |

## Welsh Translations

| English | Welsh |
|---------|-------|
| Create a Court and tribunal hearings account | Creu cyfrif gwrandawiadau Llys a Thribiwnlys |
| We will retain the personal information you enter here to manage your user account and our service. | Byddwn yn cadw'r wybodaeth bersonol a roir gennych yma i reoli eich cyfrif defnyddiwr a'n gwasanaethau |
| We'll only use this to contact you about your account and this service | Dim ond i drafod eich cyfrif a'r gwasanaeth hwn y byddwn yn defnyddio hwn i gysylltu â chi |
| choose file | Dewis ffeil |
| Must be a jpg, pdf or png and less than 2mb in size | Rhaid iddi fod yn ffeil jpg, pdf, png, neu tiff. |
| Please tick this box to agree to the above terms and conditions | Ticiwch y blwch hwn, os gwelwch yn dda i gytuno i'r telerau ac amodau uchod |
| Details submitted | Cyflwyno manylion |
| What happens next | Beth sy'n digwydd nesaf |
| HMCTS will review your details. | Bydd GLlTEM yn adolygu eich manylion. |
| We'll email you if we need more information or to confirm that your account has been created. | Byddwn yn anfon e-bost atoch os bydd angen mwy o wybodaeth arnom neu i gadarnhau bod eich cyfrif wedi ei greu. |
| If you do not get an email from us within 5 working days, call our courts and tribunals service centre on 0300 303 0656. | Os na fyddwch yn cael e-bost gennym o fewn 5 diwrnod gwaith, ffoniwch ein canolfan gwasanaeth llysoedd a thribiwnlysoedd ar 0300 303 0656 |

## Linked Issues & Comments

### Comments
1. **Iqbal, Junaid** (2025-11-27): PR: https://github.com/hmcts/cath-service/pull/137
2. **Chance, Melanie** (2025-12-01): Testing has failed. Invalid name and email tests do not produce the correct error. See test results:

| Scenario | Steps | Expected Result | Pass/Fail |
|----------|-------|-----------------|-----------|
| Navigate to form | GET `/create-media-account` | Form renders with correct title and opening text | Pass |
| Submit empty | POST with no fields | Error summary "There is a problem"; inline errors shown; values retained | Pass |
| Wrong type | Upload `.tiff` | Error: only jpg/pdf/png accepted | Pass |
| Invalid email | Enter bad email → submit | Email error; other values retained | Fail |
| Invalid name | Enter one character in the name | Error | Fail |

**Testing Issue**: The validation for invalid email and single-character names is not producing the correct error messages.

## Attachments
- image-2025-12-01-15-45-06-811.png (Testing failure screenshot - staging)
- image-2025-12-01-15-45-11-317.png (Testing failure screenshot - current error)
- Verified user sign in.docx (Design document)

All attachments downloaded to: `docs/VIBE-175-attachments/`

## Key Technical Notes
- **IMPORTANT**: Testing has revealed validation issues with email and name fields that need to be addressed
- The PR #137 exists but has failed testing
- This ticket is currently in "Ready for Progress" status, suggesting the implementation needs rework
