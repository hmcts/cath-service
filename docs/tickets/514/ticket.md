# Issue #514 - Style Guide: Magistrates' Court Hearing Lists - Crime Portal / Libra

**Labels:** enhancement, status:new

---

**PROBLEM STATEMENT**

This ticket is raised for the creation of the style guide, downloadable PDF and email summary of the Magistrates' Court Hearing Lists from Crime Portal, which are to be published in CaTH.

**AS A** Service

**I WANT** to create the style guide, PDF & email summary for the new Mags Libra Public Daily list

**SO THAT** the Mags Libra hearing lists can be published in CaTH

**ACCEPTANCE CRITERIA**

- The following list types are to be created in CaTH backend for publishing in CaTH from Crime Portal / Libra. (Names in bracket for frontend)
  - MAGISTRATES_ADULT_COURT_LIST_DAILY (Magistrates Adult Court List - Daily)
  - MAGISTRATES_ADULT_COURT_LIST_FUTURE (Magistrates Adult Court List - Future)
  - MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY (Magistrates Public Adult Court List - Daily)
  - MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE (Magistrates Public Adult Court List - Future)

- The fields to be displayed in the public lists are Listing Time, Defendant Name and Case Number
- The fields to be displayed in the standard lists are Block Start, Defendant Name, Date of Birth, Address, Age, Informant, Case Number, Offence Code, Offence Title and Offence Summary
- The validation schema, style guide, PDF & email summary for the MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE are created
- The validation schema, style guide, PDF & email summary for the MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY is created
- Subscription fulfilment process is implemented for each list
- A new pdf template is created for the downloadable version of each list
- Email notification summary for each list will display the defendant name, informant, case number and offence title
- List manipulation is created for the style guide(s)
- Both Crime IDAM and Media Verifies users are able to access all 4 list types which are assigned the 'classified' sensitivity
- The main party for a case should be the party with DEFENDANT as their partyRole

**Welsh translations:**

- Listing time - Amser rhestru
- Magistrates Public Adult Daily Court List - Rhestr Achosion Dyddiol Cyhoeddus y Llys Ynadon – Oedolion
- Magistrates Adult Court List - Future - Rhestr Llys Ynadon Oedolion – Dyfodol
- Defendant Name - Enw'r Diffynnydd
- Case Number - Rhif yr Achos
- Sitting at - Yn eistedd yn
- Session start - Amser Cychwyn y Sesiwn

Reporting restriction warnings provided in both English and Welsh.
