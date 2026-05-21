/**
 * Calculates total weight of all carried gear items.
 * Game rule: only items marked as carried count toward encumbrance.
 * @param {object[]} gearItems - Array of gear item objects with system.carried, system.weight, system.quantity.
 * @returns {number} Total carried weight.
 */
export function calculateGearWeight(gearItems) {
  return gearItems.reduce((total, item) => {
    const sys = item.system || item;
    if (!sys.carried) return total;
    return total + (Number(sys.weight) * Number(sys.quantity) || 0);
  }, 0);
}