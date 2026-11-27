# #1355: Add error location messages for non-strategic upload

**State:** OPEN
**Assignees:** alao-daniel
**Author:** OgechiOkelu
**Labels:** 
**Created:** 2026-11-05T14:50:34Z
**Updated:** 2026-11-20T09:38:43Z

## Description

**PROBLEM STATEMENT**
The Business and Property Division Rolls Building Daily Cause List excel template has multiple tabs which are populated by several local admin staff. When all the tabs are populated and there is an error that prevents the file from being uploaded in CaTH, it is difficult to identify the exact location of the error. This issue has been investigated in the spike ticket [PUB-3335: Spike - Identify error location in BPD excel template and Manual Publishing route 
Done](https://hmcts.atlassian.net/browse/PUB-3335) and the agreed solution is documented in [Confluence](https://hmcts.atlassian.net/wiki/spaces/PUBH/pages/354976030/PUB-3335+-+Investigate+error+display+in+non-strategic+and+manual+upload).
As part of the spike ticket, a prototype has been created to show how this can work. After validation for non-strategic upload, the errors are translated to error locations and returned to the frontend for display.
[PUB-3335 Prototype for error display in non-strategic upload by KianKwa · Pull Request #952 · hmcts/pip-data-management](https://github.com/hmcts/pip-data-management/pull/952) 
[PUB-3335 Prototype for error display in non-strategic upload by KianKwa · Pull Request #1746 · hmcts/pip-frontend](https://github.com/hmcts/pip-frontend/pull/1746) 

 
**AS A** Local Admin
**I WANT** to easily identify any error in the data inputted in the BPD excel template 
**SO THAT** the error can be corrected



**ACCEPTANCE CRITERIA**
- When error occurred during non-strategic upload on frontend, error locations rather than the generic message is returned.
- No change is made to the manual upload process.


## Comments

No comments on this issue.

