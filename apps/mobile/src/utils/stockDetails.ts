// Age, height and pot size are free text on the stock form (placeholders: "6 months", "2 ft",
// "10 inch"). A nursery that types just the number would otherwise see a bare "6" or "10" in the
// inventory, so a purely numeric value gets the unit the form's placeholder suggests; anything
// that already carries a unit is shown as typed.
const isBareNumber = (v: string) => /^\d+(\.\d+)?$/.test(v);

function withUnit(value: string | null | undefined, unit: (n: number) => string): string | null {
  const v = value?.trim();
  if (!v) return null;
  return isBareNumber(v) ? `${v} ${unit(Number(v))}` : v;
}

export const formatAge = (v: string | null | undefined) => withUnit(v, (n) => (n === 1 ? 'month' : 'months'));
export const formatHeight = (v: string | null | undefined) => withUnit(v, () => 'ft');
export const formatPotSize = (v: string | null | undefined) => withUnit(v, () => 'inch');

/** "Age: 6 months · Height: 2 ft · Pot: 10 inch" - only the details that were filled in. */
export function stockDetailBits(item: { ageLabel?: string | null; heightLabel?: string | null; potSize?: string | null }): string[] {
  const bits: string[] = [];
  const age = formatAge(item.ageLabel);
  const height = formatHeight(item.heightLabel);
  const pot = formatPotSize(item.potSize);
  if (age) bits.push(`Age: ${age}`);
  if (height) bits.push(`Height: ${height}`);
  if (pot) bits.push(`Pot: ${pot}`);
  return bits;
}
