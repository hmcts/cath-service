# #769: Inconsistencies - Frontend issue

**State:** OPEN
**Assignees:** _none_
**Author:** OgechiOkelu
**Labels:** type:story, epic:public-journey
**Created:** 2026-06-24T16:33:57Z
**Updated:** 2026-08-12T12:55:15Z

## Description

**PROBLEM STATEMENT**
This ticket is raised to make changes to the 'How do you want to sign in?' page in CaTH.

**AS A** Service
**I WANT** to update the 'How do you want to sign in?' page in CaTH
**SO THAT** the page is up to date with current requirements

**ACCEPTANCE CRITERIA**
The following changes need to be made and should follow the format displayed here https://pip-frontend.staging.platform.hmcts.net/sign-in
- 'Don't have a CaTH account? [Create one here]' is updated to read as 2 sentences across 2 lines.

**Don't have an account?**

[Create a Court and tribunal hearings account]

- **Don't have an account?** is displayed boldly.
- The same link embedded in [Create one here] is embedded in [Create a Court and tribunal hearings account]
- The following is displayed boldly underneath the embedded link; '**You may be contacted to take part in user research to help us improve our services. Participation is optional, and any information you share will be handled confidentially.**'

## Comments

### Comment by OgechiOkelu on 2026-08-12T12:49:07Z

@spec

### Comment by hmctsclaudecode on 2026-08-12T12:52:xxZ

A detailed technical specification was auto-generated on the issue. Its substantive
conclusions are carried into `plan.md`, with two deliberate departures recorded there:

1. The Welsh string for "Don't have an account?" is **not** copied verbatim from
   pip-frontend, because pip-frontend's Welsh (`A oes gennych gyfrif?`) means
   "Do you have an account?" — the negative is missing. See Open Question 2.
2. Markup for the "Don't have an account?" line uses a semantic `<h2>` rather than
   pip-frontend's non-semantic bold `<p>`. See "Markup decision" in `plan.md`.

### Comment by OgechiOkelu on 2026-08-12T12:55:15Z

@plan
