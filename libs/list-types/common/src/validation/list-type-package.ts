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
  "magistrates-public-adult-court-list-future": "magistrates-public-adult-court-list",
  "civil-courts-rcj-daily-cause-list": "rcj-standard-daily-cause-list",
  "county-court-london-civil-daily-cause-list": "rcj-standard-daily-cause-list",
  "court-of-appeal-criminal-daily-cause-list": "rcj-standard-daily-cause-list",
  "family-division-high-court-daily-cause-list": "rcj-standard-daily-cause-list",
  "kings-bench-division-daily-cause-list": "rcj-standard-daily-cause-list",
  "kings-bench-masters-daily-cause-list": "rcj-standard-daily-cause-list",
  "mayor-and-city-civil-daily-cause-list": "rcj-standard-daily-cause-list",
  "senior-courts-costs-office-daily-cause-list": "rcj-standard-daily-cause-list",
  "birmingham-administrative-court-daily-cause-list": "administrative-court-daily-cause-list",
  "leeds-administrative-court-daily-cause-list": "administrative-court-daily-cause-list",
  "bristol-and-cardiff-administrative-court-daily-cause-list": "administrative-court-daily-cause-list",
  "manchester-administrative-court-daily-cause-list": "administrative-court-daily-cause-list",
  "sscs-london-daily-hearing-list": "sscs-daily-hearing-list",
  "sscs-midlands-daily-hearing-list": "sscs-daily-hearing-list",
  "sscs-south-east-daily-hearing-list": "sscs-daily-hearing-list",
  "sscs-wales-and-south-west-daily-hearing-list": "sscs-daily-hearing-list",
  "sscs-scotland-daily-hearing-list": "sscs-daily-hearing-list",
  "sscs-north-east-daily-hearing-list": "sscs-daily-hearing-list",
  "sscs-north-west-daily-hearing-list": "sscs-daily-hearing-list",
  "siac-weekly-hearing-list": "siac-poac-paac-weekly-hearing-list",
  "poac-weekly-hearing-list": "siac-poac-paac-weekly-hearing-list",
  "paac-weekly-hearing-list": "siac-poac-paac-weekly-hearing-list",
  "rpt-eastern-weekly-hearing-list": "ftt-rpt-weekly-hearing-list",
  "rpt-london-weekly-hearing-list": "ftt-rpt-weekly-hearing-list",
  "rpt-midlands-weekly-hearing-list": "ftt-rpt-weekly-hearing-list",
  "rpt-northern-weekly-hearing-list": "ftt-rpt-weekly-hearing-list",
  "rpt-southern-weekly-hearing-list": "ftt-rpt-weekly-hearing-list",
  "ftt-rpt-market-rents-weekly-hearing-list": "ftt-rpt-weekly-hearing-list",
  "ut-t-and-cc-daily-hearing-list": "upper-tribunal-tax-and-chancery-chamber-daily-hearing-list",
  "ut-lc-daily-hearing-list": "upper-tribunal-lands-chamber-daily-hearing-list",
  "ut-aac-daily-hearing-list": "upper-tribunal-administrative-appeals-chamber-daily-hearing-list"
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
