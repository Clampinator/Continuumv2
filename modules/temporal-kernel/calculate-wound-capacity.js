/**
 * Calculates wound capacity and remaining IP from body attribute and wounds.
 * Game rule: A character's wound capacity is Body * 3.
 * @param {number} bodyValue - The Body (Force) attribute value.
 * @param {object[]} wounds - Array of wound objects with `ip` numeric fields.
 * @returns {{ ipTotal: number, ipRemaining: number }}
 */
export function calculateWoundCapacity(bodyValue, wounds) {
  const ipTotal = wounds.reduce((sum, w) => sum + (Number(w.ip) || 0), 0);
  const ipRemaining = (bodyValue * 3) - ipTotal;
  return { ipTotal, ipRemaining };
}