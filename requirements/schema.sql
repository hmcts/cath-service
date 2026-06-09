-- Requirements database (IBM DOORS-style traceability and change control)
--
-- Standalone SQLite database. Three tables:
--   requirement         - the core object; the row holds the CURRENT state
--   requirement_link    - directional, typed traceability between requirements
--   requirement_change  - append-only, field-level change log (the history)
--
-- Conventions: singular snake_case tables/columns, ISO8601 TEXT timestamps,
-- booleans as INTEGER 0/1, enums enforced via CHECK constraints.

PRAGMA foreign_keys = ON;

-- The core requirement object. Each row reflects the latest version only;
-- requirement_change holds how it got there.
CREATE TABLE requirement (
  id                  INTEGER PRIMARY KEY,

  -- Stable human identifier (e.g. 'REQ-0042'). Never reused, never changed,
  -- even if the text is rewritten. This is what links conceptually point at.
  ref                 TEXT NOT NULL UNIQUE,

  title               TEXT NOT NULL,
  statement           TEXT NOT NULL,                     -- the "The system shall..." text
  rationale           TEXT,                              -- why it exists

  kind                TEXT NOT NULL DEFAULT 'functional'
                        CHECK (kind IN ('functional', 'non_functional', 'constraint')),
  status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'proposed', 'approved', 'in_progress',
                                          'implemented', 'verified', 'obsolete')),
  priority            TEXT
                        CHECK (priority IN ('highest', 'high', 'medium', 'low', 'lowest')),

  -- Ticket granularity from the originating GitHub issue's type:* label.
  -- Orthogonal to kind: an epic or story can be functional or non-functional.
  granularity         TEXT
                        CHECK (granularity IN ('epic', 'story', 'task')),
  verification_method TEXT
                        CHECK (verification_method IN ('test', 'inspection',
                                                       'analysis', 'demonstration')),

  -- Origin: the GitHub issue the requirement derives from.
  issue_number        INTEGER,
  issue_url           TEXT,

  -- Refinement: the code that implemented it, filled in after implementation.
  impl_commit_sha     TEXT,
  impl_paths          TEXT,                              -- JSON array of file paths

  version             INTEGER NOT NULL DEFAULT 1,        -- current version number
  is_suspect          INTEGER NOT NULL DEFAULT 0
                        CHECK (is_suspect IN (0, 1)),    -- flagged when an upstream link changed

  created_at          TEXT NOT NULL,                     -- ISO8601
  updated_at          TEXT NOT NULL,
  created_by          TEXT,
  updated_by          TEXT
);

CREATE INDEX idx_requirement_status ON requirement (status);
CREATE INDEX idx_requirement_issue_number ON requirement (issue_number);

-- Directional, typed traceability links between requirements.
-- e.g. (source REQ-0043) derives_from (target REQ-0042).
CREATE TABLE requirement_link (
  id          INTEGER PRIMARY KEY,

  source_id   INTEGER NOT NULL REFERENCES requirement (id) ON DELETE CASCADE,
  target_id   INTEGER NOT NULL REFERENCES requirement (id) ON DELETE CASCADE,

  type        TEXT NOT NULL
                CHECK (type IN ('derives_from', 'refines', 'satisfies',
                                'depends_on', 'conflicts_with')),

  -- How the link was established. Structural origins are facts read from
  -- GitHub; 'inferred' links are derived from requirement content and are
  -- judgement, not fact (flagged is_suspect=1 until a human confirms them).
  origin      TEXT NOT NULL DEFAULT 'inferred'
                CHECK (origin IN ('github_subissue', 'issue_reference', 'inferred')),

  -- For inferred links: 0-1 confidence from the analysis. NULL for structural.
  confidence  REAL,
  -- For inferred links: why the link was proposed. NULL for structural.
  rationale   TEXT,

  -- Set when either end is edited (on a meaningful field) after the last
  -- review, prompting someone to re-check the link still holds. Also used to
  -- mark inferred links as needing review.
  is_suspect  INTEGER NOT NULL DEFAULT 0
                CHECK (is_suspect IN (0, 1)),

  created_at  TEXT NOT NULL,
  created_by  TEXT,

  UNIQUE (source_id, target_id, type),
  CHECK (source_id <> target_id)
);

CREATE INDEX idx_requirement_link_source ON requirement_link (source_id);
CREATE INDEX idx_requirement_link_target ON requirement_link (target_id);

-- Append-only, field-level change log. One row per changed field; rows sharing
-- the same (requirement_id, version) form one logical edit. The DOORS-native
-- approach: queryable audit trail and precise suspect-link flagging.
CREATE TABLE requirement_change (
  id              INTEGER PRIMARY KEY,

  requirement_id  INTEGER NOT NULL REFERENCES requirement (id) ON DELETE CASCADE,
  version         INTEGER NOT NULL,                      -- groups fields changed in one edit

  field           TEXT,                                  -- column name that changed; NULL for 'created'
  old_value       TEXT,                                  -- stringified previous value
  new_value       TEXT,                                  -- stringified new value

  change_type     TEXT NOT NULL
                    CHECK (change_type IN ('created', 'modified',
                                           'status_changed', 'deleted')),
  change_summary  TEXT,                                  -- optional reason for the change

  changed_by      TEXT,
  changed_at      TEXT NOT NULL
);

CREATE INDEX idx_requirement_change_requirement ON requirement_change (requirement_id, version);
CREATE INDEX idx_requirement_change_field ON requirement_change (field);
