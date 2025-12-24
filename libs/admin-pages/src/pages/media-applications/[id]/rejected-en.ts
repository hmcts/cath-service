export default {
  pageTitle: "Application has been rejected",
  tableHeaders: {
    name: "Name",
    email: "Email",
    employer: "Employer",
    dateApplied: "Date applied"
  },
  reasonsHeading: "Rejection Reasons",
  viewLinkText: "View",
  reasons: {
    notAccredited: [
      "<strong>The applicant is not an accredited member of the media.</strong>",
      'You can sign in with an existing MyHMCTS account. Or you can register your organisation at <a href="https://www.gov.uk/guidance/myhmcts-online-case-management-for-legal-professionals" class="govuk-link" target="_blank" rel="noopener noreferrer">https://www.gov.uk/guidance/myhmcts-online-case-management-for-legal-professionals</a> (opens in a new window)'
    ],
    invalidId: ["<strong>ID provided has expired or is not a Press ID.</strong>", "Please provide a valid Press ID."],
    detailsMismatch: ["<strong>Details provided do not match.</strong>", "The name, email address and Press ID do not match each other."]
  },
  whatHappensNextHeading: "What happens next",
  whatHappensNextText:
    "The applicant {applicantEmail} will now be emailed to notify them why their application cannot be progressed and invited to reapply once the issue(s) are rectified.",
  returnLink: "Return to applications list",
  errorMessages: {
    notFound: "Application not found.",
    loadFailed: "Unable to load application details. Please try again later."
  }
};
