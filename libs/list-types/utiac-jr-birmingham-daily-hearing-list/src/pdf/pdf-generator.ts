import { createUtiacJrDailyHearingListPdfGenerator } from "@hmcts/utiac-jr-leeds-daily-hearing-list";

type GeneratorFn = ReturnType<typeof createUtiacJrDailyHearingListPdfGenerator>;

const LIST_TITLE = "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Birmingham Daily Hearing List";

export function generateUtiacJrBirminghamDailyHearingListPdf(options: Parameters<GeneratorFn>[0]): ReturnType<GeneratorFn> {
  return createUtiacJrDailyHearingListPdfGenerator(LIST_TITLE)(options);
}
