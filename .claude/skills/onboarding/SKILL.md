---
name: onboarding
description: Provides a walk through of the repository to new developers.
disable-model-invocation: true
---

# Developer Onboarding & Architecture Guide

Onboard a new developer to this codebase interactively, layer by layer. Do not dump information.

Follow this 3-phase process. **One thing per message: end your turn after every step, every trace hop, every Phase 3 item, and every question you ask, then wait for the developer to reply. Never continue past one of those boundaries in the same message, even if you already know what comes next.**

## Phase 1: Context & Getting to Green
*Goal: learn the vocabulary, understand the "why", and get the app running locally.*

**Step 0: Scan the repository.** Read whatever is not already in your context, in this order of value:
- Agent and contributor instruction files — `CLAUDE.md`, `AGENTS.md`, `.claude/rules/`, `CONTRIBUTING.md`. Usually the densest source of house rules, conventions and known landmines.
- Architecture and design docs — `docs/`, `ARCHITECTURE.md`, any ADR directory.
- The database schema or migration directory. This is the fastest route to domain vocabulary.
- `README.md` and package manifests.
- `docker-compose.yml`, `.env.example`, and CI pipeline definitions.
- The top-level directory layout — apps, services, packages, libs — and the names of the modules within it.

Read the instruction files, layout and schema now. Leave the rest until the step that needs it — docs before Step 3, `README.md` and `docker-compose.yml` before Step 4, CI config before Phase 3. **Scan, don't study — favour listings and targeted greps over full reads.** Phase 2's trace needs the context: compact mid-session and Step E's walk-back has nothing left to check against.

Do not output the scan itself. Use it to produce the steps below.

**Step 1: Calibrate.** Ask with `AskUserQuestion` before teaching anything:

- **Experience** — which of the core technologies in this stack are new to them (multiSelect)? Name the actual ones you found in Step 0.
- **First task** — which area will they work in first? Weight depth accordingly. Derive the options from areas actually in the tree, never remembered ones. Four options rarely covers a codebase, so say in one line which areas you merged or left off — otherwise someone's area silently vanishes into another's bucket and they pick the wrong option.
- **Pace** — full walkthrough, or specific phases? Their answer scopes the session. Step 2 is the exception: never skip it, only shorten it.

Then confirm the plan in one short message.

**Step 2: Domain vocabulary.** Output this on its own, before anything else. List 8–15 terms a developer must know to read this code, one line each, drawn from the schema, docs and module names. Explicitly flag any term that means something different here from its everyday or industry meaning.

Chosen by feel, this list reliably gets the obvious central nouns and misses the term that would have saved them a day. So sweep these categories, including whichever exist: the record most flows start or end at; any concept with one name in the database and another in the routes or UI; every enum or column that gates access; every flag that switches which pipeline handles a record; any split between when something happened and when it becomes visible, the usual cause of "the data is there but the page is empty"; any subsystem running legacy alongside current; each distinct auth route, if there is more than one; any outcome that looks like a failure but is deliberate, or the reverse; acronyms they cannot expand from context.

Then cut to 8–15 by what their Step 1 answers make load-bearing — by what it costs them to get wrong, not by which files they will open. A term whose only appearance is a write their area triggers still belongs; one that cannot fire on their paths does not, however well it fits a category above. Check each claim against the file before stating it, rather than inferring from a field's name, and cite only paths you opened this session rather than ones you recall — this is the one output they cannot verify and have every reason to trust.

Ask which terms they want expanded.

**Step 3: Project context and high-level design.** The business purpose, the primary users, the main architectural pattern, and the core boundaries.

**Step 4: Getting it running.** Exact commands to install dependencies, run migrations, seed data, and start locally — plus how local differs from staging and production (required env vars, secrets, stubbed services). Ask them to run it and confirm the app is up. Offer to debug setup errors. Do not move on until it is running.

Check prerequisites before the first command — runtime and package manager versions, container daemon, any startup cloud login, certificates, free ports. These fail with errors that do not explain themselves.

Walk one command at a time and wait for real output rather than explaining the whole sequence and sending them away. Their machine will throw a failure the happy path does not cover, and working through it together is the most valuable part of this phase. Make sure they can name the stages the start command chains, so they can tell which one failed.

## Phase 2: The End-to-End Core Flow Trace
*Goal: map the mental model onto the physical codebase by tracing a real request.*

**Step A: Choose the flow.** Offer 2–3 candidates and let the developer pick. Select candidates that are:
- **Central, not complex.** The flow the service primarily exists to perform. Comprehensibility beats layer coverage — do not pick the flow that touches the most layers if it is also the hardest to read.
- **Complete.** Touches persistence, and ideally one external boundary, and produces something a user can see.
- **Ordinary.** No edge cases, no legacy or mid-migration code, no unusually clever implementations.

State briefly why each candidate qualifies, then let them choose.

**Step B: The trigger.** Before showing any code, explain exactly how they trigger this flow locally — the URL and interaction, or a specific `curl` payload, or the command that enqueues the job. Do not move on until they confirm they have triggered it.

**Step C: The code trace.** Output the trace one hop at a time, inviting questions after each.

For each hop, give the exact file path, a short code snippet, and answer:
- *Where does this live and why there?*
- *What happens when it fails?*
- *How is it tested?*

Three rules keep the trace from going shallow:

- **Descend when a hop resolves to a flag.** If the answer at this file is a boolean, an option passed to a shared handler, or a single line of configuration, the behaviour lives in the thing being configured. Follow it there and read the implementation. A hop answered with "there's a flag for that" has taught nothing.
- **Stop at general-purpose frameworks.** Never trace into Express or ORM internals. Do descend into first-party packages, even if their only source is in `node_modules`.
- **Enumerate exhaustively.** A hop is not finished while the developer has seen one member of a set. If the codebase has four identity providers, four notification channels or four publication sources, name all four and where each lives — even though this flow only exercises one. Pull that enumeration at the hop where it belongs rather than as a separate topic later.

The hops:
1. **Entry point** — router, API controller, UI event, or queue consumer.
2. **Middleware & auth** — cross-cutting concerns, authentication and authorisation checks, rate limits.
3. **Validation** — where input schemas are checked.
4. **Business logic** — the core service layer or domain models.
5. **Data access** — DB queries, ORM interactions, notes on migrations and seed data.
6. **External calls** — system boundaries, third-party APIs, how they are mocked locally.
7. **Response/render** — how the payload is formatted and returned.
8. **Asynchronous triggers** — background jobs, queues, or webhooks fired after the response.

**Step D: Verification.** Explain exactly how they confirm the state changed: where to look in the UI, and which database table or log output to check.

**Step E: Explain it back.** Do not skip this — confirmation is not comprehension. Ask the developer to:
1. Walk the flow back to you from memory, without re-reading the code.
2. Answer: *"If we needed to add one new field to this flow, which files would you change and in what order?"*

Judge the answer against the trace you just walked, not against how confident it sounds — the walk-back must name every hop you walked, in order, and the field question must name the files you actually opened. Say plainly what was missing, and do not soften a wrong answer.

Their answer tells you which hops did not land. Re-teach those specific hops from a different angle — a concrete example, or opening the file together — rather than repeating the whole trace. Then re-check.

**Step F: A contrasting second trace.** One trace teaches the pattern; a second teaches where the pattern does not apply, which is where new developers actually get stuck.

**Choose it by coverage gap, not by feel.** List what trace one did not touch — authentication, the admin or privileged path, asynchronous work, an alternative content or storage path, the error path — then pick the single flow that closes the most of those gaps at once. Say which gaps you are closing and why, so the developer sees the shape of the codebase and not just a second example. Then move on to Phase 3.

## Phase 3: Ways of Working
*Goal: transition from learning to shipping.*

Take these one at a time.

1. **Configuration and secrets.** How a value reaches the running app and in what precedence order; where secrets actually live and what has to change in how many places to add one; which config differs per environment. This lands here rather than in Phase 1 because it is abstract until they have seen code that reads it.
2. **Testing conventions.** The kinds of test this repo uses and where each lives, plus any convention that would surprise someone applying general habits — a required helper, a rule about how many tests to write, a guard test that fails on a missing file. Per-hop "how is this tested?" answers will not surface these, so cover them deliberately.
3. **CI/CD.** Branch naming, PR requirements, what must pass before merge, and the actual path a merged PR takes to each deployed environment — the pipeline stages, what gates each one, and how to tell where a deploy stopped.
4. **Observability and debugging.** Where logs go locally versus deployed, how to read an error, and what monitoring exists. If there is no structured logger, say so — knowing that is what shapes how they debug a deployed environment.
5. **Working with the agent.** List the slash commands, skills and subagents this repo ships — read `.claude/commands/`, `.claude/skills/` and `.claude/agents/` so the names are real ones, not invented. One line each: the name and when to reach for it. Then offer to explain any of them in more detail rather than explaining them all now.

Close with a short, honest "what you know / what you don't" — nobody understands the whole codebase after one session. Then ask what was confusing. If they name a gap in the repo's own docs, offer to fix the doc.

## Behavioural Guidelines
- Always anchor explanations in actual code files that exist in this workspace. No generic assumptions.
- Read by absolute path from the root you were started in. A relative path in a shell can resolve against a different checkout, and a second worktree will read as a different codebase without saying so.
- Do not state a count, or that something does not exist, unless a command you just ran produced it. Search the whole repo before calling anything missing and name the check you ran — a wrong absence sends them off to build what is already there.
- Everything you tell them comes from this repo. Say nothing about the developer's own access, environment or history unless they said it in this session, and never attribute to them a claim they did not make.
- Keep output scannable: bold text, lists, code blocks.
- Ask comprehension checks as plain text, never as multiple choice — options let people guess.
- If the project does not have a specific layer (e.g. no async jobs), explicitly say it is not used in this architecture rather than inventing one.
- Prefer checkable completion over coverage. Before moving on, know what would tell you this step landed — a named set fully enumerated, a command actually run, an answer compared against the one you expected.
- Explain in your own words and your own order, calibrated to what they told you in Step 1. Never paste doc sections at them.
- If you do not know something they ask, say so and go read the source.
