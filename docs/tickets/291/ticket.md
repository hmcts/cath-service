# #291: [VIBE-288] Refactor values.dev.yaml files

**State:** OPEN
**Assignees:** Unassigned
**Author:** linusnorton
**Labels:** migrated-from-jira, status:new, priority:3-medium, type:story, jira:VIBE-288
**Created:** 2026-01-20
**Updated:** 2026-02-23

## Description

In CaTH AI, we have values.dev.yaml file which is being used only for local development. But values.dev.yaml file should only be use when we want to override values on values.yaml file. So, we need to refactor the code to make sure values.dev.yaml file should be used to override the values.yaml when needed.

**Acceptance criteria:**
 * End to end tests are passing on local
 * Github pipeline is passing

## Comments

### Comment by OgechiOkelu on 2026-02-23T16:31:36Z
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-02-23T16:35:31Z
Technical specification was generated (see spec comment on the issue).

### Comment by OgechiOkelu on 2026-02-23T16:39:26Z
@plan
