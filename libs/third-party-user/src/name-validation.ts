const MAX_NAME_LENGTH = 255;
const ALLOWED_CHARS_PATTERN = /^[a-zA-Z0-9 '-]+$/;

export function validateName(name: string): { href: string; text: string } | null {
  if (!name || name.trim().length === 0) {
    return { href: "#name", text: "Enter a name" };
  }

  if (name.length > MAX_NAME_LENGTH) {
    return { href: "#name", text: `Name must be ${MAX_NAME_LENGTH} characters or fewer` };
  }

  if (!ALLOWED_CHARS_PATTERN.test(name)) {
    return { href: "#name", text: "Name must only contain letters, numbers, spaces, hyphens and apostrophes" };
  }

  return null;
}
