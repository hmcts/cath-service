# #1020: Deploy Demo and Perftest from the master build after successful promote (CNP)

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-09-09T10:08:41Z
**Updated:** 2026-09-28T12:39:54Z

## Description

## User Story

As a developer, I want the master build to deploy to Demo and Perftest after a successful promote, so that those environments stay current without manual intervention.

## Background

#1019 delivered everything needed to deploy demo and perftest except a trigger:

- Terraform for aat, demo and perftest runs from `master`
- `workflow.demo.yml` and `workflow.perftest.yml` resolve the image master already built and promoted (`aat-<short-sha>`, via `job.resolve-promoted-images.yml`), Helm-deploy it through `stage.deploy.yml` with `environment: demo` / `perftest`, and run smoke tests
- Both trigger on push to a `demo` / `perftest` branch, or `workflow_dispatch`

Those branches do not exist, so neither workflow has ever run. Demo and perftest have not actually been deployed.

Rather than create branches, a push token and branch protection first, this ticket calls the existing workflows directly from the master run. That gets the Helm deploy proven with the least moving parts. Moving the deploys onto dedicated branches is tracked separately in #1084.

`job.resolve-promoted-images.yml` derives the tag from `github.sha`, which in the master run is the commit just built and promoted — so it resolves the correct image with no change.

## Scope change: ITHC removed

This ticket originally covered Demo, ITHC and Perftest. **ITHC has been split out** into #1082 — its Key Vault name `cath-ithc` is held by a soft-deleted, purge-protected vault until 2026-12-21, so the environment cannot be provisioned before then. See #1067 for the blocker.

## Acceptance Criteria

- [ ] `workflow.demo.yml` and `workflow.perftest.yml` gain a `workflow_call:` trigger, keeping the existing `push` and `workflow_dispatch` triggers
- [ ] `workflow.main.yml` gains `deploy-demo` and `deploy-perftest` jobs that:
  - `uses:` the existing workflows rather than duplicating their jobs
  - run only when `promote-stage` result is `success`
  - run independently, so a demo failure does not cancel perftest
  - pass `secrets: inherit`
- [ ] Before wiring into master, one manual `workflow_dispatch` of each workflow succeeds, so deploy problems are found without turning the master run red
- [ ] A merge to master deploys to demo and perftest, and smoke tests pass on both
- [ ] The full chain is observable in the master run: build → aat deploy → smoke test → promote → demo/perftest deploy → smoke test
- [ ] A failed demo or perftest deploy fails the master run visibly, and cannot affect aat (it runs after promote)
- [ ] Comments in `workflow.demo.yml`, `workflow.perftest.yml` and `job.resolve-promoted-images.yml` that say the branches are synced from master are updated to describe the actual trigger

## Dependencies

- ✅ Infrastructure and deploy workflows — done in #1019
- ✅ Flux overlays for demo and perftest — done in #566. Must be reconciled, or `helm upgrade` fails with `namespaces "cath" not found`
- ⬜ The 22 application secrets seeded into `cath-demo` and `cath-perftest`, or pods stay in `ContainerCreating` and the deploy times out

## Out of Scope

- Dedicated `demo` / `perftest` branches and branch sync — #1084
- ITHC — #1082 (blocked by #1067)
- DNS — #1021

## Notes

`workflow.main.yml` gates `promote-stage` on `smoke-test-stage`, not on E2E — see #1004. If promotion is later moved behind E2E, these deploys inherit that gate automatically, since they key off `promote-stage`.

The master run will get longer by the duration of the two deploys and smoke tests. If that becomes a problem, #1084 decouples them.


## Comments

No comments on this issue.
