/**
 * Calculates wound capacity and remaining IP from force attribute and wounds.
 * Game rule: A character's wound capacity is Force * 3.
 * @param {number} forceValue - The Force attribute value.
 * @param {object[]} wounds - Array of wound objects with `ip` numeric fields.
 * @returns {{ ipTotal: number, ipRemaining: number }}
 */
export function calculateWoundCapacity(forceValue, wounds) {
  const ipTotal = wounds.reduce((sum, w) => sum + (Number(w.ip) || 0), 0);
  const ipRemaining = (forceValue * 3) - ipTotal;
  return { ipTotal, ipRemaining };
}