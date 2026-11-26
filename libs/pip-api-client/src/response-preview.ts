const PREVIEW_LENGTH = 100;
// Masking shrinks long values, so read well past the preview length to still fill it
const MAX_READ_BYTES = 8 * 1024;
const MASKED_VALUE = '"***"';
// A string literal, terminated or cut off at the end of the read, optionally followed by a colon (an object key)
const STRING_LITERAL = /"(?:[^"\\]|\\[\s\S]?)*(?:"(\s*:)?|$)/g;
const JSON_CONTENT_TYPE = /\bjson\b/i;

export async function readMaskedPreview(response: Response): Promise<string | undefined> {
  if (!JSON_CONTENT_TYPE.test(response.headers.get("content-type") ?? "")) {
    await response.body?.cancel().catch(() => undefined);
    return undefined;
  }

  const text = await readBodyPrefix(response);
  if (text === undefined) {
    return undefined;
  }

  const masked = maskStringValues(text).replace(/\s+/g, " ").trim();
  if (masked === "") {
    return undefined;
  }
  return masked.length > PREVIEW_LENGTH ? `${masked.slice(0, PREVIEW_LENGTH)}…` : masked;
}

async function readBodyPrefix(response: Response): Promise<string | undefined> {
  const reader = response.body?.getReader();
  if (!reader) {
    return undefined;
  }

  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (size < MAX_READ_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
  } catch {
    return undefined;
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, MAX_READ_BYTES));
}

function maskStringValues(text: string): string {
  return text.replace(STRING_LITERAL, (literal, keyColon: string | undefined) => (keyColon === undefined ? MASKED_VALUE : literal));
}
