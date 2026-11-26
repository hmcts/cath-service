const EMAIL_PLACEHOLDER = "{email}";

export function buildImportantInformationText(template: string, email: string): string {
  return template.replace(EMAIL_PLACEHOLDER, email);
}
