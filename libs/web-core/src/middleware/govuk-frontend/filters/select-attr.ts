export function selectAttrFilter<T extends Record<string, unknown>>(arr: T[], attr: string, operator: string, value: unknown): T[] {
  if (!Array.isArray(arr)) return [];
  if (operator === "equalto") {
    return arr.filter((item) => item[attr] === value);
  }
  return [];
}
