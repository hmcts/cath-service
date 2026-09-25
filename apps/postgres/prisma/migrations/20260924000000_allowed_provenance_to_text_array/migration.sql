-- Convert list_types.allowed_provenance from a comma-separated VARCHAR to a native text[].
-- Existing CSV values have whitespace stripped, are split on commas, and empty segments
-- dropped; empty/NULL become an empty array. A subquery is not permitted in a USING
-- transform, so per-element trimming is done with regexp_replace over the whole string.
ALTER TABLE "list_types"
  ALTER COLUMN "allowed_provenance" TYPE text[]
    USING (
      CASE
        WHEN "allowed_provenance" IS NULL OR btrim("allowed_provenance") = ''
          THEN ARRAY[]::text[]
        ELSE array_remove(
          string_to_array(regexp_replace("allowed_provenance", '\s', '', 'g'), ','),
          ''
        )
      END
    );
