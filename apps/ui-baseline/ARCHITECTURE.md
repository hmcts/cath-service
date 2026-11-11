# How the UI baseline works

How the parts of `apps/ui-baseline` fit together: what records the pip baseline, what a check does
stage by stage, how a page is captured and compared, how a check leaves a shared CaTH as it found
it, and how the hosted check runs in aat. The [README](README.md) says how to use it; this page says
how it works. The diagrams are [Mermaid](https://mermaid.js.org/), which GitHub draws.

## The parts

```mermaid
flowchart LR
  dev(["Developer<br/>yarn ui-baseline:*"])
  tester(["Tester<br/>browser, over the VPN"])

  subgraph tool["apps/ui-baseline"]
    hosted["Hosted check<br/>src/ (Express)"]
    runner["Runner<br/>src/runs.ts"]
    check["check.ts"]
    files["compare-files.ts"]
    record["record-pip<br/>pip/baseline.sh"]
  end

  subgraph cath["CaTH (local or AAT)"]
    web["web"]
    api["api<br/>publication API, test-support"]
  end

  subgraph pip["pip (pinned in Docker, or pip test)"]
    pipfe["pip-frontend"]
    pipapis["data and account management"]
  end

  subgraph azure["Azure (aat)"]
    store[("cathsaaat<br/>ui-baseline: baselines, runs<br/>publications: CaTH's files")]
    vault[("cath-aat key vault<br/>IDAM test account,<br/>publication API client")]
  end

  idam["AAT IDAM"]

  dev --> check & files & record
  tester --> hosted --> runner --> check & files
  record --> pipapis & pipfe
  record -- "baseline push" --> store
  check -- "seed, test-support" --> api
  check -- "capture pages" --> web
  check -- "baseline pull, CaTH's files" --> store
  check & files -- "secrets" --> vault
  check & files -- "sign in" --> idam
  files -- "pip's files, signed in" --> pipfe
  runner -- "runs and reports" --> store
```

- The **command line** (`yarn ui-baseline:check`, `compare-files`, `record-pip`) runs the scripts
  directly, against a local CaTH or CaTH AAT (`--env`, [`environments.json`](environments.json)).
- The **hosted check** (`src/`) is an Express app in aat. It runs the same scripts as child
  processes, one at a time, so a check started from the browser is the one a developer runs.
- **pip** is only ever read from or recorded, never changed outside a recording's own data.

## Recording the baseline

```mermaid
flowchart TD
  start(["yarn ui-baseline:record-pip<br/>or the record workflow"]) --> where{"Which pip?"}
  where -- "local (default)" --> setup["pip/setup.sh<br/>clone at pinned commits, run in Docker"]
  where -- "--env aat (pip test)" --> token["pip/run.ts<br/>a run token for what it seeds"]
  setup & token --> seed["pip/seed.ts<br/>fixtures/ through pip's own APIs"]
  seed --> lists["Capture list pages<br/>core/cli.ts capture"]
  lists --> genfiles["Record PDF, Excel and flat files"]
  genfiles --> pages["Capture other pages<br/>routes/pip-routes.json"]
  pages --> dl["Record downloads<br/>routes/downloads.json"]
  dl --> journeys["Run pip's journeys<br/>local pip only"]
  journeys --> summary["run.json"]
  summary --> ok{"Any capture failed<br/>or missing?"}
  ok -- "yes" --> fail(["Exit 1: nothing is stored"])
  ok -- "no" --> push["baseline push<br/>cathsaaat/ui-baseline, as latest"]
  token -. "after the recording" .-> clean["pip/cleanup.ts<br/>removes the run's data from pip test"]
```

Both apps are seeded from the same committed fixtures (`fixtures/`), so pip's pages in the
baseline and CaTH's pages in a check show the same lists, users and records. A recording fails,
and is never stored, if any page, language or width it was asked for did not reach its index
(`pip/baseline.sh`), so an empty or partial baseline can never become the latest. With the
workflow's `store` input off, the whole recording is kept as a workflow artifact instead.

## A check, stage by stage

```mermaid
flowchart TD
  scope["What to check<br/>--ticket, --list-type, --route,<br/>--journey or --all (scope.ts)"] --> seed
  seed["Seed CaTH<br/>cath/seed.ts"] --> signin["Sign in to CaTH<br/>cath/sign-in.ts, and seed records"]
  signin --> capture["Capture lists and pages<br/>one queue, one browser<br/>(captureBatches)"]
  capture --> journeys["Run journeys<br/>local CaTH only"]
  journeys --> compare["Compare with pip<br/>core/compare/compare.ts"]
  compare --> filecmp["Compare PDF, Excel and downloads<br/>core/compare/file-compare.ts"]
  filecmp --> remove["Remove what was seeded<br/>shared CaTH only"]
  remove --> review["Review differences against the ticket<br/>core/review/, 4 reviewers at once"]
  review --> report["Write the report<br/>report/make-report.mjs"]
  report --> evidence["Write PR evidence<br/>--post-pr posts it"]

  capture -. "a step fails, or the check is stopped" .-> remove
```

Every stage records its progress in `progress.json` ([`progress.ts`](progress.ts)), which is what
the hosted check's run page shows. Stages a check does not need (no journeys in scope, no ticket
to review against) are marked as skipped with the reason.

## Capturing one page

```mermaid
flowchart LR
  ctx["New browser context<br/>request tracking on<br/>(core/capture/settle.ts)"] --> go["Open the page in its language<br/>wait for load, then for its own<br/>fetches to be quiet for 100 ms"]
  go --> snap["capturePage<br/>accessibility tree of main<br/>and of the whole page,<br/>text, HTML, meta, axe,<br/>screenshots"]
  snap --> more{"Collapsed content<br/>to open?"}
  more -- "yes" --> expanded["Open it, capture again<br/>as 'expanded'"]
  more -- "no" --> done(["index.jsonl"])
  expanded --> done
```

Each page is captured in English and Welsh, at desktop width (with collapsed content opened when
there is some) and at mobile width, and as each role pip shows it to. Captures run several at once
(`--concurrency`, 6 in the hosted check). A page is read once it has loaded and its own `fetch` and
XHR requests have been quiet for 100 ms, which waits for CaTH's court search to build its list
without Playwright's fixed 500 ms network-idle wait.

## Comparing a page

```mermaid
flowchart TD
  pair["Pair pip's capture with CaTH's<br/>by page, language and state"] --> cross{"Only one app<br/>has an 'expanded' state?"}
  cross -- "yes" --> across["Compare it with the other app's page<br/>as it first appears,<br/>with a 'collapsed-content' finding"]
  cross -- "no" --> norm
  across --> norm["Normalise both<br/>ids, run dates and times (London),<br/>run tokens, quotes, local hosts"]
  norm --> findings["Findings: headings, tables, controls,<br/>buttons, links, where links lead,<br/>text, page frame, meta, axe"]
  findings --> verdict{"Any difference?"}
  verdict -- "yes" --> differs(["differs"])
  verdict -- "no" --> match(["match"])
  pair -. "CaTH has no capture of the page" .-> missing(["not compared"])
```

Values that differ between runs without meaning anything are normalised first
([`normalise.ts`](core/compare/normalise.ts)): ids, dates and times derived from when the data was
seeded (counted in London time, as both apps show them), a run's token on the courts and records it
seeded, curly and straight quotes. Each CaTH page is also checked for accessibility on its own
(`core/compare/accessibility.ts`), so a problem CaTH copied from pip is still reported.

## Seeding a shared CaTH (AAT) and leaving it as it was

Other people use CaTH AAT, so a check works as CaTH's own E2E tests do: it publishes through the
real publication API to courts of its own, and removes everything it seeded when it ends.

```mermaid
sequenceDiagram
  participant C as check.ts
  participant S as cath/seed.ts
  participant I as cath/sign-in.ts
  participant T as CaTH test-support
  participant P as CaTH publication API

  C->>S: seed the fixtures in scope
  S->>T: remove runs over 3 hours old (cath/run.ts)
  S->>T: POST /test-support/locations: a copy of each fixture court,<br/>named with the run token and the court name
  S->>P: POST /publication to the run's courts (API client from cath-aat)
  S-->>C: seed record: run token, the run's courts, artefact ids
  C->>I: sign in and seed records
  I->>T: subscriptions on the run's courts, and a media application,<br/>third-party users and an audit entry named with the run token
  Note over C: capture, compare, compare files
  C->>T: remove the run: its records, what was published to its courts,<br/>their subscriptions, then the courts
```

- **Nobody else is notified.** Nobody else subscribes to the run's courts, and the test account's
  own subscriptions are made after publishing. Third-party subscribers to a list type are still
  sent its lists, as with the E2E tests, as CaTH chooses them by list type, not court.
- **The run is removed however the check ends**: after the file comparison, when a later step
  fails (an `await using` disposal around the rest of `check.ts`), or when the check is stopped
  (`SIGTERM`, `SIGINT`). If `seed.ts` itself fails partway, it removes its own courts.
- **Anything left behind is found again by its token.** A run that could not be removed (the pod
  was killed, say) is removed by a later check once it is three hours old. The courts go last, so
  a removal that fails partway leaves the courts for the next check to find the run by. Audit
  entries stay, as an audit trail does, with the token in their details.
- **Locally**, CaTH is seeded at the fixture courts themselves (`location-data.ts`), and the
  publication is processed in this process, without notifications.

## The hosted check's runs

```mermaid
sequenceDiagram
  actor T as Tester
  participant A as src/app.ts
  participant R as src/runs.ts
  participant X as check.ts (child)
  participant B as cathsaaat/ui-baseline

  T->>A: POST /runs (form token and same-site checks)
  A->>R: start: validated against cli-input.ts
  R->>B: store the run, queued
  R->>X: spawn in its own process group, 2-hour limit
  loop every minute while it runs
    R->>B: store the run again (heartbeat)
  end
  X-->>R: exit code
  R->>B: archive the run's directory, store it finished
  T->>A: GET /runs/:id (progress, log, report)
```

- **One run at a time.** Chromium is memory-hungry and checks seed the same environment, so runs
  queue. A run that goes past its two-hour limit is sent `SIGTERM` (a check removes what it
  seeded) and, two minutes later, `SIGKILL`, to its whole process group so its Chromium goes too.
- **Redeploys do not cut a run short.** A master merge starts a new pod, then stops the old one
  with `SIGTERM`. The old pod starts no new run, fails any queued ones with a message to start them
  again, and finishes the one it has going (`terminationGracePeriodSeconds: 7500`). The new pod
  sees that run's recent heartbeat, leaves it running and watches it until it ends; a run whose
  heartbeat stopped more than three minutes ago is marked interrupted.
- **File comparisons** read CaTH's files from `cathsaaat` and pip's from pip-frontend
  (`/list-download-files`), signed in as the IDAM test account, as a verified user downloads them,
  so the pod needs no access to pip's storage ([`artefact-files.ts`](artefact-files.ts)).
- **Access** is the VPN: the host is in the private DNS zone with no Front Door route. There is no
  sign-in; each form carries a token matched to a `SameSite=Strict` cookie, and a cross-site post
  is refused ([`request-forgery.ts`](src/request-forgery.ts)).

## Building and deploying it

```mermaid
flowchart LR
  subgraph pr["Pull request"]
    tests["ui-baseline's tests<br/>(job.test.yml)"]
    verify["Build the ui-baseline stage, not pushed,<br/>only when apps/ui-baseline/, the Dockerfile<br/>or .dockerignore changed"]
  end
  subgraph master["Merge to master"]
    build["Build and push the image<br/>when Turborepo says it is affected"]
    deploy["Deploy to aat only<br/>(uiBaseline.enabled)"]
    promote["Promote web, api, crons, postgres<br/>to prod: never ui-baseline"]
  end
  pr --> master
  build --> deploy --> promote
```

The apps deployed to aat only are listed once, in
[`.github/workflows/jobs/aat-only-apps`](../../.github/workflows/jobs/aat-only-apps). That list
keeps ui-baseline out of pull request image builds (preview never deploys it), out of promotion to
prod, and out of the images demo, ithc and perftest look up. ui-baseline declares every workspace
library it uses, including each list type it seeds with, so a change to any of them rebuilds its
image on master (`package.test.ts` keeps the list complete).

## Where things are kept

| What | Where |
|---|---|
| Recorded baselines | `cathsaaat`, container `ui-baseline`, `baselines/`; locally `output/baseline` and Azurite |
| Hosted runs and their reports | `cathsaaat`, container `ui-baseline`, `runs/`; the pod's disk while it runs |
| CaTH's generated PDF and Excel files | CaTH's `publications` container |
| pip's generated files (hosted file comparisons) | Downloaded from pip-frontend as the test account |
| The IDAM test account, publication API client | `cath-aat` key vault |
| What a check seeded | CaTH itself, under the run's token; `output/seed/` holds the record for the check |
| Fixtures both apps are seeded with | `fixtures/` |
| Which pip page matches which CaTH page | `routes/route-map.json` |
