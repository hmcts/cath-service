# #675: CSV - Magistrates Hearing Lists - Part 2

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** enhancement, status:new
**Created:** 2026-06-04T13:50:00Z
**Updated:** 2026-06-04T13:50:00Z

## Description

**PROBLEM STATEMENT**

This ticket is raised to create the CSV downloadable version of the Magistrate public and standard hearing lists.

**AS A** service

**I WANT** to provide additional download file options for hearing lists in CaTH

**SO THAT** CaTH verified users have more options to choose from

**ACCEPTANCE CRITERIA**

- CSV and PDF downloadable files are made available as downloadable options for the following Magistrates Hearing Lists:
  - MAGISTRATES_ADULT_COURT_LIST_DAILY
  - MAGISTRATES_ADULT_COURT_LIST_FUTURE
  - MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY
  - MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE

- Links to download both file types are displayed in the email notifications
- The data fields / columns should be uniform on both the CSV and PDF downloadable files for all the Magistrates Hearing Lists

- For the MAGISTRATES_ADULT_COURT_LIST_DAILY, the following fields are displayed as separate columns: Court House, Court Room, LJA, Session Start, Block Start, Defendant Name, Date of Birth, Address, Age, Informant, Case Number and Offence Code

- For the MAGISTRATES_ADULT_COURT_LIST_FUTURE, the following fields are displayed as separate columns: Court House, Court Room, LJA, Session Start, Block Start, Defendant Name, Date of Birth, Address, Age, Informant, Case Number and Offence Code

- For the MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY, the CSV fields are displayed as separate columns: Court House, Sitting at, Court Room, LJA, Session Start, Listing Time, Defendant Name, and Case Number

- For the MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE, the following fields are displayed as separate columns: Court House, Sitting at, Court Room, LJA, Session Start, Listing Time, Defendant Name, and Case Number

## Comments

### Comment by OgechiOkelu on 2026-06-04
@spec

### Comment by hmctsclaudecode (auto-generated spec)
# Technical Specification: CSV — Magistrates Hearing Lists (Part 2)

This is Part 2 of the Magistrates work. It adds CSV and PDF downloadable outputs for four Magistrates list types. The data columns must be uniform across the CSV and the PDF for a given list type. The two "Adult Court" list types share a 12-column layout; the two "Public Adult Court" list types share an 8-column layout.

See full spec in comments on the GitHub issue.

### Comment by OgechiOkelu on 2026-06-04
@plan
