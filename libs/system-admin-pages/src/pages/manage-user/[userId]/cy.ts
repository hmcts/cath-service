export const cy = {
  pageTitle: (email: string) => `Rheoli ${email}`,
  warningText: "Sicrhewch fod awdurdodiad wedi'i roi cyn diweddaru'r defnyddiwr hwn",
  userIdLabel: "ID Defnyddiwr",
  emailLabel: "E-bost",
  roleLabel: "Rôl",
  provenanceLabel: "Tarddiad",
  provenanceIdLabel: "ID Tarddiad",
  creationDateLabel: "Dyddiad Creu",
  lastSignInLabel: "Mewngofnodi diwethaf",
  deleteUserButton: "Dileu defnyddiwr",
  backLink: "Yn ôl i'r rhestr defnyddwyr",
  neverSignedIn: "Heb fewngofnodi erioed",
  formatDate: (date: Date) => new Intl.DateTimeFormat("cy-GB").format(date)
};
