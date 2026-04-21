/**
 * validate-budget-maintenance.js
 *
 * @deprecated — overextension is now computed inside getEconomicReport().
 * Kept as a stub so any lingering imports don't break.
 */
export function validateBudgetMaintenance(budget, size) {
    const over = Number(budget) < Number(size);
    return { isOverextended: over, penalty: over ? -2 : 0 };
}
