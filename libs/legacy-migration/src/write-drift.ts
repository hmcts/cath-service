const MAX_REPORTED_IDS = 10;

// Compares what an applied run meant to write with what the table holds afterwards, read back in
// the same transaction. Transforms cannot see write-side loss: a column a database default or
// type overrode, a value truncated, or a row the write dropped or left behind.
// Only fields set on the expected row are compared, so database-generated columns are ignored.
export function findWriteDrift<T extends object>(entityType: string, expected: T[], written: object[], idKey: keyof T & string): string | null {
  const writtenById = new Map(written.map((row) => [String(Reflect.get(row, idKey)), row]));
  const expectedIds = new Set(expected.map((row) => String(row[idKey])));

  const missing: string[] = [];
  const differing: string[] = [];
  for (const row of expected) {
    const id = String(row[idKey]);
    const writtenRow = writtenById.get(id);
    if (!writtenRow) {
      missing.push(id);
    } else if (!sameFields(row, writtenRow)) {
      differing.push(id);
    }
  }
  const unexpected = [...writtenById.keys()].filter((id) => !expectedIds.has(id));

  if (missing.length === 0 && differing.length === 0 && unexpected.length === 0) return null;

  // Ids only, never row values, which can hold emails and names.
  return [
    `${entityType}: written rows differ from the transformed legacy rows`,
    describe("missing", missing),
    describe("differing", differing),
    describe("unexpected", unexpected)
  ]
    .filter(Boolean)
    .join("; ");
}

function sameFields(expected: object, written: object): boolean {
  return Object.entries(expected)
    .filter(([, value]) => value !== undefined)
    .every(([key, value]) => canonical(value) === canonical(Reflect.get(written, key)));
}

function canonical(value: unknown): string {
  return JSON.stringify(normalise(value));
}

function normalise(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalise);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalise(Reflect.get(value, key))])
    );
  }
  return value;
}

function describe(label: string, ids: string[]): string {
  if (ids.length === 0) return "";
  const sample = ids.slice(0, MAX_REPORTED_IDS).join(", ");
  return `${ids.length} ${label} (${sample}${ids.length > MAX_REPORTED_IDS ? ", …" : ""})`;
}
