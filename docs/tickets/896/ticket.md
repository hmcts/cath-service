# #896: Sending an email for account deletion

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** OgechiOkelu
**Labels:** 
**Created:** 2026-07-28T13:45:49Z
**Updated:** 2026-11-20T08:44:06Z

## Description

**PROBLEM STATEMENT**

During the annual verification process, CaTH account holders are sent an email to re-verify their accounts. Where a CaTH account is not verified within the allocated verification time, the account is deleted. However, the account holder is not informed that their CaTH account has been deleted. This ticket is raised to implement the generation and sending of an email notification to the owners of every CaTH account that is deleted following the annual verification process.

**AS A** service
**I WANT** to send an email notification to the owners of every CaTH account that is deleted following the annual verification process.
**SO THAT** these users are aware that their accounts have been deleted

**ACCEPTANCE CRITERIA**
- An email notification is generated on GovNotify and sent out immediately to the owners of every CaTH account that is deleted following the annual verification process.
- No Welsh translation required
- Email content should read as follows:

Dear full_name,

As part of our annual account verification process, a re-verification email was sent to you on (date).

As the re-verification process was not completed within the required timeframe, your account has now been deleted.

If you wish to continue accessing the Court and Tribunal Hearings Verified Space, you will need to create a new account. You can do so by following the link below:

[Create a Court and Tribunal Hearings account]  [Court and tribunal hearings - Create a Court and tribunal hearings account - Court and Tribunal Hearings - GOV.UK](https://www.court-tribunal-hearings.service.gov.uk/create-media-account#)

Kind regards,

## Comments

### Comment by OgechiOkelu on 2026-08-20T09:18:51Z
Check if inactive account management is in the code before this ticket is implemented.
