-- Rename to the shared model name (pip-data-models ListType.java) in place, so the row keeps its id:
-- artefacts, subscriptions and sub-jurisdictions reference list_types.id. Runs before the deploy seed,
-- whose ON CONFLICT (name) then matches this row instead of inserting a new one.
--
-- #1077's 20261007120000_rename_list_types_to_shared_model makes the same rename; whichever runs second
-- matches no row. If both names already exist, the unique index on name fails the migration loudly.

UPDATE "list_types" SET "name" = 'BRISTOL_AND_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST', "updated_at" = NOW()
WHERE "name" = 'BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST';
