# Technical Plan — Issue #1223: Redirect to `www.` on Prod domain

## 1. Technical Approach

### 1.1 What is actually broken

A request to the apex hostname `court-tribunal-hearings.service.gov.uk` (no `www.`) never reaches
Express. Two things are missing, and only one of them lives in this repository:

1. **No ingress host rule.** `apps/web/helm/values.yaml:22-24` claims only
   `cath-web.{env}.platform.hmcts.net` and `cath.{env}.platform.hmcts.net`. The comment directly
   above those lines documents the failure mode: *"without a matching rule traefik 404s and Front
   Door reports 502."* A request arriving with `Host: court-tribunal-hearings.service.gov.uk`
   matches no rule, so traefik answers 404 before any application code runs.
2. **No host canonicalisation in the app.** `libs/web-core/src/middleware/` contains `cookies`,
   `file-upload`, `govuk-frontend`, `helmet`, `i18n` and `session-stores` — nothing reads the `Host`
   header. If the apex host were routed to a pod today, the app would happily serve the full site on
   it: two hostnames, duplicate content, host-scoped session cookies split across both, and an OIDC
   `redirect_uri` built from `BASE_URL` that would not match the app registration.

### 1.2 Challenge to the premise — read this before starting work

**This ticket cannot be fully delivered from this repository, and part of it may belong in a
different repository entirely.** Three facts, all verified:

* **This repo has no prod pipeline.** `.github/workflows/` deploys `aat`, `demo`, `ithc`,
  `perftest` and `preview` only — there is no `workflow.prod.yml`. `CLAUDE.md` states plainly:
  *"There is currently no prod deployment."* The production release is Flux-managed
  (`cnp-flux-config/apps/cath`), a separate repository.
* **`service.gov.uk` DNS is not managed here.** `.github/workflows/job.helm-deploy.yml:210-261`
  registers records in **private** DNS (`az network private-dns`) inside
  `$DNS_ZONE = {env}.platform.hmcts.net`, and explicitly skips names that already exist as CNAMEs to
  Azure Front Door. A public `service.gov.uk` apex record is a platform DNS / Front Door change.
* **The service currently serving prod may not be this one.** The issue is labelled
  `Post-Migration`, and `www.court-tribunal-hearings.service.gov.uk` is today served by the legacy
  `hmcts/pip-frontend`. If the acceptance criterion must be demonstrable *now*, the fix belongs in
  `pip-frontend` or in Front Door — not in `cath-service`. See CLARIFICATIONS NEEDED Q1.

### 1.3 Options

| Option | Where it lives | Pros | Cons |
|---|---|---|---|
| **A. Azure Front Door redirect rule** | Front Door Rules Engine (outside this repo) | No application code; redirect served at the edge and never reaches the cluster; costs no pod capacity | Config invisible to anyone reading this codebase; cannot be tested in CI; still needs an apex DNS record; does not stop the app serving on a non-canonical host if one is ever routed to it |
| **B. Express canonical-host middleware** (this plan) | `libs/web-core` + `apps/web/helm/values.yaml` | Version-controlled and unit-testable; works for *any* non-canonical host that reaches the app; enforces one canonical address for sessions, OIDC and search indexing | Still requires the apex DNS record and apex ingress rule (external); each redirect costs one round trip into the cluster |

**Recommendation: implement B, and request A in parallel.** They are not mutually exclusive. B is
the part that belongs in this repository and is the only part that is verifiable in CI; A is the
cheaper edge fix. Option A alone leaves the application incorrect — if the apex is ever routed to a
pod for any reason, the app serves the whole site on it. B is a correct backstop either way.

**Note the honest limitation:** merging B changes nothing observable in production until the two
external prerequisites in §2.6 are done. The code is inert by design on every environment this
repository can deploy to.

### 1.4 Architecture decisions

* **A middleware in `libs/web-core`, not logic in `apps/web`.** Per `CLAUDE.md` ("Don't put business
  logic in apps/") and the existing `libs/[module]/src/[name]-middleware.ts` convention. `app.ts`
  only wires it up.
* **Driven by a single environment variable, `CANONICAL_HOST`.** Unset or empty means passthrough.
  This keeps `if (environment === "prod")` out of application code entirely — the prod gate lives in
  the Helm template where every other environment-conditional value already lives (see `CFT_IDAM_URL`
  at `apps/web/helm/values.yaml:36`).
* **Redirect, not an interstitial "did you mean" page.** A 301 is resolved by the browser before any
  content is announced: no Welsh copy to write, no focus management, no new template, nothing for a
  screen reader to interrupt. An interstitial would need all four.
* **301 for `GET`/`HEAD`, 308 for everything else.** A 301 on a `POST` is re-issued by browsers as a
  `GET` and drops the body. 308 preserves method and body.
* **No new dependency.** Express 5 already exposes everything needed.

## 2. Implementation Details

**TEMPLATE SOURCE: `n/a`**

(No rendered page, template or locale content is involved — this is middleware plus Helm
configuration. The `migrate-pip-pages` skill does not apply.)

### 2.1 New file — `libs/web-core/src/middleware/canonical-host/canonical-host-middleware.ts`

Module ordering per `CLAUDE.md` §8: consts, exported function, then the interface at the bottom.

```typescript
import type { NextFunction, Request, Response } from "express";

export function canonicalHostMiddleware(options: CanonicalHostOptions = {}) {
  const canonicalHost = options.canonicalHost?.trim().toLowerCase();

  // Empty on every environment except prod, which is the only one with a second
  // public hostname to canonicalise to. Returning a passthrough keeps the
  // registration in app.ts unconditional.
  if (!canonicalHost) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.hostname.toLowerCase() === canonicalHost) {
      return next();
    }

    // A 301 on a POST is re-issued as a GET and drops the body; 308 preserves both.
    const status = req.method === "GET" || req.method === "HEAD" ? 301 : 308;
    res.redirect(status, `${req.protocol}://${canonicalHost}${req.originalUrl}`);
  };
}

export interface CanonicalHostOptions {
  canonicalHost?: string;
}
```

Each of these is a decision, not an incidental detail:

* **`req.hostname`, not `req.headers.host`.** `app.set("trust proxy", 1)` is already set
  (`apps/web/src/app.ts:88`), so Express 5's `req.hostname` honours `X-Forwarded-Host` and strips any
  port. Front Door forwards the original `Host` header (documented in `apps/web/helm/values.yaml`),
  so both paths yield the public hostname.
* **No open-redirect.** The destination host comes only from configuration, never from the request.
  A spoofed `X-Forwarded-Host` can at worst cause an unnecessary redirect *to the canonical host*;
  it can never send a user off-site. `req.originalUrl` is the parsed path and query from the request
  line, not a header.
* **`req.protocol`, not a hardcoded `https`.** Keeps local dev correct and lets the platform's
  existing HTTP→HTTPS handling do its job. In prod `X-Forwarded-Proto` is `https`.
* **`req.originalUrl`** preserves path *and* query verbatim — `?lng=cy`, `artefactId` deep links and
  flat-file download parameters all survive.
* **Both sides lowercased.** Host headers are case-insensitive;
  `Host: WWW.Court-Tribunal-Hearings.Service.Gov.UK` must not loop.
* **No loop is possible.** The only path into the redirect branch is a hostname that differs from the
  canonical host; the canonical host falls through to `next()`.

### 2.2 Export from `libs/web-core/src/index.ts`

Added in the existing alphabetically-sorted block, immediately before the `cookie-helpers` exports
(Biome enforces the sort order):

```typescript
export type { CanonicalHostOptions } from "./middleware/canonical-host/canonical-host-middleware.js";
export { canonicalHostMiddleware } from "./middleware/canonical-host/canonical-host-middleware.js";
```

### 2.3 Registration in `apps/web/src/app.ts`

Add `canonicalHostMiddleware` to the existing `@hmcts/web-core` import block (lines 54-63), and
register it immediately after `configureHelmet(...)` (which ends at line 103) and **before** the
`/assets` static handler at line 104:

```typescript
  app.use(canonicalHostMiddleware({ canonicalHost: process.env.CANONICAL_HOST }));
```

Reading `process.env` directly matches how `configureHelmet` is already called two lines above.

The position is deliberate and must not be "tidied":

* **After `/health` (line 92) and `healthcheck()` (line 93)** — Kubernetes probes and the platform
  health check must never receive a 301. In practice probes use the pod IP as `Host` so they would
  not match the redirect branch anyway, but the ordering makes that guarantee independent of how the
  probes happen to be configured.
* **After `monitoringMiddleware()` (line 94)** — redirects then appear in Application Insights, which
  is the only way to measure how much apex traffic there really is.
* **After `configureHelmet()`** — the 301 carries HSTS and the other security headers. A redirect
  issued before helmet would be the one response from the apex host with no
  `Strict-Transport-Security`.
* **Before `expressSessionRedis()` (line 113)** — a redirected request must not touch Redis or mint a
  `connect.sid` cookie scoped to the non-canonical host. This also makes apex traffic nearly free to
  serve.
* **Before the page router (line 220)** — otherwise `notFoundHandler()` would already have answered.

### 2.4 Configuration — `apps/web/helm/values.yaml`

Added to `nodejs.environment`, following the prod conditional already used for `CFT_IDAM_URL` on
line 36 of the same file. Backtick literals, not double quotes: the chart quotes the value before
`tpl`, which would escape double quotes.

```yaml
    # Canonical public hostname. Any other host that reaches the app is 301'd
    # here by canonicalHostMiddleware. Empty outside prod - lower environments
    # have no second public hostname, and the pipeline deploys release-scoped
    # hosts that must NOT be redirected away.
    CANONICAL_HOST: '{{ if eq .Values.global.environment `prod` }}www.court-tribunal-hearings.service.gov.uk{{ end }}'
```

On every non-prod environment this renders to an empty string, and the middleware is a passthrough.

`apps/web/helm/values.dev.yaml` needs **no** change: it does not set `CANONICAL_HOST`, so local
development gets `undefined` and the passthrough.

### 2.5 Configuration — pipeline release overrides

Every environment is deployed twice: Flux owns the plain hostnames, and this repo's pipeline deploys
a release-scoped copy. The pipeline release is served on
`${TEAM_NAME}-{{ .Release.Name }}-web.{{ env }}.platform.hmcts.net`, and the deploy smoke test and
E2E runs target that host. Inheriting a non-empty `CANONICAL_HOST` would 301 every one of those
requests to a host the release does not serve.

`CANONICAL_HOST` renders empty on all current pipeline environments (none is `prod`), so no override
is strictly required today. Add it explicitly anyway, next to the existing `additionalIngressHosts: []`
clear and for the identical documented reason, so a future prod pipeline cannot inherit it:

```yaml
# helm/cath-service/values.template.yaml  ->  cath-web.nodejs.environment
      CANONICAL_HOST: ""
```

```yaml
# helm/cath-service/values.preview.template.yaml  ->  cath-web.nodejs.environment
      CANONICAL_HOST: ""
```

The `keyVaults` parity test in `apps/web/helm/values.yaml.test.ts` is unaffected — this change
touches `environment`, not `keyVaults`.

### 2.6 External prerequisites — NOT changeable from this repository

The application change is inert until both are done, and the acceptance criterion cannot be
demonstrated in production without them. Neither is a file in this repo. Raise them as a separate
platform ticket and link it to #1223.

1. **Public DNS for the apex.** `court-tribunal-hearings.service.gov.uk` must resolve and route to
   the same Front Door endpoint as the `www.` name. `job.helm-deploy.yml` only touches private DNS
   inside `*.platform.hmcts.net` and deliberately skips Front Door CNAMEs.
2. **Apex ingress host rule on the prod release.** traefik 404s any `Host` it has no rule for. The
   prod public hostnames do not appear in `apps/web/helm/values.yaml`, which means they are set in
   the Flux repository (`cnp-flux-config/apps/cath`); the apex must be added to
   `additionalIngressHosts` there. It **cannot** be added conditionally to
   `apps/web/helm/values.yaml`: Helm values arrays take no per-item conditionals, and an
   unconditional entry would create a bogus host rule — and a DNS registration attempt — on every
   lower environment.

Satisfying both with a Front Door Rules Engine redirect on the apex endpoint (Option A) is also
acceptable; the middleware then never fires in normal operation but stays correct as a backstop.

### 2.7 Pre-existing interaction to confirm before release — `BASE_URL` / `CATH_SERVICE_URL`

`apps/web/helm/values.yaml:31` and `:37` template both values to the platform hostname:

```yaml
    BASE_URL: https://cath.{{ .Values.global.environment }}.platform.hmcts.net
    CATH_SERVICE_URL: https://cath.{{ .Values.global.environment }}.platform.hmcts.net
```

For `global.environment: prod` that renders `https://cath.prod.platform.hmcts.net`, which is **not**
the canonical public host. `BASE_URL` is what `libs/auth/src/config/` (`cft-idam-config.ts`,
`b2c-config.ts`, `crime-idam-config.ts`) builds OIDC `redirect_uri` values from. Note also that
`apps/web/config/default.json:10` already hardcodes
`"CATH_SERVICE_URL": "https://www.court-tribunal-hearings.service.gov.uk"`, so the chart value and
the config default disagree about the prod host.

If the Flux prod values do not override these to the `www.` host, a user who is redirected to the
canonical host and then signs in gets bounced to `cath.prod.platform.hmcts.net` (or fails with
`AADSTS50011`) — the same accessibility problem one page later. This is pre-existing and strictly
out of scope for the code change, but it must be confirmed against the Flux prod values before the
ticket is closed.

### 2.8 No database, API or content changes

No Prisma schema change, no API endpoint, no new page, no `.njk` template, no `en.ts`/`cy.ts`. The
redirect is a bodiless HTTP response, so there is no user-facing text to translate. Welsh users are
served by `req.originalUrl` carrying `?lng=cy` through the redirect.

## 3. Error Handling & Edge Cases

| Case | Behaviour | Why |
|---|---|---|
| `CANONICAL_HOST` unset (lower envs, local) | Passthrough — no host check at all | Keeps the change inert on every environment this repo deploys |
| `CANONICAL_HOST` empty string | Passthrough | This is literally what the Helm template renders outside prod |
| `CANONICAL_HOST` whitespace only | Passthrough | `.trim()` before the truthiness check, so a stray space in values.yaml cannot 301 everything to `https:///` |
| Request already on the canonical host | `next()` | No loop, no redirect |
| Mixed-case `Host` header | `next()` | Both sides lowercased; otherwise `WWW.…` would loop forever |
| `Host` includes a port (`:8080`) | Port stripped by `req.hostname` | Express 5 behaviour; a dev request on `localhost:8080` is unaffected because config is empty there |
| `POST`/`PUT`/`DELETE` on a non-canonical host | `308` | A `301` is re-issued as `GET`, silently dropping the form body |
| Spoofed `X-Forwarded-Host: evil.example.com` | 301 to the **configured** canonical host | Destination never comes from the request — no open redirect |
| Kubernetes liveness/readiness probe | Not redirected | Registered after `/health` and `healthcheck()`; probes also use the pod IP as `Host` |
| Release-scoped pipeline host | Not redirected | `CANONICAL_HOST` empty there, plus the explicit `""` override in both pipeline templates |
| Apex DNS/ingress not yet in place | Still a traefik 404 | External prerequisite §2.6 — the middleware cannot fix what never reaches it |

## 4. Acceptance Criteria Mapping

The ticket has one acceptance criterion: *"User is redirected to www. when the user attempts to
access CaTH service in the Production environment without prefixing with www. rather than a 404
page."* It decomposes into the following, each with its verification route.

| # | Criterion | Verified by |
|---|---|---|
| AC1 | `https://court-tribunal-hearings.service.gov.uk/` returns `301` with `Location: https://www.court-tribunal-hearings.service.gov.uk/` and the landing page renders | Unit scenario 2 (logic) + manual `curl -sSI` in prod (§5.4). Requires §2.6 |
| AC2 | Path is preserved: `/search` → `www.…/search` | Unit scenario 3 |
| AC3 | Query string is preserved, Welsh included: `/search?lng=cy` → `www.…/search?lng=cy`, page renders in Welsh | Unit scenarios 4 and 5 + manual browser check |
| AC4 | A request already on `www.` is served normally — no 301, no loop | Unit scenario 1 + `curl -sSIL --max-redirs 3` showing exactly one hop |
| AC5 | Plain `http://` on the apex ends on `https://www.…` | `req.protocol` (unit scenario 6) plus the platform's existing HTTP→HTTPS handling; manual check 5 |
| AC6 | `GET /health` is never redirected; probes stay green | Registration order §2.3 + app wiring test §5.2 + manual check 7 |
| AC7 | No redirect on aat / demo / ithc / perftest / preview | Unit scenarios 11-13 + Helm test §5.3 + `printenv CANONICAL_HOST` on aat |
| AC8 | The release-scoped pipeline host serves pages directly; deploy smoke test passes | Unit scenario 15 + Helm test §5.3 + the existing smoke test in `job.helm-deploy.yml` |
| AC9 | A `POST` to a non-canonical host gets `308`, preserving method and body | Unit scenario 9 |
| AC10 | A redirected request creates no session — no `connect.sid`, no Redis write | Registration before `expressSessionRedis` §2.3 + manual check 6 |
| AC11 | The 301 carries helmet's security headers including HSTS | Registration after `configureHelmet` §2.3 + manual check 1 |
| AC12 | `canonicalHostMiddleware` is exported from `@hmcts/web-core` and registered in the right place | App wiring test §5.2 |
| AC13 | `yarn lint` and `yarn test` pass with no new Biome warnings; the new file has full unit coverage | CI |
| AC14 | Apex DNS record and apex ingress rule confirmed in prod | **External** — §2.6. Without these, AC1-AC5 cannot be demonstrated |
| AC15 | Prod `BASE_URL`/`CATH_SERVICE_URL` point at the `www.` host so sign-in does not move the user off it | **External** — §2.7, confirm against Flux prod values |

## 5. Test Scenarios

### 5.1 Unit tests — `libs/web-core/src/middleware/canonical-host/canonical-host-middleware.test.ts`

Vitest, co-located, Arrange-Act-Assert per `.claude/rules/testing.md`. No Express mocking beyond
plain partial objects — the middleware reads four properties and calls one method.

```typescript
const CANONICAL_HOST = "www.court-tribunal-hearings.service.gov.uk";

beforeEach(() => {
  vi.clearAllMocks();
  mockRequest = { hostname: CANONICAL_HOST, method: "GET", protocol: "https", originalUrl: "/" };
  mockResponse = { redirect: vi.fn() };
  next = vi.fn();
});
```

| # | Scenario | Arrange | Assert |
|---|---|---|---|
| 1 | Existing behaviour still works — a request already on the canonical host is served | `hostname: CANONICAL_HOST` | `next` called once; `redirect` not called |
| 2 | **The new behaviour** — the apex host is redirected | `hostname: "court-tribunal-hearings.service.gov.uk"`, `originalUrl: "/"` | `redirect` called with `301, "https://www.court-tribunal-hearings.service.gov.uk/"`; `next` not called |
| 3 | Path preserved | `originalUrl: "/search"` | `Location` ends `/search` |
| 4 | Query string preserved, including the Welsh parameter | `originalUrl: "/search?lng=cy"` | `Location` is `https://www.…/search?lng=cy` |
| 5 | Multi-parameter deep link preserved verbatim | `originalUrl: "/summary-of-publications?locationId=5&lng=cy"` | `Location` query matches exactly, parameter order unchanged |
| 6 | Scheme follows `req.protocol` rather than being hardcoded | `protocol: "http"`, non-canonical host | `Location` starts `http://` |
| 7 | Host comparison is case-insensitive — no loop on a mixed-case `Host` | `hostname: "WWW.Court-Tribunal-Hearings.Service.Gov.UK"` | `next` called; `redirect` not called |
| 8 | Configured host is normalised too | `canonicalHost: "  WWW.Court-Tribunal-Hearings.Service.Gov.UK  "`, `hostname: CANONICAL_HOST` | `next` called; `redirect` not called |
| 9 | `POST` gets 308 so method and body survive | `method: "POST"`, non-canonical host | `redirect` called with status `308` |
| 10 | `HEAD` gets 301 like `GET` | `method: "HEAD"`, non-canonical host | `redirect` called with status `301` |
| 11 | No config — passthrough (covers aat/demo/ithc/perftest/preview/local) | `canonicalHostMiddleware({})`, non-canonical host | `next` called; `redirect` not called |
| 12 | Empty-string config — passthrough (what the Helm template renders outside prod) | `canonicalHostMiddleware({ canonicalHost: "" })` | `next` called; `redirect` not called |
| 13 | Whitespace-only config — passthrough | `canonicalHostMiddleware({ canonicalHost: "   " })` | `next` called; `redirect` not called |
| 14 | A spoofed forwarded host cannot cause an off-site redirect | `hostname: "evil.example.com"` | `Location` host is the configured canonical host and does **not** contain `evil.example.com` |
| 15 | Release-scoped pipeline host is not redirected when config is empty | `canonicalHost: ""`, `hostname: "cath-cath-service-aat-web.aat.platform.hmcts.net"` | `next` called; `redirect` not called |

Scenario 14 is the security-relevant one and must not be dropped — it is what proves the destination
comes from configuration and never from the request.

### 5.2 Application wiring test — `apps/web/src/app.test.ts`

The file mocks `@hmcts/web-core` wholesale at line 15, so `canonicalHostMiddleware` **must** be added
to that mock factory or `createApp()` throws on an undefined import:

```typescript
  canonicalHostMiddleware: vi.fn(() => vi.fn((_req: any, _res: any, next: any) => next())),
```

Then add to the existing `describe("createApp")` block, alongside
`"should configure helmet middleware"`:

* `canonicalHostMiddleware` is called exactly once during `createApp()`.
* It is called with the value of `process.env.CANONICAL_HOST` — set the env var in `beforeEach`,
  assert `toHaveBeenCalledWith({ canonicalHost: "www.court-tribunal-hearings.service.gov.uk" })`,
  and delete it in `afterEach`.
* It is called with `{ canonicalHost: undefined }` when the env var is unset — the lower-environment
  case.

### 5.3 Helm values test — `apps/web/helm/values.yaml.test.ts`

The file already parses the chart YAML and asserts on hostname ownership, so these belong there
rather than in a new file. Add to the existing `describe("Front Door hostname ownership")` block —
the reason is identical to the `additionalIngressHosts: []` assertion already there: the pipeline
release must not inherit a public-hostname value from the subchart default.

* `CANONICAL_HOST` is present in `nodejs.environment` in `apps/web/helm/values.yaml`.
* Its raw templated value contains `eq .Values.global.environment`, `prod`, and
  `www.court-tribunal-hearings.service.gov.uk` — i.e. the canonical host is gated on prod and cannot
  leak into a lower environment.
* It uses backtick literals rather than double quotes, matching the `CFT_IDAM_URL` convention in the
  same file.
* Both `helm/cath-service/values.template.yaml` and
  `helm/cath-service/values.preview.template.yaml` set
  `cath-web.nodejs.environment.CANONICAL_HOST` to `""`.
* The existing `describe("pipeline values templates")` regex already rejects shell-style
  `${VAR:-default}` across the whole file, so the new key is covered without a change there.

### 5.4 No new Playwright spec — and why that is deliberate

A host-based redirect cannot be meaningfully exercised against the local or preview server:
`CANONICAL_HOST` is empty there **by design** (§2.4), so the middleware is a passthrough. A test
written against it would either assert nothing or require a bespoke server configuration that
matches no deployed environment — a test that passes for the wrong reason, which is exactly what
`CLAUDE.md` warns against under "minimize test count".

What the existing suite does usefully prove is that inserting middleware into the chain broke
nothing. These must stay green with **no modification**:

* `e2e-tests/tests/landing-page.spec.ts` — the service still serves its entry page.
* `e2e-tests/tests/page-structure.spec.ts` — header, footer, skip link and phase banner unaffected.
* `e2e-tests/tests/400-error-page.spec.ts` — `notFoundHandler()` is still reached for genuinely
  unknown paths, i.e. the new middleware did not swallow requests.
* `e2e-tests/tests/language-toggle-service-navigation.spec.ts` — the `lng` mechanism still works
  end to end.
* `e2e-tests/tests/sign-in.spec.ts` and `cft-idam/`, `crime-idam/`, `sso/` — the middleware sits
  before session handling, so the OIDC flows must be confirmed unaffected.

### 5.5 Manual verification in production (post-deploy, after the §2.6 prerequisites)

These are the checks that actually close the ticket, because the external DNS and ingress work
cannot be tested in CI.

```bash
# 1. Apex redirects to www, with security headers on the 301
curl -sSI https://court-tribunal-hearings.service.gov.uk/
#    expect: HTTP/2 301
#            location: https://www.court-tribunal-hearings.service.gov.uk/
#            strict-transport-security present

# 2. Path and Welsh query parameter preserved
curl -sSI "https://court-tribunal-hearings.service.gov.uk/search?lng=cy"
#    expect: location: https://www.court-tribunal-hearings.service.gov.uk/search?lng=cy

# 3. Canonical host is NOT redirected
curl -sSI https://www.court-tribunal-hearings.service.gov.uk/
#    expect: HTTP/2 200, no location header

# 4. Follow the chain - exactly one hop, no loop
curl -sSIL --max-redirs 3 https://court-tribunal-hearings.service.gov.uk/
#    expect: 301 then 200; no "Maximum (3) redirects followed" error

# 5. Plain HTTP on the apex still ends on https://www.
curl -sSIL --max-redirs 3 http://court-tribunal-hearings.service.gov.uk/

# 6. No session cookie minted on the apex
curl -sSI https://court-tribunal-hearings.service.gov.uk/ | grep -i set-cookie
#    expect: no output

# 7. Health endpoint never redirected
curl -sSI https://www.court-tribunal-hearings.service.gov.uk/health
#    expect: HTTP/2 200
```

Browser checks alongside:

* Type `court-tribunal-hearings.service.gov.uk` into a clean profile's address bar — the landing page
  renders and the address bar shows the `www.` host.
* Repeat with the Welsh toggle, confirming the redirect does not drop the language selection.
* Complete one full sign-in journey (a media user via B2C and one admin via SSO) **starting from the
  apex hostname**, confirming the user stays on `www.court-tribunal-hearings.service.gov.uk`
  throughout and is not thrown onto a platform hostname. This is the check for §2.7.

### 5.6 Lower-environment verification (provable before prod)

* Deploy to aat and confirm the pod has no canonical host set:
  `kubectl exec … -- printenv CANONICAL_HOST` returns nothing.
* Confirm both the Flux host (`cath.aat.platform.hmcts.net`) and the release-scoped pipeline host
  return `200` with no `location` header — proving the change is genuinely inert outside prod.
* Confirm the deploy smoke test in `.github/workflows/job.helm-deploy.yml` passes; that is the
  practical guard against a stray redirect on a release-scoped host.

## 6. CLARIFICATIONS NEEDED

1. **Which service is this fix actually for?** This repository has no prod pipeline
   (`.github/workflows/` covers aat/demo/ithc/perftest/preview only) and `CLAUDE.md` states *"There
   is currently no prod deployment."* `www.court-tribunal-hearings.service.gov.uk` is today served
   by the legacy `hmcts/pip-frontend`. The issue is labelled `Post-Migration`, which suggests
   `cath-service` is correct — but if the 404 reported on PUB-2085 needs fixing for **current**
   users, the change belongs in `pip-frontend` or Front Door and this ticket will deliver nothing
   observable. Please confirm: implement here for post-migration, or raise a parallel ticket against
   the live service?

2. **Who owns the apex DNS record and the apex ingress rule?** Both are hard external prerequisites
   (§2.6) and neither is a file in this repo — the public `service.gov.uk` zone and Front Door are
   platform-managed, and prod ingress hosts live in `cnp-flux-config/apps/cath`. Should a linked
   platform/Flux ticket be raised as part of this one, and is #1223 blocked on it?

3. **Front Door rule instead of, or as well as, the middleware?** If the platform team is willing to
   add a Front Door Rules Engine redirect on the apex (Option A, §1.3), that alone satisfies the
   acceptance criterion with zero code. The recommendation here is to do both — A as the edge fix, B
   as the in-repo backstop that stops the app ever serving on a non-canonical host. Confirm that
   doing both is acceptable, or whether only one is wanted.

4. **Is `www.court-tribunal-hearings.service.gov.uk` definitely the canonical prod host?**
   `apps/web/config/default.json:10` says yes, but `apps/web/helm/values.yaml` renders prod
   `BASE_URL`/`CATH_SERVICE_URL` as `https://cath.prod.platform.hmcts.net`. The two disagree. Please
   confirm the canonical host, and confirm the Flux prod values override `BASE_URL` to it — otherwise
   a user redirected onto the canonical host is thrown off it again the moment they sign in (§2.7).

5. **Apex only, or any non-canonical host?** The plan redirects *every* non-canonical host that
   reaches the app, which is stricter than the ticket asks and is the behaviour that protects
   sessions and OIDC. The alternative is an explicit apex→www rule only. Confirm the stricter
   behaviour is wanted. Note this is the reason the pipeline templates need the explicit
   `CANONICAL_HOST: ""` override in §2.5.

6. **Are there other non-`www.` prod hostnames to consider?** For example a bare
   `court-tribunal-hearings.gov.uk`, or legacy `pip-frontend` hostnames that should also land on the
   canonical host. The middleware handles any of them for free once DNS and ingress route them, but
   each needs its own DNS/ingress entry, so the list needs to be known up front.
