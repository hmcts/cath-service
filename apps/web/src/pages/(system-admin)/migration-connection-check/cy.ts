export const cy = {
  pageTitle: "[WELSH TRANSLATION REQUIRED: 'Check connection to PIP']",
  back: "Yn ôl",
  urlLabel: "[WELSH TRANSLATION REQUIRED: 'URL to test']",
  urlHint: "[WELSH TRANSLATION REQUIRED: 'Enter the full URL of a GET endpoint on one of these PIP APIs:']",
  authHint: "[WELSH TRANSLATION REQUIRED: 'A Connected result only proves authentication if the endpoint requires an access token.']",
  testConnectionButton: "Profi cysylltiad",
  notConfigured: "[WELSH TRANSLATION REQUIRED: 'The PIP connection check is not set up in this environment.']",
  errorSummaryTitle: "Mae yna broblem",
  errorMessages: {
    required: "[WELSH TRANSLATION REQUIRED: 'Enter a URL']",
    tooLong: "[WELSH TRANSLATION REQUIRED: 'URL must be 2,048 characters or fewer']",
    invalidFormat: "[WELSH TRANSLATION REQUIRED: 'Enter a URL in the correct format, like https://pip-data-management.staging.platform.hmcts.net/locations/1']",
    hostNotAllowed: "[WELSH TRANSLATION REQUIRED: 'Enter a URL for one of the allowed PIP APIs']"
  },
  result: {
    succeededTitle: "Llwyddodd",
    failedTitle: "Methodd",
    urlTested: "[WELSH TRANSLATION REQUIRED: 'URL tested']",
    outcome: "[WELSH TRANSLATION REQUIRED: 'Result']",
    httpStatus: "Statws HTTP",
    responseTime: "[WELSH TRANSLATION REQUIRED: 'Response time']",
    milliseconds: "ms",
    tokenObtained: "[WELSH TRANSLATION REQUIRED: 'Access token obtained']",
    yes: "Ie",
    no: "Na",
    reason: "Rheswm",
    errorCode: "[WELSH TRANSLATION REQUIRED: 'Error code']",
    responsePreview: "[WELSH TRANSLATION REQUIRED: 'Response (first 100 characters, text values hidden)']"
  },
  outcomes: {
    connected: "[WELSH TRANSLATION REQUIRED: 'Connected']",
    redirected: "[WELSH TRANSLATION REQUIRED: 'Redirected (not followed)']",
    unauthorised: "[WELSH TRANSLATION REQUIRED: 'Not authorised: the PIP API rejected the access token']",
    forbidden: "[WELSH TRANSLATION REQUIRED: 'Forbidden: the token was accepted but does not have the required role']",
    notFound: "[WELSH TRANSLATION REQUIRED: 'Not found: check the URL']",
    rateLimited: "[WELSH TRANSLATION REQUIRED: 'Rate limited by the PIP API']",
    serverError: "[WELSH TRANSLATION REQUIRED: 'The PIP API returned an error']",
    unexpectedStatus: "[WELSH TRANSLATION REQUIRED: 'The PIP API returned an unexpected status']",
    tokenFailure: "Methwyd â chynhyrchu tocyn mynediad.",
    unreachable: "[WELSH TRANSLATION REQUIRED: 'Could not reach the PIP API']",
    timeout: "[WELSH TRANSLATION REQUIRED: 'The request timed out']",
    notConfigured: "[WELSH TRANSLATION REQUIRED: 'The PIP connection check is not set up in this environment']"
  },
  tokenReasons: {
    httpStatus: "[WELSH TRANSLATION REQUIRED: 'Entra ID returned HTTP status']",
    invalidTokenResponse: "Nid oedd yr ymateb tocyn yn cynnwys tocyn mynediad.",
    connectionFailed: "[WELSH TRANSLATION REQUIRED: 'Could not connect to Entra ID']",
    timeout: "[WELSH TRANSLATION REQUIRED: 'The token request timed out']"
  }
};
