// GOV.UK Notify template IDs. Not secrets, and identical across every environment
// (local, aat, and production all send from the same GOV.UK Notify service), so they
// are hardcoded here as the single source of truth rather than duplicated across
// .env files and Helm values.yaml/values.dev.yaml for every app that sends email.
export const GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_NO_LINKS = "d9095328-839f-455a-98d9-46b000b4400d";
export const GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_ONLY = "67e78ce9-9f28-4209-983b-e705f77fb339";
export const GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL = "01936af9-ab2e-4001-a135-cd70284f7a82";
export const GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_EXCEL_ONLY = "fb95d98f-30e6-4227-a89d-f9525be4b5df";
export const GOVUK_NOTIFY_TEMPLATE_ID_SYSTEM_ADMIN = "ec6c863f-3c6f-4d75-82b9-c3e805be20b9";
export const GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_REJECTION = "838be14a-1ca2-408f-a4bc-a8b4d3c7d54d";
export const GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_NEW_ACCOUNT = "91d93e44-0ad8-4782-8ef0-fb1cad0c641f";
export const GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_DUPLICATE_ACCOUNT = "2b4ccd66-2b04-4d27-94e5-b7372f58be08";
