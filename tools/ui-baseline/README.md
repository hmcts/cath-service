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

## Recording the pip baseline (once)

The baseline is not committed: screenshots and videos are too big for git. Instead everyone
records the same baseline locally from pinned pip commits and the committed fixtures, so two
people's baselines match.

```bash
yarn ui-baseline:record-pip
```

This needs Docker, Node and corepack, and nothing else from pip. pip is memory-hungry (its two
backends alone use about 2 GB), so stop CaTH while recording; the recording fails with an error,
rather than leaving an incomplete baseline, if pip runs out of memory. It clones pip-frontend,
pip-data-management and pip-account-management at the pinned commits (into
`~/.cache/ui-baseline/pip`, or `$UI_BASELINE_PIP_DIR`), adds a local-only sign-in to pip-frontend
(`pip/pip-frontend.patch`), builds the backends in Docker, starts pip on <https://localhost:8180>,
seeds it, and records every page and journey into `output/baseline`. The first run takes about
35 minutes (10 to set up pip, 25 to record); re-recording skips the setup.

It uses ports 8180, 15432, 16379, 16969, 18090 and 20000, so it can run alongside CaTH. pip stays
running afterwards so you can look at it; `yarn ui-baseline:stop-pip` stops it. The check itself
only needs the recorded baseline, not pip.

## Checking a ticket

With CaTH running locally (`yarn dev`) and a recorded baseline:

```bash
yarn ui-baseline:check --ticket 591                  # check, write the evidence
yarn ui-baseline:check --ticket 591 --post-pr 1234   # also post (or update) the PR comment
```

The check:

1. works out what to check from the ticket: list types it names (e.g. `COP_DAILY_CAUSE_LIST`) and
   page routes it names (e.g. `/summary-of-publications`)
2. seeds local CaTH with the same publications the baseline was made from
3. captures those CaTH screens in English and Welsh
4. compares them with the baseline
5. has a reviewer judge each difference against the ticket: **intended** (the ticket asks for it,
   quoted), **defect**, or **needs a human**
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

Expected differences come only from the ticket. If the reviewer marks something a defect that the
team has agreed to change, update the ticket and re-run; there is no allow-list.

Other options: `--list-type NAME` and `--route /path` to check without a ticket, `--locale en|cy`,
`--no-seed`, `--no-review`, `--reviewer "<command>"` (default: `claude -p` with no tools),
`--serve` to browse the report on <http://localhost:9500>. It exits 1 when there are defects.

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

Journeys are in `pip/journeys/`, ported from pip's CodeceptJS scenarios: subscriptions, the
subscription basket, configuring list types, manual upload and removal, media applications, court
reference data, legacy third-party users, third-party subscribers, location metadata, list-type
search config, bulk-creating media accounts, blob resubmission and deleting a user.

### Limits

Accepted for the prototype, to be resolved later. Until then, if a screen you are building
depends on one of these, check that part by hand and say so in the PR.

- **One role per signed-in page.** Each page is captured as the role its route guard requires
  (`routes/pip-routes.json`, `captureAs`). Pages that look different for another role, such as the
  admin dashboard for a CTSC or local admin, or a list for a verified user rather than a signed-out
  one, are captured for that one role only.
- **One data state per page.** Each list type has one publication; pages that change with data
  (no subscriptions vs some, a list with no hearings) are captured in the state the seed produces.
  Journeys cover some validation errors, not every branch.
- **Desktop only**, at 1280 px wide. No mobile width.
- **Two journey steps are reached by URL, not by clicking through**, because the step before them
  needs Azure services that are not available locally: approving a media application, and the
  confirmation after bulk-creating media accounts. Each is noted in its journey record.
- **13 journeys, not all 76 of pip's scenarios.** They cover every journey route, but not every
  path the scenarios take through them.
- **Not captured at all:** file downloads, emails, pip's 404 page and deprecated list types.

### pip's own defects

The baseline records pip as it behaves, bugs included. `pip/KNOWN-DEFECTS.md` lists the ones found
(several `<h1>`s on list pages, broken `aria-controls` on accordions, validation errors that lose
form state, and so on). The reviewer is given that file, so CaTH not repeating a pip bug counts as
intended.

## Matching pip pages to CaTH pages

`routes/route-map.json` maps each pip page and journey step to its CaTH route. Same-path matches,
and suggestions whose headings are identical, are used by the check; low-confidence suggestions are
skipped until someone checks them and sets `reviewed: true` (re-running `routes/route-map.ts` keeps
reviewed entries). Renamed list types are in `list-type-map.json`.

## Not done yet

Planned next, roughly in this order:

- Pages behind CaTH sign-in, and classified lists, are skipped: local CaTH has no sign-in.
- CaTH journeys are not compared yet; only single screens are.
- Recording only the pages a ticket needs, rather than the whole of pip, so a first run is quicker.
- Once CaTH moves past being a copy of pip, the baseline will be updated per feature with CaTH's
  approved screens.

## What's in this folder

| Path | What it is |
|---|---|
| `src/` | The generic tool: capture, journeys, compare, review (`npx tsx src/cli.ts` for usage) |
| `check.ts`, `pr-comment.ts` | `yarn ui-baseline:check` and its PR comment |
| `fixtures/` | The publications, users and records both apps are seeded with |
| `pip/` | Setting up and running pip locally (`setup.sh`), recording the baseline (`baseline.sh`); pip's journeys; known pip defects |
| `cath/` | Seeding CaTH with the same fixtures |
| `routes/` | pip's route inventory, page targets, and the pip → CaTH route map |
| `report/` | The HTML report |
| `apps.json`, `list-type-map.json`, `build-targets.ts` | Where each app runs, list-type renames, capture targets |
| `output/` | Git-ignored: baseline runs, CaTH captures, checks |
