# UI baseline

A recorded baseline of every screen in pip-frontend (the service CaTH replaces), and a check that
compares a CaTH screen against it. Use it when building a screen: run the check for your ticket,
fix what it finds, and attach the evidence to your PR.

Screens are compared by their **accessibility tree** (headings, tables, form controls, buttons,
links and text, as a screen reader would meet them), plus page details and axe accessibility
results. Screenshots are evidence for people, not something the comparison diffs.

> **This is a first prototype.** It is usable now, and the team should start using it on screen
> tickets straight away, but it has known gaps (see [Limits](#limits) and
> [Not done yet](#not-done-yet)) that will be closed as it is developed. If it gets something
> wrong or gets in your way, say so: that feedback decides what gets fixed first.

## Getting the pip baseline

The baseline is not committed: screenshots and videos are too big for git. It is recorded from
pinned pip commits and the committed fixtures, so any two recordings match, and the latest
recording is stored in the test environment (`cathsaperftest`, container `ui-baseline`). Fetch it
rather than recording your own:

```bash
yarn ui-baseline:baseline pull --env test   # the stored baseline, into output/baseline (needs az login)
```

The "UI baseline - record pip" workflow (`workflow.ui-baseline-record.yml`, run by hand) records it
on a GitHub runner and stores it in the test environment. Re-run it when the pinned pip commits or
the fixtures change. To record one yourself:

```bash
yarn ui-baseline:record-pip
yarn ui-baseline:baseline push     # optional: store it as the latest, in local Azurite
```

`push` and `pull` default to `--env local`: local Azurite's `ui-baseline` container, through
`AZURE_STORAGE_CONNECTION_STRING` in the root `.env`, which is where the locally run hosted check
reads it. Only the record workflow stores to the test environment (`--env test`).

This needs Docker, Node and corepack, and nothing else from pip. pip is memory-hungry (its two
backends alone use about 2 GB), so stop CaTH while recording; the recording fails with an error,
rather than leaving an incomplete baseline, if pip runs out of memory. It clones pip-frontend,
pip-data-management and pip-account-management at the pinned commits (into
`~/.cache/ui-baseline/pip`, or `$UI_BASELINE_PIP_DIR`), adds a local-only sign-in to pip-frontend
(`pip/pip-frontend.patch`), builds the backends in Docker, starts pip on <https://localhost:8180>,
seeds it, and records every page and journey, and the PDF and Excel files pip generated for each
publication, into `output/baseline`. The first run takes about 35 minutes (10 to set up pip, 25 to
record); re-recording skips the setup.

To record only what one ticket needs, which is much quicker than all of pip:

```bash
yarn ui-baseline:record-pip --ticket 312
yarn ui-baseline:check --ticket 312
```

That records the list types and pages the ticket names, picked by the same rules the check uses to
choose what to compare (`scope.ts`), with their role variants and mobile captures, into
`output/baselines/ticket-312`. `check --ticket 312` then uses it instead of `output/baseline`.
`--list-type NAME`, `--route /path` and `--journey ID` choose without a ticket (or add journeys,
which a ticket's text does not name); pass `--baseline` to the check to use one of those. pip is still
recreated and seeded in full, so setting up pip takes as long as before; only the recording is shorter.
A ticket recording is a baseline of its own: pip gives its data new ids on every fresh stack, and
each baseline's `seed.json` maps the ids in its own captures, so it cannot be merged into another
recording. `baseline push` refuses one, so the stored baseline is always all of pip.

In the workspace devcontainer, Docker is Docker Desktop on the host, so `$UI_BASELINE_PIP_DIR`
must be a path the host shares (inside the workspace folder), and outside cath-service: pip-frontend
builds against CaTH's `node_modules` if it is anywhere under the monorepo.

It uses ports 8180, 15432, 16379, 16969, 18090 and 20000, so it can run alongside CaTH. pip stays
running afterwards so you can look at it; `yarn ui-baseline:stop-pip` stops it. The check itself
only needs the recorded baseline, not pip.

To browse the baseline on its own, with neither pip nor CaTH running:

```bash
yarn ui-baseline:report    # builds the report from output/baseline and serves it on http://localhost:9500
```

It takes a baseline directory and a port as arguments, or reads `$PARITY_BASELINE`.

## Checking a ticket

With CaTH running locally (`yarn dev`) and a recorded baseline:

```bash
yarn ui-baseline:check --ticket 591                  # check, write the evidence
yarn ui-baseline:check --ticket 591 --post-pr 1234   # also post (or update) the PR comment
```

The check:

1. works out what to check from the ticket: list types it names (e.g. `COP_DAILY_CAUSE_LIST`) and
   page routes it names (e.g. `/summary-of-publications`)
2. seeds local CaTH with the same publications the baseline was made from, and signs in the same
   users for pages behind sign-in (see [Signing in to CaTH](#signing-in-to-cath))
3. captures those CaTH screens in English and Welsh
4. compares them with the baseline
5. has a reviewer judge each difference against the ticket: **intended** (the ticket asks for it,
   quoted), **defect**, or **needs a human**. A difference the reviewer gives no usable verdict for,
   or one in a batch the reviewer failed on, needs a human; the PR comment says when that happened
6. writes the evidence to `output/checks/ticket-<n>/evidence/`

| Evidence file | What it is |
|---|---|
| `pr-comment.md` | The summary for the PR: verdicts, findings, pages checked, the commit checked |
| `report.zip` | The full report for the pages in scope. Unzip and open `index.html` |
| `<page>-<en\|cy>.png` | pip and CaTH side by side, one per page and language that differs |

GitHub only takes attachments through its web editor, so paste `pr-comment.md` into a PR
comment (or use `--post-pr`), then drag the other files into it. Re-running updates the same
comment. The comment names the commit it checked and flags uncommitted changes, so reviewers can
tell when the evidence is out of date.

### Investigating what needs a human

The review judges each difference from the difference alone, so plenty come back as needing a
human. `--investigate N` looks again at up to N of them in each area, one at a time, with a
reviewer that can read (and only read) pip's source, CaTH's source and both apps' captures of the
area:

```bash
yarn ui-baseline:check --ticket 591 --investigate 10
```

The investigator decides what to read next from what it has found, and stops when it can give a
verdict. Its evidence names the files it relied on, and the PR comment marks its verdicts with 🔎.
An item it cannot decide, or that takes more than 15 turns, stays with a human. pip's source is
read from `$UI_BASELINE_PIP_DIR` (default `~/.cache/ui-baseline/pip`, where `record-pip` clones
it); without it, the investigator reads CaTH and the captures only. Each item is a Claude Code
session of its own, so it is slower and costs more than the review: keep N small.

Expected differences come only from the ticket. If the reviewer marks something a defect that the
team has agreed to change, update the ticket and re-run; there is no allow-list.

To compare the whole of CaTH against the whole baseline, rather than one ticket:

```bash
yarn ui-baseline:check --all --serve
```

That checks every list type in the fixtures and every page `routes/route-map.json` maps
confidently, skipping the same pages a ticket check would (unreviewed suggestions, journey steps),
and runs every journey ported to CaTH. It writes the full report, with journeys and the Comparison
page, to `output/checks/all/`, and no PR evidence.

To check one of pip's journeys in CaTH:

```bash
yarn ui-baseline:check --journey subscription-basket
```

That runs CaTH's port of the journey (`cath/journeys/`) in English and Welsh, signed in as the
same fixture user, and compares it with pip's step by step. Steps are paired by checkpoint name, so
the check reports a step CaTH never reaches, one it reaches in a different order, or one only CaTH
has. It also reports a step that lands on a page other than the one `routes/route-map.json` maps
pip's page to (confident entries only), and how each step's page compares, as for a single page. A
journey not ported to CaTH yet is listed as not compared. The PR comment gets a Journeys section,
and the report shows CaTH's capture beneath each of pip's steps.

Other options: `--list-type NAME`, `--route /path` and `--journey ID` to check without a ticket, `--locale en|cy`,
`--env local|test`, `--no-seed`, `--no-review`, `--no-files`, `--reviewer "<command>"` (default:
`claude -p` with no tools and a JSON schema for its answer; any command that reads the prompt on stdin
and prints JSON will do), `--investigate N`, `--serve` to browse the report on <http://localhost:9500>.
It exits 3 when there are defects (`exit-codes.ts`).

### Checking the test environment

`--env test` checks the deployed CaTH in perftest instead of a local one (`environments.json`;
perftest is paired with pip's test environment, as CaTH's own chart pairs them). It runs master,
gets little other traffic, and has test-support on. Nothing needs to run locally, but you need `az
login` with access to the `cath-perftest` vault, and to be on the HMCTS network:

```bash
yarn ui-baseline:check --env test --all
```

Testers can run the same check without any of this from the [hosted check](../../apps/ui-baseline/README.md).

Against a deployed CaTH the check seeds through the real publication API, with the client
credentials in the environment's vault, and signs in as real test accounts (see below). The
publication API takes a list as JSON, so a non-strategic list's Excel file, which CaTH makes from
the uploaded spreadsheet, is not made, and is reported as not compared rather than missing.

### Signing in to CaTH

Pages behind sign-in are captured as the same fixture user pip's baseline used (`captureAs` in
`routes/pip-routes.json`, `viewAs` for classified lists).

- **Locally**, CaTH has no identity providers, and CaTH gets no sign-in route for this:
  `cath/session-sign-in.ts` creates the users in `fixtures/users.json` in CaTH's database, writes
  the session a real sign-in leaves behind into CaTH's Redis, and the check sends that session's
  cookie. It needs the `SESSION_SECRET` and `REDIS_URL` from the root `.env` that CaTH's web app
  runs with, so it only works against a local CaTH.
- **In the test environment**, `cath/account-sign-in.ts` signs in through CaTH's real sign-in
  flows (SSO, Crime IDAM, CFT IDAM) as the test account `environments.json` names for each role,
  read from the environment's vault. Fixture users with the same role share its account, so the
  page shows the account's name. A role with no account in the vault is reported, and its pages
  are not compared. The records signed-in pages show are created through test-support.

CaTH has no super admins, so pip's super admins are signed in to CaTH as the admin role with the
same reach (CTSC or local).

## Comparing PDF and Excel files

When a publication is accepted, pip and CaTH each write a PDF and, for some lists, an Excel file
to their `publications` container (`<artefactId>.pdf`, `<artefactId>.xlsx`, and for pip's
bilingual lists `<artefactId>_cy.pdf`). The check compares them for every list it checks: the
baseline holds pip's (`files/`), and the check collects CaTH's after seeding. The report's "PDF
and Excel" page, the summary and the PR comment show the result.

- **PDFs** are styled differently by design, so only their text is compared, word by word in
  reading order. Line breaks, page breaks and pip's page footer are ignored; any other change of
  wording is reported with the words before it.
- **Excel files** should be the same, so every sheet (name and order), cell (type and value) and
  merged range is compared. They can never be byte-identical (pip writes them with Apache POI and
  CaTH with exceljs), and fonts and column widths are not compared.
- Dates and times that come from when each app was seeded are masked, as on pages.

For a list a tester uploaded to both apps by hand, compare the two without seeding anything:

```bash
yarn ui-baseline:compare-files --pip <artefact id in pip> --cath <artefact id in CaTH> [--env test] [--name civil-list]
```

It also prints the list's page in each app; staff sign-in is shared between CaTH perftest and pip
test, so whoever is signed in to one is signed in to the other. This reads pip's files from pip's test storage account (`pipsssatest`), which needs the Storage Blob
Data Reader role on it, or a connection string in `PIP_STORAGE_CONNECTION_STRING`.

## What the baseline covers

Recorded from pip-frontend `f9ccef8a`, pip-data-management `7fe83c36` and pip-account-management
`0c1016af`, run locally (`pip/`), seeded through pip's real APIs from the fixtures in `fixtures/`.
Every capture is in English and Welsh.

| pip routes | Covered | Not covered |
|---|---|---|
| List pages (89) | All 72 non-deprecated list pages, default and expanded; 8 flat-file-only types as their entry on the summary of publications page | 17 deprecated list types |
| Public pages (21) | 18 | `/file-publication` (file download), `/info`, `/robots.txt` |
| Signed-in pages (48) | 44 | 4 file downloads |
| Journey steps (56) | all, in 13 journeys with a video each | |
| Sign-in hand-offs (14) | | Not pip's screens: they redirect to Azure B2C, SSO or IDAM |

Each page is also captured in its variants (`variants.ts`), and a check captures CaTH in the same
ones:

- **As every role its guard lets in.** A page is captured as the role in `captureAs`, then as each
  other fixture user whose role pip's guard admits, as `<page>@<user>`: the admin dashboard as a
  system admin, CTSC and local admins and super admins; verified pages as CFT and Crime IDAM users
  too. Public pages and lists are captured signed in as `verified-media` as well as signed out.
- **At mobile width** (375 px), as the state `mobile`, for each page's main capture.
- **The page for an address that does not exist**, `page--not-found-address`, compared with what
  CaTH shows for the same address.

Journeys are in `pip/journeys/`, ported from pip's CodeceptJS scenarios: subscriptions, the
subscription basket, configuring list types, manual upload and removal, media applications, court
reference data, legacy third-party users, third-party subscribers, location metadata, list-type
search config, bulk-creating media accounts, blob resubmission and deleting a user.

CaTH's ports of them are in `cath/journeys/`, one per pip journey with the same id and checkpoint
names, through CaTH's own pages. A port reaches the same goal by CaTH's controls. For example, CaTH
removes a court with a button rather than a link. All 13 are ported. Where CaTH has no equivalent of
one of pip's steps the port leaves that checkpoint out, so the comparison reports it as missing:
CaTH has no bulk-create media accounts pages, no third-party subscriber status page, and no summary
step before saving list-type search config or a subscriber's subscriptions. Journeys that change
data make their own throwaway records (`cath/records.ts`) and remove them again.

`--all` runs journeys only against a local CaTH, because they create and delete courts, users,
subscribers and publications. In a shared environment, name one with `--journey`. Two cannot run
against a deployed CaTH yet, because test-support has no way to set list-type search config:
`email-subscriptions` and `list-type-search-config`.
Choose things by identity, not position: CaTH orders some lists by their name in the page's
language, so "the first list type" is a different one in Welsh.

### Limits

Accepted for the prototype, to be resolved later. Until then, if a screen you are building
depends on one of these, check that part by hand and say so in the PR.

- **One data state per page.** Each list type has one publication; pages that change with data
  (no subscriptions vs some, a list with no hearings) are captured in the state the seed produces.
  Journeys cover some validation errors, not every branch.
- **Two journey steps are reached by URL, not by clicking through**, because the step before them
  needs Azure services that are not available locally: approving a media application, and the
  confirmation after bulk-creating media accounts. Each is noted in its journey record.
- **13 journeys, not all 76 of pip's scenarios.** They cover every journey route, but not every
  path the scenarios take through them.
- **Not captured at all:** emails and deprecated list types. File downloads are limited to the ones listed in `routes/downloads.json`.
- **Signed-in pages in the test environment need test accounts.** CaTH perftest's vault has a
  Crime IDAM account (verified users) but no SSO admin accounts, so admin pages are reported as
  not compared there until accounts in perftest's admin groups are added to `cath-perftest` under
  the names in `environments.json`.

### pip's own defects

The baseline records pip as it behaves, bugs included. `pip/KNOWN-DEFECTS.md` lists the ones found
(several `<h1>`s on list pages, broken `aria-controls` on accordions, validation errors that lose
form state, and so on). The reviewer is given that file, so CaTH not repeating a pip bug counts as
intended.

## Matching pip pages to CaTH pages

`routes/route-map.json` maps each pip page and journey step to its CaTH route. Same-path matches,
and suggestions whose headings are identical, are used by the check; low-confidence suggestions are
skipped until someone checks them and sets `reviewed: true` (re-running `routes/route-map.ts` keeps
reviewed entries). A reviewed entry with `cath: null` records that CaTH has no such page. Renamed
list types are in `list-type-map.json`.

pip's ids in the baseline's page URLs (publications, users, and the records in
`fixtures/records.json`) are swapped for the CaTH ids of the same fixtures. Both apps are seeded with
the same records (`pip/records.ts`, `cath/records.ts`) and the baseline keeps pip's ids in
`seed.json`. Where CaTH takes a value under another name or in the path, the route's `cathParams`
in `route-map.json` says where it comes from: `{ "id": "applicantId" }` fills
`/media-applications/[id]` from pip's `applicantId`, and `publication:<fixture>` names the list for
a page CaTH offers for one list only. A page CaTH still does not serve as asked, an error or a
redirect elsewhere, is reported as not compared rather than as a difference: for example
`/location-metadata-manage`, which CaTH only reaches by submitting its search form.

## The hosted check (`src/`)

The parity check is also hosted, run for testers in the test
environment (CaTH perftest, paired with pip test). From the browser, without running anything
locally, a tester can:

- check all of CaTH, some list types or some pages against the recorded pip baseline (page
  structure, text, accessibility, and the PDF and Excel files each list makes), and read the full
  report
- compare the PDF and Excel files pip and CaTH made for a publication they uploaded to both, by
  its artefact id in each, with links to the list in each app

It is an internal tool for the CaTH team, so English only.

### Where it runs

Only in perftest: the umbrella chart includes it behind `uiBaseline.enabled`, which
`job.helm-deploy.yml` sets for perftest alone. It is deployed with release `cath-service-perftest`
at <https://cath-cath-service-perftest-ui-baseline.perftest.platform.hmcts.net>, a host in the
private DNS zone only, so it is reached on the HMCTS network.

### How it works

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

#### Signing in, and the two apps it checks

CaTH perftest and pip test sign staff in through the same Entra tenant, the same SSO app
registration and the same admin groups, and this app uses them too. So a tester signed in here is
signed in to both apps' staff pages in their own browser, without being asked again, with the same
admin role in each.

The app itself cannot use a tester's sign-in to reach either app: CaTH and pip only make a session
from their own sign-in callback, and the token this app gets is for this app (`openid profile
email`), not for them or for Azure storage. Checks therefore sign in as test accounts, and because
the groups are shared, one account per admin role works in both apps.

### Before it works in perftest

- Register `https://cath-cath-service-perftest-ui-baseline.perftest.platform.hmcts.net/sso/return`
  as a redirect URI on perftest's SSO app registration (`sso-client-id` in `cath-perftest`). It is
  the same registration as pip test's (`sso-client-id` in `pip-ss-kv-test`), so agree it with the pip
  team.
- Grant the CaTH perftest managed identity the Storage Blob Data Reader role on pip's test storage
  account (`pipsssatest`), for file comparisons. Without it, file comparisons fail with a message
  saying so.
- Add test accounts for the admin roles to `cath-perftest`, under the names in
  `apps/ui-baseline/environments.json`, so admin pages are compared too. Until then they are
  reported as not compared. Each needs to be in the matching admin group (`sso-sg-*`), which pip
  test shares, so the same accounts sign in to pip test too.
- Record and store a baseline: run the "UI baseline - record pip" workflow once.

### Running it locally

```bash
PORT=8090 UI_BASELINE_AUTH_DISABLED=true UI_BASELINE_ENV=local yarn workspace @hmcts/ui-baseline dev
```

Then open <http://localhost:8090>. `PORT` is needed because the root `.env` sets CaTH web's
`PORT=8080`, which `dev` would otherwise pick up. `UI_BASELINE_AUTH_DISABLED` is refused when
`NODE_ENV` is production. With `UI_BASELINE_ENV=local` it checks a local CaTH, and needs a stored
baseline in local Azurite's `ui-baseline` container (`yarn ui-baseline:baseline push`). Each check
uses the latest stored baseline when it starts, so a newer push is picked up by the next check; the
page names the baseline last fetched.

## Not done yet

Planned next, roughly in this order:

- Once CaTH moves past being a copy of pip, the baseline will be updated per feature with CaTH's
  approved screens.

## What's in this folder

| Path | What it is |
|---|---|
| `core/` | The generic tool: capture, journeys, compare (pages, PDFs, Excel), review (`npx tsx core/cli.ts` for usage) |
| `src/`, `helm/` | The hosted check for testers, and its chart |
| `check.ts`, `pr-comment.ts` | `yarn ui-baseline:check` and its PR comment |
| `compare-files.ts`, `artefact-files.ts` | `yarn ui-baseline:compare-files`: one publication's files in pip and CaTH |
| `baseline.ts`, `baseline-store.ts` | `yarn ui-baseline:baseline push\|pull`: the stored baseline |
| `environments.json`, `environments.ts` | Where CaTH and pip run in each environment a check targets, and how to sign in |
| `fixtures/` | The publications, users and records both apps are seeded with |
| `pip/` | Setting up and running pip locally (`setup.sh`), recording the baseline (`baseline.sh`, `record-files.ts`); pip's journeys; known pip defects |
| `cath/` | Seeding CaTH with the same fixtures, signing in to it, and CaTH's ports of pip's journeys (`cath/journeys/`) |
| `routes/` | pip's route inventory, page targets, and the pip → CaTH route map |
| `report/` | The HTML report |
| `apps.json`, `list-type-map.json`, `build-targets.ts` | Where each app runs, list-type renames, capture targets |
| `output/` | Git-ignored: baseline runs, CaTH captures, checks |
