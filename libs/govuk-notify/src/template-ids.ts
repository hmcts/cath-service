// GOV.UK Notify template IDs. Not secrets, and identical across every environment
// (local, aat, and production all send from the same GOV.UK Notify service), so they
// are hardcoded here as the single source of truth rather than duplicated across
// .env files and Helm values.yaml/values.dev.yaml for every app that sends email.
export const GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_NO_LINKS = "5b5c31d0-27a3-466b-b750-bd1a858cd50f";
export const GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_ONLY = "ac63ed12-c179-416d-b9af-83b2b37752bf";
export const GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL = "42f65ada-6de0-45da-822a-9632f6f682fd";
export const GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_EXCEL_ONLY = "2117d63a-eb4d-4e0b-996c-56367f719905";
export const GOVUK_NOTIFY_TEMPLATE_ID_SYSTEM_ADMIN = "ec6c863f-3c6f-4d75-82b9-c3e805be20b9";
export const GOVUK_NOTIFY_TEMPLATE_ID_LOCATION_SUBSCRIPTION_DELETION = "79f6b1a5-49a2-43a4-84db-b6e791b5d59a";
export const GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_REJECTION = "838be14a-1ca2-408f-a4bc-a8b4d3c7d54d";
export const GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_NEW_ACCOUNT = "91d93e44-0ad8-4782-8ef0-fb1cad0c641f";
export const GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_DUPLICATE_ACCOUNT = "2b4ccd66-2b04-4d27-94e5-b7372f58be08";
