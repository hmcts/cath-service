# #659: The 'Business and Property Courts Rolls Building' venue is created in CaTH

**State:** OPEN
**Assignees:** (none)
**Author:** OgechiOkelu
**Labels:** enhancement, status:new, type:story, jira:VIBE-314, epic:public-journey
**Created:** 2026-05-20T16:35:25Z
**Updated:** 2026-07-23T12:46:25Z

## Description

**PROBLEM STATEMENT**

This ticket covers the creation of The Business and Property Courts Rolls Building which is to be created as a venue in CaTH

**AS A** Service

**I WANT** to create The Business and Property Courts Rolls Building

**SO THAT** hearing lists can be published against this building in CaTH

**ACCEPTANCE CRITERIA**

- The venue 'Business and Property Courts Rolls Building' is created in CaTH

- In the front end, the following text is displayed as a page header;

  What do you want to view from Business and Property Courts Rolls Building?

- The link to FaCT is displayed after the text above in the following text and masked in the highlighted part of the text;

  [Find contact details and other information about courts and tribunals](https://www.find-court-tribunal.service.gov.uk/) in England and Wales, and some non-devolved tribunals in Scotland.

- The following caution message is displayed under the FaCT link;

  'These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives.
  If you do not see a list published for the court you are looking for, it means there are no hearings scheduled.'

- The Rolls Building hearing lists are arranged in an alphabetical order under the caution message. Rolls Building Hearing Lists are;

  - Admiralty Court (KB) daily cause list
  - Business list (ChD) daily cause list
  - Chancery Appeals (ChD) daily cause list
  - Commercial Court (KB) daily cause list
  - Companies Winding Up (ChD) daily cause list
  - Competition List (ChD) daily cause list
  - Financial List (ChD/KB) daily cause list
  - Insolvency & Companies Court (ChD) daily cause list
  - Interim Applications List (ChD) Daily Cause List
  - Intellectual Property and Enterprise Court (ChD) daily cause list
  - Intellectual Property List (ChD) daily cause list
  - London Circuit Commercial Court (KB) daily cause list
  - Patents Court (ChD) daily cause list
  - Pensions List (ChD) daily cause list
  - Property, Trusts and Probate list (ChD) daily cause list
  - Revenue List (ChD) daily cause list
  - Technology and Construction Court (KB) daily cause list

## Comments

### Comment by OgechiOkelu on 2026-07-22T16:14:29Z
@spec

### Comment by hmctsclaudecode on 2026-07-22T16:19:22Z
(A detailed technical specification was posted. Key points: the public-facing summary page `apps/web/src/pages/(public)/summary-of-publications/` already exists and renders the required heading, FaCT link, caution message and alphabetically-sorted publication list. The ticket is predominantly a data/reference-data configuration task: register the new location, register the 17 Rolls Building list types, populate the caution message via `LocationMetadata`, and verify rendering. It raised open questions on rendering scope, list-type naming conventions, provenance, region, sub-jurisdiction, production locationId, Welsh translations and sensitivity.)

### Comment by OgechiOkelu on 2026-07-23T12:46:25Z
@plan
