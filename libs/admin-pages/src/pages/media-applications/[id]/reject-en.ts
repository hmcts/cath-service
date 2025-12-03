export default {
  pageTitle: "Are you sure you want to reject this application?",
  subheading: "Applicant's details",
  reasonsHeading: "Rejection Reasons",
  tableHeaders: {
    name: "Name",
    email: "Email",
    employer: "Employer",
    dateApplied: "Date applied",
    proofOfId: "Proof of ID"
  },
  viewLinkText: "View",
  reasons: {
    notAccredited: [
      "<strong>The applicant is not an accredited member of the media.</strong>",
      'You can sign in with an existing MyHMCTS account. Or you can register your organisation at <a href="https://www.gov.uk/guidance/myhmcts-online-case-management-for-legal-professionals" class="govuk-link" target="_blank" rel="noopener noreferrer">https://www.gov.uk/guidance/myhmcts-online-case-management-for-legal-professionals</a> (opens in a new window)'
    ],
    invalidId: ["<strong>ID provided has expired or is not a Press ID.</strong>", "Please provide a valid Press ID."],
    detailsMismatch: ["<strong>Details provided do not match.</strong>", "The name, email address and Press ID do not match each other."]
  },
  radioLegend: "Confirm rejection",
  radioOptions: {
    yes: "Yes",
    no: "No"
  },
  continueButton: "Continue",
  emailPreview: {
    summaryText: "Preview email to applicant",
    introText: "After you've completed this form, the applicant will be emailed the following:",
    dear: "Dear",
    rejectionMessage: "Your request for a court and tribunal hearings account has been rejected for the following reason(s):",
    reasonsHeading: "Reasons for rejection:",
    accessMessage: "You can access the court and tribunal service from the link below should you wish to make a new request.",
    serviceLinkText: "Court and tribunal hearings service",
    from: "From",
    signature: "HM Courts & Tribunals Service"
  },
  errorMessages: {
    selectOption: "An option must be selected",
    notFound: "Application not found.",
    loadFailed: "Unable to load applicant details. Please try again later."
  }
};
