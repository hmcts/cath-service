# #872: Mags Subscription emails updated with new Media Protocol

**State:** OPEN
**Assignees:** (none)
**Author:** OgechiOkelu
**Labels:** enhancement
**Created:** 2026-07-22T16:08:18Z
**Updated:** 2026-07-23T12:32:50Z

## Description

**PROBLEM STATEMENT**
Following the recent updates to the Third Party media protocol, the opening message for the subscription email on all Magistrates court hearing lists from Libra/Crime Portal and Common Platform need to be revised to reflect this change.
[Opening message for Magistrates court subscription email.docx](https://github.com/user-attachments/files/30275795/Opening.message.for.Magistrates.court.subscription.email.docx)

**AS A** Service

**I WANT** to update the opening message for Magistrates court subscription email

**SO THAT** it reflects the recent updates to the Third Party media protocol

**ACCEPTANCE CRITERIA**

**Current Opening message for Magistrates court subscription email:**

> Note this email contains Special Category Data as defined by Data Protection Act 2018, formally known as Sensitive Personal Data, and should be handled appropriately.
>
> This email contains information intended to assist the accurate reporting of court proceedings. It is vital you ensure that you safeguard the Special Category Data included and abide by reporting restrictions (for example on victims and children). HMCTS will stop sending the data if there is concern about how it will be used.

The subscription emails for all Mags lists need to be updated with the new media protocol. This is to replace the existing wording. Logic will be required so that this template is sent for Mags subscriptions only whilst all other list types use existing wording.

**Opening message for Magistrates court subscription email is updated to read as follows:**

> This communication contains information, or links to information, intended to assist the accurate reporting of court proceedings by journalists.
>
> You must comply with reporting restrictions and any other legal restrictions on the use of information.
>
> HMCTS will stop sharing the data if there is concern about how it will be used.
>
> If your circumstances change and you no longer have legitimate reasons to receive court hearing lists and registers – for example, if you leave your employer – it is your responsibility to inform HMCTS of this so that your details are removed from the distribution list.
>
> **Contacting magistrates' courts**
>
> Journalists should contact our Courts and Tribunals Service Centre for all requests for factual information related to criminal magistrates' court cases and hearings.
>
> Telephone: 0333 0419680 (select option 1 for criminal cases). This line is for journalists only and should not be promoted for public use.
>
> Email: mediaandpressenquires@justice.gov.uk
>
> Journalists should use MEDIA ENQUIRY in the subject line of all correspondence.
>
> You may be asked to provide details of your UK Press Card or relevant identification to verify your identity.

## Comments

### Comment by OgechiOkelu on 2026-07-22T16:09:53Z
@spec

### Comment by hmctsclaudecode on 2026-07-22T16:13:58Z
A detailed technical specification was posted (issue #872 comment). Key points captured and verified in `plan.md`:
- Opening message currently lives in the GOV.UK Notify template body, not application code.
- Subscription emails assembled in `libs/notifications/src/notification/notification-service.ts`; personalisation built in `libs/notifications/src/govnotify/template-config.ts`.
- Recommends an `opening_message` personalisation parameter driven from code, selected by stable `listTypeName` (never numeric `listTypeId`).
- Six Magistrates list-type names identified; open question on SJP lists.
- New wording needs an approved Welsh translation.

### Comment by OgechiOkelu on 2026-07-23T12:32:50Z
@plan
