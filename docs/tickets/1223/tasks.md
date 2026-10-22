# Tasks — Issue #1223: Redirect to `www.` on Prod domain

## Blockers to resolve first

- [ ] Confirm CLARIFICATIONS NEEDED Q1 (is this repo the right place, given there is no prod pipeline here) and Q4 (canonical prod host) before writing code
- [ ] Raise the linked platform/Flux ticket for the apex DNS record and apex ingress host rule (plan §2.6) — the code is inert without it

## Implementation Tasks

- [ ] Create `libs/web-core/src/middleware/canonical-host/canonical-host-middleware.ts` with `canonicalHostMiddleware(options)` and the `CanonicalHostOptions` interface at the bottom of the file (plan §2.1)
- [ ] Write `libs/web-core/src/middleware/canonical-host/canonical-host-middleware.test.ts` covering all 15 scenarios in plan §5.1, including scenario 14 (spoofed forwarded host cannot redirect off-site)
- [ ] Export `canonicalHostMiddleware` and the `CanonicalHostOptions` type from `libs/web-core/src/index.ts`, keeping the alphabetical export order Biome enforces (plan §2.2)
- [ ] Add `canonicalHostMiddleware` to the `@hmcts/web-core` import block in `apps/web/src/app.ts` and register it immediately after `configureHelmet(...)`, before the `/assets` static handler (plan §2.3)
- [ ] Add `canonicalHostMiddleware` to the wholesale `@hmcts/web-core` mock factory in `apps/web/src/app.test.ts` — `createApp()` throws without it
- [ ] Add app wiring assertions to `apps/web/src/app.test.ts`: called once, called with `process.env.CANONICAL_HOST`, called with `undefined` when unset (plan §5.2)
- [ ] Add prod-gated `CANONICAL_HOST` to `nodejs.environment` in `apps/web/helm/values.yaml`, using backtick literals like the adjacent `CFT_IDAM_URL` (plan §2.4)
- [ ] Set `cath-web.nodejs.environment.CANONICAL_HOST: ""` in `helm/cath-service/values.template.yaml` (plan §2.5)
- [ ] Set `cath-web.nodejs.environment.CANONICAL_HOST: ""` in `helm/cath-service/values.preview.template.yaml` (plan §2.5)
- [ ] Add the Helm assertions from plan §5.3 to the existing `describe("Front Door hostname ownership")` block in `apps/web/helm/values.yaml.test.ts`

## Verification Tasks

- [ ] `yarn lint` and `yarn test` pass from the repo root with no new Biome warnings
- [ ] New middleware file has full unit coverage
- [ ] Confirm the existing E2E specs listed in plan §5.4 still pass unmodified (landing-page, page-structure, 400-error-page, language-toggle-service-navigation, sign-in and the idam/sso suites)
- [ ] After deploy to aat: `printenv CANONICAL_HOST` is empty in the pod, and both the Flux host and the release-scoped pipeline host return `200` with no `location` header (plan §5.6)
- [ ] Confirm the deploy smoke test in `.github/workflows/job.helm-deploy.yml` passes

## Post-prerequisite Tasks (cannot be done from this repo)

- [ ] Confirm the apex DNS record and apex ingress rule are live in production (plan §2.6)
- [ ] Confirm prod `BASE_URL` / `CATH_SERVICE_URL` in the Flux values point at the canonical `www.` host so sign-in does not move the user off it (plan §2.7)
- [ ] Run the seven `curl` checks in plan §5.5 against production
- [ ] Run the browser checks in plan §5.5, including one full sign-in journey started from the apex hostname
