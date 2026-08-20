export const en = {
  title: "Download MI Report",
  backLink: "/system-admin-dashboard",
  back: "Back",
  description: "Download management information reports for user accounts, publications and subscriptions.",
  periodHeading: "Reporting period",
  periodHint: "How many days of data do you want to include?",
  reportTypeHeading: "Report type",
  reportTypeHint: "Select the data you want to download.",
  downloadButtonText: "Download report",
  errorSummaryTitle: "There is a problem",
  periodError: "Select a reporting period",
  reportTypeError: "Select a report type",
  periodOptions: [
    { value: "7", text: "Last 7 days" },
    { value: "14", text: "Last 14 days" },
    { value: "21", text: "Last 21 days" },
    { value: "30", text: "Last 30 days" },
    { value: "all", text: "From the beginning" }
  ],
  reportTypeOptions: [
    { value: "user-accounts", text: "User Accounts", description: "User account data including provenance and roles" },
    { value: "publications", text: "Publications", description: "Publications with court and list type data" },
    { value: "location-subscriptions", text: "Location Subscriptions", description: "Subscriptions by location with court names" },
    { value: "all-subscriptions", text: "All Subscriptions", description: "All subscriptions including search type" },
    { value: "all-data", text: "All Data", description: "All of the above in a single file with multiple tabs" }
  ]
};
