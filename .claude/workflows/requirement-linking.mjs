export const meta = {
  name: 'requirement-linking',
  description: 'Infer semantic traceability links between requirements via cluster, propose, adversarially verify',
  phases: [
    { title: 'Cluster', detail: 'group 134 requirements into feature areas' },
    { title: 'Propose', detail: 'find candidate links per cluster' },
    { title: 'Verify', detail: 'adversarially confirm each candidate link' },
  ],
}

// Data embedded directly (workflow scripts cannot read files; args channel unreliable for large payloads).
const REQS = [{"id":1,"ref":"REQ-0001","g":"epic","t":"Public User Journey","s":"This ticket covers all the actions required to be undertaken by public users while navigating through CaTH and accessing general information and public hearing lists."},
{"id":2,"ref":"REQ-0002","g":"epic","t":"CaTH Publication - Manual Publishing","s":"This epic covers all the steps in the user journey, business and technical requirements involved in the manual process of publishing hearing lists in CaTH."},
{"id":3,"ref":"REQ-0003","g":"epic","t":"Project Prep Tasks","s":"#### This epic is raised to capture preparatory tasks needed for the CaTH AI project."},
{"id":4,"ref":"REQ-0004","g":"story","t":"TEST TICKET","s":"#### User story **As a** *<type of user>,* **I want to** *<some goal>,* **so that** *<some reason>.* #### Acceptance criteria # **Given that** *<some precondition>,* **when** *<some action is carried "},
{"id":5,"ref":"REQ-0005","g":"story","t":"‘How do you want to sign in’ Page","s":"**PROBLEM STATEMENT** Verified users are required to sign into CaTH before accessing restricted information. This would require access to a 'sign in' page.   **AS A** Verified User **I WANT** to sign "},
{"id":6,"ref":"REQ-0006","g":"story","t":"CaTH ‘Sign in’ - CFT IDAM","s":"**PROBLEM STATEMENT** Verified users are required to sign into CaTH before accessing restricted information. This required the input of verified sign in details.   **AS A** Verified User **I WANT** to"},
{"id":7,"ref":"REQ-0007","g":"story","t":"CaTH Sign In - B2C","s":"**PROBLEM STATEMENT** All CaTH users, including members of the public, have access to hearing lists published in CaTH. Public users are however restricted from accessing private/classified information"},
{"id":8,"ref":"REQ-0008","g":"story","t":"User table creation in database","s":"**PROBLEM STATEMENT** The details of users who sign into CaTH needs to be stored in the database. This ticket is raised to create a user table to be used to store user details.   **AS A** Service **I "},
{"id":9,"ref":"REQ-0009","g":"story","t":"Forgotten password","s":"**PROBLEM STATEMENT** Verified users are required to sign into CaTH before accessing restricted information. Sometimes users forget the password required to access their verified account.   **AS A** V"},
{"id":10,"ref":"REQ-0010","g":"story","t":"Landing Page - Header & Footer","s":"**PROBLEM STATEMENT** All CaTH users, including members of the public, have access to hearing lists published in CaTH. This would require users to undergo a few steps to navigate through the different"},
{"id":11,"ref":"REQ-0011","g":"story","t":"Public user – Restricted access","s":"**PROBLEM STATEMENT** All CaTH users, including members of the public, have access to hearing lists published in CaTH. Public users are however restricted from accessing private/classified information"},
{"id":12,"ref":"REQ-0012","g":"story","t":"Requirements for content displayed on all pages in CaTH","s":"**PROBLEM STATEMENT** All CaTH pages are expected to have specific content displayed at the top and bottom of each page.   **AS A** System **I WANT** to display specific content on each page in CaTH *"},
{"id":13,"ref":"REQ-0013","g":"story","t":"‘What do you want to do?’ Page","s":"**PROBLEM STATEMENT** All CaTH users, including members of the public, have access to hearing lists published in CaTH. This would require users to undergo a few steps to navigate through the different"},
{"id":14,"ref":"REQ-0014","g":"story","t":"Find a single justice procedure case","s":"**PROBLEM STATEMENT** All CaTH users, including members of the public, have access to hearing lists published in CaTH including single justice procedure (SJP) cases.   **AS A** CaTH User **I WANT** to"},
{"id":15,"ref":"REQ-0015","g":"story","t":"View SJP cases that are ready for hearing","s":"**PROBLEM STATEMENT** All CaTH users, including members of the public, have access to hearing lists published in CaTH including single justice procedure (SJP) cases.   **AS A** CaTH User **I WANT** to"},
{"id":16,"ref":"REQ-0016","g":"story","t":"Select a court or tribunal","s":"**PROBLEM STATEMENT** All CaTH users, including members of the public, have access to unrestricted court and tribunal hearing lists. This would require users going through several steps to achieve thi"},
{"id":17,"ref":"REQ-0017","g":"story","t":"Find a court or tribunal","s":"**PROBLEM STATEMENT** All CaTH users, including members of the public, have access to unrestricted court and tribunal hearing lists. This would require users going through several steps to achieve thi"},
{"id":18,"ref":"REQ-0018","g":"story","t":"‘What do you want to view?’ Page","s":"**PROBLEM STATEMENT** All CaTH users, including members of the public, have access to unrestricted court and tribunal hearing lists. This would require users going through several steps to achieve thi"},
{"id":19,"ref":"REQ-0019","g":"story","t":"Manual publishing – Your Dashboard","s":"**PROBLEM STATEMENT** Local admins (court clerks) can publish hearing lists manually in CaTH by uploading a flat file. This process involves several steps.   **AS A** Local Admin **I WANT** to upload "},
{"id":20,"ref":"REQ-0020","g":"story","t":"Manual publishing – Manual upload form","s":"**PROBLEM STATEMENT** Local admins (court clerks) can publish hearing lists manually in CaTH by uploading a flat file. This process involves several steps.   **AS A** Local Admin **I WANT** to upload "},
{"id":21,"ref":"REQ-0021","g":"story","t":"Manual publishing – Confirm upload details","s":"**PROBLEM STATEMENT** Local admins (court clerks) can publish hearing lists manually in CaTH by uploading a flat file. This process involves several steps.   **AS A** Local Admin **I WANT** to check t"},
{"id":22,"ref":"REQ-0022","g":"story","t":"Manual publishing – Manual upload successful","s":"**PROBLEM STATEMENT** Local admins (court clerks) can publish hearing lists manually in CaTH by uploading a flat file. This process involves several steps.   **AS A** Local Admin **I WANT** to confirm"},
{"id":23,"ref":"REQ-0023","g":"story","t":"Excel Upload – Upload Excel File","s":"**PROBLEM STATEMENT** The non-strategic publishing route requires the upload of an excel file in CaTH which is then transformed at the back end to a Json file before publishing. The upload process is "},
{"id":24,"ref":"REQ-0024","g":"story","t":"Preparation for Sprint 2- Cadence","s":"#### User story **As a** user I Want all project governance planning sessions are setup in time for cath rewirte commencement{*}].{*} #### Acceptance criteria # **Given that** *<some precondition>,* *"},
{"id":25,"ref":"REQ-0025","g":"story","t":"Create Backlog Items for cath rewrite commencement","s":"#### User story **As a** *<type of user>,* **I want to** *<some goal>,* **so that** *<some reason>.* #### Acceptance criteria # **Given that** *<some precondition>,* **when** *<some action is carried "},
{"id":26,"ref":"REQ-0026","g":"story","t":"Prepare licences for Cath rewrite","s":"#### User story **As a** *<type of user>,* **I want to** *<some goal>,* **so that** *<some reason>.* #### Acceptance criteria # **Given that** *<some precondition>,* **when** *<some action is carried "},
{"id":27,"ref":"REQ-0027","g":"story","t":"Excel Upload – Complete excel upload process /  Care Standards Tribunal Weekly Hearing List","s":"**PROBLEM STATEMENT** The non-strategic publishing route requires the upload of an excel file in CaTH which is then transformed at the back end to a Json file before publishing. The upload process is "},
{"id":28,"ref":"REQ-0028","g":"story","t":"Excel Upload – Excel upload successful","s":"**PROBLEM STATEMENT** The non-strategic publishing route requires the upload of an excel file in CaTH which is then transformed at the back end to a Json file before publishing. The upload process is "},
{"id":29,"ref":"REQ-0029","g":"story","t":"Remove publication","s":"**PROBLEM STATEMENT** Admins who can upload files and publish hearing lists in CaTH are also given permission to remove these publications if needed. This process is carried out in several steps.   **"},
{"id":30,"ref":"REQ-0030","g":"story","t":"Find content to remove","s":"**PROBLEM STATEMENT** Local admins who can upload files and publish hearing lists in CaTH are also given permission to remove these publications if needed. This process is carried out in several steps"},
{"id":31,"ref":"REQ-0031","g":"story","t":"Select content to remove","s":"**PROBLEM STATEMENT** Local admins who can upload files and publish hearing lists in CaTH are also given permission to remove these publications if needed. This process is carried out in several steps"},
{"id":32,"ref":"REQ-0032","g":"story","t":"Are you sure you want to remove this content?","s":"**PROBLEM STATEMENT** Local admins who can upload files and publish hearing lists in CaTH are also given permission to remove these publications if needed. This process is carried out in several steps"},
{"id":33,"ref":"REQ-0033","g":"story","t":"File Removal Successful","s":"**PROBLEM STATEMENT** Local admins who can upload files and publish hearing lists in CaTH are also given permission to remove these publications if needed. This process is carried out in several steps"},
{"id":34,"ref":"REQ-0034","g":"story","t":"Verified user- Account creation","s":"**PROBLEM STATEMENT** Users who meet the set criteria are able to apply to create a verified account in CaTH. This ticket covers the requirements for creating an account in CaTH.   **AS A** CaTH User "},
{"id":35,"ref":"REQ-0035","g":"story","t":"Verified user- Account creation Confirmation","s":"**PROBLEM STATEMENT** Users who meet the set criteria are able to apply to create a verified account in CaTH. This ticket covers the requirements for creating an account in CaTH.   **AS A** CaTH User "},
{"id":36,"ref":"REQ-0036","g":"story","t":"Upload Reference Data","s":"**PROBLEM STATEMENT** This ticket is raised to upload the reference data needed to publish hearing lists in CaTH.   **AS A** System Admin **I WANT** to upload reference data in CaTH **SO THAT** the re"},
{"id":37,"ref":"REQ-0037","g":"story","t":"API connection in CaTH","s":"**PROBLEM STATEMENT** To publish hearing lists in CaTH, an API connection is needed to receive data from validated data sources.   **AS A** System Admin **I WANT** to set up an API connection **SO THA"},
{"id":38,"ref":"REQ-0038","g":"story","t":"Create Database schema for Location Details (Location, Jurisdiction, Sub-Jurisdictions, Region)","s":"**PROBLEM STATEMENT** This ticket is raised to create the database schema to store the location details.   **AS A** Service **I WANT** to create a new table in the database schema **SO THAT** I can st"},
{"id":39,"ref":"REQ-0039","g":"story","t":"Verified User – Dashboard","s":"**PROBLEM STATEMENT** Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH. The "},
{"id":40,"ref":"REQ-0040","g":"story","t":"Verified User – Email subscriptions","s":"**PROBLEM STATEMENT** Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH and s"},
{"id":41,"ref":"REQ-0041","g":"story","t":"Verified User – How do you want to add an email subscription","s":"**PROBLEM STATEMENT** Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH and s"},
{"id":42,"ref":"REQ-0042","g":"story","t":"Verified User – How do you want to add an email subscription","s":"**PROBLEM STATEMENT** Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH and s"},
{"id":43,"ref":"REQ-0043","g":"story","t":"Verified User – Unsubscribe","s":"**PROBLEM STATEMENT** Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information which they can subscribe to receive email notifications from "},
{"id":44,"ref":"REQ-0044","g":"story","t":"Verified User – Select list type","s":"**PROBLEM STATEMENT** Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH and s"},
{"id":45,"ref":"REQ-0045","g":"story","t":"Verified User – What version of the list do you want to receive?","s":"**PROBLEM STATEMENT** Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH and s"},
{"id":46,"ref":"REQ-0046","g":"story","t":"Single Sign On - System Admin User","s":"**PROBLEM STATEMENT** A system admin user in CaTH is given access to system functionality by another system admin user. This allows the system admin to upload reference data, manage third-party users,"},
{"id":47,"ref":"REQ-0047","g":"story","t":"Single Sign On - Admin User","s":"**Covered by VIBE-201**   **PROBLEM STATEMENT** An admin user in CaTH is given access to the admin functionality by signing in using the single sign on information to access their account which then t"},
{"id":48,"ref":"REQ-0048","g":"story","t":"System Admin User – Dashboard","s":"**PROBLEM STATEMENT** System admin users in CaTH require a centralised dashboard that allows access to all key administrative functions.   This dashboard acts as the main control panel for managing re"},
{"id":49,"ref":"REQ-0049","g":"story","t":"Landing Page - Part 2","s":"**PROBLEM STATEMENT** All CaTH users, including members of the public, have access to hearing lists published in CaTH. This would require users to undergo a few steps to navigate through the different"},
{"id":50,"ref":"REQ-0050","g":"story","t":"Create Court in CaTH","s":"**PROBLEM STATEMENT** Court venues need to be created in CaTH so that hearing lists can be published against theses venues.    **AS A** System Admin User **I WANT** to create a court in CaTH **SO THAT"},
{"id":51,"ref":"REQ-0051","g":"story","t":"Blob Ingestion in CaTH","s":"**PROBLEM STATEMENT** To auto-publish a hearing list in CaTH, a blob (Json file) would have to be ingested and validated from a source system through an API.   **AS A** System **I WANT** to ingest a b"},
{"id":52,"ref":"REQ-0052","g":"story","t":"Display of Pubs - What do you want to do?","s":"**PROBLEM STATEMENT** This ticket is raised to cover the display screens needed in CaTH to allow users view uploaded publications files as hearing lists in CaTH front end.   **AS A** System **I WANT**"},
{"id":53,"ref":"REQ-0053","g":"story","t":"Display of Pubs -  What court or tribunal are you interested in?","s":"**PROBLEM STATEMENT** This ticket is raised to cover the display screens needed in CaTH to allow users view uploaded publications files as hearing lists in CaTH front end.   **AS A** System **I WANT**"},
{"id":54,"ref":"REQ-0054","g":"story","t":"Display of Pubs - Find a court or tribunal","s":"**PROBLEM STATEMENT** This ticket is raised to cover the display screens needed in CaTH to allow users view uploaded publications files as hearing lists in CaTH front end.   **AS A** System **I WANT**"},
{"id":55,"ref":"REQ-0055","g":"story","t":"Display of Pubs - Summary of Pubs page","s":"**PROBLEM STATEMENT** This ticket is raised to cover the display screens needed in CaTH to allow users view uploaded publications files as hearing lists in CaTH front end.   **AS A** System **I WANT**"},
{"id":56,"ref":"REQ-0056","g":"story","t":"Display of Pubs - View flat file","s":"**PROBLEM STATEMENT** This ticket is raised to cover the display screens needed in CaTH to allow users view uploaded publications (flat files) as hearing lists in CaTH front end.   **AS A** User **I W"},
{"id":57,"ref":"REQ-0057","g":"story","t":"Civil & Family Daily Cause list","s":"**PROBLEM STATEMENT** This ticket is raised to cover the creation of the validation schema and style guide needed to publish, display and view the civil and family daily cause list in CaTH front end. "},
{"id":58,"ref":"REQ-0058","g":"story","t":"Error handling for Json-HTML Conversion (Suggested by AI)","s":"**PROBLEM STATEMENT** This ticket covers the error handling and fallback process for when a JSON publication file uploaded to CaTH fails during the ingestion, conversion, or rendering process.   CaTH "},
{"id":59,"ref":"REQ-0059","g":"story","t":"JSON Validation Schema and Style Guide Integration Specification (Suggested by AI)","s":"**PROBLEM STATEMENT** To ensure hearing list publications uploaded as JSON files are correctly formatted, validated, and displayed consistently in CaTH, a validation schema and style guide integration"},
{"id":60,"ref":"REQ-0060","g":"story","t":"Backend - Subscription Fulfilment (Email notifications)","s":"**PROBLEM STATEMENT** Verified user are users can subscribe to email notifications from CaTH. This would require the triggering of email notifications to be sent to users from CaTH back end.   **AS A*"},
{"id":61,"ref":"REQ-0061","g":"story","t":"Setting up a flux config / k8s namespace for CaTH Service","s":"Set up a flux config / k8s namespace for {{{}CaTH Service{}}}? It will also need a postgres flux db like this: <https://github.com/hmcts/cnp~~flux~~config/pull/41784>"},
{"id":62,"ref":"REQ-0062","g":"story","t":"Manage media account requests - Approve application","s":"**PROBLEM STATEMENT** Media users are expected to create accounts in CaTH by filling and when submitting the account creation form. When this happens, the CTSC Admin user is expected to verify the app"},
{"id":63,"ref":"REQ-0063","g":"story","t":"Manage media account requests - Reject application","s":"**PROBLEM STATEMENT** Media users are expected to create accounts in CaTH by filling and when submitting the account creation form. When this happens, the CTSC Admin user is expected to verify the app"},
{"id":64,"ref":"REQ-0064","g":"story","t":"CaTH General Information - Accessibility statement","s":"**PROBLEM STATEMENT** Every page in CaTH has a section displays links to various general information at the bottom of the page. This ticket captures the accessibility statement requirements.   **AS A*"},
{"id":65,"ref":"REQ-0065","g":"story","t":"CaTH General Information - Cookie Policy","s":"**PROBLEM STATEMENT** Every page in CaTH has a section displays links to various general information at the bottom of the page. This ticket captures the Cookie Policy requirements.   **AS A** System {"},
{"id":66,"ref":"REQ-0066","g":"story","t":"Authentication on classified publications","s":"**PROBLEM STATEMENT** Every list published in CaTH is assigned a sensitivity level which indicates which user group the publication should be made available to. This ticket covers the authentication o"},
{"id":67,"ref":"REQ-0067","g":"story","t":"Create hook for lint style check and any typescript errors","s":"#### User story **As a** developer{*},{*} I want to integrate lint and TypeScript validation into our pre-merge checks, so that we can identify and fix issues before they trigger a PR build failure. W"},
{"id":68,"ref":"REQ-0068","g":"story","t":"Refactor values.dev.yaml files","s":"In CaTH AI, we have values.dev.yaml file which is being used only for local development. But values.dev.yaml file should only be use when we want to override values on values.yaml file. So, we need to"},
{"id":69,"ref":"REQ-0069","g":"story","t":"Language toggle link is not consistent across different pages","s":"--- ## Original JIRA Metadata - **Status**: New - **Priority**: 3-Medium - **Issue Type**: Story - **Assignee**: Unassigned - **Created**: 12/1/2025 - **Updated**: 12/1/2025 - **Original Labels**: cat"},
{"id":70,"ref":"REQ-0070","g":"story","t":"Configure Nightly Pipeline and Add Test Guidance to CLAUDE.md","s":"We need to enhance our CI/CD process by configuring a nightly pipeline and improving contributor documentation. This includes two main tasks: ~~--~~ ### **1️⃣ Configure Nightly Pipeline** * Set up a n"},
{"id":71,"ref":"REQ-0071","g":"story","t":"Subscribe by case name, case reference number, case ID or unique reference number (URN)","s":"**PROBLEM STATEMENT** Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH and s"},
{"id":72,"ref":"REQ-0072","g":"story","t":"Verified user - Bulk unsubscribe process","s":"**PROBLEM STATEMENT** Verified users are users who have applied to create accounts in CaTH to have access to restricted hearing information which they can subscribe to receive email notifications from"},
{"id":73,"ref":"REQ-0073","g":"story","t":"Verified user - Select & Edit List Type (List Type Subscription Only)","s":"**PROBLEM STATEMENT** Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH and s"},
{"id":74,"ref":"REQ-0074","g":"story","t":"Configure List Type and Get List information from database","s":"**PROBLEM STATEMENT** In CaTH AI, we are getting list type information from mock file libs/list~~types/common/src/mock~~list-types.ts. Now we have implemented Admin functionality and Location informat"},
{"id":75,"ref":"REQ-0075","g":"story","t":"Blob explorer and manual re-submission trigger functionality.","s":"**PROBLEM STATEMENT** System admin users in CaTH access several system functionalities through the System Admin dashboard which allows them to perform administrative tasks.  The dashboard acts as the "},
{"id":76,"ref":"REQ-0076","g":"story","t":"Audit Log View","s":"### **PROBLEM STATEMENT** System admin users in CaTH access several system functionalities through the System Admin dashboard which allows them to perform administrative tasks.  The dashboard acts as "},
{"id":77,"ref":"REQ-0077","g":"story","t":"Delete Court Process","s":"### **PROBLEM STATEMENT** System admin users in CaTH access several system functionalities through the System Admin dashboard which allows them to perform administrative tasks. The dashboard acts as t"},
{"id":78,"ref":"REQ-0078","g":"story","t":"Third Party User Management - Future","s":"### **PROBLEM STATEMENT** System admin users in CaTH access several system functionalities through the System Admin dashboard which allows them to perform administrative tasks. The dashboard acts as t"},
{"id":79,"ref":"REQ-0079","g":"story","t":"Refactor artefact search extraction and subscription process","s":"**PROBLEM STATEMENT** Currently, a verified user can only subscribe to a location but it can also subscribe by other types as well which are not implemented yet. But we need to update the application "},
{"id":80,"ref":"REQ-0080","g":"story","t":"The RCJ Hearing Lists","s":"**PROBLEM STATEMENT** Hearing lists are published in CaTH through various routes. This ticket covers the non-strategic publishing of hearing lists from The Royal Court of Justice (through the upload o"},
{"id":81,"ref":"REQ-0081","g":"story","t":"Care Standards Weekly hearing list - Welsh translation","s":"**PROBLEM STATEMENT** This ticket covers the implementation of the Welsh translation for the publishing of the care standards weekly hearing list through the non-strategic publishing route.   **AS A**"},
{"id":82,"ref":"REQ-0082","g":"story","t":"PDF Subscriptions template & email summary for the RCJ and Care Standards lists","s":"**PROBLEM STATEMENT** This ticket cover the creation of the email summary and the PDF version of the RCJ hearing Lists and the Care Standards List which are to be included within the Subscription fulf"},
{"id":83,"ref":"REQ-0083","g":"story","t":"PDF Subscriptions template & email summary for the Civil and Family Daily Cause list","s":"**PROBLEM STATEMENT** This ticket covers the creation of the email summary and the PDF version of the Civil and Family Daily Cause List which are to be included within the subscription fulfilment.   *"},
{"id":84,"ref":"REQ-0084","g":"story","t":"RCJ/Rolls Building - Summary of Pubs Caution Message","s":"**PROBLEM STATEMENT** This ticket covers the implementation of the Rolls Building and RCJ landing page caution and no list message which would require some backend database changes (location metadata)"},
{"id":85,"ref":"REQ-0085","g":"story","t":"User Management","s":"### **PROBLEM STATEMENT** System admin users in CaTH access several system administrative functionalities through the System Admin dashboard which allows them to perform administrative tasks. This tic"},
{"id":86,"ref":"REQ-0086","g":"task","t":"Header and footer update","s":"After the implementation of VIBE-159, there are some known differences between current CaTH and AI CaTH on header and footer below: * New CaTH has an additional foot link called 'Open Government Licen"},
{"id":87,"ref":"REQ-0087","g":"task","t":"Service navigation update","s":"# Update service navigation for manual upload pages following SSO implementation to include Dashboard and Admin Dashboard for system admin sign~~in, and Dashboard only for local admin and CTSC admin s"},
{"id":88,"ref":"REQ-0088","g":"task","t":"Merge Tests Related to Manual Upload (Flat File)","s":"**Description:** Currently, there are three separate test files created for the manual upload (flat file) functionality across different tickets. This task aims to merge all these tests into a single,"},
{"id":89,"ref":"REQ-0089","g":"task","t":"Merge CFT Login Tests into One File & Merge SSO Login Tests into One File","s":"**Description:** Currently, login tests for CFT and SSO are spread across multiple test files, leading to duplication, scattered maintenance, and inconsistent structure. To improve test organization, "},
{"id":90,"ref":"REQ-0090","g":"task","t":"Optimize Tests for Subscription Add/Remove Functionality by Removing Redundancies and Merging Related Scenarios","s":"**Description:** The current test suite for *Adding and Removing Subscriptions* contains several redundant or fragmented test cases that validate similar flows using separate tests. This increases tes"},
{"id":91,"ref":"REQ-0091","g":"story","t":"Third Party User Management - Current","s":"### **PROBLEM STATEMENT** System admin users in CaTH access several system functionalities through the System Admin dashboard which allows them to perform administrative tasks. The dashboard acts as t"},
{"id":92,"ref":"REQ-0092","g":"story","t":"Third Party subscription Fulfilment - Current","s":"**PROBLEM STATEMENT** Third Party users can subscribe to receive publications from CaTH. This ticket covers the Third Party Subscription fulfilment process.   **AS A** CaTH Third Party Subscriber  **I"},
{"id":93,"ref":"REQ-0093","g":"epic","t":"Project Prep Tasks","s":"#### This epic is raised to capture preparatory tasks needed for the CaTH AI project."},
{"id":94,"ref":"REQ-0094","g":"story","t":"‘What do you want to do?’ Page","s":"**PROBLEM STATEMENT** All CaTH users, including members of the public, have access to hearing lists published in CaTH. This would require users to undergo a few steps to navigate through the different"},
{"id":95,"ref":"REQ-0095","g":"story","t":"Upload Reference Data","s":"**PROBLEM STATEMENT** This ticket is raised to upload the reference data needed to publish hearing lists in CaTH.   **AS A** System Admin **I WANT** to upload reference data in CaTH **SO THAT** the re"},
{"id":96,"ref":"REQ-0096","g":"task","t":"Merge Tests Related to Manual Upload (Flat File)","s":"**Description:** Currently, there are three separate test files created for the manual upload (flat file) functionality across different tickets. This task aims to merge all these tests into a single,"},
{"id":97,"ref":"REQ-0097","g":null,"t":"PDDA/HTML","s":"**PROBLEM STATEMENT** To implement the Crown lists publishing in CaTH, the PDDA functionality sends data in HTML/HTM format to the AWS S3 bucket. This ticket captures the requirements needed to implem"},
{"id":98,"ref":"REQ-0098","g":"epic","t":"Refactor the code to use List information from the database table","s":"Currently, lots of pages are getting list information from mock file. We need to update the code so that all the list information comes for list type database tables. **Acceptance criteria:** - All pa"},
{"id":99,"ref":"REQ-0099","g":"story","t":"Subscription Emails Fulfilment Complete Journey","s":"Once excel generation for SJP has been implemented. We need to make sure that user is able to get all four types of subscriptions emails which have been configured in Gov Notifier: Media Publication S"},
{"id":100,"ref":"REQ-0100","g":"story","t":"Complete Azure B2C media user creation journey","s":"As part of this ticket, once CTSC Admin approves the media application, we need to make that user has been created in Azure AD using graph api and relevant emails will be sent to the user. If it is a "},
{"id":101,"ref":"REQ-0101","g":"story","t":"Replace passport-azure-ad with openid-client","s":"CaTH AI is currently using library passport-azure-ad which will be deprecated soon. Instead of using passport-azure-ad, we need to use openid-client in our application. SSO_ISSUER_URL will be used fro"},
{"id":102,"ref":"REQ-0102","g":null,"t":"Implement Crime IDAM Integration","s":"I want to integrate Crime IDAM into the application so that users can authenticate securely and access crime-related services. **Description:** The application needs to integrate with Crime IDAM to en"},
{"id":103,"ref":"REQ-0103","g":"story","t":"System Admin - Data Management","s":"**PROBLEM STATEMENT:** This ticket covers the implementation of the functionality needed to upload Reference Data, manage Jurisdiction Data and Reference Data. It will explore different options in the"},
{"id":104,"ref":"REQ-0104","g":"story","t":"Style Guide: Tribunal non-strategic publishing - UTCC, UTLC & UTAAC","s":"**PROBLEM STATEMENT** This ticket is raised for the creation of the validation schema, style guide, PDF and email summary needed for the Upper Tribunal (Tax and Chancery Chamber), Upper Tribunal (Land"},
{"id":105,"ref":"REQ-0105","g":"story","t":"Style Guide: Tribunal non-strategic publishing - SIAC, POAC, PAAC, FFT TC, FFT LRT & FFT RPT","s":"**PROBLEM STATEMENT** This ticket is raised for the creation of the validation schema, style guide, PDF and email summary needed for the following tribunals to publish in CaTH, through the non-strateg"},
{"id":106,"ref":"REQ-0106","g":"story","t":"Style Guide: Tribunal non-strategic publishing - GRC, WPAFCC & UTIAC","s":"**PROBLEM STATEMENT** This ticket is raised for the creation of the validation schema, style guide, PDF and email summary needed for the following tribunals to publish in CaTH, through the non-strateg"},
{"id":107,"ref":"REQ-0107","g":"story","t":"Style Guide: Tribunal non-Strategic publishing - SSCS Hearing Lists","s":"**PROBLEM STATEMENT** This ticket is raised for the creation of the validation schema, style guide, PDF and email summary needed for the SSCS tribunals to publish in CaTH through the non-strategic pub"},
{"id":108,"ref":"REQ-0108","g":"story","t":"Style Guide: SEND, CIC and Asylum Support Tribunal Hearing Lists Publishing in CaTH","s":"**PROBLEM STATEMENT** This ticket is raised for the creation of the validation schema, style guide, PDF and email summary needed for the First-tier Tribunal (Special Educational Needs and Disability),"},
{"id":109,"ref":"REQ-0109","g":null,"t":"Style Guide: Implement Crown PDDA Lists","s":"**PROBLEM STATEMENT** This ticket is raised for the creation of the validation schema, style guide, PDF and email summary needed for the PDDA Crime Lists (Crown Firm, Daily and Warned lists) to publis"},
{"id":110,"ref":"REQ-0110","g":"story","t":"Style Guide: PCOL, Mental Health Tribunal, IAC Daily List","s":"**PROBLEM STATEMENT** This ticket is raised for the creation of lists for manual publishing in CaTH.  **AS A** Service **I WANT** to create the supporting information for Lists that are to be manual p"},
{"id":111,"ref":"REQ-0111","g":null,"t":"Update: ‘Remove List Summary’ table","s":"**PROBLEM STATEMENT** In the ‘Remove’ tile, when the Local Admin selects the venue to remove a publication from, the published lists for the selected venue are displayed in a table with several column"},
{"id":112,"ref":"REQ-0112","g":null,"t":"Update: Audit log view","s":"**PROBLEM STATEMENT** In the ‘Audit Log Viewer’ tile, when the Admin selects the action to view from the list of actions in the audit log, there are several functionalities that are inconsistent with "},
{"id":113,"ref":"REQ-0113","g":null,"t":"PDF not generated after publication upload","s":"PDF should be generated after manual upload and non-strategic upload. This feature has been broken recently. PDF is not generated and no subscription email sent after upload. **Acceptance criteria** P"},
{"id":114,"ref":"REQ-0114","g":null,"t":"Publication dates not displaying correctly on style guide","s":"- For all list types the content date on the artefact table is set to be one day earlier than the set date due to BST. - The publication date is on the style guide pages for all RCJ and Care Standards"},
{"id":115,"ref":"REQ-0115","g":null,"t":"Get List Types from database on all the pages","s":"We have added functionality to add list types in database. All pages in CaTH should get the list type from database instead of mock-list-types.ts. **Acceptance criteria** - There is no mock-list-types"},
{"id":116,"ref":"REQ-0116","g":null,"t":"Refactor End to End Tests","s":"Using PR: https://github.com/hmcts/cath-service/pull/414 make sure no test is interacting with database directly. Use existing CaTH pages or add Testing support endpoint to populate data for end to en"},
{"id":117,"ref":"REQ-0117","g":null,"t":"Generate SJP Excel file when list is uploaded","s":"## User Story As a verified user, I want an Excel file to be generated automatically when an SJP list is uploaded, so that I can download the case data in spreadsheet format. We also need to add the \""},
{"id":118,"ref":"REQ-0118","g":"story","t":"Subscribe by case name, case reference number, case ID or unique reference number (URN)","s":"**PROBLEM STATEMENT** Verified user are users who have applied to create accounts in CaTH to have access to restricted hearing information. Upon approval, verified users can then sign in on CaTH and s"},
{"id":119,"ref":"REQ-0119","g":"story","t":"Remove List Sensitivity - Third Party Courtel","s":"**PROBLEM STATEMENT** CaTH AI implemented List Sensitivity when user subscribe to the list. Courtel does not support List sensitivity. So we need to remove it. We also need to remove channel from the "},
{"id":120,"ref":"REQ-0120","g":null,"t":"Style Guide: Magistrates' Court Hearing Lists - Crime Portal / Libra","s":"**PROBLEM STATEMENT** This ticket is raised for the creation of the style guide, downloadable PDF and email summary of the Magistrates' Court Hearing Lists from Crime Portal, which are to be published"},
{"id":121,"ref":"REQ-0121","g":null,"t":"Add the open justice licence link to CaTH footer","s":"**PROBLEM STATEMENT** This ticket is raised to add the open justice licence link to CaTH footer. It also needs to be added to B2C page footer as well.   **AS A** Service **I WANT** to add the open jus"},
{"id":122,"ref":"REQ-0122","g":null,"t":"Proof of ID document not removed if a media application is rejected","s":"If a media application is rejected, the media application status should be set to REJECTED and the proof of ID document deleted. Currently the document remains in the temp folder if the application is"},
{"id":123,"ref":"REQ-0123","g":null,"t":"Fix STAGING Env","s":"We need to make sure that all the changes which are being marge into master deployed successfully on STG environment. Acceptance Criteria: - STG environment is working"},
{"id":124,"ref":"REQ-0124","g":null,"t":"Fix any typescript and lint issue when commit code into branch","s":"We need to make sure that when a developers commit a code, it should automatically fix any typescript or lint issue in the code. You need to create per-commit hook for it."},
{"id":125,"ref":"REQ-0125","g":null,"t":"Fix firewall issue for CaTH Staging Environment","s":"We managed to successfully deploy the code on Staging environment but all the pages are being blocked by firewall. We need to fix this issue. Staging URL: https://cath-web.staging.platform.hmcts.net/ "},
{"id":126,"ref":"REQ-0126","g":null,"t":"Set up ITHC, Demo and Test environments","s":"## User Story As a platform engineer, I want Flux kustomization overlays created for ITHC, Demo and Test environments in `sds-flux-config`, so that Flux can manage application deployments to those env"},
{"id":127,"ref":"REQ-0127","g":null,"t":"Create bootstrap Key Vault infrastructure inside cath-service","s":"## User Story As a platform engineer, I want bootstrap Key Vaults provisioned per environment from within the cath-service monorepo infrastructure folder, so that there is a central and controlled pla"},
{"id":128,"ref":"REQ-0128","g":null,"t":"System admin reference data upload - Backend logic update","s":"*Frontend update is not covered in this ticket. Currently the reference data upload does not have the concept of provenance. To support multiple provenances for a location: - The following fields need"},
{"id":129,"ref":"REQ-0129","g":null,"t":"Configure multi-environment infrastructure for ITHC, Demo and Test","s":"## User Story As a platform engineer, I want infrastructure configured for ITHC, Demo and Test environments, so that Azure resources (Key Vault, Redis, PostgreSQL) and GitHub Actions credentials are a"},
{"id":130,"ref":"REQ-0130","g":null,"t":"Add environment-specific deploy workflows for ITHC, Demo and Test","s":"## User Story As a developer, I want dedicated GitHub Actions workflows for ITHC, Demo and Test environments, so that pushing to those branches automatically deploys the promoted images to the correct"},
{"id":131,"ref":"REQ-0131","g":null,"t":"Sync lower environment branches from master after successful promote","s":"## User Story As a developer, I want master to automatically sync to ITHC, Demo and Test branches after a successful promote, so that lower environment deployments are triggered automatically without "},
{"id":132,"ref":"REQ-0132","g":null,"t":"Configure Helm values to load secrets from cath Key Vaults for PR and STG builds","s":"## User Story As a developer, I want PR builds to load secrets from `cath-bootstrap-stg-kv` and STG/master builds to load secrets from `cath-stg`, so that all environments use the cath-owned Key Vault"},
{"id":133,"ref":"REQ-0133","g":null,"t":"Style Guide: Implement Civil and Family Daily Cause Lists","s":"## User Story As a user, I want to view the Civil Daily Cause List and Family Daily Cause List in an accessible and well-formatted style, so that I can see scheduled hearings with all relevant case de"},
{"id":134,"ref":"REQ-0134","g":null,"t":"Add missing regions and sub-jurisdictions to seed data","s":"Some regions and sub-jurisdictions are missing in the seed data. As a result, we cannot upload court venues containing those regions or sub-jurisdictions. Review what is in current CaTH and make sure "}];
const EXISTING = [{"s":4,"t":3,"type":"derives_from"},
{"s":10,"t":1,"type":"derives_from"},
{"s":13,"t":1,"type":"derives_from"},
{"s":16,"t":1,"type":"derives_from"},
{"s":17,"t":1,"type":"derives_from"},
{"s":18,"t":1,"type":"derives_from"},
{"s":19,"t":2,"type":"derives_from"},
{"s":20,"t":2,"type":"derives_from"},
{"s":21,"t":2,"type":"derives_from"},
{"s":22,"t":2,"type":"derives_from"},
{"s":22,"t":21,"type":"depends_on"},
{"s":24,"t":3,"type":"derives_from"},
{"s":25,"t":3,"type":"derives_from"},
{"s":26,"t":3,"type":"derives_from"},
{"s":47,"t":46,"type":"depends_on"},
{"s":49,"t":1,"type":"derives_from"},
{"s":59,"t":58,"type":"depends_on"},
{"s":72,"t":71,"type":"depends_on"},
{"s":73,"t":74,"type":"depends_on"},
{"s":94,"t":1,"type":"derives_from"},
{"s":110,"t":2,"type":"derives_from"}];

const reqs = REQS
const existing = EXISTING
const byId = Object.fromEntries(reqs.map((r) => [r.id, r]))
const existingSet = new Set(existing.map((l) => `${l.s}|${l.t}`))

const catalogue = reqs
  .map((r) => `${r.id} ${r.ref} [${r.g || '?'}] ${r.t} — ${r.s || ''}`)
  .join('\n')

const CLUSTER_SCHEMA = {
  type: 'object',
  properties: {
    clusters: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, ids: { type: 'array', items: { type: 'number' } } },
        required: ['name', 'ids'],
      },
    },
  },
  required: ['clusters'],
}

const LINK_SCHEMA = {
  type: 'object',
  properties: {
    links: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          source_id: { type: 'number' },
          target_id: { type: 'number' },
          type: { type: 'string', enum: ['refines', 'satisfies', 'depends_on', 'conflicts_with'] },
          confidence: { type: 'number' },
          rationale: { type: 'string' },
        },
        required: ['source_id', 'target_id', 'type', 'confidence', 'rationale'],
      },
    },
  },
  required: ['links'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    holds: { type: 'boolean' },
    reason: { type: 'string' },
    corrected_type: { type: 'string', enum: ['refines', 'satisfies', 'depends_on', 'conflicts_with', 'none'] },
  },
  required: ['holds', 'reason', 'corrected_type'],
}

phase('Cluster')
const clusterResult = await agent(
  `You are organising software requirements into feature areas for dependency analysis.
Group these ${reqs.length} requirements into 8-14 coherent feature-area clusters (e.g. authentication/SSO,
manual publishing, subscriptions, list style guides, reference data, admin dashboard, infrastructure/deployment).
Every requirement id must appear in exactly one cluster. Return the clusters.

REQUIREMENTS:
${catalogue}`,
  { schema: CLUSTER_SCHEMA, label: 'cluster' },
)
const clusters = clusterResult.clusters.filter((c) => c.ids.length > 0)
log(`Clustered into ${clusters.length} feature areas`)

const DEP_TYPES = `Link types (directional, source -> target):
- depends_on: source needs target to exist/work first (foundational dependency). HIGHEST VALUE.
- refines: source is a more specific version of the broader target.
- satisfies: source fulfils/implements target.
- conflicts_with: the two cannot both hold as stated (rare — be very cautious).`

const results = await pipeline(
  clusters,
  (cluster) =>
    agent(
      `Find traceability links between software requirements. Focus on requirements in the "${cluster.name}" cluster
(ids: ${cluster.ids.join(', ')}), but you may link them to ANY requirement in the full catalogue below.

${DEP_TYPES}

Only propose a link when the requirement CONTENT gives a concrete reason — a genuine functional dependency,
refinement, or fulfilment. Do NOT link merely because two requirements share a topic area. Be conservative:
a sparse set of correct links is far better than many weak ones. Give each a confidence 0-1 and a one-sentence
rationale grounded in the requirement text. Propose at most ~15 links.

FULL CATALOGUE:
${catalogue}`,
      { schema: LINK_SCHEMA, label: `propose:${cluster.name}`.slice(0, 40), phase: 'Propose' },
    ),
  (proposed, cluster) => {
    const candidates = (proposed?.links || []).filter(
      (l) =>
        l.source_id !== l.target_id &&
        byId[l.source_id] &&
        byId[l.target_id] &&
        !existingSet.has(`${l.source_id}|${l.target_id}`),
    )
    if (!candidates.length) return []
    return parallel(
      candidates.map((l) => () => {
        const s = byId[l.source_id]
        const t = byId[l.target_id]
        return agent(
          `You are a skeptical reviewer of a proposed requirement traceability link. Try to REFUTE it.
Default to holds=false unless the link is clearly justified by the requirement content.

PROPOSED: ${s.ref} "${s.t}" --${l.type}--> ${t.ref} "${t.t}"
Claimed rationale: ${l.rationale}

SOURCE (${s.ref}): ${s.s}
TARGET (${t.ref}): ${t.s}

A "${l.type}" link must be genuinely true from the content, with correct direction. If the relationship is real
but the type/direction is wrong, set holds=false and give corrected_type. If there is no real relationship,
holds=false and corrected_type=none.`,
          { schema: VERDICT_SCHEMA, label: `verify:${s.ref}->${t.ref}`, phase: 'Verify' },
        ).then((v) => ({ ...l, cluster: cluster.name, verdict: v }))
      }),
    )
  },
)

const confirmed = results
  .flat()
  .filter(Boolean)
  .filter((l) => l.verdict?.holds === true)
  .reduce((acc, l) => {
    const k = `${l.source_id}|${l.target_id}|${l.type}`
    if (!acc[k] || acc[k].confidence < l.confidence) acc[k] = l
    return acc
  }, {})

const finalLinks = Object.values(confirmed).sort((a, b) => a.source_id - b.source_id || a.target_id - b.target_id)
log(`Confirmed ${finalLinks.length} inferred links after adversarial verification`)

return {
  clusters: clusters.map((c) => ({ name: c.name, count: c.ids.length })),
  links: finalLinks.map((l) => ({
    source_id: l.source_id,
    target_id: l.target_id,
    type: l.type,
    confidence: Math.round(l.confidence * 100) / 100,
    rationale: l.rationale,
  })),
}
