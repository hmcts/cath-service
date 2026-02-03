export const en = {
  pageTitle: (email: string) => `Manage ${email}`,
  warningText: "Ensure authorisation has been granted before updating this user",
  userIdLabel: "User ID",
  emailLabel: "Email",
  roleLabel: "Role",
  provenanceLabel: "Provenance",
  provenanceIdLabel: "Provenance ID",
  creationDateLabel: "Creation Date",
  lastSignInLabel: "Last sign in",
  deleteUserButton: "Delete user",
  backLink: "Back to user list",
  neverSignedIn: "Never signed in",
  formatDate: (date: Date) => new Intl.DateTimeFormat("en-GB").format(date)
};
