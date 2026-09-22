-- Display dates are optional in the CaTH Inbound Publication API contract
-- (x-display-from / x-display-to). Existing rows are unaffected.
ALTER TABLE "artefact" ALTER COLUMN "display_from" DROP NOT NULL;
ALTER TABLE "artefact" ALTER COLUMN "display_to" DROP NOT NULL;
