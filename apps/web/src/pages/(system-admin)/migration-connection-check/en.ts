export const en = {
  pageTitle: "Check connection to PIP",
  back: "Back",
  urlLabel: "URL to test",
  urlHint: "Enter the URL of a GET endpoint, without https://, on one of these PIP APIs:",
  authHint: "A Connected result only proves authentication if the endpoint requires an access token.",
  testConnectionButton: "Test connection",
  notConfigured: "The PIP connection check is not set up in this environment.",
  errorSummaryTitle: "There is a problem",
  errorMessages: {
    required: "Enter a URL",
    tooLong: "URL must be 2,048 characters or fewer",
    invalidFormat: "Enter a URL in the correct format, like pip-data-management.staging.platform.hmcts.net/locations/1",
    hostNotAllowed: "Enter a URL for one of the allowed PIP APIs"
  },
  result: {
    succeededTitle: "Connected",
    failedTitle: "Not connected",
    urlTested: "URL tested",
    outcome: "Result",
    httpStatus: "HTTP status",
    responseTime: "Response time",
    milliseconds: "ms",
    tokenObtained: "Access token obtained",
    yes: "Yes",
    no: "No",
    reason: "Reason",
    errorCode: "Error code",
    responsePreview: "Response (first 100 characters, text values hidden)"
  },
  outcomes: {
    connected: "Connected",
    redirected: "Redirected (not followed)",
    unauthorised: "Not authorised: the PIP API rejected the access token",
    forbidden: "Forbidden: the token was accepted but does not have the required role",
    notFound: "Not found: check the URL",
    rateLimited: "Rate limited by the PIP API",
    serverError: "The PIP API returned an error",
    unexpectedStatus: "The PIP API returned an unexpected status",
    tokenFailure: "Could not get an access token",
    unreachable: "Could not reach the PIP API",
    timeout: "The request timed out",
    notConfigured: "The PIP connection check is not set up in this environment"
  },
  tokenReasons: {
    httpStatus: "Entra ID returned HTTP status",
    invalidTokenResponse: "The token response did not contain an access token",
    connectionFailed: "Could not connect to Entra ID",
    timeout: "The token request timed out"
  }
};
