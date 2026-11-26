// Printed as sent, as PIP's PDF and Excel do, so a value the parser can't read is never lost or changed.
// With no date of birth the age is shown on its own, as `(age)`, matching PIP.
export function formatAccusedDateOfBirth(rawDateOfBirth: string | null, age: number | null): string {
  const ageText = age !== null ? `(${age})` : "";
  if (!rawDateOfBirth) return ageText;

  return ageText ? `${rawDateOfBirth} ${ageText}` : rawDateOfBirth;
}
