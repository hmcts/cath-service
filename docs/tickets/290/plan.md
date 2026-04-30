# Technical Plan: Pre-push Git Hook for Lint and TypeScript Validation

## Technical Approach

Add a pre-push git hook using Husky v9 that runs `yarn lint` and `yarn type-check` before allowing a push. This catches lint and TypeScript errors locally before they reach CI.

## Implementation Details

### 1. Husky Setup
- Add `husky@9.1.7` as devDependency in root `package.json`
- Add `"prepare": "husky"` script for auto-install on `yarn install`
- Create `.husky/pre-push` hook running `yarn lint && yarn type-check`

### 2. TypeScript Checking
- Add `"type-check": "tsc --noEmit"` to all 30 workspace `package.json` files
- Add `"type-check": "turbo type-check"` to root `package.json`
- Reuse existing `type-check` task already defined in `turbo.json`

### 3. CI Integration
- Add `type-check` job to `.github/workflows/test.yml`
- Mirrors existing `lint` job pattern with PR filtering
- Includes `yarn db:generate` step for Prisma types

## Files Changed

| File | Change |
|------|--------|
| `package.json` (root) | Add husky dep, prepare/type-check scripts |
| `.husky/pre-push` | New: pre-push hook |
| `apps/*/package.json` (4) | Add type-check script |
| `libs/*/package.json` (26) | Add type-check script |
| `.github/workflows/test.yml` | Add type-check CI job |

## Acceptance Criteria Mapping

- Hook blocks push with lint errors: `yarn lint` in pre-push hook
- Hook blocks push with TS errors: `yarn type-check` in pre-push hook
- Clean push proceeds: both commands exit 0
- Bypass with `--no-verify`: standard git behavior with husky
- Auto-install for new contributors: `prepare` script runs on `yarn install`
