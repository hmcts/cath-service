# Hosted parity check

The [ui-baseline](../../tools/ui-baseline/README.md) parity check, run for testers in the test
environment (CaTH perftest, paired with pip test). From the browser, without running anything
locally, a tester can:

- check all of CaTH, some list types or some pages against the recorded pip baseline (page
  structure, text, accessibility, and the PDF and Excel files each list makes), and read the full
  report
- compare the PDF and Excel files pip and CaTH made for a publication they uploaded to both, by
  its artefact id in each

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

## Before it works in perftest

- Register `https://cath-cath-service-perftest-ui-baseline.perftest.platform.hmcts.net/sso/return`
  as a redirect URI on perftest's SSO app registration (`sso-client-id` in `cath-perftest`).
- Grant the CaTH perftest managed identity the Storage Blob Data Reader role on pip's test storage
  account (`pipsssatest`), for file comparisons. Without it, file comparisons fail with a message
  saying so.
- Add test accounts for the admin roles to `cath-perftest`, under the names in
  `tools/ui-baseline/environments.json`, so admin pages are compared too. Until then they are
  reported as not compared.
- Record and store a baseline: run the "UI baseline - record pip" workflow once.

## Running it locally

```bash
UI_BASELINE_AUTH_DISABLED=true UI_BASELINE_ENV=local yarn workspace @hmcts/ui-baseline-app dev
```

Then open <http://localhost:8090>. `UI_BASELINE_AUTH_DISABLED` is refused when `NODE_ENV` is
production. With `UI_BASELINE_ENV=local` it checks a local CaTH, and needs a stored baseline in
local Azurite's `ui-baseline` container (`yarn ui-baseline:baseline push --env local`).
