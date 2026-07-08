# #563 Implementation Tasks

## Implementation Tasks

- [x] Add `lefthook` dev dependency to root `package.json` (pinned version)
- [x] Update `postinstall` script in root `package.json` to run `lefthook install` (CI-guarded) after `yarn db:generate`
- [x] Create `lefthook.yml` at repo root with pre-commit hook configuration (biome-check)
- [x] Run `yarn install` to install lefthook and trigger hook installation
- [x] Test hook by staging a file with a lint issue and committing - verify Biome auto-fixes and re-stages it
- [x] Update `CLAUDE.md` with a note about the pre-commit hook under Core Development Commands or a new Git Hooks section
