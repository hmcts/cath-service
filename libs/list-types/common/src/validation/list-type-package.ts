/**
 * Maps delta/variant list type package names to their parent package.
 * Used when a list type shares the same JSON schema as another list type.
 */
const PACKAGE_ALIASES: Record<string, string> = {
  "crown-daily-pdda-list": "crown-daily-list",
  "crown-firm-pdda-list": "crown-firm-list",
  "iac-daily-list-additional-cases": "iac-daily-list",
  "et-fortnightly-press-list": "et-fortnightly-list",
  "magistrates-adult-court-list-daily": "magistrates-adult-court-list",
  "magistrates-adult-court-list-future": "magistrates-adult-court-list",
  "sjp-delta-press-list": "sjp-press-list",
  "sjp-delta-public-list": "sjp-public-list",
  "ut-iac-jr-london-daily-hearing-list": "utiac-jr-daily-hearing-list",
  "ut-iac-jr-leeds-daily-hearing-list": "utiac-jr-daily-hearing-list",
  "ut-iac-jr-manchester-daily-hearing-list": "utiac-jr-daily-hearing-list",
  "ut-iac-jr-birmingham-daily-hearing-list": "utiac-jr-daily-hearing-list",
  "ut-iac-jr-cardiff-daily-hearing-list": "utiac-jr-daily-hearing-list",
  "ut-iac-statutory-appeals-daily-hearing-list": "utiac-statutory-appeal-daily-hearing-list",
  "cst-weekly-hearing-list": "care-standards-tribunal-weekly-hearing-list",
  "ftt-lr-weekly-hearing-list": "ftt-lands-registration-tribunal-weekly-hearing-list",
  "ftt-tax-weekly-hearing-list": "ftt-tax-chamber-weekly-hearing-list",
  "magistrates-public-adult-court-list-daily": "magistrates-public-adult-court-list",
  "magistrates-public-adult-court-list-future": "magistrates-public-adult-court-list"
};

/**
 * Converts list type name to kebab-case for dynamic imports
 * Example: CIVIL_AND_FAMILY_DAILY_CAUSE_LIST -> civil-and-family-daily-cause-list
 */
export function convertListTypeNameToKebabCase(name: string): string {
  return name.toLowerCase().replaceAll("_", "-");
}

/**
 * Resolves a list type name to the package (and libs/list-types directory) that owns its JSON schema.
 * Shared by validation and the publisher OpenAPI generator so both agree on which list types accept JSON.
 */
export function resolveListTypePackageName(name: string): string {
  const kebabName = convertListTypeNameToKebabCase(name);
  return PACKAGE_ALIASES[kebabName] ?? kebabName;
}
