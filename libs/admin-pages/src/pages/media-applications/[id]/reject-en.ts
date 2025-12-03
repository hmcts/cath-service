export default {
  pageTitle: "Are you sure you want to reject this application?",
  subheading: "Applicant's details",
  reasonsHeading: "Rejection reasons",
  tableHeaders: {
    name: "Name",
    email: "Email",
    employer: "Employer",
    dateApplied: "Date applied",
    proofOfId: "Proof of ID"
  },
  reasons: {
    notAccredited: [
      "The applicant is not an accredited member of the media.",
      "You can sign in with an existing MyHMCTS account. Or you can register your organisation at https://www.gov.uk/guidance/myhmcts-online-case-management-for-legal-professionals (opens in a new window)"
    ],
    invalidId: ["ID provided has expired or is not a Press ID.", "Please provide a valid Press ID."],
    detailsMismatch: ["Details provided do not match.", "The name, email address and Press ID do not match each other."]
  },
  radioLegend: "Confirm rejection",
  radioOptions: {
    yes: "Yes",
    no: "No"
  },
  continueButton: "Continue",
  errorMessages: {
    selectOption: "Select yes or no before continuing.",
    notFound: "Application not found.",
    loadFailed: "Unable to load applicant details. Please try again later."
  }
};
