export const cy = {
  pageTitle: (email: string) => `Rheoli ${email}`,
  warningText: "Sicrhewch fod awdurdodiad wedi'i roi cyn diweddaru'r defnyddiwr hwn",
  userIdLabel: "ID Defnyddiwr",
  emailLabel: "E-bost",
  roleLabel: "Rôl",
  provenanceLabel: "Tarddiad",
  provenanceIdLabel: "ID Tarddiad",
  creationDateLabel: "Dyddiad Creu",
  lastSignInLabel: "Dilyswyd diwethaf",
  deleteUserButton: "Dileu defnyddiwr",
  backLink: "Yn ôl i'r rhestr defnyddwyr",
  neverSignedIn: "Heb ei ddilysu erioed",
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
