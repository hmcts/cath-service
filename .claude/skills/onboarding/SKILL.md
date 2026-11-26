---
name: onboarding
description: Orients a new joiner to CaTH, how Claude is used in this repo and where the docs are, then offers an interactive deep dive into the codebase.
disable-model-invocation: true
---

# Developer Onboarding

Onboard a new joiner in two parts. Do not dump information.

- **Part 1: Orientation (O1–O4).** For everyone: what CaTH is, how Claude is used here, where the docs are, and an offer of the deep dive. About 20 minutes.
- **Part 2: Deep dive (D1–D3).** Optional and interactive: calibration, vocabulary, getting the app running, tracing a real request, and ways of working. 2–4 hours. It can be done in a later session by running `/onboarding` again and asking to skip to the deep dive.

**One thing per message: end your turn after every O step, every D step, every trace hop, every D3 item, and every question you ask, then wait for the developer to reply. Never continue past one of those boundaries in the same message, even if you already know what comes next.**

**Step 0: Scan the repository.** Do this silently before O1, and do not output the scan itself. `CLAUDE.md` and the `.claude/rules/` files without `paths:` frontmatter are already in your context; do not re-read them. Read:
- The path-scoped rules: files in `.claude/rules/` with `paths:` frontmatter. These load only when a matching file is touched, so they are probably not in your context yet.
- The top-level layout (`apps/`, `libs/`, `libs/list-types/`, `e2e-tests/`) and the database schema in `libs/postgres-prisma/prisma/schema/`.
- Headings only of `README.md`, `docs/onboarding/ONBOARDING.md` and every file directly under `docs/`.
- Recursive listings of `.claude/commands/`, `.claude/skills/`, `.claude/agents/`, `.claude/hooks/` and `.claude/workflows/`. Commands are nested (for example `.claude/commands/multi-agent/`), so a flat listing misses some.
- Both settings files: `.claude/settings.json` and `.claude/cnp.settings.json`, which `.claude/run.sh` passes with `--settings`. Hooks and helpers can be wired in either.
- A listing of `.github/workflows/`, and `grep -il claude .github/workflows/*` to find the workflows that run an agent. Some call a reusable workflow in another repo, so searching for an action name misses them.

Leave full reads until the step that needs them. **Scan, don't study — favour listings, headings and targeted greps over full reads.** The deep dive's trace needs the context: compact mid-session and the D2.5 walk-back has nothing left to check against.

If they ask to skip straight to the deep dive, do Step 0, then go to Part 2.

## Part 1: Orientation
*Goal: a map of the service, the tooling and the docs, before any detail.*

Keep each O step to one screen. Pitch it so someone in their first developer role can follow it, and define a term on its first use. Keep code out of Part 1 except file and directory paths, because non-engineers take it too. Calibration comes in the deep dive, so do not ask about experience yet.

**O1: What CaTH is.** Cover, in this order:
- **Purpose.** What the service publishes and why it exists, in two or three sentences.
- **Users.** Each kind of user and what they do with the service. Take the user types from the code (roles, provenances and the page groups in `apps/web/src/pages/`), not from memory. Third-party recipients are not a role, so look for them separately (`libs/third-party-user`).
- **The lifecycle of a publication.** Every route a publication gets in by, where it is stored, how it is rendered by list type, and what happens after it is published (for example subscription notifications, and third-party fulfilment in `libs/legacy-third-party-fulfilment`). Name the lib that owns each stage.
- **Repo shape.** What each app in `apps/` is for, and the main groups of `libs/`, in one line each. Give the number of list-type packages by counting `libs/list-types/`, and say that most tickets touch one of them.

Use no more than five domain terms, only those needed to follow this step; the full vocabulary is in the deep dive. Then ask if they have questions before moving on.

**O2: How Claude is used here.** Cover, in this order:
- **How to launch it.** Read `.claude/run.sh` and say in one line what it sets up and what it needs first.
- **House rules.** `CLAUDE.md` and the unscoped rules load into every session, which is why the agent follows CaTH conventions without being told. Name the path-scoped rules and the paths that trigger each. Say how a rule gets added: a review finding becomes a rule, and a rule that keeps being broken becomes a guard test (see "Ways of Working" in `CLAUDE.md`).
- **The delivery loop.** The steps from "Ways of Working" in `CLAUDE.md`: the command for each, the decision a person makes there, and that each writes to `docs/tickets/<issue>/`. State the ownership rules plainly: whoever opens the PR owns every line in it, and agents never merge.
- **What else ships in `.claude/`.** Describe only what everyone uses in week one, one line each, plus `/onboarding` itself. You do not know their first task yet; D3.5 covers what it needs. For the rest, give the count of commands, skills, subagents and hooks and the directory each lives in, and say they can ask about any of them.
- **Agents in CI.** The workflows Step 0's grep found, one line each, and what a person still decides. Part 4 of `docs/onboarding/ONBOARDING.md` describes them; where it disagrees with the workflow files, the files win, so say so.

Point them to `docs/onboarding/ONBOARDING.md` (Parts 3 and 4) for the full process, and `docs/AGENT.md` for the Claude Code CLI cheat sheet.

**O3: Where to read more.** Give a table, one row per topic: the topic, the doc or file to read, and one line on what it covers. Cover at least:

| Topic | Starting points to check |
|---|---|
| Architecture | `docs/ARCHITECTURE.md` |
| Running the app locally | `README.md` ("Getting Started"), `docker-compose.yml` |
| Configuration and secrets | `README.md` ("Configuration & Secrets Management") |
| Code conventions and module structure | `CLAUDE.md`, the path-scoped rules in `.claude/rules/` |
| Database and seed data | "Database Schema Management" in `CLAUDE.md`, `libs/postgres-prisma/prisma/schema/`, `apps/postgres/` |
| List types | "List Type Implementation" in `CLAUDE.md` |
| Testing | `.claude/rules/testing.md`, `.claude/rules/e2e-testing.md`, `e2e-tests/` |
| CI/CD | `.github/workflows/workflow.preview.yml` and `workflow.main.yml`, Part 1.1 of `docs/onboarding/ONBOARDING.md` |
| API | `docs/api/openapi.yaml` |
| Design and accessibility | `.claude/rules/design.md` |
| Past tickets | `docs/tickets/<issue>/` |

Treat this table as starting points, not facts. Before listing a row:
- **Confirm the path exists** and that the section you name is in it. Drop or correct anything that does not match.
- **Check it is current.** Skim it against the tree. If a doc is template text, or describes apps, libs or commands that are not in the repo, say so in its row and name where the truth lives instead. Pointing a new joiner at a stale doc without a warning is worse than pointing at nothing.
- **Say when there is no doc,** and point to the files that are the source of truth instead.

Add any other doc you found in Step 0 that a joiner would need. Suggest an order for their first week: what to read first and what to leave until they need it.

**O4: Offer the deep dive.** In two or three lines, say what it covers (getting the app running with you, the domain vocabulary, tracing a real request through the code and explaining it back, then ways of working), that it takes 2–4 hours, and that they can do it later by running `/onboarding` again. Then ask with `AskUserQuestion`: *deep dive now*, *later*, or *only specific parts* (getting it running, vocabulary, the code trace, ways of working).

If they choose later, close the session. Point to the Week 1 plan in Part 3 of `docs/onboarding/ONBOARDING.md`, ask what was unclear, and if they name a gap in the repo's docs, offer to fix it.

## Part 2: Deep Dive

The orientation has already covered purpose and users, how Claude is used here, and where the docs are. When a D step overlaps the orientation, cover only what the orientation did not.

### D1: Context & Getting to Green
*Goal: learn the vocabulary, understand the design, and get the app running locally.*

**D1.1: Calibrate.** Ask with `AskUserQuestion` before teaching anything:

- **Level** — how much professional development experience do they have? Single select: *first developer role*, *a few years*, *experienced but new to this codebase*. This sets their **level**: junior, mid or senior.
- **New technologies** — which of the core technologies in this stack are new to them (multiSelect)? Name the actual ones you found in Step 0.
- **First task** — which area will they work in first? Weight depth accordingly. Derive the options from areas actually in the tree, never remembered ones. Four options rarely covers a codebase, so say in one line which areas you merged or left off — otherwise someone's area silently vanishes into another's bucket and they pick the wrong option.
- **Pace** — full walkthrough, or specific parts? Skip this if they already chose specific parts in O4. D1.2 is never skipped, only shortened. Juniors cannot yet judge which parts they need, so mark the option that matches their level as recommended.

Then confirm the plan in one short message, stating the depth you will go to.

**Depth by level.** Their answers bind every later step, and where a rule elsewhere conflicts with their level, the level wins. Each step says what changes by level; where a step is silent, apply this table.

| | Junior | Mid | Senior |
|---|---|---|---|
| Message size | One idea, snippets of 10 lines or fewer | One topic, short snippets | As the step requires |
| General concepts (middleware, ORM, migration, workspace) | Define in one line on first use, using this repo's file as the example | Define only for technologies they marked new | Define only for technologies they marked new |
| Session breaks | Offer to stop after D1 and after D2.5 | Offer to stop after D2 | Only if asked |

A technology marked new always gets its general concept defined on first use, whatever the level. Being new to Prisma is not the same as being new to databases, so pitch the definition at their level.

**D1.2: Domain vocabulary.** Run this now, as a message on its own (juniors: straight after D1.4 instead, because a list of terms with nothing running to attach them to does not stick). List 8–15 terms (5–6 for juniors) a developer must know to read this code, one line each, drawn from the schema, docs and module names. Explicitly flag any term that means something different here from its everyday or industry meaning.

Chosen by feel, this list reliably gets the obvious central nouns and misses the term that would have saved them a day. So sweep these categories, including whichever exist: the record most flows start or end at; any concept with one name in the database and another in the routes or UI; every enum or column that gates access; every flag that switches which pipeline handles a record; any split between when something happened and when it becomes visible, the usual cause of "the data is there but the page is empty"; any subsystem running legacy alongside current; each distinct auth route, if there is more than one; any outcome that looks like a failure but is deliberate, or the reverse; acronyms they cannot expand from context.

Then cut to the count for their level by what their D1.1 answers make load-bearing — by what it costs them to get wrong, not by which files they will open. A term whose only appearance is a write their area triggers still belongs; one that cannot fire on their paths does not, however well it fits a category above. Check each claim against the file rather than inferring from a field's name: this is the one output they cannot verify and have every reason to trust.

Ask which terms they want expanded.

**D1.3: High-level design.** Cover the main architectural pattern and the core boundaries: what each app owns, how the libs depend on each other, and where the system talks to things outside it. Read `docs/` first. For juniors, cover only the path one request takes from browser to database and back; the boundaries land better during the trace.

**D1.4: Getting it running.** Read `README.md` and `docker-compose.yml` first. Exact commands to install dependencies, run migrations, seed data, and start locally — plus how local differs from staging and production (required env vars, secrets, stubbed services). Ask them to run it and confirm the app is up. Offer to debug setup errors. Do not move on until it is running.

Check prerequisites before the first command — runtime and package manager versions, container daemon, any startup cloud login, certificates, free ports. These fail with errors that do not explain themselves. `mkcert` is not installed in the devcontainer, so if `apps/web/certs/` is empty, have them generate the certificates on their own machine, not in the container.

Walk one command at a time and wait for real output rather than explaining the whole sequence and sending them away. Their machine will throw a failure the happy path does not cover, and working through it together is the most valuable part of this step. Make sure they can name the stages the start command chains, so they can tell which one failed. For juniors, say in one line what each command does and why before they run it.

### D2: The End-to-End Core Flow Trace
*Goal: map the mental model onto the physical codebase by tracing a real request.*

**D2.1: Choose the flow.** Offer 2–3 candidates and let the developer pick. Select candidates that are:
- **Central, not complex.** The flow the service primarily exists to perform. Comprehensibility beats layer coverage — do not pick the flow that touches the most layers if it is also the hardest to read.
- **Complete.** Touches persistence, and ideally one external boundary, and produces something a user can see.
- **Ordinary.** No edge cases, no legacy or mid-migration code, no unusually clever implementations.

State briefly why each candidate qualifies, then let them choose.

**D2.2: The trigger.** Before showing any code, explain exactly how they trigger this flow locally — the URL and interaction, or a specific `curl` payload, or the command that enqueues the job. Do not move on until they confirm they have triggered it.

**D2.3: The code trace.** Output the trace one hop at a time, inviting questions after each.

For each hop, give the exact file path, a short code snippet, and answer:
- *Where does this live and why there?*
- *What happens when it fails?*
- *How is it tested?*

Three rules keep the trace from going shallow. Apply them at the strength their level allows — depth a developer cannot hold yet teaches nothing either:

- **Descend when a hop resolves to a flag.** If the answer at this file is a boolean, an option passed to a shared handler, or a single line of configuration, the behaviour lives in the thing being configured. Follow it there and read the implementation. A hop answered with "there's a flag for that" has taught nothing.
- **Stop at general-purpose frameworks.** Never trace into Express or ORM internals. Do descend into first-party packages, even if their only source is in `node_modules`.
- **Enumerate exhaustively.** A hop is not finished while the developer has seen one member of a set. If the codebase has four identity providers, four notification channels or four publication sources, name all four and where each lives — even though this flow only exercises one. Pull that enumeration at the hop where it belongs rather than as a separate topic later.

The hops (if a layer does not exist in this flow, say so rather than inventing one):
1. **Entry point** — router, API controller, UI event, or queue consumer.
2. **Middleware & auth** — cross-cutting concerns, authentication and authorisation checks, rate limits.
3. **Validation** — where input schemas are checked.
4. **Business logic** — the core service layer or domain models.
5. **Data access** — DB queries, ORM interactions, notes on migrations and seed data.
6. **External calls** — system boundaries, third-party APIs, how they are mocked locally.
7. **Response/render** — how the payload is formatted and returned.
8. **Asynchronous triggers** — background jobs, queues, or webhooks fired after the response.

**Trace depth by level:**

| | Junior | Mid | Senior |
|---|---|---|---|
| Hops | 1, 3, 4, 5 and 7. Name the skipped ones in one line each so they know they exist | All eight | All eight |
| Per-hop questions | *Where does this live and why there?* only. Cover failure and testing once, at the end of the trace | All three | All three |
| Descend when a hop resolves to a flag | One level into first-party code at most, and only when the flag is the behaviour they will change | Follow into first-party code; stop at `node_modules` | As written |
| Enumerate exhaustively | Name the count and the directory where the others live; show only the one this flow uses | Name every member and its path in one line each | As written |

**D2.4: Verification.** Explain exactly how they confirm the state changed: where to look in the UI, and which database table or log output to check.

**D2.5: Explain it back.** Do not skip this — confirmation is not comprehension. Ask the developer, as plain text and never as multiple choice (options let people guess), to:
1. Walk the flow back to you from memory, without re-reading the code.
2. Answer: *"If we needed to add one new field to this flow, which files would you change and in what order?"*

Judge the answer against the trace you just walked, not against how confident it sounds — the walk-back must name every hop you walked at their level, in order, and the field question must name the files you actually opened. Say plainly what was missing, whatever their level.

For juniors, change the questions and the delivery, not the standard:
- Replace the full walk-back with *"Which file would you open first to change what this page shows, and where does its data come from?"* Then walk the rest together, with them leading.
- Name what they got right before what they missed. Say what was missing as the next file to look at, not as a verdict. This is accuracy, not cheerleading: a junior who hears only the gaps cannot tell what to keep.

Their answer tells you which hops did not land. Re-teach those specific hops from a different angle — a concrete example, or opening the file together — rather than repeating the whole trace. Then re-check.

**D2.6: A contrasting second trace.** One trace teaches the pattern; a second teaches where the pattern does not apply, which is where new developers actually get stuck.

**Choose it by coverage gap, not by feel.** List what trace one did not touch — authentication, the admin or privileged path, asynchronous work, an alternative content or storage path, the error path — then pick the single flow that closes the most of those gaps at once. Say which gaps you are closing and why, so the developer sees the shape of the codebase and not just a second example. Then move on to D3.

For juniors, do not run it in this session. Name the flow and the gap it closes, and offer it as a follow-up once they have shipped a first change. For mids, trace it at the hop count you used for trace one.

### D3: Ways of Working
*Goal: transition from learning to shipping.*

Take these one at a time. For juniors, cover only D3.2, the PR, merge, ownership and branch and commit conventions from D3.3, and D3.5. Name the rest in one line each as things to ask about when they first hit them.

- **D3.1: Configuration and secrets.** How a value reaches the running app and in what precedence order; where secrets actually live and what has to change in how many places to add one; which config differs per environment. This lands here rather than in D1 because it is abstract until they have seen code that reads it.
- **D3.2: Testing conventions.** The kinds of test this repo uses and where each lives, plus any convention that would surprise someone applying general habits — a required helper, a rule about how many tests to write, a guard test that fails on a missing file. Per-hop "how is this tested?" answers will not surface these, so cover them deliberately.
- **D3.3: CI/CD.** Read `.github/workflows/` first. Branch naming and commit conventions, PR requirements, who owns a PR's contents and that agents never merge (a reminder: O2 introduced this), what must pass before merge, and the actual path a merged PR takes to each deployed environment — the pipeline stages, what gates each one, and how to tell where a deploy stopped.
- **D3.4: Observability and debugging.** Where logs go locally versus deployed, how to read an error, and what monitoring exists. If there is no structured logger, say so — knowing that is what shapes how they debug a deployed environment.
- **D3.5: Working with the agent.** Go a level deeper on the delivery loop from O2, without re-listing it. For each step, cover what a good output looks like, what to check before accepting it, and what to do when the agent gets it wrong (edit `plan.md` and rerun, send an ambiguous ticket back to the issue, or turn a finding into a rule). Use a real folder in `docs/tickets/` as the example, and open its `plan.md` and `review.md` together. Then cover any commands, skills or subagents O2 only counted that matter for their first task.

Close with a short, honest "what you know / what you don't" — nobody understands the whole codebase after one session. Then ask what was confusing. If they name a gap in the repo's own docs, offer to fix the doc.

## Behavioural Guidelines
- Every claim comes from a file you opened this session, read by absolute path from the root you were started in. A relative path can resolve against a different checkout, and a second worktree reads as a different codebase without saying so. Cite only paths you opened, never ones you recall.
- Do not state a count, or that something does not exist, unless a command you just ran produced it. Search the whole repo before calling anything missing and name the check you ran — a wrong absence sends them off to build what is already there.
- Say nothing about the developer's own access, environment or history unless they said it in this session, and never attribute to them a claim they did not make ("as you mentioned, you've used Prisma before…").
- Keep output scannable: bold text, lists, code blocks. Explain in your own words; never paste doc sections at them.
- Before moving on, know what would tell you this step landed — a named set enumerated to their level's depth, a command actually run, an answer compared against the one you expected.
- If you do not know something they ask, say so and go read the source.
