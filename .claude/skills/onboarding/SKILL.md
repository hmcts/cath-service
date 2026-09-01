---
name: onboarding
description: Provides a walk through of the repository to new developers.
disable-model-invocation: true
---

# Developer Onboarding & Architecture Guide

Onboard a new developer to this codebase interactively, layer by layer. Do not dump information.

Follow this 3-phase process. **Wherever a step says "Pause", end your turn there and wait for the developer to reply. Never continue past a pause in the same message, even if you already know what comes next.**

## Phase 1: Context & Getting to Green
*Goal: learn the vocabulary, understand the "why", and get the app running locally.*

**Step 0: Scan the repository.** Read whatever is not already in your context, in this order of value:
- Agent and contributor instruction files — `CLAUDE.md`, `AGENTS.md`, `.claude/rules/`, `CONTRIBUTING.md`. Usually the densest source of house rules, conventions and known landmines.
- Architecture and design docs — `docs/`, `ARCHITECTURE.md`, any ADR directory.
- The database schema or migration directory. This is the fastest route to domain vocabulary.
- `README.md` and package manifests.
- `docker-compose.yml`, `.env.example`, and CI pipeline definitions.
- The top-level directory layout — apps, services, packages, libs — and the names of the modules within it.

Do not output the scan itself. Use it to produce the steps below.

**Step 1: Calibrate.** Ask with `AskUserQuestion` before teaching anything:

- **Experience** — which of the core technologies in this stack are new to them (multiSelect)? Name the actual ones you found in Step 0.
- **First task** — which area will they work in first? Offer the real areas of this codebase. Weight depth accordingly.
- **Pace** — full walkthrough, or specific phases?

Confirm the plan in one short message, then continue. **Pause.**

**Step 2: Domain vocabulary.** Output this on its own, before anything else. List 8–15 terms a developer must know to read this code, one line each, drawn from the schema, docs and module names. Explicitly flag any term that means something different here from its everyday or industry meaning. **Pause** and ask which terms they want expanded.

**Step 3: Project context and high-level design.** The business purpose, the primary users, the main architectural pattern, and the core boundaries. Fold in the filtered anomalies from Step 0b here — they land as structure, not trivia, once the developer has the layout in mind. **Pause.**

**Step 4: Getting it running.** Exact commands to install dependencies, run migrations, seed data, and start locally — plus how local differs from staging and production (required env vars, secrets, stubbed services). Ask them to run it and confirm the app is up. Offer to debug setup errors. **Pause** until it is running.

Walk one command at a time and wait for real output rather than explaining the whole sequence and sending them away. Their machine will throw a failure the happy path does not cover, and working through it together is the most valuable part of this phase. Make sure they can name the stages the start command chains, so they can tell which one failed.

## Phase 2: The End-to-End Core Flow Trace
*Goal: map the mental model onto the physical codebase by tracing a real request.*

**Step A: Choose the flow.** Offer 2–3 candidates and let the developer pick. Select candidates that are:
- **Central, not complex.** The flow the service primarily exists to perform. Comprehensibility beats layer coverage — do not pick the flow that touches the most layers if it is also the hardest to read.
- **Complete.** Touches persistence, and ideally one external boundary, and produces something a user can see.
- **Ordinary.** No edge cases, no legacy or mid-migration code, no unusually clever implementations.

State briefly why each candidate qualifies, then let them choose.

**Step B: The trigger.** Before showing any code, explain exactly how they trigger this flow locally — the URL and interaction, or a specific `curl` payload, or the command that enqueues the job. **Pause** until they confirm they have triggered it.

**Step C: The code trace.** Output the trace **one hop at a time**. After each hop, **pause** for questions.

For each hop, give the exact file path, a short code snippet, and answer:
- *Where does this live and why there?*
- *What happens when it fails?*
- *How is it tested?*

Two rules keep the trace from going shallow:

- **Descend when a hop resolves to a flag.** If the answer at this file is a boolean, an option passed to a shared handler, or a single line of configuration, the behaviour lives in the thing being configured. Follow it there and read the implementation. A hop answered with "there's a flag for that" has taught nothing.
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

**Step D: Verification.** Explain exactly how they confirm the state changed: where to look in the UI, and which database table or log output to check. **Pause.**

**Step E: Explain it back.** Do not skip this — confirmation is not comprehension. Ask the developer to:
1. Walk the flow back to you from memory, without re-reading the code.
2. Answer: *"If we needed to add one new field to this flow, which files would you change and in what order?"*

Before you ask, write down privately the answer you expect. Compare against what they say rather than judging it in the moment — that is what stops a fluent-sounding answer from passing. Say plainly whether it was right, and do not soften a wrong one.

Their answer tells you which hops did not land. Re-teach those specific hops from a different angle — a concrete example, or opening the file together — rather than repeating the whole trace. Then re-check. **Pause.**

**Step F: A contrasting second trace.** One trace teaches the pattern; a second teaches where the pattern does not apply, which is where new developers actually get stuck.

**Choose it by coverage gap, not by feel.** List what trace one did not touch — authentication, the admin or privileged path, asynchronous work, an alternative content or storage path, the error path — then pick the single flow that closes the most of those gaps at once. Say which gaps you are closing and why, so the developer sees the shape of the codebase and not just a second example. Then move on to Phase 3.

## Phase 3: Ways of Working & First Ticket
*Goal: transition from learning to shipping.*

1. **Configuration and secrets.** How a value reaches the running app and in what precedence order; where secrets actually live and what has to change in how many places to add one; which config differs per environment. This lands here rather than in Phase 1 because it is abstract until they have seen code that reads it.
2. **Testing conventions.** The kinds of test this repo uses and where each lives, plus any convention that would surprise someone applying general habits — a required helper, a rule about how many tests to write, a guard test that fails on a missing file. Per-hop "how is this tested?" answers will not surface these, so cover them deliberately.
3. **CI/CD.** Branch naming, PR requirements, what must pass before merge, and the actual path a merged PR takes to each deployed environment — the pipeline stages, what gates each one, and how to tell where a deploy stopped.
4. **Working with the agent** List the slash commands, skills and subagents this repo ships — read `.claude/commands/`, `.claude/skills/` and `.claude/agents/` so the names are real ones, not invented. One line each: the name and when to reach for it. Then offer to explain any of them in more detail rather than explaining them all now.

Close with a short, honest "what you know / what you don't" — nobody understands the whole codebase after one session. Then ask what was confusing. If they name a gap in the repo's own docs, offer to fix the doc.

## Behavioural Guidelines
- Always anchor explanations in actual code files that exist in this workspace. No generic assumptions.
- Keep output scannable: bold text, lists, code blocks.
- If the project does not have a specific layer (e.g. no async jobs), explicitly say it is not used in this architecture rather than inventing one.
- Prefer checkable completion over coverage. Before moving on, know what would tell you this step landed — a named set fully enumerated, a command actually run, an answer compared against the one you expected.
- Explain in your own words and your own order, calibrated to what they told you in Step 1. Never paste doc sections at them.
- If you do not know something they ask, say so and go read the source.
