# #904: Bug: CFT Lists Important Information Text Issue

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** None
**Created:** 2026-07-29T13:44:41Z
**Updated:** 2026-09-10T14:49:11Z

## Description

**Bug 1**

Important information text is not merging the location name in the text.

Currently, in information text, it is merging venue name from json which is wrong. It should merge location name.

Below is correct text (bold text is where location name should be merged)

Open justice is a fundamental principle of our justice system. You can attend a public hearing in person or you can apply for permission to observe remotely.

Requests to observe remotely a hearing that is taking place at **Barnet Civil and Family Courts Centre** should be made in good time direct to: family.barnet.countycourt@justice.gov.uk or by calling 0300 123 5577. You may be asked to provide further details.

**Bug 2**
The **Town** and **County** values received in the JSON payload should not be displayed in either the Style Guide or the generated PDF.

CFT lists means Civil Daily Cause List, Family Daily Cause List and Civil and Family Daily Cause List

## Comments

No comments on this issue.
