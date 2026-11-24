// Printed as sent, as PIP's PDF and Excel do, so a value the parser can't read is never lost or changed.
// The age only appears next to a date of birth; on its own it reads as a stray number.
export function formatAccusedDateOfBirth(rawDateOfBirth: string | null, age: number | null): string {
  if (!rawDateOfBirth) return "";

  return age !== null ? `${rawDateOfBirth} (${age})` : rawDateOfBirth;
}
