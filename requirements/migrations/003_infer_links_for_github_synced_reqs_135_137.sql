-- 003: infer links for github-synced reqs 135-137
--
-- Inferred traceability links for the three requirements added by the GitHub
-- sync in 002 (REQ-0135 #569, REQ-0136 #716, REQ-0137 #729). Live issue text
-- was read via the GitHub MCP server; sub-issue structure was checked and none
-- of the three has any (so there are no structural links to record — every link
-- below is judgement, not GitHub fact).
--
-- Same conventions as 001_inferred_links.sql: origin='inferred', is_suspect=1
-- (needs human review). Only net-new links are added here; nothing in 001 is
-- touched, and the UNIQUE(source_id, target_id, type) constraint guards dupes.
--
-- Candidates considered but DROPPED as too weak (shared topic / retrofitted
-- dependency on a pre-existing requirement, no concrete tie in the text):
--   135 -> 51  depends_on (blob ingestion predates the durable store)
--   37  -> 136 depends_on (API connection predates the app registration)
--   137 -> 121 refines    (same footer, but only a shared topic area)
--
-- To review:   SELECT * FROM requirement_link WHERE origin='inferred' ORDER BY confidence DESC;
-- To confirm:  UPDATE requirement_link SET is_suspect=0 WHERE id=...;
-- To reject:   DELETE FROM requirement_link WHERE id=...;

BEGIN TRANSACTION;

INSERT INTO requirement_link
  (source_id, target_id, type, origin, confidence, rationale, is_suspect, created_at)
VALUES
  (135, 127, 'depends_on', 'inferred', 0.6, 'The storage Terraform (135) adds azurerm_key_vault_secret resources into the cath Key Vault and reuses the cath-${env}-mi managed identity from the KV module, so it presupposes the bootstrap Key Vault infrastructure provisioned by 127.', 1, '2026-06-22T00:00:00Z'),
  (137, 86, 'refines', 'inferred', 0.6, 'Making the footer font size consistent (137) is a narrower, specific aspect of the broader header and footer update work described in REQ-0086.', 1, '2026-06-22T00:00:00Z');

COMMIT;
