# #290: Create hook for lint style check and any TypeScript errors - Implementation Tasks

## Implementation Tasks

### Resolve pre-existing errors first
- [ ] Run `yarn typecheck` from the root and fix all existing TypeScript errors across the monorepo before enabling the hook

### Install Husky
- [ ] Add Husky as a root devDependency: `yarn add --dev husky@9.1.7 -W`
- [ ] Add `"prepare": "husky"` to the `scripts` section of the root `package.json`

### Initialise Husky
- [ ] Run `yarn husky init` to create the `.husky/` directory and register the git hooks path
- [ ] Remove or empty the default `.husky/pre-commit` file created by `init` (this project uses `pre-push`)

### Create the pre-push hook
- [ ] Create `.husky/pre-push` with the following content:
  ```sh
  yarn lint:changed
  yarn typecheck:changed
  ```

### Add root typecheck scripts
- [ ] Add `"typecheck": "turbo typecheck"` to `scripts` in the root `package.json`
- [ ] Add `"typecheck:changed": "turbo typecheck --filter='...[HEAD^1]'"` to `scripts` in the root `package.json`

### Update turbo.json
- [ ] Rename the `"type-check"` task to `"typecheck"` in `turbo.json` (keeping `dependsOn: ["^build"]` and `outputs: []`)
- [ ] Remove the old `"type-check"` entry

### Add typecheck script to app packages
- [ ] Add `"typecheck": "tsc --noEmit"` to `apps/api/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `apps/crons/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `apps/postgres/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `apps/web/package.json`

### Add typecheck script to lib packages
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/account/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/admin-pages/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/api/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/auth/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/cloud-native-platform/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/location/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/notification/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/notifications/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/public-pages/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/publication/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/redis/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/simple-router/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/subscriptions/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/system-admin-pages/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/verified-pages/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/web-core/package.json`

### Add typecheck script to list-type sub-packages
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/list-types/administrative-court-daily-cause-list/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/list-types/care-standards-tribunal-weekly-hearing-list/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/list-types/civil-and-family-daily-cause-list/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/list-types/common/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/list-types/court-of-appeal-civil-daily-cause-list/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/list-types/london-administrative-court-daily-cause-list/package.json`
- [ ] Add `"typecheck": "tsc --noEmit"` to `libs/list-types/rcj-standard-daily-cause-list/package.json`

### Verify hooks are installed
- [ ] Run `yarn install` from the root to trigger the `prepare` script and confirm `.git/hooks/pre-push` is created
- [ ] Confirm the hook file is executable: `ls -la .git/hooks/pre-push`

### Test the hook manually
- [ ] Make a trivial change, commit it, and run `git push` to confirm the hook fires and passes on clean code
- [ ] Introduce a deliberate lint error, attempt a push, and confirm the push is blocked with a clear error message
- [ ] Introduce a deliberate TypeScript error, attempt a push, and confirm the push is blocked with a clear error message
- [ ] Confirm `git push --no-verify` bypasses the hook when needed
