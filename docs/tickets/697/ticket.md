# #697: Migrate from Azure Cache for Redis → Azure Managed Redis Migration

**State:** OPEN
**Assignees:** josh-uk
**Author:** junaidiqbalmoj
**Labels:** type:story, epic:public-journey
**Created:** 2026-06-10T12:15:01Z
**Updated:** 2026-11-17T09:11:47Z

## Description

Microsoft is retiring Azure Cache for Redis, and we are currently identifying the owning teams for Azure Cache for Redis instances and notifying them about the migration to Azure Managed Redis.
 Important limitation:

Azure Cache for Redis supports databases 0-15 (default), so if your connection string specifically selects databases other than 0, it will fail. Azure Managed Redis only supports database index 0.

Please review your applications for any use of non-zero Redis database indexes, as remediation may be required before migration.
Here is the migration runbook and guidance for updating Redis instances to Azure Managed Redis:
https://hmcts.github.io/cloud-native-platform/guides/migrating-to-managed-redis. 


https://hmcts-reform.slack.com/archives/CA4F2MAFR/p1780581352439719


## Comments

No comments on this issue.
