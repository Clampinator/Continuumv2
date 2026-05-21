/**
 * Sums armor protection values across all equipped armor items per body location.
 * @param {object[]} armorItems - Array of armor item objects with ipA..ipG fields.
 * @returns {object} Totals: { totalIpA, totalIpB, ..., totalIpG }
 */
export function calculateArmorIpTotals(armorItems) {
  const totals = { totalIpA: 0, totalIpB: 0, totalIpC: 0, totalIpD: 0, totalIpE: 0, totalIpF: 0, totalIpG: 0 };
  const keys = ['ipA', 'ipB', 'ipC', 'ipD', 'ipE', 'ipF', 'ipG'];
  for (const armor of armorItems) {
    for (const ip of keys) {
      totals['total' + ip.charAt(0).toUpperCase() + ip.slice(1)] += Number(armor[ip]) || 0;
    }
  }
  return totals;
}