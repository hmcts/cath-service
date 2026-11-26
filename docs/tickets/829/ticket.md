# #829: Add functionality to Test Connection in Third Party Subscription

**State:** OPEN
**Assignees:** KianKwa
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-07-07T09:55:17Z
**Updated:** 2026-11-02T15:16:48Z

## Description

This ticket is dependent on #620 (APIM testing-support API, which provides the mock third-party health check endpoint in stg/test/demo).

PROBLEM STATEMENT

In legacy CaTH (pip-frontend → pip-account-management → pip-publication-services), the Manage subscriber page has a **Test connection** button. It checks that a third-party subscriber's OAuth configuration works end to end before the subscriber is relied on for publications: an access token can be obtained, and the destination accepts a request with it.

AI CaTH lets a System Admin save a subscriber's OAuth configuration (`/third-party-subscribers/:id/oauth-config`), but there is no way to check it works. A wrong token URL, scope, client secret or destination URL is only found when a real publication push fails.

**AS A** System Admin
**I WANT** to test the connection to a third-party subscriber using its saved OAuth configuration
**SO THAT** I can confirm the subscriber is set up correctly before it receives publications

**ACCEPTANCE CRITERIA**

Manage subscriber page (`/third-party-subscribers/:id/manage`)
- A **Test connection** button (secondary) is shown above the summary list
- Selecting it submits a POST to the same page. The page re-renders with the result shown above the summary list; no data is changed
- Only System Admins can trigger the test

Behaviour (matches legacy `ThirdPartyApiService.thirdPartyHealthCheck`)
1. Read the subscriber's OAuth configuration from Key Vault (destination URL, token URL, scope, client ID, client secret)
2. Request an access token from the token URL using the OAuth 2.0 client credentials grant (`grant_type=client_credentials`, `client_id`, `client_secret`, `scope`)
3. Send `GET` to the destination URL with `Authorization: Bearer <token>`
4. Any 2xx response is a success

Result messages (shown in a GOV.UK notification banner or inset, not just colour)
- Success: heading "Succeeded", body "Connection to third party succeeded."
- No OAuth configuration saved: heading "Failed", body "No OAuth configuration found. Please supply valid OAuth configuration to enable connection." The token and destination are not called.
- Token request fails: heading "Failed", body "Failed to generate access token." plus the failure reason (e.g. HTTP status)
- Destination request fails: heading "Failed", body "Failed to send request to destination." plus the failure reason (e.g. HTTP status)
- Unexpected error or timeout: heading "Failed", body "Error connecting to third party. Please try again later."
- Failure reasons must never include the client secret, the access token or other secret values

Status
- The test works for any subscriber status (Pending, Active or Suspended, see #830), so a Pending subscriber can be verified before it is made Active

Non-functional
- Token and destination requests have a timeout (30 seconds, matching the existing push client) so the page cannot hang
- Each test is written to the audit log with the subscriber id and the outcome (success or failure)
- Failures are logged server-side with the subscriber id. Secrets are not logged.

Welsh
- The button label and all result messages are available in Welsh

Testing
- Unit tests cover each outcome: success, missing configuration, token failure, destination failure and timeout
- E2E (stg): with the OAuth config pointing at the #620 testing-support endpoint (`GET /third-party`, which validates the JWT and returns 200 "Successful health check."), Test connection shows "Succeeded"

**TECHNICAL NOTES**

- Legacy reference:
  - pip-frontend: `ManageThirdPartySubscribersViewController.post` / `testConnection`, `manage-third-party-subscribers-view.njk`, locale `manage-third-party-subscribers-view.json`
  - pip-account-management: `GET /third-party/configuration/healthcheck/{userId}` → `ThirdPartySubscriptionNotificationService.handleThirdPartyHealthCheck`
  - pip-publication-services: `ThirdPartyApiService.thirdPartyHealthCheck` and `ThirdPartyOauthService.requestApiAccessToken` (failures raise `ThirdPartyHealthCheckException` → 500 with message)
  - Mock destination: pip-publication-services `infrastructure/resources/testing-support/operation-policies/thirdPartyHealthCheck.xml`
- The OAuth config is already stored through `@hmcts/third-party-user` (`createKeyVaultSecretName(id, "destination-url" | "token-url" | "scope" | "client-id" | "client-secret")`, `getSecret`)
- cath has no client-credentials token request for third parties yet. The current push (`libs/legacy-third-party-fulfilment`) is the Courtel mTLS push using `COURTEL_API_URL` / `COURTEL_CERTIFICATE`, not OAuth. Put the token and health-check logic in a lib (e.g. `libs/third-party-user`) so an OAuth push can reuse it later, not in the page controller.
- The OAuth config pages already fall back to `legacy_third_party_user` when the id is not in `third_party_user`. Test connection should resolve the subscriber the same way. See the model note in #830.
- Add a new `AuditLogAction` for the test (e.g. `TEST_THIRD_PARTY_CONNECTION`)
- pip caches tokens per subscriber. Caching is out of scope here; the test should always request a fresh token (#568 covers caching).

**Welsh translation:** required for the button label and all result messages

## Comments

No comments on this issue.
