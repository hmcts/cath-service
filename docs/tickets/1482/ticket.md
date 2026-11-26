# #1482: Spike: SDS to CFT connectivity so CaTH AI System Admin Dashboard can read PIP data via SDS API endpoints (incl. PROD)

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-11-16T12:09:34Z
**Updated:** 2026-11-24

## Description

Investigate how the CaTH AI System Admin Dashboard, running in CFT (AKS), can read PIP data from SDS during the PIP to CaTH migration. This covers all environments, **including PRODUCTION**.

## Approach
CaTH does **not** connect directly to the PIP PostgreSQL databases or Azure Blob Storage. SDS is building API endpoints that return the data CaTH needs. CaTH AI calls those SDS endpoints over HTTPS and authenticates with a bearer token.

PIP: Data and Account Management APIs

## Configuration
- **SDS API base URL:** not hardcoded. It's set for each environment as an environment variable (for example `PIP_API_URL`), mapped through `config/custom-environment-variables.json` and set in the Helm/Flux values for each environment.
- **Token credentials:** read from the existing `cath` Key Vault for each environment and mounted into the pod through the Helm `keyVaults` secrets with an alias. They are never in config files or the repo.

## Authentication
CaTH reuses the existing CaTH AI API app registration. No new app registration or new secrets are needed.

- Client-credentials token from the HMCTS Entra ID tenant, using these existing Key Vault secrets:
  - `cath-service-api-client-id`
  - `cath-service-api-client-secret`
  - `cath-service-api-client-scope`
- Add a new **app role** to the CaTH AI API app registration for calling the SDS APIs (role name TBC), and assign it to the CaTH client so the token's `roles` claim carries it.
- The SDS APIs validate the bearer token: tenant, audience, and the `roles` claim containing the new role.
- CaTH sends the token on every call as `Authorization: Bearer <token>` and reuses it until it is close to expiry.

## Questions to answer
- **Endpoints:** which SDS endpoints exist (or are planned) for Data Management and Account Management, their base URLs for each environment, and the request and response contracts.
- **Network path:** how CFT (AKS) reaches the SDS API endpoints in each environment. For example, a public endpoint with an allow-list, a private endpoint, or APIM.
- **Authentication:** confirm with SDS the audience and role name their APIs will validate, and who creates the app role and its assignment in each environment (Entra admin, as for #624).
- **Performance:** whether migration reads through the APIs will affect live PIP. Check for rate limits and pagination, and whether runs need to happen off-peak.

## Outcome
- A short write-up recommending one approach, with a diagram, for each environment: AAT/Staging and PROD.
- A proof of concept: generate a bearer token and call one SDS endpoint from CaTH in a non-prod environment.
- Follow-up tickets raised for the infrastructure (Terraform/Flux, Key Vault secrets) and access requests.

## Acceptance criteria
- The approach is agreed with Platform Ops and the security teams.
- The proof of concept works in non-prod: CaTH gets a token and gets data back from an SDS endpoint.
- The new app role exists on the CaTH AI API app registration and is assigned in each environment.
- The PROD path, the credentials it needs and the approvals it needs are documented.
- There is no direct database or blob storage connection from CaTH to PIP. All access goes through the SDS API endpoints.

## Comments

No comments on this issue.
