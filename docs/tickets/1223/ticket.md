# #1223: Redirect to www. on Prod domain

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** Post-Migration
**Created:** 2026-10-22T16:01:09Z
**Updated:** 2026-10-22T16:20:25Z

## Description

**PROBLEM STATEMENT**
It was discovered as part of https://hmcts.atlassian.net/browse/PUB-2085 that CaTH users are unable to access CaTH service in the Production environment without prefixing with www. Although other services are similar, system accessibility will be increased if redirected to www. when a user attempts to CaTH service in the Production environment without prefixing with www.


**AS A** Service
**I WANT** to redirect CaTH users who attempt to access CaTH service in the Production environment without  prefixing with www. 
**SO THAT** there is increased system accessibility


**ACCEPTANCE CRITERIA**
User is redirected to www. when the user attempts to access CaTH service in the Production environment without  prefixing with www. rather than a 404 page

## Comments

### Comment by OgechiOkelu on 2026-10-22T16:12:34Z

@spec enhancement 

### Comment by hmctsclaudecode on 2026-10-22T16:19:03Z

# Technical Specification — Issue #1223: Redirect to `www.` on Prod domain

## 1. Current State

The public production hostname for CaTH is `www.court-tribunal-hearings.service.gov.uk`. This is the value already baked into the service's own configuration and outbound links:

- `apps/web/config/default.json` — `"CATH_SERVICE_URL": "https://www.court-tribunal-hearings.service.gov.uk"`
- `libs/web-core/src/locales/accessibility-statement/en.ts` / `cy.ts` — reference `court-tribunal-hearings.service.gov.uk`
- `libs/notifications/src/notify-templates/template-config.ts` — GOV.UK Notify email links point at the `www.` host

A user who types or follows a link to the apex (bare) hostname `court-tribunal-hearings.service.gov.uk` — no `www.` prefix — does not reach the service. They get a 404. This was raised on PUB-2085.

The 404 is produced before any application code runs. Two things are missing:

1. **No host rule.** The ingress only claims the hostnames listed in `apps/web/helm/values.yaml`:
   ```yaml
   ingressHost: cath-web.{{ .Values.global.environment }}.platform.hmcts.net
   additionalIngressHosts:
     - cath.{{ .Values.global.environment }}.platform.hmcts.net
   ```
   Neither the apex nor the `www.` `service.gov.uk` name appears. The existing comment in that file documents the exact failure mode: *"without a matching rule traefik 404s and Front Door reports 502."* A request arriving with `Host: court-tribunal-hearings.service.gov.uk` matches no rule, so traefik answers 404 and the Express app never sees the request.

2. **No canonicalisation in the app.** There is no middleware anywhere in `libs/web-core/src/middleware/` that inspects the `Host` header. `libs/web-core/src/index.ts` exports `configureNonce`, `configureHelmet`, `configureGovuk`, `configureCookieManager`, `localeMiddleware`, `notFoundHandler`, `errorHandler` and the session stores — nothing host-related. So even if the apex host were routed to a pod, the app would serve the site on the apex host rather than redirecting, leaving two hostnames serving identical content (duplicate content, split session cookies, and an OIDC `redirect_uri` that would not match the app registration).

Limitations this creates:

- Users who omit `www.` hit a dead end rather than the service. The 404 page gives them no route to recovery — it is the generic `errors/404` template, which does not know the user mistyped a hostname.
- Printed material, word-of-mouth references and links written as the bare domain all fail.
- There is no single canonical hostname enforced by the service, so any future host added to the ingress silently becomes a second valid address for the whole site.

### Scope boundary — and a challenge to the premise

**This is primarily an infrastructure change, not an application change.** The apex hostname must resolve in public DNS and route to the service before any application-level redirect can execute. That DNS is not managed in this repository:

- `.github/workflows/job.helm-deploy.yml` registers A records only inside `$DNS_ZONE` (`*.platform.hmcts.net`), and explicitly skips names that already exist as CNAMEs to Azure Front Door.
- `service.gov.uk` records are not in that zone. They are owned by the platform DNS / Front Door configuration outside this repo.
- Per `CLAUDE.md`, *"There is currently no prod deployment"* from this repository's pipeline. The production release is Flux-managed (`cnp-flux-config/apps/cath`).

There are therefore two viable implementations, and it is worth being explicit that the cheaper one involves no code at all:

| Option | Where it lives | Pros | Cons |
|---|---|---|---|
| **A. Azure Front Door redirect rule** | Front Door Rules Engine (outside this repo) | Zero application code; redirect happens at the edge, never reaches the cluster; no pod resource used on redirected traffic | Config lives outside the repo; cannot be unit-tested in CI; invisible to anyone reading this codebase; still needs an apex DNS record |
| **B. Express canonical-host middleware** (this spec) | `libs/web-core` + `apps/web/helm/values.yaml` | Testable in CI; version-controlled; works for any host that reaches the app; guards against duplicate-host serving generally | Still requires the apex DNS record and ingress host rule to be added; redirect costs a round trip into the cluster |

Option A alone does not make the application correct — if the apex is ever routed to a pod for any other reason, the app will happily serve on it. This spec implements **Option B** because it is the part that belongs in this repository and is verifiable, and flags the DNS/Front Door prerequisite as a hard external dependency. The two are not mutually exclusive; B is a correct backstop even if A is also configured.

## 2. Proposed Improvement

**I want to** permanently redirect any request that reaches the CaTH web application on a non-canonical hostname to the same path and query string on the configured canonical hostname — so that `http(s)://court-tribunal-hearings.service.gov.uk/<path>?<query>` becomes `https://www.court-tribunal-hearings.service.gov.uk/<path>?<query>` in production — and add the apex hostname to the production ingress so those requests reach the application at all.

**So that** there is increased system accessibility: users who omit the `www.` prefix land on the service rather than a 404, deep links written without `www.` keep working, and the service has exactly one canonical address for sessions, OIDC redirect URIs, analytics and search indexing.

## 3. Modification Details

* **Visual Changes:** None. No page, template, component or content string changes. The redirect is an HTTP response with no body, so there is no GOV.UK Design System component involved and no English or Welsh copy to add. Users see the existing pages, just on the canonical hostname. No `cy.ts` / `en.ts` changes are required — and the `?lng=cy` query parameter must survive the redirect (see `req.originalUrl` below), so Welsh users who omit `www.` keep their language selection.

* **Functional Changes:** See below.

### 3.1 Request flow

Current behaviour in production:

```
  Browser
     |  GET http://court-tribunal-hearings.service.gov.uk/search
     v
  Public DNS ---- no record / no route for apex ---------+
     |                                                   |
     v (if it does resolve to Front Door / traefik)       |
  traefik: Host header matches no ingress rule           |
     |                                                   |
     v                                                   v
   404  <------------------------------------------- dead end
   (Express never runs)
```

Target behaviour:

```
  Browser
     |  GET http://court-tribunal-hearings.service.gov.uk/search?lng=cy
     v
  Public DNS: apex -> Front Door            [EXTERNAL PREREQUISITE]
     v
  traefik: ingress rule for apex host       [EXTERNAL PREREQUISITE]
     v
  +--------------------- apps/web (Express) ----------------------+
  |  /health, healthcheck()          -> not reached (host differs |
  |                                     only for public traffic)  |
  |  monitoringMiddleware()           -> redirect is recorded in   |
  |                                      Application Insights     |
  |  configureNonce()                                             |
  |  configureHelmet()               -> security headers set on    |
  |                                      the 301 response too      |
  |  canonicalHostMiddleware()  <=== NEW                           |
  |     req.hostname = "court-tribunal-hearings.service.gov.uk"    |
  |     CANONICAL_HOST = "www.court-tribunal-hearings.service.gov.uk"
  |     -> 301 Location: https://www.court-tribunal-hearings...    |
  |                        /search?lng=cy                          |
  |  (session / Redis / routes NOT reached - no session created)   |
  +----------------------------------------------------------------+
     |
     v  301
  Browser re-requests on www. host -> page renders in Welsh
```

### 3.2 New middleware — `libs/web-core/src/middleware/canonical-host/canonical-host-middleware.ts`

```typescript
import type { NextFunction, Request, Response } from "express";

export function canonicalHostMiddleware(options: CanonicalHostOptions = {}) {
  const canonicalHost = options.canonicalHost?.trim().toLowerCase();

  // Unset on every environment except prod, where there is no second public
  // hostname to canonicalise to. Returning a passthrough keeps the middleware
  // registration unconditional in app.ts.
  if (!canonicalHost) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.hostname.toLowerCase() === canonicalHost) {
      return next();
    }

    // 301 for GET/HEAD so browsers and search engines cache the canonical host.
    // 308 for anything else: a 301 is re-issued as GET and would drop the body.
    const status = req.method === "GET" || req.method === "HEAD" ? 301 : 308;
    res.redirect(status, `${req.protocol}://${canonicalHost}${req.originalUrl}`);
  };
}

interface CanonicalHostOptions {
  canonicalHost?: string;
}
```

Design points, each of which is a decision rather than an incidental detail:

- **`req.hostname`, not `req.headers.host`.** `app.set("trust proxy", 1)` is already set (`apps/web/src/app.ts:88`), so Express 5's `req.hostname` resolves `X-Forwarded-Host` when present and strips the port. Front Door forwards the original `Host` header (documented in `apps/web/helm/values.yaml`), so either header yields the public hostname.
- **No open-redirect risk.** The destination host is taken only from configuration, never from the request. A spoofed `X-Forwarded-Host` can at most cause an unnecessary redirect *to the canonical host*; it can never redirect a user off-site. `req.originalUrl` is the already-parsed path and query from the request line, not a header.
- **`req.protocol`, not a hardcoded `https`.** Preserves correctness behind the local dev server and lets the platform's existing HTTP→HTTPS handling do its job. In production `X-Forwarded-Proto` is `https`, so the `Location` is `https://`.
- **`req.originalUrl`** preserves path *and* query exactly — including `?lng=cy`, flat-file download parameters and `artefactId` deep links.
- **Case-insensitive comparison, both sides lowercased.** Host headers are case-insensitive; a `Host: WWW.Court-Tribunal-Hearings.Service.Gov.UK` must not loop.
- **No redirect loop possible.** The only exit from the redirect branch is a hostname that differs from the canonical host; the canonical host itself falls through to `next()`.
- **Empty/unset config is a no-op**, so aat, demo, ithc, perftest, preview and local development are unaffected without any `if (environment === "prod")` branching in app code.

### 3.3 Export from `libs/web-core/src/index.ts`

Added in the existing alphabetical block, next to the other middleware exports:

```typescript
export type { CanonicalHostOptions } from "./middleware/canonical-host/canonical-host-middleware.js";
export { canonicalHostMiddleware } from "./middleware/canonical-host/canonical-host-middleware.js";
```

`CanonicalHostOptions` must be changed from `interface` to an exported `interface` for this (it is declared at the bottom of the file per the module-ordering convention).

### 3.4 Registration in `apps/web/src/app.ts`

Inserted immediately after `configureHelmet(...)` and **before** the `/assets` static handler and `expressSessionRedis(...)`:

```typescript
  app.use(
    configureHelmet({
      cftIdamUrl: process.env.CFT_IDAM_URL,
      crimeIdamUrl: process.env.CRIME_IDAM_BASE_URL,
      b2cCustomDomain: process.env.B2C_CUSTOM_DOMAIN,
      b2cTenantName: process.env.B2C_TENANT_NAME
    })
  );
  app.use(canonicalHostMiddleware({ canonicalHost: process.env.CANONICAL_HOST }));
```

Position is deliberate and must not be "tidied":

- **After `/health` and `healthcheck()`** — Kubernetes probes and the platform health check must never receive a 301. (In practice probes use the pod IP as `Host`, so they would not match the redirect branch anyway, but ordering makes that guarantee independent of probe configuration.)
- **After `monitoringMiddleware()`** — redirects are then visible in Application Insights, which is how we measure how much apex traffic there actually is.
- **After `configureHelmet()`** — the 301 response carries HSTS and the other security headers. A redirect issued before helmet would be the one response from the apex host with no `Strict-Transport-Security` header.
- **Before `expressSessionRedis()`** — a redirected request must not touch Redis or mint a session cookie scoped to the non-canonical host. This also means apex traffic costs almost nothing to serve.
- **Before the page router** — otherwise `notFoundHandler()` would already have answered 404.

### 3.5 Configuration — `apps/web/helm/values.yaml`

Added to `nodejs.environment`, following the existing prod conditional used for `CFT_IDAM_URL` on line 35 of the same file (backtick literals because the chart quotes the value before `tpl`, which would escape double quotes):

```yaml
    # Canonical public hostname. Non-canonical hosts that reach the app are
    # 301'd here by canonicalHostMiddleware. Empty outside prod: lower
    # environments have no second public hostname, and the pipeline releases
    # are served on release-scoped hosts that must NOT be redirected.
    CANONICAL_HOST: '{{ if eq .Values.global.environment `prod` }}www.court-tribunal-hearings.service.gov.uk{{ end }}'
```

On every non-prod environment this renders to an empty string and the middleware is a passthrough.

### 3.6 Configuration — pipeline release overrides

Each environment is deployed twice: Flux owns the plain hostnames, and this repo's pipeline deploys a release-scoped copy (`helm/cath-service/values.template.yaml`). The pipeline release is served on `${TEAM_NAME}-{{ .Release.Name }}-web.{{ env }}.platform.hmcts.net` and its smoke test and E2E runs target that host. Inheriting a non-empty `CANONICAL_HOST` would 301 every one of those requests away to a host the release does not serve.

`CANONICAL_HOST` is empty on all current pipeline environments (none is `prod`), so no override is strictly required today. Add it explicitly anyway, alongside the existing `additionalIngressHosts: []` clear and for the same documented reason, so that a future prod pipeline cannot inherit it:

```yaml
# helm/cath-service/values.template.yaml  -> cath-web.nodejs.environment
      CANONICAL_HOST: ""
```

```yaml
# helm/cath-service/values.preview.template.yaml  -> cath-web.nodejs.environment
      CANONICAL_HOST: ""
```

Note the standing constraint in `apps/web/helm/values.yaml`: the `keyVaults` list is duplicated into the preview template and `apps/web/helm/values.yaml.test.ts` fails the build if the two drift. This change touches `environment`, not `keyVaults`, so that parity test is unaffected.

### 3.7 External prerequisites (not changeable from this repository)

The application change is inert until both of these are done. Neither is a file in this repo, and the ticket cannot be verified in production without them.

1. **Public DNS record for the apex.** `court-tribunal-hearings.service.gov.uk` must resolve and route to the same Front Door endpoint as the `www.` name. `.github/workflows/job.helm-deploy.yml` only registers A records inside `*.platform.hmcts.net` and deliberately skips Front Door CNAMEs, so this is a platform DNS change.
2. **Ingress host rule for the apex on the prod release.** traefik 404s any `Host` it has no rule for. The production hostnames are not in `apps/web/helm/values.yaml` — `www.court-tribunal-hearings.service.gov.uk` does not appear there, which means prod host values are set in the Flux repository (`cnp-flux-config/apps/cath`). The apex must be added to `additionalIngressHosts` there, next to the existing `www.` entry. It cannot be added to `apps/web/helm/values.yaml` conditionally: Helm values arrays cannot have per-item conditionals, and an unconditional entry would create a bogus host rule (and a DNS registration attempt) on every lower environment.

Alternatively, satisfy both with a Front Door Rules Engine redirect on the apex endpoint (Option A in section 1). The middleware then never fires in normal operation but remains correct as a backstop.

### 3.8 Interaction to verify before release — `BASE_URL` and `CATH_SERVICE_URL`

`apps/web/helm/values.yaml` templates both to the platform hostname:

```yaml
    BASE_URL: https://cath.{{ .Values.global.environment }}.platform.hmcts.net
    CATH_SERVICE_URL: https://cath.{{ .Values.global.environment }}.platform.hmcts.net
```

For `global.environment: prod` that renders `https://cath.prod.platform.hmcts.net`, which is **not** the canonical public host. `BASE_URL` is what `libs/auth/src/config/cft-idam-config.ts`, `b2c-config.ts` and `crime-idam-config.ts` build OIDC `redirect_uri` values from. If the prod Flux values do not already override these to the `www.` host, then a user redirected to the canonical host and then signing in would be bounced to `cath.prod.platform.hmcts.net` (or fail with `AADSTS50011`), defeating the point of the redirect.

This is pre-existing and strictly out of scope for the code change, but it must be confirmed against the Flux prod values before closing the ticket — a user landing on the canonical host and then being thrown back onto a different hostname by sign-in is the same accessibility problem in a different place.

## 4. Acceptance Criteria

* [ ] A request to `https://court-tribunal-hearings.service.gov.uk/` in production returns `301 Moved Permanently` with `Location: https://www.court-tribunal-hearings.service.gov.uk/`, and the browser renders the CaTH landing page — not a 404.
* [ ] The redirect preserves the path: `court-tribunal-hearings.service.gov.uk/search` → `www.court-tribunal-hearings.service.gov.uk/search`.
* [ ] The redirect preserves the query string: `court-tribunal-hearings.service.gov.uk/search?lng=cy` → `www.court-tribunal-hearings.service.gov.uk/search?lng=cy`, and the page renders in Welsh.
* [ ] A request already on `https://www.court-tribunal-hearings.service.gov.uk/` is served normally with no redirect (no 301, no redirect loop).
* [ ] `http://court-tribunal-hearings.service.gov.uk/` (plain HTTP) ends up on `https://www.court-tribunal-hearings.service.gov.uk/` — via the platform's existing HTTP→HTTPS handling plus this redirect, in either order.
* [ ] `GET /health` continues to return its normal health payload and is never redirected; Kubernetes readiness and liveness probes stay green through the deployment.
* [ ] No redirect occurs on aat, demo, ithc, perftest or preview: `CANONICAL_HOST` renders empty there and `canonicalHostMiddleware` is a passthrough.
* [ ] The pipeline-deployed release-scoped host (`cath-cath-service-<env>-web.<env>.platform.hmcts.net`) serves pages directly with no redirect, and the deploy smoke test passes.
* [ ] A non-GET request (e.g. `POST`) arriving on a non-canonical host receives `308 Permanent Redirect` rather than `301`, so the method and body are preserved.
* [ ] `canonicalHostMiddleware` is exported from `@hmcts/web-core` and registered in `apps/web/src/app.ts` after `configureHelmet` and before `expressSessionRedis`.
* [ ] A redirected request creates no session: no `connect.sid` cookie is set on the non-canonical host and no Redis write occurs.
* [ ] The 301 response carries the standard helmet security headers, including `Strict-Transport-Security`.
* [ ] Unit tests for `canonical-host-middleware.ts` pass with `yarn test`, and `libs/web-core` coverage for the new file is 100% (it is small enough that nothing less is defensible).
* [ ] `yarn lint` and `yarn test` pass across the monorepo with no new Biome warnings.
* [ ] Apex DNS record and apex ingress host rule are confirmed in place in production (external prerequisites, section 3.7) — without these the other criteria cannot be demonstrated.
* [ ] Prod `BASE_URL` / `CATH_SERVICE_URL` confirmed to point at `https://www.court-tribunal-hearings.service.gov.uk` so sign-in does not move the user off the canonical host (section 3.8).

## 5. Impact on Existing Users

**No re-training, no announcement needed.** Nobody currently uses the apex hostname successfully — it 404s — so there is no existing behaviour to migrate and no habit to unlearn. Users who already type `www.` see no change whatsoever: their requests match the canonical host and fall straight through the new middleware.

The change is strictly additive in user terms: an address that previously failed now works.

Specific groups and effects:

- **Users who omit `www.`** — currently blocked, now reach the service. This is the entire point of the ticket.
- **Users who already use `www.`** — unaffected. One extra string comparison per request, and no redirect.
- **Welsh-language users** — unaffected, and the `?lng=cy` parameter survives the redirect so a Welsh deep link without `www.` resolves in Welsh rather than dropping to English.
- **Signed-in users (media, CFT IDAM, Crime IDAM, SSO admins)** — unaffected in the normal case. Anyone who had somehow established a session on a non-canonical host would lose it, because session cookies are host-scoped. Since the apex currently 404s, no such session can exist.
- **Subscribers receiving GOV.UK Notify emails** — unaffected. `libs/notifications/src/notify-templates/template-config.ts` already links to the `www.` host, so those links were never going through the apex.
- **Third-party and API consumers (Courtel, APIM)** — unaffected. They call the API application (`cath-api`), a separate deployment with its own ingress host; this change touches only `apps/web`.
- **Screen reader and assistive technology users** — no impact beyond the general benefit. A 301 is handled by the browser before any content is announced, so there is no interruption, no focus change to manage and no announcement to author. This is why the redirect is the right pattern here rather than an interstitial "did you mean" page, which would need content, Welsh translation and a focus-management decision.
- **Search engines and external sites linking to the bare domain** — the `301` (rather than `302`) consolidates the two hostnames onto one canonical address, so existing inbound links to the apex pass through correctly rather than being treated as a separate site.

**Operational impact:** apex traffic now reaches the cluster and consumes a request, but the middleware sits before session handling so each redirect is a few microseconds of string work and no Redis round trip. Volume is expected to be small and is observable in Application Insights because the middleware is registered after `monitoringMiddleware`.

**Rollback:** setting `CANONICAL_HOST` to an empty string in the prod values restores the previous application behaviour without a code change or a revert. Note that this restores the *application* behaviour only — once the apex DNS and ingress rule exist, an empty `CANONICAL_HOST` means the apex serves the full site directly rather than 404ing. That is a functional-but-non-canonical state, acceptable as a brief rollback position but not as a resting state.

## 6. Test Scenarios

### 6.1 Unit tests — `libs/web-core/src/middleware/canonical-host/canonical-host-middleware.test.ts`

Vitest, co-located with the source, Arrange-Act-Assert per `.claude/rules/testing.md`. No mocking of Express is needed beyond plain partial objects — the middleware reads four properties and calls one method.

```typescript
import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { canonicalHostMiddleware } from "./canonical-host-middleware.js";

const CANONICAL_HOST = "www.court-tribunal-hearings.service.gov.uk";

describe("canonicalHostMiddleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = { hostname: CANONICAL_HOST, method: "GET", protocol: "https", originalUrl: "/" };
    mockResponse = { redirect: vi.fn() };
    next = vi.fn();
  });

  // ... scenarios below
});
```

| # | Scenario | Arrange | Assert |
|---|---|---|---|
| 1 | Verify previous behaviour is still supported — request already on the canonical host is served normally | `hostname: "www.court-tribunal-hearings.service.gov.uk"` | `next` called once; `redirect` not called |
| 2 | **The new behaviour** — apex host is redirected to the canonical host | `hostname: "court-tribunal-hearings.service.gov.uk"`, `originalUrl: "/"` | `redirect` called with `301, "https://www.court-tribunal-hearings.service.gov.uk/"`; `next` not called |
| 3 | Path is preserved | `originalUrl: "/search"` | `Location` ends `/search` |
| 4 | Query string is preserved, including the Welsh language parameter | `originalUrl: "/search?lng=cy"` | `Location` is `https://www.court-tribunal-hearings.service.gov.uk/search?lng=cy` |
| 5 | Multi-parameter deep link is preserved verbatim | `originalUrl: "/summary-of-publications?locationId=5&lng=cy"` | `Location` query matches exactly, parameter order unchanged |
| 6 | Scheme follows `req.protocol` rather than being hardcoded | `protocol: "http"`, non-canonical hostname | `Location` starts `http://` |
| 7 | Host comparison is case-insensitive — no loop on a mixed-case `Host` | `hostname: "WWW.Court-Tribunal-Hearings.Service.Gov.UK"` | `next` called; `redirect` not called |
| 8 | Configured canonical host is normalised too | `canonicalHost: "  WWW.Court-Tribunal-Hearings.Service.Gov.UK  "`, `hostname: CANONICAL_HOST` | `next` called; `redirect` not called |
| 9 | `POST` gets 308 so method and body survive | `method: "POST"`, non-canonical hostname | `redirect` called with status `308` |
| 10 | `HEAD` gets 301 like `GET` | `method: "HEAD"`, non-canonical hostname | `redirect` called with status `301` |
| 11 | No config — middleware is a passthrough (covers aat/demo/ithc/perftest/preview/local) | `canonicalHostMiddleware({})`, non-canonical hostname | `next` called; `redirect` not called |
| 12 | Empty-string config is a passthrough (this is what the Helm template renders outside prod) | `canonicalHostMiddleware({ canonicalHost: "" })` | `next` called; `redirect` not called |
| 13 | Whitespace-only config is a passthrough | `canonicalHostMiddleware({ canonicalHost: "   " })` | `next` called; `redirect` not called |
| 14 | A spoofed forwarded host cannot cause an off-site redirect | `hostname: "evil.example.com"` | `Location` host is the configured canonical host; `Location` does not contain `evil.example.com` |
| 15 | Release-scoped pipeline host is not redirected when config is empty | `canonicalHostMiddleware({ canonicalHost: "" })`, `hostname: "cath-cath-service-aat-web.aat.platform.hmcts.net"` | `next` called; `redirect` not called |

Scenario 14 is the security-relevant one and must not be dropped: it is the test that proves the destination comes from configuration and never from the request.

### 6.2 Application wiring test — `apps/web/src/app.test.ts`

The existing file mocks `@hmcts/web-core` wholesale, so `canonicalHostMiddleware` must be added to that mock factory (`canonicalHostMiddleware: vi.fn(() => vi.fn((_req, _res, next) => next()))`) or `createApp()` will throw on an undefined import. Then:

* Verify `canonicalHostMiddleware` is called exactly once during `createApp()`.
* Verify it is called with the value of `process.env.CANONICAL_HOST` — set the env var in `beforeEach`, assert `toHaveBeenCalledWith({ canonicalHost: "www.court-tribunal-hearings.service.gov.uk" })`, and delete it in `afterEach`.
* Verify it is called with `{ canonicalHost: undefined }` when the env var is unset, which is the lower-environment case.

### 6.3 Helm values test — `apps/web/helm/values.yaml.test.ts`

The file already parses the chart YAML and asserts on hostname ownership, so the assertions belong there rather than in a new file.

* `CANONICAL_HOST` is present in `nodejs.environment` in `apps/web/helm/values.yaml`.
* Its raw templated value contains `eq .Values.global.environment` and `prod`, and contains `www.court-tribunal-hearings.service.gov.uk` — i.e. the canonical host is gated on prod and cannot leak into lower environments.
* It uses backtick literals, not double quotes, matching the `CFT_IDAM_URL` convention in the same file (the chart quotes the value before `tpl`, which would escape double quotes).
* It contains no shell-style `${VAR:-default}` — already enforced for the pipeline templates by the existing `pipeline values templates` describe block; extend that coverage to the new key.
* `helm/cath-service/values.template.yaml` and `helm/cath-service/values.preview.template.yaml` both set `cath-web.nodejs.environment.CANONICAL_HOST` to `""`, mirroring the existing `additionalIngressHosts: []` clear asserted by the `Front Door hostname ownership` block. Add this to that describe block — the reason is identical: the pipeline release must not inherit a public-hostname value from the subchart default.

### 6.4 Regression coverage via the existing E2E suite

No new Playwright spec is proposed, and that is a deliberate choice rather than an omission. A host-based redirect cannot be meaningfully exercised against a local server: `CANONICAL_HOST` is empty in local and preview (by design, per section 3.5), so the middleware is a passthrough and any E2E test would either assert nothing or require a bespoke server configuration that does not match any deployed environment. Writing one would add a test that passes for the wrong reason — exactly the pattern `CLAUDE.md` warns against under "minimize test count".

What the existing suite does usefully prove is that inserting middleware into the chain broke nothing. The following must stay green with no modification:

* `e2e-tests/tests/landing-page.spec.ts` — the service still serves its entry page.
* `e2e-tests/tests/page-structure.spec.ts` — header, footer, skip link and phase banner unaffected.
* `e2e-tests/tests/404-error-page.spec.ts` — `notFoundHandler()` is still reached for genuinely unknown paths, i.e. the new middleware did not swallow requests.
* `e2e-tests/tests/language-toggle-service-navigation.spec.ts` — the `lng` query parameter mechanism still works end to end.
* `e2e-tests/tests/sign-in.spec.ts`, `cft-idam/`, `crime-idam/`, `sso/` — the redirect middleware sits before session handling, so the OIDC flows must be confirmed unaffected.

### 6.5 Manual verification in production (post-deploy, after the external prerequisites)

These are the checks that actually close the ticket, because the external DNS and ingress work cannot be tested in CI.

```bash
# 1. Apex redirects to www, preserving nothing (root path)
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

# 4. Follow the chain end to end - exactly one hop, no loop
curl -sSIL --max-redirs 3 https://court-tribunal-hearings.service.gov.uk/
#    expect: 301 then 200; no "Maximum (3) redirects followed" error

# 5. Plain HTTP on the apex still ends up on https://www.
curl -sSIL --max-redirs 3 http://court-tribunal-hearings.service.gov.uk/

# 6. No session cookie minted on the apex
curl -sSI https://court-tribunal-hearings.service.gov.uk/ | grep -i set-cookie
#    expect: no output

# 7. Health endpoint is never redirected
curl -sSI https://www.court-tribunal-hearings.service.gov.uk/health
#    expect: HTTP/2 200
```

Browser checks to run alongside:

* Type `court-tribunal-hearings.service.gov.uk` into a clean browser profile address bar — the landing page renders and the address bar shows the `www.` host.
* Repeat with the Welsh toggle, confirming the redirect does not drop the language selection.
* Complete one full sign-in journey (media user via B2C and one admin via SSO) starting from the apex hostname, confirming the user stays on `www.court-tribunal-hearings.service.gov.uk` throughout and is not thrown onto a platform hostname — this is the check for the `BASE_URL` interaction in section 3.8.

### 6.6 Lower-environment verification (pre-prod, provable in CI and on aat)

* Deploy to aat and confirm `CANONICAL_HOST` is empty in the pod environment (`kubectl exec ... -- printenv CANONICAL_HOST` returns nothing).
* Confirm both the Flux host (`cath.aat.platform.hmcts.net`) and the release-scoped pipeline host serve `200` with no `location` header — proving the change is genuinely inert outside prod.
* Confirm the deploy smoke test in `.github/workflows/job.helm-deploy.yml` passes, which is the practical guard against a stray redirect on a release-scoped host.


### Comment by OgechiOkelu on 2026-10-22T16:20:25Z

@plan 
