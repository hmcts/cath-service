export const cy = {
  title: "Beth yr ydych eisiau ei wneud?",
  backLink: "/system-admin-dashboard",
  options: [
    {
      value: "upload-reference-data",
      label: "Uwchlwytho Data Cyfeirnod",
      description: "Uwchlwytho data cyfeirio lleoliad CSV",
      href: "/reference-data-upload"
    },
    {
      value: "manage-region-data",
      label: "Rheoli Data Rhanbarthau",
      description: "Gweld, diweddaru a dileu data rhanbarthau",
      href: "/region-data"
    },
    {
      value: "manage-location-jurisdiction-data",
      label: "Rheoli Data Awdurdodaeth a Rhanbarth Lleoliad",
      description: "Gweld a diweddaru data awdurdodaeth a rhanbarth lleoliad",
      href: "/location-jurisdiction-search"
    },
    {
      value: "manage-location-metadata",
      label: "Rheoli Metadata Lleoliad",
      description: "Gweld, diweddaru a dileu metadata lleoliad",
      href: "/location-metadata-search"
    }
  ],
  continueButtonText: "Parhau",
  errorSummaryTitle: "Mae problem",
  noSelectionError: "Dewiswch un opsiwn"
};
