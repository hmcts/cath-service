// Types for report-page.mjs, for the hosted check's TypeScript
export declare const APP_NAVIGATION: string;

export interface ReportPageOptions {
  title: string | { toString(): string };
  body: string;
  depth: number;
  active: string | null;
  has: { comparison: boolean; files: boolean };
  footerMeta: string;
  filterScript: string;
}

export declare function reportPageContext(options: ReportPageOptions): Record<string, unknown>;

export declare function footerMeta(baseline: { finished: string; pip: string } | null): string;
