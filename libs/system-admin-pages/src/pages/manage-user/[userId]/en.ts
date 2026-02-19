export const en = {
  pageTitle: (email: string) => `Manage ${email}`,
  warningText: "Ensure authorisation has been granted before updating this user",
  userIdLabel: "User ID",
  emailLabel: "Email",
  roleLabel: "Role",
  provenanceLabel: "Provenance",
  provenanceIdLabel: "Provenance ID",
  creationDateLabel: "Creation Date",
  lastSignInLabel: "Last verified",
  deleteUserButton: "Delete user",
  backLink: "Back to user list",
  neverSignedIn: "Never verified",
  formatDate: (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }
};
