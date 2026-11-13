export const en = {
  pageTitle: "Manage subscriber",
  tableHeadings: {
    name: "Name",
    createdDate: "Created date",
    subscriptionCount: "Number of subscriptions"
  },
  testConnectionButton: "Test connection",
  connectionTest: {
    succeededTitle: "Succeeded",
    failedTitle: "Failed",
    succeeded: "Connection to third party succeeded.",
    missingConfiguration: "No OAuth configuration found. Please supply valid OAuth configuration to enable connection.",
    tokenFailure: "Failed to generate access token.",
    destinationFailure: "Failed to send request to destination.",
    error: "Error connecting to third party. Please try again later.",
    reasonLabel: "Reason",
    reasons: {
      httpStatus: "HTTP status",
      invalidTokenResponse: "The token response did not contain an access token.",
      invalidUrl: "The URL is not valid.",
      connectionFailed: "Could not connect."
    }
  },
  manageSubscriptionsButton: "Manage subscriptions",
  manageOauthConfigButton: "Manage OAuth configuration",
  deleteUserButton: "Delete subscriber",
  userNotFound: "Third party subscriber not found.",
  back: "Back"
};
