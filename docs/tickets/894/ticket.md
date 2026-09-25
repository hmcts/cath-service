# #894: Add the user_archive table and the 'Deleted accounts' MI Report option

**State:** OPEN
**Assignees:** alao-daniel (Daniel Alao)
**Author:** OgechiOkelu
**Labels:** (none)
**Created:** 2026-07-28T13:38:50Z
**Updated:** 2026-09-24T12:23:52Z

## Description

**PROBLEM STATEMENT**

Following the annual verification process of CaTH accounts, accounts that are not re-verified by CaTH users are deleted. Currently, the System Admin dashboard supports the download of the MI Report. However, there is a need for additional options to generate a report on the number of deleted accounts.

**AS A** Product Manager

**I WANT** to generate a report on the number of deleted accounts

**SO THAT** I can include the data in the analytical report

## Why a new table is needed

`deleteUserById` (`libs/system-admin-pages/src/user-management/queries.ts:107`) is a **hard delete**. The `user` table has no `deletedAt` column, and `audit_log` records only a free-text `details` string (`User: {email}`) with no queryable user ID, written only for manual System Admin deletions.

So this report cannot be built as a query over existing data. The deleted account's details must be retained at deletion time, in a dedicated archive table.

## Scope of this story

1. **Create the `user_archive` table** — schema, Prisma model and migration.
2. **Add the 'Deleted accounts' option** to the MI Report, reading from that table.

**Populating the table is out of scope here** and is delivered by #351 (CaTH Cron Trigger – Automated Inactive Accounts), which is the job that performs the deletions. This story creates the table the cron writes into and the report that reads it.

## The `user_archive` table

Columns follow the incumbent's `pi_user_archived` table (`pip-account-management` `V1.17__add_pi_user_archived_table.sql`):

```sql
CREATE TABLE IF NOT EXISTS pi_user_archived (
      user_id UUID PRIMARY KEY,
      user_provenance VARCHAR(255),
      provenance_user_id VARCHAR(255),
      email VARCHAR(255),
      roles VARCHAR(255),
      last_signed_in_date TIMESTAMP,
      archived_date TIMESTAMP
);
```

Per `CLAUDE.md`, all Prisma schemas live in `libs/postgres-prisma/prisma/schema/`, one file per domain, tables singular snake_case via `@@map`, fields camelCase in code and snake_case in the database via `@map`. So a new `libs/postgres-prisma/prisma/schema/user-archive.prisma`:

```prisma
model UserArchive {
  userId            String    @id @map("user_id") @db.Uuid
  userProvenance    String?   @map("user_provenance") @db.VarChar(255)
  provenanceUserId  String?   @map("provenance_user_id") @db.VarChar(255)
  email             String?   @db.VarChar(255)
  roles             String?   @db.VarChar(255)
  lastSignedInDate  DateTime? @map("last_signed_in_date")
  archivedDate      DateTime  @default(now()) @map("archived_date")

  @@index([archivedDate])
  @@map("user_archive")
}
```

Notes:

- `user_id` is the primary key and is **not** a foreign key to `user`. The row must survive the deletion of the user it describes, so a referential constraint would defeat the purpose.
- `archived_date` is indexed because the report is filtered by date range ("for the selected report duration"), so this is the query's driving predicate.
- All columns except the key are nullable in the reference. Keeping them nullable means an archive write can never fail on incomplete source data, which matters when the writer is a batch job deleting many accounts.
- **No `@relation` to `User`**, and no change to the `User` model.

### Divergences from CaTH's existing `user` table — please confirm

The reference column names do not match the equivalent columns in our own `user` table (`base.prisma:48-66`):

| `pi_user_archived` (reference) | CaTH `user` today | Divergence |
|---|---|---|
| `provenance_user_id` VARCHAR(255) | `user_provenance_id` VARCHAR(255) | **word order differs** |
| `roles` VARCHAR(255) | `role` VARCHAR(20) | **plural vs singular, and length** |
| `user_provenance` VARCHAR(255) | `user_provenance` VARCHAR(20) | **length differs** |

The schema above follows the reference exactly, as requested. That does mean the archive table and the live `user` table will name the same concepts differently, which is a readability cost for anyone joining them mentally. Recommendation: keep the reference names for parity with the incumbent's data, and note the mapping in the model. Confirm this rather than aligning to `user`, since realigning later would need a migration.

## ACCEPTANCE CRITERIA

- A `user_archive` table exists with the columns above, created via a Prisma migration in `libs/postgres-prisma/prisma/schema/`.
- The `UserArchive` Prisma model is available from `@hmcts/postgres-prisma` and covered by the generated client.
- In the 'Download MI Report' tab, another option titled 'Deleted accounts' is included in the 'Select report type' drop down options.
- Backend changes are implemented to support the generation of the 'Deleted accounts' report.
- The 'Deleted accounts' report should contain the total number of all deleted CaTH accounts and their CaTH IDs for the selected report duration.
- The report reads from `user_archive`, filtered on `archived_date` against the selected duration.
- The report returns an empty result (not an error) when no accounts were deleted in the selected duration — expected while #351 is outstanding and the table is still empty.
- The implementation of this requirement is dependent on #628

## Dependencies

- **#628 (MI Report Download)** — blocks the report half of this story. There is no `/mi-report` page, no report-type selector and no MI report generation code in the repository yet.
- **#351 (CaTH Cron Trigger – Automated Inactive Accounts)** — populates `user_archive`. Not a blocker for creating the table or building the report, but until it lands the report will legitimately return zero rows.

The table can be delivered ahead of both.

## Out of Scope

- **Writing rows into `user_archive`** — #351.
- Backfilling accounts already hard-deleted. Their details are gone; `audit_log` holds only a free-text `User: {email}` string with no user ID, so a backfill is not possible and the report will only cover deletions from this table's introduction onwards.
- Any change to the `user` table or to `deleteUserById`'s behaviour.

## Open Questions

1. **Manual deletions.** The AC says the report covers "**all** deleted CaTH accounts", but #351 only handles *automated* inactivity deletions. System Admins can also delete accounts by hand via `deleteUserById`. If only #351 writes to `user_archive`, manually-deleted accounts will be missing from the report and the AC is not met. Should the manual deletion path also write an archive row — and if so, is that in #351, this story, or a third ticket?
2. **Column naming** — see the divergence table above. Follow the reference, or align to CaTH's `user` table?
3. **`roles` content.** The reference column is plural `VARCHAR(255)` while our `user.role` holds a single value. Is a comma-separated list expected, or a single role written into a plural column for parity?
4. **Retention.** Is there a retention period after which archive rows should themselves be purged? A table of deleted users' email addresses is personal data being kept indefinitely, which likely needs a documented retention position.
5. **CaTH ID.** The AC asks for "their CaTH IDs". Confirm this means `user_id`, rather than `provenance_user_id` or the B2C object ID.

## References

- Reference table: `pip-account-management` `V1.17__add_pi_user_archived_table.sql`
- Mock-up: Deleted accounts MI Report Mock-up.docx
- Related: #628 (MI Report Download), #351 (populates the table)

> **Note:** an earlier technical plan on `feature/894-deleted-accounts-mi-report` proposed a table named `deleted_account` with a different column set. This description supersedes it — the table is `user_archive` with the columns above, and population moves to #351. That plan needs regenerating before implementation.

## Comments

### Comment by OgechiOkelu on 2026-08-05T11:25:57Z
@SPEC

### Comment by hmctsclaudecode on 2026-08-05T11:33:34Z
(Superseded technical specification proposing a `deleted_account` table with `AccountDeletionReason` enum, per-account records, write-path change to `deleteUserById`, and a two-sheet workbook. **The issue body above explicitly supersedes this** — the table is `user_archive` following the incumbent `pi_user_archived` columns, and population moves to #351. Retained here only for historical context. Useful reusable detail from it: the report Summary/detail sheet layout, the `all-data` tab addition, validation and access-control test scenarios, and the `libs/excel-generation` placement of the generator.)

### Comment by OgechiOkelu on 2026-08-05T11:34:34Z
@plan

### Comment by hmctsclaudecode on 2026-08-05T11:49:24Z
(Superseded plan comment describing the earlier `deleted_account` two-phase split. Same supersession note applies. Its list of **clarifications needed** remains relevant and is carried into `plan.md`'s CLARIFICATIONS NEEDED section.)
</content>
</invoke>
