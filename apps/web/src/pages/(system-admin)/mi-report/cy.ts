export const cy = {
  title: "Lawrlwytho Adroddiad MI",
  backLink: "/system-admin-dashboard",
  back: "Yn ôl",
  description: "Lawrlwythwch adroddiadau gwybodaeth reoli ar gyfer cyfrifon defnyddwyr, cyhoeddiadau a thanysgrifiadau.",
  periodHeading: "Cyfnod adrodd",
  periodHint: "Sawl diwrnod o ddata rydych chi am ei gynnwys?",
  reportTypeHeading: "Math o adroddiad",
  reportTypeHint: "Dewiswch y data rydych chi am ei lawrlwytho.",
  downloadButtonText: "Lawrlwytho adroddiad",
  errorSummaryTitle: "Mae problem",
  periodError: "Dewiswch gyfnod adrodd",
  reportTypeError: "Dewiswch fath o adroddiad",
  periodOptions: [
    { value: "7", text: "7 diwrnod diwethaf" },
    { value: "14", text: "14 diwrnod diwethaf" },
    { value: "21", text: "21 diwrnod diwethaf" },
    { value: "30", text: "30 diwrnod diwethaf" },
    { value: "all", text: "O'r dechrau" }
  ],
  reportTypeOptions: [
    { value: "user-accounts", text: "Cyfrifon Defnyddwyr", description: "Data cyfrif defnyddiwr gan gynnwys tarddiad a rolau" },
    { value: "publications", text: "Cyhoeddiadau", description: "Cyhoeddiadau gyda data llys a math o restr" },
    { value: "location-subscriptions", text: "Tanysgrifiadau Lleoliad", description: "Tanysgrifiadau yn ôl lleoliad gydag enwau llysoedd" },
    { value: "all-subscriptions", text: "Pob Tanysgrifiad", description: "Pob tanysgrifiad gan gynnwys math o chwiliad" },
    { value: "all-data", text: "Pob Data", description: "Pob un o'r uchod mewn un ffeil gyda thabiau lluosog" }
  ]
};
