-- B2C_IDAM was this service's own name for the platform-standard PI_AAD provenance
-- (pip-data-models UserProvenances). Media accounts were written with B2C_IDAM while the
-- B2C sign-in session and list-type allowed_provenance use PI_AAD. Normalise stored rows.
-- Idempotent: re-running matches no rows.
UPDATE "user" SET "user_provenance" = 'PI_AAD' WHERE "user_provenance" = 'B2C_IDAM';
