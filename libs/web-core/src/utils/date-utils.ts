export interface DateInput {
  day: string;
  month: string;
  year: string;
}

export function formatDateAndLocale(dateString: string, locale: string): string {
  const date = new Date(dateString);

  if (locale === "cy") {
    return date.toLocaleDateString("cy-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

export function parseDate(dateInput: DateInput): Date | null {
  const day = Number.parseInt(dateInput.day, 10);
  const month = Number.parseInt(dateInput.month, 10);
  const year = Number.parseInt(dateInput.year, 10);

  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

export function formatDate(date: DateInput): string {
  const day = date.day.padStart(2, "0");
  const month = date.month.padStart(2, "0");
  const year = date.year;

  const dateObj = new Date(`${year}-${month}-${day}`);
  const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" };
  return dateObj.toLocaleDateString("en-GB", options);
}

export function formatDateRange(from: DateInput, to: DateInput): string {
  return `${formatDate(from)} to ${formatDate(to)}`;
}
