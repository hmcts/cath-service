# Impact Rating Criteria

Use these criteria to assign a consistent Low, Medium, or High rating. Pick the highest level for which any criterion applies.

---

## Low

**Definition:** The feature is greenfield — no existing code needs to change.

**Criteria (any one is sufficient):**
- New page or route at a URL that does not currently exist in `libs/*/src/pages/` or `libs/*/src/routes/`
- New database table, or new optional columns added to an existing table
- No changes required to shared utilities, middleware, or auth flows
- No existing tests would need to be updated

**Examples:**
- Adding a new list type page with its own template and locale files
- A new standalone form journey at a new URL
- A new API endpoint that reads from an existing table without modifying it

---

## Medium

**Definition:** Some existing modules need targeted changes, but core systems are unaffected.

**Criteria (any one is sufficient):**
- Modifying the behaviour of an existing page, or inserting a new step into an existing journey
- Adding a required column to an existing database table
- Changing a shared utility that has a small, known set of callers (≤3 modules)
- Existing tests would need updating but not rewriting
- New content or Welsh translations required on an existing page

**Examples:**
- Adding Welsh content to a page that only has English
- Extending an existing API endpoint to accept a new optional parameter
- Adding a validation rule to an existing form

---

## High

**Definition:** Core systems are affected or significant cross-cutting changes are required.

**Criteria (any one is sufficient):**
- Changes to authentication, session handling, or shared middleware
- Database schema changes that affect multiple existing models, or a migration requiring data transformation
- Modifying a pattern used across many pages or routes (e.g. how locale resolution works, how artefacts are fetched)
- Changes likely to require updates across more than 3 unrelated modules
- Breaking changes to a shared interface consumed by multiple packages

**Examples:**
- Replacing or reconfiguring the auth provider
- Changing the artefact ingestion pipeline or PDF generation interface
- Altering how the bilingual locale system resolves content across all pages
