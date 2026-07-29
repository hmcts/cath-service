# #889: Enable auto merging of dependencies only for minor version changes

**State:** OPEN
**Assignees:** _none_
**Author:** junaidiqbalmoj
**Labels:** _none_
**Created:** 2026-07-28T09:11:56Z
**Updated:** 2026-07-28T09:11:56Z

## Description

Right now, we disabled all the dependencies auto merging into master because it is breaking CaTH AI in some cases. i.e. https://github.com/hmcts/cath-service/commit/3e09fb5e8c8d5e0bc99e5f8cbde805e5e357161f
Above change broke the front and icon on CaTH AI. We need to make sure only dependencies with minor version change can be auto merged.

## Comments

No comments on this issue.
