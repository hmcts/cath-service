# Hosted parity check

The [ui-baseline](../../tools/ui-baseline/README.md) parity check, run for testers in the test
environment (CaTH perftest, paired with pip test). From the browser, without running anything
locally, a tester can:

- check all of CaTH, some list types or some pages against the recorded pip baseline (page
  structure, text, accessibility, and the PDF and Excel files each list makes), and read the full
  report
- compare the PDF and Excel files pip and CaTH made for a publication they uploaded to both, by
  its artefact id in each, with links to the list in each app

It is an internal tool for the CaTH team, so English only.

## Where it runs

Only in perftest: the umbrella chart includes it behind `uiBaseline.enabled`, which
`job.helm-deploy.yml` sets for perftest alone. It is deployed with release `cath-service-perftest`
at <https://cath-cath-service-perftest-ui-baseline.perftest.platform.hmcts.net>, a host in the
private DNS zone only, so it is reached on the HMCTS network.

## How it works

- **Runs** are queued and run one at a time (Chromium is memory-hungry, and checks seed the same
  environment), each as a child process of the tool's own scripts: `check.ts --env test` or
  `compare-files.ts`. A check of all of CaTH takes about half an hour.
- **The baseline** is the newest one stored in `cathsaperftest`/`ui-baseline` (recorded by the
  "UI baseline - record pip" workflow), fetched when the pod starts and again when a newer one is
  stored.
- **Results** are archived to the same container when a run finishes, and restored from it when
  someone opens a run after the pod has restarted.
- **Sign-in** is Entra ID through CaTH's own SSO app registration in the environment. Only members
  of CaTH's admin groups get in (or the groups in `UI_BASELINE_ALLOWED_GROUP_IDS`), looked up through
  Microsoft Graph as CaTH does.

### Signing in, and the two apps it checks

CaTH perftest and pip test sign staff in through the same Entra tenant, the same SSO app
registration and the same admin groups, and this app uses them too. So a tester signed in here is
signed in to both apps' staff pages in their own browser, without being asked again, with the same
admin role in each.

The app itself cannot use a tester's sign-in to reach either app: CaTH and pip only make a session
from their own sign-in callback, and the token this app gets is for this app (`openid profile
email`), not for them or for Azure storage. Checks therefore sign in as test accounts, and because
the groups are shared, one account per admin role works in both apps.

## Before it works in perftest

- Register `https://cath-cath-service-perftest-ui-baseline.perftest.platform.hmcts.net/sso/return`
  as a redirect URI on perftest's SSO app registration (`sso-client-id` in `cath-perftest`). It is
  the same registration as pip test's (`sso-client-id` in `pip-ss-kv-test`), so agree it with the pip
  team.
- Grant the CaTH perftest managed identity the Storage Blob Data Reader role on pip's test storage
  account (`pipsssatest`), for file comparisons. Without it, file comparisons fail with a message
  saying so.
- Add test accounts for the admin roles to `cath-perftest`, under the names in
  `tools/ui-baseline/environments.json`, so admin pages are compared too. Until then they are
  reported as not compared. Each needs to be in the matching admin group (`sso-sg-*`), which pip
  test shares, so the same accounts sign in to pip test too.
- Record and store a baseline: run the "UI baseline - record pip" workflow once.

## Running it locally

```bash
UI_BASELINE_AUTH_DISABLED=true UI_BASELINE_ENV=local yarn workspace @hmcts/ui-baseline-app dev
```

Then open <http://localhost:8090>. `UI_BASELINE_AUTH_DISABLED` is refused when `NODE_ENV` is
production. With `UI_BASELINE_ENV=local` it checks a local CaTH, and needs a stored baseline in
local Azurite's `ui-baseline` container (`yarn ui-baseline:baseline push --env local`).
