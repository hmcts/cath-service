# #673: CSV - Magistrate public and standard hearing lists

**State:** OPEN
**Assignees:** 
**Author:** OgechiOkelu
**Labels:** enhancement, status:new
**Created:** 2026-06-04T12:48:48Z
**Updated:** 2026-06-04T15:21:38Z

## Description

**PROBLEM STATEMENT**

This ticket is raised to create the CSV downloadable version of the Magistrate public and standard hearing lists.

**AS A** service

**I WANT** to provide additional download file options for hearing lists in CaTH

**SO THAT** CaTH verified users have more options to choose from

**ACCEPTANCE CRITERIA**

- CSV and PDF downloadable files are made available as downloadable options for the MAGISTRATES_STANDARD_LIST and MAGISTRATES_PUBLIC_LIST
- Links to download both file types are displayed in the email notifications
- The data fields / columns should be uniform on both the CSV and PDF downloadable files for the MAGISTRATES_STANDARD_LIST and MAGISTRATES_PUBLIC_LIST
- For Magistrates Public List, the following fields are displayed as separate columns: Court House, Court Room, Sitting at, URN, Name, Hearing Type, Prosecuting Authority, Offence Details and Reporting Restrictions
- For Magistrates Standard List, each offence is displayed on a new line with the rest of the fields
- For Magistrates Standard List, the CSV fields are displayed as separate columns: Court House, LJA, Court Room, Sitting at, Name, Application Particulars, DOB, Age, Address, Prosecuting Authority Name, Attendance Method, Reference, Application Type, ASN, Hearing Type, Panel, Reporting Restrictions, Offence Code, Offence Title, Offence Details, Legislation, Max Penalty, Plea, Date of Plea, Convicted on and Adjourned from.

## Comments

### Comment by OgechiOkelu on 2026-06-04T12:49:44Z
@SPEC

### Comment by hmctsclaudecode on 2026-06-04T12:54:13Z
Technical specification was generated and posted — see plan.md for the full plan derived from this spec.

### Comment by OgechiOkelu on 2026-06-04T15:21:38Z
@plan
